import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { TenantListPage } from './TenantListPage';
import { TenantFormPage } from './TenantFormPage';
import { TenantPlanPage } from './TenantPlanPage';
import { businessPlanService } from '../../services/businessPlanService';
import { cityService, provinceService } from '../../services/clinicalService';
import { tenantService } from '../../services/tenantService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const admin = { role: 'SysAdmin' };
const clinic = { id: 3, uuid: 'u-1', name: 'Clínica Sol', taxId: '11222333000181', email: 'c@x.com', phone: '11987654321', postalCode: '01310100', countryCode: 'BR', administrativeArea: 'SP', locality: 'São Paulo' };

beforeEach(() => {
  vi.spyOn(provinceService, 'getAll').mockResolvedValue([{ id: 1, acronym: 'SP', name: 'São Paulo' }]);
  vi.spyOn(cityService, 'getByProvinceId').mockResolvedValue([{ name: 'São Paulo' }]);
});

describe('TenantListPage', () => {
  it('bloqueia quem não é SysAdmin', () => {
    const getTenants = vi.spyOn(tenantService, 'getTenants');
    renderWithApp(<TenantListPage />, { user: { role: 'TenantOwner' } });
    expect(screen.getByText('tenants.restrictedAccess')).toBeInTheDocument();
    expect(getTenants).not.toHaveBeenCalled();
  });

  it('lista as clínicas com links e troca a clínica ativa', async () => {
    vi.spyOn(tenantService, 'getTenants').mockResolvedValue([clinic, { id: 4, name: 'Outra' }]);
    renderWithApp(<TenantListPage />, { user: admin });
    expect(await screen.findByText('Clínica Sol')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /common.edit/ })[0]).toHaveAttribute('href', '/tenants/3/edit');
    expect(screen.getAllByRole('link', { name: /tenants.managePlan/ })[0]).toHaveAttribute('href', '/tenants/3/plan');
    await userEvent.click(screen.getAllByRole('button', { name: 'tenants.switchView' })[0]);
    expect(await screen.findByText(/tenants.currentTenant/)).toBeInTheDocument();
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    vi.spyOn(tenantService, 'getTenants').mockResolvedValueOnce([]);
    const { unmount } = renderWithApp(<TenantListPage />, { user: admin });
    expect(await screen.findByText('tenants.noTenantsFound')).toBeInTheDocument();
    unmount();
    vi.spyOn(tenantService, 'getTenants').mockRejectedValueOnce({});
    renderWithApp(<TenantListPage />, { user: admin });
    expect(await screen.findByText(/Falha ao buscar tenants|tenants.errorLoadingTenants/)).toBeInTheDocument();
  });
});

