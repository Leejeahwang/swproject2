const express = require('express');
const router = express.Router();
const { protect, upload } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { createNotification } = require('./notifications');

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
    const { 
      productId, 
      startDate, 
      startTime, 
      endDate, 
      endTime, 
      meetingLocation,
      borrowerSafePay,
      insurance
    } = req.body;

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

    // 대여 기간 계산 (일 단위)
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    const days = Math.ceil(hours / 24);
    
    // 기본 렌탈 가격 계산
    const rentalPrice = product.price * days;

    // 결제 옵션 계산
    let borrowerSafePayFee = 0;
    let insuranceFee = 0;
    let insuranceType = insurance || 'none';
    let insuranceMaxCoverage = 0;

    // 안심결제 수수료 (빌리는 사람)
    if (borrowerSafePay) {
      borrowerSafePayFee = Math.round(rentalPrice * 0.03);
    }

    // 보험 수수료
    if (insuranceType === 'basic') {
      insuranceFee = Math.round(rentalPrice * 0.10);
      insuranceMaxCoverage = 100000;
    } else if (insuranceType === 'premium') {
      insuranceFee = Math.round(rentalPrice * 0.15);
      insuranceMaxCoverage = 500000;
    } else if (insuranceType === 'luxury') {
      insuranceFee = Math.round(rentalPrice * 0.20);
      insuranceMaxCoverage = 2000000;
    }

    // 총 결제 금액 (빌리는 사람이 결제할 금액)
    const totalAmount = rentalPrice + borrowerSafePayFee + insuranceFee;

    const rentalId = uuidv4();
    const rental = {
      id: rentalId,
      _id: rentalId,
      product: productId,
      owner: product.owner,
      borrower: req.user.id,
      startDate,
      startTime,
      endDate,
      endTime,
      startDateTime,
      endDateTime,
      rentalPrice,
      borrowerSafePay: borrowerSafePay || false,
      borrowerSafePayFee,
      ownerSafePay: false,
      ownerSafePayFee: 0,
      insurance: insuranceType,
      insuranceFee,
      insuranceMaxCoverage,
      totalAmount,
      platformFee: borrowerSafePayFee + insuranceFee,
      ownerAmount: 0,
      paymentStatus: 'pending',
      meetingLocation,
      status: 'pending',
      ownerReviewed: false,
      borrowerReviewed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.get('rentals').push(rental).write();

    // 대여 신청 알림 생성 - 물품 소유자에게
    createNotification(
      product.owner,
      'rental',
      `${req.user.username}님이 "${product.title}" 대여를 신청했습니다`,
      `/my-rentals`
    );

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
      .filter(r => r.borrower === req.user.id && r.status !== 'completed' && r.status !== 'cancelled')
      .orderBy(['createdAt'], ['desc'])
      .value();

    // 관련 정보 추가 및 삭제된 제품 필터링
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
    }).filter(rental => rental.product !== null); // 삭제된 제품 제외

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
      .filter(r => r.owner === req.user.id && r.status !== 'completed' && r.status !== 'cancelled')
      .orderBy(['createdAt'], ['desc'])
      .value();

    // 관련 정보 추가 및 삭제된 제품 필터링
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
    }).filter(rental => rental.product !== null); // 삭제된 제품 제외

    res.json({ success: true, rentals });
  } catch (error) {
    res.status(500).json({ message: '대여 목록 조회 실패', error: error.message });
  }
});

