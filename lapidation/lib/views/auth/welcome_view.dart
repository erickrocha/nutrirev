import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_colors.dart';

class WelcomeView extends StatefulWidget {
  const WelcomeView({super.key});

  @override
  State<WelcomeView> createState() => _WelcomeViewState();
}

class _WelcomeViewState extends State<WelcomeView> {
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String? _validationError;

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleCompleteFirstLogin() async {
    final l10n = AppLocalizations.of(context);
    final newPassword = _newPasswordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if (newPassword.isEmpty || confirmPassword.isEmpty) {
      setState(() => _validationError = l10n.welcomeValidationEmpty);
      return;
    }
    if (newPassword != confirmPassword) {
      setState(() => _validationError = l10n.welcomeValidationMismatch);
      return;
    }
    if (newPassword.length < 6) {
      setState(() => _validationError = l10n.welcomeValidationMinLength);
      return;
    }

    setState(() => _validationError = null);
    await context.read<AuthProvider>().completeFirstLogin(
      newPassword,
      fallbackError: l10n.errorGenericSavePassword,
    );
    // On success AuthProvider.status flips to authenticated and AuthGate
    // reactively swaps in AppShell. On failure, auth.error surfaces below.
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final auth = context.watch<AuthProvider>();
    final errorMessage = _validationError ?? auth.error;
    final userName = auth.token?.name ?? '';

    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 36),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Diamond Logo Icon
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.badgeBg,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.borderOutline,
                      width: 1,
                    ),
                  ),
                  child: const Icon(
                    Icons.diamond_outlined,
                    size: 32,
                    color: AppColors.accentPrimary,
                  ),
                ),
                const SizedBox(height: 16),

                // Brand Subtitle Header
                Text(
                  'LAPIDATION CLINIC',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    letterSpacing: 3.0,
                    fontWeight: FontWeight.w400,
                  ),
                ),
                const SizedBox(height: 36),

                // Welcome Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: AppColors.borderOutline,
                      width: 0.8,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.textHeading.withValues(alpha: 0.04),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.badgeBg,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          l10n.welcomeBadge,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.labelLarge
                              ?.copyWith(
                                color: AppColors.accentPrimary,
                                fontSize: 11,
                              ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      Text(
                        l10n.welcomeGreeting(userName),
                        style: Theme.of(
                          context,
                        ).textTheme.titleLarge?.copyWith(fontSize: 18),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l10n.welcomeSubtext,
                        textAlign: TextAlign.center,
                        style: Theme.of(
                          context,
                        ).textTheme.bodyMedium?.copyWith(height: 1.4),
                      ),
                      const SizedBox(height: 24),

                      // Error Alert
                      if (errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.errorBg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: AppColors.error.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.error_outline,
                                size: 18,
                                color: AppColors.error,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  errorMessage,
                                  style: const TextStyle(
                                    color: AppColors.error,
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // New Password Field
                      TextField(
                        controller: _newPasswordController,
                        obscureText: true,
                        textInputAction: TextInputAction.next,
                        onSubmitted: (_) => FocusScope.of(context).nextFocus(),
                        decoration: InputDecoration(
                          labelText: l10n.newPasswordLabel,
                          hintText: l10n.newPasswordHint,
                          prefixIcon: const Icon(
                            Icons.lock_outline,
                            color: AppColors.accentPrimary,
                            size: 20,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Confirm Password Field
                      TextField(
                        controller: _confirmPasswordController,
                        obscureText: true,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) => _handleCompleteFirstLogin(),
                        decoration: InputDecoration(
                          labelText: l10n.confirmPasswordLabel,
                          hintText: l10n.confirmPasswordHint,
                          prefixIcon: const Icon(
                            Icons.lock_reset_outlined,
                            color: AppColors.accentPrimary,
                            size: 20,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Submit Button
                      ElevatedButton(
                        onPressed: auth.submitting
                            ? null
                            : _handleCompleteFirstLogin,
                        child: auth.submitting
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.textLight,
                                ),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Flexible(
                                    child: Text(
                                      l10n.welcomeSubmitButton,
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.arrow_forward, size: 18),
                                ],
                              ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
