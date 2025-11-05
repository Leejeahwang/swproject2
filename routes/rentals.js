const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

// 날짜 범위가 겹치는지 확인하는 함수
const isDateRangeOverlap = (start1, end1, start2, end2) => {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);
  
  return s1 <= e2 && s2 <= e1;
};

// @route   GET /api/rentals/product/:productId/reserved-dates
// @desc    특정 제품의 예약된 날짜 조회
// @access  Public
router.get('/product/:productId/reserved-dates', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // 승인되었거나 진행중인 대여만 조회 (pending, cancelled, completed 제외)
    const rentals = db.get('rentals')
      .filter(r => 
        r.product === productId && 
        (r.status === 'approved' || r.status === 'ongoing')
      )
      .value();
    
    // 예약된 날짜 범위 목록 반환
    const reservedDates = rentals.map(rental => ({
      startDate: rental.startDate,
      startTime: rental.startTime,
      endDate: rental.endDate,
      endTime: rental.endTime,
      startDateTime: rental.startDateTime,
      endDateTime: rental.endDateTime,
      status: rental.status
    }));
    
    res.json({ success: true, reservedDates });
  } catch (error) {
    res.status(500).json({ message: '예약 날짜 조회 실패', error: error.message });
  }
});

// @route   POST /api/rentals
// @desc    대여 요청 생성
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { productId, startDate, startTime, endDate, endTime, meetingLocation } = req.body;

    const product = db.get('products').find({ id: productId }).value();
    
    if (!product) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다' });
    }

    if (product.owner === req.user.id) {
      return res.status(400).json({ message: '자신의 제품은 대여할 수 없습니다' });
    }

    // 시작 및 종료 날짜/시간 결합
    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;

    // 날짜 중복 체크 - 승인되었거나 진행중인 대여와 겹치는지 확인
    const existingRentals = db.get('rentals')
      .filter(r => 
        r.product === productId && 
        (r.status === 'approved' || r.status === 'ongoing')
      )
      .value();
    
    const hasOverlap = existingRentals.some(rental => 
      isDateRangeOverlap(startDateTime, endDateTime, rental.startDateTime, rental.endDateTime)
    );
    
    if (hasOverlap) {
      return res.status(400).json({ 
        message: '선택하신 기간에 이미 다른 예약이 있습니다. 다른 날짜를 선택해주세요.' 
      });
    }

    // 대여 기간 계산 (시간 포함)
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    const days = Math.ceil(hours / 24);
    
    let totalPrice;
    switch(product.priceUnit) {
      case '시간':
        totalPrice = product.price * hours;
        break;
      case '일':
        totalPrice = product.price * days;
        break;
      case '주':
        totalPrice = product.price * Math.ceil(days / 7);
        break;
      case '월':
        totalPrice = product.price * Math.ceil(days / 30);
        break;
      default:
        totalPrice = product.price * days;
    }

    const rentalId = uuidv4();
    const rental = {
      id: rentalId,
      _id: rentalId,  // 호환성을 위해 동일한 ID 사용
      product: productId,
      owner: product.owner,
      borrower: req.user.id,
      startDate,
      startTime,
      endDate,
      endTime,
      startDateTime,
      endDateTime,
      totalPrice,
      meetingLocation,
      status: 'pending',
      ownerReviewed: false,
      borrowerReviewed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.get('rentals').push(rental).write();

    // 관련 정보 추가해서 반환
    const owner = db.get('users').find({ id: rental.owner }).value();
    const borrower = db.get('users').find({ id: rental.borrower }).value();
    
    const populatedRental = {
      ...rental,
      product: {
        id: product.id,
        title: product.title,
        images: product.images,
        price: product.price,
        priceUnit: product.priceUnit
      },
      owner: owner ? {
        id: owner.id,
        username: owner.username,
        phone: owner.phone,
        profileImage: owner.profileImage
      } : null,
      borrower: borrower ? {
        id: borrower.id,
        username: borrower.username,
        phone: borrower.phone,
        profileImage: borrower.profileImage
      } : null
    };

    res.status(201).json({
      success: true,
      rental: populatedRental
    });
  } catch (error) {
    res.status(500).json({ message: '대여 요청 실패', error: error.message });
  }
});

