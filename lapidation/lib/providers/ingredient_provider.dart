import 'package:flutter/foundation.dart';

import '../models/ingredient.dart';
import '../services/base_service.dart';
import '../services/ingredient_service.dart';

class IngredientProvider extends ChangeNotifier {
  List<Ingredient> _ingredients = [];
  bool _loading = false;
  String? _error;

  List<Ingredient> get ingredients => _ingredients;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> load({
    bool force = false,
    String fallbackError = 'Could not load ingredients catalog.',
  }) async {
    if (_ingredients.isNotEmpty && !force) return;

    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _ingredients = await IngredientService.getIngredients();
    } on AppException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = fallbackError;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  List<Ingredient> search(String query, {int limit = 25}) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) {
      return _ingredients.take(limit).toList();
    }
    return _ingredients
        .where((i) => i.name.toLowerCase().contains(q))
        .take(limit)
        .toList();
  }
}
