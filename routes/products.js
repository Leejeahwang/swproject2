const express = require('express');
const router = express.Router();
const { protect, upload } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

// @route   GET /api/products
// @desc    제품 목록 조회 (검색, 필터링)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      region,
      minPrice,
      maxPrice,
      status,
      sort,
      page = 1,
      limit = 20
    } = req.query;

    // 모든 제품 가져오기
    let products = db.get('products').value();

    // 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.title.toLowerCase().includes(searchLower) || 
        p.description.toLowerCase().includes(searchLower)
      );
    }

    if (category) {
      products = products.filter(p => p.category === category);
    }

    if (region) {
      products = products.filter(p => p.region === region);
    }

    if (status) {
      products = products.filter(p => p.status === status);
    } else {
      // 기본적으로 unavailable 제외, available과 rented는 모두 표시
      products = products.filter(p => p.status !== 'unavailable');
    }

    if (minPrice) {
      products = products.filter(p => p.price >= Number(minPrice));
    }

    if (maxPrice) {
      products = products.filter(p => p.price <= Number(maxPrice));
    }

    // 정렬
    switch(sort) {
      case 'latest':
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'price_low':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'popular':
        products.sort((a, b) => b.views - a.views);
        break;
      default:
        products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // owner 정보 및 지연 상태 추가
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    products = products.map(product => {
      const owner = db.get('users').find({ id: product.owner }).value();
      
      // 현재 진행 중인 대여 확인 (지연 체크용)
      const activeRental = db.get('rentals')
        .find(r => r.product === product.id && ['in_progress', 'approved', 'ongoing'].includes(r.status))
        .value();
      
      let isOverdue = false;
      let overdueDays = 0;
      
      if (activeRental && activeRental.endDate) {
        const endDate = new Date(activeRental.endDate);
        endDate.setHours(0, 0, 0, 0);
        if (today > endDate) {
          isOverdue = true;
          overdueDays = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
        }
      }
      
      return {
        ...product,
        isOverdue,
        overdueDays,
        owner: owner ? {
          id: owner.id,
          username: owner.username,
          averageRating: owner.averageRating || 0,
          profileImage: owner.profileImage
        } : null
      };
    });

    // 페이지네이션
    const total = products.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    products = products.slice(startIndex, endIndex);

    res.json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: '제품 조회 실패', error: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    특정 제품 상세 조회
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = db.get('products').find({ id: req.params.id }).value();

    if (!product) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다' });
    }

    // 조회수 증가
    db.get('products')
      .find({ id: req.params.id })
      .assign({ views: product.views + 1 })
      .write();

    // owner 정보 추가
    const owner = db.get('users').find({ id: product.owner }).value();
    const productWithOwner = {
      ...product,
      views: product.views + 1,
      owner: owner ? {
        _id: owner.id,
        id: owner.id,
        username: owner.username,
        averageRating: owner.averageRating || 0,
        profileImage: owner.profileImage,
        phone: owner.phone,
        primaryRegion: owner.primaryRegion,
        rentalCount: owner.rentalCount
      } : null
    };

    // 같은 카테고리의 다른 제품 추천
    let recommendedProducts = db.get('products')
      .filter(p => p.category === product.category && p.id !== product.id && p.status === 'available')
      .take(6)
      .value();

    // 추천 제품에도 owner 정보 추가
    recommendedProducts = recommendedProducts.map(p => {
      const pOwner = db.get('users').find({ id: p.owner }).value();
      return {
        ...p,
        owner: pOwner ? {
          id: pOwner.id,
          username: pOwner.username,
          averageRating: pOwner.averageRating || 0,
          profileImage: pOwner.profileImage
        } : null
      };
    });

    res.json({
      success: true,
      product: productWithOwner,
      recommendedProducts
    });
  } catch (error) {
    res.status(500).json({ message: '제품 조회 실패', error: error.message });
  }
});

