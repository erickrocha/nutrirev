import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Users,
  Building,
  PanelLeftClose,
  PanelLeft,
  UserCheck,
  Target,
  FileText,
  Utensils,
  CalendarDays,
  AlertCircle,
  Activity,
  Heart,
  Stethoscope,
  Calculator,
  Zap,
  Compass,
  Flame,
  Home,
  Settings,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Apple,
  Star,
  CreditCard,
  Inbox,
} from 'lucide-react';
import { PATHS } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';

export const Sidebar = ({ collapsed, setCollapsed, mobileOpen, onCloseMobile }) => {
  const { user } = useSelector((state) => state.auth);
  const { t } = useTranslation();
  const location = useLocation();

  const roleName = user?.role || '';
  const isSysAdmin = roleName === ROLES.SYS_ADMIN;
  const isTenantUser = roleName === ROLES.TENANT_USER;
  const isTenantOwner = roleName === ROLES.TENANT_OWNER;
  const isUserRole = roleName === ROLES.USER;

  const menuSections = useMemo(() => isUserRole
    ? [
        {
          id: 'user-menu',
          title: t('sidebar.menu'),
          items: [
            { path: PATHS.HOME, label: t('sidebar.home'), icon: Home },
            { path: PATHS.MY_MEAL_PLAN, label: t('sidebar.myMealPlan'), icon: FileText },
            { path: PATHS.DAILY, label: t('sidebar.daily'), icon: CalendarDays },
            { path: PATHS.MANUAL_MEAL_ANALYSIS, label: t('sidebar.manualMealAnalysis'), icon: Calculator },
            { path: PATHS.EAT, label: t('sidebar.recipes'), icon: Utensils },
            { path: PATHS.PAYMENTS, label: t('sidebar.payments'), icon: CreditCard },
            { path: PATHS.SETTINGS, label: t('sidebar.settings'), icon: Settings },
          ],
        },
      ]
    : [
        {
          id: 'main',
          title: t('sidebar.main'),
          items: [
            ...(isSysAdmin ? [{ path: PATHS.SYSADMIN_DASHBOARD, label: t('sidebar.adminDashboard'), icon: LayoutDashboard }] : []),
            { path: PATHS.TENANT_DASHBOARD, label: isSysAdmin ? t('sidebar.tenantDashboard') : t('sidebar.dashboard'), icon: LayoutDashboard },
            ...(!isTenantUser ? [{ path: PATHS.USERS, label: t('sidebar.users'), icon: Users }] : []),
            ...(isSysAdmin ? [{ path: PATHS.TENANTS, label: t('sidebar.tenants'), icon: Building }] : []),
            ...(isSysAdmin ? [{ path: PATHS.BUSINESS_PLANS, label: t('sidebar.businessPlans'), icon: FileText }] : []),
            ...(isSysAdmin ? [{ path: PATHS.PLAN_ORDERS, label: t('sidebar.planOrders'), icon: Inbox }] : []),
            ...(isSysAdmin ? [{ path: PATHS.PAYMENT_CONNECTIONS, label: t('sidebar.paymentConnections'), icon: CreditCard }] : []),
            { path: PATHS.CUSTOMERS, label: t('sidebar.customers'), icon: UserCheck },
            ...((isTenantOwner || isTenantUser || isSysAdmin) ? [{ path: PATHS.DOCTORS, label: t('sidebar.doctors'), icon: Stethoscope }] : []),
          ],
        },
        {
          id: 'service-and-goals',
          title: t('sidebar.serviceAndGoals'),
          items: [
            { path: PATHS.CUSTOMER_GOALS, label: t('sidebar.customerGoals'), icon: Target },
            { path: PATHS.CLINICAL_PLANS, label: t('sidebar.clinicalPlans'), icon: FileText },
            { path: PATHS.PAYMENT_DATES, label: 'Data de Pagamento', icon: CalendarDays },
            { path: PATHS.PAYMENT_SETTINGS, label: t('sidebar.paymentSettings'), icon: CreditCard },
            { path: PATHS.PREPARE_MEALS, label: t('sidebar.prepareMeals'), icon: Utensils },
            { path: PATHS.DAILY_MEALS, label: t('sidebar.dailyMeals'), icon: CalendarDays },
            { path: PATHS.MEAL_POINT_TIERS, label: t('sidebar.mealPointTiers'), icon: Star },
          ],
        },
        {
          id: 'recipes-and-diets',
          title: t('sidebar.recipesAndDiets'),
          items: [
            { path: PATHS.RECIPES, label: t('sidebar.recipesEat'), icon: Utensils },
            { path: PATHS.INGREDIENTS, label: t('sidebar.ingredients'), icon: Apple },
            { path: PATHS.MEAL_PLANS, label: t('sidebar.mealPlans'), icon: FileText },
          ],
        },
        ...(!isTenantUser
          ? [
              {
                id: 'clinical-parameters',
                title: t('sidebar.clinicalParameters'),
                items: [
                  { path: PATHS.DIETARY_RESTRICTIONS, label: t('sidebar.dietaryRestrictions'), icon: AlertCircle },
                  { path: PATHS.BOWEL_FUNCTIONS, label: t('sidebar.bowelFunctions'), icon: Activity },
                  { path: PATHS.PRE_EXISTING_CONDITIONS, label: t('sidebar.preExistingConditions'), icon: Heart },
                  { path: PATHS.CLINICAL_CONDITIONS, label: t('sidebar.clinicalConditions'), icon: Stethoscope },
                  { path: PATHS.FORMULAS, label: t('sidebar.formulas'), icon: Calculator },
                  { path: PATHS.ACTIVITY_FACTORS, label: t('sidebar.activityFactors'), icon: Zap },
                  { path: PATHS.OBJECTIVES, label: t('sidebar.objectives'), icon: Compass },
                  { path: PATHS.PHYSICAL_ACTIVITY_LEVELS, label: t('sidebar.activityLevels'), icon: Flame },
                ],
              },
            ]
          : []),
      ], [isSysAdmin, isTenantOwner, isTenantUser, isUserRole, t]);

  const storageKey = `nutrirev.sidebarSections.${roleName || 'guest'}`;
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      setExpandedSections(saved && typeof saved === 'object' ? saved : {});
    } catch {
      setExpandedSections({});
    }
  }, [storageKey]);

  useEffect(() => {
    const activeSection = menuSections.find((section) =>
      section.items.some((item) => item.path === location.pathname)
    );
    if (!activeSection || expandedSections[activeSection.id] !== false) return;
    setExpandedSections((current) => {
      const next = { ...current, [activeSection.id]: true };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [location.pathname, storageKey, expandedSections, menuSections]);

  const toggleSection = (sectionId) => {
    setExpandedSections((current) => {
      const next = { ...current, [sectionId]: current[sectionId] === false };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  return (
    <aside className={`main-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} style={{ overflowY: 'auto' }}>
      <div className="sidebar-header">
        {!collapsed && <span className="sidebar-title">{t('sidebar.navigation')}</span>}
        <button
          type="button"
          className="btn-collapse-toggle"
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? t('sidebar.expandMenu') : t('sidebar.collapseMenu')}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuSections.map((section) => {
          const sectionExpanded = collapsed || expandedSections[section.id] !== false;
          return (
          <div key={section.id} className="sidebar-section" style={{ marginBottom: '16px' }}>
            {!collapsed && (
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                aria-expanded={sectionExpanded}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-body)',
                  padding: '8px 16px 4px 16px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{section.title}</span>
                {sectionExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            {sectionExpanded && section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onCloseMobile}
                  title={item.label}
                >
                  <Icon size={18} className="sidebar-icon" />
                  {!collapsed && <span className="sidebar-label">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="sidebar-info">
            <p className="system-version">{t('sidebar.systemVersion')}</p>
          </div>
        )}
      </div>
    </aside>
  );
};
