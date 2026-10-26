import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:lapidation/main.dart';

class TestHttpOverrides extends HttpOverrides {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  HttpOverrides.global = TestHttpOverrides();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
  });

  testWidgets('App loads login screen test', (WidgetTester tester) async {
    await tester.runAsync(() async {
      await tester.pumpWidget(const LapidationMobileApp());
      await Future.delayed(const Duration(milliseconds: 100));
    });

    await tester.pump();
  });
}
