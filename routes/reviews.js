const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { createNotification } = require('./notifications');

// @route   POST /api/reviews
// @desc    리뷰 작성
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { rentalId, rating, comment, type } = req.body;

    const rental = db.get('rentals').find({ id: rentalId }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    if (rental.status !== 'completed') {
      return res.status(400).json({ message: '완료된 대여만 리뷰를 작성할 수 있습니다' });
    }

    let reviewee = null;
    
    if (type === 'product') {
      // 빌린 사람이 제품 자체에 대한 리뷰 작성
      // 제품 리뷰 점수는 소유자(빌려준 사람) 평점에도 반영됨
      if (rental.borrower !== req.user.id) {
        return res.status(403).json({ message: '제품 리뷰는 빌린 사람만 작성할 수 있습니다' });
      }

      // 제품 리뷰 중복 확인
      const existingProductReview = db.get('reviews')
        .find({ rental: rentalId, type: 'product' })
        .value();
      if (existingProductReview) {
        return res.status(400).json({ message: '이미 제품 리뷰를 작성하셨습니다' });
      }

      // 제품 리뷰는 소유자 평점에 반영되므로 reviewee를 소유자로 설정
      reviewee = rental.owner;

      db.get('rentals')
        .find({ id: rentalId })
        .assign({ productReviewed: true })
        .write();
        
    } else if (type === 'owner') {
      // 소유자가 빌린 사람 평가
      if (rental.owner !== req.user.id) {
        return res.status(403).json({ message: '리뷰 작성 권한이 없습니다' });
      }
      reviewee = rental.borrower;

      // 중복 확인
      const existingReview = db.get('reviews')
        .find({ rental: rentalId, type: 'owner' })
        .value();
      if (existingReview) {
        return res.status(400).json({ message: '이미 리뷰를 작성하셨습니다' });
      }

      db.get('rentals')
        .find({ id: rentalId })
        .assign({ ownerReviewed: true })
        .write();
    } else if (type === 'borrower') {
      // 빌린 사람이 소유자 평가
      if (rental.borrower !== req.user.id) {
        return res.status(403).json({ message: '리뷰 작성 권한이 없습니다' });
      }
      reviewee = rental.owner;

      // 중복 확인
      const existingReview = db.get('reviews')
        .find({ rental: rentalId, type: 'borrower' })
        .value();
      if (existingReview) {
        return res.status(400).json({ message: '이미 리뷰를 작성하셨습니다' });
      }

      db.get('rentals')
        .find({ id: rentalId })
        .assign({ borrowerReviewed: true })
        .write();
    } else {
      return res.status(400).json({ message: '유효하지 않은 리뷰 타입입니다' });
    }

    // 리뷰 생성
    const reviewId = uuidv4();
    const review = {
      id: reviewId,
      _id: reviewId,  // 호환성을 위해 동일한 ID 사용
      rental: rentalId,
      reviewer: req.user.id,
      reviewee: reviewee,
      product: rental.product,
      rating: Number(rating),
      comment: comment || '',
      type,
      createdAt: new Date().toISOString()
    };

    db.get('reviews').push(review).write();

    // reviewee가 있는 경우 평균 평점 업데이트 및 알림
    // (제품 리뷰 → 소유자 평점, 대여자 리뷰 → 대여자 평점)
    if (reviewee) {
      const userReviews = db.get('reviews').filter({ reviewee: reviewee }).value();
      const avgRating = userReviews.reduce((acc, rev) => acc + rev.rating, 0) / userReviews.length;
      
      db.get('users')
        .find({ id: reviewee })
        .assign({ averageRating: avgRating })
        .write();

      // 리뷰 받은 사람에게 알림 생성
      const product = db.get('products').find({ id: rental.product }).value();
      const notificationMessage = type === 'product'
        ? `${req.user.username}님이 "${product?.title || '제품'}" 리뷰를 작성했습니다 (${rating}점)`
        : `${req.user.username}님이 리뷰를 작성했습니다 (${rating}점)`;
      
      createNotification(
        reviewee,
        'review',
        notificationMessage,
        type === 'product' ? `/products/${rental.product}` : `/profile/${reviewee}`
      );
    }

    // 관련 정보 추가해서 반환
    const reviewer = db.get('users').find({ id: review.reviewer }).value();
    const revieweeUser = db.get('users').find({ id: review.reviewee }).value();
    const product = db.get('products').find({ id: review.product }).value();

    const populatedReview = {
      ...review,
      reviewer: reviewer ? {
        id: reviewer.id,
        username: reviewer.username,
        profileImage: reviewer.profileImage
      } : null,
      reviewee: revieweeUser ? {
        id: revieweeUser.id,
        username: revieweeUser.username,
        profileImage: revieweeUser.profileImage
      } : null,
      product: product ? {
        id: product.id,
        title: product.title
      } : null
    };

    res.status(201).json({
      success: true,
      review: populatedReview
    });
  } catch (error) {
    res.status(500).json({ message: '리뷰 작성 실패', error: error.message });
  }
});

