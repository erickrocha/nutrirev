import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { SysAdminDashboardPage } from './SysAdminDashboardPage';
import { TenantDashboardPage } from './TenantDashboardPage';
import { clinicalPlanService, prepareMealService } from '../../services/clinicalService';
import { sysAdminDashboardService } from '../../services/sysAdminDashboardService';
import { tenantDashboardService } from '../../services/tenantDashboardService';
import { tenantService } from '../../services/tenantService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const admin = { role: 'SysAdmin' };
const owner = { role: 'TenantOwner', tenantId: 3 };

describe('SysAdminDashboardPage', () => {
  const data = {
    totals: { tenants: 4, users: 21, activePlans: 3, tenantsWithoutActivePlan: 1, monthlyRecurringRevenueInCents: 59700 },
    billingAttention: [{ businessPlanId: 1, tenantId: 2, tenantName: 'Clínica Sol', planName: 'Pro', paymentDate: '2026-03-09', contractValueInCents: 19900, overdue: true }],
    recentTenants: [{ id: 2, name: 'Clínica Sol', email: 's@x.com', activePlanName: 'Pro', createdAt: '2026-01-02T10:00:00' }],
  };

  it('mostra os totais, a receita mensal, a cobrança em atenção e as clínicas recentes', async () => {
    vi.spyOn(sysAdminDashboardService, 'getDashboard').mockResolvedValue(data);
    renderWithApp(<SysAdminDashboardPage />, { user: admin });
    expect(await screen.findByText('21')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?597,00/)).toBeInTheDocument();
    expect(screen.getByText('sysAdminDashboard.overdue')).toBeInTheDocument();
    expect(screen.getAllByText('Clínica Sol')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /sysAdminDashboard.manageTenants/ })).toHaveAttribute('href', '/tenants');
  });

  it('sem pendências e sem clínicas mostra os estados vazios; falha mostra o erro com nova tentativa', async () => {
    vi.spyOn(sysAdminDashboardService, 'getDashboard').mockResolvedValueOnce({ totals: {}, billingAttention: [], recentTenants: [] });
    const { unmount } = renderWithApp(<SysAdminDashboardPage />, { user: admin });
    expect(await screen.findByText('sysAdminDashboard.noBillingAttention')).toBeInTheDocument();
    expect(screen.getByText('sysAdminDashboard.noTenants')).toBeInTheDocument();
    unmount();
    vi.spyOn(sysAdminDashboardService, 'getDashboard').mockRejectedValueOnce({});
    renderWithApp(<SysAdminDashboardPage />, { user: admin });
    expect(await screen.findByText('sysAdminDashboard.loadError')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /common.retry/ })).toBeInTheDocument();
  });
});

describe('TenantDashboardPage', () => {
  const data = {
    totals: { customers: 12, doctors: 2, customersWithGoals: 8, mealPlans: 5, finishedMealPlans: 3, mobileEnabledCustomers: 6 },
    recentCustomers: [{ id: 1, name: 'Ana Souza', email: 'ana@x.com', clinicalPlanId: 9, prepareMealId: 4, mobileEnabled: true }],
  };
  const mock = () => {
    vi.spyOn(tenantDashboardService, 'getDashboard').mockResolvedValue(data);
    vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([{ id: 9, name: 'Trimestral' }]);
    vi.spyOn(prepareMealService, 'getAll').mockResolvedValue([{ id: 4, name: 'Marmita' }]);
  };

  it('a equipe da clínica vê os totais e os pacientes recentes com plano e refeição', async () => {
    mock();
    renderWithApp(<TenantDashboardPage />, { user: owner });
    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Trimestral')).toBeInTheDocument();
    expect(screen.getByText(/Marmita/)).toBeInTheDocument();
    expect(screen.getByText('tenantDashboard.finishedPlans')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tenantDashboard.viewPatient/ })).toHaveAttribute('href', '/customers');
    expect(screen.getByText('tenantDashboard.patients').closest('a')).toHaveAttribute('href', '/customers');
  });

  it('alterna para a tabela', async () => {
    mock();
    renderWithApp(<TenantDashboardPage />, { user: owner });
    await screen.findByText('Ana Souza');
    await userEvent.click(screen.getByRole('button', { name: /tenantDashboard.table/ }));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('o SysAdmin escolhe a primeira clínica e o painel é pedido para ela', async () => {
    mock();
    vi.spyOn(tenantService, 'getTenants').mockResolvedValue([{ id: 7, name: 'Clínica Sol' }, { id: 8, name: 'Clínica Lua' }]);
    const dash = vi.mocked(tenantDashboardService.getDashboard);
    renderWithApp(<TenantDashboardPage />, { user: admin });
    await waitFor(() => expect(dash).toHaveBeenCalledWith(7));
    await userEvent.selectOptions(await screen.findByLabelText('paymentSettings.supportingClinic'), '8');
    await waitFor(() => expect(dash).toHaveBeenLastCalledWith(8));
  });

  it('sem pacientes mostra o estado vazio; falha mostra o erro', async () => {
    vi.spyOn(tenantDashboardService, 'getDashboard').mockResolvedValueOnce({ totals: {}, recentCustomers: [] });
    vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([]);
    vi.spyOn(prepareMealService, 'getAll').mockResolvedValue([]);
    const { unmount } = renderWithApp(<TenantDashboardPage />, { user: owner });
    expect(await screen.findByText('tenantDashboard.noRecentPatients')).toBeInTheDocument();
    unmount();
    vi.spyOn(tenantDashboardService, 'getDashboard').mockRejectedValueOnce({});
    renderWithApp(<TenantDashboardPage />, { user: owner });
    expect(await screen.findByText('tenantDashboard.loadError')).toBeInTheDocument();
  });
});
