import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { LoginPage } from './LoginPage';
import authReducer from '../../store/authSlice';
import { authService } from '../../services/authService';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const withAuth = () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  render(<Provider store={store}><MemoryRouter><LoginPage /></MemoryRouter></Provider>);
  return store;
};

describe('LoginPage', () => {
  it('exige e-mail válido e senha antes de chamar a API', async () => {
    const login = vi.spyOn(authService, 'login');
    renderWithApp(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /auth.accessPanel/ }));
    expect((await screen.findAllByText('order.errors.required')).length).toBe(2);
    await userEvent.type(screen.getByLabelText('auth.corporateEmail'), 'não-é-email');
    await userEvent.type(screen.getByLabelText('auth.accessPassword'), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: /auth.accessPanel/ }));
    expect(await screen.findByText('order.errors.email')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('entra com e-mail e senha e guarda a sessão', async () => {
    const login = vi.spyOn(authService, 'login').mockResolvedValue({ accessToken: 'a', role: 'User' });
    const store = withAuth();
    await userEvent.type(screen.getByLabelText('auth.corporateEmail'), ' ana@x.com ');
    await userEvent.type(screen.getByLabelText('auth.accessPassword'), 'segredo');
    await userEvent.click(screen.getByRole('button', { name: /auth.accessPanel/ }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('ana@x.com', 'segredo'));
    await waitFor(() => expect(store.getState().auth.isAuthenticated).toBe(true));
  });

  it('mostra o erro da API e some quando o usuário volta a digitar', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue({ response: { data: { message: 'Senha incorreta' } } });
    withAuth();
    await userEvent.type(screen.getByLabelText('auth.corporateEmail'), 'ana@x.com');
    await userEvent.type(screen.getByLabelText('auth.accessPassword'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: /auth.accessPanel/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Senha incorreta');
    await userEvent.type(screen.getByLabelText('auth.accessPassword'), '1');
    await waitFor(() => expect(screen.queryByText('Senha incorreta')).not.toBeInTheDocument());
  });

  it('tem link de volta ao site e o seletor de idioma', () => {
    renderWithApp(<LoginPage />);
    expect(screen.getByRole('link', { name: 'auth.backToSite' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
  });
});
