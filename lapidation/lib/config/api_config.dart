class ApiConfig {
  ApiConfig._();

  /// Where the app talks to the backend.
  ///
  /// Overridden at build time, never edited in the source:
  ///
  /// ```
  /// flutter run --dart-define=API_BASE_URL=http://192.168.15.4:8080
  /// ```
  ///
  /// The default is the production HTTPS endpoint on purpose. This app posts
  /// card numbers and CVVs, so a build with no override must reach for TLS
  /// rather than for whichever LAN address happened to be committed. Pointing it
  /// at a plaintext URL now also takes a deliberate act — release builds no
  /// longer carry the Android cleartext exemption.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://snwi3up3h4.us-east-1.awsapprunner.com',
  );

  static const Duration timeout = Duration(seconds: 20);

  /// Whether the configured endpoint is encrypted.
  ///
  /// Read by `main` to refuse a release build pointed at plaintext.
  static bool get isSecure => baseUrl.startsWith('https://');
}