// @route   GET /api/reviews/user/:userId
// @desc    특정 사용자가 받은 리뷰 목록
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    let reviews = db.get('reviews')
      .filter({ reviewee: req.params.userId })
      .orderBy(['createdAt'], ['desc'])
      .value();

    // 관련 정보 추가
    reviews = reviews.map(review => {
      const reviewer = db.get('users').find({ id: review.reviewer }).value();
      const product = db.get('products').find({ id: review.product }).value();
      
      return {
        ...review,
        reviewer: reviewer ? {
          id: reviewer.id,
          username: reviewer.username,
          profileImage: reviewer.profileImage,
          averageRating: reviewer.averageRating || 0
        } : null,
        product: product ? {
          id: product.id,
          title: product.title,
          images: product.images
        } : null
      };
    });

    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ message: '리뷰 조회 실패', error: error.message });
  }
});

// @route   GET /api/reviews/product/:productId
// @desc    특정 제품의 리뷰 목록 (제품 리뷰만 - type: 'product')
// @access  Public
router.get('/product/:productId', async (req, res) => {
  try {
    // 제품 리뷰(type: 'product')만 필터링
    let reviews = db.get('reviews')
      .filter({ product: req.params.productId, type: 'product' })
      .orderBy(['createdAt'], ['desc'])
      .value();

    // 관련 정보 추가
    reviews = reviews.map(review => {
      const reviewer = db.get('users').find({ id: review.reviewer }).value();
      
      return {
        ...review,
        reviewer: reviewer ? {
          id: reviewer.id,
          username: reviewer.username,
          profileImage: reviewer.profileImage,
          averageRating: reviewer.averageRating || 0
        } : null
      };
    });

    // 평균 평점 계산
    const averageRating = reviews.length > 0
      ? reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length
      : 0;

    res.json({ 
      success: true, 
      reviews,
      averageRating,
      totalReviews: reviews.length
    });
  } catch (error) {
    res.status(500).json({ message: '리뷰 조회 실패', error: error.message });
  }
});

// @route   GET /api/reviews/rental/:rentalId
// @desc    특정 대여의 리뷰 조회
// @access  Private
router.get('/rental/:rentalId', protect, async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.rentalId }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    if (rental.owner !== req.user.id && rental.borrower !== req.user.id) {
      return res.status(403).json({ message: '접근 권한이 없습니다' });
    }

    let reviews = db.get('reviews')
      .filter({ rental: req.params.rentalId })
      .value();

    // 관련 정보 추가
    reviews = reviews.map(review => {
      const reviewer = db.get('users').find({ id: review.reviewer }).value();
      const reviewee = db.get('users').find({ id: review.reviewee }).value();
      
      return {
        ...review,
        reviewer: reviewer ? {
          id: reviewer.id,
          username: reviewer.username,
          profileImage: reviewer.profileImage
        } : null,
        reviewee: reviewee ? {
          id: reviewee.id,
          username: reviewee.username,
          profileImage: reviewee.profileImage
        } : null
      };
    });

    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ message: '리뷰 조회 실패', error: error.message });
  }
});

module.exports = router;
