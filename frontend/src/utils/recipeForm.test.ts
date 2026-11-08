import { emptyRecipeForm, hasUnselectedIngredient, recipeToForm, toRecipePayload } from './recipeForm';

describe('recipeForm', () => {
  it('carrega a receita: passos em ordem, nomes em texto e ingrediente aninhado', () => {
    const form = recipeToForm({
      id: 1, name: 'Omelete', price: 12.5, time: 15, recommendedDays: 3, cycleId: 2,
      ingredients: [{ ingredient: { id: 8 }, quantity: 2, unit: 'Units' }],
      directions: [{ stepNumber: 2, description: 'Sirva' }, { stepNumber: 1, description: 'Bata' }],
      restrictions: [{ id: 1, name: 'Sem Glúten' }, { id: 2, name: 'Sem Lactose' }], tags: [{ id: 3, name: 'Rápido' }],
    });
    expect(form).toMatchObject({ price: '12.5', time: '15', portion: '', recommendedDays: '3', cycleId: '2', restrictions: 'Sem Glúten, Sem Lactose', tags: 'Rápido' });
    expect(form.ingredients).toEqual([{ ingredientId: 8, quantity: '2', unit: 'Units' }]);
    expect(form.directions.map((step) => step.description)).toEqual(['Bata', 'Sirva']);
  });

  it('monta o corpo: números, passos renumerados, listas por vírgula e contadores preservados', () => {
    const values = {
      ...emptyRecipeForm(), name: ' Omelete ', price: '9.9', time: '10', cycleId: '4',
      ingredients: [{ ingredientId: '8', quantity: '150', unit: 'Grams' }],
      directions: [{ description: 'A' }, { description: 'B' }], restrictions: 'Sem Glúten, , Vegano ', tags: '',
    };
    const payload = toRecipePayload(values, { id: 1, name: 'x', photo: 'url', views: 5, additions: 2 });
    expect(payload).toMatchObject({ name: 'Omelete', price: 9.9, time: 10, portion: null, cycleId: 4, photo: 'url', views: 5, additions: 2, meals: [] });
    expect(payload.ingredients).toEqual([{ ingredientId: 8, quantity: 150, unit: 'Grams', substitutes: [] }]);
    expect(payload.directions).toEqual([{ stepNumber: 1, description: 'A' }, { stepNumber: 2, description: 'B' }]);
    expect(payload.restrictions).toEqual([{ id: 0, name: 'Sem Glúten' }, { id: 0, name: 'Vegano' }]);
    expect(payload.tags).toEqual([]);
  });

  it('detecta ingrediente sem escolha', () => {
    const form = emptyRecipeForm();
    expect(hasUnselectedIngredient(form)).toBe(false);
    form.ingredients.push({ ingredientId: '', quantity: '100', unit: 'Grams' });
    expect(hasUnselectedIngredient(form)).toBe(true);
  });
});
