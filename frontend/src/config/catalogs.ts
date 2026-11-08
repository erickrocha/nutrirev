import type { ComponentType } from 'react';
import { Activity, AlertCircle, Calculator, CalendarDays, Compass, Flame, Heart, Stethoscope, Utensils, Zap } from 'lucide-react';
import {
  activityFactorService, bowelFunctionService, clinicalConditionsService, dailyMealService,
  dietaryRestrictionService, formulaService, objectiveService, physicalActivityLevelService,
  preExistingConditionsService, prepareMealService,
} from '../services/clinicalService';
import { PATHS, editPath as editRoute, newPath as newRoute } from '../router/routeConfig';
import type { CatalogItem, CatalogService } from '../types/catalog';

export interface CatalogConfig {
  key: string;
  /** Prefixo das chaves de tradução: clinical.<i18nKey>.{title,subtitle,entityName}. */
  i18nKey: string;
  path: string;
  service: CatalogService;
  icon: ComponentType<{ size?: number; className?: string }>;
  importEnabled: boolean;
}

export const CATALOGS: CatalogConfig[] = [
  { key: 'activity_factor', i18nKey: 'activityFactor', path: PATHS.ACTIVITY_FACTORS, service: activityFactorService, icon: Zap, importEnabled: true },
  { key: 'bowel_function', i18nKey: 'bowelFunction', path: PATHS.BOWEL_FUNCTIONS, service: bowelFunctionService, icon: Activity, importEnabled: true },
  { key: 'clinical_conditions', i18nKey: 'clinicalCondition', path: PATHS.CLINICAL_CONDITIONS, service: clinicalConditionsService, icon: Stethoscope, importEnabled: true },
  { key: 'daily_meal', i18nKey: 'dailyMeal', path: PATHS.DAILY_MEALS, service: dailyMealService, icon: CalendarDays, importEnabled: false },
  { key: 'dietary_restriction', i18nKey: 'dietaryRestriction', path: PATHS.DIETARY_RESTRICTIONS, service: dietaryRestrictionService, icon: AlertCircle, importEnabled: true },
  { key: 'formula', i18nKey: 'formula', path: PATHS.FORMULAS, service: formulaService, icon: Calculator, importEnabled: true },
  { key: 'objective', i18nKey: 'objective', path: PATHS.OBJECTIVES, service: objectiveService, icon: Compass, importEnabled: true },
  { key: 'physical_activity_level', i18nKey: 'physicalActivityLevel', path: PATHS.PHYSICAL_ACTIVITY_LEVELS, service: physicalActivityLevelService, icon: Flame, importEnabled: true },
  { key: 'pre_existing_conditions', i18nKey: 'preExistingCondition', path: PATHS.PRE_EXISTING_CONDITIONS, service: preExistingConditionsService, icon: Heart, importEnabled: true },
  { key: 'prepare_meal', i18nKey: 'prepareMeal', path: PATHS.PREPARE_MEALS, service: prepareMealService, icon: Utensils, importEnabled: false },
];

export const newPath = (catalog: CatalogConfig): string => newRoute(catalog.path);
export const editPath = (catalog: CatalogConfig, id: number | string): string => editRoute(catalog.path, id);

export const findCatalog = (key: string): CatalogConfig | undefined => CATALOGS.find((catalog) => catalog.key === key);
export type { CatalogItem };
