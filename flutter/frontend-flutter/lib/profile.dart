import 'package:flutter/material.dart';
import '../services/api_service.dart'; // Ensure ApiService is correctly imported

class ProfilePage extends StatefulWidget {
  final Map<String, dynamic> applicant;

  const ProfilePage({super.key, required this.applicant});

  @override
  _ProfilePageState createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  bool _isFavorited = false;
  bool _isLoading = true;
  bool _isLoadingAction = false;
  Map<String, dynamic> _fullApplicantData = {};
  
  /// FIXED: Helper function to safely format any data type to String
  /// Prevents "instance of JSArray" errors
  String _formatValue(dynamic value) {
    if (value == null) return 'N/A';
    
    // Handle Lists/Arrays
    if (value is List) {
      if (value.isEmpty) return 'N/A';
      
      return value.map((item) {
        if (item is Map) {
          return item['name']?.toString() ?? 
                 item['title']?.toString() ?? 
                 item['value']?.toString() ??
                 item.toString();
        } else if (item is List) {
          return item.join(', ');
        }
        return item.toString();
      }).join(', ');
    }
    
    // Handle Maps/Objects
    if (value is Map) {
      return value['name']?.toString() ?? 
             value['title']?.toString() ?? 
             value['value']?.toString() ??
             value.toString();
    }
    
    // Handle numbers
    if (value is int || value is double) {
      return value.toString();
    }
    
    // Handle everything else
    return value.toString();
  }

  /// FIXED: Helper to safely parse and map applicant data
  Map<String, dynamic> _processApplicantData(Map<String, dynamic> item) {
    // Helper to parse timing, adapted from HomePage logic:
    List<String> parseTiming(dynamic timingData) {
      if (timingData == null) return [];
      
      // If already a list of strings, return as is
      if (timingData is List) {
        return timingData.map((e) {
          if (e is Map) {
            return e['name']?.toString() ?? e['title']?.toString() ?? e.toString();
          }
          return e?.toString() ?? '';
        }).where((e) => e.isNotEmpty).toList();
      }
      
      // If it's a string, split by comma
      if (timingData is String) {
        return timingData.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
      }
      
      // If it's a map, try to extract name/title
      if (timingData is Map) {
        return [timingData['name']?.toString() ?? timingData['title']?.toString() ?? timingData.toString()];
      }
      
      return [];
    }
    
    // Apply robust field mapping:
    return {
      'name': _formatValue(item['name']) != 'N/A' ? item['name'] : 'N/A',
      'age': item['age'] ?? 0,
      'occupation': _formatValue(item['occupation']),
      // FIX: Use the confirmed API key 'timming' (with two m's) as primary source
      'timing': parseTiming(item['timming'] ?? item['timing']), 
      'gender': _formatValue(item['gender'] ?? item['sex']),
      'state': _formatValue(item['state'] ?? item['addressState']),
      'phoneNumber': _formatValue(item['phoneNumber'] ?? item['phone']),
      'address': _formatValue(item['address']),
      'landmarks': _formatValue(item['landmarks']),
      '_id': item['_id'] ?? item['id'],
    };
  }

  @override
  void initState() {
    super.initState();
    // Use the name from the initial widget data to fetch the full data
    _fetchFullApplicantData(widget.applicant['name']);
  }

