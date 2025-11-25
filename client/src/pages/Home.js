import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import CustomSelect from '../components/CustomSelect';
import './Home.css';

const CATEGORIES = [
  '전체', '전자기기', '생활가전', '스포츠/레저', '캠핑용품', 
  '공구', '육아용품', '책/교육', '의류/패션', '악기', '여행', '기타'
];

const REGIONS = [
  '전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('전체');
  const [region, setRegion] = useState('전체');
  const [sortBy, setSortBy] = useState('latest');

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, region, sortBy]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (category !== '전체') params.category = category;
      if (region !== '전체') params.region = region;
      if (sortBy) params.sort = sortBy;

      const response = await api.get('/products', { params });
      setProducts(response.data.products);
    } catch (error) {
      console.error('제품 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const params = { search };
      if (category !== '전체') params.category = category;
      if (region !== '전체') params.region = region;
      if (sortBy) params.sort = sortBy;

      const response = await api.get('/products', { params });
      setProducts(response.data.products);
    } catch (error) {
      console.error('검색 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <div className="home-header">
        <h1>이웃과 함께하는 렌탈 플랫폼</h1>
        <p>필요한 물건을 이웃과 나눠보세요</p>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <CustomSelect
          options={REGIONS.map(reg => ({ value: reg, label: reg }))}
          value={region}
          onChange={(value) => setRegion(value)}
          placeholder="지역"
        />
        <input
          type="text"
          placeholder="어떤 물품을 찾으시나요?"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="btn btn-primary">
          검색
        </button>
      </form>

      <div className="filters">
        <div className="category-filter">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="sort-filter">
          <CustomSelect
            options={[
              { value: 'latest', label: '최신순' },
              { value: 'popular', label: '인기순' },
              { value: 'price_low', label: '가격 낮은순' },
              { value: 'price_high', label: '가격 높은순' }
            ]}
            value={sortBy}
            onChange={(value) => setSortBy(value)}
            placeholder="정렬"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="no-products">
          <p>등록된 제품이 없습니다</p>
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

export default Home;

