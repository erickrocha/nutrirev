import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Utensils, Sparkles, Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { eatService } from '../../services/api';

export const CustomerEatListPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await eatService.getPaginated({ page, size: pageSize });
      setRecipes(data?.content || []);
      setTotalPages(data?.total_pages || 1);
      setTotalElements(data?.total_elements || 0);
    } catch (err) {
      console.error('Error loading recipes:', err);
      setError(t('eat.errorLoadingRecipes'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, t]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  return (
    <div className="customer-eat-page">
      <h1 className="customer-page-title">
        <Utensils size={22} /> {t('eat.recipes')}
      </h1>

      {error && (
        <div className="customer-error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="customer-loading-state">
          <Sparkles size={30} />
        </div>
      ) : recipes.length === 0 ? (
        <div className="customer-empty-state">
          <Utensils size={48} />
          <h3>{t('eat.noRecipeFound')}</h3>
        </div>
      ) : (
        <div className="customer-recipe-grid">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="customer-recipe-card" onClick={() => navigate(`/eat/${recipe.id}`)}>
              <div className="recipe-photo">
                {recipe.photo ? (
                  <img src={recipe.photo} alt={recipe.name} />
                ) : (
                  <Utensils size={40} />
                )}
              </div>
              <div className="recipe-body">
                <h3>{recipe.name}</h3>
                {recipe.time && (
                  <span className="recipe-meta">
                    <Clock size={13} /> {recipe.time} min
                  </span>
                )}
                {recipe.total_macros && (
                  <span className="recipe-kcal">{recipe.total_macros.kcal} kcal</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="catalog-pagination">
        <span>
          {t('eat.totalOf')} <strong>{totalElements}</strong> {t('eat.recipesCount')} — {t('eat.page')} <strong>{page}</strong> {t('eat.of')} <strong>{totalPages}</strong>
        </span>
        <div>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
