import 'meal_analysis.dart';

class MealLogResponse {
  final String logId;
  final int dailyMealId;
  final String mealDate;
  final String analysisId;
  final List<FoodItemAnalysis> items;
  final MealMacros totals;
  final String? photo;
  final String createdAt;
  final int? pointsAwarded;

  const MealLogResponse({
    required this.logId,
    required this.dailyMealId,
    required this.mealDate,
    required this.analysisId,
    required this.items,
    required this.totals,
    this.photo,
    required this.createdAt,
    this.pointsAwarded,
  });

  factory MealLogResponse.fromJson(Map<String, dynamic> json) {
    return MealLogResponse(
      logId: json['log_id'] as String? ?? '',
      dailyMealId: json['daily_meal_id'] as int? ?? 0,
      mealDate: json['meal_date'] as String? ?? '',
      analysisId: json['analysis_id'] as String? ?? '',
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => FoodItemAnalysis.fromJson(e as Map<String, dynamic>))
          .toList(),
      totals: MealMacros.fromJson(
        (json['totals'] as Map<String, dynamic>?) ?? {},
      ),
      photo: json['photo'] as String?,
      createdAt: json['created_at'] as String? ?? '',
      pointsAwarded: json['points_awarded'] as int?,
    );
  }
}
