import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { CustomerListPage } from './CustomerListPage';
import { clinicalPlanService, prepareMealService } from '../../services/clinicalService';
import { customerService } from '../../services/customerService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const ana = { id: 1, name: 'Ana Souza', email: 'ana@x.com', phone: '11987654321', gender: 'Feminino', clinicalPlanId: 3, prepareMealId: 4, mobileEnabled: true };
const beto = { id: 2, name: 'Beto Lima', email: 'beto@x.com', phone: '', gender: 'Masculino' };

const mockData = (customers: unknown[] = [ana, beto]) => {
  vi.spyOn(customerService, 'getAll').mockResolvedValue(customers);
  vi.spyOn(clinicalPlanService, 'getAll').mockResolvedValue([{ id: 3, name: 'Trimestral' }]);
  vi.spyOn(prepareMealService, 'getAll').mockResolvedValue([{ id: 4, name: 'Marmita' }]);
};

describe('CustomerListPage', () => {
  it('mostra os clientes em cartões com plano, refeição e totais', async () => {
    mockData();
    renderWithApp(<CustomerListPage />);
    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Trimestral')).toBeInTheDocument();
    expect(screen.getByText(/Marmita/)).toBeInTheDocument();
    expect(screen.getByText('common.noPlan')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /common.edit/ })[0]).toHaveAttribute('href', '/customers/1/edit');
    expect(screen.getByText('customers.totalCustomers').previousSibling).toHaveTextContent('2');
  });

  it('filtra pela busca e alterna para a tabela', async () => {
    mockData();
    renderWithApp(<CustomerListPage />);
    await screen.findByText('Ana Souza');
    await userEvent.type(screen.getByRole('searchbox'), 'beto');
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.table/ }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Beto Lima')).toBeInTheDocument();
  });

  it('libera o acesso mobile depois de confirmar e mostra o aviso', async () => {
    mockData();
    const enable = vi.spyOn(customerService, 'enableMobile').mockResolvedValue({});
    renderWithApp(<CustomerListPage />);
    await userEvent.click(await screen.findByRole('button', { name: /customers.activateMobile/ }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('beto@x.com')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'customers.confirmEnable' }));
    expect(await screen.findByText(/customers.mobileEnabledSuccess "Beto Lima"/)).toBeInTheDocument();
    expect(enable).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('mostra estado vazio com link de cadastro e erro de carregamento', async () => {
    mockData([]);
    const { unmount } = renderWithApp(<CustomerListPage />);
    expect(await screen.findByText('customers.noCustomerRegistered')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /customers.registerFirstCustomer/ })).toHaveAttribute('href', '/customers/new');
    unmount();
    mockData();
    vi.spyOn(customerService, 'getAll').mockRejectedValueOnce({});
    renderWithApp(<CustomerListPage />);
    expect(await screen.findByText('customers.errorLoadingList')).toBeInTheDocument();
  });
});
