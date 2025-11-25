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
              <Link to="/notifications" className="navbar-notification" aria-label="알림">
                <svg className="notification-icon" viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M12 22a1.75 1.75 0 0 0 1.743-1.607L13.75 20h-3.5a1.75 1.75 0 0 0 1.607 1.743L12 21.999Zm7-6v-4.25c0-3.355-2.203-6.155-5.25-6.84V4.5a1.75 1.75 0 1 0-3.5 0v.41C7.203 5.595 5 8.395 5 11.75V16l-1.45 1.45A.75.75 0 0 0 4.06 18.5h15.88a.75.75 0 0 0 .51-1.28L19 16Z" />
                </svg>
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

