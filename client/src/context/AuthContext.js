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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 토큰이 있으면 사용자 정보 로드
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await api.get('/users/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
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
      // 이메일 인증이 필요한 경우
      if (response.data.requiresVerification) {
        return { 
          success: true, 
          requiresVerification: true,
          message: response.data.message,
          emailSent: response.data.emailSent
        };
      }
      // 기존 로직 (이메일 인증 없이 바로 로그인)
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '회원가입에 실패했습니다'
      };
    }
  };

  // 인증번호 재발송
  const resendVerification = async (email) => {
    try {
      const response = await api.post('/auth/resend-verification', { email });
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '인증번호 재발송에 실패했습니다'
      };
    }
  };

  // 인증번호 확인
  const verifyCode = async (email, code) => {
    try {
      const response = await api.post('/auth/verify-code', { email, code });
      if (response.data.success) {
        // 인증 완료 후 사용자 정보 갱신
        if (user) {
          setUser({ ...user, isVerified: true });
        }
      }
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '인증에 실패했습니다'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // 계정 탈퇴
  const deleteAccount = async (password) => {
    try {
      const response = await api.delete('/auth/delete-account', {
        data: { password }
      });
      if (response.data.success) {
        localStorage.removeItem('token');
        setUser(null);
      }
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || '계정 삭제에 실패했습니다'
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    loadUser,
    resendVerification,
    verifyCode,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