// @route   GET /api/rentals/my-rentals
// @desc    내 대여 목록 (내가 빌린 것들)
// @access  Private
router.get('/my-rentals', protect, async (req, res) => {
  try {
    let rentals = db.get('rentals')
      .filter({ borrower: req.user.id })
      .orderBy(['createdAt'], ['desc'])
      .value();

    // 관련 정보 추가
    rentals = rentals.map(rental => {
      const product = db.get('products').find({ id: rental.product }).value();
      const owner = db.get('users').find({ id: rental.owner }).value();
      
      return {
        ...rental,
        product: product ? {
          id: product.id,
          title: product.title,
          images: product.images,
          price: product.price,
          priceUnit: product.priceUnit
        } : null,
        owner: owner ? {
          id: owner.id,
          username: owner.username,
          phone: owner.phone,
          averageRating: owner.averageRating || 0,
          profileImage: owner.profileImage
        } : null
      };
    });

    res.json({ success: true, rentals });
  } catch (error) {
    res.status(500).json({ message: '대여 목록 조회 실패', error: error.message });
  }
});

// @route   GET /api/rentals/my-listings
// @desc    내 제품의 대여 요청 목록 (다른 사람이 내 제품을 빌리려는 것들)
// @access  Private
router.get('/my-listings', protect, async (req, res) => {
  try {
    let rentals = db.get('rentals')
      .filter({ owner: req.user.id })
      .orderBy(['createdAt'], ['desc'])
      .value();

    // 관련 정보 추가
    rentals = rentals.map(rental => {
      const product = db.get('products').find({ id: rental.product }).value();
      const borrower = db.get('users').find({ id: rental.borrower }).value();
      
      return {
        ...rental,
        product: product ? {
          id: product.id,
          title: product.title,
          images: product.images,
          price: product.price,
          priceUnit: product.priceUnit
        } : null,
        borrower: borrower ? {
          id: borrower.id,
          username: borrower.username,
          phone: borrower.phone,
          averageRating: borrower.averageRating || 0,
          profileImage: borrower.profileImage
        } : null
      };
    });

    res.json({ success: true, rentals });
  } catch (error) {
    res.status(500).json({ message: '대여 목록 조회 실패', error: error.message });
  }
});

// @route   GET /api/rentals/:id
// @desc    특정 대여 상세 조회
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.id }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    // 권한 확인
    if (rental.owner !== req.user.id && rental.borrower !== req.user.id) {
      return res.status(403).json({ message: '접근 권한이 없습니다' });
    }

    // 관련 정보 추가
    const product = db.get('products').find({ id: rental.product }).value();
    const owner = db.get('users').find({ id: rental.owner }).value();
    const borrower = db.get('users').find({ id: rental.borrower }).value();

    const populatedRental = {
      ...rental,
      product: product ? {
        id: product.id,
        title: product.title,
        images: product.images,
        price: product.price,
        priceUnit: product.priceUnit,
        description: product.description
      } : null,
      owner: owner ? {
        _id: owner.id,
        id: owner.id,
        username: owner.username,
        phone: owner.phone,
        averageRating: owner.averageRating || 0,
        profileImage: owner.profileImage
      } : null,
      borrower: borrower ? {
        _id: borrower.id,
        id: borrower.id,
        username: borrower.username,
        phone: borrower.phone,
        averageRating: borrower.averageRating || 0,
        profileImage: borrower.profileImage
      } : null
    };

    res.json({ success: true, rental: populatedRental });
  } catch (error) {
    res.status(500).json({ message: '대여 조회 실패', error: error.message });
  }
});

