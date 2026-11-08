import { clinicalPlanService } from '../services/clinicalService';
import { createCrudSlice } from './createCrudSlice';
import type { ClinicalPlan, ClinicalPlanPayload } from '../types/clinical';

const crud = createCrudSlice<ClinicalPlan, ClinicalPlanPayload>('clinicalPlan', clinicalPlanService);
export const fetchClinicalPlans = crud.fetchAll;
export const saveClinicalPlan = crud.save;
export const clearClinicalPlanError = crud.clearError;
export default crud.reducer;
