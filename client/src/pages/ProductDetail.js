import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  // 대여 요청 모달 상태
  const [showRentalModal, setShowRentalModal] = useState(false);
  const [rentalData, setRentalData] = useState({
    startDate: '',
    endDate: '',
    meetingLocation: ''
  });

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${id}`);
      setProduct(response.data.product);
      setRecommendedProducts(response.data.recommendedProducts || []);
      
      if (user) {
        setLiked(response.data.product.likes.includes(user.id));
      }
    } catch (error) {
      console.error('제품 로드 실패:', error);
    } finally {
      setLoading(false);
    }
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

  const handleRentalRequest = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('로그인이 필요합니다');
      navigate('/login');
      return;
    }

    try {
      await api.post('/rentals', {
        productId: id,
        ...rentalData
      });
      
      alert('대여 요청이 완료되었습니다!');
      setShowRentalModal(false);
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

    // 채팅방 ID 생성 (사용자ID_판매자ID_제품ID)
    const roomId = `${user.id}_${product.owner.id}_${id}`;
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

  const isOwner = user && product.owner._id === user.id;

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
              <span className="meta-label">거래 희망 장소</span>
              <span className="meta-value">{product.location}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">조회수</span>
              <span className="meta-value">{product.views}회</span>
            </div>
          </div>

          <div className="owner-info">
            <h3>판매자 정보</h3>
            <Link to={`/profile/${product.owner._id}`} className="owner-card">
              <div className="owner-details">
                <h4>{product.owner.username}</h4>
                <p>🎯 신뢰도: {product.owner.trustScore}점</p>
                <p>⭐ 평점: {product.owner.averageRating.toFixed(1)}</p>
                <p>대여 {product.owner.rentalCount}회</p>
              </div>
            </Link>
          </div>

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
                {product.status === 'available' ? (
                  <button 
                    onClick={() => setShowRentalModal(true)}
                    className="btn btn-primary"
                  >
                    대여 요청
                  </button>
                ) : product.status === 'rented' ? (
                  <button 
                    className="btn btn-secondary"
                    disabled
                    style={{ cursor: 'not-allowed', opacity: 0.6 }}
                  >
                    대여중
                  </button>
                ) : (
                  <button 
                    className="btn btn-secondary"
                    disabled
                    style={{ cursor: 'not-allowed', opacity: 0.6 }}
                  >
                    대여 불가
                  </button>
                )}
                <button onClick={handleChat} className="btn btn-outline">
                  채팅하기
                </button>
              </>
            )}
          </div>
        </div>
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
            <form onSubmit={handleRentalRequest}>
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
                <label>종료일</label>
                <input
                  type="date"
                  value={rentalData.endDate}
                  onChange={(e) => setRentalData({...rentalData, endDate: e.target.value})}
                  required
                  min={rentalData.startDate || new Date().toISOString().split('T')[0]}
                />
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

