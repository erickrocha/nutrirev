const Map<String, double> unitMultipliers = {
  'Grams': 1.0,
  'Kg': 1000.0,
  'Ml': 1.0,
  'Liter': 1000.0,
  'Units': 1.0,
  'Cup': 120.0,
  'TableSpoon': 15.0,
  'Tablespoon': 15.0,
  'TeaSpoon': 5.0,
  'CoffeeSpoon': 2.5,
  'DessertSpoon': 10.0,
  'Pinch': 0.5,
  'Slice': 30.0,
  'Shell': 100.0,
  'Glass': 200.0,
  'LittleSquares': 10.0,
  'Scoop': 30.0,
};

const List<String> availableMeasurementUnits = [
  'Grams',
  'Kg',
  'Ml',
  'Liter',
  'Units',
  'Cup',
  'TableSpoon',
  'TeaSpoon',
  'CoffeeSpoon',
  'DessertSpoon',
  'Pinch',
  'Slice',
  'Shell',
  'Glass',
  'LittleSquares',
  'Scoop',
];

class Ingredient {
  final int? id;
  final String? uuid;
  final int? tenantId;
  final String name;
  final num kcal;
  final num protein;
  final num carbs;
  final num fat;
  final num fiber;

  const Ingredient({
    this.id,
    this.uuid,
    this.tenantId,
    required this.name,
    this.kcal = 0,
    this.protein = 0,
    this.carbs = 0,
    this.fat = 0,
    this.fiber = 0,
  });

  factory Ingredient.fromJson(Map<String, dynamic> json) {
    return Ingredient(
      id: json['id'] as int?,
      uuid: json['uuid'] as String?,
      tenantId: json['tenantId'] as int?,
      name: json['name'] as String? ?? '',
      kcal: (json['kcal'] as num?) ?? 0,
      protein: (json['protein'] as num?) ?? 0,
      carbs: (json['carbs'] as num?) ?? 0,
      fat: (json['fat'] as num?) ?? 0,
      fiber: (json['fiber'] as num?) ?? 0,
    );
  }
}

class ManualMealItemInput {
  final int ingredientId;
  final double quantity;
  final String unit;

  const ManualMealItemInput({
    required this.ingredientId,
    required this.quantity,
    this.unit = 'Grams',
  });

  Map<String, dynamic> toJson() => {
        'ingredient_id': ingredientId,
        'quantity': quantity,
        'unit': unit,
      };
}

class ManualMealItemDraft {
  final String tempId;
  final Ingredient ingredient;
  final double quantity;
  final String unit;

  const ManualMealItemDraft({
    required this.tempId,
    required this.ingredient,
    required this.quantity,
    this.unit = 'Grams',
  });

  double get multiplier => unitMultipliers[unit] ?? 1.0;
  double get factor => (quantity * multiplier) / 100.0;
  double get estimatedGrams => quantity * multiplier;

  double get calories => ingredient.kcal * factor;
  double get protein => ingredient.protein * factor;
  double get carbs => ingredient.carbs * factor;
  double get fat => ingredient.fat * factor;

  ManualMealItemInput toInput() => ManualMealItemInput(
        ingredientId: ingredient.id ?? 0,
        quantity: quantity,
        unit: unit,
      );
}
