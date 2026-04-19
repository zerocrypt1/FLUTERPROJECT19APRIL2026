import React, { useEffect, useState, useRef } from 'react'; // <-- IMPORT useRef
import { useParams, useNavigate } from 'react-router-dom';
import { Menu, Loader, Check } from 'lucide-react'; // Added Check for potential badge
import { Toaster, toast } from 'react-hot-toast'; 

// Import API Service
import applicantAPI from '../../services/applicantApi'; 

// Import Shared Components & Context
import Sidebar from '../Form/Sidebar'; 
import { useAuth } from '../AuthContext'; 

// Import CSS
import './ViewApplicant.css';
import '../Desktop1/Desktop1.css'; 

function ViewApplicant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth(); 
  
  const [applicant, setApplicant] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSidebarActive, setIsSidebarActive] = useState(false); 

  // --- FIX 1: Use useRef to track if the initial load has been initiated ---
  const initialLoadRef = useRef(false);
  // --------------------------------------------------------------------------

  // --- Handlers for Sidebar ---
  const toggleSidebar = () => {
    setIsSidebarActive(!isSidebarActive);
  };
  
  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully!');
  };

  // --- Data Fetching using API Service ---
  const fetchApplicant = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await applicantAPI.fetchApplicant(id);

      if (response.success) {
        setApplicant(response.data);
        toast.success("Applicant data loaded.");
      } else {
        setError(response.message);
        toast.error(response.message);
      }
    } catch (err) {
      console.error('Error fetching applicant:', err);
      const message = err.message || 'An error occurred while retrieving applicant data.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // --- FIX 2: Conditionally call fetchApplicant() using the ref ---
    // This prevents the double execution caused by React Strict Mode.
    if (!initialLoadRef.current) {
        fetchApplicant();
        initialLoadRef.current = true;
    }
    // We only include 'id' here to re-run the fetch when navigating between different applicants (i.e., id changes).
    // The ref handles the initial double-run protection.
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  const formatFieldName = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  const renderFieldValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return <span className="viewapplicant-empty-value">Not provided</span>;
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (Array.isArray(value)) {
        if (value.length === 0) return <span className="viewapplicant-empty-value">None selected</span>;
        return (
            <div className="viewapplicant-array-list">
                {value.map((item, index) => (
                    <span key={index} className="viewapplicant-tag">
                        {item}
                    </span>
                ))}
            </div>
        );
    }

    if (typeof value === 'object' && value !== null) {
        if (value.lat && value.lng) {
            return `Lat: ${value.lat.toFixed(6)}, Lng: ${value.lng.toFixed(6)}`;
        }
        
        return (
            <pre className="viewapplicant-object-value">
                {JSON.stringify(value, null, 2)}
            </pre>
        );
    }
    
    return value;
  };

  const hiddenFields = ['_id', '__v', 'password', 'createdAt', 'updatedAt']; 

  return (
    <div className="desktop1-container"> 
      <Toaster />
      
      {/* --- Shared Sidebar --- */}
      <Sidebar 
          isSidebarActive={isSidebarActive} 
          userRole={user?.role} 
          handleLogout={handleLogout} 
          toggleSidebar={toggleSidebar}
      />

      {/* --- Main Content --- */}
      <div className={`desktop1-main-content ${isSidebarActive ? 'sidebar-shift' : ''}`}>
        
        <header className="desktop1-topbar viewapplicant-topbar">
          <Menu 
            size={24}
            className="desktop1-hamburger-icon" 
            onClick={toggleSidebar}
          />
          <h2 className="viewapplicant-page-title">Applicant Details</h2>
          <button className="viewapplicant-back-button top-right" onClick={handleBack}>
            ← Back to List
          </button>
        </header>

        <div className="viewapplicant-content-wrapper">
            
            {/* Loading State */}
            {isLoading && (
              <div className="viewapplicant-loading-container">
                <div className="viewapplicant-loading">
                  <Loader size={32} className="animate-spin" />
                  <p>Loading applicant data...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="viewapplicant-error-container">
                <div className="viewapplicant-error">
                  <h3>Error</h3>
                  <p>{error}</p>
                  <button className="viewapplicant-button" onClick={fetchApplicant}>
                    Retry
                  </button>
                  <button className="viewapplicant-button secondary" onClick={handleBack}>
                    Go Back
                  </button>
                </div>
              </div>
            )}

            {/* Applicant Data View */}
            {applicant && !isLoading && !error && (
              <div className="viewapplicant-card">
                <h1 className="viewapplicant-applicant-name">
                    {applicant.name}
                    {applicant.blueTicket && (
                        <span className="viewapplicant-verified-badge">
                            <Check size={14} className="mr-1" /> Verified
                        </span>
                    )}
                </h1>

                <div className="viewapplicant-data-grid">
                  {Object.entries(applicant)
                    .filter(([key]) => !hiddenFields.includes(key))
                    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
                    .map(([key, value]) => (
                      <div className="viewapplicant-field" key={key}>
                        <div className="viewapplicant-field-label">
                          {formatFieldName(key)}:
                        </div>
                        <div className="viewapplicant-field-value">
                          {renderFieldValue(value)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default ViewApplicant;