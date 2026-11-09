import type { CatalogOption } from '../types/customer';
import type { GoalPayload, GoalSetting } from '../types/goal';

export interface GoalFormValues {
  name: string;
  customerId: string;
  formulaId: string;
  activityFactorId: string;
  objectiveId: string;
  physicalActivityLevelId: string;
  height: string;
  actualWeight: string;
  desiredWeight: string;
  carbohydrate: string;
  lipids: string;
  protein: string;
  customerCaloricGoal: string;
}

export const customerIdOf = (g: GoalSetting): number | null => g.customerId ?? g.customer_id ?? null;
export const formulaIdOf = (g: GoalSetting): number | null => g.formulaId ?? g.formula_id ?? null;
export const objectiveIdOf = (g: GoalSetting): number | null => g.objectiveId ?? g.objective_id ?? null;
export const actualWeightOf = (g: GoalSetting): number | null => g.actualWeight ?? g.actual_weight ?? null;
export const desiredWeightOf = (g: GoalSetting): number | null => g.desiredWeight ?? g.desired_weight ?? null;
export const caloricGoalOf = (g: GoalSetting): number | null => g.customerCaloricGoal ?? g.customer_caloric_goal ?? null;

const text = (value: number | null | undefined): string => (value === null || value === undefined ? '' : String(value));

export interface GoalCatalogs {
  customers: Array<CatalogOption>;
  formulas: CatalogOption[];
  activityFactors: CatalogOption[];
  objectives: CatalogOption[];
  activityLevels: CatalogOption[];
}

/** Novo registro: nome padrão e o primeiro item de cada catálogo. */
export const newGoalDefaults = (catalogs: GoalCatalogs, defaultName: string): GoalFormValues => ({
  name: defaultName,
  customerId: text(catalogs.customers[0]?.id),
  formulaId: text(catalogs.formulas[0]?.id),
  activityFactorId: text(catalogs.activityFactors[0]?.id),
  objectiveId: text(catalogs.objectives[0]?.id),
  physicalActivityLevelId: text(catalogs.activityLevels[0]?.id),
  height: '', actualWeight: '', desiredWeight: '', carbohydrate: '', lipids: '', protein: '', customerCaloricGoal: '',
});

export const goalToForm = (g: GoalSetting): GoalFormValues => ({
  name: g.name || '',
  customerId: text(customerIdOf(g)),
  formulaId: text(formulaIdOf(g)),
  activityFactorId: text(g.activityFactorId ?? g.activity_factor_id),
  objectiveId: text(objectiveIdOf(g)),
  physicalActivityLevelId: text(g.physicalActivityLevelId ?? g.physical_activity_level_id),
  height: text(g.height),
  actualWeight: text(actualWeightOf(g)),
  desiredWeight: text(desiredWeightOf(g)),
  carbohydrate: text(g.carbohydrate),
  lipids: text(g.lipids),
  protein: text(g.protein),
  customerCaloricGoal: text(caloricGoalOf(g)),
});

const intOrNull = (value: string): number | null => (value !== '' ? Number.parseInt(value, 10) : null);
const floatOrNull = (value: string): number | null => (value !== '' ? Number.parseFloat(value) : null);

export const toGoalPayload = (v: GoalFormValues): GoalPayload => ({
  name: v.name.trim(),
  customerId: Number.parseInt(v.customerId, 10),
  formulaId: intOrNull(v.formulaId),
  activityFactorId: intOrNull(v.activityFactorId),
  objectiveId: intOrNull(v.objectiveId),
  physicalActivityLevelId: intOrNull(v.physicalActivityLevelId),
  height: floatOrNull(v.height),
  actualWeight: floatOrNull(v.actualWeight),
  desiredWeight: floatOrNull(v.desiredWeight),
  carbohydrate: floatOrNull(v.carbohydrate),
  lipids: floatOrNull(v.lipids),
  protein: floatOrNull(v.protein),
  customerCaloricGoal: floatOrNull(v.customerCaloricGoal),
});
