import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import PhoneInput from 'react-phone-input-2';
import Select from 'react-select';
import { CgSpinner } from "react-icons/cg";
import { toast, Toaster } from "react-hot-toast";
import { Menu } from 'lucide-react'; // Import Menu icon for the topbar

import "react-phone-input-2/lib/style.css";

// Import GoogleMapAPI component
import GoogleMapAPI from '../../components/Desktop1/GoogleMapAPI';

// Import Shared Components
import Sidebar from '../Form/Sidebar'; // <<-- IMPORT SHARED SIDEBAR
import { useAuth } from '../AuthContext'; // To get logout handler

// Import CSS
import '../Desktop1/Desktop1.css'; // Use base desktop styles
import './Desktop3.css'; // Add new styles specific to the edit form

// Helpers (Assume formHelpers.js exists and exports these)
// NOTE: I am recreating these locally since formHelpers.js was not provided.
const validateIdProofNumber = (idType, idNumber) => {
    if (!idNumber) return true;
    switch (idType) {
      case 'aadhaar': return /^\d{12}$/.test(idNumber);
      case 'pan': return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(idNumber);
      case 'voter': return /^[A-Z]{3}[0-9]{7}$/.test(idNumber);
      case 'driving': return /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/.test(idNumber);
      case 'passport': return /^[A-Z]{1}[0-9]{7}$/.test(idNumber);
      default: return true;
    }
};

const getIdProofFormatHint = (idType) => {
    switch (idType) {
      case 'aadhaar': return "Format: 12 digits (e.g., 123456789012)";
      case 'pan': return "Format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)";
      case 'voter': return "Format: 3 letters followed by 7 digits (e.g., ABC1234567)";
      case 'driving': return "Format: 2 letters, 2 digits, 2 letters, 4 digits (e.g., DL01AB1234)";
      case 'passport': return "Format: 1 letter followed by 7 digits (e.g., A1234567)";
      default: return "";
    }
};

const getIdProofMaxLength = (idType) => {
    switch (idType) {
      case 'aadhaar': return 12;
      case 'pan': return 10;
      case 'voter': return 10;
      case 'driving': return 10; // Placeholder max length
      case 'passport': return 8; // Placeholder max length
      default: return 50;
    }
};
const occupationOptions = [
    { value: "Backend Developer", label: "Backend Developer" },
    { value: "Web Developer", label: "Web Developer" },
    { value: "Frontend Developer", label: "Frontend Developer" }, 
    { value: "Full Stack Developer", label: "Full Stack Developer" },
    { value: "UI/UX Designer", label: "UI/UX Designer" },
    { value: "Other", label: "Other" }
];
const idProofOptions = [
    { value: "aadhaar", label: "Aadhaar Card" },
    { value: "pan", label: "PAN Card" },
    { value: "voter", label: "Voter ID" },
    { value: "driving", label: "Driving License" },
    { value: "passport", label: "Passport" },
];
// END Helpers

// Access environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5050';
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;


