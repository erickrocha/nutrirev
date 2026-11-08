import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Flame, Plus, Search, X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { searchManualIngredients } from '../../store/manualMealSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { ENUM_VALUES, enumLabel } from '../../utils/enums';
import { ingredientName } from '../../utils/ingredients';
import { itemMacros, type MealItem } from '../../utils/manualMeal';
import type { Ingredient } from '../../types/ingredient';

const SEARCH_DELAY_MS = 300;
const GRAM_PORTIONS = [50, 100, 150, 200];
const UNIT_PORTIONS = [1, 2, 3];

interface Props {
  lang: 'pt' | 'en';
  onAdd: (item: MealItem) => void;
}

export const IngredientQuickAdd = ({ lang, onAdd }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { options, searching } = useAppSelector((state) => state.manualMeal);
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), SEARCH_DELAY_MS);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Ingredient | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('Grams');
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => { dispatch(searchManualIngredients({ q: debounced, lang })); }, [dispatch, debounced, lang]);
  useEffect(() => {
    const onOutside = (event: MouseEvent) => { if (container.current && !container.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const macros = useMemo(() => (active ? itemMacros(active, Number(quantity), unit) : null), [active, quantity, unit]);
  const step = unit === 'Grams' ? 10 : 1;
  const unitName = enumLabel(t, 'measurementUnit', unit);

  const choose = (ingredient: Ingredient) => { setActive(ingredient); setQuantity('100'); setUnit('Grams'); setQuery(''); setOpen(false); };
  const add = () => {
    const qty = Number.parseFloat(quantity);
    if (!active || !macros || !(qty > 0)) return;
    onAdd({ ingredientId: active.id, name: ingredientName(active, lang) ?? active.name, quantity: qty, unit, macros });
    setActive(null);
  };

  return (
    <div ref={container}>
      <div className="relative">
        <Search size={18} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" role="combobox" aria-expanded={open} aria-controls="ingredient-options" aria-label={t('manualMealAnalysis.searchIngredientPlaceholder')}
          placeholder={t('manualMealAnalysis.searchIngredientPlaceholder')} value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          className="box-border w-full rounded-lg border border-[var(--border-color)] bg-white py-[10px] pl-[38px] pr-9 hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
        />
        {query && <button type="button" onClick={() => setQuery('')} aria-label={t('common.close')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"><X size={16} /></button>}
        {open && (
          <ul id="ingredient-options" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full list-none overflow-y-auto rounded-lg border border-[var(--border-color)] bg-white p-0 shadow-lg">
            {searching ? <li className="p-3 text-[.85rem] text-[var(--text-body)]">{t('manualMealAnalysis.searching')}</li>
              : options.length === 0 ? <li className="p-3 text-[.85rem] text-[var(--text-body)]">{t('manualMealAnalysis.noIngredientsFound', { query })}</li>
              : options.map((ingredient) => (
                <li key={ingredient.id} role="option" aria-selected={false} onMouseDown={() => choose(ingredient)} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50">
                  <span className="flex flex-col">
                    <span className="font-medium text-[var(--text-heading)]">{ingredientName(ingredient, lang)}</span>
                    <span className="text-[.75rem] text-[var(--text-body)]">{Math.round(ingredient.kcal || 0)} kcal • {ingredient.protein || 0}g P • {ingredient.carbs || 0}g C • {ingredient.fat || 0}g F / 100g</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </li>
              ))}
          </ul>
        )}
      </div>

      {active && macros && (
        <div className="mt-4 rounded-xl border border-[var(--border-color)] bg-slate-50 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h4 className="m-0 text-[1rem] text-[var(--text-heading)]">{ingredientName(active, lang)}</h4>
              <span className="text-[.78rem] text-[var(--text-body)]">{Math.round(active.kcal || 0)} kcal {t('manualMealAnalysis.nutritionPer100g')} ({active.protein || 0}g P, {active.carbs || 0}g C, {active.fat || 0}g F)</span>
            </div>
            <button type="button" onClick={() => setActive(null)} aria-label={t('common.close')} className="rounded p-1 text-slate-500 hover:bg-slate-200"><X size={18} /></button>
          </div>

          <div className="mb-3 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="quick-quantity" className="text-[.8rem] font-semibold text-[var(--text-heading)]">{t('manualMealAnalysis.quantity')}</label>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="-" onClick={() => setQuantity(String(Math.max(1, (Number(quantity) || 0) - step)))} className="h-10 w-10 rounded-lg border border-[var(--border-color)] bg-white hover:border-[var(--accent-primary)]">-</button>
                <input id="quick-quantity" type="number" min={0.1} step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="box-border h-10 w-24 rounded-lg border border-[var(--border-color)] bg-white px-2 text-center hover:border-[var(--accent-primary)]" />
                <button type="button" aria-label="+" onClick={() => setQuantity(String((Number(quantity) || 0) + step))} className="h-10 w-10 rounded-lg border border-[var(--border-color)] bg-white hover:border-[var(--accent-primary)]">+</button>
              </div>
            </div>
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="quick-unit" className="text-[.8rem] font-semibold text-[var(--text-heading)]">{t('manualMealAnalysis.unit')}</label>
              <select id="quick-unit" value={unit} onChange={(event) => setUnit(event.target.value)} className="h-10 rounded-lg border border-[var(--border-color)] bg-white px-2 hover:border-[var(--accent-primary)]">
                {ENUM_VALUES.measurementUnit.map((value: string) => <option key={value} value={value}>{enumLabel(t, 'measurementUnit', value)}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {(unit === 'Grams' ? GRAM_PORTIONS : UNIT_PORTIONS).map((portion) => (
              <button key={portion} type="button" onClick={() => setQuantity(String(portion))} className="rounded-full border border-[var(--border-color)] bg-white px-3 py-1 text-[.8rem] hover:border-[var(--accent-primary)]">
                {unit === 'Grams' ? `${portion}g` : `${portion} ${unitName}`}
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap gap-2 text-[.85rem]">
            <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700"><Flame size={14} />{macros.calories} kcal</span>
            <span className="rounded-full bg-white px-3 py-1">P: {macros.protein}g</span>
            <span className="rounded-full bg-white px-3 py-1">C: {macros.carbs}g</span>
            <span className="rounded-full bg-white px-3 py-1">F: {macros.fat}g</span>
          </div>

          <Button onClick={add} disabled={!quantity || Number(quantity) <= 0}><Plus size={18} />{t('manualMealAnalysis.quickAdd')}</Button>
        </div>
      )}
    </div>
  );
};
