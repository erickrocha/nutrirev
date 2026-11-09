import { useState } from 'react';
import { matchPath, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAppSelector } from '../../store/hooks';
import { DEFAULT_PATH_BY_ROLE, ROLE_ALLOWED_PATHS } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';

const KNOWN_ROLES: string[] = [ROLES.USER, ROLES.TENANT_USER, ROLES.SYS_ADMIN];

export const MainLayout = () => {
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Qualquer outro perfil é tratado como dono da clínica.
  const role = user?.role && KNOWN_ROLES.includes(user.role) ? user.role : ROLES.TENANT_OWNER;
  const allowed = (ROLE_ALLOWED_PATHS as Record<string, string[]>)[role] ?? [];
  const isAllowed = allowed.some((pattern) => matchPath({ path: pattern, end: true }, location.pathname));

  if (!isAllowed) {
    const fallback = (DEFAULT_PATH_BY_ROLE as Record<string, string>)[role] ?? DEFAULT_PATH_BY_ROLE.default;
    return <Navigate to={fallback} replace />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      <Topbar onToggleMobileMenu={() => setMobileOpen((current) => !current)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        {mobileOpen && <div role="presentation" onClick={() => setMobileOpen(false)} className="fixed inset-0 top-[80px] z-[89] bg-black/40 min-[901px]:hidden" />}
        <main className={`h-full flex-1 overflow-y-auto p-[10px] ${collapsed ? 'min-[901px]:pl-10' : ''}`}><Outlet /></main>
      </div>
    </div>
  );
};
