import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { MealPlanListPage } from './MealPlanListPage';
import { MealPlanFormPage } from './MealPlanFormPage';
import { MyMealPlanPage } from './MyMealPlanPage';
import { customerService } from '../../services/customerService';
import { doctorService } from '../../services/doctorService';
import { ingredientService } from '../../services/ingredientService';
import { mealPlanService } from '../../services/mealPlanService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const rice = { id: 11, name: 'Arroz', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 };
const plan = {
  id: 7, name: 'Emagrecimento', category: 'LoseWeight', generationStatus: 'Draft', isFavorite: false, patientId: 2, nutritionistId: 3,
  meals: [{ mealType: 'Lunch', isPreWorkout: false, isPostWorkout: false, nutritionistNote: 'beber água', position: 1, options: [{ label: 'Principal', position: 1, items: [{ ingredientId: 11, quantity: 150, unit: 'Grams' }] }] }],
  totalMacros: { kcal: 1800, proteinG: 120, carbsG: 200, carbsPct: 45, lipidsG: 60, lipidsPct: 30 },
};

const mockCatalogs = () => {
  vi.spyOn(customerService, 'getAll').mockResolvedValue([{ id: 2, name: 'Ana', email: 'ana@x.com' }]);
  vi.spyOn(doctorService, 'getAll').mockResolvedValue([{ id: 3, name: 'Dr. Carlos' }]);
  vi.spyOn(ingredientService, 'search').mockResolvedValue({ items: [rice], total: 1 });
  vi.spyOn(ingredientService, 'getByIds').mockResolvedValue([rice]);
};

