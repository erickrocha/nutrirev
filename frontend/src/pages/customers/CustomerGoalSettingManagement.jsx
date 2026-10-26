import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { CustomerGoalSettingFormPage } from './CustomerGoalSettingFormPage';
import { fetchGoalSettings, fetchAllCustomers } from '../../store/customerSlice';
import {
  formulaService,
  activityFactorService,
  objectiveService,
  physicalActivityLevelService,
} from '../../services/api';
import {
  Target,
  Plus,
  Edit2,
  RefreshCw,
  Search,
  User,
  Flame,
} from 'lucide-react';

export const CustomerGoalSettingManagement = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { goalSettings: goals, allCustomers: customers } = useSelector((state) => state.customer);


  const [formulas, setFormulas] = useState([]);
  const [activityFactors, setActivityFactors] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [activityLevels, setActivityLevels] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Navigation mode: 'list' (table view) | 'form' (full-page form view)
  const [viewMode, setViewMode] = useState('list');
  const [editingGoal, setEditingGoal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      dispatch(fetchGoalSettings());
      dispatch(fetchAllCustomers());
      const [formsData, factorsData, objsData, levelsData] =
        await Promise.all([
          formulaService.getAll(),
          activityFactorService.getAll(),
          objectiveService.getAll(),
          physicalActivityLevelService.getAll(),
        ]);

      setFormulas(Array.isArray(formsData) ? formsData : []);
      setActivityFactors(Array.isArray(factorsData) ? factorsData : []);
      setObjectives(Array.isArray(objsData) ? objsData : []);
      setActivityLevels(Array.isArray(levelsData) ? levelsData : []);
    } catch (err) {
      setError(err?.response?.data?.message || t('goals.errorLoadingGoals'));
    } finally {
      setLoading(false);
    }
  }, [dispatch, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddForm = () => {
    setEditingGoal(null);
    setViewMode('form');
  };

  const handleOpenEditForm = (goal) => {
    setEditingGoal(goal);
    setViewMode('form');
  };

  const getCustomerName = (id) => {
    const found = customers.find((c) => c.id === parseInt(id, 10));
    return found ? found.name : t('goals.customer', { id });
  };

  const getFormulaName = (id) => {
    const found = formulas.find((f) => f.id === parseInt(id, 10));
    return found ? found.name : t('common.notAvailable');
  };

  const getObjectiveName = (id) => {
    const found = objectives.find((o) => o.id === parseInt(id, 10));
    return found ? found.name : t('common.notAvailable');
  };

  const displayedGoals = goals.filter((g) => {
      const custName = getCustomerName(g.customerId || g.customer_id);
      return (
        (g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        custName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  });

  // Render Full-Page Add/Edit Form Page
  if (viewMode === 'form') {
    return (
      <CustomerGoalSettingFormPage
        editingGoal={editingGoal}
        customers={customers}
        formulas={formulas}
        activityFactors={activityFactors}
        objectives={objectives}
        activityLevels={activityLevels}
        onBack={() => setViewMode('list')}
        onSaveSuccess={() => {
          setViewMode('list');
          loadData();
        }}
      />
    );
  }

  // Render Goal Table List Page
  return (
    <div className="user-management-container">
      {error && <div className="page-error-alert">{error}</div>}
      {/* Header */}
      <div className="management-header">
        <div>
          <h2 className="section-title">{t('goals.title')}</h2>
          <p className="section-subtitle">
            {t('goals.subtitle')}
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
            onClick={handleOpenAddForm}
          >
            <Plus size={18} />
            <span>{t('goals.newGoal')}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar" style={{ marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#888',
            }}
          />
          <input
            type="text"
            placeholder={t('goals.searchPlaceholder')}
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

      {/* Goals Table */}
      <div className="table-card">
        {loading && goals.length === 0 ? (
          <div className="table-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>{t('goals.loadingGoals')}</p>
          </div>
        ) : displayedGoals.length === 0 ? (
          <div className="table-empty-state">
            <Target size={36} />
            <p>{t('goals.noGoalsRegistered')}</p>
            <button type="button" className="btn-action-primary" onClick={handleOpenAddForm}>
              <Plus size={16} />
              <span>{t('goals.registerFirstGoal')}</span>
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>{t('goals.goalClient')}</th>
                  <th>{t('goals.weightHeight')}</th>
                  <th>{t('goals.caloricGoal')}</th>
                  <th>{t('goals.formulaObjective')}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {displayedGoals.map((g) => {
                  const custId = g.customerId || g.customer_id;
                  const formId = g.formulaId || g.formula_id;
                  const objId = g.objectiveId || g.objective_id;
                  const actualW = g.actualWeight || g.actual_weight;
                  const desiredW = g.desiredWeight || g.desired_weight;
                  const caloricGoal = g.customerCaloricGoal || g.customer_caloric_goal;

                  return (
                    <tr key={g.id}>
                      <td>
                        <div className="user-table-info">
                          <span className="user-table-name" style={{ fontWeight: '600' }}>
                            {g.name}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} /> {getCustomerName(custId)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                          <span>
                            {t('goals.currentWeight', { weight: actualW || 'N/A' })} {g.height ? `| ${g.height} cm` : ''}
                          </span>
                          {desiredW && (
                            <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '500' }}>
                              {t('goals.goalWeight', { weight: desiredW })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {caloricGoal ? (
                          <span className="role-badge" style={{ backgroundColor: '#FEF3C7', color: '#B45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Flame size={12} /> {caloricGoal} kcal
                          </span>
                        ) : (
                          <span style={{ color: '#888', fontSize: '0.82rem' }}>{t('goals.notCalculated')}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.82rem' }}>
                          <span style={{ fontWeight: '500', color: 'var(--text-heading)' }}>
                            {getFormulaName(formId)}
                          </span>
                          <span style={{ color: 'var(--text-body)' }}>
                            {t('goals.objective')} {getObjectiveName(objId)}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-table-edit"
                          onClick={() => handleOpenEditForm(g)}
                          title={t('goals.editGoal')}
                        >
                          <Edit2 size={16} />
                          <span>{t('common.edit')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
