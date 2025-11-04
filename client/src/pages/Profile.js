import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import './Profile.css';

const Profile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products'); // products, reviews

  useEffect(() => {
    loadUserData();
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

  const renderStars = (rating) => {
    return '⭐'.repeat(Math.round(rating));
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-info">
          {user.profileImage && (
            <img 
              src={`http://localhost:5001${user.profileImage}`}
              alt={user.username}
              className="profile-avatar"
            />
          )}
          <div className="profile-details">
            <h1>{user.username}</h1>
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-label">신뢰도</span>
                <span className="stat-value trust-score">
                  🎯 {user.trustScore}점
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">평점</span>
                <span className="stat-value">
                  ⭐ {user.averageRating.toFixed(1)}
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
            </div>
            <div className="profile-region">
              📍 {user.primaryRegion}
              {user.regions && user.regions.length > 1 && (
                <span className="additional-regions">
                  (+{user.regions.length - 1})
                </span>
              )}
            </div>
          </div>
        </div>
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
            <div className="reviews-list">
              {reviews.map(review => (
                <div key={review._id} className="review-card">
                  <div className="review-header">
                    <div className="reviewer-info">
                      <strong>{review.reviewer.username}</strong>
                      <span className="review-rating">
                        {renderStars(review.rating)}
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
          )
        )}
      </div>
    </div>
  );
};

export default Profile;

