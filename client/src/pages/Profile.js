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

  // 리뷰를 타입별로 분리
  const ownerReviews = reviews.filter(review => review.type === 'borrower'); // 빌려준 사람으로서 받은 리뷰
  const borrowerReviews = reviews.filter(review => review.type === 'owner'); // 빌린 사람으로서 받은 리뷰

  // 각 타입별 평균 평점 계산
  const ownerAvgRating = ownerReviews.length > 0
    ? ownerReviews.reduce((acc, rev) => acc + rev.rating, 0) / ownerReviews.length
    : 0;

  const borrowerAvgRating = borrowerReviews.length > 0
    ? borrowerReviews.reduce((acc, rev) => acc + rev.rating, 0) / borrowerReviews.length
    : 0;

  return (
    <div className="profile-page">
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
              {/* 빌려준 사람으로서 받은 리뷰 */}
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
                              <span className="soft-star-mini">⭐</span> {review.rating.toFixed(1)}
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

              {/* 빌린 사람으로서 받은 리뷰 */}
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

