import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/api_service.dart';
import '../config/app_config.dart';
import 'age_filter.dart';
import 'occupation.dart';
import 'gender.dart';
import 'user_profile.dart';
import 'profile.dart'; // Imports the ProfilePage
import 'timing_filter.dart';
import 'location _filter.dart'; 
import 'pricingPage.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final TextEditingController searchController = TextEditingController();
  List<Map<String, dynamic>> applicants = [];
  List<Map<String, dynamic>> filteredApplicants = [];
  
  // Filters
  int? _selectedAgeFilter;
  List<String> _selectedOccupationFilters = [];
  List<String> _selectedTimingFilters = []; 
  List<String> _selectedGenderFilters = []; 
  
  // Location
  Position? _currentPosition;
  double? _customLatitude;
  double? _customLongitude;
  int _searchRadius = 5000;
  String? _landmark;
  bool _useLocationFilter = false;
  
  // UI State
  bool _isLoading = true;
  // NOTE: Set this value based on user subscription status (e.g., true if subscribed)
  final bool _isSubscribed = false; 
  final int _freeApplicantsLimit = 5;

  @override
  void initState() {
    super.initState();
    _fetchApplicantsData();
  }

  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  /// Helper to convert API timing field to List<String> - MOST ROBUST VERSION
  List<String> _parseTiming(dynamic timingData) {
    if (timingData == null) return [];
    
    // Check 1: Is it a list? (Expected format from Mongoose array)
    if (timingData is List) {
      // Safely map all elements to strings and filter out any resulting nulls or empties
      return timingData.map((e) => e?.toString() ?? '').where((e) => e.isNotEmpty).toList();
    } 
    
    // Check 2: Is it a string? (Fallback for comma-separated or single values)
    else if (timingData is String) {
      return timingData.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
    }
    
    return [];
  }

  /// Fetches applicant data from API
  Future<void> _fetchApplicantsData() async {
    setState(() => _isLoading = true);

    try {
      print('📋 Fetching applicants from: ${AppConfig.formDataUrl}');
      
      final result = await ApiService.fetchAllApplicants();

      if (result['success'] == true) {
        final List<dynamic> data = result['data'];
        
        setState(() {
          applicants = data.map((item) => {
            'name': item['name'] ?? '',
            'age': item['age'] ?? 0,
            // FIX: Prioritize 'timming' (the DB field) and fall back to 'timing'
            'timing': _parseTiming(item['timming'] ?? item['timing']), 
            'occupation': item['occupation'] ?? '',
            'gender': item['gender'] ?? '',
            'location': item['location'] ?? {
              'latitude': 0.0,
              'longitude': 0.0
            },
            'landmarks': item['landmarks'] ?? '',
            '_id': item['_id'] ?? '',
            'state': item['state'] ?? 'N/A', // Include state for ProfilePage
          }).toList();
          
          filteredApplicants = applicants;
          _isLoading = false;
        });
        
        print('✅ Loaded ${applicants.length} applicants');
      } else {
        throw Exception(result['message'] ?? 'Failed to load applicants');
      }
    } catch (error) {
      print('❌ Error fetching applicants: $error');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load applicants: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
      
      setState(() => _isLoading = false);
    }
  }

  /// Gets current device location
  Future<void> _getCurrentLocation() async {
    setState(() => _isLoading = true);

    try {
      // Check location services
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        await Geolocator.openLocationSettings();
        setState(() => _isLoading = false);
        return;
      }

      // Check permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() => _isLoading = false);
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location permissions denied permanently'),
            ),
          );
        }
        setState(() => _isLoading = false);
        return;
      }

      // Get position
      Position position = await Geolocator.getCurrentPosition();

      // Get landmark
      String? landmarkText;
      try {
        final response = await http.get(
          Uri.parse(
            'https://api.opencagedata.com/geocode/v1/json?'
            'q=${position.latitude}+${position.longitude}&'
            'key=440c46f29d824bc087c36dc044d089d3&language=en',
          ),
        );

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data['results'] != null && data['results'].isNotEmpty) {
            final components = data['results'][0]['components'];
            landmarkText = components['neighbourhood'] ??
                components['suburb'] ??
                components['town'] ??
                components['city'] ??
                components['county'] ??
                components['state'] ??
                components['country'];
          }
        }

        if (landmarkText == null) {
          List<Placemark> placemarks = await placemarkFromCoordinates(
            position.latitude,
            position.longitude,
          );

          if (placemarks.isNotEmpty) {
            final place = placemarks.first;
            List<String> potentialLandmarks = [
              place.name,
              place.thoroughfare,
              place.subLocality,
              place.locality,
            ].whereType<String>().where((item) => item.isNotEmpty).toList();

            if (potentialLandmarks.isNotEmpty) {
              landmarkText = potentialLandmarks.first;
            }
          }
        }
      } catch (e) {
        print('⚠️  Error getting landmark: $e');
      }

      setState(() {
        _currentPosition = position;
        _customLatitude = position.latitude;
        _customLongitude = position.longitude;
        _useLocationFilter = true;
        _searchRadius = 5000;
        _landmark = landmarkText;
        _isLoading = false;
      });

      _applyFilters();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _landmark != null && _landmark!.isNotEmpty
                  ? 'Showing applicants near $_landmark'
                  : 'Showing nearby applicants',
            ),
          ),
        );
      }
    } catch (e) {
      print('❌ Error getting location: $e');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to get location')),
        );
      }
      
      setState(() => _isLoading = false);
    }
  }

  /// Opens location filter page
  void _openLocationFilterPage() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => LocationFilterPage(
          onLocationSelected: (latitude, longitude, radius, landmark) {
            setState(() {
              _customLatitude = latitude;
              _customLongitude = longitude;
              _searchRadius = radius;
              _landmark = landmark;
              _useLocationFilter = true;
            });
            _applyFilters();
          },
          initialLatitude: _customLatitude,
          initialLongitude: _customLongitude,
          initialRadius: _searchRadius,
          initialLandmark: _landmark,
        ),
      ),
    );
  }

  /// Search handler
  void _searchApplicants(String searchText) {
    _applyFilters(searchText);
  }

  /// Filter handlers
  void _applyAgeFilter(int selectedAge) {
    setState(() => _selectedAgeFilter = selectedAge);
    _applyFilters();
  }

  void _applyOccupationFilter(List<String> selected) {
    setState(() => _selectedOccupationFilters = selected);
    _applyFilters();
  }

  void _applyTimingFilter(List<String> selected) {
    setState(() => _selectedTimingFilters = selected);
    _applyFilters();
  }

  void _applyGenderFilter(List<String> selected) {
    setState(() => _selectedGenderFilters = selected);
    _applyFilters();
  }

  /// Clear location filter
  void _clearLocationFilter() {
    setState(() {
      _useLocationFilter = false;
      _landmark = null;
      _customLatitude = null;
      _customLongitude = null;
    });
    _applyFilters();
  }

  /// Apply all filters (FIXED FOR MULTI-TERM SEARCH)
  void _applyFilters([String searchText = '']) {
    if (searchController.text.isNotEmpty) {
      searchText = searchController.text.toLowerCase().trim();
    }

    // 1. Prepare search terms: Split user input by commas or whitespace
    final List<String> searchTerms = searchText
        .split(RegExp(r'[,\s]+')) // Split by comma OR any whitespace
        .map((e) => e.trim().toLowerCase())
        .where((e) => e.isNotEmpty)
        .toList();
    
    setState(() {
      filteredApplicants = applicants.where((applicant) {
        
        // --- Core Filter Checks (independent of search bar) ---
        
        // Age filter
        bool matchesAge = _selectedAgeFilter == null ||
            (applicant['age'] != null && 
             applicant['age'] >= _selectedAgeFilter!);

        // Occupation filter (from filter chips)
        bool matchesOccupationFilter = _selectedOccupationFilters.isEmpty ||
            (applicant['occupation'] != null &&
             applicant['occupation'] is String && 
             _selectedOccupationFilters.any((filter) => applicant['occupation'].contains(filter)));
        
        // Timing filter
        bool matchesTiming = _selectedTimingFilters.isEmpty ||
            (applicant['timing'] != null && 
             applicant['timing'] is List && 
             (applicant['timing'] as List<String>).any((applicantSlot) => 
                _selectedTimingFilters.contains(applicantSlot)));

        // Gender filter
        bool matchesGender = _selectedGenderFilters.isEmpty ||
            (applicant['gender'] != null &&
             applicant['gender'] is String && 
             _selectedGenderFilters.contains(applicant['gender']));
        
        // --- Search Bar Logic (handles multi-term search for Name & Occupation) ---
        
        bool matchesSearch = true; // Assume true if searchTerms is empty

        if (searchTerms.isNotEmpty) {
             final String applicantNameLower = applicant['name'].toString().toLowerCase();
             final String applicantOccupationStringLower = applicant['occupation']?.toString().toLowerCase() ?? '';
             
             // Split applicant's occupation string into individual roles
             final List<String> applicantRoles = applicantOccupationStringLower
                 .split(RegExp(r'[,\s]+')) // Split by comma or whitespace
                 .map((e) => e.trim())
                 .where((e) => e.isNotEmpty)
                 .toList();

            // Check if ANY search term matches the name OR any occupation role (partial or exact)
            bool foundMatch = false;
            for (final term in searchTerms) {
                // Match 1: Name contains term (fuzzy search)
                if (applicantNameLower.contains(term)) {
                    foundMatch = true;
                    break;
                }
                
                // Match 2: Occupation string contains term (fuzzy search across all roles)
                if (applicantOccupationStringLower.contains(term)) {
                    foundMatch = true;
                    break;
                }
                
                // Match 3 (Alternative/Refined Role Check): If any individual role exactly matches the term
                if (applicantRoles.contains(term)) {
                    foundMatch = true;
                    break;
                }
            }
            matchesSearch = foundMatch;
        }


        // --- Location Filter ---
        bool matchesLocation = true;
        if (_useLocationFilter &&
            _customLatitude != null &&
            _customLongitude != null) {
          // Check landmark match
          bool hasMatchingLandmark = false;
          if (_landmark != null &&
              _landmark!.isNotEmpty &&
              applicant['landmarks'] != null &&
              applicant['landmarks'].toString().isNotEmpty) {
            List<String> appLandmarks = applicant['landmarks']
                .toString()
                .toLowerCase()
                .split(',')
                .map((l) => l.trim())
                .toList();

            String landmarkLower = _landmark!.toLowerCase();
            hasMatchingLandmark = appLandmarks.any((landmark) =>
                landmark.contains(landmarkLower) ||
                landmarkLower.contains(landmark));
          }

          // Check distance if landmark doesn't match
          if (!hasMatchingLandmark) {
            double? appLatitude;
            double? appLongitude;

            // --- LOCATION DATA EXTRACTION ---
            if (applicant['location'] != null && applicant['location'] is Map) {
              final locationMap = applicant['location'] as Map<String, dynamic>;
              
              var lat = locationMap['latitude'];
              var lng = locationMap['longitude'];

              // Safely convert to double from num (int/double) or string
              if (lat is num) {
                appLatitude = lat.toDouble();
              } else if (lat is String) {
                appLatitude = double.tryParse(lat);
              }
              
              if (lng is num) {
                appLongitude = lng.toDouble();
              } else if (lng is String) {
                appLongitude = double.tryParse(lng);
              }
            }
            // --- END LOCATION DATA EXTRACTION ---

            if (appLatitude != null && appLongitude != null) {
              double distance = Geolocator.distanceBetween(
                _customLatitude!,
                _customLongitude!,
                appLatitude,
                appLongitude,
              );
              matchesLocation = distance <= _searchRadius;
            } else {
              // If location data is missing or invalid, assume no match
              matchesLocation = false;
            }
          }
        }
        // --- End Location Filter ---


        // Combine all conditions:
        return matchesSearch &&
            matchesAge &&
            matchesOccupationFilter && // Standard filter chip logic
            matchesTiming && 
            matchesGender &&
            matchesLocation;
      }).toList();

      // Sort by distance
      if (_useLocationFilter &&
          _customLatitude != null &&
          _customLongitude != null) {
        filteredApplicants.sort((a, b) {
          double? distanceA = _calculateDistance(a);
          double? distanceB = _calculateDistance(b);

          if (distanceA == null && distanceB == null) return 0;
          if (distanceA == null) return 1;
          if (distanceB == null) return -1;

          return distanceA.compareTo(distanceB);
        });
      }
    });
  }

  /// Calculate distance helper
  double? _calculateDistance(Map<String, dynamic> applicant) {
    if (!_useLocationFilter ||
        _customLatitude == null ||
        _customLongitude == null ||
        applicant['location'] == null) {
      return null;
    }

    double? appLatitude;
    double? appLongitude;

    if (applicant['location'] is Map) {
      final locationMap = applicant['location'] as Map<String, dynamic>;
      
      var lat = locationMap['latitude'];
      var lng = locationMap['longitude'];

      if (lat is num) {
        appLatitude = lat.toDouble();
      } else if (lat is String) {
        appLatitude = double.tryParse(lat);
      }
      
      if (lng is num) {
        appLongitude = lng.toDouble();
      } else if (lng is String) {
        appLongitude = double.tryParse(lng);
      }
    }

    if (appLatitude == null || appLongitude == null) return null;

    return Geolocator.distanceBetween(
      _customLatitude!,
      _customLongitude!,
      appLatitude,
      appLongitude,
    );
  }

  /// Navigate to pricing
  void _navigateToPricingPage() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const PricingPage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Home Page'),
        elevation: 0,
        actions: [
          IconButton(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const UserProfilePage()),
              );
            },
            icon: const Icon(Icons.person),
          ),
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // Search and location section
              Container(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor.withOpacity(0.1),
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                ),
                child: Column(
                  children: [
                    // Search field
                    TextField(
                      controller: searchController,
                      decoration: InputDecoration(
                        hintText: 'Search by name or occupation...',
                        prefixIcon: const Icon(Icons.search),
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(30),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(vertical: 0),
                      ),
                      onChanged: _searchApplicants,
                    ),
                    const SizedBox(height: 12),

                    // Location buttons
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ElevatedButton.icon(
                          onPressed: _getCurrentLocation,
                          icon: const Icon(Icons.my_location, size: 18),
                          label: const Text('Nearby'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _useLocationFilter &&
                                    _currentPosition != null
                                ? Colors.green
                                : null,
                            foregroundColor: _useLocationFilter &&
                                    _currentPosition != null
                                ? Colors.white
                                : null,
                          ),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton.icon(
                          onPressed: _openLocationFilterPage,
                          icon: const Icon(Icons.location_on, size: 18),
                          label: const Text('Custom'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _useLocationFilter &&
                                    _customLatitude != null &&
                                    _currentPosition == null
                                ? Colors.green
                                : null,
                          ),
                        ),
                        if (_useLocationFilter)
                          IconButton(
                            onPressed: _clearLocationFilter,
                            icon: const Icon(Icons.clear, size: 20),
                            style: IconButton.styleFrom(
                              backgroundColor: Colors.grey[200],
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),

              // Filter chips
              _buildFilterChips(),

              // Location indicator
              if (_useLocationFilter) _buildLocationIndicator(),

              // Applicant list
              Expanded(
                child: _buildApplicantList(),
              ),
            ],
          ),

          // Loading overlay
          if (_isLoading)
            Container(
              color: Colors.black.withOpacity(0.3),
              child: const Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }

  /// Filter chips widget
  Widget _buildFilterChips() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16.0),
        child: Row(
          children: [
            const Icon(Icons.filter_list, size: 20, color: Colors.grey),
            const SizedBox(width: 8),
            _buildFilterChip(
              label:
                  'Age ${_selectedAgeFilter != null ? "($_selectedAgeFilter+)" : ""}',
              selected: _selectedAgeFilter != null,
              onSelected: (selected) {
                if (selected) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => AgeFilterPage(
                        onAgeSelected: _applyAgeFilter,
                        initialAge: _selectedAgeFilter ?? 18,
                      ),
                    ),
                  );
                } else {
                  setState(() => _selectedAgeFilter = null);
                  _applyFilters();
                }
              },
            ),
            const SizedBox(width: 8),
            _buildFilterChip(
              label:
                  'Occupation${_selectedOccupationFilters.isNotEmpty ? " (${_selectedOccupationFilters.length})" : ""}',
              selected: _selectedOccupationFilters.isNotEmpty,
              onSelected: (selected) {
                if (selected) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => OccupationFilterPage(
                        onOccupationSelected: _applyOccupationFilter,
                        initialOccupations: _selectedOccupationFilters,
                      ),
                    ),
                  );
                } else {
                  setState(() => _selectedOccupationFilters = []);
                  _applyFilters();
                }
              },
            ),
            const SizedBox(width: 8),
            _buildFilterChip(
              label:
                  'Timing${_selectedTimingFilters.isNotEmpty ? " (${_selectedTimingFilters.length})" : ""}',
              selected: _selectedTimingFilters.isNotEmpty,
              onSelected: (selected) {
                if (selected) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => TimingFilterPage(
                        onTimingSelected: _applyTimingFilter,
                        initialTimings: _selectedTimingFilters,
                      ),
                    ),
                  );
                } else {
                  setState(() => _selectedTimingFilters = []);
                  _applyFilters();
                }
              },
            ),
            const SizedBox(width: 8),
            _buildFilterChip(
              label:
                  'Gender${_selectedGenderFilters.isNotEmpty ? " (${_selectedGenderFilters.length})" : ""}',
              selected: _selectedGenderFilters.isNotEmpty,
              onSelected: (selected) {
                if (selected) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => GenderFilterPage(
                        onGenderSelected: _applyGenderFilter,
                        initialGenders: _selectedGenderFilters,
                      ),
                    ),
                  );
                } else {
                  setState(() => _selectedGenderFilters = []);
                  _applyFilters();
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Filter chip helper
  Widget _buildFilterChip({
    required String label,
    required bool selected,
    required Function(bool) onSelected,
  }) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      showCheckmark: false,
      backgroundColor: Colors.grey[100],
      selectedColor: Colors.blue.shade100,
      labelStyle: TextStyle(
        color: selected ? Colors.blue.shade800 : Colors.black87,
        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
      ),
    );
  }

  /// Location indicator
  Widget _buildLocationIndicator() {
    return Container(
      margin: const EdgeInsets.only(bottom: 8.0),
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.place, size: 14, color: Colors.blue),
          const SizedBox(width: 4),
          Text(
            _landmark != null && _landmark!.isNotEmpty
                ? 'Near "$_landmark" (${(_searchRadius / 1000).toStringAsFixed(1)} km)'
                : 'Within ${(_searchRadius / 1000).toStringAsFixed(1)} km',
            style: TextStyle(fontSize: 12, color: Colors.blue.shade800),
          ),
        ],
      ),
    );
  }

  /// Applicant list widget (FIXED PAYMENT GATING)
  Widget _buildApplicantList() {
    if (filteredApplicants.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _useLocationFilter ? Icons.location_off : Icons.search_off,
              size: 50,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            Text(
              _useLocationFilter
                  ? 'No applicants found in this location'
                  : 'No applicants match your filters',
              style: const TextStyle(fontSize: 16, color: Colors.grey),
            ),
            TextButton(
              onPressed: () {
                setState(() {
                  _useLocationFilter = false;
                  _landmark = null;
                  _selectedAgeFilter = null;
                  _selectedOccupationFilters = [];
                  _selectedTimingFilters = [];
                  _selectedGenderFilters = [];
                  searchController.clear();
                });
                _applyFilters();
              },
              child: const Text('Clear All Filters'),
            ),
          ],
        ),
      );
    }
    
    // Check if we need to show the banner (i.e., if there are hidden applicants)
    final bool shouldShowBanner = !_isSubscribed && filteredApplicants.length > _freeApplicantsLimit;


    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            // Use the full count so users can scroll and see the locked cards
            itemCount: filteredApplicants.length, 
            
            itemBuilder: (context, index) {
              
              final applicant = filteredApplicants[index];
              final distance = _calculateDistance(applicant);

              // --- PAYMENT GATING LOGIC ---
              // If the user is NOT subscribed AND the current index is AT or beyond the limit, 
              // apply the blur/lock effect.
              if (!_isSubscribed && index >= _freeApplicantsLimit) {
                
                return Opacity(
                  opacity: 0.4,
                  child: Stack(
                    children: [
                      // Show the actual applicant card underneath the blur
                      _buildApplicantCard(applicant, distance),
                      
                      // Blur/Lock Overlay
                      Positioned.fill(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
                            child: Container(
                              color: Colors.transparent,
                              child: Center(
                                child: Icon(
                                  Icons.lock,
                                  color: Colors.white.withOpacity(0.8),
                                  size: 28,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }

              // Show the card normally.
              return _buildApplicantCard(applicant, distance);
            },
          ),
        ),
        
        // --- SUBSCRIPTION BANNER ---
        if (shouldShowBanner)
          _buildSubscriptionBanner(),
      ],
    );
  }

  /// Subscription banner
  Widget _buildSubscriptionBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade500, Colors.purple.shade500],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Text(
            'Unlock ${filteredApplicants.length - _freeApplicantsLimit} More Applicants',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _navigateToPricingPage,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: Colors.blue.shade700,
              ),
              child: const Text('View Subscription Plans'),
            ),
          ),
        ],
      ),
    );
  }

  /// Applicant card
  Widget _buildApplicantCard(Map<String, dynamic> applicant, double? distance) {
    // 1. Correctly cast applicant['timing'] which is guaranteed to be List<String> by _parseTiming
    final List<String> timings = applicant['timing'] as List<String>;
    final String timingDisplay = timings.isNotEmpty ? timings.join(', ') : 'Not specified';

    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: () {
          // Navigating and passing the applicant map with the correct 'timing' list
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ProfilePage(applicant: applicant),
            ),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [Colors.blue.shade300, Colors.blue.shade600],
                  ),
                ),
                child: const Icon(Icons.person, size: 30, color: Colors.white),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      applicant['name'],
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 6),
                    // Display Age, Gender, and Occupation on one line
                    Text(
                      '${applicant['age']} • ${applicant['gender']} • ${applicant['occupation']}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    // Display Time slots - Using the correctly formatted string
                    Text(
                      'Timing: $timingDisplay',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (distance != null)
                      Text('${distance.round()} m away',
                          style: const TextStyle(color: Colors.blue, fontSize: 12)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }
}