import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import './ProductForm.css';

const CATEGORIES = [
  '전자기기', '생활가전', '스포츠/레저', '캠핑용품', 
  '공구', '육아용품', '책/교육', '의류/패션', '기타'
];

const PRICE_UNITS = ['시간', '일', '주', '월'];
const CONDITIONS = ['최상', '상', '중', '하'];

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    priceUnit: '일',
    location: '',
    region: '',
    condition: '상'
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      const product = response.data.product;
      
      setFormData({
        title: product.title,
        description: product.description,
        category: product.category,
        price: product.price,
        priceUnit: product.priceUnit,
        location: product.location,
        region: product.region,
        condition: product.condition
      });
    } catch (error) {
      console.error('제품 로드 실패:', error);
      alert('제품을 불러올 수 없습니다');
      navigate('/my-products');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      alert('이미지는 최대 5개까지 업로드 가능합니다');
      return;
    }
    setImages(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      if (images.length > 0) {
        images.forEach(image => {
          formDataToSend.append('images', image);
        });
      } else if (!isEdit) {
        setError('최소 1개의 이미지를 업로드해주세요');
        setLoading(false);
        return;
      }

      if (isEdit) {
        await api.put(`/products/${id}`, formData);
        alert('제품이 수정되었습니다');
      } else {
        await api.post('/products', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('제품이 등록되었습니다');
      }

      navigate('/my-products');
    } catch (error) {
      setError(error.response?.data?.message || '제품 등록/수정 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-form-container">
      <div className="product-form-card">
        <h1>{isEdit ? '제품 수정' : '제품 등록'}</h1>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isEdit && (
            <div className="form-group">
              <label>제품 이미지 (최대 5개)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                required={!isEdit}
              />
              {images.length > 0 && (
                <p className="file-info">{images.length}개 파일 선택됨</p>
              )}
            </div>
          )}

          <div className="form-group">
            <label>제목</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              maxLength={100}
              placeholder="제품명을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label>카테고리</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">카테고리를 선택하세요</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>대여 가격</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label>단위</label>
              <select
                name="priceUnit"
                value={formData.priceUnit}
                onChange={handleChange}
              >
                {PRICE_UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>제품 상태</label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
              >
                {CONDITIONS.map(cond => (
                  <option key={cond} value={cond}>{cond}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>지역</label>
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              required
              placeholder="예: 서울"
            />
          </div>

          <div className="form-group">
            <label>거래 희망 장소</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="예: 강남역 3번 출구"
            />
          </div>

          <div className="form-group">
            <label>제품 설명</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              maxLength={1000}
              rows={8}
              placeholder="제품에 대한 상세한 설명을 입력하세요"
            />
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '처리 중...' : (isEdit ? '수정하기' : '등록하기')}
            </button>
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="btn btn-outline"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;