  // Fetch complete applicant data from backend
  Future<void> _fetchFullApplicantData(String? applicantName) async {
    if (applicantName == null) {
      setState(() {
        _isLoading = false;
        _fullApplicantData = _processApplicantData(widget.applicant); 
      });
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // 1. Fetch all applicants using ApiService
      final applicantsResult = await ApiService.fetchAllApplicants();

      if (applicantsResult['success'] == true) {
        final List<dynamic> allApplicants = applicantsResult['data'];
        
        // Find the matching applicant using the name
        final matchingApplicant = allApplicants.firstWhere(
          (applicant) => applicant['name'] == applicantName,
          orElse: () => null,
        );

        if (matchingApplicant != null) {
          final processedData = _processApplicantData(matchingApplicant);
          
          setState(() {
            _fullApplicantData = processedData;
          });
          
          // 2. Check favorites using the full applicant ID
          final applicantId = processedData['_id'];
          if (applicantId != null) {
             await _checkIfFavorited(applicantId);
          }
        } else {
          // If not found, fall back to initial widget data
          _fullApplicantData = _processApplicantData(widget.applicant);
          throw Exception('Applicant not found in API response');
        }
      } else {
        // Fall back to initial widget data if API call fails
        _fullApplicantData = _processApplicantData(widget.applicant);
        throw Exception(applicantsResult['message'] ?? 'Failed to load applicants');
      }
    } catch (e) {
      print("Error fetching applicant data: $e");
      // Use initial data if API fails completely
      if (_fullApplicantData.isEmpty) {
        _fullApplicantData = _processApplicantData(widget.applicant);
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _checkIfFavorited(String applicantId) async {
    try {
      // Assuming ApiService.fetchCurrentUserProfile exists
      final profileResult = await ApiService.fetchCurrentUserProfile();
      
      if (profileResult['success'] == true) {
        final data = profileResult['data'];
        final List<dynamic> favorites = data['favorites'] ?? [];
        
        setState(() {
          _isFavorited = favorites.contains(applicantId);
        });
      }
    } catch (e) {
      print("Error checking if favorited: $e");
    }
  }

  Future<void> _toggleFavorite() async {
    final applicantId = _fullApplicantData['_id'];
    if (applicantId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot update favorites: Missing applicant ID')),
      );
      return;
    }

    setState(() {
      _isLoadingAction = true;
    });

    try {
      Map<String, dynamic> result;
      String successMessage;

      if (_isFavorited) {
        // Assuming ApiService.removeFromFavorites exists
        result = await ApiService.removeFromFavorites(applicantId);
        successMessage = 'Removed from favorites';
      } else {
        // Assuming ApiService.addToFavorites exists
        result = await ApiService.addToFavorites(applicantId);
        successMessage = 'Added to favorites';
      }
      
      if (result['success'] == true) {
        setState(() {
          _isFavorited = !_isFavorited;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(successMessage)),
        );
      } else {
        throw Exception(result['message'] ?? 'Failed to update favorites');
      }
    } catch (e) {
      print("Error toggling favorite: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error updating favorites: ${e.toString()}')),
      );
    } finally {
      setState(() {
        _isLoadingAction = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Use the processed data once loading is done, otherwise use the initial widget data
    final Map<String, dynamic> displayData = _isLoading 
        ? _processApplicantData(widget.applicant) 
        : _fullApplicantData.isNotEmpty 
            ? _fullApplicantData 
            : _processApplicantData(widget.applicant);
            
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 600;

    // Extract values using the processed map keys with safe formatting
    final List<String> timings = displayData['timing'] is List 
        ? List<String>.from(displayData['timing']) 
        : [];
        
    final String gender = _formatValue(displayData['gender']);
    final String state = _formatValue(displayData['state']);
    final String occupation = _formatValue(displayData['occupation']);
    final String age = _formatValue(displayData['age']);
    final String phoneNumber = _formatValue(displayData['phoneNumber']);
    final String landmarks = _formatValue(displayData['landmarks']);
    final String name = _formatValue(displayData['name']);
    
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          'Applicant Profile', 
          style: TextStyle(
            fontWeight: FontWeight.w600, 
            color: Colors.grey[800],
            fontSize: 20,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        shadowColor: Colors.grey.withOpacity(0.1),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios, color: Colors.grey[700], size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              color: _isFavorited ? Colors.amber.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: Icon(
                _isFavorited ? Icons.star : Icons.star_border,
                color: _isFavorited ? Colors.amber[600] : Colors.grey[600],
                size: 24,
              ),
              onPressed: displayData['_id'] == null || _isLoadingAction 
                  ? null 
                  : _toggleFavorite,
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF4F46E5)),
              ),
            )
          : SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: isTablet ? 40 : 20, 
                  vertical: 20
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Enhanced Profile Header
                    Center(
                      child: Column(
                        children: [
                          Container(
                            width: isTablet ? 160 : 140,
                            height: isTablet ? 160 : 140,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(
                                colors: [
                                  const Color(0xFF4F46E5).withOpacity(0.1),
                                  const Color(0xFF7C3AED).withOpacity(0.1),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF4F46E5).withOpacity(0.2),
                                  spreadRadius: 2,
                                  blurRadius: 20,
                                  offset: const Offset(0, 8),
                                )
                              ],
                            ),
                            child: Container(
                              margin: const EdgeInsets.all(8),
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                image: DecorationImage(
                                  // Use a dynamic/placeholder image here if possible
                                  image: NetworkImage('https://picsum.photos/200/200?random=1'), 
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          Text(
                            name,
                            style: TextStyle(
                              fontSize: isTablet ? 28 : 24,
                              fontWeight: FontWeight.w700,
                              color: Colors.grey[800],
                              letterSpacing: 0.5,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF4F46E5).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              occupation,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF4F46E5),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 40),

                    // Enhanced Timing Section
                    _buildSectionTitle('Availability Schedule', Icons.schedule),
                    _buildTimingCard(timings), 
                    const SizedBox(height: 24),

                    // Professional Information Section
                    _buildSectionTitle('Professional Information', Icons.work),
                    _buildInfoCard([
                      _buildDetailRow('Occupation', occupation, Icons.badge),
                    ]),
                    const SizedBox(height: 24),

                    // Personal Details Section
                    _buildSectionTitle('Personal Details', Icons.person),
                    _buildInfoCard([
                      _buildDetailRow('Gender', gender, Icons.person_outline), 
                      _buildDetailRow('Age', age, Icons.cake),
                      _buildDetailRow('Phone', phoneNumber, Icons.phone),
                    ]),
                    const SizedBox(height: 24),

                    // Location Information Section
                    _buildSectionTitle('Location Information', Icons.location_on),
                    _buildInfoCard([
                      // Address is intentionally removed as requested
                      _buildDetailRow('Landmarks', landmarks, Icons.place),
                      _buildDetailRow('State', state, Icons.map), 
                    ]),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
    );
  }

  /// FIXED: Enhanced timing card with better UI and proper data formatting
  Widget _buildTimingCard(dynamic timings) {
    List<String> timingList = [];
    
    if (timings is List) {
      timingList = timings.map((t) => _formatValue(t)).where((t) => t != 'N/A').toList();
    }

    if (timingList.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.08),
              spreadRadius: 1,
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
          border: Border.all(color: Colors.grey[100]!),
        ),
        child: Center(
          child: Text(
            'No available schedule provided',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 16,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.08),
            spreadRadius: 1,
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
        border: Border.all(color: Colors.grey[100]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF4F46E5).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.access_time,
                  size: 20,
                  color: Color(0xFF4F46E5),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Available Times',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey[800],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: timingList.map((timing) => _buildTimingChip(timing)).toList(), 
          ),
        ],
      ),
    );
  }

