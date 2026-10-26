import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../l10n/enum_localizations.dart';
import '../../models/customer.dart';
import '../../models/meal_plan.dart';
import '../../providers/customer_provider.dart';
import '../../providers/daily_meal_provider.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/meal_plan_provider.dart';
import '../../providers/payment_provider.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/base64_or_network_image.dart';
import '../../widgets/common/loading_state.dart';
import '../settings/payment_view.dart';

class HomeTabView extends StatefulWidget {
  const HomeTabView({super.key});

  @override
  State<HomeTabView> createState() => _HomeTabViewState();
}

class _HomeTabViewState extends State<HomeTabView>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  bool _triggered = false;

  void _maybeLoad(int? customerId) {
    if (_triggered || customerId == null) return;
    _triggered = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final l10n = AppLocalizations.of(context);
      context.read<MealPlanProvider>().load(
        customerId,
        fallbackError: l10n.errorGenericMealPlan,
      );
      context.read<DailyMealProvider>().load(
        customerId,
        fallbackError: l10n.errorGenericDailyMeals,
      );
      context.read<DashboardProvider>().load();
      context.read<PaymentProvider>().load(
        fallbackError: l10n.errorGenericPayments,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l10n = AppLocalizations.of(context);
    final customer = context.watch<CustomerProvider>().me;
    final customerId = customer?.id;
    _maybeLoad(customerId);

    final mealPlan = context.watch<MealPlanProvider>();
    final dailyMeal = context.watch<DailyMealProvider>();

    return RefreshIndicator(
      color: AppColors.accentPrimary,
      onRefresh: () async {
        if (customerId != null) {
          await Future.wait([
            context.read<MealPlanProvider>().load(
              customerId,
              fallbackError: l10n.errorGenericMealPlan,
            ),
            context.read<DailyMealProvider>().load(
              customerId,
              fallbackError: l10n.errorGenericDailyMeals,
            ),
            context.read<DashboardProvider>().load(),
            context.read<PaymentProvider>().load(
              fallbackError: l10n.errorGenericPayments,
            ),
          ]);
        }
      },
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const _PaymentBanner(),
          if (customer != null) ...[
            _CustomerInfoCard(customer: customer),
            const SizedBox(height: 16),
            _DailyProgressCard(plan: mealPlan.latest),
            const SizedBox(height: 24),
          ],
          Text(
            l10n.homeMealPlanSectionTitle,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontSize: 16),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 150,
            child: LoadingState(
              loading: mealPlan.loading,
              error: mealPlan.error,
              isEmpty: mealPlan.latest == null,
              emptyMessage: l10n.mealPlanEmptyMessage,
              onRetry: customerId == null
                  ? null
                  : () => context.read<MealPlanProvider>().load(
                      customerId,
                      fallbackError: l10n.errorGenericMealPlan,
                    ),
              child: mealPlan.latest == null
                  ? const SizedBox.shrink()
                  : _MealPlanCard(plan: mealPlan.latest!),
            ),
          ),
          const SizedBox(height: 28),
          Text(
            l10n.homeDailyMealsSectionTitle,
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontSize: 16),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 90,
            child: LoadingState(
              loading: dailyMeal.loading,
              error: dailyMeal.error,
              isEmpty: dailyMeal.assigned.isEmpty,
              emptyMessage: l10n.dailyMealsEmptyMessage,
              onRetry: customerId == null
                  ? null
                  : () => context.read<DailyMealProvider>().load(
                      customerId,
                      fallbackError: l10n.errorGenericDailyMeals,
                    ),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final meal in dailyMeal.assigned)
                    Chip(
                      label: Text(meal.name),
                      backgroundColor: AppColors.badgeBg,
                      labelStyle: const TextStyle(
                        color: AppColors.accentPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                      side: BorderSide.none,
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DailyProgressCard extends StatelessWidget {
  final MealPlan? plan;

  const _DailyProgressCard({required this.plan});

  @override
  Widget build(BuildContext context) {
    final dashboard = context.watch<DashboardProvider>();
    final consumed = dashboard.summary?.caloriesConsumed ?? 0;
    final rawBudget = plan?.totalMacros?['kcal'];
    final budget = rawBudget is num ? rawBudget.toDouble() : 0.0;
    final progress = budget <= 0 ? 0.0 : (consumed / budget).clamp(0.0, 1.0);
    final isPt = Localizations.localeOf(context).languageCode == 'pt';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.accentPrimary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  isPt ? 'Progresso de hoje' : "Today's progress",
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
              const Icon(Icons.diamond_outlined, color: Colors.white),
              const SizedBox(width: 5),
              Text(
                '${dashboard.summary?.totalPoints ?? 0} pts',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            budget > 0
                ? '${consumed.round()} / ${budget.round()} kcal'
                : '${consumed.round()} kcal ${isPt ? 'consumidas' : 'consumed'}',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          LinearProgressIndicator(
            value: progress,
            minHeight: 8,
            borderRadius: BorderRadius.circular(8),
            backgroundColor: Colors.white24,
            valueColor: const AlwaysStoppedAnimation(Colors.white),
          ),
          const SizedBox(height: 8),
          Text(
            '${dashboard.summary?.mealsLogged ?? 0} ${isPt ? 'refeições registradas' : 'meals logged'}',
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _MealPlanCard extends StatelessWidget {
  final MealPlan plan;

  const _MealPlanCard({required this.plan});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.borderOutline, width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  plan.name,
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontSize: 16),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (plan.isFavorite)
                const Icon(
                  Icons.star,
                  color: AppColors.accentPrimary,
                  size: 18,
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '${enumLabel(l10n, BusinessEnumGroup.mealPlanCategory, plan.category)} · ${enumLabel(l10n, BusinessEnumGroup.mealPlanGenerationStatus, plan.generationStatus)}',
            style: const TextStyle(color: AppColors.textBody, fontSize: 13),
          ),
          const Spacer(),
          Text(
            l10n.mealsPlannedCount(plan.meals.length),
            style: const TextStyle(color: AppColors.textBody, fontSize: 13),
          ),
        ],
      ),
    );
  }
}

class _CustomerInfoCard extends StatelessWidget {
  final Customer customer;

  const _CustomerInfoCard({required this.customer});

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  @override
  Widget build(BuildContext context) {
    final photoSource = (customer.photoBase64?.isNotEmpty == true)
        ? customer.photoBase64
        : (customer.photoUrl?.isNotEmpty == true)
        ? customer.photoUrl
        : (customer.photo?.isNotEmpty == true)
        ? customer.photo
        : null;
    final locationParts = [
      if (customer.city.isNotEmpty) customer.city,
      if (customer.province.isNotEmpty) customer.province,
    ];
    final location = locationParts.join(', ');

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.borderOutline, width: 0.8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: SizedBox(
                  width: 52,
                  height: 52,
                  child: AppImage(
                    source: photoSource,
                    fallback: Container(
                      color: AppColors.badgeBg,
                      alignment: Alignment.center,
                      child: Text(
                        customer.name.isNotEmpty
                            ? customer.name[0].toUpperCase()
                            : 'P',
                        style: const TextStyle(
                          color: AppColors.accentPrimary,
                          fontWeight: FontWeight.bold,
                          fontSize: 22,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_getGreeting()}, ${customer.firstName}!',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      customer.email,
                      style: const TextStyle(
                        color: AppColors.textBody,
                        fontSize: 13,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.check_circle,
                      size: 12,
                      color: Color(0xFF047857),
                    ),
                    SizedBox(width: 4),
                    Text(
                      'Ativo',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF047857),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.borderOutline),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (customer.phone.isNotEmpty)
                _InfoBadge(
                  icon: Icons.phone_android_outlined,
                  label: customer.phone,
                ),
              if (location.isNotEmpty)
                _InfoBadge(icon: Icons.location_on_outlined, label: location),
              if (customer.gender.isNotEmpty)
                _InfoBadge(icon: Icons.person_outline, label: customer.gender),
              if (customer.dateOfBirth.isNotEmpty)
                _InfoBadge(
                  icon: Icons.cake_outlined,
                  label: customer.dateOfBirth,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoBadge extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoBadge({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.badgeBg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.accentPrimary),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: AppColors.textBody,
            ),
          ),
        ],
      ),
    );
  }
}

/// Surfaces an overdue or imminent charge on the home screen.
///
/// The app has no push infrastructure, so this banner on open is the only
/// warning the patient gets before access is blocked.
class _PaymentBanner extends StatelessWidget {
  const _PaymentBanner();

  /// How close a due date has to be before it is worth interrupting for.
  static const int _warnWithinDays = 5;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final payments = context.watch<PaymentProvider>();
    final next = payments.nextUnpaid;
    if (next == null) return const SizedBox.shrink();

    final days = next.daysUntilDue(DateTime.now());
    final overdue = next.isOverdue || (days != null && days < 0);
    if (!overdue && (days == null || days > _warnWithinDays)) {
      return const SizedBox.shrink();
    }

    final color = overdue ? AppColors.error : AppColors.warning;
    final background = overdue ? AppColors.errorBg : AppColors.warningBg;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: background,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const PaymentView()),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Icon(
                  overdue ? Icons.error_outline : Icons.schedule,
                  color: color,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    overdue
                        ? l10n.paymentsBannerOverdue
                        : l10n.paymentsBannerDueSoon,
                    style: TextStyle(
                      color: color,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Icon(Icons.chevron_right, color: color, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
