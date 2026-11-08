import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { MealPointTierListPage } from './MealPointTierListPage';
import { MealPointTierFormPage } from './MealPointTierFormPage';
import { dailyMealService, mealPointTierService } from '../../services/clinicalService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const tier = { id: 2, dailyMealId: 7, deadlineTime: '10:30:00', points: 15 };
const meals = [{ id: 7, name: 'Almoço' }, { id: 8, name: 'Jantar' }];

describe('MealPointTierListPage', () => {
  it('mostra o nome da refeição, horário e pontos', async () => {
    vi.spyOn(mealPointTierService, 'getAll').mockResolvedValue([tier]);
    vi.spyOn(dailyMealService, 'getAll').mockResolvedValue(meals);
    renderWithApp(<MealPointTierListPage />);
    expect(await screen.findByText('Almoço')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /common.edit/ })).toHaveAttribute('href', '/meal-point-tiers/2/edit');
  });

  it('mostra estado vazio', async () => {
    vi.spyOn(mealPointTierService, 'getAll').mockResolvedValue([]);
    vi.spyOn(dailyMealService, 'getAll').mockResolvedValue([]);
    renderWithApp(<MealPointTierListPage />);
    expect(await screen.findByText('mealPointTiers.emptyStateTitle')).toBeInTheDocument();
  });
});

describe('MealPointTierFormPage', () => {
  it('cadastra com a primeira refeição, horário completo e pontos numéricos', async () => {
    vi.spyOn(mealPointTierService, 'getAll').mockResolvedValue([]);
    vi.spyOn(dailyMealService, 'getAll').mockResolvedValue(meals);
    const create = vi.spyOn(mealPointTierService, 'create').mockResolvedValue({});
    renderWithApp(<MealPointTierFormPage />, { route: '/meal-point-tiers/new', path: '/meal-point-tiers/new' });
    await screen.findByRole('option', { name: 'Almoço' });
    await userEvent.click(screen.getByRole('button', { name: /common.register/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ dailyMealId: 7, deadlineTime: '12:00:00', points: 10 }));
  });

  it('valida os pontos', async () => {
    vi.spyOn(mealPointTierService, 'getAll').mockResolvedValue([]);
    vi.spyOn(dailyMealService, 'getAll').mockResolvedValue(meals);
    const create = vi.spyOn(mealPointTierService, 'create');
    renderWithApp(<MealPointTierFormPage />, { route: '/meal-point-tiers/new', path: '/meal-point-tiers/new' });
    await screen.findByRole('option', { name: 'Almoço' });
    await userEvent.clear(screen.getByLabelText('mealPointTiers.points'));
    await userEvent.click(screen.getByRole('button', { name: /common.register/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('mealPointTiers.pointsInvalid');
    expect(create).not.toHaveBeenCalled();
  });

  it('carrega o nível na edição (HH:mm) e atualiza', async () => {
    vi.spyOn(mealPointTierService, 'getAll').mockResolvedValue([tier]);
    vi.spyOn(dailyMealService, 'getAll').mockResolvedValue(meals);
    const update = vi.spyOn(mealPointTierService, 'update').mockResolvedValue({});
    renderWithApp(<MealPointTierFormPage />, { route: '/meal-point-tiers/2/edit', path: '/meal-point-tiers/:id/edit' });
    expect(await screen.findByDisplayValue('10:30')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.saveChanges/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(2, { dailyMealId: 7, deadlineTime: '10:30:00', points: 15 }));
  });
});
