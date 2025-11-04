import React from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = ({ product }) => {
  const getStatusBadge = (status) => {
    switch(status) {
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
      <div className={`product-card ${product.status === 'rented' ? 'rented' : ''}`}>
        <div className="product-image-container">
          <img 
            src={`http://localhost:5000${product.images[0]}`} 
            alt={product.title}
            className="product-image"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
            }}
          />
          {getStatusBadge(product.status)}
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
                ⭐ {(product.owner.averageRating || 0).toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;

