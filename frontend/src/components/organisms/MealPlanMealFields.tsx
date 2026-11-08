import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../atoms/Button';
import { IngredientLineFields } from './IngredientLineFields';
import { useAppSelector } from '../../store/hooks';
import { ENUM_VALUES, enumLabel } from '../../utils/enums';
import { newItem, newOption, type MealPlanFormValues } from '../../utils/mealPlanForm';
import { optionMacros } from '../../utils/manualMeal';

interface OptionProps {
  mealIndex: number;
  optionIndex: number;
  lang: 'pt' | 'en';
  onRemove: () => void;
  canRemove: boolean;
}

const OptionFields = ({ mealIndex, optionIndex, lang, onRemove, canRemove }: OptionProps) => {
  const { t } = useTranslation();
  const { control, register } = useFormContext<MealPlanFormValues>();
  const base = `meals.${mealIndex}.options.${optionIndex}` as const;
  const { fields, append, remove } = useFieldArray({ control, name: `${base}.items` });
  const items = useWatch({ control, name: `${base}.items` }) ?? [];
  const ingredientOptions = useAppSelector((state) => state.ingredient.ingredientOptions);
  const ingredientsList = useAppSelector((state) => state.ingredient.ingredientsList);
  const macros = optionMacros(items, ingredientsList);

  return (
    <div className="mb-3 rounded-xl border border-[var(--border-color)] bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <input
          aria-label={t('mealPlanForm.optionPrefix')} className="h-9 w-48 rounded-lg border border-[var(--border-color)] bg-white px-2 text-[.85rem] font-semibold hover:border-[var(--accent-primary)]"
          {...register(`${base}.label`)}
        />
        {canRemove && <Button variant="outline" onClick={onRemove} title={t('mealPlanForm.removeOption')} aria-label={t('mealPlanForm.removeOption')}><Trash2 size={14} /></Button>}
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[.8rem] text-[var(--text-body)]">
        <span>{t('mealPlanForm.foodsIngredients')} <span className="text-[.75rem]">({macros.kcal}kcal | P:{macros.p}g | C:{macros.c}g | F:{macros.f}g | Fi:{macros.fi}g)</span></span>
        <Button variant="outline" disabled={ingredientOptions.length === 0} onClick={() => append(newItem(ingredientOptions[0]?.id ?? ''))}><Plus size={14} />{t('mealPlanForm.addFood')}</Button>
      </div>
      {fields.length === 0
        ? <p className="m-0 text-[.8rem] text-[var(--text-body)]">{t('mealPlanForm.noIngredients')}</p>
        : fields.map((field, index) => <IngredientLineFields key={field.id} name={`${base}.items.${index}`} lang={lang} onRemove={() => remove(index)} />)}
    </div>
  );
};

interface MealProps {
  mealIndex: number;
  lang: 'pt' | 'en';
  onRemove: () => void;
}

export const MealPlanMealFields = ({ mealIndex, lang, onRemove }: MealProps) => {
  const { t } = useTranslation();
  const { control, register } = useFormContext<MealPlanFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: `meals.${mealIndex}.options` });
  const base = `meals.${mealIndex}` as const;

  return (
    <section className="mb-4 rounded-2xl border border-[var(--border-color)] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select aria-label={t('mealPlanForm.mealsPrescription')} className="h-10 rounded-lg border border-[var(--border-color)] bg-white px-2 font-semibold hover:border-[var(--accent-primary)]" {...register(`${base}.mealType`)}>
          {ENUM_VALUES.mealType.map((type: string) => <option key={type} value={type}>{enumLabel(t, 'mealType', type)}</option>)}
        </select>
        <label className="flex items-center gap-1 text-[.82rem] text-slate-600"><input type="checkbox" {...register(`${base}.isPreWorkout`)} /><span>{t('mealPlanForm.preWorkout')}</span></label>
        <label className="flex items-center gap-1 text-[.82rem] text-slate-600"><input type="checkbox" {...register(`${base}.isPostWorkout`)} /><span>{t('mealPlanForm.postWorkout')}</span></label>
        <Button variant="outline" className="ml-auto" onClick={onRemove} title={t('mealPlanForm.deleteMeal')} aria-label={t('mealPlanForm.deleteMeal')}><Trash2 size={15} /></Button>
      </div>
      {fields.map((field, optionIndex) => (
        <OptionFields key={field.id} mealIndex={mealIndex} optionIndex={optionIndex} lang={lang} canRemove={fields.length > 1} onRemove={() => remove(optionIndex)} />
      ))}
      <Button variant="outline" onClick={() => append(newOption(`${t('mealPlanForm.optionPrefix')}${fields.length + 1}`))}><Plus size={14} />{t('mealPlanForm.optionPrefix')}{fields.length + 1}</Button>
      <textarea
        rows={2} aria-label={t('mealPlanForm.nutritionistNote')} placeholder={t('mealPlanForm.nutritionistNote')} className="mt-3 box-border w-full rounded-lg border border-[var(--border-color)] bg-white p-2 text-[.85rem] hover:border-[var(--accent-primary)]"
        {...register(`${base}.nutritionistNote`)}
      />
    </section>
  );
};
