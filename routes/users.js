const express = require('express');
const router = express.Router();
const { protect, upload } = require('../middleware/auth');
const db = require('../database/db');

// @route   GET /api/users/me
// @desc    현재 사용자 정보 조회
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = db.get('users').find({ id: req.user.id }).value();
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: '사용자 정보 조회 실패', error: error.message });
  }
});

// @route   PUT /api/users/me
// @desc    현재 사용자 정보 수정
// @access  Private
router.put('/me', protect, async (req, res) => {
  try {
    const { name, phone, regions, primaryRegion, subRegion } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (regions) updateData.regions = regions;
    if (primaryRegion) updateData.primaryRegion = primaryRegion;
    if (subRegion !== undefined) updateData.subRegion = subRegion;

    db.get('users')
      .find({ id: req.user.id })
      .assign(updateData)
      .write();

    const user = db.get('users').find({ id: req.user.id }).value();
    const { password, ...userWithoutPassword } = user;

    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: '사용자 정보 수정 실패', error: error.message });
  }
});

// @route   GET /api/users/:id
// @desc    특정 사용자 프로필 조회
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = db.get('users').find({ id: req.params.id }).value();
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 사용자의 리뷰 가져오기
    const reviews = db.get('reviews')
      .filter({ reviewee: req.params.id })
      .orderBy(['createdAt'], ['desc'])
      .take(10)
      .value()
      .map(review => {
        const reviewer = db.get('users').find({ id: review.reviewer }).value();
        const product = db.get('products').find({ id: review.product }).value();
        return {
          ...review,
          reviewer: reviewer ? { id: reviewer.id, username: reviewer.username, profileImage: reviewer.profileImage } : null,
          product: product ? { id: product.id, title: product.title } : null
        };
      });

    const { password, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword, reviews });
  } catch (error) {
    res.status(500).json({ message: '사용자 조회 실패', error: error.message });
  }
});

// @route   POST /api/users/profile-image
// @desc    프로필 이미지 업로드
// @access  Private
router.post('/profile-image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '이미지를 업로드해주세요' });
    }

    db.get('users')
      .find({ id: req.user.id })
      .assign({ profileImage: `/uploads/${req.file.filename}` })
      .write();

    const user = db.get('users').find({ id: req.user.id }).value();

    res.json({ success: true, profileImage: user.profileImage });
  } catch (error) {
    res.status(500).json({ message: '이미지 업로드 실패', error: error.message });
  }
});

module.exports = router;
