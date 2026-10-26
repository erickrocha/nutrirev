import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/app_colors.dart';

/// Shared loading / error / empty-state placeholder used by every tab so
/// no tab ever shows a silent blank screen.
class LoadingState extends StatelessWidget {
  final bool loading;
  final String? error;
  final bool isEmpty;
  final String? emptyMessage;
  final VoidCallback? onRetry;
  final Widget child;

  const LoadingState({
    super.key,
    required this.loading,
    required this.error,
    required this.isEmpty,
    required this.child,
    this.emptyMessage,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.accentPrimary),
      );
    }
    if (error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: AppColors.error, size: 28),
              const SizedBox(height: 8),
              Text(
                error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.error),
              ),
              if (onRetry != null) ...[
                const SizedBox(height: 12),
                TextButton(onPressed: onRetry, child: Text(l10n.retryButton)),
              ],
            ],
          ),
        ),
      );
    }
    if (isEmpty) {
      return Center(
        child: Text(
          emptyMessage ?? l10n.defaultEmptyMessage,
          style: const TextStyle(color: AppColors.textBody),
        ),
      );
    }
    return child;
  }
}
