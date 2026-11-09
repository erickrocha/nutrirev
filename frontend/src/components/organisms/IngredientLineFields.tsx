import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '../atoms/Button';
import { FilterableMultiSelect } from '../common/FilterableMultiSelect';
import { searchIngredients } from '../../store/ingredientSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { ENUM_VALUES, enumLabel } from '../../utils/enums';
import { ingredientPickerOptions } from '../../utils/ingredients';

interface Props {
  /** Caminho do item no formulário, por exemplo `ingredients.0` ou `meals.1.options.0.items.2`. */
  name: string;
  lang: 'pt' | 'en';
  onRemove: () => void;
}

/** Uma linha de ingrediente: busca no servidor, quantidade e unidade. Vive dentro de um `FormProvider`. */
export const IngredientLineFields = ({ name, lang, onRemove }: Props) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { control, register } = useFormContext();
  const { ingredientsList, ingredientOptions } = useAppSelector((state) => state.ingredient);

  return (
    <div className="mb-2 grid grid-cols-[1fr_auto] items-center gap-2 md:grid-cols-[3.5fr_1fr_1.3fr_auto]">
      <Controller name={`${name}.ingredientId`} control={control} render={({ field }) => (
        <FilterableMultiSelect
          label="" isSingleSelect isClearable
          options={ingredientPickerOptions(field.value, ingredientsList, ingredientOptions, lang, (item, label) =>
            `${label} (${item.kcal || 0}kcal, P:${item.protein || 0}g, C:${item.carbs || 0}g, F:${item.fat || 0}g, Fi:${item.fiber || 0}g)`)}
          onSearch={(q: string) => dispatch(searchIngredients({ q, lang }))}
          selectedIds={field.value ? [field.value] : []} onChange={(ids) => field.onChange(ids[0] ?? '')}
          placeholder={t('mealPlanForm.selectIngredient')} emptyMessage={t('mealPlanForm.noIngredientFound')}
        />
      )} />
      <input
        type="number" min={0} step="any" aria-label={t('mealPlanForm.qtyPlaceholder')} placeholder={t('mealPlanForm.qtyPlaceholder')}
        className="box-border h-10 w-full rounded-lg border border-[var(--border-color)] bg-white px-2 hover:border-[var(--accent-primary)]"
        {...register(`${name}.quantity`)}
      />
      <select
        aria-label={t('mealPlanForm.selectUnit')}
        className="h-10 w-full rounded-lg border border-[var(--border-color)] bg-white px-2 hover:border-[var(--accent-primary)]"
        {...register(`${name}.unit`)}
      >
        {ENUM_VALUES.measurementUnit.map((unit: string) => <option key={unit} value={unit}>{enumLabel(t, 'measurementUnit', unit)}</option>)}
      </select>
      <Button variant="outline" onClick={onRemove} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={16} /></Button>
    </div>
  );
};
