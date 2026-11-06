import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../widgets/shell/app_shell.dart';
import 'login_view.dart';
import 'splash_view.dart';
import 'welcome_view.dart';

/// Root widget: switches between splash/login/first-login/app-shell based
/// purely on [AuthProvider.status]. Because this is a reactive Consumer
/// (not imperative navigation), a mid-session forced logout (triggered by
/// the Dio interceptor via AuthProvider._handleSessionExpired) rebuilds
/// straight back to LoginView with no extra plumbing.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        switch (auth.status) {
          case AuthStatus.bootstrapping:
            return const SplashView();
          case AuthStatus.unauthenticated:
            return const LoginView();
          case AuthStatus.firstLogin:
            return const WelcomeView();
          case AuthStatus.authenticated:
            return const AppShell();
        }
      },
    );
  }
}
