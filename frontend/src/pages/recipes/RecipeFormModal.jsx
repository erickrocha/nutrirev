import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Save, Utensils, Image, Video, Upload, AlertCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import { fetchIngredients, fetchCycles } from '../../store/ingredientSlice';
import { uploadRecipePhoto } from '../../store/recipeSlice';
import { ENUM_VALUES, enumLabel } from '../../utils/enums';
import { FilterableMultiSelect } from '../../components/common/FilterableMultiSelect';
import { StyledInput } from '../../components/common/StyledInput';

export const RecipeFormModal = ({ isOpen, onClose, onSave, recipeToEdit = null, presentation = 'modal' }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { ingredientsList: availableIngredients } = useSelector(
    (state) => state.ingredient
  );

  const [formData, setFormData] = useState({
    name: '',
    photo: '',
    videoUrl: '',
    price: '',
    time: '',
    portion: '',
    description: '',
    recommendedPeriod: 'Weekly',
    recommendedDays: '',
    recommendedMessage: '',
    isHighlight: false,
    cycleId: '',
  });

  const [photoPreview, setPhotoPreview] = useState('');
  const [photoPayload, setPhotoPayload] = useState(null);

  const [ingredientsList, setIngredientsList] = useState([]);
  const [directionsList, setDirectionsList] = useState([]);
  const [restrictionsInput, setRestrictionsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchIngredients());
      dispatch(fetchCycles());
      if (recipeToEdit) {
        setFormData({
          name: recipeToEdit.name || '',
          photo: recipeToEdit.photo || '',
          videoUrl: recipeToEdit.videoUrl || '',
          price: recipeToEdit.price !== undefined && recipeToEdit.price !== null ? recipeToEdit.price : '',
          time: recipeToEdit.time !== undefined && recipeToEdit.time !== null ? recipeToEdit.time : '',
          portion: recipeToEdit.portion !== undefined && recipeToEdit.portion !== null ? recipeToEdit.portion : '',
          description: recipeToEdit.description || '',
          recommendedPeriod: recipeToEdit.recommendedPeriod || 'Weekly',
          recommendedDays: recipeToEdit.recommendedDays || '',
          recommendedMessage: recipeToEdit.recommendedMessage || '',
          isHighlight: !!recipeToEdit.isHighlight,
          cycleId: recipeToEdit.cycleId || '',
        });
        setPhotoPreview(recipeToEdit.photo || '');
        setPhotoPayload(null);
        setIngredientsList(
          (recipeToEdit.ingredients || []).map((ing) => ({
            ingredientId: ing.ingredientId || ing.ingredient?.id || '',
            quantity: ing.quantity || 100,
            unit: ing.unit || 'Grams',
          }))
        );
        setDirectionsList(
          (recipeToEdit.directions || []).map((d) => ({
            stepNumber: d.stepNumber,
            description: d.description,
          }))
        );
        setRestrictionsInput((recipeToEdit.restrictions || []).map((r) => r.name).join(', '));
        setTagsInput((recipeToEdit.tags || []).map((t) => t.name).join(', '));
      } else {
        resetForm();
      }
    }
  }, [isOpen, recipeToEdit, dispatch]);

  const resetForm = () => {
    setFormData({
      name: '',
      photo: '',
      videoUrl: '',
      price: '',
      time: '',
      portion: '',
      description: '',
      recommendedPeriod: 'Weekly',
      recommendedDays: '',
      recommendedMessage: '',
      isHighlight: false,
      cycleId: '',
    });
    setPhotoPreview('');
    setPhotoPayload(null);
    setIngredientsList([]);
    setDirectionsList([]);
    setRestrictionsInput('');
    setTagsInput('');
    setError('');
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida (JPG, PNG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A foto de capa deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setPhotoPreview(dataUrl);
      const base64Content = dataUrl.split(',')[1];
      const extension = file.name.split('.').pop() || 'jpg';
      setPhotoPayload({
        imageBase64: base64Content,
        extension,
        contentType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddIngredient = () => {
    setIngredientsList((prev) => [
      ...prev,
      { ingredientId: '', quantity: 100, unit: 'Grams' },
    ]);
  };

  const handleRemoveIngredient = (index) => {
    setIngredientsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index, field, value) => {
    setIngredientsList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddDirection = () => {
    setDirectionsList((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, description: '' },
    ]);
  };

  const handleRemoveDirection = (index) => {
    setDirectionsList((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, stepNumber: i + 1 }))
    );
  };

  const handleDirectionChange = (index, text) => {
    setDirectionsList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], description: text };
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('O nome da receita é obrigatório.');
      return;
    }

    const payload = {
      ...formData,
      views: recipeToEdit?.views || 0,
      additions: recipeToEdit?.additions || 0,
      price: formData.price !== '' ? parseFloat(formData.price) : null,
      time: formData.time !== '' ? parseInt(formData.time, 10) : null,
      portion: formData.portion !== '' ? parseInt(formData.portion, 10) : null,
      cycleId: formData.cycleId !== '' ? parseInt(formData.cycleId, 10) : null,
      ingredients: ingredientsList.map((ing) => {
        const parsedId = parseInt(ing.ingredientId, 10);
        const validId = !isNaN(parsedId) && parsedId > 0 ? parsedId : (availableIngredients[0]?.id || 0);
        return {
          ingredientId: validId,
          quantity: parseFloat(ing.quantity) || 0,
          unit: ing.unit || 'Grams',
          substitutes: [],
        };
      }),
      directions: directionsList.map((d, i) => ({
        stepNumber: i + 1,
        description: d.description,
      })),
      restrictions: restrictionsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ id: 0, name })),
      tags: tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ id: 0, name })),
      meals: [],
      biotypes: [],
      sideDishes: [],
    };

    try {
      setSaving(true);
      const savedRecipe = await onSave(payload, recipeToEdit?.id);
      
      const targetId = savedRecipe?.id || recipeToEdit?.id;
      if (targetId && photoPayload) {
        await dispatch(uploadRecipePhoto({ id: targetId, photoPayload }));
      }

      onClose(true);
    } catch (err) {
      console.error('Error saving recipe:', err);
      setError('Erro ao salvar receita. Verifique os dados fornecidos.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isPage = presentation === 'page';
  const surfaceColor = isPage ? '#FFFFFF' : 'var(--bg-alt)';
  const fieldColor = isPage ? '#FFFFFF' : 'var(--bg-primary)';
  const sectionColor = isPage ? 'var(--bg-primary)' : 'var(--bg-primary)';
  const textColor = 'var(--text-heading)';
  const borderColor = isPage ? '1px solid var(--border-color)' : '1px solid var(--border-color)';

  return (
    <div
      className={isPage ? 'recipe-form-page' : undefined}
      style={isPage ? {
        width: '100%',
        maxWidth: '1000px',
        margin: '0 auto',
        paddingBottom: '60px',
        boxSizing: 'border-box',
      } : {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      {isPage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-body)', marginBottom: '16px' }}>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={16} />
            <span>Receitas (Eat)</span>
          </button>
          <ChevronRight size={14} style={{ color: 'var(--text-body)' }} />
          <span style={{ color: 'var(--text-heading)', fontWeight: '500' }}>{recipeToEdit ? 'Editar Receita' : 'Nova Receita'}</span>
        </div>
      )}
      <div
        className={isPage ? 'recipe-page-card' : undefined}
        style={{
          background: surfaceColor,
          border: isPage ? '1px solid var(--border-color)' : borderColor,
          borderRadius: '12px',
          width: '100%',
          maxWidth: isPage ? '100%' : '850px',
          maxHeight: isPage ? 'none' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isPage ? '0 2px 8px rgba(0,0,0,0.03)' : '0 20px 50px rgba(0,0,0,0.5)',
          overflow: isPage ? 'visible' : 'hidden',
        }}
      >
        {/* Header */}
        <div
          className={isPage ? 'recipe-page-header' : undefined}
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: isPage ? '1px solid #F1F5F9' : '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: fieldColor,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Utensils size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: textColor, margin: 0 }}>
              {recipeToEdit ? 'Editar Receita' : 'Nova Receita (Eat)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: isPage ? 'var(--text-body)' : '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: isPage ? 'visible' : 'hidden' }}>
          <div className={isPage ? 'recipe-page-body' : undefined} style={{ padding: '1.5rem', overflowY: isPage ? 'visible' : 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.8rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Row 1: Name & Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                  Nome da Receita *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Omelete Fit de Ervas Finas"
                  required
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Row 2: Photo (S3 Upload) & Video URL (YouTube) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                  Foto da Receita (Upload S3)
                </label>
                <div className={isPage ? 'recipe-upload-control' : undefined} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'var(--bg-alt)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Image size={20} style={{ color: 'var(--text-body)' }} />
                    )}
                  </div>
                  <label
                    style={{
                      background: 'rgba(29, 111, 209, 0.15)',
                      color: 'var(--accent-primary)',
                      border: '1px solid rgba(29, 111, 209, 0.3)',
                      borderRadius: '6px',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Upload size={14} />
                    <span>{photoPreview ? 'Alterar Imagem' : 'Upload Imagem'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                  URL do Vídeo (YouTube)
                </label>
                <div style={{ position: 'relative' }}>
                  <Video size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
                  <input
                    type="text"
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem 0.6rem 2.2rem', color: 'var(--text-heading)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Prep Time, Portion, Period, Highlight */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                  Tempo Prep. (min)
                </label>
                <input
                  type="number"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  placeholder="15"
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                  Rendimento (porções)
                </label>
                <input
                  type="number"
                  value={formData.portion}
                  onChange={(e) => setFormData({ ...formData, portion: e.target.value })}
                  placeholder="2"
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                  Período Recomendado
                </label>
                <select
                  value={formData.recommendedPeriod}
                  onChange={(e) => setFormData({ ...formData, recommendedPeriod: e.target.value })}
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                >
                  {ENUM_VALUES.recommendedPeriod.map((period) => (
                    <option key={period} value={period}>{enumLabel(t, 'recommendedPeriod', period)}</option>
                  ))}
                </select>
              </div>

              <div style={{ paddingTop: '1.2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isHighlight}
                    onChange={(e) => setFormData({ ...formData, isHighlight: e.target.checked })}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                  />
                  <span>Destaque / Novidade</span>
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                Descrição Detalhada
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Descreva a receita..."
                style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            {/* Ingredients Section */}
            <div className={isPage ? 'recipe-page-section' : undefined} style={{ background: sectionColor, padding: '1rem', borderRadius: '8px', border: isPage ? '1px solid var(--border-color)' : '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h4 style={{ color: 'var(--text-heading)', margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>Ingredientes da Receita</h4>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  style={{ background: 'rgba(29, 111, 209, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(29, 111, 209, 0.3)', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Plus size={14} /> Adicionar Ingrediente
                </button>
              </div>

              {ingredientsList.length === 0 ? (
                <p style={{ color: 'var(--text-body)', fontSize: '0.82rem', margin: 0 }}>Nenhum ingrediente adicionado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {ingredientsList.map((ing, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1.6fr 1fr 36px', gap: '0.6rem', alignItems: 'center' }}>
                      <FilterableMultiSelect
                        label=""
                        options={availableIngredients.map((item) => ({
                          id: item.id,
                          name: item.name ? `${item.name}${item.kcal ? ` (${item.kcal} kcal)` : ''}` : `Item #${item.id}`,
                        }))}
                        selectedIds={ing.ingredientId ? [ing.ingredientId] : []}
                        onChange={(vals) => handleIngredientChange(idx, 'ingredientId', vals[0] || '')}
                        placeholder={t('recipes.selectIngredient', 'Selecionar ingrediente...')}
                        emptyMessage={t('recipes.noIngredientFound', 'Nenhum ingrediente encontrado')}
                        isSingleSelect={true}
                        isClearable={true}
                      />

                      <FilterableMultiSelect
                        label=""
                        options={ENUM_VALUES.measurementUnit.map((unit) => ({
                          id: unit,
                          name: enumLabel(t, 'measurementUnit', unit),
                        }))}
                        selectedIds={ing.unit ? [ing.unit] : []}
                        onChange={(vals) => handleIngredientChange(idx, 'unit', vals[0] || 'Grams')}
                        placeholder={t('recipes.selectUnit', 'Unidade...')}
                        emptyMessage={t('recipes.noUnitFound', 'Nenhuma unidade encontrada')}
                        isSingleSelect={true}
                        isClearable={false}
                      />

                      <StyledInput
                        type="number"
                        step="0.1"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                        placeholder="Qtd"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px',
                          borderRadius: '6px',
                        }}
                        title="Remover ingrediente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Directions Section */}
            <div className={isPage ? 'recipe-page-section' : undefined} style={{ background: sectionColor, padding: '1rem', borderRadius: '8px', border: isPage ? '1px solid var(--border-color)' : '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <h4 style={{ color: 'var(--text-heading)', margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>Etapas de Preparo</h4>
                <button
                  type="button"
                  onClick={handleAddDirection}
                  style={{ background: 'rgba(29, 111, 209, 0.15)', color: 'var(--accent-primary)', border: '1px solid rgba(29, 111, 209, 0.3)', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Plus size={14} /> Adicionar Etapa
                </button>
              </div>

              {directionsList.length === 0 ? (
                <p style={{ color: 'var(--text-body)', fontSize: '0.82rem', margin: 0 }}>Nenhuma etapa adicionada.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {directionsList.map((dir, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px', gap: '0.6rem', alignItems: 'center' }}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: '700', fontSize: '0.85rem', textAlign: 'center' }}>
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={dir.description}
                        onChange={(e) => handleDirectionChange(idx, e.target.value)}
                        placeholder="Ex: Misture os ovos e adicione as ervas finas..."
                        style={{ background: 'var(--bg-alt)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text-heading)', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDirection(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Restrictions & Tags */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                  Restrições (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={restrictionsInput}
                  onChange={(e) => setRestrictionsInput(e.target.value)}
                  placeholder="Sem Glúten, Sem Lactose"
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-body)', fontSize: '0.82rem', marginBottom: '0.3rem', fontWeight: '500' }}>
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Proteico, Rápido, Low Carb"
                  style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'var(--text-heading)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            className={isPage ? 'recipe-page-footer' : undefined}
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: isPage ? 'space-between' : 'flex-end',
              gap: '0.75rem',
              background: 'var(--bg-primary)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-body)',
                padding: '0.6rem 1.25rem',
                borderRadius: '6px',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: 'var(--accent-primary)',
                color: 'var(--text-heading)',
                border: 'none',
                padding: '0.6rem 1.5rem',
                borderRadius: '6px',
                fontSize: '0.88rem',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Salvando...' : 'Salvar Receita'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
