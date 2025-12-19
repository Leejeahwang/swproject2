const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./database/db');
const fs = require('fs'); 
const path = require('path'); 

// 환경 변수 로드
dotenv.config();

// Express 앱 생성
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// 증거 데이터 수집 미들웨어
const { collectEvidence, saveChatEvidence, cleanupExpiredEvidence } = require('./middleware/evidence');
app.use(collectEvidence);

// uploads 폴더 자동 생성
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('✅ "uploads" 폴더가 존재하지 않아 새로 생성했습니다.');
}

// 데이터베이스 초기화 확인
console.log('✅ 로컬 데이터베이스 연결 성공 (lowdb)');

// 라우트
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/locations', require('./routes/locations'));

// Socket.io 채팅 기능
const chatNamespace = io.of('/chat');
chatNamespace.on('connection', (socket) => {
  console.log('새로운 사용자가 채팅에 연결되었습니다:', socket.id);

  // 채팅방 입장
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`사용자 ${socket.id}가 방 ${roomId}에 입장했습니다`);
  });

  // 메시지 전송
  socket.on('send_message', (data) => {
    const { roomId, message, senderId, senderName } = data;
    
    // 메시지를 DB에 저장
    const newMessage = {
      id: Date.now().toString(),
      room: roomId,
      sender: senderId,
      message: message,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // Chat 찾기 또는 생성
    let chat = db.get('chats').find({ room: roomId }).value();
    
    if (!chat) {
      // roomId를 분리: userId_ownerId_productId
      const parts = roomId.split('_'); 
      const participants = [parts[0], parts[1]]; // 사용자 ID만 저장
      const productId = parts[2] || null; // 제품 ID 별도 저장

      chat = {
        id: Date.now().toString(),
        room: roomId,
        participants: participants,
        productId: productId,
        messages: [],
        lastMessage: '',
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      db.get('chats').push(chat).write();
    }
    
    // 메시지 추가
    db.get('chats')
      .find({ room: roomId })
      .get('messages')
      .push(newMessage)
      .write();
    
    // lastMessage 업데이트
    db.get('chats')
      .find({ room: roomId })
      .assign({ 
        lastMessage: message,
        lastMessageAt: new Date().toISOString()
      })
      .write();
    
    // 증거 데이터에 채팅 메시지 저장
    saveChatEvidence(roomId, message, senderId);
    
    // 채팅 알림 생성 - 상대방에게
    const { createNotification } = require('./routes/notifications');
    const participants = chat.participants;
    const receiverId = participants.find(id => id !== senderId);
    
    if (receiverId) {
      const sender = db.get('users').find({ id: senderId }).value();
      const senderUsername = sender ? sender.username : (senderName || '알 수 없음');
      
      createNotification(
        receiverId,
        'chat',
        `${senderUsername}님이 메시지를 보냈습니다: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`,
        `/chats/${roomId}`
      );
    }
    
    // 같은 방의 모든 사용자에게 메시지 전송
    chatNamespace.to(roomId).emit('receive_message', {
      message: message,
      sender: senderId,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('사용자가 채팅에서 연결 해제되었습니다:', socket.id);
  });
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: '이웃 간 렌탈 플랫폼 API 서버' });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '서버 오류가 발생했습니다', error: err.message });
});

// 반납 지연 체크 및 알림 스케줄러
const checkOverdueRentals = () => {
  const { createNotification } = require('./routes/notifications');
  const rentals = db.get('rentals').value() || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  rentals.forEach(rental => {
    if (rental.status !== 'in_progress') return;

    const endDate = new Date(rental.endDate);
    endDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
    const product = db.get('products').find({ id: rental.product }).value();
    const productTitle = product ? product.title : '상품';

    // 1일 전 알림
    if (diffDays === -1 && !rental.notifiedOneDayBefore) {
      createNotification(
        rental.borrower,
        'rental',
        `📅 "${productTitle}" 반납 예정일이 내일입니다!`,
        '/my-rentals'
      );
      createNotification(
        rental.owner,
        'rental',
        `📅 "${productTitle}" 반납 예정일이 내일입니다.`,
        '/my-rentals'
      );
      db.get('rentals').find({ id: rental.id }).assign({ notifiedOneDayBefore: true }).write();
    }

    // 당일 알림
    if (diffDays === 0 && !rental.notifiedOnDueDate) {
      createNotification(
        rental.borrower,
        'rental',
        `⚠️ "${productTitle}" 반납 예정일이 오늘입니다! 반납해주세요.`,
        '/my-rentals'
      );
      createNotification(
        rental.owner,
        'rental',
        `⚠️ "${productTitle}" 반납 예정일이 오늘입니다.`,
        '/my-rentals'
      );
      db.get('rentals').find({ id: rental.id }).assign({ notifiedOnDueDate: true }).write();
    }

    // 지연 알림 (매일)
    if (diffDays > 0) {
      const lastOverdueNotification = rental.lastOverdueNotification 
        ? new Date(rental.lastOverdueNotification) 
        : null;
      
      const shouldNotify = !lastOverdueNotification || 
        (today - lastOverdueNotification) >= (1000 * 60 * 60 * 24);

      if (shouldNotify) {
        const dailyRate = product ? product.price : 0;
        const lateFee = Math.floor(dailyRate * 1.5 * diffDays);

        createNotification(
          rental.borrower,
          'rental',
          `🚨 "${productTitle}" 반납이 ${diffDays}일 지연되었습니다! 예상 지연 요금: ${lateFee.toLocaleString()}원`,
          '/my-rentals'
        );
        createNotification(
          rental.owner,
          'rental',
          `🚨 "${productTitle}" 반납이 ${diffDays}일 지연되고 있습니다.`,
          '/my-rentals'
        );
        db.get('rentals').find({ id: rental.id }).assign({ 
          lastOverdueNotification: today.toISOString(),
          isOverdue: true,
          overdueDays: diffDays
        }).write();
      }
    }
  });
};

// 1시간마다 체크 (개발 중에는 1분마다 테스트 가능)
setInterval(checkOverdueRentals, 60 * 60 * 1000); // 1시간
// 서버 시작 시 한 번 실행
setTimeout(checkOverdueRentals, 5000);

// 증거 데이터 정리 스케줄러 (매일 자정에 실행)
setInterval(cleanupExpiredEvidence, 24 * 60 * 60 * 1000); // 24시간
// 서버 시작 시 한 번 실행
setTimeout(cleanupExpiredEvidence, 10000);

// 서버 시작
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log('✅ 반납 지연 체크 스케줄러 시작됨');
});

