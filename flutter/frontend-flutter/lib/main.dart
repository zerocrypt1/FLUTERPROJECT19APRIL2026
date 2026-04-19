import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'config/app_config.dart';
import 'sign_in_sign_up_page.dart';
import 'forgot_password_page.dart';
import 'home_page.dart';      
import 'PaymentPage.dart';    

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Load .env with the correct filename matching your pubspec.yaml
  try {
    await dotenv.load(fileName: ".env"); 
    debugPrint("✅ Dotenv initialized");
  } catch (e) {
    debugPrint("⚠️ Could not load .env file: $e");
  }

  // 2. Safe Google Sign-In Init
  if (kIsWeb) {
    try {
      // Access AppConfig ONLY if dotenv loaded to prevent NotInitializedError
      if (dotenv.isInitialized) {
        final clientId = AppConfig.googleWebClientId;
        if (clientId.isNotEmpty) {
          GoogleSignIn(
            clientId: clientId,
            scopes: ['email', 'profile'],
          );
          debugPrint("✅ Google Sign-In Web initialized");
        }
      }
    } catch (e) {
      debugPrint("❌ Google Sign-In Web Init failed: $e");
    }
  }

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final storage = const FlutterSecureStorage();
  bool isLoading = true;
  bool isLoggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    try {
      final token = await storage.read(key: 'authToken');
      if (mounted) {
        setState(() {
          isLoggedIn = token != null;
          isLoading = false;
        });
      }
    } catch (e) {
      debugPrint("Storage read error: $e");
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: isLoading
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : isLoggedIn ? const HomePage() : const SignInSignUpPage(),
      routes: {
        '/forgot-password': (context) => const ForgotPasswordPage(),
        '/home': (context) => const HomePage(),
        '/sign-in-sign-up': (context) => const SignInSignUpPage(),
        '/payment': (context) => const PaymentPage(),
      },
    );
  }
}