import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../config/app_config.dart';
import '../services/api_service.dart';
import 'otp.dart'; // Contains OTPVerificationPage

class SignInSignUpPage extends StatefulWidget {
  const SignInSignUpPage({super.key});

  @override
  _SignInSignUpPageState createState() => _SignInSignUpPageState();
}

class _SignInSignUpPageState extends State<SignInSignUpPage> 
    with SingleTickerProviderStateMixin {
  
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  
  bool isSignIn = true;
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  
  bool isPasswordVisible = false;
  bool isConfirmPasswordVisible = false;
  String errorMessage = '';
  bool isLoading = false;
  bool isSuccess = false;
  String successMessage = '';
  
  late AnimationController _animationController;
  late Animation<double> _animation;
  late GoogleSignIn _googleSignIn;

@override
void initState() {
  super.initState();

  _animationController = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 300),
  );

  _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
    CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ),
  );

  _animationController.forward();

  _googleSignIn = GoogleSignIn(
    clientId: kIsWeb ? AppConfig.googleWebClientId : null,
    scopes: const [
      'openid',   // 🔥 MUST
      'email',
      'profile',
    ],
  );
}



  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  void _handleAuth() async {
    if (isLoading) return;

    if (_formKey.currentState?.validate() != true) {
      setState(() => errorMessage = 'Please correct the errors in the form.');
      return; 
    }

    setState(() {
      isLoading = true;
      errorMessage = '';
      successMessage = '';
      isSuccess = false;
    });

    try {
      if (isSignIn) {
        await _signIn();
      } else {
        await _signUp();
      }
    } catch (e) {
      setState(() {
        errorMessage = 'An unexpected error occurred';
        isLoading = false;
      });
    }
  }

  Future<void> _signIn() async {
    try {
      final result = await ApiService.signin(
        phone: _phoneController.text.trim(),
        password: _passwordController.text,
      );

      if (result['success']) {
        final data = result['data'];
        
        // Handle Email Verification Required
        if (data['emailVerificationRequired'] == true && 
            data['tempToken'] != null) {
          
          if (!mounted) return;
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => OTPVerificationPage(
                email: data['email'] ?? '', 
                tempToken: data['tempToken'],
                verificationType: 'signin_verification',
              ),
            ),
          ).then((_) => setState(() {}));
        } else {
          // Success: Credentials already stored by ApiService usually, 
          // but we ensure it here if your signin response returns user info directly
          if (data['token'] != null && (data['user'] != null || data['userId'] != null)) {
            await ApiService.storeUserCredentials(
              data['token'],
              data['user']?['_id'] ?? data['userId'],
            );
          }
          
          if (mounted) Navigator.pushReplacementNamed(context, '/home');
        }
      } else {
        setState(() => errorMessage = result['message'] ?? 'Sign in failed');
      }
    } catch (e) {
      setState(() => errorMessage = 'Sign in failed: $e');
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  Future<void> _signUp() async {
    try {
      final result = await ApiService.signup(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        address: _addressController.text.trim(),
        phone: _phoneController.text.trim(),
        password: _passwordController.text,
      );

      if (result['success']) {
        final data = result['data'];
        
        if (data['tempToken'] != null) {
          if (!mounted) return;
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => OTPVerificationPage(
                email: _emailController.text.trim(),
                tempToken: data['tempToken'],
                verificationType: 'signup',
              ),
            ),
          ).then((_) {
            setState(() {
              isSuccess = true;
              successMessage = 'Registration successful! Verify OTP to continue.'; 
              isSignIn = true;
              _clearFields();
            });
          });
        }
      } else {
        setState(() => errorMessage = result['message'] ?? 'Sign up failed');
      }
    } catch (e) {
      setState(() => errorMessage = 'Sign up failed: $e');
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }
Future<void> _handleGoogleSignIn() async {
  setState(() {
    isLoading = true;
    errorMessage = '';
  });

  try {
    GoogleSignInAccount? googleUser;

    if (kIsWeb) {
      // ✅ Web-safe: try silent sign-in
      googleUser = await _googleSignIn.signInSilently();
    } else {
      // ✅ Android / iOS
      googleUser = await _googleSignIn.signIn();
    }

    if (googleUser == null) {
      setState(() {
        errorMessage = 'Google sign-in cancelled';
        isLoading = false;
      });
      return;
    }

    final googleAuth = await googleUser.authentication;

    debugPrint("ID TOKEN => ${googleAuth.idToken}");
    debugPrint("ACCESS TOKEN => ${googleAuth.accessToken}");

    if (googleAuth.idToken == null) {
      setState(() {
        errorMessage =
            'Google ID Token not available on Web. Use Google button flow.';
        isLoading = false;
      });
      return;
    }

    final result =
        await ApiService.googleAuth(idToken: googleAuth.idToken!);

    if (result['success']) {
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/home');
      }
    } else {
      setState(() => errorMessage = result['message'] ?? 'Google login failed');
    }
  } catch (e) {
    setState(() => errorMessage = 'Google Error: $e');
  } finally {
    if (mounted) setState(() => isLoading = false);
  }
}


  void _clearFields() {
    _nameController.clear();
    _emailController.clear();
    _addressController.clear();
    _phoneController.clear();
    _passwordController.clear();
    _confirmPasswordController.clear();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth < 600;

    return Scaffold(
      body: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.deepPurple.withOpacity(0.05), Colors.white],
              ),
            ),
          ),
          FadeTransition(
            opacity: _animation,
            child: Center(
              child: SingleChildScrollView(
                padding: EdgeInsets.symmetric(
                  horizontal: isSmallScreen ? 20.0 : screenWidth * 0.1,
                  vertical: 40,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 450),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        _buildLogo(),
                        const SizedBox(height: 20),
                        _buildToggleButtons(),
                        const SizedBox(height: 30),
                        _buildHeading(),
                        const SizedBox(height: 30),
                        if (isSuccess) _buildSuccessMessage(),
                        if (errorMessage.isNotEmpty) _buildErrorMessage(),
                        _buildFormFields(),
                        const SizedBox(height: 25),
                        _buildSubmitButton(),
                        const SizedBox(height: 20),
                        _buildDivider(),
                        const SizedBox(height: 20),
                        _buildGoogleButton(),
                        if (isSignIn) _buildForgotPassword(),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          if (isLoading) _buildLoadingOverlay(),
        ],
      ),
    );
  }

  // --- Sub-Widgets for Cleanliness ---

  Widget _buildLogo() {
    return Hero(
      tag: 'appLogo',
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.deepPurple.withOpacity(0.8),
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.person, color: Colors.white, size: 40),
      ),
    );
  }

  Widget _buildLoadingOverlay() {
    return Container(
      color: Colors.black.withOpacity(0.3),
      child: const Center(child: CircularProgressIndicator(color: Colors.white)),
    );
  }

  Widget _buildToggleButtons() {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: ToggleButtons(
        borderRadius: BorderRadius.circular(16),
        constraints: const BoxConstraints(minWidth: 110, minHeight: 45),
        isSelected: [isSignIn, !isSignIn],
        selectedColor: Colors.white,
        fillColor: Colors.deepPurple,
        color: Colors.grey.shade600,
        onPressed: (index) {
          setState(() {
            isSignIn = index == 0;
            errorMessage = '';
            isSuccess = false;
          });
        },
        children: const [Text("Sign In"), Text("Sign Up")],
      ),
    );
  }

  Widget _buildHeading() {
    return Column(
      children: [
        Text(
          isSignIn ? "Welcome Back" : "Create Account",
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.deepPurple),
        ),
        const SizedBox(height: 8),
        Text(
          isSignIn ? "Sign in to continue" : "Fill out the form to get started",
          style: TextStyle(color: Colors.grey.shade600),
        ),
      ],
    );
  }

  Widget _buildSuccessMessage() {
    return Container(
      margin: const EdgeInsets.only(bottom: 15),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        const Icon(Icons.check_circle, color: Colors.green),
        const SizedBox(width: 10),
        Expanded(child: Text(successMessage, style: TextStyle(color: Colors.green.shade900)))
      ]),
    );
  }

  Widget _buildErrorMessage() {
    return Container(
      margin: const EdgeInsets.only(bottom: 15),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        const Icon(Icons.error, color: Colors.red),
        const SizedBox(width: 10),
        Expanded(child: Text(errorMessage, style: TextStyle(color: Colors.red.shade900)))
      ]),
    );
  }

  Widget _buildFormFields() {
    return Column(
      children: [
        if (!isSignIn) ...[
          _buildTextField(_nameController, "Full Name", Icons.person_outline),
          const SizedBox(height: 16),
          _buildTextField(_emailController, "Email", Icons.email_outlined, keyboardType: TextInputType.emailAddress),
          const SizedBox(height: 16),
          _buildTextField(_addressController, "Address", Icons.home_outlined),
          const SizedBox(height: 16),
        ],
        _buildTextField(_phoneController, "Phone", Icons.phone_outlined, keyboardType: TextInputType.phone),
        const SizedBox(height: 16),
        _buildTextField(
          _passwordController, "Password", Icons.lock_outline,
          isPassword: true,
          isPasswordVisible: isPasswordVisible,
          onToggle: () => setState(() => isPasswordVisible = !isPasswordVisible),
        ),
        if (!isSignIn) ...[
          const SizedBox(height: 16),
          _buildTextField(
            _confirmPasswordController, "Confirm Password", Icons.lock_outline,
            isPassword: true,
            isPasswordVisible: isConfirmPasswordVisible,
            onToggle: () => setState(() => isConfirmPasswordVisible = !isConfirmPasswordVisible),
          ),
        ],
      ],
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label,
    IconData icon, {
    bool isPassword = false,
    bool isPasswordVisible = false,
    VoidCallback? onToggle,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: isPassword && !isPasswordVisible,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: Colors.deepPurple),
        suffixIcon: isPassword 
            ? IconButton(icon: Icon(isPasswordVisible ? Icons.visibility : Icons.visibility_off), onPressed: onToggle)
            : null,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        filled: true,
        fillColor: Colors.white,
      ),
      validator: (val) {
        if (val == null || val.isEmpty) return "$label is required";
        if (label == "Confirm Password" && val != _passwordController.text) return "Passwords do not match";
        if (label == "Email" && !val.contains("@")) return "Invalid email";
        if (label == "Password" && val.length < 6) return "Min 6 characters";
        return null;
      },
    );
  }

  Widget _buildSubmitButton() {
    return ElevatedButton(
      onPressed: isLoading ? null : _handleAuth,
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.deepPurple,
        minimumSize: const Size(double.infinity, 55),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: Text(isSignIn ? "Sign In" : "Get Started", style: const TextStyle(color: Colors.white, fontSize: 16)),
    );
  }

  Widget _buildDivider() {
    return const Row(children: [
      Expanded(child: Divider()),
      Padding(padding: EdgeInsets.symmetric(horizontal: 10), child: Text("OR")),
      Expanded(child: Divider()),
    ]);
  }

  Widget _buildGoogleButton() {
    return OutlinedButton.icon(
      onPressed: isLoading ? null : _handleGoogleSignIn,
      icon: const Icon(Icons.g_mobiledata, size: 30, color: Colors.blue),
      label: Text(isSignIn ? "Sign in with Google" : "Sign up with Google"),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }

  Widget _buildForgotPassword() {
    return TextButton(
      onPressed: () => Navigator.pushNamed(context, '/forgot-password'),
      child: const Text("Forgot Password?", style: TextStyle(color: Colors.deepPurple)),
    );
  }
}