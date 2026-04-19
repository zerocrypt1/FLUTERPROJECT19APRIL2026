// src/services/authApi.js
import axios from 'axios';

// Get the base URL from environment variables
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5050';

// Assuming API_VERSION is 'v1' and the router is mounted at /api/v1/admin
const ADMIN_BASE_URL = `${API_URL}/api/v1/admin`; 

// --- Helper Functions ---

const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
    }
};

const getConfig = () => {
    const token = localStorage.getItem('token');
    return token ? {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    } : {};
};

// --- General User Auth (Redirected to Admin Endpoints for AuthForm) ---

const loginUser = async ({ username, password }) => {
    try {
        const response = await axios.post(`${ADMIN_BASE_URL}/login`, { username, password });
        
        if (response.data.token) {
            setAuthToken(response.data.token);
            // NOTE: Store full admin object as 'user' for AuthContext/frontend
            localStorage.setItem('userId', response.data.admin._id); 
            localStorage.setItem('adminRole', response.data.admin.role);
        }

        return {
            success: true,
            token: response.data.token,
            user: response.data.admin, 
            message: response.data.message
        };
    } catch (error) {
        throw error;
    }
};

const signupUser = async ({ username, email }) => {
    try {
        const response = await axios.post(`${ADMIN_BASE_URL}/signup`, { username, email });
        
        return {
            success: true,
            message: response.data.message,
        };
    } catch (error) {
        throw error;
    }
};

// --- Admin Management Functions (All definitions included) ---

const adminSignup = async (userData) => {
    const response = await axios.post(`${ADMIN_BASE_URL}/signup`, userData);
    return response.data;
};

const adminLogin = async (credentials) => {
    const response = await axios.post(`${ADMIN_BASE_URL}/login`, credentials);
    
    if (response.data.token) {
        setAuthToken(response.data.token);
        localStorage.setItem('userId', response.data.admin._id);
        localStorage.setItem('adminRole', response.data.admin.role);
    }
    return response.data;
};

// Protected Admin Routes
const getAllAdmins = async () => {
    // FIX: Full definition included here
    const response = await axios.get(`${ADMIN_BASE_URL}/list`, getConfig());
    return response.data;
};

const getAdmin = async (id) => {
    const response = await axios.get(`${ADMIN_BASE_URL}/${id}`, getConfig());
    return response.data;
};

// Super Admin Only Routes
const createAdmin = async (adminData) => {
    const response = await axios.post(`${ADMIN_BASE_URL}/create`, adminData, getConfig());
    return response.data;
};

const updateAdmin = async (id, adminData) => {
    const response = await axios.put(`${ADMIN_BASE_URL}/${id}`, adminData, getConfig());
    return response.data;
};

const deleteAdmin = async (id) => {
    const response = await axios.delete(`${ADMIN_BASE_URL}/${id}`, getConfig());
    return response.data;
};

// Change Password
const changePassword = async (id, passwordData) => {
    const response = await axios.put(`${ADMIN_BASE_URL}/${id}/password`, passwordData, getConfig());
    return response.data;
};

// Placeholder Admin Controller Logic 
const getPendingAdmins = async () => {
    const response = await axios.get(`${ADMIN_BASE_URL}/pending`, getConfig());
    return response.data;
};

const processAdminAction = async (id, action) => {
    const response = await axios.put(`${ADMIN_BASE_URL}/process/${id}`, { action }, getConfig());
    return response.data;
};

// --- Logout Utility ---
const logout = () => {
    setAuthToken(null);
    localStorage.removeItem('userId');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('user'); 
};

// --- FINAL EXPORTS (Must list ALL functions defined above) ---

export {
    setAuthToken,
    loginUser,
    signupUser,
    adminLogin,
    adminSignup,
    getAllAdmins,
    getAdmin,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    changePassword,
    getPendingAdmins,
    processAdminAction,
    logout
};