// @route   GET /api/rentals/history
// @desc    과거 대여 목록 (완료/취소된 내역)
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    let rentals = db.get('rentals')
      .filter(r => 
        (r.borrower === req.user.id || r.owner === req.user.id) && 
        (r.status === 'completed' || r.status === 'cancelled')
      )
      .orderBy(['updatedAt'], ['desc'])
      .value();

    // 관련 정보 추가 및 삭제된 제품 필터링
    rentals = rentals.map(rental => {
      const product = db.get('products').find({ id: rental.product }).value();
      const owner = db.get('users').find({ id: rental.owner }).value();
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
        owner: owner ? {
          id: owner.id,
          username: owner.username,
          phone: owner.phone,
          averageRating: owner.averageRating || 0,
          profileImage: owner.profileImage
        } : null,
        borrower: borrower ? {
          id: borrower.id,
          username: borrower.username,
          phone: borrower.phone,
          averageRating: borrower.averageRating || 0,
          profileImage: borrower.profileImage
        } : null
      };
    }).filter(rental => rental.product !== null); // 삭제된 제품 제외

    res.json({ success: true, rentals });
  } catch (error) {
    res.status(500).json({ message: '과거 대여 목록 조회 실패', error: error.message });
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
    const { ownerSafePay } = req.body;
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

    // 빌려주는 사람의 안심결제 수수료 계산
    let ownerSafePayFee = 0;
    if (ownerSafePay) {
      ownerSafePayFee = Math.round(rental.rentalPrice * 0.03);
    }

    // 총 플랫폼 수수료 및 빌려주는 사람이 받을 금액 계산
    const totalPlatformFee = rental.borrowerSafePayFee + rental.insuranceFee + ownerSafePayFee;
    const ownerReceiveAmount = rental.rentalPrice - ownerSafePayFee;

    db.get('rentals')
      .find({ id: req.params.id })
      .assign({ 
        status: 'approved',
        ownerSafePay: ownerSafePay || false,
        ownerSafePayFee,
        platformFee: totalPlatformFee,
        ownerAmount: ownerReceiveAmount,
        updatedAt: new Date().toISOString()
      })
      .write();

    const updatedRental = db.get('rentals').find({ id: req.params.id }).value();
    
    // 대여 확정 알림 생성 - 빌린 사람에게
    const product = db.get('products').find({ id: rental.product }).value();
    createNotification(
      rental.borrower,
      'rental',
      `"${product ? product.title : '물품'}" 대여가 확정되었습니다. 결제를 완료해주세요.`,
      `/my-rentals`
    );
    
    res.json({ success: true, rental: updatedRental });
  } catch (error) {
    res.status(500).json({ message: '대여 승인 실패', error: error.message });
  }
});

// @route   PUT /api/rentals/:id/pay
// @desc    결제 처리 (빌리는 사람)
// @access  Private
router.put('/:id/pay', protect, async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.id }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    // 빌리는 사람만 결제 가능
    if (rental.borrower !== req.user.id) {
      return res.status(403).json({ message: '결제 권한이 없습니다' });
    }

    if (rental.status !== 'approved') {
      return res.status(400).json({ message: '승인된 대여만 결제할 수 있습니다' });
    }

    if (rental.paymentStatus === 'paid') {
      return res.status(400).json({ message: '이미 결제가 완료되었습니다' });
    }

    // 결제 처리 (실제로는 결제 API 호출이 필요하지만, 여기서는 시뮬레이션)
    db.get('rentals')
      .find({ id: req.params.id })
      .assign({ 
        paymentStatus: 'paid',
        paymentDate: Date.now(),
        status: 'ongoing',
        updatedAt: new Date().toISOString()
      })
      .write();

    const updatedRental = db.get('rentals').find({ id: req.params.id }).value();
    
    res.json({ 
      success: true, 
      rental: updatedRental,
      message: '결제가 완료되었습니다. 대여가 시작되었습니다.'
    });
  } catch (error) {
    res.status(500).json({ message: '결제 처리 실패', error: error.message });
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

// @route   PUT /api/rentals/:id/before-images
// @desc    대여 시작 전 이미지 업로드
// @access  Private
router.put('/:id/before-images', protect, upload.array('images', 5), async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.id }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    // 권한 확인 (소유자 또는 대여자)
    if (rental.owner !== req.user.id && rental.borrower !== req.user.id) {
      return res.status(403).json({ message: '이미지 업로드 권한이 없습니다' });
    }

    // ongoing 상태에서만 업로드 가능
    if (rental.status !== 'ongoing' && rental.status !== 'approved') {
      return res.status(400).json({ message: '진행 중인 대여만 이미지를 업로드할 수 있습니다' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '최소 1개의 이미지를 업로드해주세요' });
    }

    const images = req.files.map(file => `/uploads/${file.filename}`);

    db.get('rentals')
      .find({ id: req.params.id })
      .assign({ 
        beforeImages: images,
        beforeImagesUploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .write();

    const updatedRental = db.get('rentals').find({ id: req.params.id }).value();
    res.json({ success: true, rental: updatedRental });
  } catch (error) {
    res.status(500).json({ message: '이미지 업로드 실패', error: error.message });
  }
});

