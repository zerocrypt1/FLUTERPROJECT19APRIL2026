import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1>Welcome to Admin Portal</h1>
      <p>Secure Admin & Super Admin Access</p>
      <button
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/login')}
      >
        Admin Login
      </button>
    </div>
  );
};

export default Home;
