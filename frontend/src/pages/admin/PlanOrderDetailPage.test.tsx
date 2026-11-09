import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { PlanOrderDetailPage } from './PlanOrderDetailPage';
import { planOrderService } from '../../services/planOrderService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
vi.mock('../../services/planOrderService', () => ({
  planOrderService: { getOrder: vi.fn(), convertOrder: vi.fn(), cancelOrder: vi.fn() },
}));

const order = (status: string) => ({
  uuid: 'a', status, name: 'Maria', planName: 'Entrada', priceInCents: 14900, taxId: '12345678901', email: 'm@x.com',
  phone: '11999990000', addressLine1: 'Rua A, 10', locality: 'SP', administrativeArea: 'SP', postalCode: '01310100',
  createdAt: '2026-10-01T10:00:00', updatedAt: '2026-10-01T10:00:00',
});
const open = () => renderWithApp(<PlanOrderDetailPage />, { route: '/admin/orders/a', path: '/admin/orders/:uuid' });

describe('PlanOrderDetailPage', () => {
  it('rodapé: fechar à esquerda; cancelar pedido e converter à direita', async () => {
    vi.mocked(planOrderService.getOrder).mockResolvedValue(order('pending') as never);
    open();
    const footer = (await screen.findByRole('contentinfo'));
    const buttons = Array.from(footer.querySelectorAll('button')).map((b) => b.textContent);
    expect(buttons).toEqual(['common.close', 'planOrders.cancel', 'planOrders.convert']);
  });

  it('converte com a data informada e volta para a lista', async () => {
    vi.mocked(planOrderService.getOrder).mockResolvedValue(order('pending') as never);
    vi.mocked(planOrderService.convertOrder).mockResolvedValue();
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'planOrders.convert' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'planOrders.convert' }));
    await waitFor(() => expect(planOrderService.convertOrder).toHaveBeenCalledWith('a', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('não converte se o usuário não confirmar', async () => {
    vi.mocked(planOrderService.getOrder).mockResolvedValue(order('pending') as never);
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'planOrders.convert' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'common.cancel' }));
    expect(planOrderService.convertOrder).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('cancela o pedido depois de confirmar e volta para a lista', async () => {
    vi.mocked(planOrderService.getOrder).mockResolvedValue(order('pending') as never);
    vi.mocked(planOrderService.cancelOrder).mockResolvedValue();
    open();
    await userEvent.click(await screen.findByRole('button', { name: 'planOrders.cancel' }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'planOrders.cancel' }));
    await waitFor(() => expect(planOrderService.cancelOrder).toHaveBeenCalledWith('a'));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('esconde as ações de pedidos já convertidos', async () => {
    vi.mocked(planOrderService.getOrder).mockResolvedValue(order('converted') as never);
    open();
    await screen.findByRole('contentinfo');
    expect(screen.queryByRole('button', { name: 'planOrders.convert' })).not.toBeInTheDocument();
  });
});
