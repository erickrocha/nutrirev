import { useTranslation } from 'react-i18next';
import type { Macros } from '../../utils/manualMeal';

const CARDS = [
  { key: 'calories', label: 'manualMealAnalysis.calories', unit: ' kcal', tone: 'bg-orange-50 text-orange-700' },
  { key: 'protein', label: 'manualMealAnalysis.protein', unit: 'g', tone: 'bg-rose-50 text-rose-700' },
  { key: 'carbs', label: 'manualMealAnalysis.carbs', unit: 'g', tone: 'bg-amber-50 text-amber-700' },
  { key: 'fat', label: 'manualMealAnalysis.fat', unit: 'g', tone: 'bg-sky-50 text-sky-700' },
] as const;

export const MacroGrid = ({ macros }: { macros: Macros }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {CARDS.map(({ key, label, unit, tone }) => (
        <div key={key} className={`rounded-xl p-3 text-center ${tone}`}>
          <div className="text-[.78rem] font-medium">{t(label)}</div>
          <div className="text-[1.25rem] font-semibold">{macros[key]}{unit}</div>
        </div>
      ))}
    </div>
  );
};
