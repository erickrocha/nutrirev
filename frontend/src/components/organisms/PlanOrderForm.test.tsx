import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanOrderForm } from './PlanOrderForm';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

const provinces = [{ acronym: 'SP', name: 'São Paulo' }, { acronym: 'RJ', name: 'Rio de Janeiro' }];

const fill = async (labels: Record<string, string>) => {
  for (const [label, value] of Object.entries(labels)) {
    await userEvent.type(screen.getByLabelText(label), value);
  }
};

describe('PlanOrderForm', () => {
  it('não envia e mostra erros quando vazio', async () => {
    const onSubmit = vi.fn();
    render(<PlanOrderForm provinces={provinces} submitting={false} error="" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'order.submit' }));
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('aplica máscaras e envia os dados válidos', async () => {
    const onSubmit = vi.fn();
    render(<PlanOrderForm provinces={provinces} submitting={false} error="" onSubmit={onSubmit} />);
    await fill({
      'order.taxId': '12345678901', 'order.fullName': 'Maria Silva', 'order.email': 'maria@x.com',
      'order.phone': '11999990000', 'order.postalCode': '01310100', 'order.street': 'Av. Paulista',
      'order.number': '1000', 'order.city': 'São Paulo',
    });
    expect(screen.getByLabelText('order.taxId')).toHaveValue('123.456.789-01');
    await userEvent.click(screen.getByText('order.selectState'));
    await userEvent.click(screen.getByText('SP - São Paulo'));
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'order.submit' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Maria Silva', state: 'SP', accepted: true });
  });

  it('troca o rótulo do nome para razão social com CNPJ', async () => {
    render(<PlanOrderForm provinces={provinces} submitting={false} error="" onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('order.taxId'), '12345678000195');
    expect(screen.getByLabelText('order.companyName')).toBeInTheDocument();
  });

  it('desabilita o envio enquanto envia', () => {
    render(<PlanOrderForm provinces={provinces} submitting error="falhou" onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'order.sending' })).toBeDisabled();
    expect(screen.getByText('falhou')).toBeInTheDocument();
  });
});
