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

  // ---------------- LOGOUT ----------------
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(EXPIRY_KEY);
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // ---------------- LOGIN ----------------
  const login = useCallback((token, userData) => {
    const expiryTime =
      Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem(EXPIRY_KEY, expiryTime.toString());

    setAuthToken(token);
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  // ---------------- INIT AUTH ----------------
  const initializeAuth = useCallback(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const expiry = localStorage.getItem(EXPIRY_KEY);

    // ❌ Token expired or invalid
    if (!token || !storedUser || !expiry || Date.now() > Number(expiry)) {
      logout();
      setInitialized(true);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setAuthToken(token);
      setUser(parsedUser);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Failed to restore auth state:', err);
      logout();
    }

    setInitialized(true);
  }, [logout]);

  // Run once on app mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // ---------------- ROLE HELPER ----------------
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
