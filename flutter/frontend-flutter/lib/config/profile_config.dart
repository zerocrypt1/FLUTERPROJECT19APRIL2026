// lib/config/profile_config.dart

import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ProfileConfig {

  // ================= BASE URL (Loaded from .env) =================

  static String get _defaultBaseUrl {
    // Flutter Web (Browser) & iOS Simulator
    if (kIsWeb || Platform.isIOS) {
      return 'http://localhost:5050';
    }
    // Android Emulator / Physical Device
    return 'http://10.0.2.2:5050';
  }

  static String get apiBaseUrl =>
      dotenv.env['API_BASE_URL'] ?? _defaultBaseUrl;

  static String get apiVersion =>
      dotenv.env['API_VERSION'] ?? 'v1';

  static String get versionedApiBaseUrl =>
      '$apiBaseUrl/api/$apiVersion';

  static int get requestTimeout =>
      int.tryParse(dotenv.env['REQUEST_TIMEOUT'] ?? '30') ?? 30;

  // ================= PROFILE & FORM DATA ENDPOINTS =================

  // Base URL for user operations: /api/v1/users
  static String get userProfileBaseUrl =>
      '$versionedApiBaseUrl/users';

  // URL for fetching all applicants: /api/formdatas (Unversioned in your structure)
  static String get formDataUrl =>
      '$apiBaseUrl/api/formdatas';

  // --- Utility Methods for specific routes ---

  static String userDetailUrl(String userId) =>
      '$userProfileBaseUrl/$userId'; 

  static String userFavoritesUrl(String userId) =>
      '$userProfileBaseUrl/$userId/favorites';

  static String deleteFavoriteUrl({required String userId, required String applicantId}) =>
      '$userProfileBaseUrl/$userId/favorites/$applicantId';

  // ================= DEBUG =================

  static void printConfig() {
    print('🔧 PROFILE API BASE URL: $apiBaseUrl');
    print('🔧 PROFILE API VERSION: $apiVersion');
  }
}