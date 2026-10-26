/// Maps the backend's `CustomerDailyMealJson` — the assignment linking a
/// customer to one of their daily-meal-slot categories.
class CustomerDailyMeal {
  final int customerId;
  final int dailyMealId;

  const CustomerDailyMeal({
    required this.customerId,
    required this.dailyMealId,
  });

  factory CustomerDailyMeal.fromJson(Map<String, dynamic> json) {
    return CustomerDailyMeal(
      customerId: json['customerId'] as int,
      dailyMealId: json['dailyMealId'] as int,
    );
  }

  Map<String, dynamic> toJson() => {
    'customerId': customerId,
    'dailyMealId': dailyMealId,
  };
}
