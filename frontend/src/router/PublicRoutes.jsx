import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '../pages/landing/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { OrderPage } from '../pages/order/OrderPage';

/**
 * Rotas do visitante deslogado. Qualquer rota interna cai no login (mesmo
 * comportamento de antes); a raiz agora é a landing pública.
 */
export const PublicRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/contratar/:planUuid" element={<OrderPage />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);
