import { emptyMealPlanForm, hasInvalidIngredient, ingredientIdsOf, newItem, planToForm, toMealPlanPayload } from './mealPlanForm';

const t = (key: string) => (key === 'mealPlanForm.optionPrefix' ? 'Opção ' : key === 'mealPlanForm.mainOption' ? 'Principal' : key);

describe('mealPlanForm', () => {
  it('novo plano começa com uma refeição e a opção principal', () => {
    const form = emptyMealPlanForm(t);
    expect(form).toMatchObject({ category: 'KeepFit', generationStatus: 'Draft' });
    expect(form.meals).toHaveLength(1);
    expect(form.meals[0]).toMatchObject({ mealType: 'Breakfast', options: [{ label: 'Principal', items: [] }] });
    expect(newItem(5)).toEqual({ ingredientId: 5, quantity: '100', unit: 'Grams' });
  });

  it('carrega o plano com rótulos padrão nas opções sem nome', () => {
    const form = planToForm({
      id: 1, name: 'P', patientId: 3,
      meals: [{ mealType: 'Lunch', isPreWorkout: true, isPostWorkout: false, nutritionistNote: 'n', position: 1, options: [{ label: '', position: 1, items: [{ ingredientId: 9, quantity: 150, unit: 'Cup' }] }] }],
    }, t);
    expect(form.patientId).toBe('3');
    expect(form.meals[0].options[0]).toEqual({ label: 'Opção 1', items: [{ ingredientId: 9, quantity: '150', unit: 'Cup' }] });
    expect(ingredientIdsOf(form)).toEqual([9]);
  });

  it('monta o corpo com posições, ids numéricos e quantidades convertidas', () => {
    const values = { ...emptyMealPlanForm(t), name: ' Plano ', patientId: '4', meals: [{ mealType: 'Lunch', isPreWorkout: false, isPostWorkout: true, nutritionistNote: '', options: [{ label: '', items: [{ ingredientId: '7', quantity: '2,5'.replace(',', '.'), unit: 'Cup' }] }] }] };
    expect(toMealPlanPayload(values, t)).toMatchObject({
      name: 'Plano', patientId: 4, nutritionistId: null, viewed: false,
      meals: [{ position: 1, isPostWorkout: true, options: [{ label: 'Opção 1', position: 1, items: [{ ingredientId: 7, quantity: 2.5, unit: 'Cup', substitutes: [] }] }] }],
    });
  });

  it('detecta item sem ingrediente escolhido', () => {
    const base = emptyMealPlanForm(t);
    expect(hasInvalidIngredient(base)).toBe(false);
    base.meals[0].options[0].items.push(newItem(''));
    expect(hasInvalidIngredient(base)).toBe(true);
  });
});
