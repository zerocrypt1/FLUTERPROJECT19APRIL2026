import React from 'react';
import { useAuth } from '../AuthContext';
import SuperAdminProfile from '../Admin/SuperAdminDashboard';

const Settings = () => {
  const { hasRole, user } = useAuth();

  // SuperAdmin sees dashboard in-place
  if (hasRole('superadmin')) {
    return <SuperAdminProfile />;
  }

  // Normal admin settings
  return (
    <div style={{ padding: '24px' }}>
      <h2>Settings</h2>
      <p><strong>Username:</strong> {user?.username}</p>
      <p><strong>Role:</strong> {user?.role}</p>
    </div>
  );
};

export default Settings;
