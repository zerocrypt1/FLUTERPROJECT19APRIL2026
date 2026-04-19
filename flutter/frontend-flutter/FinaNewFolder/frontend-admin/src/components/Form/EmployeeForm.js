// src/components/Form/EmployeeForm.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import OtpInput from "otp-input-react";
import { CgSpinner } from "react-icons/cg";
import { toast, Toaster } from "react-hot-toast";
import "react-phone-input-2/lib/style.css";
import Select from 'react-select';

// APIS (Placeholders - ensure these files exist in '../../services/')
import mapAPI from '../../services/mapApi';
import formAPI from '../../services/formApi';

// Components (Ensure GoogleMapAPI.jsx is available)
import GoogleMapAPI from '../Desktop1/GoogleMapAPI'; 

// Helpers and Assets
import { 
  validateIdProofNumber, 
  getIdProofFormatHint,
  getIdProofMaxLength,
  occupationOptions,
  idProofOptions
} from '../../utils/formHelpers';
import searchIcon from "../../assets/search.png"; 

// --- STYLES IMPORT ---
import './EmployeeForm.css'; 

// Environment variables 
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyAqYM_LPakaBotYeIb7m_spZf3m0ZQU2KI';

// --- GENDER OPTIONS DEFINITION ---
const genderOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
];

// State initialization for clarity
const initialFormData = {
  name: '', occupation: [], phoneNumber: '', identityProof: '', landmarks: '', age: '',
  gender: '',
  state: '', address: '', otpCode: '', timming: [], altPhoneNumber: '', idProofNumber: '',
  blueTicket: false, pinCode: '', city: '', coordinates: {},
};

