import 'package:flutter/foundation.dart';

import '../models/daily_meal.dart';
import '../services/base_service.dart';
import '../services/daily_meal_service.dart';

class DailyMealProvider extends ChangeNotifier {
  List<DailyMeal> _all = [];
  List<DailyMeal> _assigned = [];
  bool _loading = false;
  String? _error;

  List<DailyMeal> get all => _all;
  List<DailyMeal> get assigned => _assigned;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> load(
    int customerId, {
    String fallbackError = 'Could not load your meals for the day.',
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final all = await DailyMealService.getDailyMeals();
      final links = await DailyMealService.getCustomerDailyMeals(customerId);
      final assignedIds = links.map((l) => l.dailyMealId).toSet();
      _all = all;
      _assigned = all.where((m) => assignedIds.contains(m.id)).toList();
    } on AppException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = fallbackError;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
