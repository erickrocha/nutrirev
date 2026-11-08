import { emptyIngredientForm, formatNutrient, ingredientToForm, toIngredientPayload } from './ingredientForm';

describe('ingredientForm', () => {
  it('converte campos opcionais vazios em null e macros vazios em 0', () => {
    const payload = toIngredientPayload({ ...emptyIngredientForm(), name: ' Arroz ', kcal: '130', protein: '2,7'.replace(',', '.') }, false);
    expect(payload).toMatchObject({ name: 'Arroz', kcal: 130, protein: 2.7, carbs: 0, calcium: null, tacoId: null });
    expect(payload).not.toHaveProperty('tenantId');
  });

  it('envia tenantId só para o SysAdmin e tacoId como inteiro', () => {
    const values = { ...emptyIngredientForm('4'), name: 'A', tacoId: '12', iron: '0.5' };
    expect(toIngredientPayload(values, true)).toMatchObject({ tenantId: 4, tacoId: 12, iron: 0.5 });
    expect(toIngredientPayload(values, false)).not.toHaveProperty('tenantId');
  });

  it('carrega o ingrediente para o formulário, vazio quando não há valor', () => {
    const form = ingredientToForm({ id: 1, name: 'Feijão', tenantId: 3, kcal: 77, protein: 4.5, carbs: 14, fat: 0.5, fiber: 8, iron: null });
    expect(form).toMatchObject({ name: 'Feijão', tenantId: '3', kcal: '77', iron: '', zinc: '' });
  });

  it('formata valores de nutrientes', () => {
    expect(formatNutrient(null)).toBe('—');
    expect(formatNutrient('x')).toBe('—');
    expect(formatNutrient(1.23456, 'g')).toMatch(/1[.,]235 g/);
  });
});
