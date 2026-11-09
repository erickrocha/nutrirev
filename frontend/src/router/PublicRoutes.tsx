import { Routes, Route } from 'react-router-dom';
import { LandingPage } from '../pages/landing/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { OrderPage } from '../pages/order/OrderPage';
import { NotFoundPage } from '../pages/NotFoundPage';

/** Rotas do visitante deslogado: landing, login, contratação e 404. */
export const PublicRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/contratar/:planUuid" element={<OrderPage />} />
    <Route path="*" element={<NotFoundPage homePath="/login" homeLabelKey="notFound.login" />} />
  </Routes>
);
