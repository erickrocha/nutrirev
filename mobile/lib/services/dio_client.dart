import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../config/api_config.dart';
import 'auth_service.dart';
import 'base_service.dart';
import 'token_store.dart';

/// Central Dio access point.
///
/// Holds two [Dio] instances:
/// - [dio]: used for every authenticated call. Carries the current
///   Authorization header and has [_AuthRetryInterceptor] attached, which
///   transparently refreshes an expired access token on a 401 and retries
///   the original request.
/// - [plainDio]: has no interceptor and is used only by [AuthService] for
///   `/login` and `/refresh` themselves, so those calls can never
///   recursively re-trigger the retry interceptor.
class DioClient {
  DioClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: ApiConfig.timeout,
        receiveTimeout: ApiConfig.timeout,
        sendTimeout: ApiConfig.timeout,
      ),
    );
    _plainDio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: ApiConfig.timeout,
        receiveTimeout: ApiConfig.timeout,
        sendTimeout: ApiConfig.timeout,
      ),
    );
    _dio.interceptors.add(_AuthRetryInterceptor(this));
  }

  static final DioClient instance = DioClient._internal();

  late final Dio _dio;
  late final Dio _plainDio;
  final TokenStore tokenStore = TokenStore();

  /// Set once by AuthProvider's constructor; invoked when a refresh
  /// ultimately fails (refresh token itself expired/invalid) so the app can
  /// force the user back to the login screen.
  VoidCallback? onSessionExpired;

  Dio get dio => _dio;
  Dio get plainDio => _plainDio;

  void setAuthHeader(String accessToken) {
    _dio.options.headers['Authorization'] = 'Bearer $accessToken';
  }

  void clearAuthHeader() {
    _dio.options.headers.remove('Authorization');
  }

  Completer<String>? _refreshCompleter;

  /// Refreshes the access token, joining an already-in-flight refresh if
  /// one exists so concurrent 401s only trigger a single `/refresh` call.
  Future<String> refreshAccessToken() {
    final inFlight = _refreshCompleter;
    if (inFlight != null) return inFlight.future;

    final completer = Completer<String>();
    _refreshCompleter = completer;

    _doRefresh()
        .then((token) {
          setAuthHeader(token);
          completer.complete(token);
        })
        .catchError((Object e) async {
          await tokenStore.clear();
          clearAuthHeader();
          onSessionExpired?.call();
          completer.completeError(e);
        })
        .whenComplete(() {
          _refreshCompleter = null;
        });

    return completer.future;
  }

  Future<String> _doRefresh() async {
    final stored = await tokenStore.read();
    final refreshToken = stored?.refreshToken;
    if (refreshToken == null) {
      throw AppException(
        statusCode: 401,
        message: 'No refresh token available',
      );
    }
    final refreshed = await AuthService.refresh(refreshToken);
    await tokenStore.save(refreshed);
    return refreshed.accessToken;
  }
}

class _AuthRetryInterceptor extends Interceptor {
  _AuthRetryInterceptor(this._client);

  final DioClient _client;

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final path = err.requestOptions.path;
    final isAuthEndpoint = path.contains('/login') || path.contains('/refresh');
    final alreadyRetried = err.requestOptions.extra['retried'] == true;

    if (err.response?.statusCode == 401 && !isAuthEndpoint && !alreadyRetried) {
      try {
        final newToken = await _client.refreshAccessToken();
        final retryOptions = err.requestOptions
          ..headers['Authorization'] = 'Bearer $newToken'
          ..extra['retried'] = true;
        final response = await _client.dio.fetch(retryOptions);
        return handler.resolve(response);
      } catch (_) {
        // Refresh itself failed; session already cleared by refreshAccessToken.
        return handler.next(err);
      }
    }
    return handler.next(err);
  }
}
