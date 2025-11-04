import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 1. 로딩 시작

  // 💡💡💡 [추가된 부분] 💡💡💡
  // 앱이 처음 마운트될 때 딱 한 번 실행되는 useEffect
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      // (참고) 실제 JWT 인증을 사용한다면,
      // 'x-user-id' 헤더 대신 'Authorization' 헤더를 설정해야 합니다.
      // api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // 토큰이 있으니 사용자 정보를 불러옵니다.
      loadUser(token); // loadUser가 끝나면 setLoading(false)가 호출됩니다.
    } else {
      // 토큰이 없으면, 로드할 사용자도 없습니다.
      // 로딩을 즉시 중지하여 로그인/회원가입 페이지를 보여줍니다.
      setLoading(false); // 2. 로딩 종료
    }
  }, []); // 빈 배열: 마운트 시 1회 실행

  // 'x-user-id' 헤더 설정 (임시 인증용)
  useEffect(() => {
    if (user && user.id) {
      api.defaults.headers.common['x-user-id'] = user.id;
    } else {
      delete api.defaults.headers.common['x-user-id'];
    }
  }, [user]);

  // (수정) loadUser가 토큰을 받아 헤더를 설정하도록 변경 (선택적이지만 권장)
  const loadUser = async (token) => {
    try {
      // (가정) '/api/users/me' 같은 엔드포인트가 실제 JWT 토큰을 검증하고
      // 사용자 정보를 반환한다고 가정합니다.
      
      // 'auth.js'의 토큰을 사용하려면 이 헤더가 필요합니다.
      // (이 부분은 실제 인증 방식에 맞게 수정 필요)
      if (token) {
         api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      // (가정) '/api/users/me' 라우트가 있다고 가정
      const response = await api.get('/users/me'); 
      setUser(response.data.user);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
      localStorage.removeItem('token'); // 유효하지 않은 토큰 제거
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false); // 3. 성공하든 실패하든 로딩 종료
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      
      // (권장) 로그인 성공 시 'Authorization' 헤더도 설정
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '로그인에 실패했습니다'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      localStorage.setItem('token', response.data.token);
      
      // (권장) 회원가입 성공 시 'Authorization' 헤더도 설정
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '회원가입에 실패했습니다'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization']; // (권장) 헤더 제거
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
    // loadUser는 내부에서만 사용하므로 value에서 제외
  };

  return (
    <AuthContext.Provider value={value}>
      {/* 이제 useEffect가 setLoading(false)를 보장하므로, 
        children이 렌더링됩니다.
      */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;