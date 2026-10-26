/// Maps the backend's `MealPlanJson` (`GET /meal-plan/page?patient_id=`).
///
/// `*Macros` and nested `ingredient` shapes aren't confirmed against real
/// payloads yet, so they're kept as raw `Map`/`dynamic` rather than typed
/// fields, to avoid silent data loss or crashes on unexpected shapes.
class MealPlan {
  final int? id;
  final String? uuid;
  final int? tenantId;
  final String name;
  final String category;
  final String generationStatus;
  final bool viewed;
  final bool isFavorite;
  final String? generatedAt;
  final int? nutritionistId;
  final int? patientId;
  final List<MealPlanMeal> meals;
  final Map<String, dynamic>? totalMacros;

  const MealPlan({
    this.id,
    this.uuid,
    this.tenantId,
    required this.name,
    required this.category,
    required this.generationStatus,
    required this.viewed,
    required this.isFavorite,
    this.generatedAt,
    this.nutritionistId,
    this.patientId,
    this.meals = const [],
    this.totalMacros,
  });

  factory MealPlan.fromJson(Map<String, dynamic> json) {
    return MealPlan(
      id: json['id'] as int?,
      uuid: json['uuid'] as String?,
      tenantId: json['tenantId'] as int?,
      name: json['name'] as String,
      category: json['category'] as String,
      generationStatus: json['generationStatus'] as String,
      viewed: json['viewed'] as bool? ?? false,
      isFavorite: json['isFavorite'] as bool? ?? false,
      generatedAt: json['generatedAt'] as String?,
      nutritionistId: json['nutritionistId'] as int?,
      patientId: json['patientId'] as int?,
      meals: (json['meals'] as List<dynamic>? ?? [])
          .map((e) => MealPlanMeal.fromJson(e as Map<String, dynamic>))
          .toList(),
      totalMacros: json['totalMacros'] as Map<String, dynamic>?,
    );
  }
}

class MealPlanMeal {
  final int? id;
  final String mealType;
  final bool isPreWorkout;
  final bool isPostWorkout;
  final String? nutritionistNote;
  final int position;
  final List<MealPlanOption> options;
  final Map<String, dynamic>? mealMacros;

  const MealPlanMeal({
    this.id,
    required this.mealType,
    required this.isPreWorkout,
    required this.isPostWorkout,
    this.nutritionistNote,
    required this.position,
    this.options = const [],
    this.mealMacros,
  });

  factory MealPlanMeal.fromJson(Map<String, dynamic> json) {
    return MealPlanMeal(
      id: json['id'] as int?,
      mealType: json['mealType'] as String,
      isPreWorkout: json['isPreWorkout'] as bool? ?? false,
      isPostWorkout: json['isPostWorkout'] as bool? ?? false,
      nutritionistNote: json['nutritionistNote'] as String?,
      position: json['position'] as int? ?? 0,
      options: (json['options'] as List<dynamic>? ?? [])
          .map((e) => MealPlanOption.fromJson(e as Map<String, dynamic>))
          .toList(),
      mealMacros: json['mealMacros'] as Map<String, dynamic>?,
    );
  }
}

class MealPlanOption {
  final int? id;
  final String label;
  final int position;
  final List<MealPlanItem> items;
  final Map<String, dynamic>? optionMacros;

  const MealPlanOption({
    this.id,
    required this.label,
    required this.position,
    this.items = const [],
    this.optionMacros,
  });

  factory MealPlanOption.fromJson(Map<String, dynamic> json) {
    return MealPlanOption(
      id: json['id'] as int?,
      label: json['label'] as String,
      position: json['position'] as int? ?? 0,
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => MealPlanItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      optionMacros: json['optionMacros'] as Map<String, dynamic>?,
    );
  }
}

class MealPlanItem {
  final int? id;
  final int? ingredientId;
  final dynamic ingredient;
  final num quantity;
  final String unit;
  final List<dynamic> substitutes;
  final Map<String, dynamic>? itemMacros;

  const MealPlanItem({
    this.id,
    this.ingredientId,
    this.ingredient,
    required this.quantity,
    required this.unit,
    this.substitutes = const [],
    this.itemMacros,
  });

  String get ingredientName {
    if (ingredient is Map) {
      return ingredient?['name']?.toString() ?? '';
    }
    return ingredient?.toString() ?? '';
  }

  factory MealPlanItem.fromJson(Map<String, dynamic> json) {
    return MealPlanItem(
      id: json['id'] as int?,
      ingredientId: json['ingredientId'] as int?,
      ingredient: json['ingredient'],
      quantity: json['quantity'] as num? ?? 0,
      unit: json['unit'] as String? ?? '',
      substitutes: json['substitutes'] as List<dynamic>? ?? [],
      itemMacros: json['itemMacros'] as Map<String, dynamic>?,
    );
  }
}
