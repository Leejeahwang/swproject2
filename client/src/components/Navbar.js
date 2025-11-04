import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🔗 쉐어허브
        </Link>
        
        <div className="navbar-menu">
          {user ? (
            <>
              <Link to="/" className="navbar-link">홈</Link>
              <Link to="/products/new" className="navbar-link">물품 등록</Link>
              <Link to="/my-products" className="navbar-link">내 물품</Link>
              <Link to="/my-rentals" className="navbar-link">대여 내역</Link>
              <Link to="/chats" className="navbar-link">채팅</Link>
              <Link to={`/profile/${user.id}`} className="navbar-link">
                프로필
              </Link>
              <button onClick={handleLogout} className="navbar-btn">
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="navbar-link">홈</Link>
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