describe('TenantFormPage', () => {
  it('exige o nome e valida o CNPJ/CPF', async () => {
    vi.spyOn(tenantService, 'getTenants').mockResolvedValue([]);
    const create = vi.spyOn(tenantService, 'createTenant');
    renderWithApp(<TenantFormPage />, { route: '/tenants/new', path: '/tenants/new', user: admin });
    await userEvent.type(await screen.findByLabelText('tenants.taxId'), '11111111111');
    await userEvent.click(screen.getByRole('button', { name: /tenants.createTenant/ }));
    expect(await screen.findByText('tenants.nameRequired')).toBeInTheDocument();
    expect(screen.getByText('tenants.taxIdInvalid')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('cadastra enviando só dígitos nos campos mascarados', async () => {
    vi.spyOn(tenantService, 'getTenants').mockResolvedValue([]);
    const create = vi.spyOn(tenantService, 'createTenant').mockResolvedValue({ id: 9 });
    renderWithApp(<TenantFormPage />, { route: '/tenants/new', path: '/tenants/new', user: admin });
    await userEvent.type(await screen.findByLabelText('tenants.clinicName'), 'Nova Clínica');
    await userEvent.type(screen.getByLabelText('tenants.phone'), '11987654321');
    await userEvent.type(screen.getByLabelText('address.postalCode'), '01310100');
    expect(screen.getByLabelText('address.postalCode')).toHaveValue('01310-100');
    await userEvent.click(screen.getByRole('button', { name: /tenants.createTenant/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nova Clínica', phone: '11987654321', postalCode: '01310100', countryCode: 'BR', taxId: null, email: null })));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('carrega a clínica na edição com máscaras e atualiza pelo id', async () => {
    vi.spyOn(tenantService, 'getTenants').mockResolvedValue([clinic]);
    const update = vi.spyOn(tenantService, 'updateTenant').mockResolvedValue({ ...clinic });
    renderWithApp(<TenantFormPage />, { route: '/tenants/3/edit', path: '/tenants/:id/edit', user: admin });
    expect(await screen.findByDisplayValue('Clínica Sol')).toBeInTheDocument();
    expect(screen.getByLabelText('tenants.taxId')).toHaveValue('11.222.333/0001-81');
    await userEvent.click(screen.getByRole('button', { name: /common.saveChanges/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(3, expect.objectContaining({ taxId: '11222333000181', phone: '11987654321', postalCode: '01310100' })));
  });

  it('mostra erro quando a clínica não existe ou a API recusa', async () => {
    vi.spyOn(tenantService, 'getTenants').mockResolvedValue([clinic]);
    vi.spyOn(tenantService, 'updateTenant').mockRejectedValue({ response: { data: { message: 'CNPJ já cadastrado' } } });
    const { unmount } = renderWithApp(<TenantFormPage />, { route: '/tenants/3/edit', path: '/tenants/:id/edit', user: admin });
    await userEvent.click(await screen.findByRole('button', { name: /common.saveChanges/ }));
    expect(await screen.findByText('CNPJ já cadastrado')).toBeInTheDocument();
    unmount();
    renderWithApp(<TenantFormPage />, { route: '/tenants/99/edit', path: '/tenants/:id/edit', user: admin });
    expect(await screen.findByText('tenants.noTenantsFound')).toBeInTheDocument();
  });
});

describe('TenantPlanPage', () => {
  const plans = [{ id: 1, name: 'Starter', priceInCents: 9900, availableUsers: 3, periodDays: 30, paymentDate: '2026-01-01' }, { id: 2, name: 'Pro', priceInCents: 19900, availableUsers: 10, periodDays: 30, paymentDate: '2026-01-01' }];

  const mock = (active: unknown = null) => {
    vi.spyOn(tenantService, 'getTenants').mockResolvedValue([clinic]);
    vi.spyOn(businessPlanService, 'getPlans').mockResolvedValue(plans);
    vi.spyOn(tenantService, 'getTenantActivePlan').mockResolvedValue(active);
  };

  it('seleciona o primeiro plano quando não há plano ativo e salva a escolha', async () => {
    mock();
    const add = vi.spyOn(tenantService, 'addTenantPlan').mockResolvedValue({});
    renderWithApp(<TenantPlanPage />, { route: '/tenants/3/plan', path: '/tenants/:id/plan', user: admin });
    expect(await screen.findByRole('radio', { name: /Starter/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('tenants.noActivePlan')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Pro/ }));
    await userEvent.click(screen.getByRole('button', { name: /tenants.savePlan/ }));
    await waitFor(() => expect(add).toHaveBeenCalledWith(3, expect.objectContaining({ tenantId: 3, businessPlanId: 2, active: true })));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('começa pelo plano ativo da clínica e mostra o nome dele', async () => {
    mock({ businessPlanId: 2, paymentDate: '2026-05-10', active: false });
    renderWithApp(<TenantPlanPage />, { route: '/tenants/3/plan', path: '/tenants/:id/plan', user: admin });
    expect(await screen.findByRole('radio', { name: /Pro/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByDisplayValue('2026-05-10')).toBeInTheDocument();
    expect(screen.getAllByText('Pro').length).toBeGreaterThan(1);
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('mostra a mensagem da API quando salvar falha e erro quando a clínica não existe', async () => {
    mock();
    vi.spyOn(tenantService, 'addTenantPlan').mockRejectedValue({ response: { data: { message: 'plano indisponível' } } });
    const { unmount } = renderWithApp(<TenantPlanPage />, { route: '/tenants/3/plan', path: '/tenants/:id/plan', user: admin });
    await userEvent.click(await screen.findByRole('button', { name: /tenants.savePlan/ }));
    expect(await screen.findByText('plano indisponível')).toBeInTheDocument();
    unmount();
    renderWithApp(<TenantPlanPage />, { route: '/tenants/99/plan', path: '/tenants/:id/plan', user: admin });
    expect(await screen.findByText('tenants.noTenantsFound')).toBeInTheDocument();
  });
});
