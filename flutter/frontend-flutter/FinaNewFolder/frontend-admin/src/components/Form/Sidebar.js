// src/components/Form/Sidebar.jsx (REFINED)
import React from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, FileText, Settings, UserCircle, LogOut, Menu } from 'lucide-react'; 
import '../Desktop1/Desktop1.css'; 
import '../Desktop2/Desktop2.css'; 

const Sidebar = ({ isSidebarActive, userRole, handleLogout, toggleSidebar }) => {
    
    const profileLink = '/admin-controller';
    const profileText = "Profile"; 

    // Helper function for logout action
    const initiateLogout = () => {
        // --- DEFENSIVE FIX: Check if handleLogout is a function before calling it ---
        if (typeof handleLogout === 'function') {
            handleLogout(); 
        } else {
            console.error("Logout function is missing or not a function.");
            // Optionally, you might handle navigation here if logout is critical
        }
        
        if (isSidebarActive) {
            toggleSidebar();
        }
    };

    return (
        <aside className={`desktop1-sidebar ${isSidebarActive ? 'active' : ''}`}> 
            
            {/* --- Close Button --- */}
            <div 
                className="desktop1-sidebar-close-toggle-area" 
                onClick={toggleSidebar}
                title="Close Sidebar" 
            >
                <Menu size={24} className="sidebar-icon desktop1-close-icon" /> 
            </div>
            
            {/* Profile / Dashboard Item */}
            <div className="desktop1-sidebar-item">
                <Link 
                    to={profileLink} 
                    onClick={isSidebarActive ? toggleSidebar : undefined}
                >
                    <UserCircle size={24} className="sidebar-icon" /> 
                    <span>{profileText}</span>
                </Link>
            </div>

            {/* Form Item (Registration Form) */}
            <div className="desktop1-sidebar-item">
                <Link to="/desktop1" onClick={isSidebarActive ? toggleSidebar : undefined}>
                    <FileText size={24} className="sidebar-icon" /> 
                    <span>Registration Form</span>
                </Link>
            </div>
            
            {/* Directory Item */}
            <div className="desktop1-sidebar-item">
                <Link to="/desktop2" onClick={isSidebarActive ? toggleSidebar : undefined}>
                    <FolderOpen size={24} className="sidebar-icon" /> 
                    <span>Directory</span>
                </Link>
            </div>
            
            {/* Settings Item */}
            <div className="desktop1-sidebar-item">
                <Link to="/settings" onClick={isSidebarActive ? toggleSidebar : undefined}>
                    <Settings size={24} className="sidebar-icon" /> 
                    <span>Settings</span>
                </Link>
            </div>

            {/* Logout Item */}
            <div className="desktop1-sidebar-item desktop1-logout-item">
                <div 
                    onClick={initiateLogout} // <-- Use the defensive helper function
                    className="desktop1-logout-button"
                >
                    <LogOut size={24} className="sidebar-icon" />
                    <span>Logout</span>
                </div>
            </div>
            
        </aside>
    );
};

export default Sidebar;