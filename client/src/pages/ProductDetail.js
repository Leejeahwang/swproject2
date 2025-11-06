import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import Calendar from '../components/Calendar';
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

  // 대여 요청 모달 상태
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [rentalData, setRentalData] = useState({
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '18:00',
    meetingLocation: ''
  });

  useEffect(() => {
    loadProduct();
    loadReservedDates();
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

  // 날짜가 예약된 범위에 포함되는지 확인
  const isDateReserved = (date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return reservedDates.some(reserved => {
      const start = new Date(reserved.startDate);
      const end = new Date(reserved.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      return checkDate >= start && checkDate <= end;
    });
  };

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
        meetingLocation: '' 
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
            src={`http://localhost:5000${product.images[0]}`} 
            alt={product.title}
            className="main-image"
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
                  className="thumbnail"
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
                  placeholder="만남 장소를 입력하세요"
                />
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
    </div>
  );
};

export default ProductDetail;

