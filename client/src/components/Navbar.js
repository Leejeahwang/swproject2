import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotificationCount();
      // 30초마다 알림 개수 갱신
      const interval = setInterval(loadNotificationCount, 30000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadNotificationCount = async () => {
    try {
      const response = await api.get('/notifications/count');
      setNotificationCount(response.data.count);
    } catch (error) {
      console.error('알림 개수 로드 실패:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img src="/sharehub_logo.png" alt="쉐어허브" className="logo-image" />
        </Link>
        
        <div className="navbar-menu">
          {user ? (
            <>
              <Link to="/products/new" className="navbar-link">물품 등록</Link>
              <Link to="/my-products" className="navbar-link">내 물품</Link>
              <Link to="/my-rentals" className="navbar-link">대여 내역</Link>
              <Link to="/chats" className="navbar-link">채팅</Link>
              <Link to={`/profile/${user.id}`} className="navbar-link">
                프로필
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="navbar-link navbar-admin">
                  🛡️ 관리자
                </Link>
              )}
              <Link to="/notifications" className="navbar-notification">
                <span className="notification-icon">🔔</span>
                {notificationCount > 0 && (
                  <span className="notification-badge">{notificationCount}</span>
                )}
              </Link>
              <button onClick={handleLogout} className="navbar-btn">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">로그인</Link>
              <Link to="/register" className="navbar-btn">회원가입</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

