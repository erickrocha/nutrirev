import 'package:dio/dio.dart';

import '../models/auth_token.dart';
import 'base_service.dart';
import 'dio_client.dart';

class AuthService {
  static Future<AuthToken> login(String email, String password) async {
    try {
      final response = await DioClient.instance.plainDio.post(
        '/login',
        data: {'email': email, 'password': password},
        options: Options(contentType: Headers.formUrlEncodedContentType),
      );
      return AuthToken.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao efetuar login');
    }
  }

  static Future<AuthToken> refresh(String refreshToken) async {
    try {
      final response = await DioClient.instance.plainDio.post(
        '/refresh',
        data: {'refreshToken': refreshToken},
      );
      return AuthToken.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Sessão expirada');
    }
  }
}
