import { screen, waitFor } from '@testing-library/react';
import { renderWithApp } from '../../test/render';
import { LandingPage } from './LandingPage';
import { planOrderService } from '../../services/planOrderService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const plan = (n: number) => ({ uuid: `u${n}`, name: `Plano ${n}`, priceInCents: n * 10000, availableUsers: 5, periodDays: 30, dailyAiQuota: 10, tiers: [] });

describe('LandingPage', () => {
  it('lista os planos ordenados por preço com link de contratação e destaca o do meio', async () => {
    vi.spyOn(planOrderService, 'getPublicPlans').mockResolvedValue([plan(3), plan(1), plan(2)]);
    renderWithApp(<LandingPage />);
    const links = await screen.findAllByRole('link', { name: /plans.start/ });
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/contratar/u1', '/contratar/u2', '/contratar/u3']);
    expect(screen.getByText('site.plans.flag')).toBeInTheDocument();
  });

  it('avisa quando os planos não carregam, sem quebrar a página', async () => {
    vi.spyOn(planOrderService, 'getPublicPlans').mockRejectedValue(new Error('down'));
    renderWithApp(<LandingPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('site.plans.unavailable');
    expect(screen.getAllByRole('link', { name: /site.access/ }).length).toBeGreaterThan(0);
  });

  it('só busca os planos uma vez', async () => {
    const get = vi.spyOn(planOrderService, 'getPublicPlans').mockResolvedValue([plan(1)]);
    renderWithApp(<LandingPage />);
    await waitFor(() => expect(screen.getByRole('link', { name: /plans.start/ })).toBeInTheDocument());
    expect(get).toHaveBeenCalledTimes(1);
  });
});
