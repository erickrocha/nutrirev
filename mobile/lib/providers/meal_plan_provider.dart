import 'package:flutter/foundation.dart';

import '../models/meal_plan.dart';
import '../services/base_service.dart';
import '../services/meal_plan_service.dart';

class MealPlanProvider extends ChangeNotifier {
  List<MealPlan> _plans = [];
  bool _loading = false;
  String? _error;

  List<MealPlan> get plans => _plans;
  MealPlan? get latest => _plans.isEmpty ? null : _plans.first;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> load(
    int patientId, {
    String fallbackError = 'Could not load the meal plan.',
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final page = await MealPlanService.getMealPlanPage(patientId: patientId);
      _plans = page.content;
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
