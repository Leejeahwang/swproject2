import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import './Profile.css';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, resendVerification, verifyCode, deleteAccount } = useAuth();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');

  // 인증 관련 상태
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  // 계정 탈퇴 관련 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 본인 프로필인지 확인
  const isOwnProfile = currentUser && currentUser.id === id;
  // 미인증 상태 확인
  const isUnverified = isOwnProfile && currentUser.isVerified === false;

  // 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    loadUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userResponse, productsResponse, reviewsResponse] = await Promise.all([
        api.get(`/users/${id}`),
        api.get(`/products/user/${id}`),
        api.get(`/reviews/user/${id}`)
      ]);

      setUser(userResponse.data.user);
      setProducts(productsResponse.data.products);
      setReviews(reviewsResponse.data.reviews);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 인증번호 발송
  const handleSendCode = async () => {
    if (!currentUser?.email) return;
    
    setResendLoading(true);
    setMessage({ type: '', text: '' });
    
    const result = await resendVerification(currentUser.email);
    
    if (result.success) {
      setShowCodeInput(true);
      setMessage({ type: 'success', text: '✅ 인증번호가 발송되었습니다!' });
      setResendCooldown(60);
      setVerificationCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      setMessage({ type: 'error', text: `❌ ${result.message}` });
    }
    
    setResendLoading(false);
  };

  // 인증번호 입력 핸들러
  const handleCodeChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      setVerificationCode(newCode);
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setMessage({ type: 'error', text: '6자리 인증번호를 모두 입력해주세요' });
      return;
    }

    setVerifyLoading(true);
    setMessage({ type: '', text: '' });

    const result = await verifyCode(currentUser.email, code);

    if (result.success) {
      setMessage({ type: 'success', text: '🎉 인증이 완료되었습니다!' });
      setShowCodeInput(false);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setMessage({ type: 'error', text: result.message });
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }

    setVerifyLoading(false);
  };

  // 계정 탈퇴
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('비밀번호를 입력해주세요');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    const result = await deleteAccount(deletePassword);

    if (result.success) {
      alert('계정이 삭제되었습니다. 이용해주셔서 감사합니다.');
      navigate('/');
    } else {
      setDeleteError(result.message);
    }

    setDeleteLoading(false);
  };

  // 모달 닫기
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteError('');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="no-products">사용자를 찾을 수 없습니다</div>;
  }

  const ownerReviews = reviews.filter(review => review.type === 'borrower');
  const borrowerReviews = reviews.filter(review => review.type === 'owner');

  const ownerAvgRating = ownerReviews.length > 0
    ? ownerReviews.reduce((acc, rev) => acc + rev.rating, 0) / ownerReviews.length
    : 0;

  const borrowerAvgRating = borrowerReviews.length > 0
    ? borrowerReviews.reduce((acc, rev) => acc + rev.rating, 0) / borrowerReviews.length
    : 0;

  return (
    <div className="profile-page">
      {/* 계정 탈퇴 모달 */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ 계정 탈퇴</h2>
              <button className="modal-close" onClick={closeDeleteModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <p><strong>정말 탈퇴하시겠습니까?</strong></p>
                <p>탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.</p>
                <ul>
                  <li>등록한 물품</li>
                  <li>대여 기록</li>
                  <li>채팅 내역</li>
                  <li>받은 리뷰</li>
                </ul>
              </div>
              
              {deleteError && (
                <div className="alert alert-error">{deleteError}</div>
              )}
              
              <div className="form-group">
                <label>비밀번호 확인</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  disabled={deleteLoading}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={closeDeleteModal}
                disabled={deleteLoading}
              >
                취소
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 미인증 상태 배너 */}
      {isUnverified && (
        <div className="verification-banner">
          <div className="verification-banner-content">
            <div className="verification-icon">⚠️</div>
            <div className="verification-text">
              <strong>이메일 인증이 완료되지 않았습니다</strong>
              <p>일부 기능이 제한될 수 있습니다.</p>
            </div>
            {!showCodeInput && (
              <button 
                className="btn btn-verification"
                onClick={handleSendCode}
                disabled={resendLoading}
              >
                {resendLoading ? '발송 중...' : '인증번호 받기'}
              </button>
            )}
          </div>

          {showCodeInput && (
            <div className="verification-code-section">
              <p className="code-instruction">이메일로 받은 6자리 인증번호를 입력하세요</p>
              <div className="code-input-row">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="code-input-small"
                    disabled={verifyLoading}
                  />
                ))}
                <button
                  onClick={handleVerifyCode}
                  className="btn btn-verify"
                  disabled={verifyLoading}
                >
                  {verifyLoading ? '확인 중...' : '인증'}
                </button>
              </div>
              <button
                onClick={handleSendCode}
                className="btn-resend-small"
                disabled={resendLoading || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `${resendCooldown}초 후 재발송` : '인증번호 다시 받기'}
              </button>
            </div>
          )}

          {message.text && (
            <div className={`verification-message ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>
      )}

      <div className="profile-header">
        <div className="profile-info">
          {user.profileImage && (
            <img 
              src={`http://localhost:5000${user.profileImage}`}
              alt={user.username}
              className="profile-avatar"
            />
          )}
          <div className="profile-details">
            <h1>{user.username}</h1>
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-label">전체 평점</span>
                <span className="stat-value rating-value">
                  <span className="soft-star-icon"></span> {(user.averageRating || 0).toFixed(1)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">대여 횟수</span>
                <span className="stat-value">{user.rentalCount}회</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">빌린 횟수</span>
                <span className="stat-value">{user.borrowCount}회</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">총 수익</span>
                <span className="stat-value earnings">
                  {(user.totalEarnings || 0).toLocaleString()}원
                </span>
              </div>
            </div>
            <div className="profile-region">
              지역: {user.primaryRegion}
              {user.regions && user.regions.length > 1 && (
                <span className="additional-regions">
                  (+{user.regions.length - 1})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 본인 프로필일 때만 계정 탈퇴 버튼 표시 */}
        {isOwnProfile && (
          <button 
            className="btn-delete-account"
            onClick={() => setShowDeleteModal(true)}
          >
            계정 탈퇴
          </button>
        )}
      </div>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          등록 물품 ({products.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          받은 리뷰 ({reviews.length})
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'products' ? (
          products.length === 0 ? (
            <div className="no-content">등록된 물품이 없습니다</div>
          ) : (
            <div className="products-grid">
              {products.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )
        ) : (
          reviews.length === 0 ? (
            <div className="no-content">받은 리뷰가 없습니다</div>
          ) : (
            <div className="reviews-container">
              <div className="review-section">
                <div className="review-section-header">
                  <h3>🏠 빌려준 사람으로서 받은 리뷰</h3>
                  {ownerReviews.length > 0 && (
                    <div className="section-rating">
                      <span className="avg-rating soft-star-badge">
                        <span className="soft-star-mini"></span> {ownerAvgRating.toFixed(1)}
                      </span>
                      <span className="review-count">({ownerReviews.length}개)</span>
                    </div>
                  )}
                </div>
                {ownerReviews.length === 0 ? (
                  <div className="no-reviews-section">아직 받은 리뷰가 없습니다</div>
                ) : (
                  <div className="reviews-list">
                    {ownerReviews.map(review => (
                      <div key={review._id} className="review-card">
                        <div className="review-header">
                          <div className="reviewer-info">
                            <strong>{review.reviewer.username}</strong>
                            <span className="review-rating soft-star-badge">
                              <span className="soft-star-mini"></span> {review.rating.toFixed(1)}
                            </span>
                          </div>
                          <span className="review-date">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="review-comment">{review.comment}</p>
                        )}
                        {review.product && (
                          <p className="review-product">
                            관련 제품: {review.product.title}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="review-section">
                <div className="review-section-header">
                  <h3>📦 빌린 사람으로서 받은 리뷰</h3>
                  {borrowerReviews.length > 0 && (
                    <div className="section-rating">
                      <span className="avg-rating soft-star-badge">
                        <span className="soft-star-mini"></span> {borrowerAvgRating.toFixed(1)}
                      </span>
                      <span className="review-count">({borrowerReviews.length}개)</span>
                    </div>
                  )}
                </div>
                {borrowerReviews.length === 0 ? (
                  <div className="no-reviews-section">아직 받은 리뷰가 없습니다</div>
                ) : (
                  <div className="reviews-list">
                    {borrowerReviews.map(review => (
                      <div key={review._id} className="review-card">
                        <div className="review-header">
                          <div className="reviewer-info">
                            <strong>{review.reviewer.username}</strong>
                            <span className="review-rating soft-star-badge">
                              <span className="soft-star-mini"></span> {review.rating.toFixed(1)}
                            </span>
                          </div>
                          <span className="review-date">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="review-comment">{review.comment}</p>
                        )}
                        {review.product && (
                          <p className="review-product">
                            관련 제품: {review.product.title}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Profile;
