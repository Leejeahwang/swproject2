const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { protect, adminOnly } = require('../middleware/auth');

// 모든 관리자 라우트에 인증 + 관리자 권한 체크
router.use(protect, adminOnly);

// @route   GET /api/admin/stats
// @desc    관리자 대시보드 통계
// @access  Admin
router.get('/stats', (req, res) => {
  try {
    const users = db.get('users').value() || [];
    const products = db.get('products').value() || [];
    const rentals = db.get('rentals').value() || [];

    // 통계 계산
    const stats = {
      totalUsers: users.length,
      totalProducts: products.length,
      totalRentals: rentals.length,
      activeRentals: rentals.filter(r => ['pending', 'approved', 'in_progress'].includes(r.status)).length,
      completedRentals: rentals.filter(r => r.status === 'completed').length,
      // 최근 7일 가입자
      recentUsers: users.filter(u => {
        const createdAt = new Date(u.createdAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return createdAt > weekAgo;
      }).length
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '통계 조회 중 오류가 발생했습니다' });
  }
});

// @route   GET /api/admin/users
// @desc    전체 사용자 목록
// @access  Admin
router.get('/users', (req, res) => {
  try {
    const users = db.get('users').value() || [];
    
    // 민감 정보 제외
    const safeUsers = users.map(user => {
      const { password, verificationCode, verificationExpires, ...safeUser } = user;
      return safeUser;
    });

    res.json({ success: true, users: safeUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '사용자 목록 조회 중 오류가 발생했습니다' });
  }
});

// @route   PUT /api/admin/users/:id/block
// @desc    사용자 차단 (기간 설정)
// @access  Admin
router.put('/users/:id/block', (req, res) => {
  try {
    const { id } = req.params;
    const { blockDays, reason } = req.body;

    if (!blockDays || blockDays < 1 || blockDays > 30) {
      return res.status(400).json({ message: '차단 기간은 1일~30일 사이여야 합니다' });
    }

    const user = db.get('users').find({ id }).value();
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 관리자는 차단 불가
    if (user.role === 'admin') {
      return res.status(400).json({ message: '관리자 계정은 차단할 수 없습니다' });
    }

    // 차단 기간 계산
    const blockedUntil = new Date();
    blockedUntil.setDate(blockedUntil.getDate() + parseInt(blockDays));

    db.get('users')
      .find({ id })
      .assign({
        blockedUntil: blockedUntil.toISOString(),
        blockReason: reason || '관리자에 의한 차단',
        blockedAt: new Date().toISOString(),
        blockedBy: req.user.id
      })
      .write();

    res.json({ 
      success: true, 
      message: `사용자가 ${blockDays}일간 차단되었습니다`,
      blockedUntil: blockedUntil.toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '사용자 차단 중 오류가 발생했습니다' });
  }
});

