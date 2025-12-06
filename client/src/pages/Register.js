
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import KoreaMap, { REGION_NAMES } from '../components/KoreaMap';
import CustomSelect from '../components/CustomSelect';
import './Auth.css';

const areaData = {
  "서울": ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"],
  "경기": ["가평군", "고양시", "과천시", "광명시", "광주시", "구리시", "군포시", "김포시", "남양주시", "동두천시", "부천시", "성남시", "수원시", "시흥시", "안산시", "안성시", "안양시", "양주시", "양평군", "여주시", "연천군", "오산시", "용인시", "의왕시", "의정부시", "이천시", "파주시", "평택시", "포천시", "하남시", "화성시"],
  "인천": ["강화군", "계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구", "옹진군", "중구"],
  "부산": ["강서구", "금정구", "기장군", "남구", "동구", "동래구", "부산진구", "북구", "사상구", "사하구", "서구", "수영구", "연제구", "영도구", "중구", "해운대구"],
  "대구": ["군위군", "남구", "달서구", "달성군", "동구", "북구", "서구", "수성구", "중구"],
  "광주": ["광산구", "남구", "동구", "북구", "서구"],
  "대전": ["대덕구", "동구", "서구", "유성구", "중구"],
  "울산": ["남구", "동구", "북구", "울주군", "중구"],
  "세종": ["세종특별자치시"],
  "강원": ["강릉시", "고성군", "동해시", "삼척시", "속초시", "양구군", "양양군", "영월군", "원주시", "인제군", "정선군", "철원군", "춘천시", "태백시", "평창군", "홍천군", "화천군", "횡성군"],
  "충북": ["괴산군", "단양군", "보은군", "영동군", "옥천군", "음성군", "제천시", "증평군", "진천군", "청주시", "충주시"],
  "충남": ["계룡시", "공주시", "금산군", "논산시", "당진시", "보령시", "부여군", "서산시", "서천군", "아산시", "예산군", "천안시", "청양군", "태안군", "홍성군"],
  "전북": ["고창군", "군산시", "김제시", "남원시", "무주군", "부안군", "순창군", "완주군", "익산시", "임실군", "장수군", "전주시", "정읍시", "진안군"],
  "전남": ["강진군", "고흥군", "곡성군", "광양시", "구례군", "나주시", "담양군", "목포시", "무안군", "보성군", "순천시", "신안군", "여수시", "영광군", "영암군", "완도군", "장성군", "장흥군", "진도군", "함평군", "해남군", "화순군"],
  "경북": ["경산시", "경주시", "고령군", "구미시", "김천시", "문경시", "봉화군", "상주시", "성주군", "안동시", "영덕군", "영양군", "영주시", "영천시", "예천군", "울릉군", "울진군", "의성군", "청도군", "청송군", "칠곡군", "포항시"],
  "경남": ["거제시", "거창군", "고성군", "김해시", "남해군", "밀양시", "사천시", "산청군", "양산시", "의령군", "진주시", "창녕군", "창원시", "통영시", "하동군", "함안군", "함양군", "합천군"],
  "제주": ["서귀포시", "제주시"]
};

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    primaryRegion: '',
    subRegion: ''
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
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // 지도에서 지역 선택 핸들러
  const handleMapRegionSelect = (region) => {
    setFormData({
      ...formData,
      primaryRegion: region,
      // 세종은 세부지역을 자동으로 설정
      subRegion: region === '세종' ? '세종특별자치시' : ''
    });
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
      setError('지도에서 지역을 선택해주세요');
      return;
    }

    // 세종은 세부지역 선택 불필요
    if (formData.primaryRegion !== '세종' && !formData.subRegion) {
      setError('세부지역을 선택해주세요');
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
      <div className="auth-card auth-card-wide">
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

          <div className="form-group region-selection-section">
            <label className="region-label-header">
              🗺️ 지역 선택
              <span className="region-hint">지도를 클릭해서 지역을 선택하세요</span>
            </label>
            
            <div className="region-selection-container">
              <KoreaMap 
                selectedRegion={formData.primaryRegion}
                onRegionSelect={handleMapRegionSelect}
              />
              
              {formData.primaryRegion && formData.primaryRegion !== '세종' && (
                <div className="sub-region-section">
                  <label className="sub-region-label">
                    세부지역 선택
                    <span className="sub-region-count">
                      ({areaData[formData.primaryRegion]?.length}개 지역)
                    </span>
                  </label>
                  <CustomSelect
                    options={[
                      { value: '', label: '구/시/군을 선택하세요' },
                      ...areaData[formData.primaryRegion]?.map(sub => ({
                        value: sub,
                        label: sub
                      }))
                    ]}
                    value={formData.subRegion}
                    onChange={(value) => setFormData({ ...formData, subRegion: value })}
                    placeholder="구/시/군을 선택하세요"
                  />
                </div>
              )}
              {formData.primaryRegion === '세종' && (
                <div className="sub-region-section">
                  <p className="sejong-notice">세종특별자치시는 세부지역 선택이 필요 없습니다.</p>
                </div>
              )}
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
