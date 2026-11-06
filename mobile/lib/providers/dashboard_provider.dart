import 'package:flutter/foundation.dart';

import '../models/dashboard_summary.dart';
import '../services/dashboard_service.dart';

class DashboardProvider extends ChangeNotifier {
  DashboardSummary? summary;
  bool loading = false;

  Future<void> load() async {
    loading = true;
    notifyListeners();
    try {
      summary = await DashboardService.getToday();
    } catch (_) {
      // The meal plan remains usable when progress metrics are unavailable.
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}
