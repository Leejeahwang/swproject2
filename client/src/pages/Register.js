import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
];

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    primaryRegion: '',
    regions: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 인증번호 관련 상태
  const [showVerification, setShowVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { register, resendVerification, verifyCode: verifyCodeApi } = useAuth();
  const navigate = useNavigate();
  const inputRefs = useRef([]);

  // 재발송 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegionChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setFormData({
        ...formData,
        regions: [...formData.regions, value]
      });
    } else {
      setFormData({
        ...formData,
        regions: formData.regions.filter(region => region !== value)
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    if (formData.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
      return;
    }

    if (!formData.primaryRegion) {
      setError('주 지역을 선택해주세요');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);

    if (result.success) {
      if (result.requiresVerification) {
        setRegisteredEmail(formData.email);
        setShowVerification(true);
        setResendCooldown(60); // 60초 쿨다운
      } else {
        navigate('/');
      }
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  // 인증번호 입력 핸들러
  const handleCodeChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    
    if (!/^\d*$/.test(value)) return; // 숫자만 허용

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // 자동 포커스 이동
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 키보드 이벤트 (백스페이스 처리)
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 붙여넣기 처리
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      setVerificationCode(newCode);
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setVerifyError('6자리 인증번호를 모두 입력해주세요');
      return;
    }

    setVerifyLoading(true);
    setVerifyError('');
    setVerifySuccess('');

    const result = await verifyCodeApi(registeredEmail, code);

    if (result.success) {
      setVerifySuccess('🎉 인증이 완료되었습니다! 잠시 후 로그인 페이지로 이동합니다.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setVerifyError(result.message);
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }

    setVerifyLoading(false);
  };

  // 인증번호 재발송
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    setVerifyError('');
    setVerifySuccess('');

    const result = await resendVerification(registeredEmail);

    if (result.success) {
      setVerifySuccess('✅ 새 인증번호가 발송되었습니다!');
      setVerificationCode(['', '', '', '', '', '']);
      setResendCooldown(60);
      inputRefs.current[0]?.focus();
    } else {
      setVerifyError(result.message);
    }

    setResendLoading(false);
  };

  // 인증번호 입력 화면
  if (showVerification) {
    return (
      <div className="auth-container">
        <div className="auth-card verification-card">
          <div className="verification-header">
            <div className="verification-icon-large">📧</div>
            <h1 className="auth-title">인증번호 입력</h1>
            <p className="verification-subtitle">
              <strong>{registeredEmail}</strong>로<br />
              6자리 인증번호를 발송했습니다.
            </p>
          </div>

          {verifyError && <div className="alert alert-error">{verifyError}</div>}
          {verifySuccess && <div className="alert alert-success">{verifySuccess}</div>}

          <div className="code-input-container">
            {verificationCode.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="code-input"
                disabled={verifyLoading || verifySuccess}
              />
            ))}
          </div>

          <button
            onClick={handleVerifyCode}
            className="btn btn-primary auth-submit"
            disabled={verifyLoading || verifySuccess}
          >
            {verifyLoading ? '확인 중...' : '인증하기'}
          </button>

          <div className="resend-section">
            <p>인증번호가 안 왔나요?</p>
            <button
              onClick={handleResendCode}
              className="btn-resend"
              disabled={resendLoading || resendCooldown > 0}
            >
              {resendLoading ? '발송 중...' : 
               resendCooldown > 0 ? `${resendCooldown}초 후 재발송 가능` : 
               '인증번호 다시 받기'}
            </button>
          </div>

          <p className="auth-switch">
            <Link to="/login">← 로그인으로 돌아가기</Link>
          </p>
        </div>

        <style>{`
          .verification-card {
            text-align: center;
          }
          .verification-header {
            margin-bottom: 30px;
          }
          .verification-icon-large {
            font-size: 64px;
            margin-bottom: 20px;
            animation: float 2s ease-in-out infinite;
          }
          .verification-subtitle {
            color: #666;
            line-height: 1.6;
          }
          .code-input-container {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin: 30px 0;
          }
          .code-input {
            width: 50px;
            height: 60px;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            border: 2px solid #ddd;
            border-radius: 12px;
            outline: none;
            transition: all 0.2s;
          }
          .code-input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
          }
          .code-input:disabled {
            background: #f5f5f5;
          }
          .resend-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          .resend-section p {
            color: #999;
            font-size: 14px;
            margin-bottom: 10px;
          }
          .btn-resend {
            background: none;
            border: none;
            color: #667eea;
            font-weight: 600;
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 8px;
            transition: background 0.2s;
          }
          .btn-resend:hover:not(:disabled) {
            background: rgba(102, 126, 234, 0.1);
          }
          .btn-resend:disabled {
            color: #999;
            cursor: not-allowed;
          }
          .alert-success {
            background-color: #d4edda;
            color: #155724;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @media (max-width: 480px) {
            .code-input {
              width: 42px;
              height: 52px;
              font-size: 20px;
            }
            .code-input-container {
              gap: 6px;
            }
          }
        `}</style>
      </div>
    );
  }

  // 회원가입 폼
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">회원가입</h1>
        
        {error && <div className="alert alert-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>사용자명</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              placeholder="사용자명 (3자 이상)"
            />
          </div>

          <div className="form-group">
            <label>이름</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="실명을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label>이메일</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="example@email.com"
            />
          </div>

          <div className="form-group">
            <label>전화번호</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="010-1234-5678"
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="비밀번호 (6자 이상)"
            />
          </div>

          <div className="form-group">
            <label>비밀번호 확인</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>

          <div className="form-group">
            <label>주 지역</label>
            <select
              name="primaryRegion"
              value={formData.primaryRegion}
              onChange={handleChange}
              required
            >
              <option value="">지역을 선택하세요</option>
              {REGIONS.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>추가 지역 (선택)</label>
            <div className="checkbox-group">
              {REGIONS.map(region => (
                <label key={region} className="checkbox-label">
                  <input
                    type="checkbox"
                    value={region}
                    checked={formData.regions.includes(region)}
                    onChange={handleRegionChange}
                  />
                  {region}
                </label>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="auth-switch">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
