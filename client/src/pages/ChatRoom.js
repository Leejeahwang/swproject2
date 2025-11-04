import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import api from '../services/api'; // 💡 api.js (axios 인스턴스)
import './ChatRoom.css';

const ChatRoom = () => {
  const { roomId } = useParams();
  const { user } = useAuth(); // 💡 현재 로그인한 사용자 정보
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null); // 💡 스크롤 참조

  useEffect(() => {
    // 💡 1. 컴포넌트 마운트 시 '이전 대화'를 먼저 불러옵니다.
    const fetchMessages = async () => {
      if (!user || !user.id) return; // 💡 user 정보가 없으면 실행 중지
      
      try {
        // (중요) 2단계의 '임시 auth'를 위해 axios 헤더에 user.id를 설정합니다.
        api.defaults.headers.common['x-user-id'] = user.id;

        const response = await api.get(`chats/${roomId}`);
        setMessages(response.data.messages || []); // 💡 DB 메시지로 상태 설정
      } catch (error) {
        console.error('이전 메시지 로드 실패:', error);
        if (error.response && error.response.status === 404) {
          // 404는 새 채팅방이라는 의미일 수 있습니다.
          setMessages([]);
        }
      }
    };
    
    fetchMessages(); // 💡 함수 실행

    // 💡 2. Socket.io 연결
    const newSocket = io('http://localhost:5001/chat');
    setSocket(newSocket);

    // 채팅방 입장
    newSocket.emit('join_room', roomId);

    // 메시지 수신 (실시간)
    newSocket.on('receive_message', (data) => {
      // 💡 (중요) 자신이 보낸 메시지(send_message)가 
      // 서버에서 emit_message로 돌아올 때 중복 추가되지 않도록 합니다.
      // (현재 로직은 본인이 보낸 것도 receive로 받게 됩니다)
      setMessages(prev => [...prev, data]);
    });

    // 💡 3. 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      newSocket.disconnect();
    };
  }, [roomId, user]); // 💡 roomId나 user가 바뀔 때마다 재연결

  // 💡 새 메시지가 오면 맨 아래로 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !user) return;

    const messageData = {
      roomId,
      message: newMessage,
      senderId: user.id // 💡 현재 로그인한 유저의 ID
    };

    // 💡 1. 서버로 메시지 전송
    socket.emit('send_message', messageData);

    // 💡 2. (선택적) 내가 보낸 메시지를 즉시 화면에 추가
    // 이렇게 하면 서버가 'receive_message'로 돌려주는 것을 기다릴 필요 없이
    // 즉각적으로 UI에 반영됩니다.
    // (이 방법을 쓰려면, newSocket.on('receive_message')에서 
    // data.senderId === user.id 이면 무시하는 로직이 필요합니다)
    /*
    const ownMessage = {
      ...messageData,
      sender: user.id,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, ownMessage]);
    */
    
    setNewMessage('');
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        <button onClick={() => navigate('/chats')} className="back-btn">
          ← 뒤로
        </button>
        <h2>채팅</h2>
        <div></div> {/* 💡 헤더 중앙 정렬을 위한 빈 div */}
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
                key={msg.id || index} // 💡 DB 메시지는 id, 실시간은 index
                // 💡 senderId (DB) 또는 sender (실시간) 값으로 비교
                className={`message ${(msg.senderId || msg.sender) === user.id ? 'own-message' : 'other-message'}`}
              >
                <div className="message-content">
                  <p>{msg.message}</p>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                      hour: 'numeric',
                      minute: 'numeric',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>
            ))}
            {/* 💡 스크롤을 위한 빈 div */}
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
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary send-btn">
          전송
        </button>
      </form>
    </div>
  );
};

export default ChatRoom;