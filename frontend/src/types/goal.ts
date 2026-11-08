export interface GoalSetting {
  id: number;
  name: string;
  customerId?: number | null;
  formulaId?: number | null;
  activityFactorId?: number | null;
  objectiveId?: number | null;
  physicalActivityLevelId?: number | null;
  height?: number | null;
  actualWeight?: number | null;
  desiredWeight?: number | null;
  carbohydrate?: number | null;
  lipids?: number | null;
  protein?: number | null;
  customerCaloricGoal?: number | null;
  // A API já respondeu nos dois formatos; as telas aceitam ambos.
  customer_id?: number | null;
  formula_id?: number | null;
  activity_factor_id?: number | null;
  objective_id?: number | null;
  physical_activity_level_id?: number | null;
  actual_weight?: number | null;
  desired_weight?: number | null;
  customer_caloric_goal?: number | null;
}

export type GoalPayload = Omit<GoalSetting, 'id' | 'customer_id' | 'formula_id' | 'activity_factor_id' | 'objective_id' | 'physical_activity_level_id' | 'actual_weight' | 'desired_weight' | 'customer_caloric_goal'>;
