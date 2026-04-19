// src/components/AuthForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, signupUser } from '.././../services/authApi';
import { useAuth } from '../AuthContext'; // ✅ IMPORTANT
import '../../components/../styles/AuthStyles.css';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth(); // ✅ USE CONTEXT LOGIN

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEmail('');
    setError('');
    setMessage('');
    setIsLoading(false);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      let response;

      if (isLogin) {
        response = await loginUser({ username, password });
      } else {
        response = await signupUser({ username, email, password });
      }

      if (!response?.success) {
        setError(response?.message || 'Authentication failed');
        return;
      }

      // ---------------- LOGIN SUCCESS ----------------
      if (isLogin) {
        const user = response.user;

        // ✅ CRITICAL FIX: update AuthContext
        login(response.token, user);

        const userRole = user?.role?.toLowerCase();
        let targetPath = '/desktop2';

        if (user?.mustChangePassword) {
          targetPath = '/change-password';
        } else if (userRole === 'superadmin') {
          targetPath = '/admin-controller';
        }

        navigate(targetPath, { replace: true });
      }

      // ---------------- SIGNUP SUCCESS ----------------
      else {
        setMessage(
          response.message ||
            'Signup successful! Please wait for Super Admin approval.'
        );
        resetForm();
        setIsLogin(true);
      }
    } catch (err) {
      const errorMessage =
        err?.response?.data?.message || 'Failed to connect to server';
      setError(errorMessage);
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isLogin ? 'Directory Login' : 'Admin Signup'}</h2>
          <p>{isLogin ? 'Enter your credentials' : 'Request access as an Admin'}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleAuthSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading
              ? isLogin
                ? 'Logging in...'
                : 'Registering...'
              : isLogin
              ? 'Login'
              : 'Request Access'}
          </button>
        </form>

        <div className="auth-footer">
          <p onClick={toggleAuthMode} className="auth-link">
            {isLogin
              ? 'Are you a new Admin? Request Access'
              : 'Already have an account? Go to Login'}
          </p>
          <p className="note">Super Admin/Default login: admin / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
