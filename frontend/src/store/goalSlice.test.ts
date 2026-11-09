import { configureStore } from '@reduxjs/toolkit';
import reducer, { loadGoals, saveGoal } from './goalSlice';
import { activityFactorService, customerGoalSettingService, formulaService, objectiveService, physicalActivityLevelService } from '../services/clinicalService';
import { customerService } from '../services/customerService';

const makeStore = () => configureStore({ reducer: { goal: reducer } });
afterEach(() => vi.restoreAllMocks());

const mockAll = () => {
  vi.spyOn(customerGoalSettingService, 'getAll').mockResolvedValue([{ id: 1, name: 'Meta' }]);
  vi.spyOn(customerService, 'getAll').mockResolvedValue([{ id: 2, name: 'Ana' }]);
  vi.spyOn(formulaService, 'getAll').mockResolvedValue([{ id: 3, name: 'F' }]);
  vi.spyOn(activityFactorService, 'getAll').mockResolvedValue(null);
  vi.spyOn(objectiveService, 'getAll').mockResolvedValue([]);
  vi.spyOn(physicalActivityLevelService, 'getAll').mockResolvedValue([]);
};

describe('goalSlice', () => {
  it('carrega metas e catálogos (resposta inválida vira lista vazia)', async () => {
    mockAll();
    const store = makeStore();
    await store.dispatch(loadGoals());
    expect(store.getState().goal).toMatchObject({ goals: [{ id: 1, name: 'Meta' }], customers: [{ id: 2, name: 'Ana' }], formulas: [{ id: 3, name: 'F' }], activityFactors: [], loading: false });
  });

  it('guarda a mensagem da API quando o carregamento falha', async () => {
    mockAll();
    vi.spyOn(formulaService, 'getAll').mockRejectedValue({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    await store.dispatch(loadGoals());
    expect(store.getState().goal.error).toBe('boom');
  });

  it('cria sem id, atualiza com id e guarda a falha', async () => {
    const create = vi.spyOn(customerGoalSettingService, 'create').mockResolvedValue({});
    const update = vi.spyOn(customerGoalSettingService, 'update').mockRejectedValue({ response: { data: { message: 'inválida' } } });
    const store = makeStore();
    const payload = { name: 'M', customerId: 2 };
    await store.dispatch(saveGoal({ payload }));
    await store.dispatch(saveGoal({ id: 4, payload }));
    expect(create).toHaveBeenCalledWith(payload);
    expect(update).toHaveBeenCalledWith(4, payload);
    expect(store.getState().goal).toMatchObject({ error: 'inválida', saving: false });
  });
});
