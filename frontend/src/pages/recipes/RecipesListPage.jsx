import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Utensils, Plus, Search, Sparkles, Clock, Eye, Bookmark, Edit, Trash2, ChevronLeft, ChevronRight, AlertCircle, Check, Video
} from 'lucide-react';
import { RecipeFormModal } from './RecipeFormModal';
import {
  fetchRecipesPaginated,
  deleteRecipe,
  createRecipe,
  updateRecipe,
} from '../../store/recipeSlice';
import { ENUM_VALUES, enumLabel } from '../../utils/enums';

export const RecipesListPage = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { recipes, loading, totalPages, totalElements } = useSelector(
    (state) => state.recipe
  );

  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedHighlight, setSelectedHighlight] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  const loadRecipes = useCallback(() => {
    const params = {
      page,
      size: pageSize,
    };
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (selectedPeriod) params.recommended_period = selectedPeriod;
    if (selectedHighlight !== '') params.is_highlight = selectedHighlight === 'true';

    dispatch(fetchRecipesPaginated(params));
  }, [dispatch, page, pageSize, searchQuery, selectedPeriod, selectedHighlight]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadRecipes();
  };

  const handleOpenAddModal = () => {
    setEditingRecipe(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (recipe) => {
    setEditingRecipe(recipe);
    setIsModalOpen(true);
  };

  const handleSaveRecipe = async (payload, id) => {
    let actionResult;
    if (id) {
      actionResult = await dispatch(updateRecipe({ id, recipeData: payload }));
      if (updateRecipe.fulfilled.match(actionResult)) {
        setSuccessMessage('Receita atualizada com sucesso!');
      }
    } else {
      actionResult = await dispatch(createRecipe(payload));
      if (createRecipe.fulfilled.match(actionResult)) {
        setSuccessMessage('Receita criada com sucesso!');
      }
    }
    setTimeout(() => setSuccessMessage(''), 3000);
    return actionResult?.payload;
  };

  const handleDeleteRecipe = async (id, name) => {
    if (window.confirm(`Tem certeza que deseja excluir a receita "${name}"?`)) {
      const result = await dispatch(deleteRecipe(id));
      if (deleteRecipe.fulfilled.match(result)) {
        setSuccessMessage('Receita excluída com sucesso.');
        setTimeout(() => setSuccessMessage(''), 3000);
        loadRecipes();
      } else {
        setError(result.payload || 'Não foi possível excluir a receita.');
      }
    }
  };

  if (isModalOpen) {
    return (
      <RecipeFormModal
        isOpen
        presentation="page"
        onClose={(shouldReload) => {
          setIsModalOpen(false);
          if (shouldReload) loadRecipes();
        }}
        onSave={handleSaveRecipe}
        recipeToEdit={editingRecipe}
      />
    );
  }

  return (
    <div className="recipes-list-page" style={{ padding: '0 0 1.5rem 0', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="form-page-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Utensils size={24} /> Receitas (Eat)
            <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-body)', marginLeft: '0.5rem' }}>
              — Gestão do catálogo de pratos, rendimento e tabelas nutricionais
            </span>
          </h1>
        </div>

        <button
          onClick={handleOpenAddModal}
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
          <span>Nova Receita</span>
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
              placeholder="Buscar receita por nome ou descrição..."
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

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedPeriod}
            onChange={(e) => { setSelectedPeriod(e.target.value); setPage(1); }}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.55rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.85rem' }}
          >
            <option value="">Período: Todos</option>
            {ENUM_VALUES.recommendedPeriod.map((period) => (
              <option key={period} value={period}>{enumLabel(t, 'recommendedPeriod', period)}</option>
            ))}
          </select>

          <select
            value={selectedHighlight}
            onChange={(e) => { setSelectedHighlight(e.target.value); setPage(1); }}
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.55rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.85rem' }}
          >
            <option value="">Destaque: Todos</option>
            <option value="true">Apenas Novidade/Destaque</option>
            <option value="false">Normais</option>
          </select>
        </div>
      </div>

      {/* Recipes Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-body)' }}>
          <p>Carregando receitas...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="catalog-list-empty" style={{ background: 'var(--bg-alt)', borderRadius: '10px', padding: '3rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
          <Utensils size={48} style={{ color: 'var(--text-body)', marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-heading)', margin: '0 0 0.5rem 0' }}>Nenhuma receita encontrada</h3>
          <p style={{ color: 'var(--text-body)', fontSize: '0.9rem' }}>Tente ajustar os filtros de busca ou crie uma nova receita.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {recipes.map((recipe) => (
            <div
              className="catalog-list-card"
              key={recipe.id}
              style={{
                background: 'var(--bg-alt)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                position: 'relative',
              }}
            >
              {/* Card Banner / Photo */}
              <div style={{ height: '140px', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {recipe.photo ? (
                  <img src={recipe.photo} alt={recipe.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Utensils size={48} style={{ color: 'var(--text-heading)' }} />
                )}

                {/* Badges */}
                <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {recipe.isHighlight && (
                    <span style={{ background: 'rgba(29, 111, 209, 0.9)', color: 'var(--text-heading)', fontSize: '0.72rem', fontWeight: '700', padding: '0.25rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Sparkles size={12} /> Novidade
                    </span>
                  )}
                  {recipe.recommendedPeriod && (
                    <span style={{ background: 'rgba(15, 23, 42, 0.85)', color: 'var(--text-body)', fontSize: '0.72rem', fontWeight: '600', padding: '0.25rem 0.6rem', borderRadius: '12px', border: '1px solid var(--border-color)', textTransform: 'capitalize' }}>
                      {enumLabel(t, 'recommendedPeriod', recipe.recommendedPeriod)}
                    </span>
                  )}
                  {recipe.videoUrl && (
                    <a
                      href={recipe.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: 'rgba(239, 68, 68, 0.85)', color: '#ffffff', fontSize: '0.72rem', fontWeight: '600', padding: '0.25rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                      title="Assistir Vídeo no YouTube"
                    >
                      <Video size={12} /> Vídeo
                    </a>
                  )}
                </div>

                {/* Counters */}
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--text-heading)', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Eye size={12} /> {recipe.views || 0}
                  </span>
                  <span style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--accent-primary)', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Bookmark size={12} /> {recipe.additions || 0}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="catalog-list-card-body" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', flex: 1, gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-heading)', margin: 0, lineHeight: 1.3 }}>
                    {recipe.name}
                  </h3>
                  {recipe.price !== null && recipe.price !== undefined && (
                    <span style={{ color: '#86efac', fontWeight: '700', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                      R$ {Number(recipe.price).toFixed(2)}
                    </span>
                  )}
                </div>

                {recipe.description && (
                  <p style={{ color: 'var(--text-body)', fontSize: '0.82rem', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {recipe.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-body)' }}>
                  {recipe.time && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={14} style={{ color: 'var(--accent-primary)' }} /> {recipe.time} min
                    </span>
                  )}
                  {recipe.portion && (
                    <span>
                      Serves: <strong>{recipe.portion} porção(ões)</strong>
                    </span>
                  )}
                </div>

                {/* Macros Pills */}
                {recipe.total_macros && (
                  <div className="catalog-card-macros" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-heading)', fontWeight: '600' }}>
                      🔥 {recipe.total_macros.kcal} kcal
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#93c5fd' }}>
                      P: {recipe.total_macros.protein_g}g
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#fde047' }}>
                      C: {recipe.total_macros.carbs_g}g
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
                      G: {recipe.total_macros.fat_g}g
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="catalog-card-actions" style={{ padding: '0.75rem 1.2rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(recipe)}
                  style={{ background: 'rgba(29, 111, 209, 0.15)', color: 'var(--accent-primary)', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Edit size={14} /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
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
          Total de <strong>{totalElements}</strong> receita(s) — Página <strong>{page}</strong> de <strong>{totalPages}</strong>
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
