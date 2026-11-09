import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { PaymentSettingsPage } from './PaymentSettingsPage';
import { paymentSettingsService } from '../../services/clinicalService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const asaas = { id: 1, provider: 'Asaas', merchantReference: 'm-1', environment: 'sandbox', active: true, creditEnabled: true, pixEnabled: true, recurringEnabled: false, supportsPix: true, supportsRecurring: true };
const basic = { id: 2, provider: 'Basic', merchantReference: 'm-2', environment: 'production', active: false, creditEnabled: true, pixEnabled: false, recurringEnabled: false, supportsPix: false, supportsRecurring: false };

describe('PaymentSettingsPage', () => {
  it('mostra a adquirente ativa selecionada com as formas já ligadas', async () => {
    vi.spyOn(paymentSettingsService, 'getConnections').mockResolvedValue([basic, asaas]);
    renderWithApp(<PaymentSettingsPage />);
    expect(await screen.findByRole('radio', { name: /Asaas/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('checkbox', { name: /paymentSettings.pix/ })).toBeChecked();
    expect(screen.getByText('paymentSettings.live')).toBeInTheDocument();
  });

  it('bloqueia Pix e recorrência quando a adquirente não suporta', async () => {
    vi.spyOn(paymentSettingsService, 'getConnections').mockResolvedValue([asaas, basic]);
    renderWithApp(<PaymentSettingsPage />);
    await userEvent.click(await screen.findByRole('radio', { name: /Basic/ }));
    expect(screen.getByRole('checkbox', { name: /paymentSettings.pix/ })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /paymentSettings.recurring/ })).toBeDisabled();
    expect(screen.getByText('paymentSettings.pixUnsupported')).toBeInTheDocument();
  });

  it('exige ao menos uma forma ligada e impede salvar', async () => {
    vi.spyOn(paymentSettingsService, 'getConnections').mockResolvedValue([basic]);
    const select = vi.spyOn(paymentSettingsService, 'select');
    renderWithApp(<PaymentSettingsPage />);
    await userEvent.click(await screen.findByRole('checkbox', { name: /paymentSettings.credit/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('paymentSettings.needOneMethod');
    expect(screen.getByRole('button', { name: 'common.save' })).toBeDisabled();
    expect(select).not.toHaveBeenCalled();
  });

  it('salva a escolha e mostra a confirmação', async () => {
    vi.spyOn(paymentSettingsService, 'getConnections').mockResolvedValue([asaas, basic]);
    const select = vi.spyOn(paymentSettingsService, 'select').mockResolvedValue({});
    renderWithApp(<PaymentSettingsPage />);
    await userEvent.click(await screen.findByRole('radio', { name: /Basic/ }));
    await userEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => expect(select).toHaveBeenCalledWith({ tenantId: undefined, merchantId: 2, creditEnabled: true, pixEnabled: false, recurringEnabled: false }));
    expect(await screen.findByText('paymentSettings.saved')).toBeInTheDocument();
  });

  it('mostra aviso sem conexões e erro de carregamento', async () => {
    vi.spyOn(paymentSettingsService, 'getConnections').mockResolvedValueOnce([]);
    const { unmount } = renderWithApp(<PaymentSettingsPage />);
    expect(await screen.findByText('paymentSettings.noConnections')).toBeInTheDocument();
    unmount();
    vi.spyOn(paymentSettingsService, 'getConnections').mockRejectedValueOnce(new Error('x'));
    renderWithApp(<PaymentSettingsPage />);
    expect(await screen.findByText('paymentSettings.loadError')).toBeInTheDocument();
  });
});
