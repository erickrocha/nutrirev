/// Maps the backend's `DailyMealJson` (`GET /daily-meal`) — a named
/// meal-slot category (e.g. "Café da Manhã"), no time/food content.
class DailyMeal {
  final int? id;
  final String? uuid;
  final int? tenantId;
  final String name;

  const DailyMeal({this.id, this.uuid, this.tenantId, required this.name});

  factory DailyMeal.fromJson(Map<String, dynamic> json) {
    return DailyMeal(
      id: json['id'] as int?,
      uuid: json['uuid'] as String?,
      tenantId: json['tenantId'] as int?,
      name: json['name'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'uuid': uuid,
    'tenantId': tenantId,
    'name': name,
  };
}
