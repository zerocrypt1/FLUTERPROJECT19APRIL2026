// src/components/Form/EmployeeForm.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PhoneInput from 'react-phone-input-2';
import OtpInput from 'otp-input-react';
import { CgSpinner } from 'react-icons/cg';
import {
  FiSearch, FiMapPin, FiMap, FiX, FiCheck,
  FiChevronDown, FiNavigation, FiUser, FiBriefcase,
  FiClock, FiShield, FiEdit3
} from 'react-icons/fi';
import { toast, Toaster } from 'react-hot-toast';
import Select from 'react-select';
import 'react-phone-input-2/lib/style.css';

import mapAPI from '../../services/mapApi';
import formAPI from '../../services/formApi';

import {
  validateIdProofNumber,
  getIdProofFormatHint,
  getIdProofMaxLength,
  occupationOptions,
  idProofOptions,
} from '../../utils/formHelpers';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const initialFormData = {
  name: '', occupation: [], phoneNumber: '', identityProof: '',
  landmarks: '', age: '', gender: '', state: '', address: '',
  timing: [], altPhoneNumber: '', idProofNumber: '',
  blueTicket: false, pinCode: '', city: '',
  location: null, // full location object from backend
};

// ─── Google Maps Drag-Drop Component ─────────────────────────────────────────

