/// Maps the backend's `PaymentChargeJson` (`GET /v1/payments/charges`).
///
/// One billing cycle of the patient's clinical plan. Dates arrive as
/// `YYYY-MM-DD` strings and are kept raw, like every other model here.
class PaymentCharge {
  final int id;
  final int customerId;
  final int? clinicalPlanId;
  final int? paymentDateId;
  final int sequence;
  final int amountCents;
  final String currency;
  final String dueDate;

  /// `open`, `overdue`, `paid` or `cancelled`.
  final String status;
  final String? paidAt;

  const PaymentCharge({
    required this.id,
    required this.customerId,
    this.clinicalPlanId,
    this.paymentDateId,
    required this.sequence,
    required this.amountCents,
    required this.currency,
    required this.dueDate,
    required this.status,
    this.paidAt,
  });

  factory PaymentCharge.fromJson(Map<String, dynamic> json) {
    return PaymentCharge(
      id: json['id'] as int? ?? 0,
      customerId: json['customerId'] as int? ?? 0,
      clinicalPlanId: json['clinicalPlanId'] as int?,
      paymentDateId: json['paymentDateId'] as int?,
      sequence: json['sequence'] as int? ?? 1,
      amountCents: json['amountCents'] as int? ?? 0,
      currency: json['currency'] as String? ?? 'BRL',
      dueDate: json['dueDate'] as String? ?? '',
      status: json['status'] as String? ?? 'open',
      paidAt: json['paidAt'] as String?,
    );
  }

  bool get isPaid => status == 'paid';
  bool get isOverdue => status == 'overdue';
  bool get isPayable => status == 'open' || status == 'overdue';

  DateTime? get due => DateTime.tryParse(dueDate);

  /// Days until this charge falls due; negative once it has passed.
  int? daysUntilDue(DateTime today) {
    final parsed = due;
    if (parsed == null) return null;
    final at = DateTime(today.year, today.month, today.day);
    return DateTime(parsed.year, parsed.month, parsed.day).difference(at).inDays;
  }
}

/// Maps the backend's `PreparedAttemptJson`
/// (`POST /v1/payments/charges/{id}/prepare`).
class PreparedAttempt {
  final int attemptId;
  final int chargeId;
  final String status;
  final String reference;
  final String method;
  final int installments;
  final int amountCents;
  final String currency;

  const PreparedAttempt({
    required this.attemptId,
    required this.chargeId,
    required this.status,
    required this.reference,
    required this.method,
    required this.installments,
    required this.amountCents,
    required this.currency,
  });

  factory PreparedAttempt.fromJson(Map<String, dynamic> json) {
    return PreparedAttempt(
      attemptId: json['attemptId'] as int? ?? 0,
      chargeId: json['chargeId'] as int? ?? 0,
      status: json['status'] as String? ?? '',
      reference: json['reference'] as String? ?? '',
      method: json['method'] as String? ?? 'credit',
      installments: json['installments'] as int? ?? 1,
      amountCents: json['amountCents'] as int? ?? 0,
      currency: json['currency'] as String? ?? 'BRL',
    );
  }
}

/// Maps the backend's `CardPaymentResultJson`
/// (`POST /v1/card-payments/{attemptId}/authorize`).
class CardPaymentResult {
  final int attemptId;
  final String status;
  final String reference;
  final int amountCents;
  final String currency;
  final String? last4;
  final String? brand;

  const CardPaymentResult({
    required this.attemptId,
    required this.status,
    required this.reference,
    required this.amountCents,
    required this.currency,
    this.last4,
    this.brand,
  });

  factory CardPaymentResult.fromJson(Map<String, dynamic> json) {
    return CardPaymentResult(
      attemptId: json['attemptId'] as int? ?? 0,
      status: json['status'] as String? ?? '',
      reference: json['reference'] as String? ?? '',
      amountCents: json['amountCents'] as int? ?? 0,
      currency: json['currency'] as String? ?? 'BRL',
      last4: json['last4'] as String?,
      brand: json['brand'] as String?,
    );
  }

  bool get isApproved => status == 'authorized' || status == 'captured';

  /// An ambiguous transport outcome. The charge may or may not have been paid,
  /// so the app must tell the patient to check rather than retry blindly.
  bool get isUncertain => status == 'unknown';
}

/// A Pix charge issued for one attempt.
class PixCharge {
  final int attemptId;
  final int chargeId;
  final String status;
  final int amountCents;
  final String currency;

  /// The BR Code ("copia e cola"). Always present, and the fallback whenever
  /// the QR image is not.
  final String payload;

  /// Base64 PNG of the QR, returned only by the call that created the charge.
  /// It is never stored server-side, so a later status read leaves this null.
  final String? encodedImage;
  final DateTime? expiresAt;

  const PixCharge({
    required this.attemptId,
    required this.chargeId,
    required this.status,
    required this.amountCents,
    required this.currency,
    required this.payload,
    this.encodedImage,
    this.expiresAt,
  });

  factory PixCharge.fromJson(Map<String, dynamic> json) {
    return PixCharge(
      attemptId: json['attemptId'] as int? ?? 0,
      chargeId: json['chargeId'] as int? ?? 0,
      status: json['status'] as String? ?? '',
      amountCents: json['amountCents'] as int? ?? 0,
      currency: json['currency'] as String? ?? 'BRL',
      payload: json['payload'] as String? ?? '',
      encodedImage: json['encodedImage'] as String?,
      expiresAt: DateTime.tryParse(json['expiresAt'] as String? ?? ''),
    );
  }
}

/// The state of an attempt, polled while a Pix QR is on screen.
class AttemptState {
  final int attemptId;
  final int chargeId;
  final String status;
  final String method;

  /// Whether the charge behind the attempt is settled. The client watches this
  /// rather than interpreting attempt statuses itself.
  final bool chargePaid;

  const AttemptState({
    required this.attemptId,
    required this.chargeId,
    required this.status,
    required this.method,
    required this.chargePaid,
  });

  factory AttemptState.fromJson(Map<String, dynamic> json) {
    return AttemptState(
      attemptId: json['attemptId'] as int? ?? 0,
      chargeId: json['chargeId'] as int? ?? 0,
      status: json['status'] as String? ?? '',
      method: json['method'] as String? ?? '',
      chargePaid: json['chargePaid'] as bool? ?? false,
    );
  }

  bool get isSettled => chargePaid || status == 'captured';
}
