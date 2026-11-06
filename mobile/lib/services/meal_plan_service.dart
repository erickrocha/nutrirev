import 'package:dio/dio.dart';

import '../models/meal_plan.dart';
import '../models/page_response.dart';
import 'base_service.dart';
import 'dio_client.dart';

class MealPlanService {
  /// NOTE: `patient_id`/`page`/`size` are plain snake_case query params on
  /// this endpoint (confirmed backend behavior), unlike the camelCase JSON
  /// body fields used everywhere else.
  static Future<PageResponse<MealPlan>> getMealPlanPage({
    required int patientId,
    int page = 1,
    int size = 10,
  }) async {
    try {
      final response = await DioClient.instance.dio.get(
        '/meal-plan/page',
        queryParameters: {'patient_id': patientId, 'page': page, 'size': size},
      );
      return PageResponse.fromJson<MealPlan>(
        response.data as Map<String, dynamic>,
        MealPlan.fromJson,
      );
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao buscar cardápio');
    }
  }
}
