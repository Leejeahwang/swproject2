import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const { user } = useAuth();
  
  // 관련자 여부 확인 (소유자 또는 현재 대여자)
  const isRelatedUser = user && (
    user.id === product.owner?.id || 
    user.id === product.currentBorrowerId
  );

  const getStatusBadge = () => {
    // 지연 상태일 때
    if (product.isOverdue) {
      // 관련자(소유자/대여자)에게는 강렬한 표시
      if (isRelatedUser) {
        return (
          <span className="status-badge overdue">
            🚨 반납 지연 {product.overdueDays}일
          </span>
        );
      }
      // 제3자에게는 온건한 표시 (그냥 대여중으로 표시)
      return <span className="status-badge rented">대여중</span>;
    }
    
    switch(product.status) {
      case 'available':
        return <span className="status-badge available">대여 가능</span>;
      case 'rented':
        return <span className="status-badge rented">대여중</span>;
      case 'unavailable':
        return <span className="status-badge unavailable">대여 불가</span>;
      default:
        return null;
    }
  };

  return (
    <Link to={`/products/${product.id || product._id}`} className="product-card-link">
      {/* 관련자에게만 overdue 스타일(빨간 테두리 등) 적용 */}
      <div className={`product-card ${product.status === 'rented' ? 'rented' : ''} ${product.isOverdue && isRelatedUser ? 'overdue' : ''}`}>
        <div className="product-image-container">
          <img 
            src={`http://localhost:5000${product.images[0]}`} 
            alt={product.title}
            className="product-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
            }}
          />
          {getStatusBadge()}
        </div>
        
        <div className="product-info">
          <h3 className="product-title">{product.title}</h3>
          <p className="product-price">
            {product.price.toLocaleString()}원 / {product.priceUnit}
          </p>
          <p className="product-location">📍 {product.region}</p>
          
          {product.owner && (
            <div className="product-owner">
              <span className="owner-name">{product.owner.username}</span>
              <span className="owner-rating">
                <span className="soft-star-mini"></span> {(product.owner.averageRating || 0).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;