// @route   PUT /api/rentals/:id/after-images
// @desc    반납 시 이미지 업로드
// @access  Private
router.put('/:id/after-images', protect, upload.array('images', 5), async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.id }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    // 권한 확인 (소유자 또는 대여자)
    if (rental.owner !== req.user.id && rental.borrower !== req.user.id) {
      return res.status(403).json({ message: '이미지 업로드 권한이 없습니다' });
    }

    // returning 상태에서만 업로드 가능
    if (rental.status !== 'returning' && rental.status !== 'ongoing') {
      return res.status(400).json({ message: '반납 대기 중이거나 진행 중인 대여만 이미지를 업로드할 수 있습니다' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '최소 1개의 이미지를 업로드해주세요' });
    }

    const images = req.files.map(file => `/uploads/${file.filename}`);

    db.get('rentals')
      .find({ id: req.params.id })
      .assign({ 
        afterImages: images,
        afterImagesUploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .write();

    const updatedRental = db.get('rentals').find({ id: req.params.id }).value();
    res.json({ success: true, rental: updatedRental });
  } catch (error) {
    res.status(500).json({ message: '이미지 업로드 실패', error: error.message });
  }
});

// @route   PUT /api/rentals/:id/return
// @desc    반납 요청 (빌린 사람)
// @access  Private
router.put('/:id/return', protect, async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.id }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    // 빌린 사람만 반납 요청 가능
    if (rental.borrower !== req.user.id) {
      return res.status(403).json({ message: '반납 권한이 없습니다' });
    }

    // approved 또는 ongoing 상태에서 반납 가능 (in_progress도 포함)
    if (rental.status !== 'ongoing' && rental.status !== 'approved' && rental.status !== 'in_progress') {
      return res.status(400).json({ message: '승인된 대여 또는 진행 중인 대여만 반납할 수 있습니다' });
    }

    // 지연 요금 계산
    const product = db.get('products').find({ id: rental.product }).value();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(rental.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    let overdueDays = 0;
    let lateFee = 0;
    
    if (today > endDate) {
      overdueDays = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
      const dailyRate = product ? product.price : 0;
      lateFee = Math.floor(dailyRate * 1.5 * overdueDays); // 1.5배 지연 요금
    }

    db.get('rentals')
      .find({ id: req.params.id })
      .assign({ 
        status: 'returning',
        returnRequestedAt: new Date().toISOString(),
        overdueDays: overdueDays,
        lateFee: lateFee,
        updatedAt: new Date().toISOString()
      })
      .write();

    const updatedRental = db.get('rentals').find({ id: req.params.id }).value();
    
    // 반납 요청 알림 생성 - 빌려준 사람에게
    let notificationMessage = `"${product ? product.title : '물품'}" 반납 확인 요청이 왔습니다`;
    if (overdueDays > 0) {
      notificationMessage += ` (${overdueDays}일 지연, 지연 요금: ${lateFee.toLocaleString()}원)`;
    }
    
    createNotification(
      rental.owner,
      'rental',
      notificationMessage,
      `/my-rentals`
    );
    
    res.json({ 
      success: true, 
      rental: updatedRental,
      overdueDays,
      lateFee
    });
  } catch (error) {
    res.status(500).json({ message: '반납 요청 실패', error: error.message });
  }
});

