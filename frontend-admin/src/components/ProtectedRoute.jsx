// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, initialized } = useAuth();

  // Wait until auth state is restored from localStorage
  if (!initialized) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // If user is not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated → allow access
  return <Outlet />;
};

export default ProtectedRoute;
