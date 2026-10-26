import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Outlet, useLocation, matchPath, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ROLE_ALLOWED_PATHS, DEFAULT_PATH_BY_ROLE } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';

export const MainLayout = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const roleName = user?.role || '';
  const isSysAdmin = roleName === ROLES.SYS_ADMIN;
  const isTenantUser = roleName === ROLES.TENANT_USER;
  const isUserRole = roleName === ROLES.USER;

  const roleKey = isUserRole ? ROLES.USER : isTenantUser ? ROLES.TENANT_USER : isSysAdmin ? ROLES.SYS_ADMIN : ROLES.TENANT_OWNER;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allowedPaths = ROLE_ALLOWED_PATHS[roleKey] || [];
  const isAllowed = allowedPaths.some((pattern) => matchPath({ path: pattern, end: true }, location.pathname));

  if (!isAllowed) {
    const fallback = DEFAULT_PATH_BY_ROLE[roleKey] || DEFAULT_PATH_BY_ROLE.default;
    return <Navigate to={fallback} replace />;
  }

  return (
    <div className="main-layout-container">
      <Topbar onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />

      <div className="main-layout-body">
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {mobileMenuOpen && (
          <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
        )}

        <main className={`main-content-area ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
