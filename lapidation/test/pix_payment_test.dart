import 'package:flutter_test/flutter_test.dart';
import 'package:lapidation/models/payment_charge.dart';

void main() {
  group('PixCharge', () {
    test('parses a full issue response', () {
      final pix = PixCharge.fromJson(const {
        'attemptId': 12,
        'chargeId': 7,
        'status': 'requires_action',
        'amountCents': 5001,
        'currency': 'BRL',
        'payload': '00020126BR.GOV.BCB.PIX',
        'encodedImage': 'aGVsbG8=',
        'expiresAt': '2026-09-04T23:59:59Z',
      });

      expect(pix.attemptId, 12);
      expect(pix.amountCents, 5001);
      expect(pix.payload, '00020126BR.GOV.BCB.PIX');
      expect(pix.encodedImage, 'aGVsbG8=');
      expect(pix.expiresAt?.year, 2026);
    });

    test('survives a status read, which carries no QR image', () {
      // The image is never stored server-side, so any response after the first
      // omits it. The copy-and-paste code is what must always be there.
      final pix = PixCharge.fromJson(const {
        'attemptId': 12,
        'payload': '00020126BR.GOV.BCB.PIX',
        'encodedImage': null,
        'expiresAt': null,
      });

      expect(pix.encodedImage, isNull);
      expect(pix.expiresAt, isNull);
      expect(pix.payload, isNotEmpty);
      expect(pix.currency, 'BRL');
    });
  });

  group('AttemptState', () {
    test('is settled on either signal the server can give', () {
      expect(
        AttemptState.fromJson(const {'chargePaid': true, 'status': 'requires_action'}).isSettled,
        isTrue,
      );
      expect(
        AttemptState.fromJson(const {'chargePaid': false, 'status': 'captured'}).isSettled,
        isTrue,
      );
    });

    test('a waiting or released attempt is not settled', () {
      // The bug this guards: treating any terminal-looking status as paid would
      // close the QR sheet and tell the customer their charge was settled.
      for (final status in ['prepared', 'requires_action', 'cancelled', 'declined', 'unknown']) {
        expect(
          AttemptState.fromJson({'chargePaid': false, 'status': status}).isSettled,
          isFalse,
          reason: '$status must not read as settled',
        );
      }
    });
  });
}
