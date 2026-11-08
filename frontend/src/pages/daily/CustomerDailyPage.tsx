import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Camera, CheckCircle2, ChevronDown, ChevronUp, ImagePlus, RefreshCw, Sparkles } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { NutritionBreakdown } from '../../components/molecules/NutritionBreakdown';
import { Button } from '../../components/atoms/Button';
import { TextField } from '../../components/atoms/TextField';
import { analyzeMealPhoto, loadDailySlots, loadLogs, resetAnalysis } from '../../store/customerAppSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { todayIso } from '../../utils/date';
import type { DailySlot, MealLog } from '../../types/customerApp';

const LoggedMealCard = ({ log, slotName }: { log: MealLog; slotName: string }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
          {log.photo ? <img src={log.photo} alt={slotName} className="h-full w-full object-cover" /> : <Camera size={20} />}
        </span>
        <span className="flex-1"><span className="block font-semibold">{slotName || '—'}</span><span className="text-[.82rem] text-[var(--text-body)]">{Math.round(log.totals?.calories || 0)} kcal</span></span>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {expanded && <div className="border-t border-slate-100 p-3"><NutritionBreakdown totals={log.totals} items={log.items} /></div>}
    </div>
  );
};

export const CustomerDailyPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { slots, slotsLoading, slotsError, logs, logsLoading, logsError, analyzing, analysis, analysisFailure } = useAppSelector((state) => state.customerApp);
  const [date, setDate] = useState(todayIso());
  const [slot, setSlot] = useState<DailySlot | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [invalidImage, setInvalidImage] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const running = useRef<{ abort: () => void } | null>(null);

  useEffect(() => { dispatch(loadDailySlots()); }, [dispatch]);
  useEffect(() => { dispatch(loadLogs(date)); }, [dispatch, date]);
  // Sair da tela interrompe a espera pelo resultado.
  useEffect(() => () => { running.current?.abort(); dispatch(resetAnalysis()); }, [dispatch]);

  const reset = () => {
    running.current?.abort();
    dispatch(resetAnalysis());
    setPreview(null);
    setSlot(null);
    setInvalidImage(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const pick = (file: File | undefined) => {
    if (!file || !slot) return;
    if (!file.type.startsWith('image/')) { setInvalidImage(true); return; }
    setInvalidImage(false);
    setPreview(URL.createObjectURL(file));
    running.current = dispatch(analyzeMealPhoto({ file, mealSlotId: slot.id, date }));
  };

  const slotName = (id: number) => slots.find((item) => item.id === id)?.name ?? '';
  const failureText = invalidImage ? t('daily.invalidImage')
    : analysisFailure?.code === 'noId' ? t('daily.serverNoId')
    : analysisFailure?.code === 'tooLong' ? t('daily.analysisTakingLong')
    : analysisFailure?.code === 'api' ? analysisFailure.message || t('daily.errorAnalyzing')
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 pb-10">
      <Breadcrumb items={[{ label: t('daily.title') }]} />
      <TextField id="daily-date" type="date" label={t('daily.date')} value={date} onChange={(event) => setDate(event.target.value)} className="max-w-[220px]" />

      <section>
        <h3 className="mb-2 mt-0 text-[1.05rem]">{t('daily.loggedMeals')}</h3>
        {logsLoading ? <p className="text-[var(--text-body)]">{t('common.loading')}</p>
          : logsError ? <ErrorAlert message={t('daily.errorLoadingLogs')} onRetry={() => dispatch(loadLogs(date))} />
          : logs.length === 0 ? <p className="m-0 text-[var(--text-body)]">{t('daily.noMealsForDate')}</p>
          : logs.map((log) => <LoggedMealCard key={log.log_id} log={log} slotName={slotName(log.daily_meal_id)} />)}
      </section>

      {analyzing ? (
        <div role="status" className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-white p-6 text-center">
          {preview && <img src={preview} alt="" className="h-40 w-40 rounded-xl object-cover" />}
          <Sparkles size={28} className="animate-spin text-[var(--accent-primary)]" />
          <p className="m-0">{t('daily.analyzingMeal')}</p>
        </div>
      ) : failureText ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-300 bg-red-50 p-6 text-center text-red-700">
          <AlertCircle size={32} /><p className="m-0">{failureText}</p>
          <Button onClick={reset}><RefreshCw size={15} />{t('common.tryAgain')}</Button>
        </div>
      ) : analysis ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--border-color)] bg-white p-5">
          <h3 className="m-0">{t('daily.analysisResult')}</h3>
          {preview && <img src={preview} alt="" className="h-48 w-full rounded-xl object-cover" />}
          <NutritionBreakdown totals={analysis.totals} items={analysis.items} />
          <div role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-emerald-700"><CheckCircle2 size={18} />{t('daily.mealSavedDiary')}</div>
          <Button variant="outline" onClick={reset} className="justify-center"><ImagePlus size={16} />{t('daily.registerAnother')}</Button>
        </section>
      ) : (
        <section>
          <h3 className="mb-2 mt-0 text-[1.05rem]">{t('daily.chooseMeal')}</h3>
          {slotsLoading ? <p className="text-[var(--text-body)]">{t('common.loading')}</p>
            : slotsError ? <ErrorAlert message={t('daily.errorLoadingSlots')} onRetry={() => dispatch(loadDailySlots())} />
            : slots.length === 0 ? <p className="m-0 text-[var(--text-body)]">{t('daily.noDailyMealsAssigned')}</p>
            : (
              <div className="mb-4 flex flex-wrap gap-2">
                {slots.map((item) => (
                  <button
                    key={item.id} type="button" aria-pressed={slot?.id === item.id} onClick={() => setSlot(item)}
                    className={`rounded-full border px-4 py-[6px] text-[.85rem] font-medium hover:border-[var(--accent-primary)] ${slot?.id === item.id ? 'border-[var(--accent-primary)] bg-blue-50 text-[var(--accent-primary)]' : 'border-[var(--border-color)] bg-white'}`}
                  >{item.name}</button>
                ))}
              </div>
            )}
          <label htmlFor="meal-photo-input" className={`flex items-center gap-4 rounded-2xl border-2 border-dashed p-5 ${slot ? 'cursor-pointer border-[var(--accent-primary)] bg-blue-50 hover:bg-blue-100' : 'cursor-not-allowed border-[var(--border-color)] opacity-60'}`}>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[var(--accent-primary)]"><Camera size={34} /></span>
            <span><span className="block font-semibold">{t('daily.analyzeMeal')}</span><span className="text-[.85rem] text-[var(--text-body)]">{slot ? t('daily.takePhotoOrGallery') : t('daily.selectMealFirst')}</span></span>
            <input id="meal-photo-input" ref={fileInput} type="file" accept="image/*" capture="environment" disabled={!slot} hidden onChange={(event) => pick(event.target.files?.[0])} />
          </label>
        </section>
      )}
    </div>
  );
};
