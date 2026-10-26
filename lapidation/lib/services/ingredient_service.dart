import 'package:dio/dio.dart';

import '../models/ingredient.dart';
import 'base_service.dart';
import 'dio_client.dart';

class IngredientService {
  static Future<List<Ingredient>> getIngredients() async {
    try {
      final response = await DioClient.instance.dio.get('/ingredient');
      return (response.data as List<dynamic>)
          .map((e) => Ingredient.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw BaseService.handleDioError(
        e,
        'Falha ao buscar catálogo de ingredientes',
      );
    }
  }

  static Future<Ingredient> getIngredientById(int id) async {
    try {
      final response = await DioClient.instance.dio.get('/ingredient/$id');
      return Ingredient.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(
        e,
        'Falha ao buscar dados do ingrediente',
      );
    }
  }
}
