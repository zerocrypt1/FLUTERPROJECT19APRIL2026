// src/components/Admin/SuperAdminProfile.jsx (FINAL FIXED VERSION)
import React, { useState, useEffect, useCallback } from 'react'; // <-- Import useCallback
import { toast, Toaster } from 'react-hot-toast';
import { User, Settings, Loader, CheckCircle, XCircle, FolderOpen } from 'lucide-react';
import { useAuth } from '../AuthContext'; 
import profileAPI from '../../services/profileApi'; 
import './AdminStyles.css';

const SuperAdminProfile = () => {
    // --- STATE & AUTH ---
    const { user, hasRole, loading: authLoading } = useAuth();
    
    const [requests, setRequests] = useState([]);
    const [profileData, setProfileData] = useState(null);
    const [contentLoading, setContentLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');

    const isAdmin = hasRole('superadmin');
    const userId = user?.id; 

    // Destructure required states/setters for useCallback dependencies
    const setContentLoadingCallback = setContentLoading; 
    const setProfileDataCallback = setProfileData;
    const setRequestsCallback = setRequests;
    
    // --- DATA FETCHING (Wrapped in useCallback) ---
    const fetchDashboardData = useCallback(async () => {
        // Dependency check is moved here, since userId and isAdmin are dependencies of useCallback
        if (!isAdmin || !userId) {
            setContentLoadingCallback(false); 
            return;
        }

        try {
            let successCount = 0;
            
            // 1. Fetch own profile data
            const profileRes = await profileAPI.getProfile(userId);
            
            // Fix: setProfileData using profileRes directly (as corrected previously)
            if (profileRes && typeof profileRes === 'object') { 
                setProfileDataCallback(profileRes);
                successCount++;
            } else {
                toast.error("Profile data missing or invalid from API response.");
            }
            
            // 2. Fetch pending requests
            const requestsRes = await profileAPI.getPendingRequests();
            setRequestsCallback(requestsRes.requests || []);
            successCount++;

            if (successCount < 2) {
                 toast.error("One or more dashboard elements failed to load fully.");
            }

        } catch (error) {
            toast.error("Failed to load dashboard data. Check network and API logs.");
            console.error('Dashboard Fetch Error:', error);
        } finally {
            setContentLoadingCallback(false); 
        }
    }, [userId, isAdmin, setContentLoadingCallback, setProfileDataCallback, setRequestsCallback]); // <-- Added all external dependencies

    useEffect(() => {
        // Now 'fetchDashboardData' is a stable function, so we must include it here.
        if (!authLoading && userId) {
            fetchDashboardData();
        }
    }, [authLoading, userId, fetchDashboardData]); // <-- 'fetchDashboardData' is now a dependency

    // --- ACTION HANDLERS (useCallback recommended here too) ---
    const handleProcessRequest = useCallback(async (id, action) => {
        const loadingToast = toast.loading(`Processing ${action}...`);
        try {
            await profileAPI.processAdminRequest(id, action);
            toast.success(`Request ${action}ed successfully!`, { id: loadingToast });
            
            setRequestsCallback(prev => prev.filter(r => r._id !== id));
        } catch (error) {
            const errorMessage = error.response?.data?.message || `Failed to ${action} request.`;
            toast.error(errorMessage, { id: loadingToast });
            console.error(`Process request error: ${error}`);
        }
    }, [setRequestsCallback]); // Added setRequestsCallback dependency

    // --- LOADING/ERROR SCREENS (Same as before) ---
    if (authLoading || contentLoading) {
        return (
            <div className="admin-loading-screen">
                <Loader size={36} className="animate-spin" />
                <p>Loading Admin Dashboard...</p>
            </div>
        );
    }

    if (!isAdmin) {
        return <div className="admin-denied-screen">Access Denied. You are not a Super Admin.</div>;
    }

    // --- TAB CONTENT RENDERING (Same as before) ---
    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="profile-details-card admin-card">
                        <h3><User size={20} className="icon-mr" /> Your Profile Details</h3>
                        {profileData ? (
                            <>
                                <p><strong>Username:</strong> {profileData.username}</p>
                                <p><strong>Email:</strong> {profileData.email}</p>
                                <p><strong>Role:</strong> {profileData.role}</p>
                                <p><strong>Last Login:</strong> {profileData.lastLogin ? new Date(profileData.lastLogin).toLocaleString() : 'N/A'}</p>
                            </>
                        ) : (
                            <div className="empty-state">Failed to load personal profile data.</div>
                        )}
                    </div>
                );
            case 'settings':
                return (
                    <div className="settings-panel admin-card">
                        <h3><Settings size={20} className="icon-mr" /> System Settings</h3>
                        <p>Configuration panel for global application settings.</p>
                        <button className="settings-btn">View System Log</button>
                    </div>
                );
            case 'approvals':
                return (
                    <div className="approvals-list-panel admin-card">
                        <h3><FolderOpen size={20} className="icon-mr" /> Pending Admin Approvals</h3>
                        {requests.length === 0 ? (
                            <div className="empty-state">No pending admin requests at this time.</div>
                        ) : (
                            requests.map(req => (
                                <div key={req._id} className="request-card">
                                    <p className="request-info"><strong>User:</strong> {req.username} (<em>{req.email}</em>)</p>
                                    <div className="request-actions">
                                        <button 
                                            onClick={() => handleProcessRequest(req._id, 'approve')} 
                                            className="approve-btn"
                                        >
                                            <CheckCircle size={16} /> Approve
                                        </button>
                                        <button 
                                            onClick={() => handleProcessRequest(req._id, 'reject')} 
                                            className="reject-btn"
                                        >
                                            <XCircle size={16} /> Reject
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="superadmin-page">
            <Toaster />
            <h1>Super Admin Control Panel</h1>
            <div className="tab-navigation">
                <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'active' : ''}>Profile</button>
                <button onClick={() => setActiveTab('approvals')} className={activeTab === 'approvals' ? 'active' : ''}>Approvals ({requests.length})</button>
                <button onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'active' : ''}>Settings</button>
            </div>

            <div className="content-area">
                {renderContent()}
            </div>
        </div>
    );
};

export default SuperAdminProfile;