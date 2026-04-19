import 'package:flutter/material.dart';
import 'dart:async';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart'; // Use ApiService
import 'reset_password_page.dart'; // Import the new reset page
// You will need to replace these with your actual page imports
// import 'home_page.dart'; 
// import 'login_page.dart'; 

class OTPVerificationPage extends StatefulWidget {
  final String email;
  final String tempToken;
  final String verificationType; // 'signup' or 'forgot_password'

  const OTPVerificationPage({
    super.key,
    required this.email,
    required this.tempToken,
    required this.verificationType, // REQUIRED for flow control
  });

  @override
  _OTPVerificationPageState createState() => _OTPVerificationPageState();
}

class _OTPVerificationPageState extends State<OTPVerificationPage> with SingleTickerProviderStateMixin {
  final List<TextEditingController> _controllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  late AnimationController _animationController;
  late Animation<double> _animation;
  String errorMessage = '';
  bool isLoading = false;
  bool isResending = false;
  int _remainingTime = 60; // 60 seconds countdown for resend
  Timer? _timer;
  final storage = FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
    _animationController.forward();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_remainingTime > 0) {
          _remainingTime--;
        } else {
          _timer?.cancel();
        }
      });
    });
  }

  void _resetTimer() {
    setState(() {
      _remainingTime = 60;
    });
    _timer?.cancel();
    _startTimer();
  }

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    _animationController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  // Handle OTP input field focus
  void _onOTPDigitChanged(String value, int index) {
    if (value.length == 1) {
      // Move to next field
      if (index < 5) {
        _focusNodes[index + 1].requestFocus();
      } else {
        _focusNodes[index].unfocus();
        // Verify when all digits are entered
        _verifyOTP();
      }
    }
  }

  Future<void> _verifyOTP() async {
    final otp = _controllers.map((controller) => controller.text).join();
    // Check if all fields are filled
    if (otp.length != 6) {
      return;
    }

    setState(() {
      isLoading = true;
      errorMessage = '';
    });
    
    try {
      // --- FIXED: Use ApiService.verifyOTP (Uses AppConfig) ---
      final result = await ApiService.verifyOTP(
        email: widget.email,
        otp: otp,
        tempToken: widget.tempToken,
      );

      if (result['success']) {
        final data = result['data'];

        // --- FIXED: Logic to handle both flows ---
        if (widget.verificationType == 'forgot_password') {
          // 1. FORGOT PASSWORD FLOW: Go to the Reset Password Page
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => ResetPasswordPage(
                email: widget.email,
                tempToken: widget.tempToken, // Pass the verified tempToken
              ),
            ),
          );
        } else {
          // 2. SIGNUP FLOW: Store credentials and navigate to Home/Login
          final token = data['token'];
          final userId = data['userId'];

          // This function is in your ApiService
          await ApiService.storeUserCredentials(token, userId.toString());

          // Navigate to home page and clear back stack
          // Replace '/home' with your actual home or login route
          Navigator.pushNamedAndRemoveUntil(context, '/home', (_) => false);
        }
      } else {
        // Error response
        setState(() {
          errorMessage = result['message'] ?? "Error: Verification failed";
        });
      }
    } catch (error) {
      // Network or other errors
      setState(() {
        errorMessage = "Connection error. Please try again.";
      });
    } finally {
      if (mounted) {
        setState(() {
          isLoading = false;
        });
      }
    }
  }

  Future<void> _resendOTP() async {
    if (_remainingTime > 0) return;

    setState(() {
      isResending = true;
      errorMessage = '';
    });

    try {
      // --- FIXED: Use ApiService.resendOTP (Uses AppConfig) ---
      final result = await ApiService.resendOTP(
        email: widget.email,
        tempToken: widget.tempToken,
      );

      if (result['success']) {
        setState(() {
          _resetTimer();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('OTP has been resent to your email'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() {
          errorMessage = result['message'] ?? "Failed to resend OTP";
        });
      }
    } catch (error) {
      setState(() {
        errorMessage = "Connection error. Please try again.";
      });
    } finally {
      if (mounted) {
        setState(() {
          isResending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Colors.deepPurple),
        title: Text(
          widget.verificationType == 'forgot_password' ? 'Password Reset OTP' : 'Verify Email',
          style: const TextStyle(color: Colors.deepPurple),
        ),
      ),
      body: FadeTransition(
        opacity: _animation,
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 500),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Email Verification Illustration
                    Container(
                      width: 120,
                      height: 120,
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.deepPurple.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.mark_email_read_outlined,
                        size: 60,
                        color: Colors.deepPurple,
                      ),
                    ),
                    const SizedBox(height: 30),
                    
                    Text(
                      'Email Verification',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: Colors.deepPurple,
                          ),
                    ),
                    Text(
                      'We\'ve sent a verification code to:',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    
                    Text(
                      widget.email,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 40),
                    
                    // OTP Input Fields
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: List.generate(
                        6,
                        (index) => Container(
                          width: 45,
                          height: 55,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.05),
                                spreadRadius: 1,
                                blurRadius: 2,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          child: TextField(
                            controller: _controllers[index],
                            focusNode: _focusNodes[index],
                            onChanged: (value) => _onOTPDigitChanged(value, index),
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.center,
                            maxLength: 1,
                            decoration: InputDecoration(
                              counter: const Offstage(),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(color: Colors.grey.shade300),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Colors.deepPurple, width: 2),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    
                    // Error Message
                    if (errorMessage.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 20),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade100),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Colors.red),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                errorMessage,
                                style: TextStyle(color: Colors.red.shade900),
                              ),
                            ),
                          ],
                        ),
                      ),
                    
                    // Verification Button
                    ElevatedButton(
                      onPressed: isLoading ? null : _verifyOTP,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.deepPurple,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        minimumSize: const Size(double.infinity, 55),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                strokeWidth: 3,
                              ),
                            )
                          : const Text(
                              'Verify Code',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                    ),
                    const SizedBox(height: 24),
                    
                    // Resend OTP Timer
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Didn\'t receive the code? ',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                        TextButton(
                          onPressed: _remainingTime == 0 && !isResending ? _resendOTP : null,
                          child: isResending
                              ? const SizedBox(
                                  height: 16,
                                  width: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.deepPurple),
                                  ),
                                )
                              : Text(
                                  _remainingTime > 0
                                      ? 'Resend in ${_remainingTime}s'
                                      : 'Resend OTP',
                                  style: TextStyle(
                                    color: _remainingTime > 0
                                        ? Colors.grey
                                        : Colors.deepPurple,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}