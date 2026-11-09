export interface HomeCustomer {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  city?: string;
  province?: string;
  photoBase64?: string;
  photoUrl?: string;
  photo?: string;
}

export interface DailySlot { id: number; name: string }

export interface DashboardSummary { caloriesConsumed: number; mealsLogged: number; totalPoints: number }

export interface AnalysisItem { name: string; estimated_grams?: number | null; calories?: number }
export interface AnalysisTotals { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number }

export interface MealAnalysis {
  status?: string;
  analysis_id?: string | number;
  totals?: AnalysisTotals;
  items?: AnalysisItem[];
}

export interface MealLog {
  log_id: number | string;
  daily_meal_id: number;
  photo?: string | null;
  totals?: AnalysisTotals;
  items?: AnalysisItem[];
}
