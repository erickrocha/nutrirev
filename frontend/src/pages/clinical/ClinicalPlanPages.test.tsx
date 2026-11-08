import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { ClinicalPlanListPage } from './ClinicalPlanListPage';
import { ClinicalPlanFormPage } from './ClinicalPlanFormPage';
import { clinicalPlanService } from '../../services/clinicalService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const plan = { id: 5, name: 'Trimestral', priceInCents: 29900, renewPeriodDays: 90 };

describe('ClinicalPlanListPage', () => {
  it('lista os planos com preço, renovação e link de edição', async () => {
    vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([plan]);
    renderWithApp(<ClinicalPlanListPage />);
    expect(await screen.findByText('Trimestral')).toBeInTheDocument();
    expect(screen.getByText('R$ 299.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /common.edit/ })).toHaveAttribute('href', '/clinical-plans/5/edit');
  });

  it('mostra estado vazio e erro', async () => {
    vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValueOnce([]);
    const { unmount } = renderWithApp(<ClinicalPlanListPage />);
    expect(await screen.findByText('clinicalPlans.emptyStateTitle')).toBeInTheDocument();
    unmount();
    vi.spyOn(clinicalPlanService, 'getAll').mockRejectedValueOnce({ response: { data: { message: 'boom' } } });
    renderWithApp(<ClinicalPlanListPage />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});

describe('ClinicalPlanFormPage', () => {
  it('exige o nome', async () => {
    vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([]);
    const create = vi.spyOn(clinicalPlanService, 'create');
    renderWithApp(<ClinicalPlanFormPage />, { route: '/clinical-plans/new', path: '/clinical-plans/new' });
    await userEvent.click(await screen.findByRole('button', { name: /common.register/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('clinicalPlans.nameRequired');
    expect(create).not.toHaveBeenCalled();
  });

  it('cadastra convertendo o preço para centavos', async () => {
    vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([]);
    const create = vi.spyOn(clinicalPlanService, 'create').mockResolvedValue({});
    renderWithApp(<ClinicalPlanFormPage />, { route: '/clinical-plans/new', path: '/clinical-plans/new' });
    await userEvent.type(await screen.findByLabelText('clinicalPlans.planName'), 'Mensal');
    await userEvent.type(screen.getByLabelText('clinicalPlans.price'), '149,9');
    await userEvent.type(screen.getByLabelText('clinicalPlans.renewPeriod'), '30');
    await userEvent.click(screen.getByRole('button', { name: /common.register/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Mensal', priceInCents: 14990, renewPeriodDays: 30 }));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('carrega o plano na edição e atualiza pelo id', async () => {
    vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([plan]);
    const update = vi.spyOn(clinicalPlanService, 'update').mockResolvedValue({});
    renderWithApp(<ClinicalPlanFormPage />, { route: '/clinical-plans/5/edit', path: '/clinical-plans/:id/edit' });
    expect(await screen.findByDisplayValue('Trimestral')).toBeInTheDocument();
    expect(screen.getByLabelText('clinicalPlans.price')).toHaveValue('299.00');
    await userEvent.click(screen.getByRole('button', { name: /common.saveChanges/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(5, { name: 'Trimestral', priceInCents: 29900, renewPeriodDays: 90 }));
  });
});
