import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isAppPath } from './routeConfig';
import { LandingPage } from '../pages/landing/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { OrderPage } from '../pages/order/OrderPage';
import { NotFoundPage } from '../pages/NotFoundPage';

// Tela interna sem sessão (ex.: logo após sair, ou sessão expirada) vai ao login; o resto é 404.
const UnknownPublicRoute = () => {
  const { pathname } = useLocation();
  return isAppPath(pathname) ? <Navigate to="/login" replace /> : <NotFoundPage homePath="/login" homeLabelKey="notFound.login" />;
};

/** Rotas do visitante deslogado: landing, login, contratação e 404. */
export const PublicRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/contratar/:planUuid" element={<OrderPage />} />
    <Route path="*" element={<UnknownPublicRoute />} />
  </Routes>
);
