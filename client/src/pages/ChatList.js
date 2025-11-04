import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './ChatList.css';

const ChatList = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      setLoading(true);
      // Note: 실제로는 채팅 목록을 가져오는 API가 필요합니다
      // 💡 수정된 부분: API를 호출하여 실제 채팅 목록을 가져옵니다.
      const response = await api.get('/chats');
      setChats(response.data); // 💡 서버에서 받은 데이터로 상태 업데이트

    } catch (error) {
      console.error('채팅 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="chat-list-page">
      <h1>채팅</h1>

      {chats.length === 0 ? (
        <div className="empty-state">
          <p>채팅 내역이 없습니다</p>
          <p className="sub-text">
            제품 상세 페이지에서 판매자와 채팅을 시작해보세요
          </p>
          <Link to="/" className="btn btn-primary">
            물품 둘러보기
          </Link>
        </div>
      ) : (
        <div className="chats-list">
          {chats.map(chat => (
            <Link 
              key={chat.room} 
              to={`/chats/${chat.room}`}
              className="chat-item"
            >
              <div className="chat-user">
                {chat.otherUser.profileImage && (
                  <img 
                    src={`http://localhost:5001${chat.otherUser.profileImage}`}
                    alt={chat.otherUser.username}
                    className="chat-avatar"
                  />
                )}
                <div className="chat-info">
                  <h3>{chat.otherUser.username}</h3>
                  <p className="chat-product">{chat.product?.title}</p>
                </div>
              </div>
              <div className="chat-preview">
                <p className="last-message">{chat.lastMessage}</p>
                <span className="chat-time">
                  {new Date(chat.lastMessageAt).toLocaleString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatList;

