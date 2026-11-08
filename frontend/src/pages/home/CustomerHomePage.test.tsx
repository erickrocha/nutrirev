import { screen } from '@testing-library/react';
import { renderWithApp } from '../../test/render';
import { CustomerHomePage } from './CustomerHomePage';
import { customerDailyMealService, dailyMealService } from '../../services/clinicalService';
import { customerService } from '../../services/customerService';
import { dashboardService } from '../../services/dashboardService';
import { mealPlanService } from '../../services/mealPlanService';
import { paymentService } from '../../services/paymentService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const plan = { id: 1, name: 'Plano Verão', category: 'LoseWeight', generationStatus: 'Finished', isFavorite: true, meals: [{}, {}], totalMacros: { kcal: 2000 } };

const mockAll = (charges: unknown[] = []) => {
  vi.spyOn(customerService, 'getMe').mockResolvedValue({ id: 3, name: 'Ana Souza', email: 'ana@x.com', city: 'Recife', province: 'PE' });
  vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValue({ content: [plan] });
  vi.spyOn(dailyMealService, 'getAll').mockResolvedValue([{ id: 1, name: 'Café' }, { id: 2, name: 'Almoço' }]);
  vi.spyOn(customerDailyMealService, 'getByCustomerId').mockResolvedValue([{ dailyMealId: 2 }]);
  vi.spyOn(dashboardService, 'getSummary').mockResolvedValue({ calories_consumed: 500, meals_logged: 2 });
  vi.spyOn(dashboardService, 'getPoints').mockResolvedValue({ total_points: 40 });
  vi.spyOn(paymentService, 'getMyCharges').mockResolvedValue(charges);
};

describe('CustomerHomePage', () => {
  it('mostra saudação, progresso do dia contra a meta do plano, plano recente e refeições atribuídas', async () => {
    mockAll();
    renderWithApp(<CustomerHomePage />);
    expect(await screen.findByText(/Ana!/)).toBeInTheDocument();
    expect(screen.getByText('Recife, PE')).toBeInTheDocument();
    expect(await screen.findByText('500 / 2000 kcal')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('40 pts')).toBeInTheDocument();
    expect(await screen.findByText('Plano Verão')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Plano Verão/ })).toHaveAttribute('href', '/meal-plan');
    expect(screen.getByText('Almoço')).toBeInTheDocument();
    expect(screen.queryByText('Café')).not.toBeInTheDocument();
  });

  it('avisa quando a fatura está atrasada ou vence em até 7 dias, e não avisa quando está longe', async () => {
    mockAll([{ id: 1, status: 'open', dueDate: day(-2), amountCents: 100 }]);
    const { unmount } = renderWithApp(<CustomerHomePage />);
    expect(await screen.findByText('payments.bannerOverdue')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /payments.payNow/ })).toHaveAttribute('href', '/payments');
    unmount();
    mockAll([{ id: 2, status: 'open', dueDate: day(5), amountCents: 100 }]);
    const second = renderWithApp(<CustomerHomePage />);
    expect(await screen.findByText('payments.bannerDueSoon')).toBeInTheDocument();
    second.unmount();
    mockAll([{ id: 3, status: 'open', dueDate: day(30), amountCents: 100 }]);
    renderWithApp(<CustomerHomePage />);
    await screen.findByText(/Ana!/);
    expect(screen.queryByText('payments.bannerDueSoon')).not.toBeInTheDocument();
  });

  it('sem plano mostra a mensagem; erro no perfil e no resumo aparecem separados', async () => {
    mockAll();
    vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValue({ content: [] });
    vi.spyOn(dashboardService, 'getSummary').mockRejectedValue(new Error('x'));
    renderWithApp(<CustomerHomePage />);
    expect(await screen.findByText('home.noMealPlanYet')).toBeInTheDocument();
    expect(await screen.findByText('home.errorLoadingProgress')).toBeInTheDocument();
  });

  it('erro ao carregar o perfil mostra o aviso', async () => {
    mockAll();
    vi.spyOn(customerService, 'getMe').mockRejectedValue(new Error('x'));
    renderWithApp(<CustomerHomePage />);
    expect(await screen.findByText('home.errorLoadingProfile')).toBeInTheDocument();
  });
});
