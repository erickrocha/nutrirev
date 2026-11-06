import { screen } from '@testing-library/react';
import { renderWithApp } from '../../test/render';
import { OrderPage } from './OrderPage';
import { planOrderService } from '../../services/planOrderService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
vi.mock('../../components/common/LanguageSwitcher', () => ({ LanguageToggle: () => <div /> }));
vi.mock('../../services/planOrderService', () => ({
  planOrderService: { getPublicPlan: vi.fn(), getProvinces: vi.fn().mockResolvedValue([]), createOrder: vi.fn() },
}));

const plan = { uuid: 'p1', name: 'Profissional', priceInCents: 34900, availableUsers: 5, periodDays: 30, dailyAiQuota: 4, tiers: [] };

describe('OrderPage', () => {
  it('mostra o plano e o formulário', async () => {
    vi.mocked(planOrderService.getPublicPlan).mockResolvedValue(plan);
    renderWithApp(<OrderPage />, { route: '/contratar/p1', path: '/contratar/:planUuid' });
    expect(await screen.findByText('Profissional')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'order.submit' })).toBeInTheDocument();
    expect(planOrderService.getPublicPlan).toHaveBeenCalledWith('p1');
  });

  it('avisa quando o plano não existe', async () => {
    vi.mocked(planOrderService.getPublicPlan).mockRejectedValue({ response: { status: 404 } });
    renderWithApp(<OrderPage />, { route: '/contratar/zz', path: '/contratar/:planUuid' });
    expect(await screen.findByText(/order\.planNotFound/)).toBeInTheDocument();
  });
});
