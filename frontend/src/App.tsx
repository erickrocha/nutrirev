import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { store } from './store';
import { AppRoutes } from './router/AppRoutes';
import { PublicRoutes } from './router/PublicRoutes';
import { fetchTenantById } from './store/tenantSlice';
import { validateOrRefreshToken } from './store/authSlice';
import { tenantIdOfSession } from './utils/authStorage';
import { useAppDispatch, useAppSelector } from './store/hooks';
import './styles/theme.css';

export const AppContent = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { isAuthenticated, isInitializing, user } = useAppSelector((state) => state.auth);
  const tenantId = tenantIdOfSession(user);

  useEffect(() => { dispatch(validateOrRefreshToken()); }, [dispatch]);
  useEffect(() => { if (isAuthenticated && tenantId) dispatch(fetchTenantById(tenantId)); }, [isAuthenticated, tenantId, dispatch]);

  if (isInitializing) {
    return (
      <div role="status" className="flex h-screen flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-body)]">
        <Sparkles size={36} className="mb-4 animate-spin text-[var(--accent-primary)]" />
        <p className="m-0 text-[.9rem] uppercase tracking-[.08em]">{t('common.validatingSession')}</p>
      </div>
    );
  }
  return isAuthenticated ? <AppRoutes /> : <PublicRoutes />;
};

export const App = () => (
  <Provider store={store}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </BrowserRouter>
  </Provider>
);
