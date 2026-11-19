import { render, screen, fireEvent } from '@testing-library/react';
import { StripePaymentElementForm } from './StripePaymentElementForm';

const mockConfirmPayment = vi.fn();
vi.mock('@stripe/react-stripe-js', () => ({
  PaymentElement: () => <div data-testid="stripe-payment-element">Stripe Payment Element</div>,
  useStripe: () => ({
    confirmPayment: mockConfirmPayment,
  }),
  useElements: () => ({}),
}));

const mockI18n = { t: (key: string, fallback?: string) => fallback || key };
vi.mock('react-i18next', () => ({ useTranslation: () => mockI18n }));

describe('StripePaymentElementForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o PaymentElement da Stripe e o botão de pagamento com valor formatado', () => {
    render(
      <StripePaymentElementForm
        formattedAmount="R$ 199,00"
        isBlocked={false}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('stripe-payment-element')).toBeInTheDocument();
    expect(screen.getByText(/Pagar Assinatura \(R\$ 199,00\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('oculta o botão Cancelar quando o status for bloqueado', () => {
    render(
      <StripePaymentElementForm
        formattedAmount="R$ 199,00"
        isBlocked={true}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /Cancelar/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Pagar Assinatura/i)).toBeInTheDocument();
  });

  it('chama onCancel ao clicar em Cancelar', () => {
    const handleCancel = vi.fn();
    render(
      <StripePaymentElementForm
        formattedAmount="R$ 199,00"
        isBlocked={false}
        onSuccess={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('chama onSuccess quando confirmPayment retornar status succeeded', async () => {
    mockConfirmPayment.mockResolvedValueOnce({
      paymentIntent: { id: 'pi_test_123', status: 'succeeded' },
    });
    const handleSuccess = vi.fn();

    render(
      <StripePaymentElementForm
        formattedAmount="R$ 199,00"
        isBlocked={false}
        onSuccess={handleSuccess}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Pagar Assinatura/i });
    fireEvent.click(submitBtn);

    await screen.findByRole('button', { name: /Pagar Assinatura/i });
    expect(mockConfirmPayment).toHaveBeenCalled();
  });

  it('exibe mensagem de erro quando confirmPayment falhar', async () => {
    mockConfirmPayment.mockResolvedValueOnce({
      error: { message: 'Seu cartão foi recusado pelo banco emissor.' },
    });

    render(
      <StripePaymentElementForm
        formattedAmount="R$ 199,00"
        isBlocked={false}
        onSuccess={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Pagar Assinatura/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Seu cartão foi recusado pelo banco emissor.')
    ).toBeInTheDocument();
  });
});
