import 'package:dio/dio.dart';

class AppException implements Exception {
  final int statusCode;
  final String message;

  /// The server's stable error code, when it sent one. The message is
  /// translated prose meant for the customer; this is what code branches on.
  final String? errorKey;

  AppException({required this.statusCode, required this.message, this.errorKey});

  @override
  String toString() => 'AppException($statusCode): $message';
}

abstract class BaseService {
  static AppException handleDioError(DioException error, String fallback) {
    final statusCode = error.response?.statusCode ?? 0;
    String message = fallback;

    String? errorKey;
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      message = (data['message'] as String?) ?? fallback;
      errorKey = data['errorKey'] as String?;
    } else if (error.message != null) {
      message = error.message!;
    }

    return AppException(
      statusCode: statusCode,
      message: message,
      errorKey: errorKey,
    );
  }
}
