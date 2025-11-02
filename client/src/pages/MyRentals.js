import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './MyRentals.css';

const MyRentals = () => {
  const [activeTab, setActiveTab] = useState('borrowed'); // borrowed, rented
  const [borrowedRentals, setBorrowedRentals] = useState([]);
  const [rentedRentals, setRentedRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRentals();
  }, []);

  const loadRentals = async () => {
    try {
      setLoading(true);
      const [borrowedResponse, rentedResponse] = await Promise.all([
        api.get('/rentals/my-rentals'),
        api.get('/rentals/my-listings')
      ]);

      setBorrowedRentals(borrowedResponse.data.rentals);
      setRentedRentals(rentedResponse.data.rentals);
    } catch (error) {
      console.error('대여 내역 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '대기중', class: 'status-pending' },
      approved: { text: '승인됨', class: 'status-approved' },
      ongoing: { text: '진행중', class: 'status-ongoing' },
      completed: { text: '완료', class: 'status-completed' },
      cancelled: { text: '취소됨', class: 'status-cancelled' }
    };
    
    const badge = badges[status] || badges.pending;
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  const handleApprove = async (rentalId) => {
    if (!window.confirm('대여를 승인하시겠습니까?')) return;

    try {
      await api.put(`/rentals/${rentalId}/approve`);
      alert('대여가 승인되었습니다');
      loadRentals();
    } catch (error) {
      alert(error.response?.data?.message || '승인 실패');
    }
  };

  const handleComplete = async (rentalId) => {
    if (!window.confirm('대여를 완료 처리하시겠습니까?')) return;

    try {
      await api.put(`/rentals/${rentalId}/complete`);
      alert('대여가 완료되었습니다');
      loadRentals();
    } catch (error) {
      alert(error.response?.data?.message || '완료 처리 실패');
    }
  };

  const handleCancel = async (rentalId) => {
    if (!window.confirm('대여를 취소하시겠습니까?')) return;

    try {
      await api.put(`/rentals/${rentalId}/cancel`);
      alert('대여가 취소되었습니다');
      loadRentals();
    } catch (error) {
      alert(error.response?.data?.message || '취소 실패');
    }
  };

  const RentalCard = ({ rental, isBorrower }) => (
    <div className="rental-card">
      <div className="rental-header">
        <img 
          src={`http://localhost:5000${rental.product.images[0]}`}
          alt={rental.product.title}
          className="rental-image"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/100?text=No+Image';
          }}
        />
        <div className="rental-info">
          <h3>{rental.product.title}</h3>
          <p className="rental-price">
            {rental.totalPrice.toLocaleString()}원
          </p>
          <p className="rental-period">
            {new Date(rental.startDate).toLocaleDateString()} ~ 
            {new Date(rental.endDate).toLocaleDateString()}
          </p>
        </div>
        {getStatusBadge(rental.status)}
      </div>

      <div className="rental-details">
        <div className="detail-item">
          <span className="label">{isBorrower ? '대여자' : '빌린 사람'}</span>
          <span className="value">
            {isBorrower ? rental.owner.username : rental.borrower.username}
            {isBorrower ? 
              ` (🎯 ${rental.owner.trustScore}점)` : 
              ` (🎯 ${rental.borrower.trustScore}점)`
            }
          </span>
        </div>
        <div className="detail-item">
          <span className="label">만남 장소</span>
          <span className="value">{rental.meetingLocation}</span>
        </div>
      </div>

      <div className="rental-actions">
        {!isBorrower && rental.status === 'pending' && (
          <button 
            onClick={() => handleApprove(rental._id)}
            className="btn btn-primary"
          >
            승인
          </button>
        )}
        
        {!isBorrower && rental.status === 'ongoing' && (
          <button 
            onClick={() => handleComplete(rental._id)}
            className="btn btn-primary"
          >
            완료 처리
          </button>
        )}

        {rental.status !== 'completed' && rental.status !== 'cancelled' && (
          <button 
            onClick={() => handleCancel(rental._id)}
            className="btn btn-danger"
          >
            취소
          </button>
        )}

        {rental.status === 'completed' && (
          <button className="btn btn-outline">
            리뷰 작성
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const currentRentals = activeTab === 'borrowed' ? borrowedRentals : rentedRentals;

  return (
    <div className="my-rentals-page">
      <h1>대여 내역</h1>

      <div className="rentals-tabs">
        <button
          className={`tab-btn ${activeTab === 'borrowed' ? 'active' : ''}`}
          onClick={() => setActiveTab('borrowed')}
        >
          내가 빌린 것 ({borrowedRentals.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'rented' ? 'active' : ''}`}
          onClick={() => setActiveTab('rented')}
        >
          내가 빌려준 것 ({rentedRentals.length})
        </button>
      </div>

      <div className="rentals-content">
        {currentRentals.length === 0 ? (
          <div className="empty-state">
            <p>대여 내역이 없습니다</p>
            <Link to="/" className="btn btn-primary">
              물품 둘러보기
            </Link>
          </div>
        ) : (
          <div className="rentals-list">
            {currentRentals.map(rental => (
              <RentalCard 
                key={rental._id} 
                rental={rental} 
                isBorrower={activeTab === 'borrowed'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyRentals;

