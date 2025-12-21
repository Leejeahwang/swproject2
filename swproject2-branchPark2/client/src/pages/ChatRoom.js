import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import api from '../services/api';
import './ChatRoom.css';

const ChatRoom = () => {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [chatInfo, setChatInfo] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // 1. 이전 대화 내역 및 채팅방 정보 불러오기
    const fetchMessages = async () => {
      if (!user || !user.id) return;
      
      try {
        const response = await api.get(`/chats/${roomId}`);
        setMessages(response.data.messages || []);
        // 채팅방 정보 저장 (상대방, 제품 정보 포함)
        setChatInfo({
          otherUser: response.data.otherUser,
          product: response.data.product
        });
      } catch (error) {
        console.error('이전 메시지 로드 실패:', error);
        if (error.response && error.response.status === 404) {
          // 새 채팅방인 경우
          setMessages([]);
        }
      }
    };
    
    fetchMessages();

    // 2. Socket.io 연결
    const newSocket = io('http://localhost:5000/chat');
    setSocket(newSocket);

    // 채팅방 입장
    newSocket.emit('join_room', roomId);

    // 메시지 수신
    newSocket.on('receive_message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      roomId,
      message: newMessage,
      senderId: user.id,
      senderName: user.username
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        <button onClick={() => navigate('/chats')} className="back-btn">
          ← 뒤로
        </button>
        <div className="chat-header-info">
          <h2>
            {chatInfo?.otherUser?.username || '채팅'}
          </h2>
          {chatInfo?.product && (
            <p className="chat-product-name">
              {chatInfo.product.title}
            </p>
          )}
        </div>
        <div></div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>메시지를 보내 대화를 시작해보세요</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`message ${msg.sender === user.id ? 'own-message' : 'other-message'}`}
              >
                <div className="message-content">
                  <p>{msg.message}</p>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="message-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="message-input"
        />
        <button type="submit" className="btn btn-primary send-btn">
          전송
        </button>
      </form>
    </div>
  );
};

export default ChatRoom;

