import 'package:flutter/foundation.dart';

import '../models/auth_token.dart';
import '../services/auth_service.dart';
import '../services/base_service.dart';
import '../services/dio_client.dart';
import '../services/user_service.dart';

enum AuthStatus { bootstrapping, unauthenticated, firstLogin, authenticated }

class AuthProvider extends ChangeNotifier {
  AuthProvider() {
    DioClient.instance.onSessionExpired = _handleSessionExpired;
    bootstrap();
  }

  AuthStatus _status = AuthStatus.bootstrapping;
  AuthToken? _token;
  String? _error;
  bool _submitting = false;

  AuthStatus get status => _status;
  AuthToken? get token => _token;
  String? get error => _error;
  bool get submitting => _submitting;

  Future<void> bootstrap() async {
    _status = AuthStatus.bootstrapping;
    notifyListeners();

    final stored = await DioClient.instance.tokenStore.read();
    if (stored == null) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    _token = stored;
    DioClient.instance.setAuthHeader(stored.accessToken);

    if (!stored.isExpired) {
      _status = stored.firstLogin
          ? AuthStatus.firstLogin
          : AuthStatus.authenticated;
      notifyListeners();
      return;
    }

    final refreshToken = stored.refreshToken;
    if (refreshToken == null) {
      await _handleSessionExpired();
      return;
    }

    try {
      final refreshed = await AuthService.refresh(refreshToken);
      _token = refreshed;
      await DioClient.instance.tokenStore.save(refreshed);
      DioClient.instance.setAuthHeader(refreshed.accessToken);
      _status = refreshed.firstLogin
          ? AuthStatus.firstLogin
          : AuthStatus.authenticated;
    } catch (_) {
      await DioClient.instance.tokenStore.clear();
      DioClient.instance.clearAuthHeader();
      _token = null;
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login(
    String email,
    String password, {
    String fallbackError =
        'Could not connect. Check your connection and try again.',
  }) async {
    _submitting = true;
    _error = null;
    notifyListeners();

    try {
      final token = await AuthService.login(email, password);
      _token = token;
      await DioClient.instance.tokenStore.save(token);
      DioClient.instance.setAuthHeader(token.accessToken);
      _status = token.firstLogin
          ? AuthStatus.firstLogin
          : AuthStatus.authenticated;
      _submitting = false;
      notifyListeners();
      return true;
    } on AppException catch (e) {
      _error = e.message;
      _submitting = false;
      notifyListeners();
      return false;
    } catch (_) {
      _error = fallbackError;
      _submitting = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> completeFirstLogin(
    String newPassword, {
    String fallbackError =
        'Could not save your new password. Please try again.',
  }) async {
    final current = _token;
    if (current == null) return false;

    _submitting = true;
    _error = null;
    notifyListeners();

    try {
      await UserService.changePassword(
        userId: current.userId,
        newPassword: newPassword,
      );
      _token = current.copyWith(firstLogin: false);
      await DioClient.instance.tokenStore.save(_token!);
      _status = AuthStatus.authenticated;
      _submitting = false;
      notifyListeners();
      return true;
    } on AppException catch (e) {
      _error = e.message;
      _submitting = false;
      notifyListeners();
      return false;
    } catch (_) {
      _error = fallbackError;
      _submitting = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() => _handleSessionExpired();

  Future<void> _handleSessionExpired() async {
    await DioClient.instance.tokenStore.clear();
    DioClient.instance.clearAuthHeader();
    _token = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
