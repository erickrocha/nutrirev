class MealAnalysisResponse {
  final String schemaVersion;
  final String provider;
  final String analysisId;
  final String status;
  final List<FoodItemAnalysis> items;
  final MealMacros totals;
  final String createdAt;
  final int? pointsAwarded;
  final String? analysisType;
  final int? dailyMealId;

  const MealAnalysisResponse({
    required this.schemaVersion,
    required this.provider,
    required this.analysisId,
    required this.status,
    required this.items,
    required this.totals,
    required this.createdAt,
    this.pointsAwarded,
    this.analysisType,
    this.dailyMealId,
  });

  bool get isProcessing => status == 'pending' || status == 'processing';
  bool get isCompleted => status == 'completed';

  factory MealAnalysisResponse.fromJson(Map<String, dynamic> json) {
    return MealAnalysisResponse(
      schemaVersion: json['schema_version'] as String? ?? '1.0',
      provider: json['provider'] as String? ?? '',
      analysisId: (json['analysis_id'] ?? json['log_id']) as String? ?? '',
      status: json['status'] as String? ?? 'completed',
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => FoodItemAnalysis.fromJson(e as Map<String, dynamic>))
          .toList(),
      totals: MealMacros.fromJson(
        (json['totals'] as Map<String, dynamic>?) ?? {},
      ),
      createdAt: json['created_at'] as String? ?? '',
      pointsAwarded: (json['points_awarded'] as num?)?.toInt(),
      analysisType: json['analysis_type'] as String?,
      dailyMealId: (json['daily_meal_id'] as num?)?.toInt(),
    );
  }
}

class FoodItemAnalysis {
  final String name;
  final num? estimatedGrams;
  final num calories;
  final num proteinG;
  final num carbsG;
  final num fatG;
  final String? confidence;

  const FoodItemAnalysis({
    required this.name,
    this.estimatedGrams,
    required this.calories,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
    this.confidence,
  });

  factory FoodItemAnalysis.fromJson(Map<String, dynamic> json) {
    return FoodItemAnalysis(
      name: json['name'] as String? ?? '',
      estimatedGrams: json['estimated_grams'] as num?,
      calories: json['calories'] as num? ?? 0,
      proteinG: json['protein_g'] as num? ?? 0,
      carbsG: json['carbs_g'] as num? ?? 0,
      fatG: json['fat_g'] as num? ?? 0,
      confidence: json['confidence'] as String?,
    );
  }
}

class MealMacros {
  final num calories;
  final num proteinG;
  final num carbsG;
  final num fatG;

  const MealMacros({
    required this.calories,
    required this.proteinG,
    required this.carbsG,
    required this.fatG,
  });

  factory MealMacros.fromJson(Map<String, dynamic> json) {
    return MealMacros(
      calories: json['calories'] as num? ?? 0,
      proteinG: json['protein_g'] as num? ?? 0,
      carbsG: json['carbs_g'] as num? ?? 0,
      fatG: json['fat_g'] as num? ?? 0,
    );
  }
}
