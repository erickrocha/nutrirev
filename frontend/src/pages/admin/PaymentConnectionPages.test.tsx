import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { PaymentConnectionListPage } from './PaymentConnectionListPage';
import { PaymentConnectionFormPage } from './PaymentConnectionFormPage';
import { paymentConnectionAdminService as service } from '../../services/clinicalService';
import { tenantService } from '../../services/tenantService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const admin = { role: 'SysAdmin' };
const live = { id: 1, tenantId: 3, provider: 'asaas', environment: 'sandbox', merchantReference: 'm-1', credentialsSecretRef: 'secret/a', active: true, creditEnabled: true, pixEnabled: true, recurringEnabled: false };
const idle = { ...live, id: 2, provider: 'rede', merchantReference: 'm-2', active: false, pixEnabled: false };

const mock = (rows: unknown[] = [live, idle]) => {
  vi.spyOn(service, 'list').mockResolvedValue(rows);
  vi.spyOn(tenantService, 'getTenants').mockResolvedValue([{ id: 3, name: 'Clínica Sol' }, { id: 4, name: 'Clínica Lua' }]);
};

describe('PaymentConnectionListPage', () => {
  it('bloqueia quem não é SysAdmin', () => {
    const list = vi.spyOn(service, 'list');
    renderWithApp(<PaymentConnectionListPage />, { user: { role: 'TenantOwner' } });
    expect(screen.getByText('tenants.restrictedAccess')).toBeInTheDocument();
    expect(list).not.toHaveBeenCalled();
  });

  it('lista as conexões com clínica, formas e status, e só permite desativar a ativa', async () => {
    mock();
    renderWithApp(<PaymentConnectionListPage />, { user: admin });
    expect(await screen.findByText('m-1')).toBeInTheDocument();
    expect(screen.getAllByText('Clínica Sol').length).toBeGreaterThan(0);
    expect(screen.getByText('paymentSettings.credit · paymentSettings.pix')).toBeInTheDocument();
    const [disableLive, disableIdle] = screen.getAllByRole('button', { name: 'paymentConnections.disable' });
    expect(disableLive).toBeEnabled();
    expect(disableIdle).toBeDisabled();
    expect(screen.getAllByRole('link', { name: 'common.edit' })[0]).toHaveAttribute('href', '/admin/payment-connections/1/edit');
  });

  it('filtra pela clínica e leva o filtro ao cadastro', async () => {
    mock();
    const list = vi.spyOn(service, 'list');
    renderWithApp(<PaymentConnectionListPage />, { user: admin });
    await screen.findByText('m-1');
    await userEvent.selectOptions(screen.getByLabelText('paymentConnections.filterByTenant'), '4');
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(4));
    expect(screen.getByRole('link', { name: /paymentConnections.newConnection/ })).toHaveAttribute('href', '/admin/payment-connections/new?tenantId=4');
  });

  it('desativa e exclui depois de confirmar; mostra o erro quando a API recusa', async () => {
    mock();
    const disable = vi.spyOn(service, 'disable').mockResolvedValue({});
    const remove = vi.spyOn(service, 'remove').mockRejectedValue({});
    renderWithApp(<PaymentConnectionListPage />, { user: admin });
    await userEvent.click((await screen.findAllByRole('button', { name: 'paymentConnections.disable' }))[0]);
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'paymentConnections.disable' }));
    await waitFor(() => expect(disable).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getAllByRole('button', { name: 'common.delete' })[0]);
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'common.delete' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(1));
    expect(await screen.findByText('paymentConnections.deleteError')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    mock([]);
    const { unmount } = renderWithApp(<PaymentConnectionListPage />, { user: admin });
    expect(await screen.findByText('paymentConnections.empty')).toBeInTheDocument();
    unmount();
    mock();
    vi.spyOn(service, 'list').mockRejectedValueOnce({});
    renderWithApp(<PaymentConnectionListPage />, { user: admin });
    expect(await screen.findByText('paymentConnections.loadError')).toBeInTheDocument();
  });
});

describe('PaymentConnectionFormPage', () => {
  it('bloqueia quem não é SysAdmin', () => {
    renderWithApp(<PaymentConnectionFormPage />, { route: '/admin/payment-connections/new', path: '/admin/payment-connections/new', user: { role: 'TenantOwner' } });
    expect(screen.getByText('tenants.restrictedAccess')).toBeInTheDocument();
  });

  it('exige clínica, referência e segredo no formato permitido', async () => {
    mock();
    const provision = vi.spyOn(service, 'provision');
    renderWithApp(<PaymentConnectionFormPage />, { route: '/admin/payment-connections/new', path: '/admin/payment-connections/new', user: admin });
    await userEvent.click(await screen.findByRole('button', { name: 'common.save' }));
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThanOrEqual(2);
    await userEvent.type(screen.getByLabelText(/paymentConnections.credentialsSecretRef/), 'segredo inválido!');
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }));
    expect(provision).not.toHaveBeenCalled();
  });

  it('provisiona com a clínica vinda do filtro da lista', async () => {
    mock();
    const provision = vi.spyOn(service, 'provision').mockResolvedValue({});
    renderWithApp(<PaymentConnectionFormPage />, { route: '/admin/payment-connections/new?tenantId=4', path: '/admin/payment-connections/new', user: admin });
    await userEvent.type(await screen.findByLabelText(/paymentConnections.merchantReference/), ' m-9 ');
    await userEvent.type(screen.getByLabelText(/paymentConnections.credentialsSecretRef/), 'secrets/asaas_prod');
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => expect(provision).toHaveBeenCalledWith({ tenantId: 4, provider: 'rede', environment: 'sandbox', merchantReference: 'm-9', credentialsSecretRef: 'secrets/asaas_prod' }));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('na edição trava operadora e clínica, e o ambiente se a conexão está ativa', async () => {
    mock();
    const update = vi.spyOn(service, 'update').mockResolvedValue({});
    renderWithApp(<PaymentConnectionFormPage />, { route: '/admin/payment-connections/1/edit', path: '/admin/payment-connections/:id/edit', user: admin });
    expect(await screen.findByDisplayValue('m-1')).toBeInTheDocument();
    expect(screen.getByLabelText(/paymentConnections.tenant/)).toBeDisabled();
    expect(screen.getByLabelText(/paymentConnections.provider/)).toBeDisabled();
    expect(screen.getByLabelText(/paymentConnections.environment/)).toBeDisabled();
    expect(screen.getByText('paymentConnections.environmentLocked')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(1, { merchantReference: 'm-1', credentialsSecretRef: 'secret/a', environment: 'sandbox' }));
  });

  it('libera o ambiente quando a conexão está inativa e mostra a mensagem da API', async () => {
    mock();
    vi.spyOn(service, 'update').mockRejectedValue({ response: { data: { message: 'ambiente em uso' } } });
    renderWithApp(<PaymentConnectionFormPage />, { route: '/admin/payment-connections/2/edit', path: '/admin/payment-connections/:id/edit', user: admin });
    expect(await screen.findByLabelText(/paymentConnections.environment/)).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }));
    expect(await screen.findByText('ambiente em uso')).toBeInTheDocument();
  });
});