// @route   POST /api/products
// @desc    제품 등록
// @access  Private
router.post('/', protect, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, category, price, priceUnit, location, region, condition } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '최소 1개의 이미지를 업로드해주세요' });
    }

    const images = req.files.map(file => `/uploads/${file.filename}`);

    const productId = uuidv4();
    const product = {
      id: productId,
      _id: productId,  // 호환성을 위해 동일한 ID 사용
      title,
      description,
      category,
      price: Number(price),
      priceUnit: priceUnit || '일',
      images,
      owner: req.user.id,
      location,
      region,
      condition: condition || '상',
      status: 'available',
      views: 0,
      likes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.get('products').push(product).write();

    // owner 정보 추가해서 반환
    const owner = db.get('users').find({ id: req.user.id }).value();
    const productWithOwner = {
      ...product,
      owner: owner ? {
        id: owner.id,
        username: owner.username,
        averageRating: owner.averageRating || 0,
        profileImage: owner.profileImage
      } : null
    };

    res.status(201).json({
      success: true,
      product: productWithOwner
    });
  } catch (error) {
    res.status(500).json({ message: '제품 등록 실패', error: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    제품 수정
// @access  Private (Owner only)
router.put('/:id', protect, async (req, res) => {
  try {
    const product = db.get('products').find({ id: req.params.id }).value();

    if (!product) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다' });
    }

    // 권한 확인
    if (product.owner !== req.user.id) {
      return res.status(403).json({ message: '제품을 수정할 권한이 없습니다' });
    }

    const { title, description, price, priceUnit, location, status, condition } = req.body;
    
    const updateData = { updatedAt: new Date().toISOString() };
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price) updateData.price = Number(price);
    if (priceUnit) updateData.priceUnit = priceUnit;
    if (location) updateData.location = location;
    if (status) updateData.status = status;
    if (condition) updateData.condition = condition;

    db.get('products')
      .find({ id: req.params.id })
      .assign(updateData)
      .write();

    const updatedProduct = db.get('products').find({ id: req.params.id }).value();
    const owner = db.get('users').find({ id: updatedProduct.owner }).value();
    
    const productWithOwner = {
      ...updatedProduct,
      owner: owner ? {
        id: owner.id,
        username: owner.username,
        averageRating: owner.averageRating || 0,
        profileImage: owner.profileImage
      } : null
    };

    res.json({ success: true, product: productWithOwner });
  } catch (error) {
    res.status(500).json({ message: '제품 수정 실패', error: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    제품 삭제
// @access  Private (Owner only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = db.get('products').find({ id: req.params.id }).value();

    if (!product) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다' });
    }

    // 권한 확인
    if (product.owner !== req.user.id) {
      return res.status(403).json({ message: '제품을 삭제할 권한이 없습니다' });
    }

    db.get('products').remove({ id: req.params.id }).write();

    res.json({ success: true, message: '제품이 삭제되었습니다' });
  } catch (error) {
    res.status(500).json({ message: '제품 삭제 실패', error: error.message });
  }
});

// @route   POST /api/products/:id/like
// @desc    제품 찜하기/취소
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const product = db.get('products').find({ id: req.params.id }).value();

    if (!product) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다' });
    }

    const likes = product.likes || [];
    const likeIndex = likes.indexOf(req.user.id);

    let newLikes;
    let liked;

    if (likeIndex > -1) {
      // 이미 찜한 경우 -> 취소
      newLikes = likes.filter(id => id !== req.user.id);
      liked = false;
    } else {
      // 찜하기
      newLikes = [...likes, req.user.id];
      liked = true;
    }

    db.get('products')
      .find({ id: req.params.id })
      .assign({ likes: newLikes })
      .write();

    res.json({
      success: true,
      liked,
      likesCount: newLikes.length
    });
  } catch (error) {
    res.status(500).json({ message: '찜하기 처리 실패', error: error.message });
  }
});

// @route   GET /api/products/user/:userId
// @desc    특정 사용자의 제품 목록
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    let products = db.get('products')
      .filter({ owner: req.params.userId })
      .orderBy(['createdAt'], ['desc'])
      .value();

    // owner 정보 추가
    const owner = db.get('users').find({ id: req.params.userId }).value();
    products = products.map(product => ({
      ...product,
      owner: owner ? {
        id: owner.id,
        username: owner.username,
        averageRating: owner.averageRating || 0,
        profileImage: owner.profileImage
      } : null
    }));

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ message: '제품 조회 실패', error: error.message });
  }
});

module.exports = router;
