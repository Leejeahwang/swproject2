import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './MyRentals.css';

const MyRentals = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('borrowed'); // borrowed, rented, history
  const [borrowedRentals, setBorrowedRentals] = useState([]);
  const [rentedRentals, setRentedRentals] = useState([]);
  const [historyRentals, setHistoryRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 리뷰 작성 모달 상태
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });
  
  // 빌려주는 사람의 안심결제 옵션 상태 (각 대여 ID별로 관리)
  const [ownerSafePayOptions, setOwnerSafePayOptions] = useState({});

  useEffect(() => {
    loadRentals();
  }, []);

  const loadRentals = async () => {
    try {
      setLoading(true);
      const [borrowedResponse, rentedResponse, historyResponse] = await Promise.all([
        api.get('/rentals/my-rentals'),
        api.get('/rentals/my-listings'),
        api.get('/rentals/history')
      ]);

      setBorrowedRentals(borrowedResponse.data.rentals);
      setRentedRentals(rentedResponse.data.rentals);
      setHistoryRentals(historyResponse.data.rentals);
    } catch (error) {
      console.error('대여 내역 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '대기중', class: 'status-pending' },
      approved: { text: '예약 확정', class: 'status-approved' },
      ongoing: { text: '진행중', class: 'status-ongoing' },
      returning: { text: '반납 대기', class: 'status-returning' },
      completed: { text: '완료', class: 'status-completed' },
      cancelled: { text: '취소됨', class: 'status-cancelled' }
    };
    
    const badge = badges[status] || badges.pending;
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  const formatDateTime = (date, time) => {
    if (!date) return '';
    const dateStr = new Date(date).toLocaleDateString('ko-KR');
    if (time) {
      return `${dateStr} ${time}`;
    }
    return dateStr;
  };

  const handleApprove = async (rentalId) => {
    if (!window.confirm('대여를 승인하시겠습니까?')) return;

    const ownerSafePay = ownerSafePayOptions[rentalId] || false;

    try {
      await api.put(`/rentals/${rentalId}/approve`, { ownerSafePay });
      alert(`대여가 승인되었습니다${ownerSafePay ? '\n(안심결제 서비스 적용)' : '\n(일반 승인)'}`);
      loadRentals();
      // 체크박스 상태 초기화
      setOwnerSafePayOptions(prev => {
        const updated = { ...prev };
        delete updated[rentalId];
        return updated;
      });
    } catch (error) {
      alert(error.response?.data?.message || '승인 실패');
    }
  };

  const handleOwnerSafePayToggle = (rentalId, checked) => {
    setOwnerSafePayOptions(prev => ({
      ...prev,
      [rentalId]: checked
    }));
  };

  const handleReturn = async (rentalId) => {
    if (!window.confirm('물품을 반납하시겠습니까?\n빌려준 사람이 확인해야 최종 완료됩니다.')) return;

    try {
      await api.put(`/rentals/${rentalId}/return`);
      alert('반납 요청이 완료되었습니다.\n빌려준 사람의 확인을 기다려주세요.');
      loadRentals();
    } catch (error) {
      alert(error.response?.data?.message || '반납 요청 실패');
    }
  };

  const handlePay = async (rentalId) => {
    const rental = borrowedRentals.find(r => r.id === rentalId);
    if (!rental) return;

    const confirmMsg = `결제하시겠습니까?\n\n총 결제 금액: ${(rental.totalAmount || 0).toLocaleString()}원`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.put(`/rentals/${rentalId}/pay`);
      alert('결제가 완료되었습니다!\n대여가 시작되었습니다.');
      loadRentals();
    } catch (error) {
      alert(error.response?.data?.message || '결제 실패');
    }
  };

  const handleComplete = async (rentalId) => {
    if (!window.confirm('반납을 확인하시겠습니까?')) return;

    try {
      const response = await api.put(`/rentals/${rentalId}/complete`);
      alert(response.data?.message || '대여가 완료되었습니다');
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

  const handleOpenReviewModal = (rental, isBorrower) => {
    setSelectedRental({ ...rental, isBorrower });
    setReviewData({ rating: 5, comment: '' });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    try {
      const type = selectedRental.isBorrower ? 'borrower' : 'owner';
      
      await api.post('/reviews', {
        rentalId: selectedRental._id,
        rating: reviewData.rating,
        comment: reviewData.comment,
        type
      });

      alert('리뷰가 작성되었습니다');
      setShowReviewModal(false);
      setSelectedRental(null);
      setReviewData({ rating: 5, comment: '' });
      loadRentals();
    } catch (error) {
      alert(error.response?.data?.message || '리뷰 작성 실패');
    }
  };

  const RentalCard = ({ rental, isBorrower }) => {
    return (
      <div className="rental-card">
        <div className="rental-header">
          <Link to={`/products/${rental.product.id}`}>
            <img 
              src={`http://localhost:5000${rental.product.images[0]}`}
              alt={rental.product.title}
              className="rental-image"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/100?text=No+Image';
              }}
              style={{ cursor: 'pointer' }}
            />
          </Link>
          <div className="rental-info">
            <h3>
              <Link 
                to={`/products/${rental.product.id}`} 
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                {rental.product.title}
              </Link>
              {rental.status === 'approved' && (
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#10b981', 
                  marginLeft: '8px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  backgroundColor: '#d1fae5',
                  borderRadius: '4px'
                }}>
                  예약 확정
                </span>
              )}
            </h3>
            <p className="rental-price">
              {(rental.rentalPrice || rental.totalPrice || 0).toLocaleString()}원
              {!isBorrower && rental.insurance && rental.insurance !== 'none' && (
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#8b5cf6', 
                  marginLeft: '8px',
                  fontWeight: '500',
                  padding: '2px 8px',
                  backgroundColor: '#f3e8ff',
                  borderRadius: '4px'
                }}>
                  보험 {rental.insurance === 'basic' ? '기본형' : rental.insurance === 'premium' ? '프리미엄' : '고급형'}
                </span>
              )}
            </p>
            <p className="rental-period">
              {formatDateTime(rental.startDate, rental.startTime)} ~ 
              {formatDateTime(rental.endDate, rental.endTime)}
            </p>
          </div>
          {getStatusBadge(rental.status)}
        </div>

        <div className="rental-details">
          <div className="detail-item">
            <span className="label">{isBorrower ? '대여자' : '빌린 사람'}</span>
            <span className="value">
              {isBorrower ? 
                (rental.owner ? `${rental.owner.username} (⭐ ${rental.owner.averageRating?.toFixed(1) || '0.0'})` : '알 수 없음') : 
                (rental.borrower ? `${rental.borrower.username} (⭐ ${rental.borrower.averageRating?.toFixed(1) || '0.0'})` : '알 수 없음')
              }
            </span>
          </div>
          <div className="detail-item">
            <span className="label">만남 장소</span>
            <span className="value">{rental.meetingLocation}</span>
          </div>
          {/* 빌려주는 사람에게 빌리는 사람의 선택 옵션 표시 */}
          {!isBorrower && (
            <>
              {rental.borrowerSafePay && (
                <div className="detail-item">
                  <span className="label">안심결제</span>
                  <span className="value" style={{ color: '#3b82f6' }}>
                    ✓ 빌리는 사람이 선택함
                  </span>
                </div>
              )}
              {rental.insurance && rental.insurance !== 'none' && (
                <div className="detail-item">
                  <span className="label">보험</span>
                  <span className="value" style={{ color: '#8b5cf6', fontWeight: '500' }}>
                    {rental.insurance === 'basic' && '기본형 (최대 10만원)'}
                    {rental.insurance === 'premium' && '프리미엄 (최대 50만원)'}
                    {rental.insurance === 'luxury' && '고급형 (최대 200만원)'}
                  </span>
                </div>
              )}
            </>
          )}
          {/* 빌려주는 사람에게 수령 금액 표시 */}
          {!isBorrower && rental.ownerAmount !== undefined && rental.status !== 'pending' && (
            <div className="detail-item">
              <span className="label">수령 예정 금액</span>
              <span className="value" style={{ color: '#10b981', fontWeight: 'bold' }}>
                {rental.ownerAmount.toLocaleString()}원
                {rental.ownerSafePay && (
                  <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '5px' }}>
                    (안심결제 적용)
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* 완료된 대여에서는 리뷰 작성 버튼 표시 */}
        {rental.status === 'completed' && (
          <div className="rental-actions">
            {isBorrower && !rental.borrowerReviewed && (
              <button 
                onClick={() => handleOpenReviewModal(rental, true)}
                className="btn btn-primary"
              >
                ⭐ 리뷰 작성
              </button>
            )}
            {!isBorrower && !rental.ownerReviewed && (
              <button 
                onClick={() => handleOpenReviewModal(rental, false)}
                className="btn btn-primary"
              >
                ⭐ 리뷰 작성
              </button>
            )}
            {((isBorrower && rental.borrowerReviewed) || (!isBorrower && rental.ownerReviewed)) && (
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#d1fae5', 
                borderRadius: '8px',
                color: '#065f46',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                ✅ 리뷰 작성 완료
              </div>
            )}
          </div>
        )}

        {/* 진행 중인 대여 액션 버튼 */}
        {rental.status !== 'completed' && rental.status !== 'cancelled' && (
          <div className="rental-actions">
            {/* 빌려주는 사람: pending에서 승인 */}
            {!isBorrower && rental.status === 'pending' && (
              <>
                {/* 빌리는 사람이 선택한 옵션 요약 */}
                {(rental.borrowerSafePay || (rental.insurance && rental.insurance !== 'none')) && (
                  <div style={{ 
                    padding: '12px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }}>
                    <p style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: '#1e40af',
                      marginBottom: '8px'
                    }}>
                      📋 빌리는 사람이 선택한 옵션:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {rental.borrowerSafePay && (
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>✓</span>
                          <span>안심결제 (가짜 물품 받으면 전액 환불)</span>
                        </div>
                      )}
                      {rental.insurance && rental.insurance !== 'none' && (
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#8b5cf6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>🛡️</span>
                          <span>
                            보험 {rental.insurance === 'basic' ? '기본형' : rental.insurance === 'premium' ? '프리미엄' : '고급형'}
                            {' '}(최대 {rental.insuranceMaxCoverage ? (rental.insuranceMaxCoverage / 10000) + '만원' : '보상'})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  padding: '10px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    fontSize: '14px',
                    gap: '8px'
                  }}>
                    <input
                      type="checkbox"
                      checked={ownerSafePayOptions[rental._id] || false}
                      onChange={(e) => handleOwnerSafePayToggle(rental._id, e.target.checked)}
                      style={{ 
                        width: '18px', 
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontWeight: '500' }}>내 안심결제 서비스 이용</span>
                  </label>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    marginLeft: 'auto'
                  }}>
                    수수료 3% (물품 바꿔치기 보상)
                  </span>
                </div>
                <button 
                  onClick={() => handleApprove(rental._id)}
                  className="btn btn-primary"
                >
                  승인
                </button>
              </>
            )}
            
            {/* 빌려주는 사람: returning 상태에서 반납 확인 */}
            {!isBorrower && rental.status === 'returning' && (
              <button 
                onClick={() => handleComplete(rental._id)}
                className="btn btn-primary"
              >
                ✅ 반납 확인
              </button>
            )}

            {/* 빌리는 사람: approved 상태에서 결제 대기 */}
            {isBorrower && rental.status === 'approved' && rental.paymentStatus === 'pending' && (
              <button 
                onClick={() => handlePay(rental._id)}
                className="btn btn-primary"
                style={{ fontWeight: 'bold' }}
              >
                💳 결제하기
              </button>
            )}

            {/* 빌리는 사람: ongoing에서 반납 요청 */}
            {isBorrower && rental.status === 'ongoing' && (
              <button 
                onClick={() => handleReturn(rental._id)}
                className="btn btn-success"
              >
                📦 반납하기
              </button>
            )}

            {/* 빌리는 사람: returning 상태에서는 대기 메시지 */}
            {isBorrower && rental.status === 'returning' && (
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#fff3cd', 
                borderRadius: '8px',
                color: '#856404',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                ⏳ 빌려준 사람의 반납 확인을 기다리는 중입니다
              </div>
            )}

            {/* 빌리는 사람: pending에서만 취소 가능 */}
            {isBorrower && rental.status === 'pending' && (
              <button 
                onClick={() => handleCancel(rental._id)}
                className="btn btn-danger"
              >
                취소
              </button>
            )}

            {/* 빌려주는 사람: pending에서만 취소 가능 */}
            {!isBorrower && rental.status === 'pending' && (
              <button 
                onClick={() => handleCancel(rental._id)}
                className="btn btn-danger"
              >
                취소
              </button>
            )}

            {/* 빌려주는 사람: approved 상태에서 결제 대기중 표시 */}
            {!isBorrower && rental.status === 'approved' && rental.paymentStatus === 'pending' && (
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#fff3e0', 
                borderRadius: '8px',
                color: '#e65100',
                fontSize: '14px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                ⏳ 결제 대기중
              </div>
            )}

            {/* 빌려주는 사람: ongoing 상태에서는 대여중 표시 */}
            {!isBorrower && rental.status === 'ongoing' && (
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#e3f2fd', 
                borderRadius: '8px',
                color: '#1565c0',
                fontSize: '14px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                🔄 대여 진행 중
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const getCurrentRentals = () => {
    if (activeTab === 'borrowed') return borrowedRentals;
    if (activeTab === 'rented') return rentedRentals;
    return historyRentals;
  };

  const currentRentals = getCurrentRentals();

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
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          과거 대여 ({historyRentals.length})
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
            {currentRentals.map(rental => {
              // history 탭에서는 borrower 정보로 빌린 사람인지 판단
              const isBorrower = activeTab === 'history' 
                ? rental.borrower && rental.borrower.id === user?.id
                : activeTab === 'borrowed';
              
              return (
                <RentalCard 
                  key={rental._id} 
                  rental={rental} 
                  isBorrower={isBorrower}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 리뷰 작성 모달 */}
      {showReviewModal && selectedRental && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>리뷰 작성</h2>
            
            <div className="review-target">
              <p>
                {selectedRental.isBorrower 
                  ? `${selectedRental.owner?.username}님에 대한 리뷰` 
                  : `${selectedRental.borrower?.username}님에 대한 리뷰`}
              </p>
              <p className="review-product">제품: {selectedRental.product?.title}</p>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label>별점</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span
                      key={star}
                      className={`star ${reviewData.rating >= star ? 'active' : ''}`}
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
                <p className="rating-text">{reviewData.rating}점</p>
              </div>

              <div className="form-group">
                <label>코멘트 (선택사항)</label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  placeholder="거래 경험을 공유해주세요"
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  리뷰 제출
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowReviewModal(false)}
                  className="btn btn-outline"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRentals;

