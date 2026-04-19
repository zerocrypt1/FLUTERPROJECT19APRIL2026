// src/components/Desktop3/Desktop3.jsx

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // ✅ FIXED
import EmployeeForm from '../Form/EmployeeForm';
import Sidebar from '../Form/Sidebar';
import { useAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

function Desktop3() {
  const location = useLocation();
  const navigate = useNavigate(); // ✅ now properly imported
  const { user, logout } = useAuth();

  const [isSidebarActive, setIsSidebarActive] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');

    if (id) {
      setEditId(id);
    } else {
      setEditId(null);
    }
  }, [location.search]);

  const toggleSidebar = () => {
    setIsSidebarActive(prev => !prev);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully!');
    
    // ✅ optional redirect after logout
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
        isEditMode={Boolean(editId)} // ✅ cleaner
        editId={editId}
      />
    </div>
  );
}

export default Desktop3;