// src/components/AuthContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { setAuthToken } from '../services/authApi';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const TOKEN_EXPIRY_DAYS = 30;
const EXPIRY_KEY = 'token_expiry';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ✅ LOGOUT
  const logout = useCallback(() => {
    console.log('🔐 Logging out...');
    localStorage.removeItem('authToken');
    localStorage.removeItem('token'); // ✅ Remove both
    localStorage.removeItem('user');
    localStorage.removeItem(EXPIRY_KEY);
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
    console.log('✅ Logged out successfully');
  }, []);

  // ✅ LOGIN - Save token with both keys
  const login = useCallback((token, userData) => {
    console.log('🔐 Logging in user:', userData);
    
    const expiryTime =
      Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    // ✅ Save token with BOTH keys for compatibility
    localStorage.setItem('authToken', token);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());

    setAuthToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    
    console.log('✅ User logged in, token saved:', token.substring(0, 20) + '...');
  }, []);

  // ✅ INITIALIZE AUTH on app mount
  const initializeAuth = useCallback(() => {
    console.log('🔍 Initializing auth...');
    
    // ✅ Check both storage keys
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const expiry = localStorage.getItem(EXPIRY_KEY);

    console.log('📦 Found token:', token ? 'Yes ✓' : 'No ✗');
    console.log('📦 Found user:', storedUser ? 'Yes ✓' : 'No ✗');
    console.log('📦 Token expiry:', expiry ? new Date(Number(expiry)).toLocaleString() : 'None');

    // ❌ Token expired or invalid
    if (!token || !storedUser || !expiry || Date.now() > Number(expiry)) {
      console.warn('⚠️ Token expired or invalid, logging out...');
      logout();
      setInitialized(true);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      
      // ✅ Restore token in both locations
      localStorage.setItem('authToken', token);
      localStorage.setItem('token', token);
      
      setAuthToken(token);
      setUser(parsedUser);
      setIsAuthenticated(true);
      
      console.log('✅ Auth restored successfully, user:', parsedUser.email);
    } catch (err) {
      console.error('❌ Failed to restore auth state:', err);
      logout();
    }

    setInitialized(true);
  }, [logout]);

  // Run once on app mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // ✅ ROLE HELPER
  const hasRole = (requiredRole) =>
    user?.role?.toLowerCase() === requiredRole?.toLowerCase();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        initialized,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};