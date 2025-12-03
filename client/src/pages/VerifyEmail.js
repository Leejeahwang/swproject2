import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

// 링크 방식에서 인증번호 방식으로 변경됨
// 이 페이지는 더 이상 사용되지 않음 - 로그인으로 리다이렉트
const VerifyEmail = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 3초 후 로그인 페이지로 리다이렉트
    const timer = setTimeout(() => {
      navigate('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔄</div>
        <h1 className="auth-title">인증 방식이 변경되었습니다</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          이제 이메일로 받은 <strong>6자리 인증번호</strong>를 입력하는 방식입니다.
        </p>
        <p style={{ color: '#999', fontSize: '14px' }}>
          잠시 후 로그인 페이지로 이동합니다...
        </p>
        <button 
          onClick={() => navigate('/login')}
          className="btn btn-primary"
          style={{ marginTop: '20px' }}
        >
          로그인 페이지로 이동
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
