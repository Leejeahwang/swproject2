const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { createNotification } = require('./notifications');

// @route   POST /api/reports
// @desc    신고 생성 (노쇼/허위매물)
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { type, targetType, targetId, reason, description } = req.body;

    // 필수 필드 검증
    if (!type || !targetType || !targetId || !reason) {
      return res.status(400).json({ message: '필수 정보를 모두 입력해주세요' });
    }

    // 신고 타입 검증
    const validTypes = ['no_show', 'fake_product', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: '유효하지 않은 신고 타입입니다' });
    }

    // 대상 타입 검증
    const validTargetTypes = ['product', 'rental', 'user'];
    if (!validTargetTypes.includes(targetType)) {
      return res.status(400).json({ message: '유효하지 않은 대상 타입입니다' });
    }

    // 중복 신고 확인 (같은 사용자가 같은 대상을 이미 신고했는지)
    const existingReport = db.get('reports')
      .find(r => 
        r.reporterId === req.user.id && 
        r.targetType === targetType && 
        r.targetId === targetId &&
        r.status === 'pending'
      )
      .value();

    if (existingReport) {
      return res.status(400).json({ message: '이미 신고한 대상입니다' });
    }

    // 대상 존재 확인
    let targetExists = false;
    if (targetType === 'product') {
      targetExists = !!db.get('products').find({ id: targetId }).value();
    } else if (targetType === 'rental') {
      targetExists = !!db.get('rentals').find({ id: targetId }).value();
    } else if (targetType === 'user') {
      targetExists = !!db.get('users').find({ id: targetId }).value();
    }

    if (!targetExists) {
      return res.status(404).json({ message: '신고 대상을 찾을 수 없습니다' });
    }

    const reportId = uuidv4();
    const report = {
      id: reportId,
      _id: reportId,
      type,
      targetType,
      targetId,
      reporterId: req.user.id,
      reporterUsername: req.user.username,
      reason,
      description: description || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.get('reports').push(report).write();

    // 관리자에게 알림 (관리자 계정 찾기)
    const admins = db.get('users')
      .filter(u => u.role === 'admin')
      .value();

    admins.forEach(admin => {
      createNotification(
        admin.id,
        'report',
        `새로운 신고가 접수되었습니다: ${type === 'no_show' ? '노쇼' : type === 'fake_product' ? '허위매물' : '기타'} 신고`,
        '/admin?tab=reports'
      );
    });

    res.status(201).json({
      success: true,
      message: '신고가 접수되었습니다',
      report
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '신고 접수 실패', error: error.message });
  }
});

// @route   GET /api/reports
// @desc    내 신고 목록 조회
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const reports = db.get('reports')
      .filter(r => r.reporterId === req.user.id)
      .orderBy(['createdAt'], ['desc'])
      .value();

    res.json({ success: true, reports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '신고 목록 조회 실패', error: error.message });
  }
});

module.exports = router;

