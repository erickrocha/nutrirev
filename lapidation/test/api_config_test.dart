import 'package:flutter_test/flutter_test.dart';
import 'package:lapidation/config/api_config.dart';

void main() {
  test('the default endpoint is encrypted', () {
    // The regression this guards: someone committing a LAN http:// address as
    // the default, the way it used to be. This app posts card numbers, and a
    // build without an explicit --dart-define must reach for TLS.
    expect(ApiConfig.isSecure, isTrue, reason: ApiConfig.baseUrl);
    expect(ApiConfig.baseUrl, startsWith('https://'));
  });

  test('isSecure rejects a plaintext endpoint', () {
    expect('http://192.168.15.4:8080'.startsWith('https://'), isFalse);
  });
}
