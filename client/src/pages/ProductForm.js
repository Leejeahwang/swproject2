import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import CustomSelect from '../components/CustomSelect';
import './ProductForm.css';

const CATEGORIES = [
  '전자기기', '생활가전', '스포츠/레저', '캠핑용품', 
  '공구', '육아용품', '책/교육', '의류/패션', '악기', '여행', '기타'
];

const REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
];

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
  const [images, setImages] = useState([]); // File 객체 배열
  const [imagePreviews, setImagePreviews] = useState([]); // 미리보기 URL 배열
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 컴포넌트 언마운트 시 preview URL 정리
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

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

  // 이미지 선택 핸들러 (단일 파일만)
  const handleImageSelect = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택 가능합니다');
      return;
    }

    // 이미지 배열 업데이트
    const newImages = [...images];
    const newPreviews = [...imagePreviews];

    if (index < images.length) {
      // 기존 이미지 교체
      newImages[index] = file;
      // 기존 preview URL 해제
      if (newPreviews[index]) {
        URL.revokeObjectURL(newPreviews[index]);
      }
      newPreviews[index] = URL.createObjectURL(file);
    } else {
      // 새 이미지 추가
      newImages.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setImages(newImages);
    setImagePreviews(newPreviews);

    // input 초기화 (같은 파일 다시 선택 가능하도록)
    e.target.value = '';
  };

  // 이미지 삭제
  const handleImageRemove = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    // 삭제된 preview URL 해제
    if (imagePreviews[index]) {
      URL.revokeObjectURL(imagePreviews[index]);
    }
    
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // priceUnit을 '일'로 고정
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      formDataToSend.set('priceUnit', '일');

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
        const updateData = { ...formData, priceUnit: '일' };
        await api.put(`/products/${id}`, updateData);
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
              <div className="image-upload-container">
                {images.map((_, index) => (
                  <div key={index} className="image-upload-slot">
                    <div className="image-preview-wrapper">
                      <img 
                        src={imagePreviews[index]} 
                        alt={`미리보기 ${index + 1}`}
                        className="image-preview"
                      />
                      <button
                        type="button"
                        className="image-remove-btn"
                        onClick={() => handleImageRemove(index)}
                        aria-label="이미지 삭제"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                {images.length < 5 && (
                  <div className="image-upload-slot">
                    <label className="image-upload-placeholder" htmlFor={`file-upload-${images.length}`}>
                      {images.length === 0 ? (
                        <>
                          <span className="upload-icon">📷</span>
                          <span className="upload-text">이미지 선택</span>
                        </>
                      ) : (
                        <span className="upload-icon">+</span>
                      )}
                      <input
                        type="file"
                        id={`file-upload-${images.length}`}
                        accept="image/*"
                        onChange={(e) => handleImageSelect(images.length, e)}
                        className="hidden-file-input"
                      />
                    </label>
                  </div>
                )}
              </div>
              {images.length > 0 && images.length < 5 && (
                <div className="image-upload-hint">
                  {images.length}개 선택됨 (최대 5개까지 가능)
                </div>
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
            <CustomSelect
              options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
              placeholder="카테고리를 선택하세요"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>일일 대여 가격</label>
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
              <label>제품 상태</label>
              <CustomSelect
                options={CONDITIONS.map(cond => ({ value: cond, label: cond }))}
                value={formData.condition}
                onChange={(value) => setFormData({ ...formData, condition: value })}
                placeholder="제품 상태"
              />
            </div>
          </div>

          <div className="form-group">
            <label>지역 (시/도)</label>
            <CustomSelect
              options={REGIONS.map(reg => ({ value: reg, label: reg }))}
              value={formData.region}
              onChange={(value) => setFormData({ ...formData, region: value })}
              placeholder="지역을 선택하세요"
            />
          </div>

          <div className="form-group">
            <label>상세 주소</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              placeholder="예: 강남구 역삼동, 강남역 3번 출구"
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
