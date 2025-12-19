import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import KoreaMap, { REGION_NAMES } from '../components/KoreaMap';
import CustomSelect from '../components/CustomSelect';
import './Profile.css';

// 지역별 세부지역 데이터
const areaData = {
  "서울": ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"],
  "경기": ["가평군", "고양시", "과천시", "광명시", "광주시", "구리시", "군포시", "김포시", "남양주시", "동두천시", "부천시", "성남시", "수원시", "시흥시", "안산시", "안성시", "안양시", "양주시", "양평군", "여주시", "연천군", "오산시", "용인시", "의왕시", "의정부시", "이천시", "파주시", "평택시", "포천시", "하남시", "화성시"],
  "인천": ["강화군", "계양구", "남동구", "동구", "미추홀구", "부평구", "서구", "연수구", "옹진군", "중구"],
  "부산": ["강서구", "금정구", "기장군", "남구", "동구", "동래구", "부산진구", "북구", "사상구", "사하구", "서구", "수영구", "연제구", "영도구", "중구", "해운대구"],
  "대구": ["군위군", "남구", "달서구", "달성군", "동구", "북구", "서구", "수성구", "중구"],
  "광주": ["광산구", "남구", "동구", "북구", "서구"],
  "대전": ["대덕구", "동구", "서구", "유성구", "중구"],
  "울산": ["남구", "동구", "북구", "울주군", "중구"],
  "세종": ["세종특별자치시"],
  "강원": ["강릉시", "고성군", "동해시", "삼척시", "속초시", "양구군", "양양군", "영월군", "원주시", "인제군", "정선군", "철원군", "춘천시", "태백시", "평창군", "홍천군", "화천군", "횡성군"],
  "충북": ["괴산군", "단양군", "보은군", "영동군", "옥천군", "음성군", "제천시", "증평군", "진천군", "청주시", "충주시"],
  "충남": ["계룡시", "공주시", "금산군", "논산시", "당진시", "보령시", "부여군", "서산시", "서천군", "아산시", "예산군", "천안시", "청양군", "태안군", "홍성군"],
  "전북": ["고창군", "군산시", "김제시", "남원시", "무주군", "부안군", "순창군", "완주군", "익산시", "임실군", "장수군", "전주시", "정읍시", "진안군"],
  "전남": ["강진군", "고흥군", "곡성군", "광양시", "구례군", "나주시", "담양군", "목포시", "무안군", "보성군", "순천시", "신안군", "여수시", "영광군", "영암군", "완도군", "장성군", "장흥군", "진도군", "함평군", "해남군", "화순군"],
  "경북": ["경산시", "경주시", "고령군", "구미시", "김천시", "문경시", "봉화군", "상주시", "성주군", "안동시", "영덕군", "영양군", "영주시", "영천시", "예천군", "울릉군", "울진군", "의성군", "청도군", "청송군", "칠곡군", "포항시"],
  "경남": ["거제시", "거창군", "고성군", "김해시", "남해군", "밀양시", "사천시", "산청군", "양산시", "의령군", "진주시", "창녕군", "창원시", "통영시", "하동군", "함안군", "함양군", "합천군"],
  "제주": ["서귀포시", "제주시"]
};

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, resendVerification, verifyCode, deleteAccount } = useAuth();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');

  // 인증 관련 상태
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);


  // 계정 탈퇴 관련 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 지역 수정 관련 상태
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [regionData, setRegionData] = useState({
    primaryRegion: '',
    subRegion: ''
  });
  const [regionLoading, setRegionLoading] = useState(false);
  const [regionError, setRegionError] = useState('');

  // 본인 프로필인지 확인
  const isOwnProfile = currentUser && currentUser.id === id;
  // 미인증 상태 확인
  const isUnverified = isOwnProfile && currentUser.isVerified === false;

  // 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);


  useEffect(() => {
    loadUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 인증번호 발송
  const handleSendCode = async () => {
    if (!currentUser?.email) return;
    
    setResendLoading(true);
    setMessage({ type: '', text: '' });
    
    const result = await resendVerification(currentUser.email);
    
    if (result.success) {
      setShowCodeInput(true);
      setMessage({ type: 'success', text: '✅ 인증번호가 발송되었습니다!' });
      setResendCooldown(60);
      setVerificationCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      setMessage({ type: 'error', text: `❌ ${result.message}` });
    }
    
    setResendLoading(false);
  };

  // 인증번호 입력 핸들러
  const handleCodeChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      setVerificationCode(newCode);
      inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setMessage({ type: 'error', text: '6자리 인증번호를 모두 입력해주세요' });
      return;
    }

    setVerifyLoading(true);
    setMessage({ type: '', text: '' });

    const result = await verifyCode(currentUser.email, code);

    if (result.success) {
      setMessage({ type: 'success', text: '🎉 인증이 완료되었습니다!' });
      setShowCodeInput(false);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setMessage({ type: 'error', text: result.message });
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }

    setVerifyLoading(false);
  };

  // 계정 탈퇴
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('비밀번호를 입력해주세요');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    const result = await deleteAccount(deletePassword);

    if (result.success) {
      alert('계정이 삭제되었습니다. 이용해주셔서 감사합니다.');
      navigate('/');
    } else {
      setDeleteError(result.message);
    }

    setDeleteLoading(false);
  };

  // 모달 닫기
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteError('');
  };

  // 지역 수정 모달 열기
  const openRegionModal = () => {
    setRegionData({
      primaryRegion: user.primaryRegion || '',
      subRegion: user.subRegion || ''
    });
    setRegionError('');
    setShowRegionModal(true);
  };

  // 지역 수정 모달 닫기
  const closeRegionModal = () => {
    setShowRegionModal(false);
    setRegionData({ primaryRegion: '', subRegion: '' });
    setRegionError('');
  };

  // 지도에서 지역 선택
  const handleMapRegionSelect = (region) => {
    setRegionData({
      primaryRegion: region,
      // 세종은 세부지역을 자동으로 설정
      subRegion: region === '세종' ? '세종특별자치시' : ''
    });
  };

  // 지역 정보 업데이트
  const handleUpdateRegion = async () => {
    if (!regionData.primaryRegion) {
      setRegionError('지역을 선택해주세요');
      return;
    }

    // 세종은 세부지역 선택 불필요
    if (regionData.primaryRegion !== '세종' && !regionData.subRegion) {
      setRegionError('세부지역을 선택해주세요');
      return;
    }

    setRegionLoading(true);
    setRegionError('');

    try {
      const response = await api.put('/users/me', {
        primaryRegion: regionData.primaryRegion,
        subRegion: regionData.subRegion
      });

      if (response.data.success) {
        // 사용자 정보 업데이트
        setUser(response.data.user);
        closeRegionModal();
        // AuthContext의 사용자 정보도 업데이트
        window.location.reload();
      }
    } catch (error) {
      setRegionError(error.response?.data?.message || '지역 정보 업데이트에 실패했습니다');
    } finally {
      setRegionLoading(false);
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

  const ownerReviews = reviews.filter(review => review.type === 'borrower');
  const borrowerReviews = reviews.filter(review => review.type === 'owner');

  const ownerAvgRating = ownerReviews.length > 0
    ? ownerReviews.reduce((acc, rev) => acc + rev.rating, 0) / ownerReviews.length
    : 0;

  const borrowerAvgRating = borrowerReviews.length > 0
    ? borrowerReviews.reduce((acc, rev) => acc + rev.rating, 0) / borrowerReviews.length
    : 0;

  return (
    <div className="profile-page">
      {/* 지역 수정 모달 */}
      {showRegionModal && (
        <div className="modal-overlay" onClick={closeRegionModal}>
          <div className="modal-content region-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🗺️ 지역 수정</h2>
              <button className="modal-close" onClick={closeRegionModal}>×</button>
            </div>
            <div className="modal-body">
              {regionError && (
                <div className="alert alert-error">{regionError}</div>
              )}

              <div className="region-selection-section">
                <label className="region-label-header">
                  지도를 클릭해서 지역을 선택하세요
                </label>
                
                <div className="region-selection-container">
                  <KoreaMap 
                    selectedRegion={regionData.primaryRegion}
                    onRegionSelect={handleMapRegionSelect}
                  />
                  
                  {regionData.primaryRegion && regionData.primaryRegion !== '세종' && (
                    <div className="sub-region-section">
                      <label className="sub-region-label">
                        세부지역 선택
                        <span className="sub-region-count">
                          ({areaData[regionData.primaryRegion]?.length}개 지역)
                        </span>
                      </label>
                      <CustomSelect
                        options={[
                          { value: '', label: '구/시/군을 선택하세요' },
                          ...areaData[regionData.primaryRegion]?.map(sub => ({
                            value: sub,
                            label: sub
                          }))
                        ]}
                        value={regionData.subRegion}
                        onChange={(value) => setRegionData({ ...regionData, subRegion: value })}
                        placeholder="구/시/군을 선택하세요"
                      />
                    </div>
                  )}
                  {regionData.primaryRegion === '세종' && (
                    <div className="sub-region-section">
                      <p className="sejong-notice">세종특별자치시는 세부지역 선택이 필요 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={closeRegionModal}
                disabled={regionLoading}
              >
                취소
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleUpdateRegion}
                disabled={regionLoading}
              >
                {regionLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계정 탈퇴 모달 */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ 계정 탈퇴</h2>
              <button className="modal-close" onClick={closeDeleteModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <p><strong>정말 탈퇴하시겠습니까?</strong></p>
                <p>탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.</p>
                <ul>
                  <li>등록한 물품</li>
                  <li>대여 기록</li>
                  <li>채팅 내역</li>
                  <li>받은 리뷰</li>
                </ul>
              </div>
              
              {deleteError && (
                <div className="alert alert-error">{deleteError}</div>
              )}
              
              <div className="form-group">
                <label>비밀번호 확인</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  disabled={deleteLoading}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={closeDeleteModal}
                disabled={deleteLoading}
              >
                취소
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 미인증 상태 배너 */}
      {isUnverified && (
        <div className="verification-banner">
          <div className="verification-banner-content">
            <div className="verification-icon">⚠️</div>
            <div className="verification-text">
              <strong>이메일 인증이 완료되지 않았습니다</strong>
              <p>일부 기능이 제한될 수 있습니다.</p>
            </div>
            {!showCodeInput && (
              <button 
                className="btn btn-verification"
                onClick={handleSendCode}
                disabled={resendLoading}
              >
                {resendLoading ? '발송 중...' : '인증번호 받기'}
              </button>
            )}
          </div>

          {showCodeInput && (
            <div className="verification-code-section">
              <p className="code-instruction">이메일로 받은 6자리 인증번호를 입력하세요</p>
              <div className="code-input-row">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="code-input-small"
                    disabled={verifyLoading}
                  />
                ))}
                <button
                  onClick={handleVerifyCode}
                  className="btn btn-verify"
                  disabled={verifyLoading}
                >
                  {verifyLoading ? '확인 중...' : '인증'}
                </button>
              </div>
              <button
                onClick={handleSendCode}
                className="btn-resend-small"
                disabled={resendLoading || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `${resendCooldown}초 후 재발송` : '인증번호 다시 받기'}
              </button>
            </div>
          )}

          {message.text && (
            <div className={`verification-message ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>
      )}

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
              <span>
                지역: {REGION_NAMES[user.primaryRegion] || user.primaryRegion}
                {/* 세종이 아닌 경우에만 세부지역 표시 */}
                {user.primaryRegion !== '세종' && user.subRegion && ` ${user.subRegion}`}
                {user.regions && user.regions.length > 1 && (
                  <span className="additional-regions">
                    (+{user.regions.length - 1})
                  </span>
                )}
              </span>
              {isOwnProfile && (
                <button 
                  className="btn-edit-region"
                  onClick={openRegionModal}
                >
                  지역 수정
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 본인 프로필일 때만 계정 탈퇴 버튼 표시 */}
        {isOwnProfile && (
          <button 
            className="btn-delete-account"
            onClick={() => setShowDeleteModal(true)}
          >
            계정 탈퇴
          </button>
        )}
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
