import { actualWeightOf, goalToForm, newGoalDefaults, toGoalPayload } from './goalForm';

const catalogs = {
  customers: [{ id: 5, name: 'Ana' }], formulas: [{ id: 1, name: 'F' }], activityFactors: [{ id: 2, name: 'A' }],
  objectives: [{ id: 3, name: 'O' }], activityLevels: [],
};

describe('goalForm', () => {
  it('novo registro começa com o primeiro item de cada catálogo (vazio quando não há)', () => {
    expect(newGoalDefaults(catalogs, 'Meta')).toMatchObject({ name: 'Meta', customerId: '5', formulaId: '1', activityFactorId: '2', objectiveId: '3', physicalActivityLevelId: '' });
  });

  it('lê registros nos dois formatos da API', () => {
    const form = goalToForm({ id: 1, name: 'M', customer_id: 9, formula_id: 4, actual_weight: 70.5, customerCaloricGoal: 1800, height: 0 });
    expect(form).toMatchObject({ customerId: '9', formulaId: '4', actualWeight: '70.5', customerCaloricGoal: '1800', height: '0', desiredWeight: '' });
    expect(actualWeightOf({ id: 1, name: 'M', actualWeight: 60 })).toBe(60);
  });

  it('monta o corpo com números e null para o que está vazio', () => {
    const payload = toGoalPayload({ ...newGoalDefaults(catalogs, ' Meta '), actualWeight: '70,5'.replace(',', '.'), customerCaloricGoal: '1800' });
    expect(payload).toMatchObject({ name: 'Meta', customerId: 5, formulaId: 1, physicalActivityLevelId: null, actualWeight: 70.5, height: null, customerCaloricGoal: 1800 });
  });
});
