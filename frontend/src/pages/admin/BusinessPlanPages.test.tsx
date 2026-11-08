import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { BusinessPlanListPage } from './BusinessPlanListPage';
import { BusinessPlanFormPage } from './BusinessPlanFormPage';
import { businessPlanService } from '../../services/businessPlanService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const plan = { id: 4, uuid: 'abc', name: 'Pro', priceInCents: 14900, availableUsers: 5, periodDays: 30, dailyAiQuota: 6, paymentDate: '2026-03-09', tiers: [{ id: 1, upToUsers: 10, pricePerUserInCents: 500 }] };

describe('BusinessPlanListPage', () => {
  it('lista os planos com preço, faixas, cota e link de edição', async () => {
    vi.spyOn(businessPlanService, 'getPlans').mockResolvedValue([plan]);
    renderWithApp(<BusinessPlanListPage />);
    expect(await screen.findByText('Pro')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?149,00/)).toBeInTheDocument();
    expect(screen.getByText(/businessPlans.tiered/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'common.edit' })).toHaveAttribute('href', '/admin/business-plans/4/edit');
  });

  it('exclui depois de confirmar e recarrega; mostra o erro se falhar', async () => {
    vi.spyOn(businessPlanService, 'getPlans').mockResolvedValue([plan]);
    const del = vi.spyOn(businessPlanService, 'deletePlan').mockRejectedValueOnce({}).mockResolvedValueOnce(undefined);
    renderWithApp(<BusinessPlanListPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'common.delete' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'common.delete' }));
    expect(await screen.findByText('businessPlans.deleteError')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'common.delete' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(del).toHaveBeenCalledWith(4);
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    vi.spyOn(businessPlanService, 'getPlans').mockResolvedValueOnce([]);
    const { unmount } = renderWithApp(<BusinessPlanListPage />);
    expect(await screen.findByText('businessPlans.empty')).toBeInTheDocument();
    unmount();
    vi.spyOn(businessPlanService, 'getPlans').mockRejectedValueOnce({});
    renderWithApp(<BusinessPlanListPage />);
    expect(await screen.findByText('businessPlans.loadError')).toBeInTheDocument();
  });
});

describe('BusinessPlanFormPage', () => {
  it('valida os campos obrigatórios', async () => {
    const create = vi.spyOn(businessPlanService, 'createPlan');
    renderWithApp(<BusinessPlanFormPage />, { route: '/admin/business-plans/new', path: '/admin/business-plans/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'common.save' }));
    expect((await screen.findAllByText('businessPlans.validationError')).length).toBeGreaterThanOrEqual(3);
    expect(create).not.toHaveBeenCalled();
  });

  it('cadastra em centavos com faixas, sem enviar id nas novas', async () => {
    const create = vi.spyOn(businessPlanService, 'createPlan').mockResolvedValue({});
    renderWithApp(<BusinessPlanFormPage />, { route: '/admin/business-plans/new', path: '/admin/business-plans/new' });
    await userEvent.type(await screen.findByLabelText(/businessPlans.name/), 'Starter');
    await userEvent.type(screen.getByLabelText(/businessPlans.basePrice/), '99.9');
    await userEvent.type(screen.getByLabelText(/businessPlans.paymentDate/), '2026-04-01');
    await userEvent.click(screen.getByRole('button', { name: /businessPlans.addTier/ }));
    await userEvent.type(screen.getByLabelText(/businessPlans.pricePerUserTier/), '5');
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({
      name: 'Starter', priceInCents: 9990, availableUsers: 1, periodDays: 30, dailyAiQuota: 4, paymentDate: '2026-04-01', tiers: [{ upToUsers: 0, pricePerUserInCents: 500 }],
    }));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('remove uma faixa', async () => {
    vi.spyOn(businessPlanService, 'getPlan').mockResolvedValue(plan);
    renderWithApp(<BusinessPlanFormPage />, { route: '/admin/business-plans/4/edit', path: '/admin/business-plans/:id/edit' });
    await userEvent.click(await screen.findByRole('button', { name: 'businessPlans.removeTier' }));
    expect(screen.getByText('businessPlans.noTiers')).toBeInTheDocument();
  });

  it('carrega o plano na edição, mantém o id da faixa e atualiza', async () => {
    vi.spyOn(businessPlanService, 'getPlan').mockResolvedValue(plan);
    const update = vi.spyOn(businessPlanService, 'updatePlan').mockResolvedValue({});
    renderWithApp(<BusinessPlanFormPage />, { route: '/admin/business-plans/4/edit', path: '/admin/business-plans/:id/edit' });
    expect(await screen.findByDisplayValue('Pro')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(4, expect.objectContaining({ priceInCents: 14900, dailyAiQuota: 6, tiers: [{ id: 1, upToUsers: 10, pricePerUserInCents: 500 }] })));
  });

  it('mostra erro quando o plano não carrega', async () => {
    vi.spyOn(businessPlanService, 'getPlan').mockRejectedValue({});
    renderWithApp(<BusinessPlanFormPage />, { route: '/admin/business-plans/4/edit', path: '/admin/business-plans/:id/edit' });
    expect(await screen.findByText('businessPlans.formLoadError')).toBeInTheDocument();
  });
});
