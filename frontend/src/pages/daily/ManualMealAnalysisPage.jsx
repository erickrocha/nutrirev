import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calculator,
  CalendarDays,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Utensils,
  X,
  ChevronRight,
  Flame,
  Award,
} from 'lucide-react';
import {
  customerService,
  dailyMealService,
  customerDailyMealService,
  ingredientService,
  mealAnalysisService,
} from '../../services/api';
import { PATHS } from '../../router/routeConfig';
import { ENUM_VALUES, enumLabel } from '../../utils/enums';

const todayStr = () => new Date().toISOString().split('T')[0];

const UNIT_MULTIPLIERS = {
  Grams: 1.0,
  Kg: 1000.0,
  Ml: 1.0,
  Liter: 1000.0,
  Units: 1.0,
  Cup: 120.0,
  TableSpoon: 15.0,
  Tablespoon: 15.0,
  TeaSpoon: 5.0,
  CoffeeSpoon: 2.5,
  DessertSpoon: 10.0,
  Pinch: 0.5,
  Slice: 30.0,
  Shell: 100.0,
  Glass: 200.0,
  LittleSquares: 10.0,
  Scoop: 30.0,
};

export const ManualMealAnalysisPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Selection state
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [mealSlots, setMealSlots] = useState([]);
  const [selectedMealSlotId, setSelectedMealSlotId] = useState(null);
  const [mealSlotsLoading, setMealSlotsLoading] = useState(true);

  // Ingredients catalog
  const [ingredients, setIngredients] = useState([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Quick-Add draft state
  const [activeIngredient, setActiveIngredient] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(100);
  const [itemUnit, setItemUnit] = useState('Grams');

  // Selected meal items list
  const [selectedItems, setSelectedItems] = useState([]);

  // Submission / result state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const searchContainerRef = useRef(null);

  // Load daily meal slots and ingredients catalog
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setMealSlotsLoading(true);
      setIngredientsLoading(true);
      try {
        const [custData, allSlots, allIngredients] = await Promise.all([
          customerService.getMe().catch(() => null),
          dailyMealService.getAll().catch(() => []),
          ingredientService.getAll().catch(() => []),
        ]);

        if (cancelled) return;

        let userSlots = allSlots || [];
        if (custData?.id) {
          try {
            const links = await customerDailyMealService.getByCustomerId(custData.id);
            const assignedIds = new Set((links || []).map((l) => l.dailyMealId || l.daily_meal_id));
            const filtered = (allSlots || []).filter((m) => assignedIds.has(m.id));
            if (filtered.length > 0) {
              userSlots = filtered;
            }
          } catch (e) {
            console.warn('Could not load customer-specific daily meal links, using all slots:', e);
          }
        }

        setMealSlots(userSlots);
        if (userSlots.length > 0) {
          setSelectedMealSlotId(userSlots[0].id);
        }

        setIngredients(allIngredients || []);
      } catch (err) {
        console.error('Error loading manual analysis form data:', err);
      } finally {
        if (!cancelled) {
          setMealSlotsLoading(false);
          setIngredientsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ingredients.slice(0, 15);
    return ingredients
      .filter((ing) => (ing.name || '').toLowerCase().includes(q))
      .slice(0, 25);
  }, [ingredients, searchQuery]);

  // Handle selecting an ingredient from search list to configure
  const handleSelectIngredient = (ingredient) => {
    setActiveIngredient(ingredient);
    setItemQuantity(100);
    setItemUnit('Grams');
    setSearchQuery('');
    setSearchFocused(false);
  };

  // Compute live nutritional macros for a single item draft
  const activeItemMacros = useMemo(() => {
    if (!activeIngredient) return null;
    const multiplier = UNIT_MULTIPLIERS[itemUnit] ?? 1.0;
    const factor = (Number(itemQuantity) || 0) * multiplier / 100.0;

    return {
      calories: Math.round(((activeIngredient.kcal || 0) * factor) * 10) / 10,
      protein: Math.round(((activeIngredient.protein || 0) * factor) * 10) / 10,
      carbs: Math.round(((activeIngredient.carbs || 0) * factor) * 10) / 10,
      fat: Math.round(((activeIngredient.fat || 0) * factor) * 10) / 10,
    };
  }, [activeIngredient, itemQuantity, itemUnit]);

  // Add configured ingredient to meal items list
  const handleAddItem = () => {
    if (!activeIngredient) return;
    const qty = parseFloat(itemQuantity);
    if (isNaN(qty) || qty <= 0) return;

    const newItem = {
      tempId: Date.now() + Math.random(),
      ingredientId: activeIngredient.id,
      name: activeIngredient.name,
      quantity: qty,
      unit: itemUnit,
      macros: activeItemMacros,
      ingredient: activeIngredient,
    };

    setSelectedItems((prev) => [...prev, newItem]);
    setActiveIngredient(null);
  };

  // Remove item from selected list
  const handleRemoveItem = (tempId) => {
    setSelectedItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  // Live total macros of all selected items in meal
  const liveTotals = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const item of selectedItems) {
      if (item.macros) {
        calories += item.macros.calories || 0;
        protein += item.macros.protein || 0;
        carbs += item.macros.carbs || 0;
        fat += item.macros.fat || 0;
      }
    }

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    };
  }, [selectedItems]);

  // Submit manual meal analysis
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedMealSlotId) {
      setSubmitError(t('manualMealAnalysis.errorNoSlot'));
      return;
    }

    if (selectedItems.length === 0) {
      setSubmitError(t('manualMealAnalysis.errorEmptyItems'));
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        daily_meal_id: Number(selectedMealSlotId),
        meal_date: selectedDate,
        items: selectedItems.map((item) => ({
          ingredient_id: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      };

      const res = await mealAnalysisService.analyzeManual(payload);
      setSuccessResult(res);
    } catch (err) {
      console.error('Error submitting manual meal analysis:', err);
      const msg = err.response?.data?.message || err.message || t('manualMealAnalysis.errorSubmitting');
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form to log another meal
  const handleReset = () => {
    setSelectedItems([]);
    setActiveIngredient(null);
    setSuccessResult(null);
    setSubmitError('');
  };

  return (
    <div className="manual-meal-analysis-page customer-daily-page">
      {/* Top Header & Back Navigation */}
      <div className="manual-meal-header">
        <Link to={PATHS.DAILY} className="customer-back-link">
          <ArrowLeft size={16} />
          <span>{t('manualMealAnalysis.viewDaily')}</span>
        </Link>
        <div className="header-title-wrap">
          <div className="header-icon-pill">
            <Calculator size={22} />
          </div>
          <div>
            <h1 className="customer-page-title">{t('manualMealAnalysis.title')}</h1>
            <p className="customer-page-subtitle">{t('manualMealAnalysis.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Success Celebration View */}
      {successResult ? (
        <div className="customer-result-card manual-success-card">
          <div className="success-header-celebration">
            <div className="celebration-badge-circle">
              <Sparkles size={32} />
            </div>
            <h2>{t('manualMealAnalysis.successTitle')}</h2>
            <p className="success-sub">{t('manualMealAnalysis.successSubtitle')}</p>

            {successResult.points_awarded != null && successResult.points_awarded > 0 && (
              <div className="gamification-points-pill">
                <Award size={20} />
                <span>{t('manualMealAnalysis.pointsAwarded', { points: successResult.points_awarded })}</span>
              </div>
            )}
          </div>

          <div className="success-macros-summary">
            <div className="customer-macro-card-grid">
              <div className="macro-card calories">
                <div className="macro-label">{t('manualMealAnalysis.calories')}</div>
                <div className="macro-value">{Math.round(successResult.totals?.calories || 0)} kcal</div>
              </div>
              <div className="macro-card protein">
                <div className="macro-label">{t('manualMealAnalysis.protein')}</div>
                <div className="macro-value">{(successResult.totals?.protein_g || 0).toFixed(1)}g</div>
              </div>
              <div className="macro-card carbs">
                <div className="macro-label">{t('manualMealAnalysis.carbs')}</div>
                <div className="macro-value">{(successResult.totals?.carbs_g || 0).toFixed(1)}g</div>
              </div>
              <div className="macro-card fat">
                <div className="macro-label">{t('manualMealAnalysis.fat')}</div>
                <div className="macro-value">{(successResult.totals?.fat_g || 0).toFixed(1)}g</div>
              </div>
            </div>
          </div>

          <div className="success-items-list">
            <h4>{t('manualMealAnalysis.ingredientsList')}</h4>
            {(successResult.items || []).map((item, idx) => (
              <div key={idx} className="macro-item">
                <div className="macro-item-info">
                  <span className="macro-item-name">{item.name}</span>
                  {item.estimated_grams != null && (
                    <span className="macro-item-grams">({item.estimated_grams}g)</span>
                  )}
                </div>
                <span className="macro-item-kcal">{Math.round(item.calories || 0)} kcal</span>
              </div>
            ))}
          </div>

          <div className="success-actions-row">
            <button
              type="button"
              className="customer-btn-secondary"
              onClick={handleReset}
            >
              <Plus size={16} />
              {t('manualMealAnalysis.logAnother')}
            </button>
            <button
              type="button"
              className="customer-btn-primary"
              onClick={() => navigate(PATHS.DAILY)}
            >
              <CheckCircle2 size={16} />
              {t('manualMealAnalysis.viewDaily')}
            </button>
          </div>
        </div>
      ) : (
        /* Manual Analysis Form */
        <form onSubmit={handleSubmit} className="manual-meal-form-layout">
          {/* Step 1: Date & Meal Slot Selection */}
          <div className="manual-section-card customer-surface-card">
            <div className="form-grid-two-cols">
              <div className="customer-date-picker">
                <label className="manual-input-label">
                  <CalendarDays size={16} />
                  <span>{t('manualMealAnalysis.date')}</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="manual-date-input"
                  required
                />
              </div>

              <div className="meal-slot-picker-wrap">
                <label className="manual-input-label">
                  <Utensils size={16} />
                  <span>{t('manualMealAnalysis.selectMealSlot')}</span>
                </label>
                {mealSlotsLoading ? (
                  <div className="slots-loading-placeholder">{t('common.loading')}</div>
                ) : mealSlots.length === 0 ? (
                  <p className="no-slots-hint">{t('manualMealAnalysis.noSlotsAvailable')}</p>
                ) : (
                  <div className="customer-meal-slot-chips">
                    {mealSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        className={selectedMealSlotId === slot.id ? 'selected' : ''}
                        onClick={() => setSelectedMealSlotId(slot.id)}
                      >
                        {slot.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Ingredient Search & Quick Add Card */}
          <div className="manual-section-card customer-surface-card" ref={searchContainerRef}>
            <div className="section-card-header">
              <h3 className="section-title">
                <Search size={18} />
                <span>{t('manualMealAnalysis.addIngredient')}</span>
              </h3>
              <span className="section-subtitle-hint">{t('manualMealAnalysis.searchHint')}</span>
            </div>

            {/* Interactive Search Bar */}
            <div className="ingredient-search-wrapper">
              <div className="search-input-box">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder={t('manualMealAnalysis.searchIngredientPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchFocused(true);
                  }}
                  onFocus={() => setSearchFocused(true)}
                  className="ingredient-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {searchFocused && (
                <div className="ingredient-autocomplete-dropdown">
                  {ingredientsLoading ? (
                    <div className="dropdown-loading">{t('manualMealAnalysis.searching')}</div>
                  ) : filteredIngredients.length === 0 ? (
                    <div className="dropdown-empty">
                      {t('manualMealAnalysis.noIngredientsFound', { query: searchQuery })}
                    </div>
                  ) : (
                    filteredIngredients.map((ing) => (
                      <div
                        key={ing.id}
                        className="ingredient-autocomplete-item"
                        onMouseDown={() => handleSelectIngredient(ing)}
                      >
                        <div className="ing-info">
                          <span className="ing-name">{ing.name}</span>
                          <span className="ing-details">
                            {Math.round(ing.kcal || 0)} kcal • {ing.protein || 0}g P • {ing.carbs || 0}g C • {ing.fat || 0}g F / 100g
                          </span>
                        </div>
                        <ChevronRight size={16} className="item-arrow" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Quick Add Configuration Drawer */}
            {activeIngredient && (
              <div className="quick-add-panel">
                <div className="quick-add-header">
                  <div>
                    <h4 className="active-ing-name">{activeIngredient.name}</h4>
                    <span className="active-ing-base-macros">
                      {Math.round(activeIngredient.kcal || 0)} kcal {t('manualMealAnalysis.nutritionPer100g')} ({activeIngredient.protein || 0}g P, {activeIngredient.carbs || 0}g C, {activeIngredient.fat || 0}g F)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="close-quick-add-btn"
                    onClick={() => setActiveIngredient(null)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="quick-add-form-row">
                  {/* Quantity Input */}
                  <div className="input-group">
                    <label>{t('manualMealAnalysis.quantity')}</label>
                    <div className="quantity-stepper">
                      <button
                        type="button"
                        onClick={() => setItemQuantity((q) => Math.max(1, (Number(q) || 0) - (itemUnit === 'Grams' ? 10 : 1)))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value)}
                        className="stepper-input"
                      />
                      <button
                        type="button"
                        onClick={() => setItemQuantity((q) => (Number(q) || 0) + (itemUnit === 'Grams' ? 10 : 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Unit Selector */}
                  <div className="input-group">
                    <label>{t('manualMealAnalysis.unit')}</label>
                    <select
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value)}
                      className="unit-select"
                    >
                      {ENUM_VALUES.measurementUnit.map((u) => (
                        <option key={u} value={u}>
                          {enumLabel(t, 'measurementUnit', u)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Portions Chips */}
                <div className="quick-portions-row">
                  {itemUnit === 'Grams' ? (
                    <>
                      <button type="button" onClick={() => setItemQuantity(50)}>50g</button>
                      <button type="button" onClick={() => setItemQuantity(100)}>100g</button>
                      <button type="button" onClick={() => setItemQuantity(150)}>150g</button>
                      <button type="button" onClick={() => setItemQuantity(200)}>200g</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => setItemQuantity(1)}>1 {enumLabel(t, 'measurementUnit', itemUnit)}</button>
                      <button type="button" onClick={() => setItemQuantity(2)}>2 {enumLabel(t, 'measurementUnit', itemUnit)}</button>
                      <button type="button" onClick={() => setItemQuantity(3)}>3 {enumLabel(t, 'measurementUnit', itemUnit)}</button>
                    </>
                  )}
                </div>

                {/* Live Macro Estimation for Active Item */}
                {activeItemMacros && (
                  <div className="active-item-macro-preview">
                    <div className="preview-pill">
                      <Flame size={14} />
                      <span>{activeItemMacros.calories} kcal</span>
                    </div>
                    <div className="preview-pill">P: {activeItemMacros.protein}g</div>
                    <div className="preview-pill">C: {activeItemMacros.carbs}g</div>
                    <div className="preview-pill">F: {activeItemMacros.fat}g</div>
                  </div>
                )}

                <button
                  type="button"
                  className="customer-btn-primary add-item-btn"
                  onClick={handleAddItem}
                  disabled={!itemQuantity || Number(itemQuantity) <= 0}
                >
                  <Plus size={18} />
                  <span>{t('manualMealAnalysis.quickAdd')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Step 3: Selected Ingredients Basket */}
          <div className="manual-section-card customer-surface-card">
            <div className="section-card-header">
              <h3 className="section-title">
                <Utensils size={18} />
                <span>{t('manualMealAnalysis.ingredientsList')}</span>
                {selectedItems.length > 0 && (
                  <span className="items-count-badge">({selectedItems.length})</span>
                )}
              </h3>
            </div>

            {selectedItems.length === 0 ? (
              <div className="manual-empty-items">
                <Utensils size={36} className="empty-icon" />
                <p>{t('manualMealAnalysis.emptyItemsMessage')}</p>
              </div>
            ) : (
              <div className="selected-items-grid">
                {selectedItems.map((item) => (
                  <div key={item.tempId} className="selected-ingredient-card">
                    <div className="item-main-details">
                      <span className="item-title">{item.name}</span>
                      <span className="item-qty-tag">
                        {item.quantity} {enumLabel(t, 'measurementUnit', item.unit)}
                      </span>
                    </div>

                    {item.macros && (
                      <div className="item-macros-chips">
                        <span className="chip-kcal">{item.macros.calories} kcal</span>
                        <span className="chip-macro">P: {item.macros.protein}g</span>
                        <span className="chip-macro">C: {item.macros.carbs}g</span>
                        <span className="chip-macro">F: {item.macros.fat}g</span>
                      </div>
                    )}

                    <button
                      type="button"
                      className="remove-item-btn"
                      onClick={() => handleRemoveItem(item.tempId)}
                      title={t('manualMealAnalysis.removeItem')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 4: Live Total Nutrition Summary Card & Submit */}
          {selectedItems.length > 0 && (
            <div className="manual-section-card summary-sticky-card customer-surface-card">
              <h3 className="section-title">
                <Sparkles size={18} />
                <span>{t('manualMealAnalysis.summaryTitle')}</span>
              </h3>

              <div className="customer-macro-card-grid">
                <div className="macro-card calories">
                  <div className="macro-label">{t('manualMealAnalysis.calories')}</div>
                  <div className="macro-value">{liveTotals.calories} kcal</div>
                </div>
                <div className="macro-card protein">
                  <div className="macro-label">{t('manualMealAnalysis.protein')}</div>
                  <div className="macro-value">{liveTotals.protein}g</div>
                </div>
                <div className="macro-card carbs">
                  <div className="macro-label">{t('manualMealAnalysis.carbs')}</div>
                  <div className="macro-value">{liveTotals.carbs}g</div>
                </div>
                <div className="macro-card fat">
                  <div className="macro-label">{t('manualMealAnalysis.fat')}</div>
                  <div className="macro-value">{liveTotals.fat}g</div>
                </div>
              </div>

              {submitError && (
                <div className="customer-error-banner" style={{ marginTop: '1rem' }}>
                  <AlertCircle size={18} />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="submit-action-row">
                <button
                  type="submit"
                  className="customer-btn-primary full-width-cta"
                  disabled={submitting || selectedItems.length === 0}
                >
                  {submitting ? (
                    <>
                      <Sparkles className="spin-icon" size={18} />
                      <span>{t('manualMealAnalysis.submitting')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>{t('manualMealAnalysis.submit')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
