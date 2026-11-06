import 'package:dio/dio.dart';

import '../models/payment_charge.dart';
import 'base_service.dart';
import 'dio_client.dart';

class PaymentService {
  /// The signed-in patient's own charges. The backend resolves the customer
  /// from the token, so no id is sent.
  static Future<List<PaymentCharge>> getMyCharges() async {
    try {
      final response = await DioClient.instance.dio.get('/v1/payments/charges');

      return (response.data as List<dynamic>)
          .map((e) => PaymentCharge.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao carregar suas cobranças.');
    }
  }

  /// Reserves an attempt against a charge.
  ///
  /// [idempotencyKey] must be reused verbatim when retrying the same payment —
  /// that is what stops a double charge if the response is lost.
  static Future<PreparedAttempt> prepare({
    required int chargeId,
    required String idempotencyKey,
    String method = 'credit',
    int installments = 1,
  }) async {
    try {
      final response = await DioClient.instance.dio.post(
        '/v1/payments/charges/$chargeId/prepare',
        data: {
          'idempotencyKey': idempotencyKey,
          'method': method,
          'installments': installments,
        },
      );

      return PreparedAttempt.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao iniciar o pagamento.');
    }
  }

  /// Submits the card. Card data is sent once and never stored on the device.
  static Future<CardPaymentResult> authorize({
    required int attemptId,
    required String cardholderName,
    required String cardNumber,
    required int expirationMonth,
    required int expirationYear,
    required String securityCode,
  }) async {
    try {
      final response = await DioClient.instance.dio.post(
        '/v1/card-payments/$attemptId/authorize',
        data: {
          'cardholderName': cardholderName,
          'cardNumber': cardNumber,
          'expirationMonth': expirationMonth,
          'expirationYear': expirationYear,
          'securityCode': securityCode,
        },
      );

      return CardPaymentResult.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao processar o pagamento.');
    }
  }

  /// Issues a Pix charge: reserves the attempt and calls the provider in one
  /// round trip, so a customer watching a spinner waits once.
  ///
  /// [idempotencyKey] must be stable across retries of the same checkout.
  static Future<PixCharge> createPixCharge({
    required int chargeId,
    required String idempotencyKey,
    String? taxId,
  }) async {
    try {
      final response = await DioClient.instance.dio.post(
        '/v1/payments/charges/$chargeId/pix',
        data: {'idempotencyKey': idempotencyKey, 'taxId': taxId},
      );
      return PixCharge.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao gerar o Pix.');
    }
  }

  /// Current state of an attempt. Polled while the QR is on screen, because the
  /// provider callback can be late.
  static Future<AttemptState> getAttempt(int attemptId) async {
    try {
      final response = await DioClient.instance.dio.get(
        '/v1/payments/attempts/$attemptId',
      );
      return AttemptState.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao consultar o pagamento.');
    }
  }

  /// Releases an attempt that is still waiting.
  ///
  /// Only one live attempt may reserve a charge, so an abandoned Pix QR must be
  /// released or that charge cannot be paid by any method afterwards.
  static Future<void> cancelAttempt(int attemptId) async {
    try {
      await DioClient.instance.dio.post(
        '/v1/payments/attempts/$attemptId/cancel',
      );
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao cancelar a tentativa.');
    }
  }

  /// Stores the card and switches the subscription to automatic billing.
  /// Card data is sent once; only the provider's token is kept, server-side.
  static Future<void> enableRecurring({
    required int subscriptionId,
    required String cardholderName,
    required String cardNumber,
    required int expirationMonth,
    required int expirationYear,
    required String securityCode,
    String? taxId,
  }) async {
    try {
      await DioClient.instance.dio.post(
        '/v1/payments/subscriptions/$subscriptionId/card',
        data: {
          'taxId': taxId,
          'cardholderName': cardholderName,
          'cardNumber': cardNumber,
          'expirationMonth': expirationMonth,
          'expirationYear': expirationYear,
          'securityCode': securityCode,
        },
      );
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao ativar a cobrança automática.');
    }
  }

  /// Turns automatic billing off and revokes the stored card.
  static Future<void> disableRecurring(int subscriptionId) async {
    try {
      await DioClient.instance.dio.delete(
        '/v1/payments/subscriptions/$subscriptionId/card',
      );
    } on DioException catch (e) {
      throw BaseService.handleDioError(e, 'Falha ao desativar a cobrança automática.');
    }
  }
}
