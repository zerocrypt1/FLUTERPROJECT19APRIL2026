import 'package:flutter/material.dart';

class OccupationFilterPage extends StatefulWidget {
  final Function(List<String>) onOccupationSelected;
  final List<String> initialOccupations;

  const OccupationFilterPage({
    super.key,
    required this.onOccupationSelected,
    required this.initialOccupations,
  });

  @override
  _OccupationFilterPageState createState() => _OccupationFilterPageState();
}

class _OccupationFilterPageState extends State<OccupationFilterPage> {
  // List of currently selected occupations (predefined + custom)
  final List<String> _selectedOccupations = [];
  
  // Controller for the custom occupation input field
  final TextEditingController _customOccupationController = TextEditingController();
  
  // Storage for the user-entered custom occupation, used to track if it should be in _selectedOccupations
  String? _currentCustomOccupation;

  // The fixed list of occupations from the database/default options
  final List<String> _dbOccupations = [
    'sweepres',
    'Backend Developer',
    'Mobile Developer',
    'Tester',
    'Peoples team',
    'Finance',
    'Devops',
  ];

  @override
  void initState() {
    super.initState();
    _initializeSelectedOccupations();
  }
  
  void _initializeSelectedOccupations() {
    // Separate initial selected list into DB and custom entries
    for (var occupation in widget.initialOccupations) {
      if (_dbOccupations.contains(occupation)) {
        _selectedOccupations.add(occupation);
      } else {
        // This is a previously saved custom occupation
        _currentCustomOccupation = occupation;
        _customOccupationController.text = occupation;
      }
    }
  }

  @override
  void dispose() {
    _customOccupationController.dispose();
    super.dispose();
  }

  // Handle the selection of a predefined occupation
  void _toggleDbOccupation(String occupation, bool selected) {
    setState(() {
      if (selected) {
        _selectedOccupations.add(occupation);
      } else {
        _selectedOccupations.remove(occupation);
      }
    });
  }

  // Handle changes in the custom occupation text field
  void _handleCustomOccupationChange(String value) {
    final trimmedValue = value.trim();
    
    // Clear the existing custom occupation if one was set
    if (_currentCustomOccupation != null) {
      _selectedOccupations.remove(_currentCustomOccupation);
    }

    if (trimmedValue.isNotEmpty) {
      // Set the new custom occupation and add it to the selected list
      _currentCustomOccupation = trimmedValue;
      _selectedOccupations.add(trimmedValue);
    } else {
      // Clear the custom occupation if the text field is empty
      _currentCustomOccupation = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[200], // Light background
      appBar: AppBar(
        automaticallyImplyLeading: false, // Disable default back arrow
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Padding( // Add padding to the left of the Occupation heading
              padding: EdgeInsets.only(left: 4.0), // Reduced left padding to align with body
              child: Text(
                'Occupation',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: Colors.black),
              onPressed: () {
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- Custom Occupation Input ---
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: TextField(
                controller: _customOccupationController,
                onChanged: _handleCustomOccupationChange,
                decoration: InputDecoration(
                  labelText: 'Enter a custom occupation (Optional)',
                  hintText: 'e.g., Electrician, Nurse, Manager',
                  prefixIcon: const Icon(Icons.work_outline),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 20),
            
            // --- Predefined Occupations List ---
            Text(
              'Select from common occupations:',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 10),
            
            Expanded(
              child: ListView.builder(
                itemCount: _dbOccupations.length,
                itemBuilder: (context, index) {
                  final occupation = _dbOccupations[index];
                  return CheckboxListTile(
                    title: Text(occupation),
                    // Check if the current occupation is in the selected list
                    value: _selectedOccupations.contains(occupation),
                    onChanged: (selected) {
                      _toggleDbOccupation(occupation, selected ?? false);
                    },
                    controlAffinity: ListTileControlAffinity.leading,
                    activeColor: Colors.deepPurple, // Checkbox color
                    tileColor: Colors.white, // Background color for the list tile
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10),
                  );
                },
              ),
            ),
            const SizedBox(height: 20),
            
            // --- Save Button ---
            Center(
              child: ElevatedButton(
                onPressed: () {
                  // Final filtered list ensures no duplicates and includes the custom entry
                  final resultList = _selectedOccupations.toSet().toList();
                  
                  // Send the final list back to the previous page
                  widget.onOccupationSelected(resultList);
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.deepPurple,
                  padding: const EdgeInsets.symmetric(horizontal: 120, vertical: 20),
                  textStyle: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                child: const Text('Save', style: TextStyle(color: Colors.white)),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}