  /// Individual timing chip with proper formatting
  Widget _buildTimingChip(String timing) {
    // Format the timing string safely
    final formattedTiming = _formatValue(timing);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF4F46E5).withOpacity(0.1),
            const Color(0xFF7C3AED).withOpacity(0.1),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF4F46E5).withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Text(
        formattedTiming, 
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Color(0xFF4F46E5),
        ),
      ),
    );
  }

  // Enhanced section title with icon
  Widget _buildSectionTitle(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF4F46E5).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              size: 20,
              color: const Color(0xFF4F46E5),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.grey[800],
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  // Enhanced info card with better styling
  Widget _buildInfoCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.08),
            spreadRadius: 1,
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
        border: Border.all(color: Colors.grey[100]!),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: children,
      ),
    );
  }

  /// FIXED: Enhanced detail row with icons and safe value formatting
  Widget _buildDetailRow(String label, String value, IconData icon) {
    // Safely format the value to prevent "instance of JSArray" errors
    final formattedValue = _formatValue(value);
    
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(
              icon,
              size: 16,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
                fontSize: 15,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              formattedValue,
              style: TextStyle(
                color: Colors.grey[900],
                fontWeight: FontWeight.w600,
                fontSize: 15,
              ),
              textAlign: TextAlign.end,
              overflow: TextOverflow.ellipsis,
              maxLines: 2,
            ),
          ),
        ],
      ),
    );
  }
}