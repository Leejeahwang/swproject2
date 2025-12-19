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
  const [reports, setReports] = useState([]);
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
      } else if (activeTab === 'reports') {
        const response = await api.get('/admin/reports');
        setReports(response.data.reports);
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

  // 신고 처리
  const handleProcessReport = async (reportId, status) => {
    const statusText = status === 'approved' ? '승인' : '거절';
    if (!window.confirm(`이 신고를 ${statusText}하시겠습니까?`)) {
      return;
    }

    try {
      setActionLoading(reportId);
      await api.put(`/admin/reports/${reportId}/process`, { status });
      setReports(reports.map(r => 
        r.id === reportId ? { ...r, status } : r
      ));
      alert(`신고가 ${statusText}되었습니다`);
    } catch (err) {
      alert(err.response?.data?.message || '신고 처리 실패');
    } finally {
      setActionLoading(null);
    }
  };

  // 사용자 차단
  const handleBlockUser = async (userId, username) => {
    const blockDays = prompt(`${username}님을 몇 일간 차단하시겠습니까? (1~30일)`);
    if (!blockDays || isNaN(blockDays) || blockDays < 1 || blockDays > 30) {
      return;
    }

    const reason = prompt('차단 사유를 입력해주세요:') || '관리자에 의한 차단';

    try {
      setActionLoading(`block-${userId}`);
      await api.put(`/admin/users/${userId}/block`, { blockDays: parseInt(blockDays), reason });
      setUsers(users.map(u => 
        u.id === userId ? { 
          ...u, 
          blockedUntil: new Date(Date.now() + parseInt(blockDays) * 24 * 60 * 60 * 1000).toISOString(),
          blockReason: reason
        } : u
      ));
      alert(`${username}님이 ${blockDays}일간 차단되었습니다`);
    } catch (err) {
      alert(err.response?.data?.message || '사용자 차단 실패');
    } finally {
      setActionLoading(null);
    }
  };

  // 사용자 차단 해제
  const handleUnblockUser = async (userId) => {
    if (!window.confirm('이 사용자의 차단을 해제하시겠습니까?')) {
      return;
    }

    try {
      setActionLoading(`unblock-${userId}`);
      await api.put(`/admin/users/${userId}/unblock`);
      setUsers(users.map(u => 
        u.id === userId ? { 
          ...u, 
          blockedUntil: null,
          blockReason: null
        } : u
      ));
      alert('차단이 해제되었습니다');
    } catch (err) {
      alert(err.response?.data?.message || '차단 해제 실패');
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
        <button 
          className={`admin-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          🚨 신고
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
                      <th>상태</th>
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
                        <td>
                          {u.blockedUntil && new Date(u.blockedUntil) > new Date() ? (
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                              차단됨 ({Math.ceil((new Date(u.blockedUntil) - new Date()) / (1000 * 60 * 60 * 24))}일 남음)
                            </span>
                          ) : (
                            <span style={{ color: '#10b981' }}>정상</span>
                          )}
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          {u.role !== 'admin' && (
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {u.blockedUntil && new Date(u.blockedUntil) > new Date() ? (
                                <button 
                                  className="btn-action btn-success"
                                  onClick={() => handleUnblockUser(u.id)}
                                  disabled={actionLoading === `unblock-${u.id}`}
                                  style={{ fontSize: '12px', padding: '5px 10px' }}
                                >
                                  {actionLoading === `unblock-${u.id}` ? '...' : '차단 해제'}
                                </button>
                              ) : (
                                <button 
                                  className="btn-action btn-warning"
                                  onClick={() => handleBlockUser(u.id, u.username)}
                                  disabled={actionLoading === `block-${u.id}`}
                                  style={{ fontSize: '12px', padding: '5px 10px' }}
                                >
                                  {actionLoading === `block-${u.id}` ? '...' : '차단'}
                                </button>
                              )}
                              <button 
                                className="btn-action btn-danger"
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                disabled={actionLoading === u.id}
                                style={{ fontSize: '12px', padding: '5px 10px' }}
                              >
                                {actionLoading === u.id ? '...' : '삭제'}
                              </button>
                            </div>
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

            {/* 신고 관리 */}
            {activeTab === 'reports' && (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>신고 유형</th>
                      <th>대상</th>
                      <th>신고자</th>
                      <th>사유</th>
                      <th>상태</th>
                      <th>신고일</th>
                      <th>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id}>
                        <td>
                          {r.type === 'no_show' ? '노쇼' : r.type === 'fake_product' ? '허위매물' : '기타'}
                        </td>
                        <td>
                          {r.targetType === 'product' && r.targetInfo && (
                            <span>제품: {r.targetInfo.title || '삭제됨'}</span>
                          )}
                          {r.targetType === 'rental' && r.targetInfo && (
                            <span>대여: {r.targetInfo.productTitle || '삭제됨'}</span>
                          )}
                          {r.targetType === 'user' && r.targetInfo && (
                            <span>사용자: {r.targetInfo.username || '삭제됨'}</span>
                          )}
                        </td>
                        <td>{r.reporterUsername}</td>
                        <td>{r.reason}</td>
                        <td>
                          <span className={`status-badge ${
                            r.status === 'approved' ? 'status-success' : 
                            r.status === 'rejected' ? 'status-danger' : 
                            'status-warning'
                          }`}>
                            {r.status === 'pending' ? '대기중' : r.status === 'approved' ? '승인' : '거절'}
                          </span>
                        </td>
                        <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td>
                          {r.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button 
                                className="btn-action btn-success"
                                onClick={() => handleProcessReport(r.id, 'approved')}
                                disabled={actionLoading === r.id}
                                style={{ fontSize: '12px', padding: '5px 10px' }}
                              >
                                승인
                              </button>
                              <button 
                                className="btn-action btn-danger"
                                onClick={() => handleProcessReport(r.id, 'rejected')}
                                disabled={actionLoading === r.id}
                                style={{ fontSize: '12px', padding: '5px 10px' }}
                              >
                                거절
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reports.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    신고 내역이 없습니다
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;








