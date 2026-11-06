import { screen } from '@testing-library/react';
import { renderWithApp } from '../../test/render';
import { PlanOrderManagement } from './PlanOrderManagement';
import { planOrderService } from '../../services/planOrderService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
vi.mock('../../services/planOrderService', () => ({ planOrderService: { getOrders: vi.fn() } }));

const order = (uuid: string, status: string, name: string) => ({
  uuid, status, name, planName: 'Entrada', priceInCents: 14900, taxId: '12345678901', email: `${uuid}@x.com`,
  createdAt: '2026-10-01T10:00:00', updatedAt: '2026-10-01T10:00:00',
});

describe('PlanOrderManagement', () => {
  it('lista só os pendentes por padrão e abre o detalhe por link', async () => {
    vi.mocked(planOrderService.getOrders).mockResolvedValue([order('a', 'pending', 'Maria'), order('b', 'converted', 'João')] as never);
    renderWithApp(<PlanOrderManagement />);
    expect(await screen.findByText('Maria')).toBeInTheDocument();
    expect(screen.queryByText('João')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'planOrders.open' })).toHaveAttribute('href', '/admin/orders/a');
  });

  it('mostra estado vazio', async () => {
    vi.mocked(planOrderService.getOrders).mockResolvedValue([]);
    renderWithApp(<PlanOrderManagement />);
    expect(await screen.findByText('planOrders.empty')).toBeInTheDocument();
  });

  it('mostra o erro de carregamento', async () => {
    vi.mocked(planOrderService.getOrders).mockRejectedValue({ response: { data: { message: 'boom' } } });
    renderWithApp(<PlanOrderManagement />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
