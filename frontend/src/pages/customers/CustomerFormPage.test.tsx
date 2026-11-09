import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { CustomerFormPage } from './CustomerFormPage';
import { customerService } from '../../services/customerService';
import * as clinical from '../../services/clinicalService';
import { PATHS } from '../../router/routeConfig';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
vi.mock('../../services/customerService', () => ({ customerService: { getById: vi.fn(), create: vi.fn(), update: vi.fn() } }));
vi.mock('../../services/clinicalService', async (importOriginal) => {
  const catalog = () => ({ getAll: vi.fn().mockResolvedValue([]) });
  const join = () => ({ getByCustomerId: vi.fn().mockResolvedValue([]), create: vi.fn(), delete: vi.fn() });
  return {
    ...(await importOriginal<object>()),
    clinicalPlanService: catalog(), prepareMealService: catalog(), dietaryRestrictionService: catalog(),
    bowelFunctionService: catalog(), preExistingConditionsService: catalog(), dailyMealService: catalog(),
    provinceService: { getAll: vi.fn().mockResolvedValue([]) }, cityService: { getByProvinceId: vi.fn().mockResolvedValue([]) },
    customerDietaryRestrictionService: join(), customerBowelFunctionService: join(),
    customerPreExistingConditionsService: join(), customerDailyMealService: join(),
  };
});

const renderNew = () => renderWithApp(<CustomerFormPage />, { route: PATHS.CUSTOMER_NEW, path: PATHS.CUSTOMER_NEW });

describe('CustomerFormPage', () => {
  it('mostra o carregamento e depois o formulário com breadcrumb', async () => {
    renderNew();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByLabelText('customerForm.fullName')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'customerForm.customerManagement' })).toHaveAttribute('href', PATHS.CUSTOMERS);
  });

  it('mostra o erro de carregamento e permite tentar de novo', async () => {
    vi.mocked(clinical.clinicalPlanService.getAll).mockRejectedValueOnce({ response: { data: { message: 'boom' } } });
    renderNew();
    expect(await screen.findByText('boom')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.retry/ }));
    expect(await screen.findByLabelText('customerForm.fullName')).toBeInTheDocument();
  });

  it('não envia sem os campos obrigatórios', async () => {
    renderNew();
    await userEvent.click(await screen.findByRole('button', { name: /customerForm.registerCustomer/ }));
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
    expect(customerService.create).not.toHaveBeenCalled();
  });

  it('exibe telefone e CEP mascarados e envia só os dígitos', async () => {
    vi.mocked(customerService.create).mockResolvedValue({ id: 1 } as never);
    renderNew();
    await userEvent.type(await screen.findByLabelText('customerForm.fullName'), 'Maria');
    await userEvent.type(screen.getByLabelText('customerForm.emailLabel'), 'maria@x.com');
    await userEvent.type(screen.getByLabelText('customerForm.phoneLabel'), '11987654321');
    fireEvent.change(screen.getByLabelText('customerForm.dateOfBirth'), { target: { value: '1990-05-10' } });
    await userEvent.type(screen.getByLabelText('address.postalCode'), '01310100');

    expect(screen.getByLabelText('customerForm.phoneLabel')).toHaveValue('(11) 98765-4321');
    expect(screen.getByLabelText('address.postalCode')).toHaveValue('01310-100');

    await userEvent.click(screen.getByRole('button', { name: /customerForm.registerCustomer/ }));
    await waitFor(() => expect(customerService.create).toHaveBeenCalled());
    expect(vi.mocked(customerService.create).mock.calls[0][0]).toMatchObject({
      name: 'Maria', phone: '11987654321', postalCode: '01310100', countryCode: 'BR',
    });
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });
});
