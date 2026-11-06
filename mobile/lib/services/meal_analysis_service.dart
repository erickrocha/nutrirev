import 'dart:async';
import 'dart:typed_data';
import 'package:dio/dio.dart';

import '../models/ingredient.dart';
import '../models/meal_analysis.dart';
import 'base_service.dart';
import 'dio_client.dart';

class MealAnalysisService {
  static const Duration _pollInterval = Duration(seconds: 2);
  static const Duration _maxWait = Duration(minutes: 5);

  /// Submits the photo and returns immediately with the job id ("processing").
  /// The backend runs the actual AI call in the background so this call is fast.
  static Future<MealAnalysisResponse> submitMealAnalysis(
    Uint8List imageBytes, {
    required int dailyMealId,
    required DateTime mealDate,
    String filename = 'meal.jpg',
    String? mealType,
  }) async {
    try {
      final formDataMap = <String, dynamic>{
        'image': MultipartFile.fromBytes(imageBytes, filename: filename),
        'daily_meal_id': dailyMealId.toString(),
        'meal_date': mealDate.toIso8601String().split('T').first,
      };
      if (mealType != null && mealType.isNotEmpty) {
        formDataMap['meal_type'] = mealType;
      }

      final formData = FormData.fromMap(formDataMap);

      final response = await DioClient.instance.dio.post(
        '/v1/meals/analyze',
        data: formData,
      );

      return MealAnalysisResponse.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw _mapError(e, 'Failed to submit meal image for analysis.');
    }
  }

  /// Fetches the current status of a previously submitted job. Returns the full
  /// result once the backend has finished (status "completed").
  static Future<MealAnalysisResponse> pollMealAnalysisStatus(
    String analysisId,
  ) async {
    try {
      final response = await DioClient.instance.dio.get(
        '/v1/meals/analyze/$analysisId',
      );
      return MealAnalysisResponse.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw _mapError(e, 'Failed to check meal analysis status.');
    }
  }

  /// Submits the photo, then polls until the analysis completes or [_maxWait]
  /// elapses. Each individual HTTP call stays well under the client's timeout,
  /// no matter how long the overall AI analysis takes.
  static Future<MealAnalysisResponse> analyzeMealAndWait(
    Uint8List imageBytes, {
    required int dailyMealId,
    required DateTime mealDate,
    String filename = 'meal.jpg',
    String? mealType,
  }) async {
    final submitted = await submitMealAnalysis(
      imageBytes,
      dailyMealId: dailyMealId,
      mealDate: mealDate,
      filename: filename,
      mealType: mealType,
    );

    if (submitted.isCompleted) {
      return submitted;
    }
    if (submitted.analysisId.isEmpty) {
      throw AppException(
        statusCode: 0,
        message: 'The server did not return an analysis job id.',
      );
    }

    final deadline = DateTime.now().add(_maxWait);
    while (DateTime.now().isBefore(deadline)) {
      await Future.delayed(_pollInterval);
      final status = await pollMealAnalysisStatus(submitted.analysisId);
      if (status.isCompleted) {
        return status;
      }
    }

    throw AppException(
      statusCode: 0,
      message:
          'Meal analysis is taking longer than expected. Please try again shortly.',
    );
  }

  /// Submits manual ingredients and quantities to the manual calculation endpoint.
  static Future<MealAnalysisResponse> analyzeMealManual({
    required int dailyMealId,
    required DateTime mealDate,
    required List<ManualMealItemInput> items,
  }) async {
    try {
      final payload = <String, dynamic>{
        'daily_meal_id': dailyMealId,
        'meal_date': mealDate.toIso8601String().split('T').first,
        'items': items.map((e) => e.toJson()).toList(),
      };

      final response = await DioClient.instance.dio.post(
        '/v1/meals/analyze/manual',
        data: payload,
      );

      return MealAnalysisResponse.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw _mapError(e, 'Failed to submit manual meal analysis.');
    }
  }

  static AppException _mapError(DioException e, String fallback) {
    if (e.response != null && e.response?.data is Map<String, dynamic>) {
      final data = e.response!.data as Map<String, dynamic>;
      final message = data['message'] as String?;
      if (message != null && message.isNotEmpty) {
        return AppException(
          statusCode: e.response?.statusCode ?? 400,
          message: message,
        );
      }
    }
    return BaseService.handleDioError(e, fallback);
  }
}