function DraggableMap({ onLocationSelect, initialCenter }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [fetching, setFetching] = useState(false);

  const defaultCenter = initialCenter || { lat: 28.6139, lng: 77.2090 }; // Delhi default

  // Load Google Maps script dynamically
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Init map after script loads
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });

    const marker = new window.google.maps.Marker({
      position: defaultCenter,
      map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
      title: 'Drag me to set location',
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // On marker drag end → reverse geocode
    marker.addListener('dragend', async () => {
      const pos = marker.getPosition();
      const lat = pos.lat();
      const lng = pos.lng();
      await fetchAddressForCoords(lat, lng);
    });

    // On map click → move marker + reverse geocode
    map.addListener('click', async (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition({ lat, lng });
      await fetchAddressForCoords(lat, lng);
    });

    // Initial reverse geocode for default center
    fetchAddressForCoords(defaultCenter.lat, defaultCenter.lng);
  }, [isLoaded]);

  const fetchAddressForCoords = useCallback(async (lat, lng) => {
    setFetching(true);
    try {
      const result = await mapAPI.reverseGeocode(lat, lng);
      // result = { formattedAddress, city, state, country, pinCode, latitude, longitude }
      setCurrentAddress(result.formattedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      onLocationSelect({
        latitude: lat,
        longitude: lng,
        formattedAddress: result.formattedAddress || '',
        city: result.city || '',
        state: result.state || '',
        country: result.country || '',
        pinCode: result.pinCode || '',
        placeId: null,
      });
    } catch {
      setCurrentAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      onLocationSelect({ latitude: lat, longitude: lng, formattedAddress: '', city: '', state: '', country: '', pinCode: '', placeId: null });
    } finally {
      setFetching(false);
    }
  }, [onLocationSelect]);

  const centerOnUser = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const center = { lat, lng };
        mapInstanceRef.current?.setCenter(center);
        markerRef.current?.setPosition(center);
        fetchAddressForCoords(lat, lng);
      },
      () => toast.error('Unable to get your location')
    );
  };

  return (
    <div style={styles.mapContainer}>
      {!isLoaded && (
        <div style={styles.mapLoader}>
          <CgSpinner size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
          <span style={{ marginTop: 8, color: '#6b7280', fontSize: 14 }}>Loading map…</span>
        </div>
      )}

      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 12 }} />

      {isLoaded && (
        <>
          {/* Current address overlay */}
          <div style={styles.mapAddressOverlay}>
            {fetching
              ? <CgSpinner size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <FiMapPin size={14} color="#6366f1" />
            }
            <span style={{ fontSize: 12, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fetching ? 'Fetching address…' : currentAddress || 'Click or drag pin to set location'}
            </span>
          </div>

          {/* My location button */}
          <button type="button" onClick={centerOnUser} style={styles.myLocationBtn} title="Use my location">
            <FiNavigation size={16} color="#6366f1" />
          </button>

          {/* Drag hint */}
          <div style={styles.dragHint}>
            <span>Drag pin or click to select</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Location Search with Suggestions ────────────────────────────────────────

function LocationSearch({ onLocationSelect, value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInputChange = (e) => {
    const query = e.target.value;
    onChange(query);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await mapAPI.getLocationSuggestions(query);
        // results = [{ placeId, description, mainText, secondaryText }]
        setSuggestions(results || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleSuggestionClick = async (suggestion) => {
    setShowSuggestions(false);
    onChange(suggestion.description);
    setSuggestions([]);

    try {
      const details = await mapAPI.getPlaceDetails(suggestion.placeId);
      // details = { placeId, formattedAddress, latitude, longitude, city, state, country, pinCode }
      onLocationSelect({
        latitude: details.latitude,
        longitude: details.longitude,
        formattedAddress: details.formattedAddress,
        city: details.city,
        state: details.state,
        country: details.country,
        pinCode: details.pinCode,
        placeId: details.placeId,
        name: suggestion.mainText,
      });
      toast.success('Location selected!');
    } catch {
      toast.error('Could not fetch location details');
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={styles.searchInputWrapper}>
        <FiSearch size={16} color="#9ca3af" style={styles.searchIcon} />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="Search work location, landmark, area…"
          style={styles.searchInput}
          autoComplete="off"
        />
        {searching && (
          <CgSpinner size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite', color: '#6366f1' }} />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul style={styles.suggestionList}>
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              style={styles.suggestionItem}
              onMouseDown={() => handleSuggestionClick(s)}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <FiMapPin size={14} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{s.mainText}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{s.secondaryText}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main EmployeeForm ────────────────────────────────────────────────────────

function EmployeeForm({ isSidebarActive }) {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [idNumberError, setIdNumberError] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'location' | 'timing'

  // ── Handlers ──

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'idProofNumber') {
      const maxLen = getIdProofMaxLength(formData.identityProof);
      const trimmed = value.slice(0, maxLen);
      const valid = validateIdProofNumber(formData.identityProof, trimmed);
      setIdNumberError(!valid && trimmed ? 'Invalid format for selected ID type' : '');
      setFormData(p => ({ ...p, [name]: trimmed }));
      return;
    }
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  // Called from both LocationSearch (suggestions) and DraggableMap
  const applyLocation = useCallback((locationData) => {
    setFormData(p => ({
      ...p,
      location: {
        placeId: locationData.placeId || null,
        formattedAddress: locationData.formattedAddress,
        name: locationData.name || locationData.mainText || '',
        city: locationData.city,
        state: locationData.state,
        country: locationData.country,
        pinCode: locationData.pinCode,
        coordinates: {
          type: 'Point',
          coordinates: [locationData.longitude, locationData.latitude], // GeoJSON [lng, lat]
        },
      },
      city: locationData.city || p.city,
      state: locationData.state || p.state,
      pinCode: locationData.pinCode || p.pinCode,
      address: locationData.formattedAddress || p.address,
    }));
    if (locationData.formattedAddress) {
      setLocationSearch(locationData.formattedAddress);
    }
  }, []);

  const handleTimingChange = (timeSlot) => {
    setFormData(p => ({
      ...p,
      timing: p.timing.includes(timeSlot)
        ? p.timing.filter(s => s !== timeSlot)
        : [...p.timing, timeSlot],
    }));
  };

  const addManualCoords = async () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error('Enter valid coordinates'); return;
    }
    try {
      const result = await mapAPI.reverseGeocode(lat, lng);
      applyLocation({ latitude: lat, longitude: lng, ...result });
      toast.success('Coordinates set!');
      setShowManualCoords(false);
    } catch {
      applyLocation({ latitude: lat, longitude: lng, formattedAddress: `${lat}, ${lng}`, city: '', state: '', country: '', pinCode: '' });
      toast.success('Coordinates set (address unavailable)');
    }
  };

  // ── OTP ──

  const requestOtp = async (e) => {
    e.preventDefault();
  
    if (!formData.phoneNumber) {
      toast.error('Enter phone number');
      return;
    }
  
    setLoading(true);
  
    try {
      console.log("Sending OTP to:", formData.phoneNumber);
  
      await formAPI.sendFirebaseOtp(formData.phoneNumber);
  
      toast.success('OTP sent successfully!');
  
    } catch (error) {
      console.error("OTP SEND ERROR:", error);
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
  
    if (enteredOtp.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
  
    setLoading(true);
  
    try {
      console.log("Verifying OTP:", enteredOtp);
  
      const result = await formAPI.confirmFirebaseOtp(
        enteredOtp,
        formData.phoneNumber
      );
  
      if (result?.verified) {
        setOtpVerified(true);
        setEnteredOtp(''); // 🔥 clear input
        toast.success('Phone verified successfully!');
      } else {
        toast.error('Invalid OTP');
      }
  
    } catch (error) {
      console.error("OTP VERIFY ERROR:", error);
      toast.error(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };
  // ── Submit ──

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!formData.name || !formData.occupation.length || !formData.phoneNumber || !formData.age || !formData.gender || !formData.timing.length) {
      toast.error('Fill all required fields');
      return;
    }
  
    if (!otpVerified) {
      toast.error('Verify phone number first');
      return;
    }
  
    if (!formData.location?.coordinates) {
      toast.error('Set a location');
      return;
    }
  
    setLoading(true);
  
    try {
      const payload = {
        ...formData,
        phoneNumber: formData.phoneNumber.replace(/\D/g, '').slice(-10), // ✅ fix
        age: Number(formData.age), // ✅ fix
        occupation: formData.occupation, // ✅ fix (array)
      };
  
      console.log("FINAL PAYLOAD:", payload); // 🔥 debug
  
      const data = await formAPI.submitForm(payload);
  
      toast.success(data.message || 'Saved successfully!');
  
      setFormData(initialFormData);
      setOtpVerified(false);
      setEnteredOtp('');
      setLocationSearch('');
  
    } catch (error) {
      console.error("SUBMIT ERROR:", error);
      toast.error(error.message || 'Failed to save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Time slot generator ──
  const timeSlots = [...Array(24)].map((_, i) => {
    const fmt = (h) => h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`;
    return `${fmt(i)} - ${fmt((i + 1) % 24)}`;
  });

  const hasLocation = !!formData.location?.coordinates;
  const locationCoords = hasLocation ? formData.location.coordinates.coordinates : null;
  const mapInitCenter = locationCoords
    ? { lat: locationCoords[1], lng: locationCoords[0] }
    : undefined;

  // ── Select styles ──
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? '#6366f1' : '#e5e7eb',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
      borderRadius: 10,
      minHeight: 44,
      fontSize: 14,
      '&:hover': { borderColor: '#6366f1' },
    }),
    multiValue: (base) => ({ ...base, backgroundColor: '#ede9fe', borderRadius: 6 }),
    multiValueLabel: (base) => ({ ...base, color: '#5b21b6', fontSize: 12, fontWeight: 600 }),
    multiValueRemove: (base) => ({ ...base, color: '#7c3aed', ':hover': { backgroundColor: '#ddd6fe', color: '#5b21b6' } }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#f3f4f6' : 'white',
      fontSize: 13,
    }),
    placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: 13 }),
  };

  return (
    <>
      <style>{cssString}</style>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: 10, fontSize: 13 } }} />

      <div className={`ef-wrapper ${isSidebarActive ? 'sidebar-active' : ''}`}>
        {/* ── Header ── */}
        <div className="ef-header">
          <div className="ef-header-icon"><FiUser size={22} color="#6366f1" /></div>
          <div>
            <h1 className="ef-title">Employee Registration</h1>
            <p className="ef-subtitle">Fill in details to register a new employee</p>
          </div>
        </div>

        {/* ── Tab Nav ── */}
        <div className="ef-tabs">
          {[
            { key: 'personal', label: 'Personal Info', icon: <FiUser size={14} /> },
            { key: 'location', label: 'Location', icon: <FiMapPin size={14} /> },
            { key: 'timing', label: 'Timing', icon: <FiClock size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`ef-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
              {tab.key === 'location' && hasLocation && <span className="ef-tab-badge">✓</span>}
              {tab.key === 'timing' && formData.timing.length > 0 && <span className="ef-tab-badge">{formData.timing.length}</span>}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* ══════════════════════════════════════════
              TAB 1: PERSONAL INFO
          ══════════════════════════════════════════ */}
          <div className={`ef-tab-panel ${activeTab === 'personal' ? 'active' : ''}`}>
            <div className="ef-grid-2">

              {/* Name */}
              <div className="ef-field">
                <label className="ef-label">Name <span className="ef-req">*</span></label>
                <input className="ef-input" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full name" required />
              </div>

              {/* Age */}
              <div className="ef-field">
                <label className="ef-label">Age <span className="ef-req">*</span></label>
                <input className="ef-input" type="number" name="age" value={formData.age} onChange={handleChange} placeholder="18 – 80" min="18" max="80" required />
              </div>

              {/* Gender */}
              <div className="ef-field">
                <label className="ef-label">Gender <span className="ef-req">*</span></label>
                <Select
                  options={genderOptions}
                  onChange={opt => setFormData(p => ({ ...p, gender: opt?.value || '' }))}
                  value={genderOptions.find(o => o.value === formData.gender) || null}
                  placeholder="Select gender"
                  styles={selectStyles}
                />
              </div>

              {/* Occupation */}
              <div className="ef-field">
                <label className="ef-label">Occupation <span className="ef-req">*</span></label>
                <Select
                  isMulti
                  options={occupationOptions}
                  onChange={opts => setFormData(p => ({ ...p, occupation: opts ? opts.map(o => o.value) : [] }))}
                  placeholder="Select occupations"
                  styles={selectStyles}
                />
              </div>

              {/* ID Proof Type */}
              <div className="ef-field">
                <label className="ef-label">ID Card Type</label>
                <Select
                  options={idProofOptions}
                  onChange={opt => { setFormData(p => ({ ...p, identityProof: opt?.value || '', idProofNumber: '' })); setIdNumberError(''); }}
                  value={idProofOptions?.find(o => o.value === formData.identityProof) || null}
                  placeholder="Select ID type"
                  styles={selectStyles}
                  isClearable
                />
              </div>

              {/* ID Number (conditional) */}
              {formData.identityProof && (
                <div className="ef-field">
                  <label className="ef-label">ID Number</label>
                  <input
                    className={`ef-input ${idNumberError ? 'error' : ''}`}
                    type="text"
                    name="idProofNumber"
                    value={formData.idProofNumber}
                    onChange={handleChange}
                    placeholder="Enter ID number"
                    maxLength={getIdProofMaxLength(formData.identityProof)}
                  />
                  {idNumberError && <div className="ef-error">{idNumberError}</div>}
                  <div className="ef-hint">{getIdProofFormatHint(formData.identityProof)}</div>
                </div>
              )}

              {/* Alt Phone */}
              <div className="ef-field">
                <label className="ef-label">Alternate Phone</label>
                <input className="ef-input" type="text" name="altPhoneNumber" value={formData.altPhoneNumber} onChange={handleChange} placeholder="Optional" />
              </div>

            </div>

            {/* ── Phone + OTP Section ── */}
            <div className="ef-otp-section">
            <div id="recaptcha-container"></div>
              <div className="ef-otp-header">
                <FiShield size={16} color="#6366f1" />
                <span>Phone Verification</span>
                {otpVerified && <span className="ef-verified-badge"><FiCheck size={12} /> Verified</span>}
              </div>

              <div className="ef-grid-2">
                <div className="ef-field">
                  <label className="ef-label">Phone Number <span className="ef-req">*</span></label>
                  <PhoneInput
                    country="in"
                    value={formData.phoneNumber}
                    onChange={(val) => {
                      const formatted = val.startsWith('+') ? val : `+${val}`;
                    
                      setFormData(p => ({ ...p, phoneNumber: formatted }));
                    
                      // 🔥 IMPORTANT RESET
                      setOtpVerified(false);
                      setEnteredOtp('');
                    }}
                    inputProps={{ name: 'phoneNumber', required: true }}
                    inputStyle={{ width: '100%', height: 44, borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14 }}
                    buttonStyle={{ borderRadius: '10px 0 0 10px', border: '1.5px solid #e5e7eb' }}
                  />
                  <button
                    type="button"
                    className="ef-btn ef-btn-secondary"
                    style={{ marginTop: 8 }}
                    onClick={requestOtp}
                    disabled={!formData.phoneNumber || loading || otpVerified}
                  >
                    {loading && !otpVerified ? <CgSpinner className="spin" /> : 'Send OTP'}
                  </button>
                </div>

                <div className="ef-field">
                  <label className="ef-label">Enter OTP</label>
                  <OtpInput
                    value={enteredOtp}
                    onChange={setEnteredOtp}
                    OTPLength={6}
                    otpType="number"
                    disabled={otpVerified}
                    autoFocus={false}
                    className="ef-otp-input"
                  />
                  <button
                    type="button"
                    className={`ef-btn ${otpVerified ? 'ef-btn-success' : 'ef-btn-primary'}`}
                    style={{ marginTop: 8 }}
                    onClick={verifyOtp}
                    disabled={enteredOtp.length < 6 || loading || otpVerified}
                  >
                    {otpVerified ? <><FiCheck /> Verified</> : loading ? <CgSpinner className="spin" /> : 'Verify OTP'}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Verification toggle ── */}
            <div className="ef-field" style={{ marginTop: 16 }}>
              <label className="ef-label">Blue Tick Verification</label>
              <div className="ef-toggle-row">
                <label className="ef-toggle">
                  <input type="checkbox" name="blueTicket" checked={formData.blueTicket} onChange={handleChange} disabled={!otpVerified} />
                  <span className="ef-toggle-slider" />
                </label>
                <span style={{ fontSize: 13, color: formData.blueTicket ? '#059669' : '#6b7280' }}>
                  {formData.blueTicket ? '✓ Blue tick enabled' : 'Not verified'}
                </span>
              </div>
            </div>

            <div className="ef-tab-footer">
              <button type="button" className="ef-btn ef-btn-primary" onClick={() => setActiveTab('location')}>
                Next: Location →
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              TAB 2: LOCATION
          ══════════════════════════════════════════ */}
          <div className={`ef-tab-panel ${activeTab === 'location' ? 'active' : ''}`}>

            {/* Search bar */}
            <div className="ef-field">
              <label className="ef-label">Search Location <span className="ef-req">*</span></label>
              <LocationSearch
                value={locationSearch}
                onChange={setLocationSearch}
                onLocationSelect={applyLocation}
              />
              <div className="ef-hint">Type a landmark, area, or full address — suggestions will appear</div>
            </div>

            {/* Map toggle */}
            <div className="ef-location-actions">
              <button type="button" className={`ef-btn ${showMap ? 'ef-btn-danger' : 'ef-btn-secondary'}`} onClick={() => setShowMap(v => !v)}>
                <FiMap size={14} /> {showMap ? 'Hide Map' : 'Pin on Map'}
              </button>
              <button type="button" className="ef-btn ef-btn-secondary" onClick={() => setShowManualCoords(v => !v)}>
                <FiEdit3 size={14} /> {showManualCoords ? 'Hide' : 'Enter Coordinates'}
              </button>
            </div>

            {/* Manual coordinates */}
            {showManualCoords && (
              <div className="ef-manual-coords">
                <div className="ef-grid-2">
                  <div className="ef-field">
                    <label className="ef-label">Latitude</label>
                    <input className="ef-input" type="text" value={manualLat} onChange={e => setManualLat(e.target.value)} placeholder="e.g. 28.6139" />
                  </div>
                  <div className="ef-field">
                    <label className="ef-label">Longitude</label>
                    <input className="ef-input" type="text" value={manualLng} onChange={e => setManualLng(e.target.value)} placeholder="e.g. 77.2090" />
                  </div>
                </div>
                <button type="button" className="ef-btn ef-btn-primary" onClick={addManualCoords}>
                  <FiMapPin size={14} /> Set Coordinates
                </button>
              </div>
            )}

            {/* Draggable Map */}
            {showMap && (
              <div className="ef-map-wrapper">
                <DraggableMap onLocationSelect={applyLocation} initialCenter={mapInitCenter} />
              </div>
            )}

            {/* Selected location card */}
            {hasLocation && (
              <div className="ef-location-card">
                <FiMapPin size={16} color="#6366f1" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{formData.location.formattedAddress || 'Selected Location'}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {locationCoords && `${locationCoords[1].toFixed(6)}, ${locationCoords[0].toFixed(6)}`}
                  </div>
                </div>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                  onClick={() => { setFormData(p => ({ ...p, location: null })); setLocationSearch(''); }}>
                  <FiX size={16} />
                </button>
              </div>
            )}

            {/* Address fields (auto-filled but editable) */}
            <div className="ef-divider">Address Details (auto-filled)</div>
            <div className="ef-grid-2">
              <div className="ef-field" style={{ gridColumn: '1 / -1' }}>
                <label className="ef-label">Full Address</label>
                <input className="ef-input" type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Street address" />
              </div>
              <div className="ef-field">
                <label className="ef-label">City</label>
                <input className="ef-input" type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
              </div>
              <div className="ef-field">
                <label className="ef-label">Pin Code</label>
                <input className="ef-input" type="text" name="pinCode" value={formData.pinCode} onChange={handleChange} placeholder="PIN" />
              </div>
              <div className="ef-field" style={{ gridColumn: '1 / -1' }}>
                <label className="ef-label">State</label>
                <input className="ef-input" type="text" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
              </div>
            </div>

            <div className="ef-tab-footer">
              <button type="button" className="ef-btn ef-btn-secondary" onClick={() => setActiveTab('personal')}>← Back</button>
              <button type="button" className="ef-btn ef-btn-primary" onClick={() => setActiveTab('timing')}>Next: Timing →</button>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              TAB 3: TIMING
          ══════════════════════════════════════════ */}
          <div className={`ef-tab-panel ${activeTab === 'timing' ? 'active' : ''}`}>
            <label className="ef-label">Select Available Time Slots <span className="ef-req">*</span></label>

            {/* Selected slots preview */}
            {formData.timing.length > 0 && (
              <div className="ef-selected-slots">
                {formData.timing.map(slot => (
                  <div key={slot} className="ef-slot-tag">
                    {slot}
                    <button type="button" onClick={() => handleTimingChange(slot)}><FiX size={11} /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="ef-time-grid">
              {timeSlots.map(slot => {
                const selected = formData.timing.includes(slot);
                return (
                  <label key={slot} className={`ef-time-slot ${selected ? 'selected' : ''}`}>
                    <input type="checkbox" checked={selected} onChange={() => handleTimingChange(slot)} style={{ display: 'none' }} />
                    <FiClock size={12} />
                    <span>{slot}</span>
                    {selected && <FiCheck size={12} style={{ marginLeft: 'auto' }} />}
                  </label>
                );
              })}
            </div>

            <div className="ef-tab-footer">
              <button type="button" className="ef-btn ef-btn-secondary" onClick={() => setActiveTab('location')}>← Back</button>
              <button
                type="submit"
                className="ef-btn ef-btn-primary ef-btn-submit"
                disabled={loading || !otpVerified}
              >
                {loading ? <CgSpinner className="spin" /> : <><FiCheck /> Save Employee</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Inline Styles (for map components, rest via CSS) ─────────────────────────

const styles = {
  mapContainer: {
    position: 'relative',
    width: '100%',
    height: 340,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1.5px solid #e5e7eb',
    background: '#f9fafb',
  },
  mapLoader: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', background: '#f9fafb', zIndex: 10,
  },
  mapAddressOverlay: {
    position: 'absolute', bottom: 40, left: 8, right: 8,
    background: 'white', borderRadius: 8, padding: '6px 10px',
    display: 'flex', alignItems: 'center', gap: 6,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 5, maxWidth: 'calc(100% - 50px)',
  },
  myLocationBtn: {
    position: 'absolute', bottom: 88, right: 8,
    background: 'white', border: 'none', borderRadius: 8,
    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 5,
  },
  dragHint: {
    position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: 20,
    padding: '4px 12px', fontSize: 11, whiteSpace: 'nowrap', zIndex: 5, pointerEvents: 'none',
  },
  searchInputWrapper: {
    position: 'relative', display: 'flex', alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute', left: 12, zIndex: 1, pointerEvents: 'none',
  },
  searchInput: {
    width: '100%', height: 44, paddingLeft: 36, paddingRight: 36,
    border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14,
    outline: 'none', transition: 'border-color .2s',
    boxSizing: 'border-box',
  },
  suggestionList: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
    background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10,
    marginTop: 4, listStyle: 'none', padding: '4px 0', margin: 0,
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 280, overflowY: 'auto',
  },
  suggestionItem: {
    padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: 10,
    alignItems: 'flex-start', transition: 'background .15s',
  },
};

// ─── CSS ──────────────────────────────────────────────────────────────────────

const cssString = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }

  .spin { animation: spin 1s linear infinite; }

  .ef-wrapper {
    font-family: 'Plus Jakarta Sans', sans-serif;
    max-width: 860px;
    margin: 0 auto;
    padding: 24px 20px 40px;
    transition: margin-left .3s;
  }
  .ef-wrapper.sidebar-active { margin-left: 260px; }

  /* Header */
  .ef-header {
    display: flex; align-items: center; gap: 14px; margin-bottom: 28px;
  }
  .ef-header-icon {
    width: 48px; height: 48px; border-radius: 14px;
    background: linear-gradient(135deg, #ede9fe, #c7d2fe);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ef-title { font-size: 22px; font-weight: 700; color: #111827; margin: 0; }
  .ef-subtitle { font-size: 13px; color: #6b7280; margin: 2px 0 0; }

  /* Tabs */
  .ef-tabs {
    display: flex; gap: 4px; background: #f3f4f6; padding: 4px;
    border-radius: 12px; margin-bottom: 24px; overflow-x: auto;
  }
  .ef-tab {
    flex: 1; min-width: 100px; display: flex; align-items: center; justify-content: center;
    gap: 6px; padding: 9px 16px; border: none; border-radius: 9px;
    font-size: 13px; font-weight: 600; color: #6b7280;
    background: transparent; cursor: pointer; transition: all .2s; white-space: nowrap;
    font-family: inherit;
  }
  .ef-tab.active { background: white; color: #6366f1; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
  .ef-tab-badge {
    background: #6366f1; color: white; border-radius: 20px;
    padding: 1px 7px; font-size: 10px; font-weight: 700;
  }

  /* Tab panels */
  .ef-tab-panel { display: none; animation: fadeIn .25s ease; }
  .ef-tab-panel.active { display: block; }

  /* Grid */
  .ef-grid-2 {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 0;
  }

  /* Fields */
  .ef-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  .ef-label { font-size: 13px; font-weight: 600; color: #374151; }
  .ef-req { color: #ef4444; }
  .ef-input {
    height: 44px; padding: 0 14px; border: 1.5px solid #e5e7eb;
    border-radius: 10px; font-size: 14px; font-family: inherit;
    outline: none; transition: border-color .2s, box-shadow .2s; color: #111827;
    background: white;
  }
  .ef-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
  .ef-input.error { border-color: #ef4444; }
  .ef-error { font-size: 11px; color: #ef4444; }
  .ef-hint { font-size: 11px; color: #9ca3af; }
  .ef-divider {
    font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase;
    letter-spacing: .08em; border-bottom: 1px solid #f3f4f6;
    padding-bottom: 8px; margin: 16px 0 12px;
  }

  /* OTP Section */
  .ef-otp-section {
    background: linear-gradient(135deg, #faf5ff, #eff6ff);
    border: 1.5px solid #e9d5ff; border-radius: 14px; padding: 20px; margin: 20px 0;
  }
  .ef-otp-header {
    display: flex; align-items: center; gap: 8px; font-weight: 700;
    font-size: 14px; color: #4c1d95; margin-bottom: 16px;
  }
  .ef-verified-badge {
    margin-left: auto; background: #d1fae5; color: #065f46;
    border-radius: 20px; padding: 3px 10px; font-size: 11px;
    display: flex; align-items: center; gap: 4px;
  }
  .ef-otp-input { gap: 6px !important; }
  .ef-otp-input input {
    border-radius: 8px !important; border: 1.5px solid #e5e7eb !important;
    font-size: 18px !important; font-weight: 700 !important;
  }

  /* Toggle */
  .ef-toggle-row { display: flex; align-items: center; gap: 12px; }
  .ef-toggle { position: relative; width: 44px; height: 24px; cursor: pointer; }
  .ef-toggle input { opacity: 0; width: 0; height: 0; }
  .ef-toggle-slider {
    position: absolute; inset: 0; background: #e5e7eb; border-radius: 24px; transition: .3s;
  }
  .ef-toggle-slider::before {
    content: ''; position: absolute; width: 18px; height: 18px; background: white;
    border-radius: 50%; left: 3px; top: 3px; transition: .3s;
    box-shadow: 0 1px 3px rgba(0,0,0,.2);
  }
  .ef-toggle input:checked + .ef-toggle-slider { background: #6366f1; }
  .ef-toggle input:checked + .ef-toggle-slider::before { transform: translateX(20px); }
  .ef-toggle input:disabled + .ef-toggle-slider { opacity: .5; cursor: not-allowed; }

  /* Buttons */
  .ef-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 18px; border-radius: 9px; font-size: 13px;
    font-weight: 600; border: none; cursor: pointer; transition: all .2s;
    font-family: inherit; white-space: nowrap;
  }
  .ef-btn:disabled { opacity: .5; cursor: not-allowed; }
  .ef-btn-primary { background: #6366f1; color: white; }
  .ef-btn-primary:hover:not(:disabled) { background: #4f46e5; transform: translateY(-1px); }
  .ef-btn-secondary { background: #f3f4f6; color: #374151; }
  .ef-btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
  .ef-btn-success { background: #059669; color: white; }
  .ef-btn-danger { background: #fee2e2; color: #dc2626; }
  .ef-btn-danger:hover:not(:disabled) { background: #fecaca; }
  .ef-btn-submit { padding: 11px 28px; font-size: 14px; }

  /* Tab footer */
  .ef-tab-footer {
    display: flex; justify-content: flex-end; gap: 10px;
    margin-top: 28px; padding-top: 20px; border-top: 1px solid #f3f4f6;
  }

  /* Location */
  .ef-location-actions { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .ef-map-wrapper { margin-bottom: 16px; border-radius: 12px; overflow: hidden; }
  .ef-location-card {
    display: flex; align-items: flex-start; gap: 10px;
    background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px;
    padding: 12px 14px; margin-bottom: 16px; animation: slideIn .2s ease;
  }
  .ef-manual-coords {
    background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px;
    padding: 16px; margin-bottom: 16px; animation: fadeIn .2s ease;
  }

  /* Time grid */
  .ef-time-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px; margin-top: 12px;
  }
  .ef-time-slot {
    display: flex; align-items: center; gap: 7px; padding: 9px 12px;
    border: 1.5px solid #e5e7eb; border-radius: 9px; cursor: pointer;
    font-size: 12px; font-weight: 500; color: #374151; transition: all .15s;
    background: white; user-select: none;
  }
  .ef-time-slot:hover { border-color: #a5b4fc; background: #f5f3ff; }
  .ef-time-slot.selected { border-color: #6366f1; background: #eef2ff; color: #4f46e5; font-weight: 600; }

  .ef-selected-slots {
    display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;
  }
  .ef-slot-tag {
    display: flex; align-items: center; gap: 5px;
    background: #ede9fe; color: #5b21b6; border-radius: 20px;
    padding: 4px 10px; font-size: 11px; font-weight: 600;
  }
  .ef-slot-tag button {
    background: none; border: none; cursor: pointer; color: #7c3aed;
    padding: 0; display: flex; align-items: center;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .ef-wrapper { padding: 16px 12px 32px; }
    .ef-wrapper.sidebar-active { margin-left: 0; }
    .ef-grid-2 { grid-template-columns: 1fr; }
    .ef-grid-2 .ef-field[style*="grid-column"] { grid-column: 1 !important; }
    .ef-title { font-size: 18px; }
    .ef-tab { padding: 8px 10px; font-size: 12px; }
    .ef-time-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .ef-tab-footer { flex-direction: column; }
    .ef-tab-footer .ef-btn { width: 100%; justify-content: center; }
    .ef-location-actions { flex-direction: column; }
    .ef-location-actions .ef-btn { width: 100%; justify-content: center; }
  }
`;

export default EmployeeForm;