import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { CardPaymentModal } from './CardPaymentModal';
import { PixPanel, POLL_INTERVAL_MS } from './PixPanel';
import { paymentService } from '../../services/paymentService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

const charge = { id: 4, status: 'open', sequence: 2, dueDate: '2030-01-10', amountCents: 14900, paymentDateId: 77 };
const methods = (credit = true, pix = false, recurring = false) => vi.spyOn(paymentService, 'getOfferedMethods').mockResolvedValue({ credit, pix, recurring });

const fillCard = async () => {
  await userEvent.type(await screen.findByLabelText(/payments.cardHolder/), 'ana souza');
  await userEvent.type(screen.getByLabelText(/payments.cardNumber/), '4111111111111111');
  await userEvent.type(screen.getByLabelText(/payments.cardExpiry/), '1230');
  await userEvent.type(screen.getByLabelText(/payments.cardCvv/), '123');
};

describe('CardPaymentModal', () => {
  it('não renderiza fechado nem sem cobrança', () => {
    methods();
    renderWithApp(<CardPaymentModal isOpen={false} charge={charge} onClose={vi.fn()} />);
    renderWithApp(<CardPaymentModal isOpen charge={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('formata número, validade e nome enquanto digita, e mostra a bandeira', async () => {
    methods();
    renderWithApp(<CardPaymentModal isOpen charge={charge} onClose={vi.fn()} />);
    await fillCard();
    expect(screen.getByLabelText(/payments.cardNumber/)).toHaveValue('4111 1111 1111 1111');
    expect(screen.getByLabelText(/payments.cardExpiry/)).toHaveValue('12/30');
    expect(screen.getByLabelText(/payments.cardHolder/)).toHaveValue('ANA SOUZA');
    expect(screen.getByText('VISA')).toBeInTheDocument();
  });

  it('valida o cartão antes de chamar a API', async () => {
    methods();
    const prepare = vi.spyOn(paymentService, 'prepare');
    renderWithApp(<CardPaymentModal isOpen charge={charge} onClose={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: /payments.confirmButton/ }));
    expect(await screen.findByText('payments.cardInvalidHolder')).toBeInTheDocument();
    expect(screen.getByText('payments.cardInvalidNumber')).toBeInTheDocument();
    expect(screen.getByText('payments.cardInvalidExpiry')).toBeInTheDocument();
    expect(screen.getByText('payments.cardInvalidCvv')).toBeInTheDocument();
    expect(prepare).not.toHaveBeenCalled();
  });

  it('aprova: autoriza com os dados limpos, mostra o sucesso e avisa depois do atraso', async () => {
    methods();
    const prepare = vi.spyOn(paymentService, 'prepare').mockResolvedValue({ attemptId: 9 });
    const authorize = vi.spyOn(paymentService, 'authorize').mockResolvedValue({ status: 'captured' });
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    renderWithApp(<CardPaymentModal isOpen charge={charge} onClose={onClose} onSuccess={onSuccess} />);
    await fillCard();
    await userEvent.click(screen.getByRole('button', { name: /payments.confirmButton/ }));
    expect(await screen.findByText('payments.approved')).toBeInTheDocument();
    expect(prepare).toHaveBeenCalledWith(expect.objectContaining({ chargeId: 4, method: 'credit', installments: 1 }));
    expect(authorize).toHaveBeenCalledWith({ attemptId: 9, cardholderName: 'ANA SOUZA', cardNumber: '4111111111111111', expirationMonth: 12, expirationYear: 2030, securityCode: '123' });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), { timeout: 2500 });
    expect(onClose).toHaveBeenCalled();
  });

  it('recusa: mostra o aviso e a nova tentativa usa outra chave de idempotência; incerto mantém a chave', async () => {
    methods();
    const prepare = vi.spyOn(paymentService, 'prepare').mockResolvedValue({ attemptId: 9 });
    vi.spyOn(paymentService, 'authorize').mockResolvedValueOnce({ status: 'declined' }).mockResolvedValueOnce({ status: 'declined' }).mockResolvedValueOnce({ status: 'unknown' }).mockResolvedValueOnce({ status: 'unknown' });
    renderWithApp(<CardPaymentModal isOpen charge={charge} onClose={vi.fn()} />);
    await fillCard();
    const submit = screen.getByRole('button', { name: /payments.confirmButton/ });
    await userEvent.click(submit);
    expect(await screen.findByText('payments.declined')).toBeInTheDocument();
    await userEvent.click(submit);
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(2));
    const [first, second] = prepare.mock.calls.map((call) => call[0].idempotencyKey);
    expect(second).not.toBe(first);

    await userEvent.click(submit);
    expect(await screen.findByText('payments.uncertain')).toBeInTheDocument();
    await userEvent.click(submit);
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(4));
    expect(prepare.mock.calls[3][0].idempotencyKey).toBe(prepare.mock.calls[2][0].idempotencyKey);
  });

  it('pede o documento quando o servidor exige', async () => {
    methods();
    vi.spyOn(paymentService, 'prepare').mockRejectedValue({ response: { data: { errorKey: 'PaymentTaxIdRequired' } } });
    renderWithApp(<CardPaymentModal isOpen charge={charge} onClose={vi.fn()} />);
    await fillCard();
    await userEvent.click(screen.getByRole('button', { name: /payments.confirmButton/ }));
    expect(await screen.findByLabelText(/payments.taxId/)).toBeInTheDocument();
  });

  it('só oferece guardar o cartão quando a clínica aceita recorrência e a cobrança vem de assinatura', async () => {
    methods(true, false, true);
    const { unmount } = renderWithApp(<CardPaymentModal isOpen charge={charge} onClose={vi.fn()} />);
    expect(await screen.findByText('payments.recurringLabel')).toBeInTheDocument();
    unmount();
    renderWithApp(<CardPaymentModal isOpen charge={{ ...charge, paymentDateId: null }} onClose={vi.fn()} />);
    await screen.findByLabelText(/payments.cardHolder/);
    expect(screen.queryByText('payments.recurringLabel')).not.toBeInTheDocument();
  });

  it('mostra as abas quando há cartão e Pix, e vai direto ao Pix se só ele é aceito', async () => {
    methods(true, true);
    vi.spyOn(paymentService, 'createPixCharge').mockResolvedValue({ attemptId: 3, payload: 'codigo-pix' });
    vi.spyOn(paymentService, 'cancelAttempt').mockResolvedValue({});
    const { unmount } = renderWithApp(<CardPaymentModal isOpen charge={charge} onClose={vi.fn()} />);
    expect(await screen.findByRole('tab', { name: /payments.methodPix/ })).toBeInTheDocument();
    unmount();
    methods(false, true);
    renderWithApp(<CardPaymentModal isOpen charge={charge} onClose={vi.fn()} />);
    expect(await screen.findByText('codigo-pix')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('avisa quando a clínica não aceita nenhum método', async () => {
    methods(false, false);
    renderWithApp(<CardPaymentModal isOpen charge={charge} onClose={vi.fn()} />);
    expect(await screen.findByText('payments.noMethodsOffered')).toBeInTheDocument();
  });
});

describe('PixPanel', () => {
  const props = { chargeId: 4, idempotencyKey: 'pix-4-k', taxId: '', onTaxIdRequired: vi.fn(), onPaid: vi.fn() };

  it('emite o QR e permite copiar o código', async () => {
    const issue = vi.spyOn(paymentService, 'createPixCharge').mockResolvedValue({ attemptId: 3, payload: 'codigo-pix', encodedImage: 'AAA' });
    vi.spyOn(paymentService, 'cancelAttempt').mockResolvedValue({});
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderWithApp(<PixPanel {...props} />);
    expect(await screen.findByAltText('payments.pixQrAlt')).toBeInTheDocument();
    expect(issue).toHaveBeenCalledWith({ chargeId: 4, idempotencyKey: 'pix-4-k', taxId: '' });
    await userEvent.click(screen.getByRole('button', { name: /payments.pixCopy/ }));
    expect(writeText).toHaveBeenCalledWith('codigo-pix');
    expect(await screen.findByText('payments.pixCopied')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('mostra o erro da API e pede o documento quando necessário', async () => {
    vi.spyOn(paymentService, 'createPixCharge').mockRejectedValueOnce({ response: { data: { message: 'Pix indisponível' } } }).mockRejectedValueOnce({ response: { data: { errorKey: 'PaymentTaxIdRequired' } } });
    const onTaxIdRequired = vi.fn();
    const { unmount } = renderWithApp(<PixPanel {...props} onTaxIdRequired={onTaxIdRequired} />);
    expect(await screen.findByText('Pix indisponível')).toBeInTheDocument();
    unmount();
    renderWithApp(<PixPanel {...props} onTaxIdRequired={onTaxIdRequired} />);
    await waitFor(() => expect(onTaxIdRequired).toHaveBeenCalled());
  });

  it('consulta periodicamente e avisa quando o pagamento é confirmado, sem cancelar a tentativa paga', async () => {
    vi.spyOn(paymentService, 'createPixCharge').mockResolvedValue({ attemptId: 3, payload: 'codigo-pix' });
    const attempt = vi.spyOn(paymentService, 'getAttempt').mockResolvedValueOnce({ status: 'pending' }).mockResolvedValueOnce({ chargePaid: true });
    const cancel = vi.spyOn(paymentService, 'cancelAttempt').mockResolvedValue({});
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onPaid = vi.fn();
    const { unmount } = renderWithApp(<PixPanel {...props} onPaid={onPaid} />);
    await screen.findByText('codigo-pix');
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); });
    expect(onPaid).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); });
    expect(onPaid).toHaveBeenCalled();
    expect(attempt).toHaveBeenCalledWith(3);
    unmount();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('libera a cobrança ao fechar o painel sem pagar', async () => {
    vi.spyOn(paymentService, 'createPixCharge').mockResolvedValue({ attemptId: 3, payload: 'codigo-pix' });
    const cancel = vi.spyOn(paymentService, 'cancelAttempt').mockResolvedValue({});
    const { unmount } = renderWithApp(<PixPanel {...props} />);
    await screen.findByText('codigo-pix');
    unmount();
    await waitFor(() => expect(cancel).toHaveBeenCalledWith(3));
  });

  it('mostra a contagem regressiva e o aviso de expirado', async () => {
    const expiresAt = new Date(Date.now() + 125_000).toISOString();
    vi.spyOn(paymentService, 'createPixCharge').mockResolvedValue({ attemptId: 3, payload: 'p', expiresAt });
    vi.spyOn(paymentService, 'cancelAttempt').mockResolvedValue({});
    const { unmount } = renderWithApp(<PixPanel {...props} />);
    expect(await screen.findByText(/0[12]:\d\d/)).toBeInTheDocument();
    unmount();
    vi.spyOn(paymentService, 'createPixCharge').mockResolvedValue({ attemptId: 4, payload: 'p', expiresAt: new Date(Date.now() - 1000).toISOString() });
    renderWithApp(<PixPanel {...props} />);
    expect(await screen.findByText('payments.pixExpired')).toBeInTheDocument();
  });
});
