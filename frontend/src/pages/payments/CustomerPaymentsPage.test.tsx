import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { CustomerPaymentsPage } from './CustomerPaymentsPage';
import { paymentService } from '../../services/paymentService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const charges = [
  { id: 1, status: 'paid', sequence: 1, dueDate: day(-40), paidAt: day(-38), amountCents: 14900 },
  { id: 2, status: 'overdue', sequence: 2, dueDate: day(-3), amountCents: 14900 },
  { id: 3, status: 'open', sequence: 3, dueDate: day(10), amountCents: 14900 },
];

describe('CustomerPaymentsPage', () => {
  it('destaca a cobrança em aberto mais antiga e conta os dias de atraso', async () => {
    vi.spyOn(paymentService, 'getMyCharges').mockResolvedValue(charges);
    renderWithApp(<CustomerPaymentsPage />);
    expect(await screen.findByText('payments.nextDue')).toBeInTheDocument();
    expect(screen.getAllByText(/payments.overdueByDays/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R\$\s?149,00/).length).toBeGreaterThan(2);
    expect(screen.getByText('payments.statusPaid')).toBeInTheDocument();
  });

  it('só as cobranças em aberto têm botão de pagar', async () => {
    vi.spyOn(paymentService, 'getMyCharges').mockResolvedValue(charges);
    renderWithApp(<CustomerPaymentsPage />);
    await screen.findByText('payments.nextDue');
    expect(screen.getAllByRole('button', { name: /payments.payCharge/ })).toHaveLength(2);
  });

  it('abre o pagamento da cobrança escolhida', async () => {
    vi.spyOn(paymentService, 'getMyCharges').mockResolvedValue(charges);
    vi.spyOn(paymentService, 'getOfferedMethods').mockResolvedValue({ credit: true, pix: false, recurring: false });
    renderWithApp(<CustomerPaymentsPage />);
    await userEvent.click((await screen.findAllByRole('button', { name: /payments.payCharge/ }))[1]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/payments.cycle/, { selector: 'strong' })).toBeInTheDocument();
  });

  it('depois do pagamento aprovado mostra o aviso e recarrega as cobranças', async () => {
    const list = vi.spyOn(paymentService, 'getMyCharges').mockResolvedValue(charges);
    vi.spyOn(paymentService, 'getOfferedMethods').mockResolvedValue({ credit: true, pix: false, recurring: false });
    vi.spyOn(paymentService, 'prepare').mockResolvedValue({ attemptId: 5 });
    vi.spyOn(paymentService, 'authorize').mockResolvedValue({ status: 'captured' });
    renderWithApp(<CustomerPaymentsPage />);
    await userEvent.click((await screen.findAllByRole('button', { name: /payments.payCharge/ }))[0]);
    await userEvent.type(await screen.findByLabelText(/payments.cardHolder/), 'ana');
    await userEvent.type(screen.getByLabelText(/payments.cardNumber/), '4111111111111111');
    await userEvent.type(screen.getByLabelText(/payments.cardExpiry/), '1299');
    await userEvent.type(screen.getByLabelText(/payments.cardCvv/), '123');
    await userEvent.click(screen.getByRole('button', { name: /payments.confirmButton/ }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2), { timeout: 3000 });
    expect(await screen.findAllByText('payments.approved')).not.toHaveLength(0);
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    vi.spyOn(paymentService, 'getMyCharges').mockResolvedValueOnce([]);
    const { unmount } = renderWithApp(<CustomerPaymentsPage />);
    expect(await screen.findByText('payments.emptyMessage')).toBeInTheDocument();
    unmount();
    vi.spyOn(paymentService, 'getMyCharges').mockRejectedValueOnce({});
    renderWithApp(<CustomerPaymentsPage />);
    expect(await screen.findByText('payments.errorLoading')).toBeInTheDocument();
  });
});
