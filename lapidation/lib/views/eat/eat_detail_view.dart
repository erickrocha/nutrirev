import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../l10n/enum_localizations.dart';
import '../../models/eat.dart';
import '../../theme/app_colors.dart';

import '../../widgets/common/base64_or_network_image.dart';

/// Read-only drill-in rendering the already-fetched description,
/// directions and ingredients — no new network call.
class EatDetailView extends StatelessWidget {
  final Eat eat;

  const EatDetailView({super.key, required this.eat});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      appBar: AppBar(
        backgroundColor: AppColors.primaryBg,
        elevation: 0,
        title: Text(eat.name),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (eat.photo != null && eat.photo!.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: AspectRatio(
                aspectRatio: 1.6,
                child: AppImage(source: eat.photo!),
              ),
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              if (eat.time != null)
                _InfoChip(
                  icon: Icons.timer_outlined,
                  label: l10n.minutesLabel(eat.time!),
                ),
              if (eat.portion != null) ...[
                const SizedBox(width: 8),
                _InfoChip(
                  icon: Icons.people_outline,
                  label: l10n.portionsLabel(eat.portion!),
                ),
              ],
            ],
          ),
          if (eat.description != null && eat.description!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              eat.description!,
              style: const TextStyle(color: AppColors.textBody, height: 1.4),
            ),
          ],
          if (eat.ingredients.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text(
              l10n.ingredientsTitle,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontSize: 15),
            ),
            const SizedBox(height: 8),
            for (final ing in eat.ingredients)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  '• ${ing.quantity} ${enumLabel(l10n, BusinessEnumGroup.measurementUnit, ing.unit)} - ${ing.ingredientName}',
                  style: const TextStyle(fontSize: 13),
                ),
              ),
          ],
          if (eat.directions.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text(
              l10n.directionsTitle,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontSize: 15),
            ),
            const SizedBox(height: 8),
            for (final step in eat.directions)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  '${step.stepNumber}. ${step.description}',
                  style: const TextStyle(fontSize: 13, height: 1.4),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.badgeBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.accentPrimary),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.accentPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
