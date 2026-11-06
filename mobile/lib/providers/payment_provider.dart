import 'package:flutter/foundation.dart';

import '../models/payment_charge.dart';
import '../services/base_service.dart';
import '../services/payment_service.dart';

class PaymentProvider extends ChangeNotifier {
  List<PaymentCharge> _charges = const [];
  bool _loading = false;
  bool _paying = false;
  String? _error;
  String? _errorKey;

  List<PaymentCharge> get charges => _charges;
  bool get loading => _loading;
  bool get paying => _paying;
  String? get error => _error;

  /// The server's stable code for the last failure, so the view can react to a
  /// missing taxpayer document without matching on translated prose.
  String? get errorKey => _errorKey;

  /// Whether the last failure was the server asking for a CPF/CNPJ.
  bool get needsTaxId => _errorKey == 'PaymentTaxIdRequired';

  /// The charge the patient is expected to pay next: the oldest unpaid one, so
  /// an overdue cycle always outranks an upcoming one.
  PaymentCharge? get nextUnpaid {
    final unpaid = _charges.where((c) => c.isPayable).toList()
      ..sort((a, b) => a.dueDate.compareTo(b.dueDate));
    return unpaid.isEmpty ? null : unpaid.first;
  }

  bool get hasOverdue => _charges.any((c) => c.isOverdue);

  Future<void> load({
    String fallbackError = 'Não foi possível carregar suas cobranças.',
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _charges = await PaymentService.getMyCharges();
    } on AppException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = fallbackError;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Prepares and authorizes in one step. The idempotency key is generated once
  /// per charge attempt and reused if the same call is retried, so a lost
  /// response cannot become a second charge.
  Future<CardPaymentResult?> pay({
    required int chargeId,
    required String idempotencyKey,
    required String cardholderName,
    required String cardNumber,
    required int expirationMonth,
    required int expirationYear,
    required String securityCode,
    int installments = 1,
    String fallbackError = 'Não foi possível processar o pagamento.',
  }) async {
    _paying = true;
    _error = null;
    _errorKey = null;
    notifyListeners();

    try {
      final attempt = await PaymentService.prepare(
        chargeId: chargeId,
        idempotencyKey: idempotencyKey,
        installments: installments,
      );
      final result = await PaymentService.authorize(
        attemptId: attempt.attemptId,
        cardholderName: cardholderName,
        cardNumber: cardNumber,
        expirationMonth: expirationMonth,
        expirationYear: expirationYear,
        securityCode: securityCode,
      );
      await load();
      return result;
    } on AppException catch (e) {
      _error = e.message;
      return null;
    } catch (_) {
      _error = fallbackError;
      return null;
    } finally {
      _paying = false;
      notifyListeners();
    }
  }

  /// Issues a Pix charge for [chargeId].
  ///
  /// [idempotencyKey] must be stable for this checkout; a fresh key on a retry
  /// does not reserve anything new, it collides with the reservation the first
  /// call already made and locks the charge.
  Future<PixCharge?> createPix({
    required int chargeId,
    required String idempotencyKey,
    String? taxId,
    String fallbackError = 'Não foi possível gerar o Pix.',
  }) async {
    _paying = true;
    _error = null;
    _errorKey = null;
    notifyListeners();

    try {
      return await PaymentService.createPixCharge(
        chargeId: chargeId,
        idempotencyKey: idempotencyKey,
        taxId: taxId,
      );
    } on AppException catch (e) {
      _error = e.message;
      _errorKey = e.errorKey;
      return null;
    } catch (_) {
      _error = fallbackError;
      return null;
    } finally {
      _paying = false;
      notifyListeners();
    }
  }

  /// One poll of an attempt. Returns null on any failure: a failed poll is not
  /// a failed payment, and the next tick tries again.
  Future<AttemptState?> pollAttempt(int attemptId) async {
    try {
      return await PaymentService.getAttempt(attemptId);
    } catch (_) {
      return null;
    }
  }

  /// Releases an abandoned attempt so the charge stays payable by any method.
  ///
  /// Failures are swallowed on purpose — the customer has already walked away,
  /// and a stuck attempt is recovered by the server-side expiry sweep.
  Future<void> releaseAttempt(int attemptId) async {
    try {
      await PaymentService.cancelAttempt(attemptId);
    } catch (_) {}
  }

  /// Stores the card for future cycles.
  ///
  /// Called only after a payment already succeeded, and its failure is reported
  /// separately: the charge is settled either way, and telling someone their
  /// payment failed because the *recurrence* did would be a lie.
  Future<bool> enableRecurring({
    required int subscriptionId,
    required String cardholderName,
    required String cardNumber,
    required int expirationMonth,
    required int expirationYear,
    required String securityCode,
    String? taxId,
  }) async {
    try {
      await PaymentService.enableRecurring(
        subscriptionId: subscriptionId,
        cardholderName: cardholderName,
        cardNumber: cardNumber,
        expirationMonth: expirationMonth,
        expirationYear: expirationYear,
        securityCode: securityCode,
        taxId: taxId,
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}