describe('MealPlanListPage', () => {
  it('lista os planos com categoria, macros e links', async () => {
    vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValue({ content: [plan], total_pages: 1, total_elements: 1 });
    renderWithApp(<MealPlanListPage />);
    expect(await screen.findByText('Emagrecimento')).toBeInTheDocument();
    expect(screen.getByText('🔥 1800 kcal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /common.edit/ })).toHaveAttribute('href', '/meal-plans/7/edit');
  });

  it('filtra por categoria na API e volta para a primeira página', async () => {
    const page = vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValue({ content: [plan], total_pages: 1, total_elements: 1 });
    renderWithApp(<MealPlanListPage />);
    await screen.findByText('Emagrecimento');
    await userEvent.selectOptions(screen.getByLabelText('mealPlan.category'), 'KeepFit');
    await waitFor(() => expect(page).toHaveBeenLastCalledWith({ page: 1, size: 10, category: 'KeepFit' }));
  });

  it('alterna favorito sem recarregar a lista', async () => {
    const page = vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValue({ content: [plan], total_pages: 1, total_elements: 1 });
    const toggle = vi.spyOn(mealPlanService, 'toggleFavorite').mockResolvedValue({});
    renderWithApp(<MealPlanListPage />);
    const star = await screen.findByRole('button', { name: 'mealPlanAdmin.favorite' });
    await userEvent.click(star);
    await waitFor(() => expect(star).toHaveAttribute('aria-pressed', 'true'));
    expect(toggle).toHaveBeenCalledWith(7);
    expect(page).toHaveBeenCalledTimes(1);
  });

  it('exclui depois de confirmar e mostra o aviso', async () => {
    vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValue({ content: [plan], total_pages: 1, total_elements: 1 });
    const remove = vi.spyOn(mealPlanService, 'delete').mockResolvedValue({});
    renderWithApp(<MealPlanListPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'common.delete' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'common.delete' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(7));
    expect(await screen.findByText('mealPlanAdmin.deleted')).toBeInTheDocument();
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValueOnce({ content: [] });
    const { unmount } = renderWithApp(<MealPlanListPage />);
    expect(await screen.findByText('mealPlanAdmin.empty')).toBeInTheDocument();
    unmount();
    vi.spyOn(mealPlanService, 'getPaginated').mockRejectedValueOnce({});
    renderWithApp(<MealPlanListPage />);
    expect(await screen.findByText('mealPlanAdmin.loadError')).toBeInTheDocument();
  });
});

describe('MealPlanFormPage', () => {
  it('exige o nome do plano', async () => {
    mockCatalogs();
    const create = vi.spyOn(mealPlanService, 'create');
    renderWithApp(<MealPlanFormPage />, { route: '/meal-plans/new', path: '/meal-plans/new' });
    await userEvent.click(await screen.findByRole('button', { name: /mealPlanForm.submitRegister/ }));
    expect(await screen.findByText('mealPlanForm.nameRequired')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('cadastra com uma refeição e a opção principal', async () => {
    mockCatalogs();
    const create = vi.spyOn(mealPlanService, 'create').mockResolvedValue({});
    renderWithApp(<MealPlanFormPage />, { route: '/meal-plans/new', path: '/meal-plans/new' });
    await userEvent.type(await screen.findByLabelText(/mealPlanForm.planName/), 'Plano novo');
    await userEvent.click(screen.getByRole('button', { name: /mealPlanForm.submitRegister/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Plano novo', category: 'KeepFit', patientId: null, nutritionistId: null,
      meals: [expect.objectContaining({ mealType: 'Breakfast', position: 1, options: [expect.objectContaining({ label: 'mealPlanForm.mainOption', items: [] })] })],
    })));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('adiciona e remove refeições', async () => {
    mockCatalogs();
    renderWithApp(<MealPlanFormPage />, { route: '/meal-plans/new', path: '/meal-plans/new' });
    await screen.findByLabelText(/mealPlanForm.planName/);
    await userEvent.click(screen.getByRole('button', { name: /mealPlanForm.addMeal/ }));
    expect(screen.getAllByRole('button', { name: 'mealPlanForm.deleteMeal' })).toHaveLength(2);
    await userEvent.click(screen.getAllByRole('button', { name: 'mealPlanForm.deleteMeal' })[1]);
    expect(screen.getAllByRole('button', { name: 'mealPlanForm.deleteMeal' })).toHaveLength(1);
  });

  it('não deixa adicionar alimento enquanto a busca de ingredientes não tem resultado', async () => {
    mockCatalogs();
    vi.spyOn(ingredientService, 'search').mockResolvedValue({ items: [] });
    renderWithApp(<MealPlanFormPage />, { route: '/meal-plans/new', path: '/meal-plans/new' });
    await screen.findByLabelText(/mealPlanForm.planName/);
    expect(screen.getByRole('button', { name: /mealPlanForm.addFood/ })).toBeDisabled();
  });

  it('adicionar alimento já vem com o primeiro ingrediente da busca, 100 g, e calcula os macros', async () => {
    mockCatalogs();
    const create = vi.spyOn(mealPlanService, 'create').mockResolvedValue({});
    renderWithApp(<MealPlanFormPage />, { route: '/meal-plans/new', path: '/meal-plans/new' });
    await userEvent.type(await screen.findByLabelText(/mealPlanForm.planName/), 'Plano');
    await waitFor(() => expect(screen.getByRole('button', { name: /mealPlanForm.addFood/ })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: /mealPlanForm.addFood/ }));
    expect(await screen.findByText(/130\.0kcal/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /mealPlanForm.submitRegister/ }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    const items = (create.mock.calls[0][0] as { meals: { options: { items: unknown }[] }[] }).meals[0].options[0].items;
    expect(items).toEqual([{ ingredientId: 11, quantity: 100, unit: 'Grams', substitutes: [] }]);
  });

  it('carrega o plano na edição e atualiza pelo id', async () => {
    mockCatalogs();
    vi.spyOn(mealPlanService, 'getById').mockResolvedValue(plan);
    const update = vi.spyOn(mealPlanService, 'update').mockResolvedValue({});
    renderWithApp(<MealPlanFormPage />, { route: '/meal-plans/7/edit', path: '/meal-plans/:id/edit' });
    expect(await screen.findByDisplayValue('Emagrecimento')).toBeInTheDocument();
    expect(screen.getByDisplayValue('beber água')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.saveChanges/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Emagrecimento', patientId: 2, nutritionistId: 3 })));
  });

  it('mostra erro quando o plano não carrega', async () => {
    mockCatalogs();
    vi.spyOn(mealPlanService, 'getById').mockRejectedValue({});
    renderWithApp(<MealPlanFormPage />, { route: '/meal-plans/7/edit', path: '/meal-plans/:id/edit' });
    expect(await screen.findByText('mealPlanForm.loadError')).toBeInTheDocument();
  });
});

describe('MyMealPlanPage', () => {
  it('mostra os planos da paciente e expande os detalhes com o nome dos ingredientes', async () => {
    mockCatalogs();
    vi.spyOn(customerService, 'getMe').mockResolvedValue({ id: 2 });
    const page = vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValue({ content: [plan] });
    renderWithApp(<MyMealPlanPage />);
    expect(await screen.findByText('Emagrecimento')).toBeInTheDocument();
    expect(page).toHaveBeenCalledWith({ patient_id: 2, page: 1, size: 50 });
    await userEvent.click(screen.getByRole('button', { name: /mealPlan.viewDetails/ }));
    expect(await screen.findByText(/Arroz — 150/)).toBeInTheDocument();
    expect(screen.getByText('beber água')).toBeInTheDocument();
  });

  it('mostra estado vazio e erro ao carregar o perfil', async () => {
    vi.spyOn(customerService, 'getMe').mockResolvedValueOnce({ id: 2 });
    vi.spyOn(mealPlanService, 'getPaginated').mockResolvedValueOnce({ content: [] });
    const { unmount } = renderWithApp(<MyMealPlanPage />);
    expect(await screen.findByText('mealPlan.noMealPlanFound')).toBeInTheDocument();
    unmount();
    vi.spyOn(customerService, 'getMe').mockRejectedValueOnce({});
    renderWithApp(<MyMealPlanPage />);
    expect(await screen.findByText('mealPlan.errorLoadingProfile')).toBeInTheDocument();
  });
});
