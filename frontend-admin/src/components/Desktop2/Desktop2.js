// src/components/Desktop2/Desktop2.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast, Toaster } from "react-hot-toast";
import Fuse from 'fuse.js';

// Icon Imports
import { CgSpinner } from "react-icons/cg";
import { Menu, Search, RefreshCw, UserCircle, Edit, Trash2, Eye, Check } from 'lucide-react'; 

// API & Context Imports
import directoryAPI from '../../services/directoryApi';
import { useAuth } from '../AuthContext';

// Import Shared Components
import Sidebar from '../Form/Sidebar'; 

// Import CSS
import './Desktop2.css';

function Desktop2() {
  const [forms, setForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarActive, setIsSidebarActive] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasRole } = useAuth(); 

  const initialLoadRef = useRef(false);

  const profileLink = '/admin-controller'; 

  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const response = await directoryAPI.fetchForms(); 
      
      if (response.success) {
        setForms(response.data);
        setFilteredForms(response.data);
        toast.success('Directory loaded successfully!');
      } else {
        toast.error(response.message || 'Failed to load directory.');
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to load directory. Please check network and permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialLoadRef.current) {
        fetchForms();
        initialLoadRef.current = true;
    }
  }, []);

  const fuseOptions = {
    keys: ['name', 'occupation', 'phoneNumber', 'address', 'city', 'state'],
    includeScore: false,
    threshold: 0.3,
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query === '') {
      setFilteredForms(forms);
    } else {
      const fuse = new Fuse(forms, fuseOptions);
      const results = fuse.search(query);
      setFilteredForms(results.map(result => result.item));
    }
  };

  const handleRefresh = () => {
    fetchForms();
  };

  const handleAddNew = () => {
    navigate('/desktop1'); 
  };

  const handleLogout = () => {
    logout(); 
    toast.success('Logged out successfully!');
  };

  // ✅ FIXED: Only pass the ID, not the entire form object
  const editForm = (formId) => {
    console.log('🔧 Editing form with ID:', formId);
    navigate(`/desktop3?id=${formId}`); 
  };

  const viewForm = (formId) => {
    navigate(`/view/${formId}`); 
  };

  const deleteForm = async (formId) => {
    const confirmed = window.confirm("Are you sure you want to delete this form?");
    if (!confirmed) return;

    try {
      await directoryAPI.deleteForm(formId); 
      toast.success('Form deleted successfully!');
      fetchForms(); 
    } catch (error) {
      console.error('Error deleting form:', error);
      toast.error('Failed to delete form. Check permissions.');
    }
  };

  const toggleSidebar = () => {
    setIsSidebarActive(!isSidebarActive);
  };

  return (
    <div className="desktop2-container">
      <Toaster toastOptions={{ duration: 4000 }} />
      
      {/* --- Sidebar --- */}
      <Sidebar 
          isSidebarActive={isSidebarActive} 
          userRole={user?.role} 
          handleLogout={handleLogout} 
          toggleSidebar={toggleSidebar}
      />

      <div className={`desktop2-main-content ${isSidebarActive ? 'sidebar-shift' : ''}`}>
        <header className="desktop2-topbar">
          <Menu 
            size={24}
            className="desktop2-hamburger-icon" 
            onClick={toggleSidebar}
          />
          <div className="desktop2-search-bar">
            <Search size={20} className="desktop2-search-icon" />
            <input
              type="text"
              placeholder="Search by name, occupation, phone..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button 
              className="desktop2-add-button" 
              onClick={handleAddNew}
              title="Add New Employee"
            >
              +
            </button>
          </div>
          <div className="desktop2-user-info">
            {user && (
              <Link to={profileLink} title="Go to Profile/Dashboard"> 
                <UserCircle size={28} className="desktop2-profile-icon" />
              </Link>
            )}
            <span className="desktop2-username">{user?.username || user?.email || 'Admin'}</span>
          </div>
        </header>

        <div className="desktop2-content">
          <div className="desktop2-header-container">
            <h2 className="desktop2-header">Employee Directory</h2>
            <div className="desktop2-header-actions">
              <button 
                className="desktop2-refresh-button" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? <CgSpinner size={16} className="animate-spin mr-1" /> : <RefreshCw size={16} className="mr-1" />}
                Refresh
              </button>
            </div>
          </div>

          <div className="desktop2-directory">
            {isLoading ? (
              <div className="desktop2-loading">
                <CgSpinner size={32} className="animate-spin" />
                <p>Loading directory...</p>
              </div>
            ) : filteredForms.length > 0 ? (
              filteredForms.map((form) => (
                <div className="desktop2-card" key={form._id}>
                  <div className="desktop2-card-header">
                    <h3 
                      onClick={() => viewForm(form._id)}
                      title="View details"
                    >
                      {form.name}
                      {form.blueTicket && (
                        <span className="desktop2-verified-badge">
                          <Check size={14} /> Verified
                        </span>
                      )}
                    </h3>
                    <div className="desktop2-card-buttons">
                      <button 
                        className="desktop2-view-button" 
                        onClick={() => viewForm(form._id)}
                        title="View Full Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="desktop2-edit-button" 
                        onClick={() => editForm(form._id)}
                        title="Edit form"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="desktop2-delete-button" 
                        onClick={() => deleteForm(form._id)}
                        title="Delete form"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="desktop2-card-details">
                    {/* Display details */}
                    <DetailItem label="Occupation" value={form.occupation} />
                    <DetailItem label="Phone" value={form.phoneNumber} />
                    {form.age && <DetailItem label="Age" value={form.age} />}
                    
                    {form.city && (
                      <DetailItem label="Location" value={`${form.city}${form.state ? `, ${form.state}` : ''}`} />
                    )}
                    
                    {form.timming && Array.isArray(form.timming) && form.timming.length > 0 && (
                      <div className="desktop2-card-detail desktop2-time-slots">
                        <span className="desktop2-detail-label">Available:</span>
                        <div className="desktop2-time-slots-container">
                          {form.timming.slice(0, 2).map((slot, index) => (
                            <span key={index} className="desktop2-time-slot">{slot}</span>
                          ))}
                          {form.timming.length > 2 && (
                            <span className="desktop2-time-slot desktop2-more-slots">
                              +{form.timming.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="desktop2-no-results">
                {searchQuery ? (
                  <>
                    <p>No results found for "{searchQuery}"</p>
                    <button onClick={() => setSearchQuery('')} className="desktop2-clear-search">
                      Clear Search
                    </button>
                  </>
                ) : (
                  <p>No forms available. Click the + button or Refresh to load data.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Helper Component for Details
const DetailItem = ({ label, value }) => (
    <div className="desktop2-card-detail">
      <span className="desktop2-detail-label">{label}:</span>
      <span className="desktop2-detail-value">{value}</span>
    </div>
);

export default Desktop2;