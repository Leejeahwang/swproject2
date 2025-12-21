import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import Calendar from '../components/Calendar';
import CustomSelect from '../components/CustomSelect';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [reservedDates, setReservedDates] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ averageRating: 0, totalReviews: 0 });

  // 이미지 뷰어 상태
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  // 대여 요청 모달 상태
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [rentalData, setRentalData] = useState({
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '18:00',
    meetingLocation: '',
    borrowerSafePay: false,
    insurance: 'none'
  });

  // 신고 모달 상태
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState({
    type: 'fake_product',
    reason: '',
    description: ''
  });
  const [reportTarget, setReportTarget] = useState(null);

  // 안전 장소 추천 기능은 현재 비활성화 (UI/요청 제거)

  useEffect(() => {
    loadProduct();
    loadReservedDates();
    loadProductReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${id}`);
      setProduct(response.data.product);
      setRecommendedProducts(response.data.recommendedProducts || []);
      
      if (user && response.data.product.likes) {
        setLiked(response.data.product.likes.includes(user.id));
      }
    } catch (error) {
      console.error('제품 로드 실패:', error);
      alert('제품을 불러오는데 실패했습니다.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadReservedDates = async () => {
    try {
      const response = await api.get(`/rentals/product/${id}/reserved-dates`);
      setReservedDates(response.data.reservedDates || []);
    } catch (error) {
      console.error('예약 날짜 로드 실패:', error);
    }
  };

  const loadProductReviews = async () => {
    try {
      const response = await api.get(`/reviews/product/${id}`);
      setReviews(response.data.reviews || []);
      setReviewStats({
        averageRating: response.data.averageRating || 0,
        totalReviews: response.data.totalReviews || 0
      });
    } catch (error) {
      console.error('제품 리뷰 로드 실패:', error);
    }
  };

  // 별점 렌더링 함수
  const renderStars = (rating) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={star <= rating ? 'star filled' : 'star'}>
            ⭐
          </span>
        ))}
      </div>
    );
  };

  // 이미지 관련 함수
  const openImageModal = (index) => {
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  const goToPreviousImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showImageModal) {
        closeImageModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showImageModal]);

  const handleLike = async () => {
    if (!user) {
      alert('로그인이 필요합니다');
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/products/${id}/like`);
      setLiked(response.data.liked);
    } catch (error) {
      console.error('찜하기 실패:', error);
    }
  };

  // 날짜 범위 중복 체크 함수 (시간 포함)
  const checkDateOverlap = (start1, end1, start2, end2) => {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    
    return s1 <= e2 && s2 <= e1;
  };

  // 최종 금액 계산
  const calculateTotalPrice = () => {
    if (!product || !rentalData.startDate || !rentalData.endDate) return { rentalPrice: 0, fees: 0, total: 0 };

    const startDateTime = new Date(`${rentalData.startDate}T${rentalData.startTime}:00`);
    const endDateTime = new Date(`${rentalData.endDate}T${rentalData.endTime}:00`);
    const hours = Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60));
    const days = Math.ceil(hours / 24);

    const rentalPrice = product.price * days;
    let safePayFee = 0;
    let insuranceFee = 0;

    // 안심결제 수수료
    if (rentalData.borrowerSafePay) {
      safePayFee = Math.round(rentalPrice * 0.03);
    }

    // 보험 수수료
    if (rentalData.insurance === 'basic') {
      insuranceFee = Math.round(rentalPrice * 0.10);
    } else if (rentalData.insurance === 'premium') {
      insuranceFee = Math.round(rentalPrice * 0.15);
    } else if (rentalData.insurance === 'luxury') {
      insuranceFee = Math.round(rentalPrice * 0.20);
    }

    const totalFees = safePayFee + insuranceFee;
    const totalPrice = rentalPrice + totalFees;

    return {
      rentalPrice,
      safePayFee,
      insuranceFee,
      totalFees,
      totalPrice,
      days
    };
  };

  const handleRentalRequest = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('로그인이 필요합니다');
      navigate('/login');
      return;
    }

    // 시작/종료 날짜시간 결합
    const startDateTime = `${rentalData.startDate}T${rentalData.startTime}:00`;
    const endDateTime = `${rentalData.endDate}T${rentalData.endTime}:00`;

    // 클라이언트 측 날짜 중복 체크 (시간 포함)
    const hasConflict = reservedDates.some(reserved => 
      checkDateOverlap(startDateTime, endDateTime, reserved.startDateTime, reserved.endDateTime)
    );

    if (hasConflict) {
      alert('선택하신 기간에 이미 다른 예약이 있습니다.\n예약된 날짜를 확인하고 다른 기간을 선택해주세요.');
      return;
    }

    try {
      await api.post('/rentals', {
        productId: id,
        ...rentalData
      });
      
      alert('대여 요청이 완료되었습니다!');
      setShowRentalModal(false);
      setRentalData({ 
        startDate: '', 
        startTime: '09:00',
        endDate: '', 
        endTime: '18:00',
        meetingLocation: '',
        borrowerSafePay: false,
        insurance: 'none'
      });
      loadReservedDates(); // 예약 목록 새로고침
      navigate('/my-rentals');
    } catch (error) {
      alert(error.response?.data?.message || '대여 요청 실패');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/products/${id}`);
      alert('제품이 삭제되었습니다');
      navigate('/my-products');
    } catch (error) {
      alert('삭제 실패');
    }
  };

  const handleChat = () => {
    if (!user) {
      alert('로그인이 필요합니다');
      navigate('/login');
      return;
    }

    if (!product.owner) {
      alert('판매자 정보를 찾을 수 없습니다');
      return;
    }

    // 채팅방 ID 생성 (사용자ID_판매자ID_제품ID)
    const ownerId = product.owner._id || product.owner.id;
    const roomId = `${user.id}_${ownerId}_${id}`;
    navigate(`/chats/${roomId}`);
  };

  // 신고 처리
  const handleReport = (targetType, targetId) => {
    if (!user) {
      alert('로그인이 필요합니다');
      navigate('/login');
      return;
    }
    setReportTarget({ targetType, targetId });
    setReportData({ type: targetType === 'product' ? 'fake_product' : 'no_show', reason: '', description: '' });
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportData.reason) {
      alert('신고 사유를 선택해주세요');
      return;
    }

    try {
      await api.post('/reports', {
        type: reportData.type,
        targetType: reportTarget.targetType,
        targetId: reportTarget.targetId,
        reason: reportData.reason,
        description: reportData.description
      });
      alert('신고가 접수되었습니다. 검토 후 처리됩니다.');
      setShowReportModal(false);
      setReportTarget(null);
      setReportData({ type: 'fake_product', reason: '', description: '' });
    } catch (error) {
      alert(error.response?.data?.message || '신고 접수 실패');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!product) {
    return <div className="no-products">제품을 찾을 수 없습니다</div>;
  }

  const isOwner = user && product.owner && (product.owner._id === user.id || product.owner.id === user.id);

  return (
    <div className="product-detail">
      <div className="detail-container">
        <div className="detail-images">
          <img 
            src={`http://localhost:5000${product.images[currentImageIndex]}`} 
            alt={product.title}
            className="main-image"
            onClick={() => openImageModal(currentImageIndex)}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/600x400?text=No+Image';
            }}
          />
          {product.images.length > 1 && (
            <div className="thumbnail-list">
              {product.images.map((img, index) => (
                <img 
                  key={index}
                  src={`http://localhost:5000${img}`}
                  alt={`${product.title} ${index + 1}`}
                  className={`thumbnail ${currentImageIndex === index ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150x80?text=No+Image';
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <div className="detail-header">
            <h1>{product.title}</h1>
            <button onClick={handleLike} className="like-btn">
              {liked ? '❤️' : '🤍'} 찜하기
            </button>
          </div>

          <div className="price-info">
            <span className="price">{product.price.toLocaleString()}원</span>
            <span className="price-unit">/ {product.priceUnit}</span>
          </div>

          <div className="detail-meta">
            <div className="meta-item">
              <span className="meta-label">카테고리</span>
              <span className="meta-value">{product.category}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">상태</span>
              <span className="meta-value">{product.condition}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">지역</span>
              <span className="meta-value">📍 {product.region}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">상세 주소</span>
              <span className="meta-value">{product.location}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">조회수</span>
              <span className="meta-value">{product.views}회</span>
            </div>
          </div>

          {product.owner && (
            <div className="owner-info">
              <h3>판매자 정보</h3>
              <Link to={`/profile/${product.owner._id || product.owner.id}`} className="owner-card">
                <div className="owner-details">
                  <h4>{product.owner.username}</h4>
                  <p>⭐ 평점: {(product.owner.averageRating || 0).toFixed(1)}</p>
                  <p>대여 {product.owner.rentalCount || 0}회</p>
                </div>
              </Link>
            </div>
          )}

          <div className="action-buttons">
            {isOwner ? (
              <>
                <button 
                  onClick={() => navigate(`/products/edit/${id}`)}
                  className="btn btn-secondary"
                >
                  수정
                </button>
                <button 
                  onClick={handleDelete}
                  className="btn btn-danger"
                >
                  삭제
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setShowRentalModal(true)}
                  className="btn btn-primary"
                >
                  대여 요청
                </button>
                <button onClick={handleChat} className="btn btn-outline">
                  채팅하기
                </button>
                <button 
                  onClick={() => handleReport('product', id)}
                  className="btn btn-outline"
                  style={{ color: '#ef4444', borderColor: '#ef4444' }}
                >
                  🚨 신고
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 예약 달력 섹션 */}
      <div className="calendar-section">
        <h2>📅 대여 가능 날짜</h2>
        <p className="calendar-info">
          달력에서 예약된 날짜를 확인하세요. 예약되지 않은 날짜는 대여 요청이 가능합니다.
        </p>
        
        <Calendar reservedDates={reservedDates} />

        {reservedDates.length > 0 && (
          <div className="reserved-dates-detail">
            <h3>📋 예약된 기간 상세</h3>
            <ul>
              {reservedDates.map((reserved, index) => (
                <li key={index} className="reserved-item">
                  <span className="reserved-icon">🔴</span>
                  {new Date(reserved.startDate).toLocaleDateString()} {reserved.startTime || ''} ~ {new Date(reserved.endDate).toLocaleDateString()} {reserved.endTime || ''}
                  <span className={`status-badge ${reserved.status}`}>
                    {reserved.status === 'approved' ? '승인됨' : '진행중'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="description-section">
        <h2>제품 설명</h2>
        <p className="description">{product.description}</p>
      </div>

      {/* 제품 리뷰 섹션 */}
      <div className="reviews-section">
        <div className="reviews-header">
          <h2>📦 제품 리뷰 ({reviewStats.totalReviews})</h2>
          {reviewStats.totalReviews > 0 && (
            <div className="review-summary">
              <span className="average-rating">{reviewStats.averageRating.toFixed(1)}</span>
              {renderStars(Math.round(reviewStats.averageRating))}
              <span className="review-count">({reviewStats.totalReviews}개 리뷰)</span>
            </div>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="no-reviews">
            <p>아직 작성된 제품 리뷰가 없습니다.</p>
            <p className="no-reviews-sub">이 제품을 대여해보시고 리뷰를 남겨주세요!</p>
          </div>
        ) : (
          <div className="reviews-list">
            {reviews.map(review => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <div className="reviewer-info">
                    <Link to={`/profile/${review.reviewer.id}`} className="reviewer-name">
                      {review.reviewer.username}
                    </Link>
                    <span className="reviewer-rating">
                      ⭐ {(review.reviewer.averageRating || 0).toFixed(1)}
                    </span>
                  </div>
                  <div className="review-rating-date">
                    {renderStars(review.rating)}
                    <span className="review-date">
                      {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
                {review.comment && (
                  <p className="review-comment">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {recommendedProducts.length > 0 && (
        <div className="recommended-section">
          <h2>같은 카테고리의 다른 제품</h2>
          <div className="products-grid">
            {recommendedProducts.map(prod => (
              <ProductCard key={prod._id} product={prod} />
            ))}
          </div>
        </div>
      )}

      {/* 대여 요청 모달 */}
      {showRentalModal && (
        <div className="modal-overlay" onClick={() => setShowRentalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>대여 요청</h2>
            
            {reservedDates.length > 0 && (
              <div className="modal-warning">
                <p><strong>⚠️ 예약 불가 날짜:</strong></p>
                <ul className="reserved-dates-warning">
                  {reservedDates.map((reserved, index) => (
                    <li key={index}>
                      {new Date(reserved.startDate).toLocaleDateString()} {reserved.startTime || ''} ~ {new Date(reserved.endDate).toLocaleDateString()} {reserved.endTime || ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <form onSubmit={handleRentalRequest}>
              <div className="form-row">
                <div className="form-group">
                  <label>시작일</label>
                  <input
                    type="date"
                    value={rentalData.startDate}
                    onChange={(e) => setRentalData({...rentalData, startDate: e.target.value})}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label>시작 시간</label>
                  <input
                    type="time"
                    value={rentalData.startTime}
                    onChange={(e) => setRentalData({...rentalData, startTime: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>반납일</label>
                  <input
                    type="date"
                    value={rentalData.endDate}
                    onChange={(e) => setRentalData({...rentalData, endDate: e.target.value})}
                    required
                    min={rentalData.startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label>반납 시간</label>
                  <input
                    type="time"
                    value={rentalData.endTime}
                    onChange={(e) => setRentalData({...rentalData, endTime: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>만남 장소</label>
                <input
                  type="text"
                  value={rentalData.meetingLocation}
                  onChange={(e) => setRentalData({...rentalData, meetingLocation: e.target.value})}
                  required
                  placeholder="만남 장소를 입력하세요 (예: 역 출구, 카페 등 사람 많은 장소를 권장)"
                />
              </div>

              <div className="payment-options">
                <h4>결제 옵션</h4>
                
                <div className="form-group-checkbox">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rentalData.borrowerSafePay}
                      onChange={(e) => setRentalData({...rentalData, borrowerSafePay: e.target.checked})}
                    />
                    <div>
                      <strong>안심결제 (선택)</strong>
                      <p className="option-description">가짜 물품 받으면 전액 환불 보장 (수수료: 렌탈료의 3%)</p>
                    </div>
                  </label>
                </div>

                <div className="form-group">
                  <label>보험 선택</label>
                  <CustomSelect
                    options={[
                      { value: 'none', label: '보험 없음' },
                      { value: 'basic', label: '기본형 (10%) - 최대 10만원 보상' },
                      { value: 'premium', label: '프리미엄 (15%) - 최대 50만원 보상' },
                      { value: 'luxury', label: '고급형 (20%) - 최대 200만원 보상' }
                    ]}
                    value={rentalData.insurance}
                    onChange={(value) => setRentalData({...rentalData, insurance: value})}
                    placeholder="보험을 선택하세요"
                  />
                  <p className="option-description">파손/분실 시 보상</p>
                </div>

                {rentalData.startDate && rentalData.endDate && (
                  <div className="price-summary">
                    <h4>결제 예정 금액</h4>
                    <div className="price-detail">
                      <span>렌탈 가격 ({calculateTotalPrice().days}일)</span>
                      <span>{calculateTotalPrice().rentalPrice.toLocaleString()}원</span>
                    </div>
                    {rentalData.borrowerSafePay && (
                      <div className="price-detail">
                        <span>안심결제 수수료 (3%)</span>
                        <span>{calculateTotalPrice().safePayFee.toLocaleString()}원</span>
                      </div>
                    )}
                    {rentalData.insurance !== 'none' && (
                      <div className="price-detail">
                        <span>보험료 ({rentalData.insurance === 'basic' ? '10' : rentalData.insurance === 'premium' ? '15' : '20'}%)</span>
                        <span>{calculateTotalPrice().insuranceFee.toLocaleString()}원</span>
                      </div>
                    )}
                    <div className="price-total">
                      <strong>총 결제 금액</strong>
                      <strong>{calculateTotalPrice().totalPrice.toLocaleString()}원</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">요청하기</button>
                <button 
                  type="button" 
                  onClick={() => setShowRentalModal(false)}
                  className="btn btn-outline"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {showImageModal && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeImageModal}>
              ✕
            </button>
            
            {product.images.length > 1 && (
              <>
                <button className="image-modal-prev" onClick={goToPreviousImage}>
                  ‹
                </button>
                <button className="image-modal-next" onClick={goToNextImage}>
                  ›
                </button>
              </>
            )}

            <img 
              src={`http://localhost:5000${product.images[currentImageIndex]}`}
              alt={`${product.title} ${currentImageIndex + 1}`}
              className="image-modal-img"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/800x600?text=No+Image';
              }}
            />

            <div className="image-modal-counter">
              {currentImageIndex + 1} / {product.images.length}
            </div>

            {product.images.length > 1 && (
              <div className="image-modal-thumbnails">
                {product.images.map((img, index) => (
                  <img 
                    key={index}
                    src={`http://localhost:5000${img}`}
                    alt={`썸네일 ${index + 1}`}
                    className={`modal-thumbnail ${currentImageIndex === index ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/60x60?text=No+Image';
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 신고 모달 */}
      {showReportModal && reportTarget && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>🚨 신고하기</h2>
            <form onSubmit={handleSubmitReport}>
              <div className="form-group">
                <label>신고 유형</label>
                <select
                  value={reportData.type}
                  onChange={(e) => setReportData({...reportData, type: e.target.value})}
                  required
                >
                  <option value="fake_product">허위매물</option>
                  <option value="no_show">노쇼</option>
                  <option value="other">기타</option>
                </select>
              </div>
              <div className="form-group">
                <label>신고 사유</label>
                <select
                  value={reportData.reason}
                  onChange={(e) => setReportData({...reportData, reason: e.target.value})}
                  required
                >
                  <option value="">선택해주세요</option>
                  {reportData.type === 'fake_product' && (
                    <>
                      <option value="different_product">제품이 설명과 다름</option>
                      <option value="damaged_product">제품이 손상됨</option>
                      <option value="fake_product">가짜 제품</option>
                    </>
                  )}
                  {reportData.type === 'no_show' && (
                    <>
                      <option value="no_meeting">약속 장소에 나타나지 않음</option>
                      <option value="late_arrival">심각한 지각</option>
                    </>
                  )}
                  {reportData.type === 'other' && (
                    <>
                      <option value="inappropriate_behavior">부적절한 행동</option>
                      <option value="fraud">사기 의심</option>
                      <option value="other">기타</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>상세 설명 (선택사항)</label>
                <textarea
                  value={reportData.description}
                  onChange={(e) => setReportData({...reportData, description: e.target.value})}
                  placeholder="신고 내용을 자세히 설명해주세요"
                  rows={4}
                  maxLength={500}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-danger">신고하기</button>
                <button 
                  type="button" 
                  onClick={() => setShowReportModal(false)}
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

export default ProductDetail;

