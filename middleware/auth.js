const jwt = require('jsonwebtoken');
const db = require('../database/db');

exports.protect = async (req, res, next) => {
  let token;

  // 헤더에서 토큰 확인
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 토큰이 없으면 인증 실패
  if (!token) {
    return res.status(401).json({ message: '인증이 필요합니다' });
  }

  try {
    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    
    // 사용자 정보를 요청에 추가
    const user = db.get('users').find({ id: decoded.id }).value();
    
    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 비밀번호 제외
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;

    next();
  } catch (error) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다' });
  }
};

// 파일 업로드 설정
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다'), false);
  }
};

exports.upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});
