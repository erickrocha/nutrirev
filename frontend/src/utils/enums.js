export const ROLES = Object.freeze({
  SYS_ADMIN: 'SysAdmin',
  TENANT_OWNER: 'TenantOwner',
  TENANT_USER: 'TenantUser',
  USER: 'User',
});

export const ENUM_VALUES = Object.freeze({
  role: Object.values(ROLES),
  measurementUnit: [
    'Grams',
    'Kg',
    'Ml',
    'Liter',
    'Units',
    'Cup',
    'Tablespoon',
    'TeaSpoon',
    'CoffeeSpoon',
    'DessertSpoon',
    'Pinch',
    'Slice',
    'Shell',
    'Glass',
    'LittleSquares',
    'Scoop',
  ],
  recommendedPeriod: ['Weekly', 'Monthly'],
  mealPlanCategory: [
    'LoseWeight',
    'KeepFit',
    'EarnWeight',
    'Hypocaloric',
    'Hypertrophy',
    'Maintenance',
    'Ketogenic',
    'LowCarb',
  ],
  mealPlanGenerationStatus: ['Draft', 'Finished'],
  mealType: [
    'Breakfast',
    'MorningSnack',
    'Lunch',
    'Snack',
    'Dinner',
    'Supper',
    'PreWorkout',
    'PostWorkout',
  ],
});

export const enumLabel = (t, group, value) => {
  if (!value) return '';
  return t(`enums.${group}.${value}`, { defaultValue: value });
};
