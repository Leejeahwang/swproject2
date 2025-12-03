const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { sendVerificationCode } = require('../utils/mailer');
const { protect } = require('../middleware/auth');

// JWT 토큰 생성
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret_key', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// 6자리 인증번호 생성 함수
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @route   POST /api/auth/register
// @desc    회원가입 (이메일 인증번호 발송)
// @access  Public
router.post('/register', [
  body('username').isLength({ min: 3 }).withMessage('사용자명은 3글자 이상이어야 합니다'),
  body('email').isEmail().withMessage('유효한 이메일을 입력해주세요'),
  body('password').isLength({ min: 6 }).withMessage('비밀번호는 6글자 이상이어야 합니다'),
  body('name').notEmpty().withMessage('이름을 입력해주세요'),
  body('phone').notEmpty().withMessage('전화번호를 입력해주세요'),
  body('primaryRegion').notEmpty().withMessage('주 지역을 선택해주세요')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { username, email, password, name, phone, primaryRegion, regions } = req.body;

    // 중복 확인
    const existingUser = db.get('users')
      .find(user => user.email === email || user.username === username)
      .value();

    if (existingUser) {
      return res.status(400).json({ message: '이미 존재하는 이메일 또는 사용자명입니다' });
    }

    // 비밀번호 암호화
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6자리 인증번호 생성
    const verificationCode = generateVerificationCode();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10분

    // 사용자 생성 (이메일 인증 필드 추가)
    const user = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      name,
      phone,
      primaryRegion,
      regions: regions || [primaryRegion],
      profileImage: '',
      trustScore: 0,
      rentalCount: 0,
      borrowCount: 0,
      averageRating: 0,
      createdAt: new Date().toISOString(),
      // 이메일 인증 관련 필드
      isVerified: false,
      verificationCode: hashedCode,
      verificationExpires: verificationExpires
    };

    db.get('users').push(user).write();

    // 인증번호 이메일 발송
    const emailResult = await sendVerificationCode(email, username, verificationCode);
    
    if (!emailResult.success) {
      console.error('인증 이메일 발송 실패:', emailResult.error);
    }

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다. 이메일로 발송된 인증번호를 입력해주세요.',
      requiresVerification: true,
      email: email,
      emailSent: emailResult.success
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '회원가입 중 오류가 발생했습니다', error: error.message });
  }
});

// @route   POST /api/auth/verify-code
// @desc    인증번호 확인
// @access  Public
router.post('/verify-code', [
  body('email').isEmail().withMessage('유효한 이메일을 입력해주세요'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('6자리 인증번호를 입력해주세요')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, code } = req.body;
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    
    const user = db.get('users')
      .find(u => u.email === email && u.verificationCode === hashedCode)
      .value();
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: '인증번호가 올바르지 않습니다.' 
      });
    }

    // 만료 확인
    if (new Date(user.verificationExpires) < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: '인증번호가 만료되었습니다. 다시 발송해주세요.' 
      });
    }
    
    // 사용자 인증 완료 처리
    db.get('users')
      .find({ id: user.id })
      .assign({ 
        isVerified: true, 
        verificationCode: null, 
        verificationExpires: null 
      })
      .write();
    
    res.json({ 
      success: true, 
      message: '이메일 인증이 완료되었습니다!' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '인증 처리 중 오류가 발생했습니다', error: error.message });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    인증번호 재발송
// @access  Public
router.post('/resend-verification', [
  body('email').isEmail().withMessage('유효한 이메일을 입력해주세요')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email } = req.body;
    
    const user = db.get('users').find({ email }).value();
    
    if (!user) {
      return res.status(404).json({ message: '등록되지 않은 이메일입니다.' });
    }
    
    if (user.isVerified) {
      return res.status(400).json({ message: '이미 인증된 계정입니다.' });
    }
    
    // 새 인증번호 생성
    const verificationCode = generateVerificationCode();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10분
    
    db.get('users')
      .find({ id: user.id })
      .assign({
        verificationCode: hashedCode,
        verificationExpires
      })
      .write();
    
    // 이메일 재발송
    const emailResult = await sendVerificationCode(email, user.username, verificationCode);
    
    if (!emailResult.success) {
      return res.status(500).json({ message: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' });
    }
    
    res.json({ success: true, message: '인증번호가 재발송되었습니다. 이메일을 확인해주세요.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '이메일 재발송 중 오류가 발생했습니다', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    로그인
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('유효한 이메일을 입력해주세요'),
  body('password').notEmpty().withMessage('비밀번호를 입력해주세요')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // 사용자 찾기
    const user = db.get('users').find({ email }).value();

    if (!user) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다' });
    }

    // 이메일 인증 여부 확인 (경고만 표시, 로그인은 허용)
    const isVerified = user.isVerified !== false; // 기존 사용자는 isVerified 필드가 없을 수 있음

    // 토큰 생성
    const token = generateToken(user.id);

    // 민감 정보 제외하고 반환
    const { password: _, verificationCode: __, verificationExpires: ___, ...userWithoutSensitive } = user;

    res.json({
      success: true,
      token,
      user: { ...userWithoutSensitive, isVerified },
      warning: !isVerified ? '이메일 인증이 완료되지 않았습니다. 일부 기능이 제한될 수 있습니다.' : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '로그인 중 오류가 발생했습니다', error: error.message });
  }
});

// @route   DELETE /api/auth/delete-account
// @desc    계정 탈퇴
// @access  Private
router.delete('/delete-account', protect, [
  body('password').notEmpty().withMessage('비밀번호를 입력해주세요')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { password } = req.body;
    const userId = req.user.id;

    // 사용자 찾기 (비밀번호 포함)
    const user = db.get('users').find({ id: userId }).value();

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: '비밀번호가 올바르지 않습니다' });
    }

    // 사용자의 상품 삭제
    db.get('products')
      .remove({ owner: userId })
      .write();

    // 사용자의 대여 기록 삭제
    db.get('rentals')
      .remove(rental => rental.owner === userId || rental.borrower === userId)
      .write();

    // 사용자의 채팅 삭제
    db.get('chats')
      .remove(chat => chat.participants && chat.participants.includes(userId))
      .write();

    // 사용자의 알림 삭제
    db.get('notifications')
      .remove({ userId: userId })
      .write();

    // 사용자의 리뷰 삭제 (작성한 리뷰)
    db.get('reviews')
      .remove({ reviewer: userId })
      .write();

    // 사용자 삭제
    db.get('users')
      .remove({ id: userId })
      .write();

    res.json({ 
      success: true, 
      message: '계정이 성공적으로 삭제되었습니다.' 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '계정 삭제 중 오류가 발생했습니다', error: error.message });
  }
});

module.exports = router;
