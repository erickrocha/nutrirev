import { screen } from '@testing-library/react';
import { renderWithApp } from '../test/render';
import { NotFoundPage } from './NotFoundPage';

vi.mock('react-i18next', async () => (await import('../test/render')).i18nMock);

describe('NotFoundPage', () => {
  it('mostra o 404 com link para o início', () => {
    renderWithApp(<NotFoundPage />);
    expect(screen.getByRole('heading', { name: 'notFound.title' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'notFound.home' })).toHaveAttribute('href', '/');
  });

  it('aceita destino e rótulo próprios', () => {
    renderWithApp(<NotFoundPage homePath="/login" homeLabelKey="notFound.login" />);
    expect(screen.getByRole('link', { name: 'notFound.login' })).toHaveAttribute('href', '/login');
  });
});