// @route   PUT /api/admin/users/:id/unblock
// @desc    사용자 차단 해제
// @access  Admin
router.put('/users/:id/unblock', (req, res) => {
  try {
    const { id } = req.params;

    const user = db.get('users').find({ id }).value();
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    db.get('users')
      .find({ id })
      .assign({
        blockedUntil: null,
        blockReason: null,
        blockedAt: null,
        blockedBy: null
      })
      .write();

    res.json({ success: true, message: '사용자 차단이 해제되었습니다' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '차단 해제 중 오류가 발생했습니다' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    사용자 강제 탈퇴
// @access  Admin
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;

    const user = db.get('users').find({ id }).value();
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 관리자는 삭제 불가
    if (user.role === 'admin') {
      return res.status(400).json({ message: '관리자 계정은 삭제할 수 없습니다' });
    }

    // 사용자의 상품 삭제
    db.get('products').remove({ owner: id }).write();

    // 사용자의 대여 기록 삭제
    db.get('rentals').remove(rental => rental.owner === id || rental.borrower === id).write();

    // 사용자의 채팅 삭제
    db.get('chats').remove(chat => chat.participants && chat.participants.includes(id)).write();

    // 사용자의 알림 삭제
    db.get('notifications').remove({ userId: id }).write();

    // 사용자의 리뷰 삭제
    db.get('reviews').remove({ reviewer: id }).write();

    // 증거 데이터는 별도 보관 (삭제하지 않음)
    // 사용자 삭제
    db.get('users').remove({ id }).write();

    res.json({ success: true, message: '사용자가 삭제되었습니다. 증거 데이터는 별도로 보관됩니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '사용자 삭제 중 오류가 발생했습니다' });
  }
});

// @route   GET /api/admin/products
// @desc    전체 상품 목록
// @access  Admin
router.get('/products', (req, res) => {
  try {
    const products = db.get('products').value() || [];
    const users = db.get('users').value() || [];

    // 소유자 정보 추가
    const productsWithOwner = products.map(product => {
      const owner = users.find(u => u.id === product.owner);
      return {
        ...product,
        ownerInfo: owner ? { id: owner.id, username: owner.username, email: owner.email } : null
      };
    });

    res.json({ success: true, products: productsWithOwner });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '상품 목록 조회 중 오류가 발생했습니다' });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    상품 강제 삭제
// @access  Admin
router.delete('/products/:id', (req, res) => {
  try {
    const { id } = req.params;

    const product = db.get('products').find({ id }).value();
    
    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다' });
    }

    // 진행 중인 대여가 있는지 확인
    const activeRental = db.get('rentals')
      .find(r => r.product === id && ['pending', 'approved', 'in_progress'].includes(r.status))
      .value();

    if (activeRental) {
      return res.status(400).json({ message: '진행 중인 대여가 있어 삭제할 수 없습니다. 먼저 대여를 취소해주세요.' });
    }

    // 상품 삭제
    db.get('products').remove({ id }).write();

    // 증거 데이터는 별도 보관 (삭제하지 않음)
    res.json({ success: true, message: '상품이 삭제되었습니다. 증거 데이터는 별도로 보관됩니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '상품 삭제 중 오류가 발생했습니다' });
  }
});

// @route   GET /api/admin/rentals
// @desc    전체 대여 목록
// @access  Admin
router.get('/rentals', (req, res) => {
  try {
    const rentals = db.get('rentals').value() || [];
    const users = db.get('users').value() || [];
    const products = db.get('products').value() || [];

    // 관련 정보 추가
    const rentalsWithInfo = rentals.map(rental => {
      const owner = users.find(u => u.id === rental.owner);
      const borrower = users.find(u => u.id === rental.borrower);
      const product = products.find(p => p.id === rental.product);

      return {
        ...rental,
        ownerInfo: owner ? { id: owner.id, username: owner.username } : null,
        borrowerInfo: borrower ? { id: borrower.id, username: borrower.username } : null,
        productInfo: product ? { id: product.id, title: product.title } : null
      };
    });

    res.json({ success: true, rentals: rentalsWithInfo });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '대여 목록 조회 중 오류가 발생했습니다' });
  }
});

// @route   PUT /api/admin/rentals/:id/cancel
// @desc    대여 강제 취소
// @access  Admin
router.put('/rentals/:id/cancel', (req, res) => {
  try {
    const { id } = req.params;

    const rental = db.get('rentals').find({ id }).value();
    
    if (!rental) {
      return res.status(404).json({ message: '대여 정보를 찾을 수 없습니다' });
    }

    // 이미 완료된 대여는 취소 불가
    if (rental.status === 'completed') {
      return res.status(400).json({ message: '이미 완료된 대여는 취소할 수 없습니다' });
    }

    // 이미 취소된 대여
    if (rental.status === 'cancelled' || rental.status === 'rejected') {
      return res.status(400).json({ message: '이미 취소된 대여입니다' });
    }

    // 대여 취소 처리
    db.get('rentals')
      .find({ id })
      .assign({ 
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'admin',
        cancelReason: '관리자에 의한 강제 취소'
      })
      .write();

    // 알림 생성 - 대여자에게
    const { createNotification } = require('./notifications');
    if (rental.borrower) {
      createNotification(
        rental.borrower,
        'rental',
        '관리자에 의해 대여가 취소되었습니다.',
        '/my-rentals'
      );
    }
    // 알림 생성 - 소유자에게
    if (rental.owner) {
      createNotification(
        rental.owner,
        'rental',
        '관리자에 의해 대여가 취소되었습니다.',
        '/my-rentals'
      );
    }

    res.json({ success: true, message: '대여가 취소되었습니다' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '대여 취소 중 오류가 발생했습니다' });
  }
});

// @route   GET /api/admin/evidence
// @desc    증거 데이터 조회 (관리자 전용)
// @access  Admin
router.get('/evidence', (req, res) => {
  try {
    const { rentalId, productId, userId } = req.query;
    
    let evidence = db.get('evidence').value() || [];
    
    // 필터링
    if (rentalId) {
      evidence = evidence.filter(e => e.rentalId === rentalId);
    }
    if (productId) {
      evidence = evidence.filter(e => e.productId === productId);
    }
    if (userId) {
      evidence = evidence.filter(e => e.ownerId === userId || e.borrowerId === userId);
    }
    
    // 최신순 정렬
    evidence.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, evidence, count: evidence.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '증거 데이터 조회 중 오류가 발생했습니다' });
  }
});

// @route   GET /api/admin/evidence/:id
// @desc    특정 증거 데이터 상세 조회
// @access  Admin
router.get('/evidence/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const evidence = db.get('evidence').find({ id }).value();
    
    if (!evidence) {
      return res.status(404).json({ message: '증거 데이터를 찾을 수 없습니다' });
    }
    
    res.json({ success: true, evidence });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '증거 데이터 조회 중 오류가 발생했습니다' });
  }
});

