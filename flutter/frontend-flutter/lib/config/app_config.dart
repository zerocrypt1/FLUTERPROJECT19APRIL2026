import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  AppConfig._(); // prevent instantiation

  /* =========================================================
     BASE URL CONFIG
     ========================================================= */

  static String get _defaultBaseUrl {
    // Flutter Web & iOS Simulator
    if (kIsWeb || Platform.isIOS) {
      return 'http://localhost:5050';
    }

    // Android Emulator
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:5050';
    }

    // Fallback
    return 'http://localhost:5050';
  }

  /// Base backend URL
  static String get apiBaseUrl =>
      (dotenv.env['API_BASE_URL']?.trim().isNotEmpty ?? false)
          ? dotenv.env['API_BASE_URL']!.trim()
          : _defaultBaseUrl;

  /// API version
  static String get apiVersion =>
      (dotenv.env['API_VERSION']?.trim().isNotEmpty ?? false)
          ? dotenv.env['API_VERSION']!.trim()
          : 'v1';

  /// 🔑 MAIN BASE URL (USE THIS EVERYWHERE)
  static String get versionedApiBaseUrl =>
      '$apiBaseUrl/api/$apiVersion';

  /* =========================================================
     AUTH ENDPOINTS
     ========================================================= */

  static String get authSignupUrl => '$versionedApiBaseUrl/auth/signup';
  static String get authVerifyOtpUrl => '$versionedApiBaseUrl/auth/verify-otp';
  static String get authResendOtpUrl => '$versionedApiBaseUrl/auth/resend-otp';
  static String get authSigninUrl => '$versionedApiBaseUrl/auth/signin';
  static String get authSigninEmailUrl => '$versionedApiBaseUrl/auth/signin-email';
  static String get authForgotPasswordUrl => '$versionedApiBaseUrl/auth/forgot-password';
  static String get authResetPasswordUrl => '$versionedApiBaseUrl/auth/reset-password';
  static String get authGoogleUrl => '$versionedApiBaseUrl/auth/google';

  /* =========================================================
     USER ENDPOINTS
     ========================================================= */

  static String get usersBaseUrl => '$versionedApiBaseUrl/users';
  static String get userProfileUrl => usersBaseUrl;
  static String getUserProfile(String userId) => '$usersBaseUrl/$userId';
  static String updateUserProfile(String userId) => '$usersBaseUrl/$userId';
  static String changePassword(String userId) => '$usersBaseUrl/$userId/password';
  static String updateUserLocation(String userId) => '$usersBaseUrl/$userId/location';
  static String getUserFavorites(String userId) => '$usersBaseUrl/$userId/favorites';
  static String addToFavorites(String userId) => '$usersBaseUrl/$userId/favorites';
  static String removeFromFavorites(String userId, String applicantId) =>
      '$usersBaseUrl/$userId/favorites/$applicantId';

  /* =========================================================
     FORM / DIRECTORY ENDPOINTS
     ========================================================= */

  static String get formsBaseUrl => '$versionedApiBaseUrl/forms';
  static String get formDataUrl => formsBaseUrl;
  static String getAllForms() => formsBaseUrl;
  static String getFormById(String formId) => '$formsBaseUrl/$formId';
  static String createForm() => formsBaseUrl;
  static String updateForm(String formId) => '$formsBaseUrl/$formId';
  static String deleteForm(String formId) => '$formsBaseUrl/$formId';
  static String checkPhoneAvailability() => '$formsBaseUrl/check-phone';

  /* =========================================================
     LOCATION ENDPOINTS (NEW - GOOGLE MAPS INTEGRATION)
     ========================================================= */

  static String get locationBaseUrl => '$versionedApiBaseUrl/location';
  static String get geocodeUrl => '$locationBaseUrl/geocode';
  static String get reverseGeocodeUrl => '$locationBaseUrl/reverse-geocode';
  static String get elevationUrl => '$locationBaseUrl/elevation';
  static String get distanceMatrixUrl => '$locationBaseUrl/distance';

  /* =========================================================
     PAYMENT & CONFIG ENDPOINTS
     ========================================================= */

  static String get razorpayOrderUrl => '$versionedApiBaseUrl/payments/razorpay/order';
  static String get pricingPlansUrl => '$versionedApiBaseUrl/config/pricing';

  /* =========================================================
     GOOGLE CLIENT IDS (FLUTTER SIDE)
     ========================================================= */

  static String get googleWebClientId => dotenv.env['GOOGLE_WEB_CLIENT_ID'] ?? '';
  static String get googleAndroidClientId => dotenv.env['GOOGLE_ANDROID_CLIENT_ID'] ?? '';
  static String get googleIosClientId => dotenv.env['GOOGLE_IOS_CLIENT_ID'] ?? '';

  /* =========================================================
     NETWORK CONFIG
     ========================================================= */

  static Duration get requestTimeout => Duration(
        seconds: int.tryParse(dotenv.env['REQUEST_TIMEOUT'] ?? '30') ?? 30,
      );

  /* =========================================================
     DEBUG & VALIDATION
     ========================================================= */

  static void printConfig() {
    debugPrint('══════════════ API CONFIG ══════════════');
    debugPrint('BASE URL        : $apiBaseUrl');
    debugPrint('API VERSION     : $apiVersion');
    debugPrint('VERSIONED BASE  : $versionedApiBaseUrl');
    debugPrint('');
    debugPrint('AUTH SIGNIN     : $authSigninUrl');
    debugPrint('AUTH GOOGLE     : $authGoogleUrl');
    debugPrint('USERS BASE      : $usersBaseUrl');
    debugPrint('FORMS BASE      : $formsBaseUrl');
    debugPrint('PAYMENT ORDER   : $razorpayOrderUrl');
    debugPrint('PRICING PLANS   : $pricingPlansUrl');
    debugPrint('GEOCODE URL     : $geocodeUrl');
    debugPrint('REVERSE GEO URL : $reverseGeocodeUrl');
    debugPrint('════════════════════════════════════════');
  }

  static bool validateConfig() {
    final errors = <String>[];
    if (apiBaseUrl.isEmpty) errors.add('API_BASE_URL missing');
    if (googleWebClientId.isEmpty && googleAndroidClientId.isEmpty && googleIosClientId.isEmpty) {
      errors.add('Google OAuth Client IDs missing');
    }

    if (errors.isNotEmpty) {
      debugPrint('❌ CONFIG ERRORS');
      for (final e in errors) debugPrint('• $e');
      return false;
    }
    debugPrint('✅ AppConfig validated successfully');
    return true;
  }
}