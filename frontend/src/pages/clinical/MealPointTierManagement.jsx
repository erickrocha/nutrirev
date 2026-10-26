import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, RefreshCw, Search, Calendar, Star, Clock } from 'lucide-react';
import { mealPointTierService, dailyMealService } from '../../services/api';
import { MealPointTierFormModal } from '../../components/clinical/MealPointTierFormModal';

export const MealPointTierManagement = () => {
  const { t, i18n } = useTranslation();

  const [mealPointTiers, setMealPointTiers] = useState([]);
  const [dailyMeals, setDailyMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const formatDisplayTime = useCallback((timeStr) => {
    if (!timeStr) return '-';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2] || '0', 10);
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);

    const isEnglish = (i18n.language || '').toLowerCase().startsWith('en');
    return new Intl.DateTimeFormat(i18n.language || 'pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: parts[2] !== undefined ? '2-digit' : undefined,
      hour12: isEnglish,
    }).format(date);
  }, [i18n.language]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tiersData, dailyMealsData] = await Promise.all([
        mealPointTierService.getAll(),
        dailyMealService.getAll(),
      ]);
      setMealPointTiers(Array.isArray(tiersData) ? tiersData : []);
      setDailyMeals(Array.isArray(dailyMealsData) ? dailyMealsData : []);
    } catch (err) {
      console.error('Error loading meal point tiers data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (formData, editingId) => {
    const payload = {
      ...formData,
    };
    if (editingId) {
      await mealPointTierService.update(editingId, payload);
    } else {
      await mealPointTierService.create(payload);
    }
    loadData();
  };

  const dailyMealMap = React.useMemo(() => {
    const map = {};
    (dailyMeals || []).forEach((m) => {
      map[m.id] = m.name;
    });
    return map;
  }, [dailyMeals]);

  const displayedItems = mealPointTiers.filter((item) => {
    const mName = (dailyMealMap[item.dailyMealId] || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return mName.includes(term) || (item.deadlineTime || '').includes(term) || String(item.points).includes(term);
  });

  if (isModalOpen) {
    return (
      <MealPointTierFormModal
        isOpen
        presentation="page"
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        itemToEdit={editingItem}
        dailyMealsList={dailyMeals}
      />
    );
  }

  return (
    <div className="user-management-container">
      {/* Top Header */}
      <div className="management-header">
        <div>
          <h2 className="section-title">{t('mealPointTiers.title')}</h2>
          <p className="section-subtitle">
            {t('mealPointTiers.subtitle')}
          </p>
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className="btn-action-outline"
            onClick={loadData}
            title={t('common.refreshList')}
          >
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
            <span>{t('common.refresh')}</span>
          </button>

          <button
            type="button"
            className="btn-action-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={18} />
            <span>{t('mealPointTiers.newTier')}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filter-bar" style={{ marginBottom: '20px', width: '100%', boxSizing: 'border-box', display: 'flex', gap: '12px' }}>
        <div className="search-input-wrapper" style={{ flex: 1, position: 'relative', width: '100%', boxSizing: 'border-box' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type="text"
            placeholder={t('mealPointTiers.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 12px 10px 38px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #E2E8F0)',
              backgroundColor: 'var(--bg-secondary, #FFF)',
              fontSize: '0.9rem',
            }}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="table-card">
        {loading && mealPointTiers.length === 0 ? (
          <div className="table-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>{t('mealPointTiers.loadingRecords')}</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="table-empty-state">
            <Star size={36} />
            <p>{t('mealPointTiers.emptyStateTitle')}</p>
            <button type="button" className="btn-action-primary" onClick={handleOpenAddModal}>
              <Plus size={16} />
              <span>{t('mealPointTiers.emptyStateBtn')}</span>
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>{t('common.id')}</th>
                  <th>{t('mealPointTiers.dailyMeal')}</th>
                  <th>{t('mealPointTiers.deadlineTime')}</th>
                  <th>{t('mealPointTiers.points')}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600', color: 'var(--text-muted, #64748B)', width: '70px' }}>
                      #{item.id}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontWeight: '500' }}>
                          {dailyMealMap[item.dailyMealId] || `${t('mealPointTiers.dailyMeal')} #${item.dailyMealId}`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                         <Clock size={14} style={{ color: '#3b82f6' }} />
                         <span>{formatDisplayTime(item.deadlineTime)}</span>
                       </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                        <Star size={14} style={{ color: '#f59e0b' }} />
                        <span>{item.points}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-table-edit"
                        onClick={() => handleOpenEditModal(item)}
                        title={t('mealPointTiers.editRecord')}
                      >
                        <Edit2 size={16} />
                        <span>{t('common.edit')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
