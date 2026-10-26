import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Utensils, Star, Clock, Sparkles, AlertCircle, Video } from 'lucide-react';
import { fetchIngredients } from '../../store/ingredientSlice';
import { eatService } from '../../services/api';
import { enumLabel } from '../../utils/enums';

export const CustomerEatDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { ingredientsList } = useSelector((state) => state.ingredient);

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dispatch(fetchIngredients());
  }, [dispatch]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await eatService.getById(id);
        setRecipe(data);
      } catch (err) {
        console.error('Error loading recipe:', err);
        setError(t('eat.errorLoadingRecipe'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, t]);

  const ingredientName = (ingId) => ingredientsList.find((i) => i.id === ingId)?.name || `Ingrediente #${ingId}`;

  if (loading) {
    return (
      <div className="customer-loading-state">
        <Sparkles size={30} />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="customer-eat-detail-page">
        <div className="customer-error-banner">
          <AlertCircle size={18} />
          <span>{error || t('eat.recipeNotFound')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-eat-detail-page">
      <button type="button" className="customer-back-link" onClick={() => navigate('/eat')}>
        <ArrowLeft size={16} /> {t('eat.backToRecipes')}
      </button>

      {recipe.photo ? (
        <img className="customer-hero-image" src={recipe.photo} alt={recipe.name} />
      ) : (
        <div className="customer-hero-image-placeholder">
          <Utensils size={48} />
        </div>
      )}

      <div className="customer-detail-header">
        <h1>{recipe.name}</h1>
        {recipe.isHighlight && <Star size={20} fill="var(--accent-primary)" color="var(--accent-primary)" />}
      </div>

      <div className="customer-detail-meta-row">
        {recipe.time && (
          <span className="meta-item">
            <Clock size={14} /> {recipe.time} min
          </span>
        )}
        {recipe.portion && <span>{t('eat.servings', { count: recipe.portion })}</span>}
        {recipe.price != null && <span className="meta-price">R$ {Number(recipe.price).toFixed(2)}</span>}
        {recipe.videoUrl && (
          <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer">
            <Video size={14} /> {t('eat.watchVideo')}
          </a>
        )}
      </div>

      {recipe.description && <p className="customer-detail-description">{recipe.description}</p>}

      {recipe.total_macros && (
        <div className="customer-macro-chip-row">
          <span className="customer-macro-chip">{recipe.total_macros.kcal} kcal</span>
          <span className="customer-macro-chip protein">P: {recipe.total_macros.protein_g}g</span>
          <span className="customer-macro-chip carbs">C: {recipe.total_macros.carbs_g}g</span>
          <span className="customer-macro-chip fat">G: {recipe.total_macros.fat_g}g</span>
        </div>
      )}

      {recipe.ingredients?.length > 0 && (
        <div className="customer-detail-section">
          <h3 className="customer-section-title">{t('eat.ingredients')}</h3>
          <ul>
            {recipe.ingredients.map((ing, idx) => (
              <li key={idx}>
                {ingredientName(ing.ingredientId)} — {ing.quantity} {enumLabel(t, 'measurementUnit', ing.unit)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.directions?.length > 0 && (
        <div className="customer-detail-section">
          <h3 className="customer-section-title">{t('eat.directions')}</h3>
          <ol>
            {recipe.directions.map((d, idx) => (
              <li key={idx}>{d.description}</li>
            ))}
          </ol>
        </div>
      )}

      {(recipe.restrictions?.length > 0 || recipe.tags?.length > 0) && (
        <div className="customer-tag-row">
          {(recipe.restrictions || []).map((r, idx) => (
            <span key={`r-${idx}`} className="tag-restriction">{r.name}</span>
          ))}
          {(recipe.tags || []).map((tItem, idx) => (
            <span key={`t-${idx}`} className="tag-badge">{tItem.name}</span>
          ))}
        </div>
      )}
    </div>
  );
};