// @route   PUT /api/rentals/:id/approve
// @desc    대여 승인
// @access  Private (Owner only)
router.put('/:id/approve', protect, async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.id }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    if (rental.owner !== req.user.id) {
      return res.status(403).json({ message: '승인 권한이 없습니다' });
    }

    if (rental.status !== 'pending') {
      return res.status(400).json({ message: '대기 중인 요청만 승인할 수 있습니다' });
    }

    // 날짜 중복 체크 - 승인 시에도 다시 확인
    const existingRentals = db.get('rentals')
      .filter(r => 
        r.product === rental.product && 
        r.id !== rental.id &&
        (r.status === 'approved' || r.status === 'ongoing')
      )
      .value();
    
    const hasOverlap = existingRentals.some(r => 
      isDateRangeOverlap(rental.startDateTime, rental.endDateTime, r.startDateTime, r.endDateTime)
    );
    
    if (hasOverlap) {
      return res.status(400).json({ 
        message: '해당 기간에 이미 승인된 다른 예약이 있습니다.' 
      });
    }

    db.get('rentals')
      .find({ id: req.params.id })
      .assign({ 
        status: 'approved',
        updatedAt: new Date().toISOString()
      })
      .write();

    const updatedRental = db.get('rentals').find({ id: req.params.id }).value();
    res.json({ success: true, rental: updatedRental });
  } catch (error) {
    res.status(500).json({ message: '대여 승인 실패', error: error.message });
  }
});

// @route   PUT /api/rentals/:id/start
// @desc    대여 시작
// @access  Private
router.put('/:id/start', protect, async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.id }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    if (rental.status !== 'approved') {
      return res.status(400).json({ message: '승인된 요청만 시작할 수 있습니다' });
    }

    db.get('rentals')
      .find({ id: req.params.id })
      .assign({ 
        status: 'ongoing',
        updatedAt: new Date().toISOString()
      })
      .write();

    const updatedRental = db.get('rentals').find({ id: req.params.id }).value();
    res.json({ success: true, rental: updatedRental });
  } catch (error) {
    res.status(500).json({ message: '대여 시작 실패', error: error.message });
  }
});

// @route   PUT /api/rentals/:id/complete
// @desc    대여 완료
// @access  Private
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.id }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    if (rental.owner !== req.user.id) {
      return res.status(403).json({ message: '완료 처리 권한이 없습니다' });
    }

    if (rental.status !== 'ongoing') {
      return res.status(400).json({ message: '진행 중인 대여만 완료할 수 있습니다' });
    }

    db.get('rentals')
      .find({ id: req.params.id })
      .assign({ 
        status: 'completed',
        updatedAt: new Date().toISOString()
      })
      .write();

    // 사용자 렌탈 횟수 업데이트
    const owner = db.get('users').find({ id: rental.owner }).value();
    const borrower = db.get('users').find({ id: rental.borrower }).value();

    if (owner) {
      db.get('users')
        .find({ id: rental.owner })
        .assign({ rentalCount: owner.rentalCount + 1 })
        .write();
    }

    if (borrower) {
      db.get('users')
        .find({ id: rental.borrower })
        .assign({ borrowCount: borrower.borrowCount + 1 })
        .write();
    }

    const updatedRental = db.get('rentals').find({ id: req.params.id }).value();
    res.json({ success: true, rental: updatedRental });
  } catch (error) {
    res.status(500).json({ message: '대여 완료 처리 실패', error: error.message });
  }
});

// @route   PUT /api/rentals/:id/cancel
// @desc    대여 취소
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.id }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    if (rental.owner !== req.user.id && rental.borrower !== req.user.id) {
      return res.status(403).json({ message: '취소 권한이 없습니다' });
    }

    if (rental.status === 'completed') {
      return res.status(400).json({ message: '완료된 대여는 취소할 수 없습니다' });
    }

    db.get('rentals')
      .find({ id: req.params.id })
      .assign({ 
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      })
      .write();

    const updatedRental = db.get('rentals').find({ id: req.params.id }).value();
    res.json({ success: true, rental: updatedRental });
  } catch (error) {
    res.status(500).json({ message: '대여 취소 실패', error: error.message });
  }
});

module.exports = router;
