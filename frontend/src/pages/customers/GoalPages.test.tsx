import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { GoalListPage } from './GoalListPage';
import { GoalFormPage } from './GoalFormPage';
import { activityFactorService, customerGoalSettingService, formulaService, objectiveService, physicalActivityLevelService } from '../../services/clinicalService';
import { customerService } from '../../services/customerService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const goal = { id: 9, name: 'Emagrecer', customerId: 2, formulaId: 3, objectiveId: 4, actualWeight: 80, height: 170, desiredWeight: 70, customerCaloricGoal: 1800 };

const mockData = (goals: unknown[] = [goal]) => {
  vi.spyOn(customerGoalSettingService, 'getAll').mockResolvedValue(goals);
  vi.spyOn(customerService, 'getAll').mockResolvedValue([{ id: 2, name: 'Ana', email: 'ana@x.com' }]);
  vi.spyOn(formulaService, 'getAll').mockResolvedValue([{ id: 3, name: 'Mifflin' }]);
  vi.spyOn(activityFactorService, 'getAll').mockResolvedValue([{ id: 5, name: 'Moderado' }]);
  vi.spyOn(objectiveService, 'getAll').mockResolvedValue([{ id: 4, name: 'Perda de peso' }]);
  vi.spyOn(physicalActivityLevelService, 'getAll').mockResolvedValue([{ id: 6, name: 'Leve' }]);
};

describe('GoalListPage', () => {
  it('lista metas com cliente, peso, kcal, fórmula e link de edição', async () => {
    mockData();
    renderWithApp(<GoalListPage />);
    expect(await screen.findByText('Emagrecer')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('1800 kcal')).toBeInTheDocument();
    expect(screen.getByText('Mifflin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /common.edit/ })).toHaveAttribute('href', '/customer-goals/9/edit');
  });

  it('filtra pelo nome do cliente', async () => {
    mockData();
    renderWithApp(<GoalListPage />);
    await screen.findByText('Emagrecer');
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('goals.noGoalsRegistered')).toBeInTheDocument();
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    mockData([]);
    const { unmount } = renderWithApp(<GoalListPage />);
    expect(await screen.findByText('goals.noGoalsRegistered')).toBeInTheDocument();
    unmount();
    mockData();
    vi.spyOn(customerGoalSettingService, 'getAll').mockRejectedValueOnce({});
    renderWithApp(<GoalListPage />);
    expect(await screen.findByText('goals.errorLoadingGoals')).toBeInTheDocument();
  });
});

describe('GoalFormPage', () => {
  it('cadastra com o primeiro item de cada catálogo e converte os números', async () => {
    mockData([]);
    const create = vi.spyOn(customerGoalSettingService, 'create').mockResolvedValue({});
    renderWithApp(<GoalFormPage />, { route: '/customer-goals/new', path: '/customer-goals/new' });
    await userEvent.type(await screen.findByLabelText('goalForm.currentWeight'), '82.5');
    await userEvent.click(screen.getByRole('button', { name: /common.register/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'goalForm.defaultGoalName', customerId: 2, formulaId: 3, activityFactorId: 5, objectiveId: 4, physicalActivityLevelId: 6, actualWeight: 82.5, height: null,
    })));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('exige o nome da meta', async () => {
    mockData([]);
    const create = vi.spyOn(customerGoalSettingService, 'create');
    renderWithApp(<GoalFormPage />, { route: '/customer-goals/new', path: '/customer-goals/new' });
    await userEvent.clear(await screen.findByLabelText('goalForm.goalName'));
    await userEvent.click(screen.getByRole('button', { name: /common.register/ }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('carrega a meta na edição e atualiza pelo id', async () => {
    mockData();
    const update = vi.spyOn(customerGoalSettingService, 'update').mockResolvedValue({});
    renderWithApp(<GoalFormPage />, { route: '/customer-goals/9/edit', path: '/customer-goals/:id/edit' });
    expect(await screen.findByDisplayValue('Emagrecer')).toBeInTheDocument();
    expect(screen.getByLabelText('goalForm.calculationFormula')).toHaveValue('3');
    await userEvent.click(screen.getByRole('button', { name: /common.saveChanges/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(9, expect.objectContaining({ name: 'Emagrecer', customerId: 2, actualWeight: 80, customerCaloricGoal: 1800 })));
  });

  it('mostra a mensagem da API quando salvar falha e erro quando a meta não existe', async () => {
    mockData();
    vi.spyOn(customerGoalSettingService, 'update').mockRejectedValue({ response: { data: { message: 'meta inválida' } } });
    const { unmount } = renderWithApp(<GoalFormPage />, { route: '/customer-goals/9/edit', path: '/customer-goals/:id/edit' });
    await userEvent.click(await screen.findByRole('button', { name: /common.saveChanges/ }));
    expect(await screen.findByText('meta inválida')).toBeInTheDocument();
    unmount();
    renderWithApp(<GoalFormPage />, { route: '/customer-goals/77/edit', path: '/customer-goals/:id/edit' });
    expect(await screen.findByText('goals.noGoalsRegistered')).toBeInTheDocument();
  });
});
