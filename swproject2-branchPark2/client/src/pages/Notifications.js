import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('알림 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId, link) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      loadNotifications();
      
      // 링크가 있으면 해당 페이지로 이동
      if (link) {
        navigate(link);
      }
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      loadNotifications();
    } catch (error) {
      console.error('알림 전체 읽음 처리 실패:', error);
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;
    return past.toLocaleDateString('ko-KR');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>알림</h1>
        {notifications.length > 0 && (
          <button onClick={handleMarkAllAsRead} className="btn btn-outline">
            모두 읽음
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <p>새로운 알림이 없습니다</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${notification.read ? '' : 'unread'}`}
              onClick={() => handleMarkAsRead(notification.id, notification.link)}
            >
              <div className="notification-icon">
                {notification.type === 'rental_request' && '📝'}
                {notification.type === 'rental_confirmed' && '✅'}
                {notification.type === 'return_request' && '📦'}
                {notification.type === 'return_confirmed' && '✨'}
                {notification.type === 'chat' && '💬'}
                {notification.type === 'review' && '⭐'}
                {!['rental_request', 'rental_confirmed', 'return_request', 'return_confirmed', 'chat', 'review'].includes(notification.type) && '🔔'}
              </div>
              <div className="notification-content">
                <p className="notification-text">{notification.message}</p>
                <span className="notification-time">{getTimeAgo(notification.createdAt)}</span>
              </div>
              {!notification.read && <span className="unread-dot"></span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;

