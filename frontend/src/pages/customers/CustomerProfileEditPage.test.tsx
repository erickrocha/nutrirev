import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { CustomerProfileEditPage } from './CustomerProfileEditPage';
import customerFormReducer from '../../store/customerFormSlice';
import addressReducer from '../../store/addressSlice';
import * as clinical from '../../services/clinicalService';
import { customerService } from '../../services/customerService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

const me = { id: 7, name: 'Ana', email: 'ana@x.com', phone: '11987654321', dateOfBirth: '1990-05-10', gender: 'Feminino', countryCode: 'BR', postalCode: '01310100', clinicalPlanId: 3 };

const renderAs = (role: string) => {
  const store = configureStore({
    reducer: { customerForm: customerFormReducer, address: addressReducer, auth: () => ({ user: { role, email: 'ana@x.com' } }) },
  });
  return render(<Provider store={store}><MemoryRouter><CustomerProfileEditPage /></MemoryRouter></Provider>);
};

beforeEach(() => {
  for (const service of [clinical.clinicalPlanService, clinical.prepareMealService, clinical.dietaryRestrictionService, clinical.bowelFunctionService, clinical.preExistingConditionsService, clinical.dailyMealService]) {
    vi.spyOn(service, 'getAll').mockResolvedValue([{ id: 3, name: 'Trimestral' }]);
  }
  for (const service of [clinical.customerDietaryRestrictionService, clinical.customerBowelFunctionService, clinical.customerPreExistingConditionsService, clinical.customerDailyMealService]) {
    vi.spyOn(service, 'getByCustomerId').mockResolvedValue([]);
  }
  vi.spyOn(clinical.provinceService, 'getAll').mockResolvedValue([]);
  vi.spyOn(clinical.cityService, 'getByProvinceId').mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());

describe('CustomerProfileEditPage', () => {
  it('carrega o perfil com telefone e CEP mascarados e e-mail bloqueado', async () => {
    vi.spyOn(customerService, 'getMe').mockResolvedValue(me);
    renderAs('User');
    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();
    expect(screen.getByLabelText('customerProfile.phone')).toHaveValue('(11) 98765-4321');
    expect(screen.getByLabelText('address.postalCode')).toHaveValue('01310-100');
    expect(screen.getByLabelText('customerProfile.corporateEmail')).toBeDisabled();
  });

  it('salva só dígitos, mantém o e-mail e mostra o aviso de sucesso', async () => {
    vi.spyOn(customerService, 'getMe').mockResolvedValue(me);
    const update = vi.spyOn(customerService, 'update').mockResolvedValue({ ...me });
    renderAs('User');
    await userEvent.clear(await screen.findByLabelText('customerProfile.fullName'));
    await userEvent.type(screen.getByLabelText('customerProfile.fullName'), 'Ana Maria');
    await userEvent.click(screen.getByRole('button', { name: 'customerProfile.saveProfile' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Ana Maria', email: 'ana@x.com', phone: '11987654321', postalCode: '01310100', clinicalPlanId: 3 })));
    expect(await screen.findByText('customerProfile.saveSuccess')).toBeInTheDocument();
  });

  it('exige o nome', async () => {
    vi.spyOn(customerService, 'getMe').mockResolvedValue(me);
    const update = vi.spyOn(customerService, 'update');
    renderAs('User');
    await userEvent.clear(await screen.findByLabelText('customerProfile.fullName'));
    await userEvent.click(screen.getByRole('button', { name: 'customerProfile.saveProfile' }));
    expect(await screen.findByText('customerProfile.nameRequired')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('recusa foto que não é imagem e envia a imagem válida', async () => {
    vi.spyOn(customerService, 'getMe').mockResolvedValue(me);
    const upload = vi.spyOn(customerService, 'uploadPhoto').mockResolvedValue({ signedUrl: 'https://cdn/x.jpg' });
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:preview' });
    renderAs('User');
    const input = await screen.findByLabelText('customerProfile.changePhoto', { selector: 'input' });
    await userEvent.upload(input, new File(['x'], 'a.txt', { type: 'text/plain' }), { applyAccept: false });
    expect(await screen.findByText('customerProfile.invalidImage')).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
    await userEvent.upload(input, new File(['abc'], 'foto.png', { type: 'image/png' }));
    await waitFor(() => expect(upload).toHaveBeenCalledWith(7, expect.any(String), 'png', 'image/png'));
    expect(await screen.findByText('customerProfile.photoSuccess')).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('mostra erro de carregamento com nova tentativa', async () => {
    vi.spyOn(customerService, 'getMe').mockRejectedValue({});
    renderAs('User');
    expect(await screen.findByText('customerProfile.errorLoading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /common.retry/ })).toBeInTheDocument();
  });

  it('redireciona quem não é cliente', async () => {
    const getMe = vi.spyOn(customerService, 'getMe');
    renderAs('TenantOwner');
    await waitFor(() => expect(screen.queryByText('customerProfile.title')).not.toBeInTheDocument());
    expect(getMe).not.toHaveBeenCalled();
  });
});