// @route   PUT /api/rentals/:id/complete
// @desc    반납 확인 및 대여 완료 (빌려준 사람)
// @access  Private
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const rental = db.get('rentals').find({ id: req.params.id }).value();

    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    // 빌려주는 사람만 반납 확인 가능
    if (rental.owner !== req.user.id) {
      return res.status(403).json({ message: '반납 확인 권한이 없습니다' });
    }

    // returning 상태에서만 완료 가능
    if (rental.status !== 'returning') {
      return res.status(400).json({ message: '반납 대기 중인 대여만 완료할 수 있습니다' });
    }

    // 지연 요금 포함 총 정산 금액 계산
    const lateFee = rental.lateFee || 0;
    const overdueDays = rental.overdueDays || 0;
    const baseOwnerAmount = rental.ownerAmount || 0;
    const totalOwnerAmount = baseOwnerAmount + lateFee; // 지연 요금도 소유자에게

    // 정산 처리
    db.get('rentals')
      .find({ id: req.params.id })
      .assign({ 
        status: 'completed',
        paymentStatus: 'settled',
        settledAt: Date.now(),
        finalOwnerAmount: totalOwnerAmount,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .write();

    // 사용자 렌탈 횟수 및 수익 업데이트
    const owner = db.get('users').find({ id: rental.owner }).value();
    const borrower = db.get('users').find({ id: rental.borrower }).value();

    if (owner) {
      const currentEarnings = owner.totalEarnings || 0;
      const newEarnings = currentEarnings + totalOwnerAmount;
      
      db.get('users')
        .find({ id: rental.owner })
        .assign({ 
          rentalCount: (owner.rentalCount || 0) + 1,
          totalEarnings: newEarnings
        })
        .write();
    }

    if (borrower) {
      db.get('users')
        .find({ id: rental.borrower })
        .assign({ borrowCount: (borrower.borrowCount || 0) + 1 })
        .write();
    }

    const updatedRental = db.get('rentals').find({ id: req.params.id }).value();
    const product = db.get('products').find({ id: rental.product }).value();
    
    // 반납 완료 알림 생성 - 빌린 사람에게
    let borrowerMessage = `"${product ? product.title : '물품'}" 반납이 완료되었습니다`;
    if (overdueDays > 0) {
      borrowerMessage += ` (지연 ${overdueDays}일, 지연 요금: ${lateFee.toLocaleString()}원)`;
    }
    
    createNotification(
      rental.borrower,
      'rental',
      borrowerMessage,
      `/my-rentals`
    );
    
    // 정산 완료 알림 생성 - 빌려준 사람에게
    let ownerMessage = `"${product ? product.title : '물품'}" 정산이 완료되었습니다. ${totalOwnerAmount.toLocaleString()}원이 입금되었습니다.`;
    if (overdueDays > 0) {
      ownerMessage += ` (지연 요금 ${lateFee.toLocaleString()}원 포함)`;
    }
    
    createNotification(
      rental.owner,
      'rental',
      ownerMessage,
      `/profile`
    );
    
    res.json({ 
      success: true, 
      rental: updatedRental,
      overdueDays,
      lateFee,
      totalAmount: totalOwnerAmount,
      message: overdueDays > 0 
        ? `정산이 완료되었습니다. ${totalOwnerAmount.toLocaleString()}원이 입금되었습니다. (지연 요금 ${lateFee.toLocaleString()}원 포함)`
        : `정산이 완료되었습니다. ${totalOwnerAmount.toLocaleString()}원이 입금되었습니다.`
    });
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

    if (rental.status === 'ongoing') {
      return res.status(400).json({ message: '진행 중인 대여는 취소할 수 없습니다' });
    }

    // 빌린 사람(borrower)은 pending 상태에서만 취소 가능
    if (rental.borrower === req.user.id && rental.status !== 'pending') {
      return res.status(400).json({ message: '예약이 확정된 대여는 취소할 수 없습니다' });
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
