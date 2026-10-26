import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/auth_token.dart';

/// Keystore/Keychain-backed persistence for the current [AuthToken].
class TokenStore {
  static const _key = 'auth_token';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<void> save(AuthToken token) {
    return _storage.write(key: _key, value: jsonEncode(token.toJson()));
  }

  Future<AuthToken?> read() async {
    final raw = await _storage.read(key: _key);
    if (raw == null) return null;
    try {
      return AuthToken.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      await clear();
      return null;
    }
  }

  Future<void> clear() => _storage.delete(key: _key);
}
