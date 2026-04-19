// src/components/Desktop1/Desktop1.jsx
import React, { useState } from 'react';
import Sidebar from '../Form/Sidebar';
import EmployeeForm from '../Form/EmployeeForm'; // Renamed the core form component
import './Desktop1.css';

function Desktop1() {
  const [isSidebarActive, setIsSidebarActive] = useState(false);

  // You can still include a function to toggle the sidebar if you have a header icon
  // const toggleSidebar = () => setIsSidebarActive(!isSidebarActive);

  return (
    <div className="desktop1-container">
      <Sidebar isSidebarActive={isSidebarActive} />
      
      <div className="desktop1-main-content">
        {/* Header/Menu icon would go here if needed to toggle sidebar */}
        
        <EmployeeForm />
      </div>
    </div>
  );
}

export default Desktop1;