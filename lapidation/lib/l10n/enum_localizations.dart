import 'app_localizations.dart';

enum BusinessEnumGroup {
  role,
  measurementUnit,
  recommendedPeriod,
  mealPlanCategory,
  mealPlanGenerationStatus,
  mealType,
}

String enumLabel(AppLocalizations l10n, BusinessEnumGroup group, String value) {
  final labels = switch (group) {
    BusinessEnumGroup.role => {
      'SysAdmin': l10n.enumRoleSysAdmin,
      'TenantOwner': l10n.enumRoleTenantOwner,
      'TenantUser': l10n.enumRoleTenantUser,
      'User': l10n.enumRoleUser,
    },
    BusinessEnumGroup.measurementUnit => {
      'Grams': l10n.enumUnitGrams,
      'Kg': l10n.enumUnitKg,
      'Ml': l10n.enumUnitMl,
      'Liter': l10n.enumUnitLiter,
      'Units': l10n.enumUnitUnits,
      'Cup': l10n.enumUnitCup,
      'TableSpoon': l10n.enumUnitTableSpoon,
      'TeaSpoon': l10n.enumUnitTeaSpoon,
      'CoffeeSpoon': l10n.enumUnitCoffeeSpoon,
      'DessertSpoon': l10n.enumUnitDessertSpoon,
      'Pinch': l10n.enumUnitPinch,
      'Slice': l10n.enumUnitSlice,
      'Shell': l10n.enumUnitShell,
      'Glass': l10n.enumUnitGlass,
      'LittleSquares': l10n.enumUnitLittleSquares,
      'Scoop': l10n.enumUnitScoop,
    },
    BusinessEnumGroup.recommendedPeriod => {
      'Weekly': l10n.enumPeriodWeekly,
      'Monthly': l10n.enumPeriodMonthly,
    },
    BusinessEnumGroup.mealPlanCategory => {
      'LoseWeight': l10n.enumCategoryLoseWeight,
      'KeepFit': l10n.enumCategoryKeepFit,
      'EarnWeight': l10n.enumCategoryEarnWeight,
      'Hypocaloric': l10n.enumCategoryHypocaloric,
      'Hypertrophy': l10n.enumCategoryHypertrophy,
      'Maintenance': l10n.enumCategoryMaintenance,
      'Ketogenic': l10n.enumCategoryKetogenic,
      'LowCarb': l10n.enumCategoryLowCarb,
    },
    BusinessEnumGroup.mealPlanGenerationStatus => {
      'Draft': l10n.enumStatusDraft,
      'Finished': l10n.enumStatusFinished,
    },
    BusinessEnumGroup.mealType => {
      'Breakfast': l10n.enumMealTypeBreakfast,
      'MorningSnack': l10n.enumMealTypeMorningSnack,
      'Lunch': l10n.enumMealTypeLunch,
      'Snack': l10n.enumMealTypeSnack,
      'Dinner': l10n.enumMealTypeDinner,
      'Supper': l10n.enumMealTypeSupper,
      'PreWorkout': l10n.enumMealTypePreWorkout,
      'PostWorkout': l10n.enumMealTypePostWorkout,
    },
  };

  return labels[value] ?? value;
}
