/// Maps the backend's `EatJson` (`GET /eat/page`) — the recipe catalog.
class Eat {
  final int? id;
  final String? uuid;
  final int? tenantId;
  final String name;
  final String? photo;
  final String? videoUrl;
  final double? price;
  final int? time;
  final int? portion;
  final String? description;
  final String? recommendedPeriod;
  final String? recommendedDays;
  final String? recommendedMessage;
  final int views;
  final int additions;
  final bool isHighlight;
  final int? cycleId;
  final List<EatDirection> directions;
  final List<EatIngredient> ingredients;
  final List<NamedRef> restrictions;
  final List<NamedRef> tags;
  final List<dynamic> meals;
  final List<dynamic> biotypes;
  final List<dynamic> sideDishes;
  final Map<String, dynamic>? totalMacros;

  const Eat({
    this.id,
    this.uuid,
    this.tenantId,
    required this.name,
    this.photo,
    this.videoUrl,
    this.price,
    this.time,
    this.portion,
    this.description,
    this.recommendedPeriod,
    this.recommendedDays,
    this.recommendedMessage,
    this.views = 0,
    this.additions = 0,
    this.isHighlight = false,
    this.cycleId,
    this.directions = const [],
    this.ingredients = const [],
    this.restrictions = const [],
    this.tags = const [],
    this.meals = const [],
    this.biotypes = const [],
    this.sideDishes = const [],
    this.totalMacros,
  });

  factory Eat.fromJson(Map<String, dynamic> json) {
    return Eat(
      id: json['id'] as int?,
      uuid: json['uuid'] as String?,
      tenantId: json['tenantId'] as int?,
      name: json['name'] as String,
      photo: json['photo'] as String?,
      videoUrl: json['videoUrl'] as String?,
      price: (json['price'] as num?)?.toDouble(),
      time: json['time'] as int?,
      portion: json['portion'] as int?,
      description: json['description'] as String?,
      recommendedPeriod: json['recommendedPeriod'] as String?,
      recommendedDays: json['recommendedDays'] as String?,
      recommendedMessage: json['recommendedMessage'] as String?,
      views: json['views'] as int? ?? 0,
      additions: json['additions'] as int? ?? 0,
      isHighlight: json['isHighlight'] as bool? ?? false,
      cycleId: json['cycleId'] as int?,
      directions: (json['directions'] as List<dynamic>? ?? [])
          .map((e) => EatDirection.fromJson(e as Map<String, dynamic>))
          .toList(),
      ingredients: (json['ingredients'] as List<dynamic>? ?? [])
          .map((e) => EatIngredient.fromJson(e as Map<String, dynamic>))
          .toList(),
      restrictions: (json['restrictions'] as List<dynamic>? ?? [])
          .map((e) => NamedRef.fromJson(e as Map<String, dynamic>))
          .toList(),
      tags: (json['tags'] as List<dynamic>? ?? [])
          .map((e) => NamedRef.fromJson(e as Map<String, dynamic>))
          .toList(),
      meals: json['meals'] as List<dynamic>? ?? [],
      biotypes: json['biotypes'] as List<dynamic>? ?? [],
      sideDishes: json['sideDishes'] as List<dynamic>? ?? [],
      totalMacros: json['totalMacros'] as Map<String, dynamic>?,
    );
  }
}

class EatDirection {
  final int? id;
  final int stepNumber;
  final String description;

  const EatDirection({
    this.id,
    required this.stepNumber,
    required this.description,
  });

  factory EatDirection.fromJson(Map<String, dynamic> json) {
    return EatDirection(
      id: json['id'] as int?,
      stepNumber: json['stepNumber'] as int,
      description: json['description'] as String,
    );
  }
}

class EatIngredient {
  final int? id;
  final int? ingredientId;
  final dynamic ingredient;
  final num quantity;
  final String unit;
  final List<dynamic> substitutes;

  const EatIngredient({
    this.id,
    this.ingredientId,
    this.ingredient,
    required this.quantity,
    required this.unit,
    this.substitutes = const [],
  });

  String get ingredientName {
    if (ingredient is Map) {
      return ingredient?['name']?.toString() ?? '';
    }
    return ingredient?.toString() ?? '';
  }

  factory EatIngredient.fromJson(Map<String, dynamic> json) {
    return EatIngredient(
      id: json['id'] as int?,
      ingredientId: json['ingredientId'] as int?,
      ingredient: json['ingredient'],
      quantity: json['quantity'] as num? ?? 0,
      unit: json['unit'] as String? ?? '',
      substitutes: json['substitutes'] as List<dynamic>? ?? [],
    );
  }
}

/// Shared shape for `restrictions` and `tags`.
class NamedRef {
  final int id;
  final String name;

  const NamedRef({required this.id, required this.name});

  factory NamedRef.fromJson(Map<String, dynamic> json) {
    return NamedRef(id: json['id'] as int, name: json['name'] as String);
  }
}
