import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../l10n/enum_localizations.dart';
import '../../models/meal_plan.dart';
import '../../providers/customer_provider.dart';
import '../../providers/meal_plan_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/loading_state.dart';
import 'meal_plan_detail_view.dart';

class MealPlanTabView extends StatefulWidget {
  const MealPlanTabView({super.key});

  @override
  State<MealPlanTabView> createState() => _MealPlanTabViewState();
}

class _MealPlanTabViewState extends State<MealPlanTabView>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  bool _triggered = false;

  void _maybeLoad(int? customerId) {
    if (_triggered || customerId == null) return;
    _triggered = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<MealPlanProvider>().load(
        customerId,
        fallbackError: AppLocalizations.of(context).errorGenericMealPlan,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l10n = AppLocalizations.of(context);
    final customerId = context.watch<CustomerProvider>().me?.id;
    _maybeLoad(customerId);
    final provider = context.watch<MealPlanProvider>();

    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      appBar: AppBar(
        backgroundColor: AppColors.primaryBg,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(l10n.mealPlanTitle),
      ),
      body: LoadingState(
        loading: provider.loading,
        error: provider.error,
        isEmpty: provider.plans.isEmpty,
        emptyMessage: l10n.mealPlanEmptyMessage,
        onRetry: customerId == null
            ? null
            : () => context.read<MealPlanProvider>().load(
                customerId,
                fallbackError: l10n.errorGenericMealPlan,
              ),
        child: ListView.separated(
          padding: const EdgeInsets.all(20),
          itemCount: provider.plans.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, index) =>
              _MealPlanListItem(plan: provider.plans[index]),
        ),
      ),
    );
  }
}

class _MealPlanListItem extends StatelessWidget {
  final MealPlan plan;

  const _MealPlanListItem({required this.plan});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () => Navigator.of(
        context,
      ).push(MaterialPageRoute(builder: (_) => MealPlanDetailView(plan: plan))),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.borderOutline, width: 0.8),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plan.name,
                    style: Theme.of(
                      context,
                    ).textTheme.titleLarge?.copyWith(fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${enumLabel(l10n, BusinessEnumGroup.mealPlanCategory, plan.category)} · ${enumLabel(l10n, BusinessEnumGroup.mealPlanGenerationStatus, plan.generationStatus)}',
                    style: const TextStyle(
                      color: AppColors.textBody,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            if (plan.isFavorite)
              const Icon(Icons.star, color: AppColors.accentPrimary, size: 18),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: AppColors.textBody),
          ],
        ),
      ),
    );
  }
}
