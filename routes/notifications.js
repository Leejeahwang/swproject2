const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

// @route   GET /api/notifications
// @desc    알림 목록 조회
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let notifications = db.get('notifications')
      .filter({ userId: req.user.id })
      .orderBy(['createdAt'], ['desc'])
      .value();

    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ message: '알림 조회 실패', error: error.message });
  }
});

// @route   GET /api/notifications/count
// @desc    읽지 않은 알림 개수 조회
// @access  Private
router.get('/count', protect, async (req, res) => {
  try {
    const count = db.get('notifications')
      .filter({ userId: req.user.id, read: false })
      .size()
      .value();

    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ message: '알림 개수 조회 실패', error: error.message });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    알림 읽음 처리
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = db.get('notifications').find({ id: req.params.id }).value();

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ message: '권한이 없습니다' });
    }

    db.get('notifications')
      .find({ id: req.params.id })
      .assign({ read: true, updatedAt: new Date().toISOString() })
      .write();

    const updatedNotification = db.get('notifications').find({ id: req.params.id }).value();
    res.json({ success: true, notification: updatedNotification });
  } catch (error) {
    res.status(500).json({ message: '알림 읽음 처리 실패', error: error.message });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    모든 알림 읽음 처리
// @access  Private
router.put('/read-all', protect, async (req, res) => {
  try {
    const notifications = db.get('notifications')
      .filter({ userId: req.user.id, read: false })
      .value();

    notifications.forEach(notification => {
      db.get('notifications')
        .find({ id: notification.id })
        .assign({ read: true, updatedAt: new Date().toISOString() })
        .write();
    });

    res.json({ success: true, message: '모든 알림을 읽음 처리했습니다' });
  } catch (error) {
    res.status(500).json({ message: '알림 읽음 처리 실패', error: error.message });
  }
});

// 알림 생성 헬퍼 함수
const createNotification = (userId, type, message, link = null) => {
  const notificationId = uuidv4();
  const notification = {
    id: notificationId,
    userId,
    type,
    message,
    link,
    read: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.get('notifications').push(notification).write();
  return notification;
};

module.exports = router;
module.exports.createNotification = createNotification;

