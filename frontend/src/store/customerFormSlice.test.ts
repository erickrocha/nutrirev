import { configureStore } from '@reduxjs/toolkit';
import reducer, { loadCustomerForm, saveCustomerForm } from './customerFormSlice';
import { customerService } from '../services/customerService';
import * as clinical from '../services/clinicalService';

vi.mock('../services/customerService', () => ({ customerService: { getById: vi.fn(), create: vi.fn(), update: vi.fn() } }));

vi.mock('../services/clinicalService', async (importOriginal) => {
  const catalog = () => ({ getAll: vi.fn().mockResolvedValue([{ id: 1, name: 'A' }]) });
  const join = () => ({ getByCustomerId: vi.fn().mockResolvedValue([]), create: vi.fn(), delete: vi.fn() });
  return {
    ...(await importOriginal<object>()),
    clinicalPlanService: catalog(), prepareMealService: catalog(), dietaryRestrictionService: catalog(),
    bowelFunctionService: catalog(), preExistingConditionsService: catalog(), dailyMealService: catalog(),
    provinceService: { getAll: vi.fn() }, cityService: { getByProvinceId: vi.fn() },
    customerDietaryRestrictionService: join(), customerBowelFunctionService: join(),
    customerPreExistingConditionsService: join(), customerDailyMealService: join(),
  };
});

const makeStore = () => configureStore({ reducer: { customerForm: reducer } });
const associations = { restrictionIds: [7], bowelFunctionIds: [], conditionIds: [], dailyMealIds: [] };
const payload = { name: 'Maria' } as never;

describe('customerFormSlice', () => {
  it('carrega os catálogos e, na edição, o cliente com as associações', async () => {
    vi.mocked(customerService.getById).mockResolvedValue({ id: 5, name: 'Maria' } as never);
    vi.mocked(clinical.customerDietaryRestrictionService.getByCustomerId).mockResolvedValue([{ dietary_restriction_id: 3 }] as never);
    const store = makeStore();
    await store.dispatch(loadCustomerForm(5));
    const state = store.getState().customerForm;
    expect(state.loading).toBe(false);
    expect(state.catalogs.clinicalPlans).toHaveLength(1);
    expect(state.customer?.name).toBe('Maria');
    expect(state.associations.restrictionIds).toEqual([3]);
  });

  it('guarda a mensagem da API quando o carregamento falha', async () => {
    vi.mocked(clinical.clinicalPlanService.getAll).mockRejectedValueOnce({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    await store.dispatch(loadCustomerForm(undefined));
    expect(store.getState().customerForm.error).toBe('boom');
  });

  it('cria o cliente e sincroniza as associações: adiciona as novas e remove as antigas', async () => {
    vi.mocked(customerService.create).mockResolvedValue({ id: 9 } as never);
    vi.mocked(clinical.customerDietaryRestrictionService.getByCustomerId).mockResolvedValue([{ dietaryRestrictionId: 4 }] as never);
    const store = makeStore();
    const result = await store.dispatch(saveCustomerForm({ payload, associations }));
    expect(saveCustomerForm.fulfilled.match(result)).toBe(true);
    expect(clinical.customerDietaryRestrictionService.create).toHaveBeenCalledWith({ customerId: 9, dietaryRestrictionId: 7 });
    expect(clinical.customerDietaryRestrictionService.delete).toHaveBeenCalledWith(9, 4);
  });

  it('atualiza quando há id e registra a falha ao salvar', async () => {
    vi.mocked(customerService.update).mockRejectedValue({ response: { data: { message: 'e-mail duplicado' } } });
    const store = makeStore();
    const result = await store.dispatch(saveCustomerForm({ id: 5, payload, associations }));
    expect(saveCustomerForm.rejected.match(result)).toBe(true);
    expect(store.getState().customerForm.error).toBe('e-mail duplicado');
    expect(store.getState().customerForm.saving).toBe(false);
  });
});
