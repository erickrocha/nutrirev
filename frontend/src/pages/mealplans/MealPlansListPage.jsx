import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FileText, Plus, Search, Star, Edit, Trash2, ChevronLeft, ChevronRight, AlertCircle, Check
} from 'lucide-react';
import { MealPlanFormPage } from './MealPlanFormPage';
import {
  fetchMealPlansPaginated,
  deleteMealPlan,
  createMealPlan,
  updateMealPlan,
} from '../../store/mealPlanSlice';
import { mealPlanService } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { MEAL_PLAN_CATEGORIES, mealPlanCategoryLabel } from './mealPlanCategories';
import { enumLabel } from '../../utils/enums';

export const MealPlansListPage = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { mealPlans: plans, loading, totalPages, totalElements } = useSelector(
    (state) => state.mealPlan
  );

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // View Mode ('list' | 'form')
  const [viewMode, setViewMode] = useState('list');
  const [editingPlan, setEditingPlan] = useState(null);

  const loadPlans = useCallback(() => {
    const params = {
      page,
      size: pageSize,
    };
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedCategory) params.category = selectedCategory;

    dispatch(fetchMealPlansPaginated(params));
  }, [dispatch, page, pageSize, searchQuery, selectedCategory]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadPlans();
  };

  const handleOpenAddForm = () => {
    setEditingPlan(null);
    setViewMode('form');
  };

  const handleOpenEditForm = (plan) => {
    setEditingPlan(plan);
    setViewMode('form');
  };

  const handleToggleFavorite = async (id) => {
    try {
      await mealPlanService.toggleFavorite(id);
      loadPlans();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleSavePlan = async (payload, id) => {
    let actionResult;
    if (id) {
      actionResult = await dispatch(updateMealPlan({ id, planData: payload }));
      if (updateMealPlan.rejected.match(actionResult)) {
        throw new Error(actionResult.payload || 'Erro ao atualizar plano alimentar.');
      }
      setSuccessMessage('Plano alimentar atualizado com sucesso!');
    } else {
      actionResult = await dispatch(createMealPlan(payload));
      if (createMealPlan.rejected.match(actionResult)) {
        throw new Error(actionResult.payload || 'Erro ao criar plano alimentar.');
      }
      setSuccessMessage('Plano alimentar criado com sucesso!');
    }
    setTimeout(() => setSuccessMessage(''), 3000);
    loadPlans();
    return actionResult?.payload;
  };

  const handleDeletePlan = async (id, name) => {
    if (window.confirm(`Tem certeza que deseja excluir o plano "${name}"?`)) {
      const result = await dispatch(deleteMealPlan(id));
      if (deleteMealPlan.fulfilled.match(result)) {
        setSuccessMessage('Plano alimentar excluído com sucesso.');
        setTimeout(() => setSuccessMessage(''), 3000);
        loadPlans();
      } else {
        setError(result.payload || 'Não foi possível excluir o plano alimentar.');
      }
    }
  };

  // Render Full-Page Meal Plan Form
  if (viewMode === 'form') {
    return (
      <MealPlanFormPage
        editingPlan={editingPlan}
        onBack={() => setViewMode('list')}
        onSaveSuccess={async (payload, id) => {
          await handleSavePlan(payload, id);
          setViewMode('list');
        }}
      />
    );
  }

  // Render Meal Plan List Page
  return (
    <div className="meal-plans-list-page" style={{ padding: '0 0 1.5rem 0', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="form-page-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={24} /> Planos Alimentares
            <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-body)', marginLeft: '0.5rem' }}>
              — Prescrição nutricional, gestão de dietas e metas calóricas
            </span>
          </h1>
        </div>

        <button
          onClick={handleOpenAddForm}
          style={{
            background: 'var(--accent-primary)',
            color: 'var(--text-heading)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.65rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(29, 111, 209, 0.3)',
            transition: 'all 0.2s',
          }}
        >
          <Plus size={18} />
          <span>Novo Plano</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.8rem 1.2rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#86efac', padding: '0.8rem 1.2rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div
        className="catalog-list-toolbar"
        style={{
          background: 'var(--bg-alt)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar plano alimentar por nome ou categoria..."
              style={{
                width: '100%',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.55rem 0.85rem 0.55rem 2.2rem',
                color: 'var(--text-heading)',
                fontSize: '0.88rem',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              background: 'rgba(29, 111, 209, 0.15)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(29, 111, 209, 0.3)',
              borderRadius: '6px',
              padding: '0.55rem 1rem',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Filtrar
          </button>
        </form>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.55rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.85rem' }}
          >
            <option value="">{t('mealPlan.allCategories')}</option>
            {MEAL_PLAN_CATEGORIES.map((category) => (
              <option key={category} value={category}>{mealPlanCategoryLabel(t, category)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Plans List Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-body)' }}>
          <p>Carregando planos alimentares...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="catalog-list-empty" style={{ background: 'var(--bg-alt)', borderRadius: '10px', padding: '3rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
          <FileText size={48} style={{ color: 'var(--text-body)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-heading)', margin: '0 0 0.5rem 0' }}>Nenhum plano alimentar encontrado</h3>
          <p style={{ color: 'var(--text-body)', fontSize: '0.9rem' }}>Tente ajustar a busca ou crie um novo plano.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {plans.map((plan) => (
            <div
              className="catalog-list-card"
              key={plan.id}
              style={{
                background: 'var(--bg-alt)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '1.2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                position: 'relative',
              }}
            >
              <div>
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span style={{ background: 'rgba(29, 111, 209, 0.15)', color: 'var(--accent-primary)', fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                    {mealPlanCategoryLabel(t, plan.category)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(plan.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: plan.isFavorite ? '#fde047' : '#64748b', padding: 0 }}
                  >
                    <Star size={18} fill={plan.isFavorite ? '#fde047' : 'none'} />
                  </button>
                </div>

                <h3 className="catalog-list-card-title" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-heading)', margin: '0 0 0.4rem 0' }}>
                  {plan.name}
                </h3>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px',
                      textTransform: 'capitalize',
                      background: plan.generationStatus === 'Finished' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                      color: plan.generationStatus === 'Finished' ? '#86efac' : '#94a3b8',
                    }}
                  >
                    {enumLabel(t, 'mealPlanGenerationStatus', plan.generationStatus || 'Draft')}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-body)' }}>
                    {(plan.meals || []).length} refeição(ões)
                  </span>
                </div>

                {/* Total Macros */}
                {plan.totalMacros && (
                  <div className="catalog-card-macros" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', padding: '0.6rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '0.8rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#020910', fontWeight: '600' }}>
                      🔥 {plan.totalMacros.kcal} kcal
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#072e5a' }}>
                      P: {plan.totalMacros.proteinG}g
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#fdae47' }}>
                      C: {plan.totalMacros.carbsG}g ({plan.totalMacros.carbsPct}%)
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
                      G: {plan.totalMacros.lipidsG}g ({plan.totalMacros.lipidsPct}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="catalog-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--border-color)', padding: '0.75rem', marginTop: '0.5rem', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenEditForm(plan)}
                  style={{ background: 'rgba(29, 111, 209, 0.15)', color: 'var(--accent-primary)', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Edit size={14} /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePlan(plan.id, plan.name)}
                  style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div
        className="catalog-pagination"
        style={{
          background: 'var(--bg-alt)',
          borderRadius: '10px',
          padding: '0.75rem 1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <span style={{ color: 'var(--text-body)', fontSize: '0.85rem' }}>
          Total de <strong>{totalElements}</strong> plano(s) — Página <strong>{page}</strong> de <strong>{totalPages}</strong>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem 0.6rem', color: 'var(--text-heading)', fontSize: '0.82rem' }}
          >
            <option value={10}>10 por pg</option>
            <option value={20}>20 por pg</option>
            <option value={50}>50 por pg</option>
          </select>

          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ background: page <= 1 ? 'var(--bg-primary)' : 'rgba(29, 111, 209, 0.15)', color: page <= 1 ? 'var(--text-body)' : 'var(--accent-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          >
            <ChevronLeft size={16} />
          </button>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{ background: page >= totalPages ? 'var(--bg-primary)' : 'rgba(29, 111, 209, 0.15)', color: page >= totalPages ? 'var(--text-body)' : 'var(--accent-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
