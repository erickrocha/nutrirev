import 'package:flutter/foundation.dart';

import '../models/customer.dart';
import '../services/base_service.dart';
import '../services/customer_service.dart';

class CustomerProvider extends ChangeNotifier {
  Customer? _me;
  bool _loading = false;
  String? _error;

  Customer? get me => _me;
  bool get loading => _loading;
  bool _uploadingPhoto = false;
  bool get uploadingPhoto => _uploadingPhoto;
  String? get error => _error;

  Future<void> loadMe({
    String fallbackError = 'Could not load your profile.',
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _me = await CustomerService.getMe();
    } on AppException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = fallbackError;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<bool> uploadPhoto(Uint8List bytes, {String extension = 'jpg'}) async {
    final customerId = _me?.id;
    if (customerId == null) return false;
    _uploadingPhoto = true;
    _error = null;
    notifyListeners();
    try {
      final normalizedExtension = extension.toLowerCase() == 'png'
          ? 'png'
          : 'jpg';
      _me = await CustomerService.uploadPhoto(
        customerId,
        bytes,
        extension: normalizedExtension,
        contentType: normalizedExtension == 'png' ? 'image/png' : 'image/jpeg',
      );
      return true;
    } on AppException catch (e) {
      _error = e.message;
      return false;
    } catch (_) {
      _error = 'Não foi possível atualizar a foto do perfil.';
      return false;
    } finally {
      _uploadingPhoto = false;
      notifyListeners();
    }
  }

  void clear() {
    _me = null;
    _error = null;
    notifyListeners();
  }
}
