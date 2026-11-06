import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import planOrderReducer from '../store/planOrderSlice';

export const makeStore = () => configureStore({ reducer: { planOrder: planOrderReducer } });

// t devolve a própria chave e o idioma é sempre pt: os testes não dependem do texto.
// Referência estável, como no react-i18next real (efeitos dependem de `t`).
const mockI18n = { t: (key: string) => key, i18n: { language: 'pt' } };
export const i18nMock = { useTranslation: () => mockI18n };

export const renderWithApp = (ui: ReactElement, { route = '/', path = '*' } = {}) => {
  const store = makeStore();
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<div data-testid="elsewhere" />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...utils };
};
