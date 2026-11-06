import 'package:dio/dio.dart';

import '../models/app_user.dart';
import 'base_service.dart';
import 'dio_client.dart';

class UserService {
  static Future<AppUser> getUser(int userId) async {
    try {
      final response = await DioClient.instance.dio.get('/user/$userId');
      return AppUser.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao buscar usuário');
    }
  }

  /// Fetches the current user record first, then PUTs it back with only
  /// the password and firstLogin flag changed — avoids clobbering
  /// role/enabled/name/email by resending hardcoded values.
  static Future<AppUser> changePassword({
    required int userId,
    required String newPassword,
  }) async {
    final current = await getUser(userId);
    final updated = current.copyWith(password: newPassword, firstLogin: false);
    try {
      final response = await DioClient.instance.dio.put(
        '/user/$userId',
        data: updated.toJson(),
      );
      return AppUser.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao atualizar senha');
    }
  }
}
