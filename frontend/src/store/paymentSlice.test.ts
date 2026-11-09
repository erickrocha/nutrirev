import { configureStore } from '@reduxjs/toolkit';
import reducer, { cancelPixAttempt, createPixCharge, fetchMyCharges, fetchOfferedMethods, payWithCard, pollPixAttempt } from './paymentSlice';
import { paymentService } from '../services/paymentService';

const makeStore = () => configureStore({ reducer: { payment: reducer } });
const card = { cardholderName: 'ANA', cardNumber: '4111111111111111', expirationMonth: 7, expirationYear: 2030, securityCode: '123' };
const args = { chargeId: 4, idempotencyKey: 'charge-4-k', card, recurringSubscriptionId: null, taxId: '' };
afterEach(() => vi.restoreAllMocks());

const mockAuthorized = (status: string) => {
  vi.spyOn(paymentService, 'prepare').mockResolvedValue({ attemptId: 9 });
  return vi.spyOn(paymentService, 'authorize').mockResolvedValue({ status });
};

describe('paymentSlice', () => {
  it('guarda as cobranças; resposta inválida vira lista vazia; falha marca o erro', async () => {
    vi.spyOn(paymentService, 'getMyCharges').mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('x'));
    const store = makeStore();
    await store.dispatch(fetchMyCharges());
    expect(store.getState().payment.charges).toEqual([{ id: 1 }]);
    await store.dispatch(fetchMyCharges());
    expect(store.getState().payment.charges).toEqual([]);
    await store.dispatch(fetchMyCharges());
    expect(store.getState().payment.error).toBe('load');
  });

  it('os métodos aceitos começam só com cartão e mudam quando a clínica responde', async () => {
    vi.spyOn(paymentService, 'getOfferedMethods').mockResolvedValueOnce({ credit: false, pix: true, recurring: false }).mockRejectedValueOnce(new Error('x'));
    const store = makeStore();
    expect(store.getState().payment.offered).toEqual({ credit: true, pix: false, recurring: false });
    await store.dispatch(fetchOfferedMethods());
    expect(store.getState().payment.offered).toEqual({ credit: false, pix: true, recurring: false });
    await store.dispatch(fetchOfferedMethods());
    expect(store.getState().payment.offered.pix).toBe(true);
  });

  it('cartão aprovado: reserva com a chave e autoriza com os dados do cartão', async () => {
    const authorize = mockAuthorized('captured');
    const prepare = vi.spyOn(paymentService, 'prepare');
    const store = makeStore();
    const result = await store.dispatch(payWithCard(args));
    expect(result.payload).toEqual({ kind: 'approved', recurrenceFailed: false, taxIdRequired: false });
    expect(prepare).toHaveBeenCalledWith({ chargeId: 4, idempotencyKey: 'charge-4-k', method: 'credit', installments: 1 });
    expect(authorize).toHaveBeenCalledWith({ attemptId: 9, ...card });
    expect(store.getState().payment.submitting).toBe(false);
  });

  it('aceita attempt_id em snake_case na reserva', async () => {
    vi.spyOn(paymentService, 'prepare').mockResolvedValue({ attempt_id: 12 });
    const authorize = vi.spyOn(paymentService, 'authorize').mockResolvedValue({ status: 'authorized' });
    await makeStore().dispatch(payWithCard(args));
    expect(authorize).toHaveBeenCalledWith(expect.objectContaining({ attemptId: 12 }));
  });

  it('status desconhecido é incerto; qualquer outro é recusa', async () => {
    const store = makeStore();
    mockAuthorized('unknown');
    expect((await store.dispatch(payWithCard(args))).payload).toEqual({ kind: 'uncertain' });
    vi.restoreAllMocks();
    mockAuthorized('declined');
    expect((await store.dispatch(payWithCard(args))).payload).toEqual({ kind: 'declined' });
  });

  it('aprovado com recorrência: a falha ao guardar o cartão não derruba o pagamento', async () => {
    mockAuthorized('authorized');
    const recurring = vi.spyOn(paymentService, 'enableRecurring').mockRejectedValue({ response: { data: { errorKey: 'PaymentTaxIdRequired' } } });
    const result = await makeStore().dispatch(payWithCard({ ...args, recurringSubscriptionId: 77, taxId: '123' }));
    expect(result.payload).toEqual({ kind: 'approved', recurrenceFailed: true, taxIdRequired: true });
    expect(recurring).toHaveBeenCalledWith({ subscriptionId: 77, ...card, taxId: '123' });
  });

  it('exige o documento quando o servidor pede; outros erros trazem a mensagem', async () => {
    vi.spyOn(paymentService, 'prepare').mockRejectedValueOnce({ response: { data: { errorKey: 'PaymentTaxIdRequired' } } }).mockRejectedValueOnce({ response: { data: { error: 'cartão bloqueado' } } });
    const store = makeStore();
    expect((await store.dispatch(payWithCard(args))).payload).toEqual({ kind: 'taxIdRequired' });
    expect((await store.dispatch(payWithCard(args))).payload).toEqual({ kind: 'error', message: 'cartão bloqueado' });
  });

  it('Pix: emite o QR, pede o documento quando necessário e devolve a mensagem em outros erros', async () => {
    const issue = vi.spyOn(paymentService, 'createPixCharge')
      .mockResolvedValueOnce({ attemptId: 3, payload: 'abc' })
      .mockRejectedValueOnce({ response: { data: { errorKey: 'PaymentTaxIdRequired' } } })
      .mockRejectedValueOnce({ response: { data: { message: 'indisponível' } } });
    const store = makeStore();
    const input = { chargeId: 4, idempotencyKey: 'pix-4-k', taxId: '' };
    expect((await store.dispatch(createPixCharge(input))).payload).toEqual({ pix: { attemptId: 3, payload: 'abc' }, taxIdRequired: false, error: null });
    expect((await store.dispatch(createPixCharge(input))).payload).toMatchObject({ pix: null, taxIdRequired: true });
    expect((await store.dispatch(createPixCharge(input))).payload).toMatchObject({ taxIdRequired: false, error: 'indisponível' });
    expect(issue).toHaveBeenCalledWith(input);
  });

  it('consulta e cancelamento do Pix nunca lançam erro', async () => {
    vi.spyOn(paymentService, 'getAttempt').mockResolvedValueOnce({ chargePaid: true }).mockRejectedValueOnce(new Error('x'));
    vi.spyOn(paymentService, 'cancelAttempt').mockRejectedValue(new Error('x'));
    const store = makeStore();
    expect((await store.dispatch(pollPixAttempt(3))).payload).toEqual({ chargePaid: true });
    expect((await store.dispatch(pollPixAttempt(3))).payload).toBeNull();
    const cancelled = await store.dispatch(cancelPixAttempt(3));
    expect(cancelled.type).toMatch(/fulfilled$/);
  });
});
