import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './store';
import { AppRoutes } from './router/AppRoutes';
import { PublicRoutes } from './router/PublicRoutes';
import { fetchTenantById } from './store/tenantSlice';
import { validateOrRefreshToken } from './store/authSlice';
import { Sparkles } from 'lucide-react';
import './styles/main.scss';

function AppContent() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { isAuthenticated, isInitializing, user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(validateOrRefreshToken());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && user) {
      const tenantId = user.tenantId || user.tenant_id;
      if (tenantId) {
        dispatch(fetchTenantById(tenantId));
      }
    }
  }, [isAuthenticated, user, dispatch]);

  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-body)',
        }}
      >
        <Sparkles size={36} style={{ color: 'var(--accent-primary)', marginBottom: '1rem', animation: 'spin 2s linear infinite' }} />
        <p style={{ fontSize: '0.9rem', letterSpacing: '0.08em', color: 'var(--text-body)', textTransform: 'uppercase' }}>
          {t('common.validatingSession')}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PublicRoutes />;
  }

  return <AppRoutes />;
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}
