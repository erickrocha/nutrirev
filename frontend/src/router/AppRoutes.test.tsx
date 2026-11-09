import { screen, waitFor } from '@testing-library/react';
import { renderWithApp } from '../test/render';
import { AppRoutes } from './AppRoutes';
import { PublicRoutes } from './PublicRoutes';

vi.mock('react-i18next', async () => (await import('../test/render')).i18nMock);

describe('rotas', () => {
  it('mostra 404 para um endereço desconhecido do usuário logado', async () => {
    renderWithApp(<AppRoutes />, { route: '/nao-existe', path: '*', user: { role: 'TENANT_OWNER' } });
    expect(await screen.findByRole('heading', { name: 'notFound.title' })).toBeInTheDocument();
  });

  it('depois de entrar, /login leva à página inicial do perfil, não ao 404', async () => {
    renderWithApp(<AppRoutes />, { route: '/login', path: '*', user: { role: 'TENANT_OWNER' } });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'notFound.title' })).not.toBeInTheDocument());
  });

  it('depois de sair, uma tela interna leva ao login, não ao 404', async () => {
    renderWithApp(<PublicRoutes />, { route: '/home', path: '*' });
    expect(await screen.findByLabelText('auth.corporateEmail')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'notFound.title' })).not.toBeInTheDocument();
  });

  it('mostra 404 para endereço desconhecido do visitante, com link ao login', async () => {
    renderWithApp(<PublicRoutes />, { route: '/nada', path: '*' });
    expect(await screen.findByRole('link', { name: 'notFound.login' })).toHaveAttribute('href', '/login');
  });
});
