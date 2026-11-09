import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { PaymentDateListPage } from './PaymentDateListPage';
import { PaymentDateFormPage } from './PaymentDateFormPage';
import { clinicalPlanService, paymentChargeService, paymentDateService } from '../../services/clinicalService';
import { customerService } from '../../services/customerService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const item = { id: 1, customerId: 2, clinicalPlanId: 3, firstDueDate: '2026-03-09', nextDueDate: '2026-04-09', status: 'active', isActive: true };
const mockData = (items: unknown[] = [item]) => {
  vi.spyOn(paymentDateService, 'getAll').mockResolvedValue(items);
  vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([{ id: 3, name: 'Trimestral' }, { id: 4, name: 'Mensal' }]);
  vi.spyOn(customerService, 'getAll').mockResolvedValue([{ id: 2, name: 'Ana', clinicalPlanId: 4 }, { id: 9, name: 'Beto', clinicalPlanId: 3 }]);
  vi.spyOn(paymentChargeService, 'getReversals').mockResolvedValue([]);
};

describe('PaymentDateListPage', () => {
  it('lista com nomes, datas formatadas e link de edição', async () => {
    mockData();
    renderWithApp(<PaymentDateListPage />);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Trimestral')).toBeInTheDocument();
    expect(screen.getByText('09/03/2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /common.edit/ })).toHaveAttribute('href', '/payment-dates/1/edit');
  });

  it('abre as cobranças do cliente sob demanda', async () => {
    mockData();
    const charges = vi.spyOn(paymentChargeService, 'getByCustomer').mockResolvedValue([{ id: 5, status: 'paid', dueDate: '2026-03-09', amountCents: 10000 }]);
    renderWithApp(<PaymentDateListPage />);
    await userEvent.click(await screen.findByRole('button', { name: /paymentDates.charges/ }));
    expect(await screen.findByText('paymentDates.chargePaid')).toBeInTheDocument();
    expect(charges).toHaveBeenCalledWith(2);
  });

  it('avisa sobre pagamentos revertidos e mostra estado vazio', async () => {
    mockData([]);
    vi.spyOn(paymentChargeService, 'getReversals').mockResolvedValue([{ attemptId: 1, customerName: 'Ana', amountCents: 5000, reversedAt: '2026-03-01T10:00:00' }]);
    renderWithApp(<PaymentDateListPage />);
    expect(await screen.findByText('paymentDates.reversalsTitle')).toBeInTheDocument();
    expect(screen.getByText('paymentDates.emptyStateTitle')).toBeInTheDocument();
  });

  it('mostra o erro de carregamento', async () => {
    mockData();
    vi.spyOn(paymentDateService, 'getAll').mockRejectedValue({ response: { data: { message: 'boom' } } });
    renderWithApp(<PaymentDateListPage />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});

describe('PaymentDateFormPage', () => {
  it('sugere o plano do cliente escolhido e cadastra', async () => {
    mockData([]);
    const create = vi.spyOn(paymentDateService, 'create').mockResolvedValue({});
    renderWithApp(<PaymentDateFormPage />, { route: '/payment-dates/new', path: '/payment-dates/new' });
    await screen.findByRole('option', { name: 'Beto' });
    await userEvent.selectOptions(screen.getByLabelText('paymentDates.client'), '9');
    await waitFor(() => expect(screen.getByLabelText('paymentDates.clinicalPlan')).toHaveValue('3'));
    await userEvent.click(screen.getByRole('button', { name: /common.register/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ customerId: 9, clinicalPlanId: 3 })));
  });

  it('exige a data de vencimento', async () => {
    mockData([]);
    const create = vi.spyOn(paymentDateService, 'create');
    renderWithApp(<PaymentDateFormPage />, { route: '/payment-dates/new', path: '/payment-dates/new' });
    await screen.findByRole('option', { name: 'Beto' });
    await userEvent.clear(screen.getByLabelText('paymentDates.firstDueDateLabel'));
    await userEvent.click(screen.getByRole('button', { name: /common.register/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('paymentDates.firstDueDateRequired');
    expect(create).not.toHaveBeenCalled();
  });

  it('carrega a data na edição e atualiza', async () => {
    mockData();
    const update = vi.spyOn(paymentDateService, 'update').mockResolvedValue({});
    renderWithApp(<PaymentDateFormPage />, { route: '/payment-dates/1/edit', path: '/payment-dates/:id/edit' });
    expect(await screen.findByDisplayValue('2026-03-09')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.saveChanges/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(1, { customerId: 2, clinicalPlanId: 3, firstDueDate: '2026-03-09' }));
  });
});
