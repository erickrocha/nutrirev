import 'package:flutter/foundation.dart';

import '../models/eat.dart';
import '../services/base_service.dart';
import '../services/eat_service.dart';

class EatProvider extends ChangeNotifier {
  List<Eat> _recipes = [];
  bool _loading = false;
  bool _loadingMore = false;
  int _currentPage = 1;
  int _totalPages = 1;
  bool _hasMore = true;
  String? _error;

  List<Eat> get recipes => _recipes;
  bool get loading => _loading;
  bool get loadingMore => _loadingMore;
  bool get hasMore => _hasMore;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  String? get error => _error;

  Future<void> load({
    String fallbackError = 'Could not load the recipes.',
    int pageSize = 10,
  }) async {
    _loading = true;
    _error = null;
    _currentPage = 1;
    _hasMore = true;
    notifyListeners();

    try {
      final pageRes = await EatService.getEatPage(page: 1, size: pageSize)
          .timeout(const Duration(seconds: 15));
      _recipes = pageRes.content;
      _currentPage = pageRes.page > 0 ? pageRes.page : 1;
      _totalPages = pageRes.totalPages > 0 ? pageRes.totalPages : 1;
      _hasMore = _currentPage < _totalPages;
    } on AppException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = fallbackError;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> loadMore({
    String fallbackError = 'Could not load more recipes.',
    int pageSize = 10,
  }) async {
    if (_loading || _loadingMore || !_hasMore) return;

    _loadingMore = true;
    notifyListeners();

    try {
      final nextPage = _currentPage + 1;
      final pageRes = await EatService.getEatPage(
        page: nextPage,
        size: pageSize,
      );
      _recipes.addAll(pageRes.content);
      _currentPage = pageRes.page > 0 ? pageRes.page : nextPage;
      _totalPages = pageRes.totalPages > 0 ? pageRes.totalPages : _totalPages;
      _hasMore = _currentPage < _totalPages;
    } on AppException catch (_) {
      _hasMore = false; // Prevent infinite pagination loops on error
    } catch (_) {
      _hasMore = false; // Prevent infinite pagination loops on error
    } finally {
      _loadingMore = false;
      notifyListeners();
    }
  }
}
