import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { PaymentSettingsPage } from './PaymentSettingsPage';
import { paymentSettingsService } from '../../services/clinicalService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const configuredSettings = {
  configured: true,
  provider: 'stripe',
  environment: 'sandbox',
  publishableKey: 'pk_test_123456789',
  creditEnabled: true,
  pixEnabled: true,
  recurringEnabled: false,
  supportsPix: true,
  supportsRecurring: true,
};

const unconfiguredSettings = {
  configured: false,
  provider: 'stripe',
  environment: 'sandbox',
  publishableKey: null,
  creditEnabled: true,
  pixEnabled: true,
  recurringEnabled: false,
  supportsPix: true,
  supportsRecurring: true,
};

describe('PaymentSettingsPage', () => {
  it('mostra status ativo quando a integração Stripe está configurada', async () => {
    vi.spyOn(paymentSettingsService, 'getSettings').mockResolvedValue(configuredSettings);
    renderWithApp(<PaymentSettingsPage />);

    expect(await screen.findByText('paymentSettings.statusActive')).toBeInTheDocument();
    expect(screen.getByDisplayValue('pk_test_123456789')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /paymentSettings.credit/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /paymentSettings.pix/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /paymentSettings.recurring/ })).not.toBeChecked();
  });

  it('mostra status inativo quando não configurado', async () => {
    vi.spyOn(paymentSettingsService, 'getSettings').mockResolvedValue(unconfiguredSettings);
    renderWithApp(<PaymentSettingsPage />);

    expect(await screen.findByText('paymentSettings.statusInactive')).toBeInTheDocument();
    expect(screen.getByLabelText(/paymentSettings.publishableKey/)).toHaveValue('');
  });

  it('exige ao menos uma forma de pagamento e desabilita o botão salvar', async () => {
    vi.spyOn(paymentSettingsService, 'getSettings').mockResolvedValue(configuredSettings);
    const save = vi.spyOn(paymentSettingsService, 'saveSettings');
    renderWithApp(<PaymentSettingsPage />);

    // Desmarca crédito e pix
    const creditCheckbox = await screen.findByRole('checkbox', { name: /paymentSettings.credit/ });
    const pixCheckbox = screen.getByRole('checkbox', { name: /paymentSettings.pix/ });

    await userEvent.click(creditCheckbox);
    await userEvent.click(pixCheckbox);

    expect(screen.getByRole('alert')).toHaveTextContent('paymentSettings.needOneMethod');
    expect(screen.getByRole('button', { name: /paymentSettings.saveButton/ })).toBeDisabled();
    expect(save).not.toHaveBeenCalled();
  });

  it('salva as credenciais e configurações da Stripe com sucesso', async () => {
    vi.spyOn(paymentSettingsService, 'getSettings').mockResolvedValue(configuredSettings);
    const save = vi.spyOn(paymentSettingsService, 'saveSettings').mockResolvedValue(configuredSettings);

    renderWithApp(<PaymentSettingsPage />);

    const publishableInput = await screen.findByLabelText(/paymentSettings.publishableKey/);
    const secretInput = screen.getByLabelText(/paymentSettings.secretKey/);

    await userEvent.clear(publishableInput);
    await userEvent.type(publishableInput, 'pk_test_new_key');
    await userEvent.type(secretInput, 'sk_test_new_secret');

    await userEvent.click(screen.getByRole('button', { name: /paymentSettings.saveButton/ }));

    await waitFor(() => {
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          publishableKey: 'pk_test_new_key',
          secretKey: 'sk_test_new_secret',
        }),
      );
    });

    expect(await screen.findByText('paymentSettings.saved')).toBeInTheDocument();
  });

  it('mostra erro de carregamento quando a API falha', async () => {
    vi.spyOn(paymentSettingsService, 'getSettings').mockRejectedValue(new Error('Network error'));
    renderWithApp(<PaymentSettingsPage />);

    expect(await screen.findByText('paymentSettings.loadError')).toBeInTheDocument();
  });
});
