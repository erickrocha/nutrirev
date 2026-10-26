# mobile

A new Flutter project.

## Backend endpoint

The API address is a build-time setting, not something to edit in the source:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.15.4:8080
```

Without the override the app uses the production HTTPS endpoint. That default is
deliberate — this app posts card numbers and CVVs, so a build nobody configured
must reach for TLS rather than for whichever LAN address was last committed.

Cleartext HTTP works only in debug builds. `android:usesCleartextTraffic` lives
in `android/app/src/debug/AndroidManifest.xml`, so a release build pointed at an
`http://` URL is blocked by Android itself; `main()` logs the reason rather than
letting it surface as an opaque socket error. iOS has no ATS exception at all, so
plaintext never works there.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
