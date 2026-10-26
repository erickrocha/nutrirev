import 'package:dio/dio.dart';

import '../models/eat.dart';
import '../models/page_response.dart';
import 'base_service.dart';
import 'dio_client.dart';

class EatService {
  /// NOTE: `page`/`size` are plain snake_case query params on this
  /// endpoint (confirmed backend behavior).
  static Future<PageResponse<Eat>> getEatPage({
    int page = 1,
    int size = 20,
  }) async {
    try {
      final response = await DioClient.instance.dio.get(
        '/eat/page',
        queryParameters: {'page': page, 'size': size},
      );
      return PageResponse.fromJson<Eat>(
        response.data as Map<String, dynamic>,
        Eat.fromJson,
      );
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao buscar receitas');
    }
  }
}
