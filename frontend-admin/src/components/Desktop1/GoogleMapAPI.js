import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, StandaloneSearchBox } from '@react-google-maps/api';
import axios from 'axios';
import './GoogleMapAPI.css';

// Google Maps API key - replace with your actual API key
const API_KEY = "AIzaSyAqYM_LPakaBotYeIb7m_spZf3m0ZQU2KI";


// Map container style
const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

// Default center position (India)
const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629
};

// Options for the Google Map
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: true,
  mapTypeControl: true,
  fullscreenControl: true
};

// Libraries to load
const libraries = ['places'];

function GoogleMapAPI({ onLocationSelect }) {
  // Load the Google Maps JavaScript API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
    libraries,
  });

  // State variables
  const [map, setMap] = useState(null);
  const [searchBox, setSearchBox] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [center, setCenter] = useState(defaultCenter);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationInfo, setLocationInfo] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState(null);
  const [infoWindowVisible, setInfoWindowVisible] = useState(false);

  // References
  const mapRef = useRef();
  const searchInputRef = useRef();
  
  // Load recent searches from localStorage
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentLocationSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((place) => {
    const updatedSearches = [place, ...recentSearches.filter(s => s.place_id !== place.place_id)].slice(0, 5);
    setRecentSearches(updatedSearches);
    localStorage.setItem('recentLocationSearches', JSON.stringify(updatedSearches));
  }, [recentSearches]);

  // Handle map load
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMap(map);
    
    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCenter(userLocation);
          map.panTo(userLocation);
          
          // Reverse geocode to get address from coordinates
          reverseGeocode(userLocation);
        },
        () => {
          console.log('Error: The Geolocation service failed.');
        }
      );
    }
  }, []);

  // Handle search box load
  const onSearchBoxLoad = useCallback((ref) => {
    setSearchBox(ref);
  }, []);

  // Handle places changed in search box
  const onPlacesChanged = useCallback(() => {
    if (searchBox) {
      const places = searchBox.getPlaces();
      
      if (places.length === 0) return;
      
      const place = places[0];
      
      // Clear existing markers
      setMarkers([]);
      
      if (place.geometry && place.geometry.location) {
        // Create new marker
        const newMarker = {
          position: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          },
          place: place
        };
        
        // Update state
        setMarkers([newMarker]);
        setSelectedPlace(place);
        setSelectedMarkerIndex(0);
        setCenter(newMarker.position);
        
        // Get detailed place information
        getPlaceDetails(place);
        
        // Save to recent searches
        saveRecentSearch({
          place_id: place.place_id,
          name: place.name || place.formatted_address,
          address: place.formatted_address,
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
        });
        
        // Send location to parent component
        onLocationSelect({
          coordinates: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          },
          landmarks: place.formatted_address,
          place_id: place.place_id,
          place_details: place
        });
      }
    }
  }, [searchBox, onLocationSelect, saveRecentSearch]);

  // Handle marker click
  const handleMarkerClick = useCallback((marker, index) => {
    setSelectedPlace(marker.place);
    setSelectedMarkerIndex(index);
    setInfoWindowVisible(true);
    
    if (marker.place && marker.place.place_id) {
      getPlaceDetails(marker.place);
    }
    
    // Create InfoWindow manually using the Google Maps API
    if (isLoaded && map && marker.position) {
      // Clear any existing InfoWindows
      if (window.currentInfoWindow) {
        window.currentInfoWindow.close();
      }
      
      // Create content for InfoWindow
      const content = document.createElement('div');
      content.className = 'info-window-content';
      content.innerHTML = `
        <h3>${marker.place?.name || "Selected Location"}</h3>
        <p>${marker.place?.formatted_address || ""}</p>
        <p><strong>Coordinates:</strong> ${typeof marker.position.lat === 'function' ? marker.position.lat().toFixed(6) : marker.position.lat.toFixed(6)}, 
        ${typeof marker.position.lng === 'function' ? marker.position.lng().toFixed(6) : marker.position.lng.toFixed(6)}</p>
        <button id="select-location-btn" class="select-location-button">Select This Location</button>
      `;
      
      // Create InfoWindow
      const infoWindow = new window.google.maps.InfoWindow({
        content: content,
        position: marker.position
      });
      
      // Add event listener to the button
      infoWindow.addListener('domready', () => {
        document.getElementById('select-location-btn').addEventListener('click', () => {
          onLocationSelect({
            coordinates: marker.position,
            landmarks: marker.place?.formatted_address || "",
            place_id: marker.place?.place_id || "",
            place_details: marker.place || {}
          });
          infoWindow.close();
          setInfoWindowVisible(false);
        });
      });
      
      // Open InfoWindow
      infoWindow.open(map);
      
      // Store reference to current InfoWindow
      window.currentInfoWindow = infoWindow;
      
      // Add listener for InfoWindow close
      infoWindow.addListener('closeclick', () => {
        setInfoWindowVisible(false);
        setSelectedMarkerIndex(null);
      });
    }
  }, [map, isLoaded, onLocationSelect]);

  // Handle map click to add a marker
  const handleMapClick = useCallback((event) => {
    const clickedPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    
    // Create new marker
    setMarkers([{
      position: clickedPosition
    }]);
    setSelectedMarkerIndex(0);
    
    // Reverse geocode to get address
    reverseGeocode(clickedPosition);
  }, []);

  // Reverse geocode - get address from coordinates
  const reverseGeocode = useCallback((position) => {
    axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.lat},${position.lng}&key=${API_KEY}`)
      .then(response => {
        if (response.data.results && response.data.results.length > 0) {
          const place = response.data.results[0];
          
          // Update marker with place information
          setMarkers([{
            position: position,
            place: place
          }]);
          
          setSelectedPlace(place);
          setSelectedMarkerIndex(0);
          
          // Get detailed place information
          getPlaceDetails(place);
          
          // Send location to parent component
          onLocationSelect({
            coordinates: position,
            landmarks: place.formatted_address,
            place_id: place.place_id,
            place_details: place
          });
        }
      })
      .catch(error => {
        console.error("Reverse geocoding error:", error);
      });
  }, [onLocationSelect]);

  // Get detailed place information
  const getPlaceDetails = useCallback((place) => {
    if (!place.place_id) return;
    
    // Extract available information from place object
    const extractedInfo = {
      name: place.name || "",
      address: place.formatted_address || "",
      location: {
        lat: place.geometry?.location.lat() || place.geometry?.location.lat,
        lng: place.geometry?.location.lng() || place.geometry?.location.lng
      },
      placeId: place.place_id,
      types: place.types || [],
      plusCode: place.plus_code?.global_code || ""
    };
    
    // Use the Places API to get more detailed information if needed
    if (isLoaded && window.google && window.google.maps && window.google.maps.places) {
      const placesService = new window.google.maps.places.PlacesService(mapRef.current);
      
      placesService.getDetails(
        { placeId: place.place_id, fields: ['name', 'formatted_address', 'geometry', 'formatted_phone_number', 'website', 'opening_hours', 'rating', 'reviews'] },
        (result, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            setLocationInfo({
              ...extractedInfo,
              phoneNumber: result.formatted_phone_number || "",
              website: result.website || "",
              openNow: result.opening_hours?.isOpen?.() || false,
              rating: result.rating || 0,
              reviews: result.reviews || []
            });
          } else {
            setLocationInfo(extractedInfo);
          }
        }
      );
    } else {
      setLocationInfo(extractedInfo);
    }
  }, [isLoaded]);

  // Handle search query change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle search form submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Select a recent search
  const selectRecentSearch = (search) => {
    // Update map center
    setCenter(search.location);
    
    // Create marker
    setMarkers([{
      position: search.location,
      place: {
        place_id: search.place_id,
        formatted_address: search.address
      }
    }]);
    
    // Set selected place
    setSelectedPlace({
      place_id: search.place_id,
      formatted_address: search.address
    });
    setSelectedMarkerIndex(0);
    
    // Update search input
    setSearchQuery(search.name);
    
    // Get detailed place information
    if (search.place_id) {
      if (isLoaded && window.google && window.google.maps && window.google.maps.places) {
        const placesService = new window.google.maps.places.PlacesService(mapRef.current);
        
        placesService.getDetails(
          { placeId: search.place_id, fields: ['name', 'formatted_address', 'geometry'] },
          (result, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              getPlaceDetails(result);
            }
          }
        );
      }
    }
    
    // Send location to parent component
    onLocationSelect({
      coordinates: search.location,
      landmarks: search.address,
      place_id: search.place_id
    });
  };

  // Format coordinates for display
  const formatCoordinate = (value) => {
    if (typeof value === 'function') {
      return value().toFixed(6);
    }
    return typeof value === 'number' ? value.toFixed(6) : '0.000000';
  };

  // Handle loading error
  if (loadError) {
    return <div className="map-error">Error loading maps. Please check your internet connection.</div>;
  }

  // Handle loading state
  if (!isLoaded) {
    return <div className="map-loading">Loading maps...</div>;
  }

  return (
    <div className="google-map-api-container">
      <div className="map-search-container">
        <form onSubmit={handleSearchSubmit} className="map-search-form">
          <StandaloneSearchBox
            onLoad={onSearchBoxLoad}
            onPlacesChanged={onPlacesChanged}
          >
            <input
              type="text"
              placeholder="Search for a location..."
              className="map-search-input"
              value={searchQuery}
              onChange={handleSearchChange}
              ref={searchInputRef}
            />
          </StandaloneSearchBox>
          <button type="submit" className="map-search-button">
            Search
          </button>
        </form>
        
        {recentSearches.length > 0 && (
          <div className="recent-searches">
            <h4>Recent Searches</h4>
            <ul>
              {recentSearches.map((search, index) => (
                <li key={index} onClick={() => selectRecentSearch(search)}>
                  <span className="search-name">{search.name}</span>
                  <span className="search-address">{search.address}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="map-container">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={14}
          onLoad={onMapLoad}
          options={mapOptions}
          onClick={handleMapClick}
        >
          {/* Display markers */}
          {markers.map((marker, index) => (
            <Marker
              key={index}
              position={marker.position}
              onClick={() => handleMarkerClick(marker, index)}
              animation={window.google.maps.Animation.DROP}
            />
          ))}
        </GoogleMap>
      </div>
      
      {/* Location details panel */}
      {locationInfo && (
        <div className="location-details-panel">
          <h3>{locationInfo.name || "Selected Location"}</h3>
          <p className="location-address">{locationInfo.address}</p>
          
          <div className="location-coordinates">
            <strong>Coordinates:</strong> {locationInfo.location.lat.toFixed(6)}, {locationInfo.location.lng.toFixed(6)}
          </div>
          
          {locationInfo.types && locationInfo.types.length > 0 && (
            <div className="location-types">
              <strong>Type:</strong> {locationInfo.types.join(', ')}
            </div>
          )}
          
          {locationInfo.phoneNumber && (
            <div className="location-phone">
              <strong>Phone:</strong> {locationInfo.phoneNumber}
            </div>
          )}
          
          {locationInfo.website && (
            <div className="location-website">
              <strong>Website:</strong>{' '}
              <a href={locationInfo.website} target="_blank" rel="noopener noreferrer">
                {locationInfo.website}
              </a>
            </div>
          )}

          {locationInfo.rating && (
            <div className="location-rating">
              <strong>Rating:</strong> {locationInfo.rating} / 5
            </div>
          )}

          {locationInfo.reviews && locationInfo.reviews.length > 0 && (
            <div className="location-reviews">
              <strong>Reviews:</strong>
              <ul>
                {locationInfo.reviews.slice(0, 3).map((review, index) => (
                  <li key={index}>
                    <strong>{review.author_name}</strong>: {review.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GoogleMapAPI;
