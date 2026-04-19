import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmployeeForm from '../Form/EmployeeForm';
import Sidebar from '../Form/Sidebar';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

function Desktop3() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isSidebarActive, setIsSidebarActive] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');

    if (id) {
      console.log('🔍 Edit Mode - Employee ID:', id);
      console.log('👤 Current User ID:', user?._id);
      setEditId(id);
    } else {
      setEditId(null);
    }
  }, [location.search, user]);

  const toggleSidebar = () => {
    setIsSidebarActive(prev => !prev);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully!');
    navigate('/login');
  };

  return (
    <div>
      <Sidebar 
        isSidebarActive={isSidebarActive} 
        userRole={user?.role} 
        handleLogout={handleLogout} 
        toggleSidebar={toggleSidebar}
      />
      
      <EmployeeForm 
        isSidebarActive={isSidebarActive}
        isEditMode={Boolean(editId)}
        editId={editId}
        currentUserId={user?._id}
      />
    </div>
  );
}

export default Desktop3;