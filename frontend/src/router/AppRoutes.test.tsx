import { screen } from '@testing-library/react';
import { renderWithApp } from '../test/render';
import { AppRoutes } from './AppRoutes';
import { PublicRoutes } from './PublicRoutes';

vi.mock('react-i18next', async () => (await import('../test/render')).i18nMock);

describe('rotas', () => {
  it('mostra 404 para um endereço desconhecido do usuário logado', async () => {
    renderWithApp(<AppRoutes />, { route: '/nao-existe', path: '*', user: { role: 'TENANT_OWNER' } });
    expect(await screen.findByRole('heading', { name: 'notFound.title' })).toBeInTheDocument();
  });

  it('mostra 404 para endereço desconhecido do visitante, com link ao login', async () => {
    renderWithApp(<PublicRoutes />, { route: '/nada', path: '*' });
    expect(await screen.findByRole('link', { name: 'notFound.login' })).toHaveAttribute('href', '/login');
  });
});