// @route   GET /api/admin/reports
// @desc    신고 목록 조회
// @access  Admin
router.get('/reports', (req, res) => {
  try {
    const { status, type } = req.query;
    
    let reports = db.get('reports').value() || [];
    
    // 필터링
    if (status) {
      reports = reports.filter(r => r.status === status);
    }
    if (type) {
      reports = reports.filter(r => r.type === type);
    }
    
    // 최신순 정렬
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 관련 정보 추가
    const reportsWithInfo = reports.map(report => {
      let targetInfo = null;
      
      if (report.targetType === 'product') {
        const product = db.get('products').find({ id: report.targetId }).value();
        targetInfo = product ? { id: product.id, title: product.title } : null;
      } else if (report.targetType === 'rental') {
        const rental = db.get('rentals').find({ id: report.targetId }).value();
        const product = rental ? db.get('products').find({ id: rental.product }).value() : null;
        targetInfo = rental ? {
          id: rental.id,
          productTitle: product ? product.title : '삭제된 제품',
          owner: rental.owner,
          borrower: rental.borrower
        } : null;
      } else if (report.targetType === 'user') {
        const user = db.get('users').find({ id: report.targetId }).value();
        targetInfo = user ? { id: user.id, username: user.username } : null;
      }
      
      return {
        ...report,
        targetInfo
      };
    });
    
    res.json({ success: true, reports: reportsWithInfo, count: reportsWithInfo.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '신고 목록 조회 중 오류가 발생했습니다' });
  }
});

// @route   PUT /api/admin/reports/:id/process
// @desc    신고 처리 (승인/거절)
// @access  Admin
router.put('/reports/:id/process', (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;
    
    const report = db.get('reports').find({ id }).value();
    
    if (!report) {
      return res.status(404).json({ message: '신고를 찾을 수 없습니다' });
    }
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 처리 상태입니다' });
    }
    
    db.get('reports')
      .find({ id })
      .assign({
        status,
        adminNote: adminNote || '',
        processedAt: new Date().toISOString(),
        processedBy: req.user.id,
        updatedAt: new Date().toISOString()
      })
      .write();
    
    // 신고자에게 알림
    createNotification(
      report.reporterId,
      'report',
      `신고가 ${status === 'approved' ? '승인' : '거절'}되었습니다.`,
      '/my-reports'
    );
    
    res.json({ success: true, message: '신고가 처리되었습니다' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '신고 처리 중 오류가 발생했습니다' });
  }
});

module.exports = router;








