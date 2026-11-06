import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../../l10n/enum_localizations.dart';
import '../../models/meal_plan.dart';
import '../../theme/app_colors.dart';

/// Read-only drill-in rendering the already-fetched nested
/// meals -> options -> items — no new network call.
class MealPlanDetailView extends StatelessWidget {
  final MealPlan plan;

  const MealPlanDetailView({super.key, required this.plan});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      appBar: AppBar(
        backgroundColor: AppColors.primaryBg,
        elevation: 0,
        title: Text(plan.name),
      ),
      body: plan.meals.isEmpty
          ? Center(
              child: Text(
                AppLocalizations.of(context).mealPlanDetailEmpty,
                style: const TextStyle(color: AppColors.textBody),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: plan.meals.length,
              itemBuilder: (context, index) =>
                  _MealSection(meal: plan.meals[index]),
            ),
    );
  }
}

class _MealSection extends StatelessWidget {
  final MealPlanMeal meal;

  const _MealSection({required this.meal});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderOutline, width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            enumLabel(l10n, BusinessEnumGroup.mealType, meal.mealType),
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontSize: 15),
          ),
          if (meal.nutritionistNote != null &&
              meal.nutritionistNote!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              meal.nutritionistNote!,
              style: const TextStyle(color: AppColors.textBody, fontSize: 13),
            ),
          ],
          const SizedBox(height: 10),
          for (final option in meal.options) _OptionRow(option: option),
        ],
      ),
    );
  }
}

class _OptionRow extends StatelessWidget {
  final MealPlanOption option;

  const _OptionRow({required this.option});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            option.label,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          ),
          for (final item in option.items)
            Padding(
              padding: const EdgeInsets.only(left: 8, top: 2),
              child: Text(
                '${item.ingredientName} • ${item.quantity} ${enumLabel(l10n, BusinessEnumGroup.measurementUnit, item.unit)} - ${item.ingredientName}',
                style: const TextStyle(color: AppColors.textBody, fontSize: 13),
              ),
            ),
        ],
      ),
    );
  }
}
