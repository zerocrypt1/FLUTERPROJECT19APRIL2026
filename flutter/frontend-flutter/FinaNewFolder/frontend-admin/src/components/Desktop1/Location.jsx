import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Desktop1.css'; // Assuming you'll add CSS for autosuggestion

function LocationAutoSuggest({ onLocationSelect, initialValue = '' }) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef(null);
  const autoSuggestRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (autoSuggestRef.current && !autoSuggestRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if query is too short
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Set new timer for debounce
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 500); // 500ms debounce time

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const fetchSuggestions = async (searchText) => {
    if (!searchText.trim()) return;
    
    setIsLoading(true);
    try {
      // Use OpenCage API for suggestions
      const response = await axios.get(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(searchText)}&key=440c46f29d824bc087c36dc044d089d3&pretty=1&no_annotations=1&limit=5&abbrv=1`
      );
      
      if (response.data.results && response.data.results.length > 0) {
        const formattedResults = response.data.results.map(result => ({
          formatted_address: result.formatted,
          geometry: {
            location: {
              lat: result.geometry.lat,
              lng: result.geometry.lng
            }
          },
          place_id: result.annotations?.mgrs || String(Math.random()),
          types: result.components.category ? [result.components.category] : [],
          components: result.components
        }));
        
        setSuggestions(formattedResults);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.formatted_address);
    setSuggestions([]);
    setShowSuggestions(false);
    
    if (onLocationSelect) {
      onLocationSelect({
        landmarks: suggestion.formatted_address,
        coordinates: suggestion.geometry.location,
        place_details: {
          address_components: extractAddressComponents(suggestion),
          formatted_address: suggestion.formatted_address
        }
      });
    }
  };

  // Extract address components from suggestion
  const extractAddressComponents = (suggestion) => {
    const components = [];
    
    if (suggestion.components) {
      // City
      if (suggestion.components.city) {
        components.push({
          long_name: suggestion.components.city,
          short_name: suggestion.components.city,
          types: ['locality']
        });
      }
      
      // State
      if (suggestion.components.state) {
        components.push({
          long_name: suggestion.components.state,
          short_name: suggestion.components.state_code || suggestion.components.state,
          types: ['administrative_area_level_1']
        });
      }
      
      // Country
      if (suggestion.components.country) {
        components.push({
          long_name: suggestion.components.country,
          short_name: suggestion.components.country_code?.toUpperCase() || suggestion.components.country,
          types: ['country']
        });
      }
      
      // Postal code
      if (suggestion.components.postcode) {
        components.push({
          long_name: suggestion.components.postcode,
          short_name: suggestion.components.postcode,
          types: ['postal_code']
        });
      }
    }
    
    return components;
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    // If input is cleared, reset suggestions
    if (!e.target.value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputFocus = () => {
    // Show suggestions only if we have query and suggestions
    if (query && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="location-autosuggest-container" ref={autoSuggestRef}>
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder="Search landmarks employees want to work in"
          className="location-search-input"
        />
        {isLoading && (
          <div className="search-loading-indicator">
            <div className="spinner"></div>
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <ul className="location-suggestions-list">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.place_id || index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="suggestion-item"
            >
              <div className="suggestion-main-text">{suggestion.formatted_address}</div>
              {suggestion.components && (
                <div className="suggestion-secondary-text">
                  {[
                    suggestion.components.city,
                    suggestion.components.state,
                    suggestion.components.country
                  ].filter(Boolean).join(', ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default LocationAutoSuggest;