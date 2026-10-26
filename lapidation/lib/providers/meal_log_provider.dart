import 'package:flutter/foundation.dart';

import '../models/meal_log.dart';
import '../services/base_service.dart';
import '../services/meal_log_service.dart';

class MealLogProvider extends ChangeNotifier {
  List<MealLogResponse> _logs = [];
  bool _loading = false;
  String? _error;

  List<MealLogResponse> get logs => _logs;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> loadForDate(
    DateTime date, {
    String fallbackError = 'Could not load your logged meals.',
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _logs = await MealLogService.getLogsForDate(date);
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
