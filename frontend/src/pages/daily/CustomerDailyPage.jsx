import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ImagePlus,
  Sparkles,
} from 'lucide-react';
import {
  customerService,
  dailyMealService,
  customerDailyMealService,
  mealLogService,
  mealAnalysisService,
} from '../../services/api';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 5 * 60 * 1000;

const todayStr = () => new Date().toISOString().split('T')[0];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MacroCard = ({ label, value, kind }) => (
  <div className={`macro-card ${kind}`}>
    <div className="macro-label">{label}</div>
    <div className="macro-value">{value}</div>
  </div>
);

const NutritionBreakdown = ({ totals, items, t }) => (
  <div>
    <div className="customer-macro-card-grid">
      <MacroCard label={t('daily.calories')} value={`${Math.round(totals?.calories || 0)} kcal`} kind="calories" />
      <MacroCard label={t('daily.protein')} value={`${(totals?.protein_g || 0).toFixed(1)}g`} kind="protein" />
      <MacroCard label={t('daily.carbs')} value={`${(totals?.carbs_g || 0).toFixed(1)}g`} kind="carbs" />
      <MacroCard label={t('daily.fat')} value={`${(totals?.fat_g || 0).toFixed(1)}g`} kind="fat" />
    </div>
    <div className="customer-macro-item-list">
      {(items || []).map((item, idx) => (
        <div key={idx} className="macro-item">
          <div className="macro-item-info">
            <div className="macro-item-name">{item.name}</div>
            {item.estimated_grams != null && (
              <div className="macro-item-grams">{item.estimated_grams}g</div>
            )}
          </div>
          <span className="macro-item-kcal">{Math.round(item.calories || 0)} kcal</span>
        </div>
      ))}
    </div>
  </div>
);

const LoggedMealCard = ({ log, mealSlotName, t }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="customer-logged-meal-card">
      <div className="logged-meal-summary" onClick={() => setExpanded((v) => !v)}>
        <div className="logged-meal-thumb">
          {log.photo ? (
            <img src={log.photo} alt={mealSlotName} />
          ) : (
            <Camera size={20} />
          )}
        </div>
        <div className="logged-meal-info">
          <div className="logged-meal-name">{mealSlotName || '—'}</div>
          <div className="logged-meal-kcal">{Math.round(log.totals?.calories || 0)} kcal</div>
        </div>
        {expanded ? <ChevronUp className="chevron" size={18} /> : <ChevronDown className="chevron" size={18} />}
      </div>
      {expanded && (
        <div className="logged-meal-details">
          <NutritionBreakdown totals={log.totals} items={log.items} t={t} />
        </div>
      )}
    </div>
  );
};

