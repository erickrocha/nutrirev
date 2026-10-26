import 'package:dio/dio.dart';

import '../models/dashboard_summary.dart';
import 'base_service.dart';
import 'dio_client.dart';

class DashboardService {
  static Future<DashboardSummary> getToday() async {
    try {
      final responses = await Future.wait([
        DioClient.instance.dio.get('/v1/meals/summary'),
        DioClient.instance.dio.get('/v1/points/me'),
      ]);
      final nutrition = responses[0].data as Map<String, dynamic>;
      final points = responses[1].data as Map<String, dynamic>;
      return DashboardSummary(
        caloriesConsumed: (nutrition['calories_consumed'] as num? ?? 0)
            .toDouble(),
        mealsLogged: (nutrition['meals_logged'] as num? ?? 0).toInt(),
        totalPoints: (points['total_points'] as num? ?? 0).toInt(),
      );
    } on DioException catch (error) {
      throw BaseService.handleDioError(
        error,
        'Could not load your daily progress.',
      );
    }
  }
}
