const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./database/db');

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

// 데이터베이스 초기화 확인
console.log('✅ 로컬 데이터베이스 연결 성공 (lowdb)');

// 라우트
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/rentals', require('./routes/rentals'));

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
    const { roomId, message, senderId } = data;
    
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
      chat = {
        id: Date.now().toString(),
        room: roomId,
        participants: [],
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

// 서버 시작
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
});

