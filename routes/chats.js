const express = require('express');
const router = express.Router();
const db = require('../database/db');

// ----- 💡 (중요) 임시 인증 미들웨어 -----
// auth.js의 JWT 토큰을 확인하는 '진짜' auth 미들웨어를 사용해야 하지만,
// 지금은 테스트를 위해 클라이언트가 헤더에 'x-user-id'를 보낸다고 가정합니다.
// (나중에 꼭 실제 JWT 인증 미들웨어로 교체하세요)
const auth = (req, res, next) => {
  const userId = req.headers['x-user-id']; // (임시)
  
  if (!userId) {
    // 'auth.js'에서 발급한 토큰을 검증하는 실제 로직을 사용하세요.
    return res.status(401).json({ message: '인증 헤더(x-user-id)가 없습니다 (임시)' });
  }
  
  // (임시) req.user에 사용자 ID 주입
  req.user = { id: userId }; 
  next();
};
// ----------------------------------------


/**
 * @route   GET /api/chats
 * @desc    내 채팅방 목록 가져오기
 * @access  Private (auth 미들웨어 사용)
 */
router.get('/', auth, (req, res) => {
  try {
    const userId = req.user.id;
    
    // 1. 내가 참여한(participants) 채팅방을 모두 찾습니다.
    const chats = db.get('chats')
      .filter(chat => chat.participants.includes(userId))
      .sortBy('lastMessageAt') // 마지막 메시지 시간순으로 정렬
      .reverse() // 최신순으로
      .value();
    
    // 2. 각 채팅방에 '상대방' 유저 정보를 추가합니다. (ChatList.js에서 필요)
    const populatedChats = chats.map(chat => {
      // 참여자 중 내가 아닌 ID 찾기
      const otherUserId = chat.participants.find(pId => pId !== userId);
      const otherUser = db.get('users').find({ id: otherUserId }).value();
      
      let safeOtherUser = { username: '알 수 없음' };
      if (otherUser) {
        // (보안) 비밀번호 같은 민감 정보 제거
        const { password, ...rest } = otherUser;
        safeOtherUser = rest;
      }
      
      return {
        ...chat,
        otherUser: safeOtherUser // 'otherUser' 키에 상대방 정보 추가
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
 * @access  Private (auth 미들웨어 사용)
 */
router.get('/:roomId', auth, (req, res) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.params;

    // 1. roomId로 채팅방 찾기
    const chat = db.get('chats').find({ room: roomId }).value();

    if (!chat) {
      return res.status(404).json({ message: '채팅방을 찾을 수 없습니다' });
    }

    // 2. (보안) 이 채팅방의 참여자인지 확인
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: '이 채팅방에 접근할 권한이 없습니다' });
    }

    // 3. 채팅방 정보 (messages 배열 포함) 반환
    res.json(chat);
    
  } catch (error) {
    console.error('채팅방 로드 오류:', error);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;