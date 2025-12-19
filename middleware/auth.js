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

    // 차단된 사용자 확인
    if (user.blockedUntil) {
      const blockedUntil = new Date(user.blockedUntil);
      const now = new Date();
      
      if (now < blockedUntil) {
        const daysLeft = Math.ceil((blockedUntil - now) / (1000 * 60 * 60 * 24));
        return res.status(403).json({ 
          message: `계정이 차단되었습니다. ${daysLeft}일 후 해제됩니다.`,
          blockedUntil: user.blockedUntil,
          blockReason: user.blockReason
        });
      } else {
        // 차단 기간이 지났으면 차단 해제
        db.get('users')
          .find({ id: user.id })
          .assign({
            blockedUntil: null,
            blockReason: null,
            blockedAt: null,
            blockedBy: null
          })
          .write();
      }
    }

    // 비밀번호 제외
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;

    next();
  } catch (error) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다' });
  }
};

// 관리자 권한 체크 미들웨어
exports.adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '관리자 권한이 필요합니다' });
  }
  next();
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
