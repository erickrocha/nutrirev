import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';

import 'config/api_config.dart';
import 'l10n/app_localizations.dart';
import 'providers/auth_provider.dart';
import 'providers/customer_provider.dart';
import 'providers/daily_meal_provider.dart';
import 'providers/dashboard_provider.dart';
import 'providers/eat_provider.dart';
import 'providers/ingredient_provider.dart';
import 'providers/meal_log_provider.dart';
import 'providers/meal_plan_provider.dart';
import 'providers/payment_provider.dart';
import 'theme/app_theme.dart';
import 'views/auth/auth_gate.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // A plaintext endpoint is a development convenience and must never survive
  // into a shipped build: this app posts card numbers and CVVs. Android already
  // blocks cleartext in release — the exemption is debug-only — so a
  // misconfigured build would fail with an opaque socket error. This turns that
  // into a message that names the actual cause.
  if (!ApiConfig.isSecure) {
    debugPrint(
      'API_BASE_URL is not HTTPS (${ApiConfig.baseUrl}). '
      'Fine on a development machine; in a release build cleartext is blocked '
      'and every request will fail.',
    );
    assert(
      kDebugMode,
      'Refusing to run a non-debug build against a plaintext API endpoint.',
    );
  }

  runApp(const LapidationMobileApp());
}

class LapidationMobileApp extends StatelessWidget {
  const LapidationMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CustomerProvider()),
        ChangeNotifierProvider(create: (_) => DailyMealProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => IngredientProvider()),
        ChangeNotifierProvider(create: (_) => MealLogProvider()),
        ChangeNotifierProvider(create: (_) => MealPlanProvider()),
        ChangeNotifierProvider(create: (_) => EatProvider()),
        ChangeNotifierProvider(create: (_) => PaymentProvider()),
      ],
      child: MaterialApp(
        onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: AppLocalizations.supportedLocales,
        home: const AuthGate(),
      ),
    );
  }
}