function EmployeeForm({ isSidebarActive }) { 
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [showManualCoordinates, setShowManualCoordinates] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [idNumberError, setIdNumberError] = useState('');
  
  // --- Handlers ---
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
    
    // Handles all standard inputs and checkboxes
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleOccupationChange = (selectedOptions) => {
    setFormData(p => ({ ...p, occupation: selectedOptions ? selectedOptions.map(option => option.value) : [] }));
  };
  
  // HANDLER FOR GENDER SELECT
  const handleGenderChange = (selectedOption) => {
    setFormData(p => ({ ...p, gender: selectedOption ? selectedOption.value : '' }));
  };

  const handleIdProofChange = (selectedOption) => {
    setFormData(p => ({ ...p, identityProof: selectedOption ? selectedOption.value : '', idProofNumber: '' }));
    setIdNumberError('');
  };

  const handleTimingChange = (event) => {
    const timeSlot = event.target.value;
    setFormData((prevFormData) => {
      const { timming } = prevFormData;
      if (timming.includes(timeSlot)) {
        return { ...prevFormData, timming: timming.filter((slot) => slot !== timeSlot) };
      } else {
        return { ...prevFormData, timming: [...timming, timeSlot] };
      }
    });
  };

  const removeTimeSlot = (slot) => {
    setFormData(p => ({ ...p, timming: p.timming.filter(item => item !== slot) }));
  };
  
  const toggleMapVisibility = () => setShowMap(!showMap);
  const toggleManualCoordinates = () => setShowManualCoordinates(!showManualCoordinates);


  // --- API Handlers (Assuming correct backend API logic) ---
  const requestOtp = async (e) => {
    e.preventDefault();
    if (!formData.phoneNumber) { toast.error("Enter phone number."); return; }
    setLoading(true);
    try {
        await formAPI.requestOtp(formData.phoneNumber);
        toast.success("OTP request sent! Check your phone.");
    } catch (error) {
        toast.error("Failed to send OTP.");
    } finally {
        setLoading(false);
    }
  }

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (enteredOtp.length !== 6) { toast.error("Enter full 6-digit OTP."); return; }
    setLoading(true);
    try {
        const result = await formAPI.verifyOtp(formData.phoneNumber, enteredOtp);
        if (result.verified) {
            setOtpVerified(true);
            toast.success("Phone verified successfully!");
        } else {
            toast.error("Invalid OTP.");
        }
    } catch (error) {
        toast.error("OTP verification failed.");
    } finally {
        setLoading(false);
    }
  }

  const searchLandmarks = async (e) => {
    if (e && e.preventDefault) e.preventDefault(); 

    if (!formData.landmarks) { toast.error("Please enter a landmark to search"); return; }
    setSearchingLocations(true);
    setLocationResults([]);
    
    try {
        const results = await mapAPI.searchLocations(formData.landmarks);
        setLocationResults(results);
        toast.success(`Found ${results.length} locations!`);
    } catch (err) {
        toast.error(err.message || "Error finding locations.");
    } finally {
        setSearchingLocations(false);
    }
  };
  
  const selectLocation = (location) => {
    setFormData(p => ({
      ...p,
      coordinates: location.geometry.location,
      landmarks: location.formatted_address,
    }));
    toast.success("Location selected!");
    setShowManualCoordinates(false);
  };
  
  const handleLocationSelect = (locationData) => {
    setFormData(prevFormData => ({ ...prevFormData, coordinates: locationData.coordinates, landmarks: locationData.landmarks }));
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

  const addManualLocation = async () => {
    if (!manualLat || !manualLng || isNaN(manualLat) || isNaN(manualLng)) {
      toast.error("Please enter valid coordinates");
      return;
    }
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { toast.error("Coordinates out of valid range"); return; }
    
    setFormData(p => ({ ...p, coordinates: { lat, lng } }));

    try {
        const address = await mapAPI.reverseGeocode(lat, lng);
        setFormData(p => ({ ...p, landmarks: address }));
        toast.success("Manual coordinates added!");
    } catch (err) {
        toast.warn("Coordinates set, but failed to retrieve address.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation checks
    if (!formData.name || formData.occupation.length === 0 || !formData.phoneNumber || !formData.age || !formData.gender || formData.timming.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!otpVerified) { toast.error("Phone number must be verified."); return; }
    if (!formData.coordinates.lat) { toast.error("Location coordinates must be set."); return; }
    if (formData.identityProof && formData.idProofNumber && !validateIdProofNumber(formData.identityProof, formData.idProofNumber)) {
        toast.error(`Invalid ID format. Please check and try again.`);
        return;
    }
    
    const submissionData = { ...formData, occupation: formData.occupation.join(', ') };
    
    setLoading(true);
    try {
      const data = await formAPI.submitForm(submissionData);
      toast.success(data.message || 'Information stored successfully!');
      setFormData(initialFormData);
      setOtpVerified(false);
      setEnteredOtp("");
    } catch (error) {
      toast.error('Failed to save information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`form-container ${isSidebarActive ? 'sidebar-active' : ''}`}>
      <Toaster toastOptions={{ duration: 4000 }} />
      
      <div className="main-form-content">
        <div className="form-header">
          <h2>Employee Registration Form</h2>
        </div>
        
        <form className="employee-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* --- LEFT COLUMN: Personal Info & Verification --- */}
            <div className="form-column">
              
              {/* Name Input */}
              <div className="form-group">
                <label>Name <span className="required">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter Name" required />
              </div>

              {/* Occupation Select */}
              <div className="form-group">
                <label>Occupation <span className="required">*</span></label>
                <Select 
                  isMulti 
                  name="occupation" 
                  options={occupationOptions} 
                  onChange={handleOccupationChange} 
                  placeholder="Select Occupations" 
                  classNamePrefix="react-select"
                />
              </div>
              
              {/* ID Card Type Select */}
              <div className="form-group">
                <label>ID Card Type</label>
                <Select 
                  name="identityProof" 
                  options={idProofOptions} 
                  onChange={handleIdProofChange} 
                  placeholder="Select ID Type" 
                  classNamePrefix="react-select"
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
                  {idNumberError && (<div className="error-message">{idNumberError}</div>)}
                  <div className="format-hint">{getIdProofFormatHint(formData.identityProof)}</div>
                </div>
              )}

              {/* --- PHONE AND OTP SECTION (CATCHY MULTICOLOR) --- */}
              <div className="otp-verification-section"> 
                {/* Phone Input and OTP Request Button */}
                <div className="form-group" style={{marginBottom: 0}}>
                  <label>Phone Number <span className="required">*</span></label>
                  <PhoneInput 
                    country={"in"} 
                    value={formData.phoneNumber} 
                    onChange={(value) => setFormData(p => ({...p, phoneNumber: value}))} 
                    inputProps={{ name: "phoneNumber", required: true }} 
                  />
                  
                  <button
                    onClick={requestOtp}
                    type="button"
                    className="btn btn-otp-request"
                    disabled={!formData.phoneNumber || loading || otpVerified}
                  >
                    {loading && !otpVerified ? (<CgSpinner size={20} className="animate-spin" />) : <span>Send code via SMS</span>}
                  </button>
                </div>

                {/* OTP Verification Input and Verify Button */}
                <div className="form-group" style={{marginTop: '15px'}}>
                  <label>OTP Verification</label>
                  <OtpInput value={enteredOtp} onChange={setEnteredOtp} OTPLength={6} otpType="number" disabled={otpVerified} autoFocus className="otp-container" />
                  <button
                    onClick={verifyOtp}
                    type="button"
                    className="btn btn-otp-verify"
                    disabled={!enteredOtp || enteredOtp.length < 6 || loading || otpVerified}
                  >
                    {loading && !otpVerified ? (<CgSpinner size={20} className="animate-spin" />) : <span>Verify OTP</span>}
                  </button>
                  {otpVerified && (
                    <div className="success-message">
                      <span style={{ fontSize: '18px' }}>✓</span> Phone number verified
                    </div>
                  )}
                </div>
              </div>
              {/* --- END PHONE AND OTP SECTION --- */}

              {/* Age Input */}
              <div className="form-group">
                <label>Age <span className="required">*</span></label>
                <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="Enter employee age" min="18" max="80" required />
              </div>
              
              {/* --- GENDER INPUT (Dropdown/Select) --- */}
              <div className="form-group">
                  <label>
                      Gender
                      <span className="required">*</span>
                  </label>
                  <Select 
                      name="gender" 
                      options={genderOptions} 
                      onChange={handleGenderChange} 
                      placeholder="Select Gender" 
                      classNamePrefix="react-select"
                      value={formData.gender ? genderOptions.find(option => option.value === formData.gender) : null}
                  />
              </div>
              {/* --- END GENDER INPUT --- */}

            </div>

            {/* --- RIGHT COLUMN: Location & Timing --- */}
            <div className="form-column">
              
              {/* Landmark Search Section */}
              <div className="form-group form-group-landmark">
                <label>Landmarks <span className="required">*</span></label>
                <div className="search-input-wrapper">
                  <input type="text" name="landmarks" value={formData.landmarks} onChange={handleChange} placeholder="Search desired work locations" required />
                  <img src={searchIcon} alt="Search" className="search-icon" onClick={searchLandmarks} style={{ cursor: 'pointer' }}/>
                </div>
                
                {/* Location Action Buttons */}
                <div className="location-actions">
                  <button type="button" onClick={searchLandmarks} className="btn btn-search btn-primary" disabled={searchingLocations}>
                    {searchingLocations ? (<CgSpinner size={16} className="animate-spin mr-1" />) : 'Search Locations'}
                  </button>
                  <button type="button" onClick={toggleManualCoordinates} className="btn btn-secondary">
                    {showManualCoordinates ? 'Hide Manual Entry' : 'Enter Precise Coordinates'}
                  </button>
                    <button type="button" onClick={toggleMapVisibility} className="btn btn-map">
                    {showMap ? 'Hide Map' : 'Select on Map'}
                  </button>
                </div>
                
                {/* Google Map Component */}
                {showMap && (
                  <div className="map-wrapper">
                    <h4>Select Location on Map</h4>
                    <GoogleMapAPI onLocationSelect={handleLocationSelect} apiKey={GOOGLE_MAPS_API_KEY} /> 
                  </div>
                )}
                
                {/* Manual coordinates input */}
                {showManualCoordinates && (
                  <div className="manual-coordinates">
                    <h4>Enter Precise GPS Coordinates</h4>
                    <div className="coordinate-inputs">
                      <input type="text" value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="Latitude (e.g. 28.6139)" />
                      <input type="text" value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="Longitude (e.g. 77.2090)" />
                    </div>
                    <button type="button" onClick={addManualLocation} className="btn btn-map">Set Precise Location</button>
                  </div>
                )}
                
                {/* Display search results and selected location */}
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
                  <div className="selected-location-display">
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
                
                {/* This list is now ALWAYS visible and styled as a checklist */}
                <ul className="time-slot-checklist">
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
                              id={`slot${i}`} 
                              value={timeSlot} 
                              onChange={handleTimingChange}
                              checked={formData.timming.includes(timeSlot)}
                            />
                            <label className="form-check-label" htmlFor={`slot${i}`}>
                              {timeSlot}
                            </label>
                          </div>
                        </li>
                      );
                    })}
                </ul>
                
                {formData.timming.length > 0 && (
                  <div className="selected-slots">
                    {formData.timming.map((slot, index) => (
                      <div key={index} className="time-slot-tag">{slot}<button type="button" className="remove-slot" onClick={() => removeTimeSlot(slot)}>×</button></div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verification Status */}
              <div className="form-group">
                <label>Verification Status</label>
                <div className="toggle-group">
                  <label className="toggle-switch">
                    <input type="checkbox" name="blueTicket" checked={formData.blueTicket} onChange={handleChange} disabled={!otpVerified}/>
                    <span className="slider"></span>
                  </label>
                  <span className="verification-text">{formData.blueTicket ? 'Verified' : 'Not verified'}</span>
                  {otpVerified && !formData.blueTicket && (
                    <span className="verification-hint">(Phone verified, click to enable blue tick)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="form-footer">
            <button type="submit" className="btn btn-save" disabled={loading || !otpVerified}>
              {loading ? (<CgSpinner size={20} className="animate-spin" />) : 'Save Information'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeForm;