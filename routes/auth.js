const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

// JWT 토큰 생성
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your_jwt_secret_key', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    회원가입
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

    // 사용자 생성
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
      trustScore: 0,  // 신뢰도 점수 (-100 ~ 100)
      rentalCount: 0,
      borrowCount: 0,
      averageRating: 0,
      createdAt: new Date().toISOString()
    };

    db.get('users').push(user).write();

    // 토큰 생성
    const token = generateToken(user.id);

    // 비밀번호 제외하고 반환
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '회원가입 중 오류가 발생했습니다', error: error.message });
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

    // 토큰 생성
    const token = generateToken(user.id);

    // 비밀번호 제외하고 반환
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '로그인 중 오류가 발생했습니다', error: error.message });
  }
});

module.exports = router;
