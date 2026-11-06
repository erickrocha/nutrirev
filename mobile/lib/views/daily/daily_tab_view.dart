import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../models/daily_meal.dart';
import '../../models/ingredient.dart';
import '../../models/meal_analysis.dart';
import '../../models/meal_log.dart';
import '../../providers/customer_provider.dart';
import '../../providers/daily_meal_provider.dart';
import '../../providers/dashboard_provider.dart';
import '../../providers/meal_log_provider.dart';
import '../../services/meal_analysis_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/common/base64_or_network_image.dart';
import '../../widgets/daily/calendar_strip_widget.dart';
import '../../widgets/daily/manual_meal_entry_section.dart';
import '../../widgets/daily/meal_mode_switcher.dart';

class DailyTabView extends StatefulWidget {
  const DailyTabView({super.key});

  @override
  State<DailyTabView> createState() => _DailyTabViewState();
}

class _DailyTabViewState extends State<DailyTabView>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  DateTime _selectedDate = DateTime.now();
  MealAnalysisMode _analysisMode = MealAnalysisMode.ai;

  Uint8List? _selectedImageBytes;
  bool _isAnalyzing = false;
  MealAnalysisResponse? _analysisResult;
  String? _analysisError;

  DailyMeal? _selectedMealSlot;

  bool _triggered = false;
  DateTime? _loggedMealsDate;

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  void _maybeLoad(int? customerId) {
    if (_triggered || customerId == null) return;
    _triggered = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<DailyMealProvider>().load(
        customerId,
        fallbackError: AppLocalizations.of(context).errorGenericDailyMeals,
      );
    });
  }

  void _maybeLoadLoggedMeals() {
    final date = _selectedDate;
    if (_loggedMealsDate != null && _isSameDay(_loggedMealsDate!, date)) return;
    _loggedMealsDate = date;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<MealLogProvider>().loadForDate(
        date,
        fallbackError: AppLocalizations.of(context).errorGenericMealLogs,
      );
    });
  }

  Future<void> _pickAndAnalyzeImage(ImageSource source) async {
    final slot = _selectedMealSlot;
    if (slot?.id == null) return;

    final picker = ImagePicker();
    try {
      final XFile? file = await picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );

      if (file == null) return;

      final bytes = await file.readAsBytes();
      if (!mounted) return;

      setState(() {
        _selectedImageBytes = bytes;
        _isAnalyzing = true;
        _analysisError = null;
        _analysisResult = null;
      });

      final result = await MealAnalysisService.analyzeMealAndWait(
        bytes,
        dailyMealId: slot!.id!,
        mealDate: _selectedDate,
        filename: file.name,
      );

      if (!mounted) return;
      setState(() {
        _analysisResult = result;
        _isAnalyzing = false;
      });
      context.read<DashboardProvider>().load();
      context.read<MealLogProvider>().loadForDate(_selectedDate);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _analysisError = e.toString().replaceAll('Exception: ', '');
        _isAnalyzing = false;
      });
    }
  }

  Future<void> _submitManualMeal(List<ManualMealItemDraft> items) async {
    final slot = _selectedMealSlot;
    if (slot?.id == null) return;

    setState(() {
      _selectedImageBytes = null;
      _isAnalyzing = true;
      _analysisError = null;
      _analysisResult = null;
    });

    try {
      final result = await MealAnalysisService.analyzeMealManual(
        dailyMealId: slot!.id!,
        mealDate: _selectedDate,
        items: items.map((i) => i.toInput()).toList(),
      );

      if (!mounted) return;
      setState(() {
        _analysisResult = result;
        _isAnalyzing = false;
      });
      context.read<DashboardProvider>().load();
      context.read<MealLogProvider>().loadForDate(_selectedDate);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _analysisError = e.toString().replaceAll('Exception: ', '');
        _isAnalyzing = false;
      });
    }
  }

  void _showImagePickerModal() {
    final l10n = AppLocalizations.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                l10n.dailySelectImageTitle,
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontSize: 18),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: const Icon(
                  Icons.camera_alt_outlined,
                  color: AppColors.accentPrimary,
                ),
                title: Text(l10n.dailyCameraOption),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _pickAndAnalyzeImage(ImageSource.camera);
                },
              ),
              const Divider(height: 1, color: AppColors.borderOutline),
              ListTile(
                leading: const Icon(
                  Icons.photo_library_outlined,
                  color: AppColors.accentPrimary,
                ),
                title: Text(l10n.dailyGalleryOption),
                onTap: () {
                  Navigator.of(ctx).pop();
                  _pickAndAnalyzeImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _resetAnalysis() {
    setState(() {
      _selectedImageBytes = null;
      _isAnalyzing = false;
      _analysisResult = null;
      _analysisError = null;
      _selectedMealSlot = null;
    });
  }

  Widget _buildLoggedMealsSection(AppLocalizations l10n) {
    final mealLogProvider = context.watch<MealLogProvider>();
    final dailyMeals = context.watch<DailyMealProvider>().all;
    final logs = mealLogProvider.logs;

    if (mealLogProvider.loading && logs.isEmpty) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.dailyLoggedMealsTitle,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 16),
          ),
          const SizedBox(height: 10),
          if (logs.isEmpty)
            Text(
              l10n.dailyNoLoggedMeals,
              style: const TextStyle(color: AppColors.textBody, fontSize: 13),
            )
          else
            for (final log in logs)
              _LoggedMealCard(
                log: log,
                mealSlotName: dailyMeals
                    .firstWhere(
                      (m) => m.id == log.dailyMealId,
                      orElse: () => DailyMeal(id: log.dailyMealId, name: ''),
                    )
                    .name,
              ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final l10n = AppLocalizations.of(context);
    final customerId = context.watch<CustomerProvider>().me?.id;
    _maybeLoad(customerId);
    _maybeLoadLoggedMeals();

    return Scaffold(
      backgroundColor: AppColors.primaryBg,
      appBar: AppBar(
        backgroundColor: AppColors.primaryBg,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text(l10n.dailyTitle),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Top Calendar Widget
          CalendarStripWidget(
            selectedDate: _selectedDate,
            onDateSelected: (date) => setState(() => _selectedDate = date),
          ),
          const SizedBox(height: 20),

          // Meals already logged for the selected day, if any.
          _buildLoggedMealsSection(l10n),

          // Main Photo & Analysis Screen Container
          if (_isAnalyzing)
            _buildAnalyzingCard(l10n)
          else if (_analysisError != null)
            _buildErrorCard(l10n)
          else if (_analysisResult != null)
            _buildResultView(l10n)
          else
            _buildMealSlotAndCaptureSection(l10n),
        ],
      ),
    );
  }

  Widget _buildMealSlotAndCaptureSection(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l10n.dailyPickMealSlotPrompt,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 16),
        ),
        const SizedBox(height: 10),
        Builder(
          builder: (context) {
            final mealSlots = context.watch<DailyMealProvider>().all;
            return Wrap(
              spacing: 8,
              runSpacing: 8,
              children: mealSlots
                  .map(
                    (slot) => ChoiceChip(
                      label: Text(slot.name),
                      selected: _selectedMealSlot?.id == slot.id,
                      onSelected: (_) => setState(() => _selectedMealSlot = slot),
                    ),
                  )
                  .toList(),
            );
          },
        ),
        const SizedBox(height: 18),

        // Mode Switcher: AI Scan vs Manual Entry
        MealModeSwitcher(
          selectedMode: _analysisMode,
          onModeChanged: (mode) => setState(() => _analysisMode = mode),
        ),
        const SizedBox(height: 18),

        // Active Mode Card / Section
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          switchInCurve: Curves.easeOutCubic,
          switchOutCurve: Curves.easeInCubic,
          child: _analysisMode == MealAnalysisMode.ai
              ? KeyedSubtree(
                  key: const ValueKey('ai_mode_card'),
                  child: _buildTakePictureCard(l10n),
                )
              : KeyedSubtree(
                  key: const ValueKey('manual_mode_card'),
                  child: ManualMealEntrySection(
                    selectedMealSlot: _selectedMealSlot,
                    isSubmitting: _isAnalyzing,
                    onSubmit: _submitManualMeal,
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildTakePictureCard(AppLocalizations l10n) {
    final enabled = _selectedMealSlot != null;
    return GestureDetector(
      onTap: enabled ? _showImagePickerModal : null,
      child: Opacity(
        opacity: enabled ? 1 : 0.5,
        child: Container(
          height: 380,
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.borderOutline, width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: AppColors.badgeBg,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.accentPrimary.withValues(alpha: 0.3),
                    width: 2,
                  ),
                ),
                child: const Icon(
                  Icons.add_a_photo_outlined,
                  size: 48,
                  color: AppColors.accentPrimary,
                ),
              ),
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  l10n.dailyAnalyzeButton,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  l10n.dailyAnalyzeSubtext,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: AppColors.textBody,
                    fontSize: 14,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.accentPrimary,
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.camera_alt, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      l10n.dailySelectImageTitle,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAnalyzingCard(AppLocalizations l10n) {
    return Container(
      height: 380,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.borderOutline, width: 1),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_selectedImageBytes != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: SizedBox(
                  width: 120,
                  height: 120,
                  child: Image.memory(_selectedImageBytes!, fit: BoxFit.cover),
                ),
              )
            else
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.badgeBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(
                  Icons.restaurant_menu,
                  size: 40,
                  color: AppColors.accentPrimary,
                ),
              ),
            const SizedBox(height: 24),
            const CircularProgressIndicator(color: AppColors.accentPrimary),
            const SizedBox(height: 16),
            Text(
              _analysisMode == MealAnalysisMode.ai
                  ? l10n.dailyAnalyzingTitle
                  : l10n.dailyManualSubmitting,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorCard(AppLocalizations l10n) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.red.shade300, width: 1),
      ),
      child: Column(
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
          const SizedBox(height: 16),
          Text(
            _analysisError ?? 'Could not analyze meal.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.textHeading,
              fontSize: 14,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              if (_analysisMode == MealAnalysisMode.ai) {
                _showImagePickerModal();
              } else {
                setState(() {
                  _analysisError = null;
                });
              }
            },
            icon: const Icon(Icons.refresh),
            label: Text(l10n.retryButton),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accentPrimary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResultView(AppLocalizations l10n) {
    final result = _analysisResult!;
    final totals = result.totals;
    final points = result.pointsAwarded;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              l10n.dailyAnalysisResultsTitle,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontSize: 18),
            ),
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: _resetAnalysis,
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (_selectedImageBytes != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: SizedBox(
              height: 180,
              width: double.infinity,
              child: Image.memory(_selectedImageBytes!, fit: BoxFit.cover),
            ),
          ),
        if (_selectedImageBytes != null) const SizedBox(height: 16),

        _NutritionBreakdown(totals: totals, items: result.items),
        const SizedBox(height: 24),

        // Auto-saved confirmation banner
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
          decoration: BoxDecoration(
            color: AppColors.accentPrimary.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.accentPrimary.withValues(alpha: 0.4)),
          ),
          child: Row(
            children: [
              const Icon(Icons.check_circle, color: AppColors.accentPrimary, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  points != null && points > 0
                      ? l10n.dailySavedToLogWithPoints(points)
                      : l10n.dailySavedToLog,
                  style: const TextStyle(
                    color: AppColors.accentPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _resetAnalysis,
            icon: Icon(
              _analysisMode == MealAnalysisMode.ai
                  ? Icons.add_a_photo_outlined
                  : Icons.playlist_add_rounded,
            ),
            label: Text(
              _analysisMode == MealAnalysisMode.ai
                  ? l10n.dailySelectImageTitle
                  : l10n.dailyManualAddIngredient,
            ),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              side: const BorderSide(color: AppColors.accentPrimary),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MacroCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MacroCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderOutline, width: 0.8),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textBody,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

/// Shared macro-cards row + identified-items list, used both for a freshly
/// completed analysis and for a previously logged meal.
class _NutritionBreakdown extends StatelessWidget {
  final MealMacros totals;
  final List<FoodItemAnalysis> items;

  const _NutritionBreakdown({required this.totals, required this.items});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _MacroCard(
                label: l10n.dailyCaloriesLabel,
                value: '${totals.calories.toInt()} kcal',
                color: Colors.orange,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _MacroCard(
                label: l10n.dailyProteinLabel,
                value: '${totals.proteinG.toStringAsFixed(1)}g',
                color: Colors.redAccent,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _MacroCard(
                label: l10n.dailyCarbsLabel,
                value: '${totals.carbsG.toStringAsFixed(1)}g',
                color: Colors.blueAccent,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _MacroCard(
                label: l10n.dailyFatLabel,
                value: '${totals.fatG.toStringAsFixed(1)}g',
                color: Colors.amber.shade700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(
          l10n.dailyFoodItemsTitle,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 16),
        ),
        const SizedBox(height: 10),
        for (final item in items)
          Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderOutline, width: 0.8),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.restaurant,
                  color: AppColors.accentPrimary,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      if (item.estimatedGrams != null)
                        Text(
                          '${item.estimatedGrams}g',
                          style: const TextStyle(
                            color: AppColors.textBody,
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                ),
                Text(
                  '${item.calories} kcal',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.accentPrimary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// A single already-logged meal for the selected day: photo + nutrition breakdown.
class _LoggedMealCard extends StatefulWidget {
  final MealLogResponse log;
  final String mealSlotName;

  const _LoggedMealCard({required this.log, required this.mealSlotName});

  @override
  State<_LoggedMealCard> createState() => _LoggedMealCardState();
}

class _LoggedMealCardState extends State<_LoggedMealCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final log = widget.log;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderOutline, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: SizedBox(
                    width: 64,
                    height: 64,
                    child: AppImage(source: log.photo),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.mealSlotName.isNotEmpty ? widget.mealSlotName : '—',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${log.totals.calories.toInt()} kcal',
                        style: const TextStyle(color: AppColors.textBody, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                Icon(
                  _expanded ? Icons.expand_less : Icons.expand_more,
                  color: AppColors.textBody,
                ),
              ],
            ),
          ),
          if (_expanded) ...[
            const SizedBox(height: 12),
            _NutritionBreakdown(totals: log.totals, items: log.items),
          ],
        ],
      ),
    );
  }
}
