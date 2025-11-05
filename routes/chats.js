const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const db = require('../database/db');

/**
 * @route   GET /api/chats
 * @desc    내 채팅방 목록 가져오기
 * @access  Private
 */
router.get('/', protect, (req, res) => {
  try {
    const userId = req.user.id;
    
    // 내가 참여한 채팅방 찾기
    const chats = db.get('chats')
      .filter(chat => chat.participants.includes(userId))
      .sortBy('lastMessageAt')
      .reverse()
      .value();
    
    // 각 채팅방에 상대방 유저 정보 추가
    const populatedChats = chats.map(chat => {
      const otherUserId = chat.participants.find(pId => pId !== userId);
      const otherUser = db.get('users').find({ id: otherUserId }).value();
      
      let safeOtherUser = { username: '알 수 없음' };
      if (otherUser) {
        const { password, ...rest } = otherUser;
        safeOtherUser = rest;
      }
      
      return {
        ...chat,
        otherUser: safeOtherUser
      };
    });

    res.json(populatedChats);
    
  } catch (error) {
    console.error('채팅 목록 로드 오류:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

/**
 * @route   GET /api/chats/:roomId
 * @desc    특정 채팅방의 메시지 내역 가져오기
 * @access  Private
 */
router.get('/:roomId', protect, (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;

    // roomId로 채팅방 찾기
    const chat = db.get('chats').find({ room: roomId }).value();

    if (!chat) {
      return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });
    }

    // 채팅방 참여자인지 확인
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: '이 채팅방에 접근할 권한이 없습니다' });
    }

    // 상대방 정보 추가
    const otherUserId = chat.participants.find(pId => pId !== userId);
    const otherUser = db.get('users').find({ id: otherUserId }).value();
    
    let safeOtherUser = { username: '알 수 없음' };
    if (otherUser) {
      const { password, ...rest } = otherUser;
      safeOtherUser = rest;
    }

    // 제품 정보 추가
    let product = null;
    if (chat.productId) {
      product = db.get('products').find({ id: chat.productId }).value();
      if (product) {
        product = {
          id: product.id,
          title: product.title,
          images: product.images,
          price: product.price
        };
      }
    }

    // 채팅방 정보 반환 (messages, 상대방, 제품 정보 포함)
    res.json({
      ...chat,
      otherUser: safeOtherUser,
      product: product
    });
    
  } catch (error) {
    console.error('채팅방 로드 오류:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;

