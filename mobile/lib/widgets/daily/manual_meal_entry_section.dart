import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../l10n/app_localizations.dart';
import '../../l10n/enum_localizations.dart';
import '../../models/daily_meal.dart';
import '../../models/ingredient.dart';
import '../../providers/ingredient_provider.dart';
import '../../theme/app_colors.dart';

class ManualMealEntrySection extends StatefulWidget {
  final DailyMeal? selectedMealSlot;
  final bool isSubmitting;
  final Future<void> Function(List<ManualMealItemDraft> items) onSubmit;

  const ManualMealEntrySection({
    super.key,
    required this.selectedMealSlot,
    required this.isSubmitting,
    required this.onSubmit,
  });

  @override
  State<ManualMealEntrySection> createState() => _ManualMealEntrySectionState();
}

class _ManualMealEntrySectionState extends State<ManualMealEntrySection> {
  final List<ManualMealItemDraft> _items = [];
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();

  Ingredient? _activeIngredient;
  double _activeQuantity = 100;
  String _activeUnit = 'Grams';
  final TextEditingController _quantityController =
      TextEditingController(text: '100');

  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<IngredientProvider>().load();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    _quantityController.dispose();
    super.dispose();
  }

  void _selectIngredient(Ingredient ingredient) {
    setState(() {
      _activeIngredient = ingredient;
      _activeQuantity = 100;
      _activeUnit = 'Grams';
      _quantityController.text = '100';
      _isSearching = false;
      _searchController.clear();
      _searchFocusNode.unfocus();
    });
  }

  void _addItem() {
    if (_activeIngredient == null || _activeQuantity <= 0) return;
    HapticFeedback.lightImpact();

    final draft = ManualMealItemDraft(
      tempId: DateTime.now().millisecondsSinceEpoch.toString(),
      ingredient: _activeIngredient!,
      quantity: _activeQuantity,
      unit: _activeUnit,
    );

    setState(() {
      _items.add(draft);
      _activeIngredient = null;
    });
  }

  void _removeItem(int index) {
    HapticFeedback.lightImpact();
    setState(() {
      _items.removeAt(index);
    });
  }

  void _updateQuantity(double newQty) {
    if (newQty < 0.1) newQty = 0.1;
    setState(() {
      _activeQuantity = newQty;
      _quantityController.text = newQty % 1 == 0
          ? newQty.toInt().toString()
          : newQty.toStringAsFixed(1);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final slotEnabled = widget.selectedMealSlot != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Ingredient Search & Quick Add Card
        _buildSearchAndAddCard(l10n, slotEnabled),
        const SizedBox(height: 16),

        // Selected Ingredients List
        _buildSelectedItemsCard(l10n),
        const SizedBox(height: 16),

        // Real-time Macro Totals & Submit Card
        if (_items.isNotEmpty) _buildSummaryAndSubmitCard(l10n, slotEnabled),
      ],
    );
  }

  Widget _buildSearchAndAddCard(AppLocalizations l10n, bool slotEnabled) {
    final ingProvider = context.watch<IngredientProvider>();
    final query = _searchController.text;
    final searchResults = ingProvider.search(query);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.borderOutline, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.badgeBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.search_rounded,
                  color: AppColors.accentPrimary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.dailyManualAddIngredient,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    Text(
                      l10n.dailyManualSearchHint,
                      style: const TextStyle(
                        color: AppColors.textBody,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Search Input Field
          TextField(
            controller: _searchController,
            focusNode: _searchFocusNode,
            enabled: !widget.isSubmitting,
            onChanged: (val) {
              setState(() {
                _isSearching = val.isNotEmpty || _searchFocusNode.hasFocus;
              });
            },
            onTap: () {
              setState(() {
                _isSearching = true;
              });
            },
            decoration: InputDecoration(
              hintText: l10n.dailyManualSearchPlaceholder,
              prefixIcon: const Icon(
                Icons.search,
                color: AppColors.accentPrimary,
                size: 20,
              ),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {
                          _isSearching = false;
                        });
                      },
                    )
                  : null,
            ),
          ),

          // Autocomplete Dropdown List
          if (_isSearching) ...[
            const SizedBox(height: 12),
            Container(
              constraints: const BoxConstraints(maxHeight: 240),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderOutline.withValues(alpha: 0.8)),
              ),
              child: ingProvider.loading
                  ? Padding(
                      padding: const EdgeInsets.all(20),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: AppColors.accentPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              l10n.dailyManualSearching,
                              style: const TextStyle(
                                color: AppColors.textBody,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : searchResults.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.all(20),
                          child: Center(
                            child: Text(
                              l10n.dailyManualNoIngredientsFound(query),
                              style: const TextStyle(
                                color: AppColors.textBody,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          itemCount: searchResults.length,
                          separatorBuilder: (_, _) => const Divider(
                            height: 1,
                            color: AppColors.borderOutline,
                          ),
                          itemBuilder: (context, index) {
                            final ing = searchResults[index];
                            return ListTile(
                              dense: true,
                              visualDensity: VisualDensity.compact,
                              title: Text(
                                ing.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                  color: AppColors.textHeading,
                                ),
                              ),
                              subtitle: Text(
                                '${ing.kcal.toInt()} kcal • P: ${ing.protein.toStringAsFixed(1)}g • C: ${ing.carbs.toStringAsFixed(1)}g • F: ${ing.fat.toStringAsFixed(1)}g / 100g',
                                style: const TextStyle(
                                  color: AppColors.textBody,
                                  fontSize: 11,
                                ),
                              ),
                              trailing: const Icon(
                                Icons.add_circle_outline,
                                color: AppColors.accentPrimary,
                                size: 20,
                              ),
                              onTap: () => _selectIngredient(ing),
                            );
                          },
                        ),
            ),
          ],

          // Active Selected Ingredient Configurator
          if (_activeIngredient != null) ...[
            const SizedBox(height: 16),
            _buildActiveIngredientCard(l10n),
          ],
        ],
      ),
    );
  }

  Widget _buildActiveIngredientCard(AppLocalizations l10n) {
    final ing = _activeIngredient!;
    final draft = ManualMealItemDraft(
      tempId: 'draft',
      ingredient: ing,
      quantity: _activeQuantity,
      unit: _activeUnit,
    );

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.accentPrimary.withValues(alpha: 0.4), width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ing.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${ing.kcal.toInt()} kcal ${l10n.dailyManualPer100g} (${ing.protein.toStringAsFixed(1)}g P, ${ing.carbs.toStringAsFixed(1)}g C, ${ing.fat.toStringAsFixed(1)}g F)',
                      style: const TextStyle(
                        color: AppColors.textBody,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 20, color: AppColors.textBody),
                onPressed: () => setState(() => _activeIngredient = null),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Quantity and Unit Selectors
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Quantity with Stepper
              Expanded(
                flex: 5,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.dailyManualQuantity,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.borderOutline),
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove, size: 16),
                            onPressed: () {
                              final step = _activeUnit == 'Grams' || _activeUnit == 'Ml' ? 10.0 : 1.0;
                              _updateQuantity(_activeQuantity - step);
                            },
                          ),
                          Expanded(
                            child: TextField(
                              controller: _quantityController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              decoration: const InputDecoration(
                                isDense: true,
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(vertical: 8),
                              ),
                              onChanged: (val) {
                                final parsed = double.tryParse(val.replaceAll(',', '.'));
                                if (parsed != null && parsed > 0) {
                                  setState(() {
                                    _activeQuantity = parsed;
                                  });
                                }
                              },
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.add, size: 16),
                            onPressed: () {
                              final step = _activeUnit == 'Grams' || _activeUnit == 'Ml' ? 10.0 : 1.0;
                              _updateQuantity(_activeQuantity + step);
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),

              // Unit Selector
              Expanded(
                flex: 4,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.dailyManualUnit,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.borderOutline),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          value: _activeUnit,
                          icon: const Icon(Icons.arrow_drop_down, color: AppColors.accentPrimary),
                          items: availableMeasurementUnits.map((u) {
                            return DropdownMenuItem<String>(
                              value: u,
                              child: Text(
                                enumLabel(l10n, BusinessEnumGroup.measurementUnit, u),
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }).toList(),
                          onChanged: (newUnit) {
                            if (newUnit != null) {
                              setState(() {
                                _activeUnit = newUnit;
                                if (newUnit != 'Grams' && newUnit != 'Ml' && _activeQuantity > 20) {
                                  _updateQuantity(1);
                                }
                              });
                            }
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Quick portion chips
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _activeUnit == 'Grams' || _activeUnit == 'Ml'
                ? [50.0, 100.0, 150.0, 200.0].map((val) {
                    final label = '${val.toInt()}${_activeUnit == 'Grams' ? 'g' : 'ml'}';
                    return ActionChip(
                      label: Text(label, style: const TextStyle(fontSize: 11)),
                      backgroundColor: _activeQuantity == val
                          ? AppColors.accentPrimary.withValues(alpha: 0.15)
                          : AppColors.surface,
                      side: BorderSide(
                        color: _activeQuantity == val
                            ? AppColors.accentPrimary
                            : AppColors.borderOutline,
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                      onPressed: () => _updateQuantity(val),
                    );
                  }).toList()
                : [1.0, 2.0, 3.0].map((val) {
                    final label = '$val ${enumLabel(l10n, BusinessEnumGroup.measurementUnit, _activeUnit)}';
                    return ActionChip(
                      label: Text(label, style: const TextStyle(fontSize: 11)),
                      backgroundColor: _activeQuantity == val
                          ? AppColors.accentPrimary.withValues(alpha: 0.15)
                          : AppColors.surface,
                      side: BorderSide(
                        color: _activeQuantity == val
                            ? AppColors.accentPrimary
                            : AppColors.borderOutline,
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                      onPressed: () => _updateQuantity(val),
                    );
                  }).toList(),
          ),
          const SizedBox(height: 14),

          // Live Macro Preview for this draft
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
            decoration: BoxDecoration(
              color: AppColors.badgeBg.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _MacroPill(
                  label: '${draft.calories.toInt()} kcal',
                  color: Colors.orange.shade800,
                  icon: Icons.local_fire_department,
                ),
                _MacroPill(
                  label: 'P: ${draft.protein.toStringAsFixed(1)}g',
                  color: Colors.redAccent,
                ),
                _MacroPill(
                  label: 'C: ${draft.carbs.toStringAsFixed(1)}g',
                  color: Colors.blueAccent,
                ),
                _MacroPill(
                  label: 'F: ${draft.fat.toStringAsFixed(1)}g',
                  color: Colors.amber.shade800,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Add to Meal CTA
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.add_rounded, size: 18),
              label: Text(l10n.dailyManualQuickAdd),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accentPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              onPressed: _addItem,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedItemsCard(AppLocalizations l10n) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.borderOutline, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.restaurant_outlined,
                color: AppColors.accentPrimary,
                size: 20,
              ),
              const SizedBox(width: 10),
              Text(
                l10n.dailyManualSelectedItems,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              if (_items.isNotEmpty) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.accentPrimary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_items.length}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 14),

          if (_items.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              alignment: Alignment.center,
              child: Column(
                children: [
                  Icon(
                    Icons.soup_kitchen_outlined,
                    size: 38,
                    color: AppColors.textBody.withValues(alpha: 0.4),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    l10n.dailyManualEmptyItems,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: AppColors.textBody,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final item = _items[index];
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceAlt,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors.borderOutline.withValues(alpha: 0.7),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.ingredient.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                                color: AppColors.textHeading,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${item.quantity % 1 == 0 ? item.quantity.toInt() : item.quantity} ${enumLabel(l10n, BusinessEnumGroup.measurementUnit, item.unit)} • ${item.calories.toInt()} kcal',
                              style: const TextStyle(
                                color: AppColors.textBody,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'P: ${item.protein.toStringAsFixed(1)}g | C: ${item.carbs.toStringAsFixed(1)}g | F: ${item.fat.toStringAsFixed(1)}g',
                              style: const TextStyle(
                                color: AppColors.accentPrimary,
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
                        onPressed: () => _removeItem(index),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryAndSubmitCard(AppLocalizations l10n, bool slotEnabled) {
    double totalCalories = 0;
    double totalProtein = 0;
    double totalCarbs = 0;
    double totalFat = 0;

    for (final item in _items) {
      totalCalories += item.calories;
      totalProtein += item.protein;
      totalCarbs += item.carbs;
      totalFat += item.fat;
    }

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.accentPrimary.withValues(alpha: 0.4), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppColors.accentPrimary.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.insights_rounded,
                color: AppColors.accentPrimary,
                size: 20,
              ),
              const SizedBox(width: 10),
              Text(
                l10n.dailyManualNutritionalSummary,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Total Macros 4-Card Grid
          Row(
            children: [
              Expanded(
                child: _MacroTotalCard(
                  label: l10n.dailyCaloriesLabel,
                  value: '${totalCalories.toInt()} kcal',
                  color: Colors.orange.shade800,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MacroTotalCard(
                  label: l10n.dailyProteinLabel,
                  value: '${totalProtein.toStringAsFixed(1)}g',
                  color: Colors.redAccent,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MacroTotalCard(
                  label: l10n.dailyCarbsLabel,
                  value: '${totalCarbs.toStringAsFixed(1)}g',
                  color: Colors.blueAccent,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MacroTotalCard(
                  label: l10n.dailyFatLabel,
                  value: '${totalFat.toStringAsFixed(1)}g',
                  color: Colors.amber.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          if (!slotEnabled)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 16, color: Colors.amber),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      l10n.dailyManualSelectMealSlotFirst,
                      style: const TextStyle(color: AppColors.textBody, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

          // Submit CTA Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: widget.isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.check_circle_outline, size: 20),
              label: Text(
                widget.isSubmitting
                    ? l10n.dailyManualSubmitting
                    : l10n.dailyManualSubmit,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accentPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
              onPressed: (!slotEnabled || widget.isSubmitting || _items.isEmpty)
                  ? null
                  : () => widget.onSubmit(_items),
            ),
          ),
        ],
      ),
    );
  }
}

class _MacroPill extends StatelessWidget {
  final String label;
  final Color color;
  final IconData? icon;

  const _MacroPill({
    required this.label,
    required this.color,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 2),
        ],
        Text(
          label,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}

class _MacroTotalCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MacroTotalCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderOutline, width: 0.8),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
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
              fontSize: 12,
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
