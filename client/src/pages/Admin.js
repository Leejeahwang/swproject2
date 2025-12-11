import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Admin.css';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // 관리자 권한 체크
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (activeTab === 'dashboard') {
        const response = await api.get('/admin/stats');
        setStats(response.data.stats);
      } else if (activeTab === 'users') {
        const response = await api.get('/admin/users');
        setUsers(response.data.users);
      } else if (activeTab === 'products') {
        const response = await api.get('/admin/products');
        setProducts(response.data.products);
      } else if (activeTab === 'rentals') {
        const response = await api.get('/admin/rentals');
        setRentals(response.data.rentals);
      }
    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError(err.response?.data?.message || '데이터를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [activeTab, user, loadData]);

  // 사용자 삭제
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`정말 "${username}" 사용자를 삭제하시겠습니까?\n관련 상품, 대여, 채팅 등 모든 데이터가 삭제됩니다.`)) {
      return;
    }

    try {
      setActionLoading(userId);
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      alert('사용자가 삭제되었습니다');
    } catch (err) {
      alert(err.response?.data?.message || '사용자 삭제 실패');
    } finally {
      setActionLoading(null);
    }
  };

  // 상품 삭제
  const handleDeleteProduct = async (productId, title) => {
    if (!window.confirm(`정말 "${title}" 상품을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setActionLoading(productId);
      await api.delete(`/admin/products/${productId}`);
      setProducts(products.filter(p => p.id !== productId));
      alert('상품이 삭제되었습니다');
    } catch (err) {
      alert(err.response?.data?.message || '상품 삭제 실패');
    } finally {
      setActionLoading(null);
    }
  };

  // 대여 취소
  const handleCancelRental = async (rentalId) => {
    if (!window.confirm('정말 이 대여를 강제 취소하시겠습니까?')) {
      return;
    }

    try {
      setActionLoading(rentalId);
      await api.put(`/admin/rentals/${rentalId}/cancel`);
      setRentals(rentals.map(r => 
        r.id === rentalId ? { ...r, status: 'cancelled' } : r
      ));
      alert('대여가 취소되었습니다');
    } catch (err) {
      alert(err.response?.data?.message || '대여 취소 실패');
    } finally {
      setActionLoading(null);
    }
  };

  // 대여 상태 한글 변환
  const getRentalStatusText = (status) => {
    const statusMap = {
      pending: '대기중',
      approved: '승인됨',
      in_progress: '대여중',
      completed: '완료',
      cancelled: '취소됨',
      rejected: '거절됨'
    };
    return statusMap[status] || status;
  };

  // 상태 색상
  const getStatusClass = (status) => {
    if (['completed'].includes(status)) return 'status-success';
    if (['cancelled', 'rejected'].includes(status)) return 'status-danger';
    if (['pending'].includes(status)) return 'status-warning';
    return 'status-info';
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>🛡️ ShareHub 관리자</h1>
        <p>시스템 관리 대시보드</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 대시보드
        </button>
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 사용자
        </button>
        <button 
          className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          📦 상품
        </button>
        <button 
          className={`admin-tab ${activeTab === 'rentals' ? 'active' : ''}`}
          onClick={() => setActiveTab('rentals')}
        >
          🔄 대여
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-content">
        {loading ? (
          <div className="admin-loading">로딩 중...</div>
        ) : (
          <>
            {/* 대시보드 */}
            {activeTab === 'dashboard' && stats && (
              <div className="dashboard-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalUsers}</span>
                    <span className="stat-label">전체 사용자</span>
                  </div>
                  <div className="stat-sub">최근 7일: +{stats.recentUsers}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📦</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalProducts}</span>
                    <span className="stat-label">등록 상품</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🔄</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalRentals}</span>
                    <span className="stat-label">전체 대여</span>
                  </div>
                  <div className="stat-sub">진행 중: {stats.activeRentals}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <span className="stat-value">{stats.completedRentals}</span>
                    <span className="stat-label">완료된 대여</span>
                  </div>
                </div>
              </div>
            )}

            {/* 사용자 관리 */}
            {activeTab === 'users' && (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>이메일</th>
                      <th>지역</th>
                      <th>역할</th>
                      <th>인증</th>
                      <th>가입일</th>
                      <th>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td>{u.location || '-'}</td>
                        <td>
                          <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                            {u.role === 'admin' ? '관리자' : '사용자'}
                          </span>
                        </td>
                        <td>
                          <span className={`verify-badge ${u.isVerified !== false ? 'verified' : 'unverified'}`}>
                            {u.isVerified !== false ? '✓' : '✗'}
                          </span>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          {u.role !== 'admin' && (
                            <button 
                              className="btn-action btn-danger"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={actionLoading === u.id}
                            >
                              {actionLoading === u.id ? '...' : '삭제'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 상품 관리 */}
            {activeTab === 'products' && (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>상품명</th>
                      <th>소유자</th>
                      <th>카테고리</th>
                      <th>가격</th>
                      <th>등록일</th>
                      <th>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td>{p.title}</td>
                        <td>{p.ownerInfo?.username || '알 수 없음'}</td>
                        <td>{p.category}</td>
                        <td>{p.price?.toLocaleString()}원/일</td>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button 
                            className="btn-action btn-danger"
                            onClick={() => handleDeleteProduct(p.id, p.title)}
                            disabled={actionLoading === p.id}
                          >
                            {actionLoading === p.id ? '...' : '삭제'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 대여 관리 */}
            {activeTab === 'rentals' && (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>상품</th>
                      <th>소유자</th>
                      <th>대여자</th>
                      <th>상태</th>
                      <th>기간</th>
                      <th>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentals.map(r => (
                      <tr key={r.id}>
                        <td>{r.productInfo?.title || '삭제된 상품'}</td>
                        <td>{r.ownerInfo?.username || '알 수 없음'}</td>
                        <td>{r.borrowerInfo?.username || '알 수 없음'}</td>
                        <td>
                          <span className={`status-badge ${getStatusClass(r.status)}`}>
                            {getRentalStatusText(r.status)}
                          </span>
                        </td>
                        <td>
                          {r.startDate && r.endDate ? (
                            `${new Date(r.startDate).toLocaleDateString()} ~ ${new Date(r.endDate).toLocaleDateString()}`
                          ) : '-'}
                        </td>
                        <td>
                          {['pending', 'approved', 'in_progress'].includes(r.status) && (
                            <button 
                              className="btn-action btn-danger"
                              onClick={() => handleCancelRental(r.id)}
                              disabled={actionLoading === r.id}
                            >
                              {actionLoading === r.id ? '...' : '취소'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;







