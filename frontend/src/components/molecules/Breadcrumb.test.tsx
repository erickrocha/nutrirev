import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumb } from './Breadcrumb';

describe('Breadcrumb', () => {
  it('renderiza link nos itens com destino e marca o último como página atual', () => {
    render(<MemoryRouter><Breadcrumb items={[{ label: 'Pedidos', to: '/admin/orders' }, { label: 'Maria' }]} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Pedidos' })).toHaveAttribute('href', '/admin/orders');
    expect(screen.getByText('Maria')).toHaveAttribute('aria-current', 'page');
  });
});
