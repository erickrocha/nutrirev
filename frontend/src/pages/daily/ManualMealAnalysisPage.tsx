import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Award, Calculator, CalendarDays, CheckCircle2, Plus, Search, Sparkles, Trash2, Utensils } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { MacroGrid } from '../../components/molecules/MacroGrid';
import { SectionCard } from '../../components/molecules/SectionCard';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import { IngredientQuickAdd } from '../../components/organisms/IngredientQuickAdd';
import { clearManualMealError, loadMealSlots, resetManualMeal, submitManualAnalysis } from '../../store/manualMealSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { todayIso } from '../../utils/date';
import { enumLabel } from '../../utils/enums';
import { sumMacros, toAnalysisPayload, type MealItem } from '../../utils/manualMeal';

interface Values { date: string; mealSlotId: string; items: MealItem[] }

export const ManualMealAnalysisPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { slots, slotsLoading, submitting, error, result } = useAppSelector((state) => state.manualMeal);

  useEffect(() => {
    dispatch(resetManualMeal());
    dispatch(loadMealSlots());
  }, [dispatch]);

  const schema = useMemo(() => yup.object({
    date: yup.string().required(t('manualMealAnalysis.date')),
    mealSlotId: yup.string().required(t('manualMealAnalysis.errorNoSlot')),
    items: yup.array().min(1, t('manualMealAnalysis.errorEmptyItems')).required(),
  }), [t]);

  const { register, handleSubmit, watch, setValue, control, reset, formState: { errors } } = useForm<Values>({
    resolver: yupResolver(schema) as never,
    defaultValues: { date: todayIso(), mealSlotId: '', items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items', keyName: 'key' });
  const slotId = watch('mealSlotId');
  const items = watch('items');
  const totals = useMemo(() => sumMacros(items), [items]);

  useEffect(() => { if (!slotId && slots.length > 0) setValue('mealSlotId', String(slots[0].id)); }, [slots, slotId, setValue]);

  const submit = (values: Values) => { dispatch(submitManualAnalysis(toAnalysisPayload(values.mealSlotId, values.date, values.items))); };
  const logAnother = () => { dispatch(resetManualMeal()); reset({ date: todayIso(), mealSlotId: slotId, items: [] }); };

  const formError = error !== null ? error || t('manualMealAnalysis.errorSubmitting') : errors.mealSlotId?.message || (errors.items as { message?: string } | undefined)?.message || null;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5 pb-14">
      <Breadcrumb items={[{ label: t('manualMealAnalysis.viewDaily'), to: PATHS.DAILY }, { label: t('manualMealAnalysis.title') }]} />
      <header className="flex flex-col gap-3">
        <Link to={PATHS.DAILY} className="flex items-center gap-1 text-[.85rem] font-semibold text-[var(--accent-primary)] no-underline"><ArrowLeft size={16} />{t('manualMealAnalysis.viewDaily')}</Link>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-[var(--accent-primary)]"><Calculator size={22} /></span>
          <div>
            <h1 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('manualMealAnalysis.title')}</h1>
            <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('manualMealAnalysis.subtitle')}</p>
          </div>
        </div>
      </header>

      {result ? (
        <section role="status" className="flex flex-col gap-5 rounded-2xl border border-[var(--border-color)] bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Sparkles size={32} /></span>
            <h2 className="m-0 text-[1.3rem]">{t('manualMealAnalysis.successTitle')}</h2>
            <p className="m-0 text-[var(--text-body)]">{t('manualMealAnalysis.successSubtitle')}</p>
            {(result.points_awarded ?? 0) > 0 && (
              <span className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1 font-semibold text-amber-700"><Award size={20} />{t('manualMealAnalysis.pointsAwarded', { points: result.points_awarded })}</span>
            )}
          </div>
          <MacroGrid macros={{
            calories: Math.round(result.totals?.calories || 0), protein: Number((result.totals?.protein_g || 0).toFixed(1)),
            carbs: Number((result.totals?.carbs_g || 0).toFixed(1)), fat: Number((result.totals?.fat_g || 0).toFixed(1)),
          }} />
          <div>
            <h4 className="mb-2 mt-0">{t('manualMealAnalysis.ingredientsList')}</h4>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {(result.items ?? []).map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex justify-between border-b border-slate-100 py-1 text-[.9rem]">
                  <span>{item.name}{item.estimated_grams != null && <span className="ml-1 text-[var(--text-body)]">({item.estimated_grams}g)</span>}</span>
                  <span className="font-semibold">{Math.round(item.calories || 0)} kcal</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
            <Button variant="outline" onClick={logAnother}><Plus size={16} />{t('manualMealAnalysis.logAnother')}</Button>
            <Button onClick={() => navigate(PATHS.DAILY)}><CheckCircle2 size={16} />{t('manualMealAnalysis.viewDaily')}</Button>
          </div>
        </section>
      ) : (
        <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
          <SectionCard title={t('manualMealAnalysis.date')} icon={<CalendarDays size={18} />}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <TextField id="manual-date" type="date" label={t('manualMealAnalysis.date')} error={errors.date?.message} {...register('date')} />
              <div role="group" aria-label={t('manualMealAnalysis.selectMealSlot')} className="flex flex-col gap-[7px]">
                <span className="flex items-center gap-1 text-[.8rem] font-semibold text-[var(--text-heading)]"><Utensils size={16} />{t('manualMealAnalysis.selectMealSlot')}</span>
                {slotsLoading ? <span className="text-[var(--text-body)]">{t('common.loading')}</span>
                  : slots.length === 0 ? <p className="m-0 text-[.85rem] text-[var(--text-body)]">{t('manualMealAnalysis.noSlotsAvailable')}</p>
                  : (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.id} type="button" aria-pressed={String(slot.id) === slotId} onClick={() => setValue('mealSlotId', String(slot.id))}
                          className={`rounded-full border px-4 py-[6px] text-[.85rem] font-medium hover:border-[var(--accent-primary)] ${String(slot.id) === slotId ? 'border-[var(--accent-primary)] bg-blue-50 text-[var(--accent-primary)]' : 'border-[var(--border-color)] bg-white'}`}
                        >{slot.name}</button>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('manualMealAnalysis.addIngredient')} icon={<Search size={18} />}>
            <p className="mx-0 mb-3 mt-0 text-[.8rem] text-[var(--text-body)]">{t('manualMealAnalysis.searchHint')}</p>
            <IngredientQuickAdd lang={lang} onAdd={(item) => { dispatch(clearManualMealError()); append(item); }} />
          </SectionCard>

          <SectionCard title={`${t('manualMealAnalysis.ingredientsList')}${fields.length ? ` (${fields.length})` : ''}`} icon={<Utensils size={18} />}>
            {fields.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-[var(--text-body)]"><Utensils size={36} /><p className="m-0">{t('manualMealAnalysis.emptyItemsMessage')}</p></div>
            ) : (
              <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
                {fields.map((field, index) => (
                  <li key={field.key} className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border-color)] p-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-[var(--text-heading)]">{field.name}</span>
                      <span className="text-[.8rem] text-[var(--text-body)]">{field.quantity} {enumLabel(t, 'measurementUnit', field.unit)}</span>
                      <span className="flex flex-wrap gap-1 text-[.75rem]">
                        <span className="rounded-full bg-orange-100 px-2 py-[1px] font-semibold text-orange-700">{field.macros.calories} kcal</span>
                        <span className="rounded-full bg-slate-100 px-2 py-[1px]">P: {field.macros.protein}g</span>
                        <span className="rounded-full bg-slate-100 px-2 py-[1px]">C: {field.macros.carbs}g</span>
                        <span className="rounded-full bg-slate-100 px-2 py-[1px]">F: {field.macros.fat}g</span>
                      </span>
                    </div>
                    <button type="button" onClick={() => remove(index)} title={t('manualMealAnalysis.removeItem')} aria-label={t('manualMealAnalysis.removeItem')} className="rounded-lg p-1 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {formError && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700"><AlertCircle size={18} />{formError}</div>}

          {fields.length > 0 && (
            <SectionCard title={t('manualMealAnalysis.summaryTitle')} icon={<Sparkles size={18} />}>
              <MacroGrid macros={totals} />
              <div className="mt-4">
                <Button type="submit" disabled={submitting} className="w-full justify-center">
                  {submitting ? <><Sparkles size={18} className="animate-spin" />{t('manualMealAnalysis.submitting')}</> : <><CheckCircle2 size={18} />{t('manualMealAnalysis.submit')}</>}
                </Button>
              </div>
            </SectionCard>
          )}
        </form>
      )}
    </div>
  );
};
