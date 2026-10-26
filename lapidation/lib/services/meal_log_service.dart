import 'package:dio/dio.dart';

import '../models/meal_log.dart';
import 'base_service.dart';
import 'dio_client.dart';

class MealLogService {
  static Future<MealLogResponse> saveMealLog({
    required int dailyMealId,
    required DateTime mealDate,
    required String analysisId,
  }) async {
    try {
      final response = await DioClient.instance.dio.post(
        '/v1/meals/log',
        data: {
          'daily_meal_id': dailyMealId,
          'meal_date': mealDate.toIso8601String().split('T').first,
          'analysis_id': analysisId,
        },
      );

      return MealLogResponse.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Failed to save meal to your log.');
    }
  }

  static Future<List<MealLogResponse>> getLogsForDate(DateTime date) async {
    try {
      final response = await DioClient.instance.dio.get(
        '/v1/meals/log',
        queryParameters: {'date': date.toIso8601String().split('T').first},
      );

      return (response.data as List<dynamic>)
          .map((e) => MealLogResponse.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Failed to load your logged meals.');
    }
  }
}