function Desktop3() {
  const [formData, setFormData] = useState({
    name: '', occupation: [], phoneNumber: '', identityProof: '', landmarks: '', age: '',
    state: '', address: '', timming: [], altPhoneNumber: '', idProofNumber: '',
    blueTicket: false, pinCode: '', city: '', coordinates: {},
  });
  
  const [originalPhoneNumber, setOriginalPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarActive, setIsSidebarActive] = useState(false);
  // const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false); // REMOVED
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [showManualCoordinates, setShowManualCoordinates] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [idNumberError, setIdNumberError] = useState('');
  const [formId, setFormId] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const [otpVerified, setOtpVerified] = useState(true); // Assume verified for EDIT page
  const { user, logout } = useAuth(); // Get user and logout for sidebar

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key is missing in environment variables");
      toast.error("Map functionality limited due to missing API key");
    }
    
    if (location.search) {
      const params = new URLSearchParams(location.search);
      
      if (params.get('_id')) {
        setFormId(params.get('_id'));
      }
      
      const initialData = {
        name: params.get('name') || '',
        phoneNumber: params.get('phoneNumber') || '',
        landmarks: params.get('landmarks') || '',
        age: params.get('age') || '',
        state: params.get('state') || '',
        address: params.get('address') || '',
        altPhoneNumber: params.get('altPhoneNumber') || '',
        idProofNumber: params.get('idProofNumber') || '',
        blueTicket: params.get('blueTicket') === 'true',
        pinCode: params.get('pinCode') || '',
        city: params.get('city') || '',
        identityProof: params.get('identityProof') || '',
      };
      
      setOriginalPhoneNumber(initialData.phoneNumber);
      
      const occupationStr = params.get('occupation') || '';
      initialData.occupation = occupationStr.split(', ').filter(item => item);
      
      try {
        const timmingEncoded = params.get('timming');
        if (timmingEncoded) {
          const timmingDecoded = decodeURIComponent(timmingEncoded);
          initialData.timming = JSON.parse(timmingDecoded) || [];
        } else {
          initialData.timming = [];
        }
      } catch (error) {
        initialData.timming = [];
      }
      
      try {
        const coordinatesEncoded = params.get('coordinates');
        if (coordinatesEncoded) {
          const coordinatesDecoded = decodeURIComponent(coordinatesEncoded);
          initialData.coordinates = JSON.parse(coordinatesDecoded) || {};
          
          if (initialData.coordinates.lat && initialData.coordinates.lng) {
            setManualLat(initialData.coordinates.lat.toString());
            setManualLng(initialData.coordinates.lng.toString());
          }
        } else {
          initialData.coordinates = {};
        }
      } catch (error) {
        initialData.coordinates = {};
      }
      
      setFormData(initialData);
    }
  }, [location.search]);


  const handleTimingChange = (event) => {
    const timeSlot = event.target.value;

    setFormData((prevFormData) => {
      const { timming } = prevFormData;
      if (timming.includes(timeSlot)) {
        return {
          ...prevFormData,
          timming: timming.filter((slot) => slot !== timeSlot),
        };
      } else {
        return {
          ...prevFormData,
          timming: [...timming, timeSlot],
        };
      }
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'idProofNumber') {
      const maxLength = getIdProofMaxLength(formData.identityProof);
      const trimmedValue = value.length > maxLength ? value.slice(0, maxLength) : value; 

      const isValid = validateIdProofNumber(formData.identityProof, trimmedValue);
      setIdNumberError(!isValid && trimmedValue ? 'Invalid format for the selected ID type' : '');
      
      setFormData(p => ({ ...p, [name]: trimmedValue }));
      return;
    }
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleIdProofChange = (selectedOption) => {
    setFormData({
      ...formData,
      identityProof: selectedOption ? selectedOption.value : '',
      idProofNumber: '' // Reset ID number when type changes
    });
    setIdNumberError(''); // Clear any previous errors
  };

  const handleOccupationChange = (selectedOptions) => {
    setFormData({
      ...formData,
      occupation: selectedOptions ? selectedOptions.map(option => option.value) : []
    });
  };

  const handlePhoneChange = (value) => {
    setFormData({
      ...formData,
      phoneNumber: value,
    });
  };

  const searchLandmarks = () => {
    if (!formData.landmarks) {
      toast.error("Please enter a landmark to search");
      return;
    }
    
    if (!GOOGLE_MAPS_API_KEY) {
      toast.error("Google Maps API key is missing. Location search is disabled.");
      return;
    }
    
    setSearchingLocations(true);
    setLocationResults([]);
    
    axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
      params: {
        address: formData.landmarks,
        sensor: true,
        key: GOOGLE_MAPS_API_KEY
      }
    })
      .then((res) => {
        if (res.data.results && res.data.results.length > 0) {
          const sortedResults = res.data.results;
          setLocationResults(sortedResults);
          toast.success(`Found ${sortedResults.length} locations!`);
        } else {
          toast.error("No locations found. Please try a different landmark.");
        }
        setSearchingLocations(false);
      })
      .catch((err) => {
        console.log(err);
        toast.error("Error finding locations.");
        setSearchingLocations(false);
      });
  };
  
  const selectLocation = (location) => {
    setFormData({
      ...formData,
      coordinates: location.geometry.location,
      landmarks: location.formatted_address,
    });
    toast.success("Location selected!");
    setShowManualCoordinates(false);
  };
  
  const toggleMapVisibility = () => {
    if (!GOOGLE_MAPS_API_KEY) {
      toast.error("Google Maps API key is missing. Map functionality is disabled.");
      return;
    }
    setShowMap(!showMap);
  };
  
  const handleLocationSelect = (locationData) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      coordinates: locationData.coordinates,
      landmarks: locationData.landmarks,
    }));
    
    if (locationData.place_details && locationData.place_details.address_components) {
      const addressComponents = locationData.place_details.address_components;
      const extractComponent = (types) => addressComponents.find(c => types.some(t => c.types.includes(t)))?.long_name || '';
      
      setFormData(prevFormData => ({
          ...prevFormData,
          city: extractComponent(['locality', 'administrative_area_level_2']),
          state: extractComponent(['administrative_area_level_1']),
          pinCode: extractComponent(['postal_code']),
          address: locationData.place_details.formatted_address || prevFormData.address,
      }));
    }
    
    setShowMap(false);
    toast.success("Location selected successfully!");
  };
  
  const toggleManualCoordinates = () => {
    setShowManualCoordinates(!showManualCoordinates);
  };
  
  const handleManualLatChange = (e) => {
    setManualLat(e.target.value);
  };
  
  const handleManualLngChange = (e) => {
    setManualLng(e.target.value);
  };
  
  const addManualLocation = () => {
    if (!manualLat || !manualLng || isNaN(manualLat) || isNaN(manualLng)) {
      toast.error("Please enter valid coordinates");
      return;
    }
    
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Coordinates out of valid range");
      return;
    }
    
    setFormData({
      ...formData,
      coordinates: {
        lat: lat,
        lng: lng
      }
    });
    
    // Only attempt reverse geocoding if API key is available
    if (GOOGLE_MAPS_API_KEY) {
      axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
        params: {
          latlng: `${lat},${lng}`,
          key: GOOGLE_MAPS_API_KEY
        }
      })
        .then((res) => {
          if (res.data.results && res.data.results.length > 0) {
            setFormData(prevData => ({
              ...prevData,
              landmarks: res.data.results[0].formatted_address
            }));
          }
        })
        .catch(err => {
          console.log("Reverse geocoding error:", err);
        });
    }
    
    toast.success("Manual coordinates added!");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || formData.occupation.length === 0 || !formData.phoneNumber || !formData.age || formData.timming.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }
    
    if (formData.identityProof && formData.idProofNumber) {
      const isValid = validateIdProofNumber(formData.identityProof, formData.idProofNumber);
      if (!isValid) {
        toast.error(`Invalid ${formData.identityProof} format. Please check and try again.`);
        return;
      }
    }
    
    const submissionData = {
      ...formData,
      occupation: formData.occupation.join(', ')
    };
    
    if (!formId) {
      toast.error("Form ID not found. Cannot update.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/forms/${formId}`, submissionData);

      if (response.data.success) {
        toast.success('Form updated successfully!');
        setTimeout(() => {
          navigate('/desktop2');
        }, 1500);
      } else {
        toast.error(response.data.error || 'Error updating form.');
      }
    } catch (error) {
      console.error('Error updating form:', error);
      
      if (error.response) {
        if (error.response.status === 409) {
          toast.error('This phone number is already registered with another employee');
        } else {
          toast.error(error.response.data.error || 'Failed to update. Please try again.');
        }
      } else {
        toast.error('Connection error. Please check your internet and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/desktop2');
  };

  const toggleSidebar = () => {
    setIsSidebarActive(!isSidebarActive);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully!');
  };

  const removeTimeSlot = (slot) => {
    setFormData({
      ...formData,
      timming: formData.timming.filter(item => item !== slot)
    });
  };

  return (
    <div className="desktop1-container desktop3-container">
      <Toaster toastOptions={{ duration: 4000 }} />
      
      {/* --- Shared Sidebar --- */}
      <Sidebar 
          isSidebarActive={isSidebarActive} 
          userRole={user?.role} 
          handleLogout={handleLogout} 
          toggleSidebar={toggleSidebar}
      />
      {/* --- Main Content with Shift Class --- */}
      <div className={`desktop1-main-content ${isSidebarActive ? 'sidebar-shift' : ''}`}>
        <header className="desktop1-topbar desktop3-topbar">
          <Menu // Using Lucide Menu icon for consistency
            size={24}
            className="desktop1-hamburger-icon" 
            onClick={toggleSidebar}
          />
          <h2 className="desktop3-title">Edit Employee Information</h2>
          <div className="desktop3-right-actions">
            <button 
              onClick={handleCancel}
              className="desktop3-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </header>

        {/* --- Form Content Area --- */}
        <div className="desktop1-form-section">
          <form className="desktop1-user-form employee-form" onSubmit={handleSubmit}>
            <div className="form-grid"> {/* Adopt form-grid class from EmployeeForm */}
              
              {/* --- LEFT COLUMN: Personal Info & Verification --- */}
              <div className="form-column"> {/* Adopt form-column class from EmployeeForm */}
                
                {/* Name Input */}
                <div className="form-group">
                  <label>Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="Enter Name" 
                    required 
                  />
                </div>

                {/* Occupation Select */}
                <div className="form-group">
                  <label>Occupation <span className="required">*</span></label>
                  <Select 
                    isMulti
                    name="occupation"
                    options={occupationOptions}
                    classNamePrefix="react-select"
                    onChange={handleOccupationChange}
                    placeholder="Select Occupations"
                    value={occupationOptions.filter(option => 
                      formData.occupation.includes(option.value)
                    )}
                  />
                </div>

                {/* ID Card Type Select */}
                <div className="form-group">
                  <label>ID Card Type</label>
                  <Select
                    name="identityProof"
                    options={idProofOptions}
                    classNamePrefix="react-select"
                    onChange={handleIdProofChange}
                    placeholder="Select ID Type"
                    value={formData.identityProof ? idProofOptions.find(option => option.value === formData.identityProof) : null}
                  />
                </div>

                {/* ID Number Input (Conditional) */}
                {formData.identityProof && (
                  <div className="form-group">
                    <label>ID Number</label>
                    <input
                      type="text"
                      name="idProofNumber"
                      value={formData.idProofNumber}
                      onChange={handleChange}
                      placeholder={`Enter ID Number`}
                      maxLength={getIdProofMaxLength(formData.identityProof)}
                    />
                    {idNumberError && (
                      <div className="error-message">
                        {idNumberError}
                      </div>
                    )}
                    <div className="format-hint">
                      {getIdProofFormatHint(formData.identityProof)}
                    </div>
                  </div>
                )}
                
                {/* Phone Number (Edit Form - simplified verification notice) */}
                <div className="form-group">
                  <label>Phone Number <span className="required">*</span></label>
                  <PhoneInput 
                    country={"in"} 
                    value={formData.phoneNumber} 
                    onChange={(value) => handlePhoneChange(value)} 
                    inputProps={{
                      name: "phoneNumber",
                      required: true,
                    }}
                  />
                  <div className="desktop3-phone-note">
                    {formData.phoneNumber !== originalPhoneNumber ? (
                      <span className="desktop3-warning">
                        ⚠️ Phone number changed. Re-verification needed.
                      </span>
                    ) : (
                      <span className="desktop3-verified">
                        ✓ Phone number verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Age Input */}
                <div className="form-group">
                  <label>Age <span className="required">*</span></label>
                  <input 
                    type="number" 
                    name="age" 
                    value={formData.age} 
                    onChange={handleChange} 
                    placeholder="Enter employee age" 
                    min="18"
                    max="80"
                    required 
                  />
                </div>
              </div>
              
              {/* --- RIGHT COLUMN: Location & Timing --- */}
              <div className="form-column"> {/* Adopt form-column class from EmployeeForm */}
                
                {/* Landmark Search Section */}
                <div className="form-group form-group-landmark">
                  <label>Landmarks <span className="required">*</span></label>
                  <div className="search-input-wrapper">
                    <input 
                      type="text" 
                      name="landmarks" 
                      value={formData.landmarks} 
                      onChange={handleChange} 
                      placeholder="Search desired work locations" 
                      required
                    />
                    {/* Assuming searchIcon is not needed if the button is present */}
                  </div>
                  
                  {/* Location Action Buttons */}
                  <div className="location-actions"> {/* Use class from EmployeeForm */}
                    <button 
                      type="button" 
                      onClick={searchLandmarks}
                      className="btn btn-search btn-primary" // Use class from EmployeeForm
                      disabled={searchingLocations}
                    >
                      {searchingLocations ? <CgSpinner size={16} className="animate-spin mr-1" /> : 'Search Locations'}
                    </button>
                    <button 
                      type="button" 
                      onClick={toggleManualCoordinates}
                      className="btn btn-secondary" // Use class from EmployeeForm
                    >
                      {showManualCoordinates ? 'Hide Manual Entry' : 'Enter Precise Coordinates'}
                    </button>
                    <button 
                      type="button" 
                      onClick={toggleMapVisibility}
                      className="btn btn-map" // Use class from EmployeeForm
                    >
                      {showMap ? 'Hide Map' : 'Select on Map'}
                    </button>
                  </div>
                  
                  {/* Google Map Component */}
                  {showMap && (
                    <div className="map-wrapper"> {/* Use class from EmployeeForm */}
                      <h4>Select Location on Map</h4>
                      <GoogleMapAPI 
                        onLocationSelect={handleLocationSelect} 
                        initialCoordinates={formData.coordinates.lat && formData.coordinates.lng ? formData.coordinates : null}
                        apiKey={GOOGLE_MAPS_API_KEY}
                      />
                    </div>
                  )}
                  
                  {/* Manual coordinates input */}
                  {showManualCoordinates && (
                    <div className="manual-coordinates"> {/* Use class from EmployeeForm */}
                      <h4>Enter Precise GPS Coordinates</h4>
                      <div className="coordinate-inputs"> {/* Use class from EmployeeForm */}
                        <input 
                          type="text" 
                          value={manualLat} 
                          onChange={handleManualLatChange}
                          placeholder="Latitude (e.g. 28.6139)" 
                        />
                        <input 
                          type="text" 
                          value={manualLng} 
                          onChange={handleManualLngChange}
                          placeholder="Longitude (e.g. 77.2090)" 
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={addManualLocation}
                        className="btn btn-map" // Use class from EmployeeForm
                      >
                        Set Precise Location
                      </button>
                    </div>
                  )}
                  
                  {/* Display search results (for API geocode) */}
                  {locationResults.length > 0 && (
                    <ul className="location-results-list">
                      {locationResults.map((location, index) => (
                        <li key={index} onClick={() => selectLocation(location)}>
                            <strong>{location.formatted_address}</strong> 
                            <span>({location.geometry.location.lat.toFixed(4)}, {location.geometry.location.lng.toFixed(4)})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {formData.coordinates.lat && (
                    <div className="selected-location-display"> {/* Use class from EmployeeForm */}
                      <strong>Selected Location:</strong><br/>
                      {formData.landmarks}<br/>
                      <strong>Coordinates:</strong> {formData.coordinates.lat.toFixed(6)}, {formData.coordinates.lng.toFixed(6)}
                    </div>
                  )}
                </div>

                {/* Address Fields */}
                <div className="form-group"><label>Address</label><input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Enter address" /></div>
                <div className="form-group-inline">
                  <div className="form-group"><label>Pin Code</label><input type="text" name="pinCode" value={formData.pinCode} onChange={handleChange} placeholder="Enter pin code" /></div>
                  <div className="form-group"><label>City</label><input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Enter city" /></div>
                </div>
                <div className="form-group"><label>State</label><input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="Enter state" /></div>


                {/* Timing Selection (FIXED: Always Visible Slot List) */}
                <div className="form-group">
                  <label>Timing <span className="required">*</span></label>
                  
                  <ul className="time-slot-checklist"> {/* Use class from EmployeeForm */}
                      {[...Array(24)].map((_, i) => {
                        const hour = i;
                        const nextHour = (i + 1) % 24;
                        const timeFormat = (h) => h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;
                        const timeSlot = `${timeFormat(hour)} - ${timeFormat(nextHour)}`;
                        
                        return (
                          <li key={i}>
                            <div className="form-check">
                              <input 
                                className="form-check-input" 
                                type="checkbox" 
                                id={`slot${i}-edit`} 
                                value={timeSlot} 
                                onChange={handleTimingChange}
                                checked={formData.timming.includes(timeSlot)}
                              />
                              <label className="form-check-label" htmlFor={`slot${i}-edit`}>
                                {timeSlot}
                              </label>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                  
                  {formData.timming.length > 0 && (
                    <div className="selected-slots"> {/* Use class from EmployeeForm */}
                      {formData.timming.map((slot, index) => (
                        <div key={index} className="time-slot-tag">
                          {slot}
                          <button 
                            type="button" 
                            className="remove-slot" 
                            onClick={() => removeTimeSlot(slot)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Verification Status */}
                <div className="form-group">
                  <label>Verification Status</label>
                  <div className="toggle-group"> {/* Use class from EmployeeForm */}
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        name="blueTicket" 
                        checked={formData.blueTicket} 
                        onChange={handleChange}
                        disabled={!otpVerified} // Assuming phone is verified for edit form
                      />
                      <span className="slider"></span>
                    </label>
                    <span className="verification-text">{formData.blueTicket ? 'Verified' : 'Not verified'}</span>
                    {otpVerified && !formData.blueTicket && (
                      <span className="verification-hint">
                        (Phone verified, click to enable blue tick)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-footer"> {/* Use class from EmployeeForm */}
              <button 
                type="submit" 
                className="btn btn-save"
                disabled={loading}
              >
                {loading ? (
                  <CgSpinner size={20} className="animate-spin" />
                ) : 'Save Information'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Desktop3;