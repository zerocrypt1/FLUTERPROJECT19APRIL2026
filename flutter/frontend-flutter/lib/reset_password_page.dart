import 'package:flutter/material.dart';
import '../services/api_service.dart';
// Replace with your actual login page import path
// import 'login_page.dart'; 

class ResetPasswordPage extends StatefulWidget {
  final String email;
  final String tempToken; // This token is verified by OTP

  const ResetPasswordPage({
    super.key,
    required this.email,
    required this.tempToken,
  });

  @override
  State<ResetPasswordPage> createState() => _ResetPasswordPageState();
}

class _ResetPasswordPageState extends State<ResetPasswordPage> {
  // --- ADDED BACK THE OTP CONTROLLER ---
  final TextEditingController _otpController = TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  bool _isPasswordVisible = false;
  bool _isConfirmPasswordVisible = false;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    // --- DISPOSE OTP CONTROLLER ---
    _otpController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _resetPassword() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // --- FIXED: Pass the actual OTP value ---
      final result = await ApiService.resetPassword(
        email: widget.email,
        otp: _otpController.text, // Sending the 6-digit input
        tempToken: widget.tempToken,
        newPassword: _newPasswordController.text,
      );

      if (result['success']) {
        _showSuccessDialog();
      } else {
        setState(() {
          _errorMessage = result['message'] ?? 'Password reset failed.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'An unexpected error occurred: $e';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Success!'),
        content: const Text('Your password has been successfully reset. You can now log in.'),
        actions: <Widget>[
          TextButton(
            child: const Text('Go to Login'),
            onPressed: () {
              Navigator.of(ctx).pop(); // Close dialog
              
              Navigator.pushNamedAndRemoveUntil(
                context, 
                '/login', 
                (Route<dynamic> route) => false,
              );
            },
          )
        ],
      ),
    );
  }

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String label,
    required bool isVisible,
    required VoidCallback onToggleVisibility,
    bool isConfirmation = false,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: !isVisible,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.lock_outline),
        border: const OutlineInputBorder(),
        suffixIcon: IconButton(
          icon: Icon(
            isVisible ? Icons.visibility : Icons.visibility_off,
            color: Colors.grey,
          ),
          onPressed: onToggleVisibility,
        ),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter a password.';
        }
        if (value.length < 6) {
          return 'Password must be at least 6 characters.';
        }
        if (isConfirmation && value != _newPasswordController.text) {
          return 'Passwords do not match.';
        }
        return null;
      },
    );
  }

  Widget _buildOtpField() {
    return TextFormField(
      controller: _otpController,
      keyboardType: TextInputType.number,
      maxLength: 6,
      decoration: const InputDecoration(
        labelText: 'Verification Code (OTP)',
        prefixIcon: Icon(Icons.vpn_key_outlined),
        border: OutlineInputBorder(),
        counterText: '',
      ),
      validator: (value) {
        if (value == null || value.length != 6) {
          return 'Please re-enter the 6-digit OTP.';
        }
        return null;
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Set New Password'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              const Text(
                'Enter the verification code and set a new secure password for your account.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 30),

              // --- OTP FIELD (Re-introduced) ---
              _buildOtpField(),
              const SizedBox(height: 20),

              // --- NEW PASSWORD FIELD ---
              _buildPasswordField(
                controller: _newPasswordController,
                label: 'New Password',
                isVisible: _isPasswordVisible,
                onToggleVisibility: () {
                  setState(() => _isPasswordVisible = !_isPasswordVisible);
                },
              ),
              const SizedBox(height: 20),

              // --- CONFIRM PASSWORD FIELD ---
              _buildPasswordField(
                controller: _confirmPasswordController,
                label: 'Confirm New Password',
                isVisible: _isConfirmPasswordVisible,
                onToggleVisibility: () {
                  setState(() => _isConfirmPasswordVisible = !_isConfirmPasswordVisible);
                },
                isConfirmation: true, // Mark this for validation check
              ),
              const SizedBox(height: 30),

              if (_errorMessage != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 20.0),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                ),

              ElevatedButton(
                onPressed: _isLoading ? null : _resetPassword,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.deepPurple,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Colors.white))
                    : const Text(
                        'Set New Password',
                        style: TextStyle(fontSize: 18, color: Colors.white),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}