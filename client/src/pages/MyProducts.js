import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import './MyProducts.css';

const MyProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyProducts();
  }, []);

  const loadMyProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/user/${user.id}`);
      setProducts(response.data.products);
    } catch (error) {
      console.error('내 제품 로드 실패:', error);
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

  return (
    <div className="my-products-page">
      <div className="page-header">
        <h1>내 물품</h1>
        <Link to="/products/new" className="btn btn-primary">
          새 물품 등록
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <p>등록된 물품이 없습니다</p>
          <Link to="/products/new" className="btn btn-primary">
            첫 물품 등록하기
          </Link>
        </div>
      ) : (
        <div className="products-grid">
          {products.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProducts;

