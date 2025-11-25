import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Notifications.css';

const ICONS = {
  rental_request: {
    path: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm1 2.5L18.5 9H15a0 0 0 0 1 0 0V4.5ZM8 12h6v1.5H8Zm0 3h8v1.5H8Z',
    color: '#4f90c9',
    background: 'rgba(79,144,201,0.18)'
  },
  rental_confirmed: {
    path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.5 12.7-3.2-3.2 1.06-1.06 2.14 2.15 4.64-4.64 1.06 1.06-5.7 5.69Z',
    color: '#50b083',
    background: 'rgba(80,176,131,0.15)'
  },
  return_request: {
    path: 'M3 7 12 3l9 4v10l-9 4-9-4V7Zm15 1.27-6 2.73v6.73l6-2.73V8.27Zm-8 9.46V11L4 8.27v7.19l6 2.27Z',
    color: '#c08f4b',
    background: 'rgba(192,143,75,0.15)'
  },
  return_confirmed: {
    path: 'M11 2h2l.4 3.2L16 6l-2.6 1.5L13 11h-2l-.4-3.5L8 6l2.6-1.5L11 2Zm-6 9h2l.24 1.8 1.76.7-1.76.7L7 16H5l-.24-1.5-1.76-.7 1.76-.7L5 11Zm12 4h2l.24 1.8 1.76.7-1.76.7L18 20h-2l-.24-1.5-1.76-.7 1.76-.7L17 15Z',
    color: '#d88fd2',
    background: 'rgba(216,143,210,0.18)'
  },
  chat: {
    path: 'M4 4h16v11H8l-4 4V4Zm2 2v8.17L7.17 13H18V6H6Z',
    color: '#7b8cff',
    background: 'rgba(123,140,255,0.18)'
  },
  review: {
    path: 'M12 2.5 14.6 8h5.4l-4.4 3.2 1.7 5.3L12 13.8l-5.3 2.7 1.7-5.3L4 8h5.4L12 2.5Z',
    color: '#f6b63f',
    background: 'rgba(246,182,63,0.2)'
  },
  default: {
    path: 'M12 22a1.75 1.75 0 0 0 1.743-1.607L13.75 20h-3.5a1.75 1.75 0 0 0 1.607 1.743L12 22Zm7-6v-4.25c0-3.355-2.203-6.155-5.25-6.84V4.5a1.75 1.75 0 1 0-3.5 0v.41C7.203 5.595 5 8.395 5 11.75V16l-1.45 1.45a.75.75 0 0 0 .51 1.28h15.88a.75.75 0 0 0 .51-1.28L19 16Z',
    color: '#7fa5c9',
    background: 'rgba(255,255,255,0.7)'
  }
};

const NotificationIcon = ({ type }) => {
  const icon = ICONS[type] || ICONS.default;
  return (
    <span className="notification-type-icon" style={{ background: icon.background }}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={icon.path} fill={icon.color} />
      </svg>
    </span>
  );
};

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
          <button onClick={handleMarkAllAsRead} className="mark-all-btn" aria-label="모두 읽음">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 22a2 2 0 0 0 1.995-1.85L14 20h-4a2 2 0 0 0 1.85 1.995L12 22Zm7-7v-4.5a6.5 6.5 0 0 0-5-6.326V3a2 2 0 1 0-4 0v1.174a6.5 6.5 0 0 0-5 6.326V15l-1.8 1.8A1 1 0 0 0 4 18h16a1 1 0 0 0 .8-1.6L19 15Zm-11.2-1.65 1.4-1.4 1.8 1.8 3.4-3.4 1.4 1.41-4.8 4.79-3.2-3.2Z" fill="#7fa5c9" />
            </svg>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <NotificationIcon type="default" />
          </div>
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
              <NotificationIcon type={notification.type} />
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

