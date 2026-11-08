import { useTranslation } from 'react-i18next';
import type { AnalysisItem, AnalysisTotals } from '../../types/customerApp';

const CARDS = [
  { key: 'daily.calories', tone: 'bg-orange-50 text-orange-700', value: (t: AnalysisTotals) => `${Math.round(t.calories || 0)} kcal` },
  { key: 'daily.protein', tone: 'bg-rose-50 text-rose-700', value: (t: AnalysisTotals) => `${(t.protein_g || 0).toFixed(1)}g` },
  { key: 'daily.carbs', tone: 'bg-amber-50 text-amber-700', value: (t: AnalysisTotals) => `${(t.carbs_g || 0).toFixed(1)}g` },
  { key: 'daily.fat', tone: 'bg-sky-50 text-sky-700', value: (t: AnalysisTotals) => `${(t.fat_g || 0).toFixed(1)}g` },
];

export const NutritionBreakdown = ({ totals, items }: { totals?: AnalysisTotals; items?: AnalysisItem[] }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {CARDS.map(({ key, tone, value }) => (
          <div key={key} className={`rounded-xl p-3 text-center ${tone}`}>
            <div className="text-[.78rem] font-medium">{t(key)}</div>
            <div className="text-[1.2rem] font-semibold">{value(totals ?? {})}</div>
          </div>
        ))}
      </div>
      <ul className="m-0 mt-3 flex list-none flex-col p-0">
        {(items ?? []).map((item, index) => (
          <li key={index} className="flex items-center justify-between border-b border-slate-100 py-2 text-[.9rem]">
            <span>{item.name}{item.estimated_grams != null && <span className="ml-1 text-[.78rem] text-[var(--text-body)]">{item.estimated_grams}g</span>}</span>
            <span className="font-semibold">{Math.round(item.calories || 0)} kcal</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
