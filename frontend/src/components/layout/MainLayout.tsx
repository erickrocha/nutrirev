import { useEffect, useState } from 'react';
import { Link, matchPath, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchTenantSubscriptionStatus } from '../../store/tenantSubscriptionSlice';
import { DEFAULT_PATH_BY_ROLE, PATHS, ROLE_ALLOWED_PATHS } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';

const KNOWN_ROLES: string[] = [ROLES.USER, ROLES.TENANT_USER, ROLES.SYS_ADMIN];

export const MainLayout = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const subscriptionStatus =
    useAppSelector((state) => state.tenantSubscription?.status) ??
    user?.subscriptionStatus ??
    user?.subscription_status;
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Qualquer outro perfil é tratado como dono da clínica.
  const role = user?.role && KNOWN_ROLES.includes(user.role) ? user.role : ROLES.TENANT_OWNER;
  const isClinicRole = role === ROLES.TENANT_OWNER || role === ROLES.TENANT_USER;
  const isBlocked = isClinicRole && subscriptionStatus?.status === 'blocked';
  const isWarning = isClinicRole && subscriptionStatus?.status === 'warning';

  useEffect(() => {
    if (isClinicRole) {
      dispatch(fetchTenantSubscriptionStatus());
    }
  }, [isClinicRole, dispatch]);

  if (isBlocked && location.pathname !== PATHS.SUBSCRIPTION_PAYMENT) {
    return <Navigate to={PATHS.SUBSCRIPTION_PAYMENT} replace />;
  }

  const allowed = (ROLE_ALLOWED_PATHS as Record<string, string[]>)[role] ?? [];
  const isAllowed = allowed.some((pattern) => matchPath({ path: pattern, end: true }, location.pathname));

  if (!isAllowed) {
    const fallback = (DEFAULT_PATH_BY_ROLE as Record<string, string>)[role] ?? DEFAULT_PATH_BY_ROLE.default;
    return <Navigate to={fallback} replace />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      <Topbar onToggleMobileMenu={() => setMobileOpen((current) => !current)} />
      {isWarning && (
        <div className="flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-200 z-[95]">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {t(
                'tenantSubscription.warningBanner',
                `Atenção: A assinatura da clínica está pendente de pagamento (vencimento: ${
                  subscriptionStatus?.paymentDate || '--'
                }). Regularize para evitar o bloqueio.`
              )}
            </span>
          </div>
          {location.pathname !== PATHS.SUBSCRIPTION_PAYMENT && (
            <Link
              to={PATHS.SUBSCRIPTION_PAYMENT}
              className="shrink-0 rounded-md bg-amber-600 px-3 py-1 font-semibold text-white shadow-sm hover:bg-amber-700 transition no-underline"
            >
              {t('tenantSubscription.payNow', 'Pagar Assinatura')}
            </Link>
          )}
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        {mobileOpen && <div role="presentation" onClick={() => setMobileOpen(false)} className="fixed inset-0 top-[80px] z-[89] bg-black/40 min-[901px]:hidden" />}
        <main className={`h-full flex-1 overflow-y-auto p-[10px] ${collapsed ? 'min-[901px]:pl-10' : ''}`}><Outlet /></main>
      </div>
    </div>
  );
};