export const CustomerDailyPage = () => {
  const { t } = useTranslation();
  const [mealSlots, setMealSlots] = useState([]);
  const [mealSlotsLoading, setMealSlotsLoading] = useState(true);
  const [mealSlotsError, setMealSlotsError] = useState('');
  const [selectedMealSlot, setSelectedMealSlot] = useState(null);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');

  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');
  const fileInputRef = useRef(null);
  const cancelledRef = useRef(false);

  const loadLogs = useCallback(async (date) => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const data = await mealLogService.getLogsByDate(date);
      setLogs(data || []);
    } catch (err) {
      console.error('Error loading meal logs:', err);
      setLogsError(t('daily.errorLoadingLogs'));
    } finally {
      setLogsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    cancelledRef.current = false;
    const init = async () => {
      setMealSlotsLoading(true);
      setMealSlotsError('');
      try {
        const custData = await customerService.getMe();
        if (!custData?.id) return;
        const [all, links] = await Promise.all([
          dailyMealService.getAll(),
          customerDailyMealService.getByCustomerId(custData.id),
        ]);
        const assignedIds = new Set((links || []).map((l) => l.dailyMealId || l.daily_meal_id));
        setMealSlots((all || []).filter((m) => assignedIds.has(m.id)));
      } catch (err) {
        console.error('Error loading daily meal slots:', err);
        setMealSlotsError(t('daily.errorLoadingSlots'));
      } finally {
        setMealSlotsLoading(false);
      }
    };
    init();
    return () => {
      cancelledRef.current = true;
    };
  }, [t]);

  useEffect(() => {
    loadLogs(selectedDate);
  }, [selectedDate, loadLogs]);

  const resetAnalysis = () => {
    setImagePreview(null);
    setAnalyzing(false);
    setAnalysisResult(null);
    setAnalysisError('');
    setSelectedMealSlot(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMealSlot) return;

    if (!file.type.startsWith('image/')) {
      setAnalysisError(t('daily.invalidImage'));
      return;
    }

    setImagePreview(URL.createObjectURL(file));
    setAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file, file.name);
      formData.append('daily_meal_id', selectedMealSlot.id);
      formData.append('meal_date', selectedDate);

      let result = await mealAnalysisService.analyzePhoto(formData);

      if (result?.status !== 'completed') {
        if (!result?.analysis_id) {
          throw new Error(t('daily.serverNoId'));
        }
        const deadline = Date.now() + MAX_POLL_MS;
        while (Date.now() < deadline) {
          await wait(POLL_INTERVAL_MS);
          if (cancelledRef.current) return;
          result = await mealAnalysisService.getAnalysis(result.analysis_id);
          if (result?.status === 'completed') break;
        }
        if (result?.status !== 'completed') {
          throw new Error(t('daily.analysisTakingLong'));
        }
      }

      if (cancelledRef.current) return;
      setAnalysisResult(result);
      setAnalyzing(false);
      loadLogs(selectedDate);
    } catch (err) {
      console.error('Error analyzing meal photo:', err);
      if (cancelledRef.current) return;
      setAnalysisError(err.response?.data?.message || err.message || t('daily.errorAnalyzing'));
      setAnalyzing(false);
    }
  };

  const mealSlotName = (dailyMealId) => mealSlots.find((m) => m.id === dailyMealId)?.name || '';

  return (
    <div className="customer-daily-page">
      <div className="customer-date-picker">
        <label>{t('daily.date')}</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div>
        <h3 className="customer-section-title">{t('daily.loggedMeals')}</h3>
        {logsLoading ? (
          <div className="customer-loading-state">{t('common.loading')}</div>
        ) : logsError ? (
          <div className="customer-error-banner">
            <AlertCircle size={18} />
            <span>{logsError}</span>
          </div>
        ) : logs.length === 0 ? (
          <p>{t('daily.noMealsForDate')}</p>
        ) : (
          logs.map((log) => (
            <LoggedMealCard key={log.log_id} log={log} mealSlotName={mealSlotName(log.daily_meal_id)} t={t} />
          ))
        )}
      </div>

      {analyzing ? (
        <div className="customer-state-card">
          {imagePreview && <img className="state-preview" src={imagePreview} alt="" />}
          <Sparkles className="state-spinner" size={28} />
          <p className="state-label">{t('daily.analyzingMeal')}</p>
        </div>
      ) : analysisError ? (
        <div className="customer-state-card is-error">
          <AlertCircle className="state-error-icon" size={32} />
          <p className="state-error-message">{analysisError}</p>
          <button type="button" className="customer-btn-primary" onClick={resetAnalysis}>
            <RefreshCw size={15} /> {t('common.tryAgain')}
          </button>
        </div>
      ) : analysisResult ? (
        <div className="customer-result-card">
          <div className="result-header">
            <h3>{t('daily.analysisResult')}</h3>
          </div>
          {imagePreview && <img className="result-preview" src={imagePreview} alt="" />}
          <NutritionBreakdown totals={analysisResult.totals} items={analysisResult.items} t={t} />
          <div className="result-saved-banner">
            <CheckCircle2 size={18} />
            <span>{t('daily.mealSavedDiary')}</span>
          </div>
          <button type="button" className="customer-btn-outline" style={{ width: '100%' }} onClick={resetAnalysis}>
            <ImagePlus size={16} /> {t('daily.registerAnother')}
          </button>
        </div>
      ) : (
        <div>
          <h3 className="customer-section-title">{t('daily.chooseMeal')}</h3>
          {mealSlotsLoading ? (
            <div className="customer-loading-state">{t('common.loading')}</div>
          ) : mealSlotsError ? (
            <div className="customer-error-banner">
              <AlertCircle size={18} />
              <span>{mealSlotsError}</span>
            </div>
          ) : mealSlots.length === 0 ? (
            <p>{t('daily.noDailyMealsAssigned')}</p>
          ) : (
            <div className="customer-meal-slot-chips">
              {mealSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  className={selectedMealSlot?.id === slot.id ? 'selected' : ''}
                  onClick={() => setSelectedMealSlot(slot)}
                >
                  {slot.name}
                </button>
              ))}
            </div>
          )}

          <label htmlFor="meal-photo-input" className={`customer-capture-card ${selectedMealSlot ? '' : 'is-disabled'}`}>
            <div className="capture-icon-circle">
              <Camera size={34} />
            </div>
            <div>
              <p className="capture-title">{t('daily.analyzeMeal')}</p>
              <p className="capture-subtitle">
                {selectedMealSlot ? t('daily.takePhotoOrGallery') : t('daily.selectMealFirst')}
              </p>
            </div>
            <input
              id="meal-photo-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={!selectedMealSlot}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}
    </div>
  );
};
