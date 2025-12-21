const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');

// IP 주소 추출 함수
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

// 증거 데이터 자동 수집 미들웨어
const collectEvidence = (req, res, next) => {
  // 대여 관련 엔드포인트에서만 증거 수집
  const evidenceEndpoints = [
    '/api/rentals',
    '/api/chats'
  ];

  const shouldCollect = evidenceEndpoints.some(endpoint => 
    req.path.startsWith(endpoint)
  );

  if (!shouldCollect) {
    return next();
  }

  // 원본 응답 메서드 저장
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  // 응답 인터셉터
  res.json = function(data) {
    // 대여 생성/수정 시 증거 데이터 저장
    if (req.method === 'POST' && req.path.startsWith('/api/rentals') && data.success && data.rental) {
      saveRentalEvidence(data.rental, req);
    } else if (req.method === 'PUT' && req.path.startsWith('/api/rentals') && data.success && data.rental) {
      saveRentalEvidence(data.rental, req);
    }

    return originalJson(data);
  };

  res.send = function(data) {
    return originalSend(data);
  };

  next();
};

// 대여 증거 데이터 저장
const saveRentalEvidence = (rental, req) => {
  try {
    const ipAddress = getClientIp(req);
    const userId = req.user?.id || 'anonymous';
    
    // 기존 증거 데이터 확인
    const existingEvidence = db.get('evidence')
      .find({ rentalId: rental.id || rental._id })
      .value();

    // 채팅 메시지 수집
    let chatMessages = [];
    if (rental.product) {
      const productId = typeof rental.product === 'string' ? rental.product : rental.product.id;
      const chats = db.get('chats')
        .filter(chat => chat.productId === productId)
        .value();
      
      chats.forEach(chat => {
        if (chat.messages && Array.isArray(chat.messages)) {
          chatMessages = chatMessages.concat(chat.messages.map(msg => ({
            sender: msg.sender,
            message: msg.message,
            timestamp: msg.timestamp
          })));
        }
      });
    }

    const evidenceData = {
      id: existingEvidence?.id || uuidv4(),
      rentalId: rental.id || rental._id,
      productId: typeof rental.product === 'string' ? rental.product : (rental.product?.id || null),
      ownerId: rental.owner || (typeof rental.owner === 'object' ? rental.owner.id : null),
      borrowerId: rental.borrower || (typeof rental.borrower === 'object' ? rental.borrower.id : null),
      userId: userId,
      ipAddress: ipAddress,
      chatMessages: chatMessages,
      meetingLocation: rental.meetingLocation || null,
      transactionData: {
        rentalPrice: rental.rentalPrice,
        totalAmount: rental.totalAmount,
        paymentStatus: rental.paymentStatus,
        status: rental.status,
        startDate: rental.startDate,
        endDate: rental.endDate,
        startDateTime: rental.startDateTime,
        endDateTime: rental.endDateTime
      },
      createdAt: existingEvidence?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1년 후
    };

    if (existingEvidence) {
      db.get('evidence')
        .find({ id: existingEvidence.id })
        .assign(evidenceData)
        .write();
    } else {
      db.get('evidence').push(evidenceData).write();
    }
  } catch (error) {
    console.error('증거 데이터 저장 실패:', error);
  }
};

// 채팅 메시지 증거 데이터 저장 (Socket.io에서 호출)
const saveChatEvidence = (roomId, message, senderId) => {
  try {
    const chat = db.get('chats').find({ room: roomId }).value();
    if (!chat) return;

    const productId = chat.productId;
    const participants = chat.participants || [];

    // 관련 대여 찾기
    const relatedRentals = db.get('rentals')
      .filter(r => r.product === productId)
      .value();

    relatedRentals.forEach(rental => {
      const existingEvidence = db.get('evidence')
        .find({ rentalId: rental.id || rental._id })
        .value();

      if (existingEvidence) {
        // 채팅 메시지 추가
        const newMessage = {
          sender: senderId,
          message: message,
          timestamp: new Date().toISOString()
        };

        const updatedMessages = existingEvidence.chatMessages || [];
        updatedMessages.push(newMessage);

        db.get('evidence')
          .find({ id: existingEvidence.id })
          .assign({
            chatMessages: updatedMessages,
            updatedAt: new Date().toISOString()
          })
          .write();
      }
    });
  } catch (error) {
    console.error('채팅 증거 데이터 저장 실패:', error);
  }
};

// 만료된 증거 데이터 삭제
const cleanupExpiredEvidence = () => {
  try {
    const now = new Date();
    const expiredEvidence = db.get('evidence')
      .filter(e => new Date(e.retentionUntil) < now)
      .value();

    if (expiredEvidence.length > 0) {
      expiredEvidence.forEach(e => {
        db.get('evidence').remove({ id: e.id }).write();
      });
      console.log(`✅ 만료된 증거 데이터 ${expiredEvidence.length}개 삭제됨`);
    }
  } catch (error) {
    console.error('증거 데이터 정리 실패:', error);
  }
};

module.exports = {
  collectEvidence,
  saveRentalEvidence,
  saveChatEvidence,
  cleanupExpiredEvidence,
  getClientIp
};


