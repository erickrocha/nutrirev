import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantSubscriptionPaymentHistoryTable } from './TenantSubscriptionPaymentHistoryTable';
import type { TenantSubscriptionPaymentItem } from '../../types/tenantSubscription';

const mockI18n = {
  t: (key: string, fallback?: string) => fallback || key,
  i18n: { language: 'pt' },
};
vi.mock('react-i18next', () => ({ useTranslation: () => mockI18n }));

const mockPayments: TenantSubscriptionPaymentItem[] = [
  {
    id: 1,
    uuid: 'uuid-1',
    tenantId: 10,
    tenantName: 'Clínica Vida',
    businessPlanId: 1,
    planName: 'Plano Pro',
    amountCents: 19900,
    formattedAmount: 'R$ 199,00',
    currency: 'BRL',
    paymentMethod: 'card',
    paymentIntentId: 'pi_test_123',
    status: 'paid',
    paidAt: '2026-11-19T10:00:00Z',
    createdAt: '2026-11-19T10:00:00Z',
  },
  {
    id: 2,
    uuid: 'uuid-2',
    tenantId: 11,
    tenantName: 'Clínica Saúde',
    businessPlanId: 2,
    planName: 'Plano Premium',
    amountCents: 39900,
    formattedAmount: 'R$ 399,00',
    currency: 'BRL',
    paymentMethod: 'pix',
    paymentIntentId: 'pi_pix_456',
    status: 'paid',
    paidAt: '2026-11-18T14:30:00Z',
    createdAt: '2026-11-18T14:30:00Z',
  },
];

describe('TenantSubscriptionPaymentHistoryTable', () => {
  it('renderiza o estado de carregamento', () => {
    render(
      <TenantSubscriptionPaymentHistoryTable
        payments={[]}
        loading={true}
        onFilter={vi.fn()}
      />
    );
    expect(screen.getByText('Carregando pagamentos...')).toBeInTheDocument();
  });

  it('renderiza estado vazio quando não há pagamentos', () => {
    render(
      <TenantSubscriptionPaymentHistoryTable
        payments={[]}
        loading={false}
        onFilter={vi.fn()}
      />
    );
    expect(screen.getByText('Nenhum pagamento registrado')).toBeInTheDocument();
  });

  it('lista os pagamentos com valores, formas e status', () => {
    render(
      <TenantSubscriptionPaymentHistoryTable
        payments={mockPayments}
        loading={false}
        onFilter={vi.fn()}
        showTenantColumn={true}
      />
    );

    expect(screen.getByText('Clínica Vida')).toBeInTheDocument();
    expect(screen.getByText('Plano Pro')).toBeInTheDocument();
    expect(screen.getByText('R$ 199,00')).toBeInTheDocument();
    expect(screen.getByText('Cartão')).toBeInTheDocument();

    expect(screen.getByText('Clínica Saúde')).toBeInTheDocument();
    expect(screen.getByText('Plano Premium')).toBeInTheDocument();
    expect(screen.getByText('R$ 399,00')).toBeInTheDocument();
    expect(screen.getAllByText('PIX').length).toBeGreaterThanOrEqual(1);
  });

  it('permite aplicar filtros de forma de pagamento e período', async () => {
    const handleFilter = vi.fn();
    const user = userEvent.setup();

    render(
      <TenantSubscriptionPaymentHistoryTable
        payments={mockPayments}
        loading={false}
        onFilter={handleFilter}
      />
    );

    // Select Card method
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'card');

    // Click filter button
    const filterBtn = screen.getByRole('button', { name: /Filtrar/i });
    await user.click(filterBtn);

    expect(handleFilter).toHaveBeenCalledWith({
      paymentMethod: 'card',
      startDate: undefined,
      endDate: undefined,
    });
  });

  it('permite limpar filtros ativos', async () => {
    const handleFilter = vi.fn();
    const user = userEvent.setup();

    render(
      <TenantSubscriptionPaymentHistoryTable
        payments={mockPayments}
        loading={false}
        onFilter={handleFilter}
      />
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'pix');

    const clearBtn = await screen.findByRole('button', { name: /Limpar/i });
    await user.click(clearBtn);

    expect(handleFilter).toHaveBeenCalledWith({});
  });
});
