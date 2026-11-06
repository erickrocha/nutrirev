import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../l10n/app_localizations.dart';
import '../../theme/app_colors.dart';

enum MealAnalysisMode {
  ai,
  manual,
}

class MealModeSwitcher extends StatelessWidget {
  final MealAnalysisMode selectedMode;
  final ValueChanged<MealAnalysisMode> onModeChanged;

  const MealModeSwitcher({
    super.key,
    required this.selectedMode,
    required this.onModeChanged,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final isAi = selectedMode == MealAnalysisMode.ai;

    return Container(
      height: 52,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.badgeBg.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: AppColors.borderOutline.withValues(alpha: 0.8), width: 1),
      ),
      child: Stack(
        children: [
          // Animated Sliding Indicator
          AnimatedAlign(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOutCubic,
            alignment: isAi ? Alignment.centerLeft : Alignment.centerRight,
            child: FractionallySizedBox(
              widthFactor: 0.5,
              child: Container(
                height: double.infinity,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(22),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.textHeading.withValues(alpha: 0.08),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Interactive Segment Tabs
          Row(
            children: [
              Expanded(
                child: _SegmentItem(
                  icon: Icons.auto_awesome,
                  label: l10n.dailyModeAi,
                  isSelected: isAi,
                  onTap: () {
                    if (!isAi) {
                      HapticFeedback.selectionClick();
                      onModeChanged(MealAnalysisMode.ai);
                    }
                  },
                ),
              ),
              Expanded(
                child: _SegmentItem(
                  icon: Icons.format_list_bulleted_rounded,
                  label: l10n.dailyModeManual,
                  isSelected: !isAi,
                  onTap: () {
                    if (isAi) {
                      HapticFeedback.selectionClick();
                      onModeChanged(MealAnalysisMode.manual);
                    }
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SegmentItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _SegmentItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Center(
        child: AnimatedDefaultTextStyle(
          duration: const Duration(milliseconds: 200),
          style: TextStyle(
            fontFamily: 'Jost',
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected ? AppColors.textHeading : AppColors.textBody,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedScale(
                scale: isSelected ? 1.05 : 0.95,
                duration: const Duration(milliseconds: 200),
                child: Icon(
                  icon,
                  size: 18,
                  color: isSelected ? AppColors.accentPrimary : AppColors.textBody,
                ),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
