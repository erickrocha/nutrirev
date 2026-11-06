import 'package:dio/dio.dart';

import '../models/customer_daily_meal.dart';
import '../models/daily_meal.dart';
import 'base_service.dart';
import 'dio_client.dart';

class DailyMealService {
  static Future<List<DailyMeal>> getDailyMeals() async {
    try {
      final response = await DioClient.instance.dio.get('/daily-meal');
      return (response.data as List<dynamic>)
          .map((e) => DailyMeal.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw BaseService.handleDioError(
        e,
        'Falha ao buscar categorias de refeição',
      );
    }
  }

  static Future<List<CustomerDailyMeal>> getCustomerDailyMeals(
    int customerId,
  ) async {
    try {
      final response = await DioClient.instance.dio.get(
        '/customer-daily-meal/customer/$customerId',
      );
      return (response.data as List<dynamic>)
          .map((e) => CustomerDailyMeal.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw BaseService.handleDioError(
        e,
        'Falha ao buscar refeições do cliente',
      );
    }
  }
}
