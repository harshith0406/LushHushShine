import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load profile on start
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await API.get('/api/auth/me');
        setUser(response.data.user);
      } catch (err) {
        console.error('Session validation failed:', err.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await API.post('/api/auth/login', { email, password });
      const { token, user: userProfile } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userProfile));
      setUser(userProfile);
      
      return userProfile;
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Invalid credentials or login failed';
      throw new Error(errMsg);
    }
  };

  const register = async (profileData) => {
    try {
      // 1. Post registration details to backend
      await API.post('/api/auth/register', profileData);
      
      // 2. Automatically log in after registration
      return await login(profileData.email, profileData.password);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Registration failed';
      throw new Error(errMsg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default useAuth;
