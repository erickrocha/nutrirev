import { optionMacros, itemMacros, sumMacros, toAnalysisPayload, UNIT_MULTIPLIERS } from './manualMeal';

const rice = { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 };

describe('manualMeal', () => {
  it('calcula os macros de uma porção em gramas (valores por 100 g)', () => {
    expect(itemMacros(rice, 200, 'Grams')).toEqual({ calories: 260, protein: 5.4, carbs: 56, fat: 0.6 });
  });

  it('converte medidas caseiras e trata unidade desconhecida como 1', () => {
    expect(itemMacros(rice, 1, 'Cup').calories).toBe(156);
    expect(UNIT_MULTIPLIERS.Tablespoon).toBe(UNIT_MULTIPLIERS.TableSpoon);
    expect(itemMacros(rice, 100, 'Desconhecida').calories).toBe(130);
  });

  it('quantidade inválida zera os macros', () => {
    expect(itemMacros(rice, Number.NaN, 'Grams')).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('soma os itens arredondando calorias para inteiro e macros para 1 casa', () => {
    const items = [{ macros: { calories: 260.4, protein: 5.44, carbs: 56, fat: 0.6 } }, { macros: { calories: 100.3, protein: 1.1, carbs: 2, fat: 0.1 } }];
    expect(sumMacros(items)).toEqual({ calories: 361, protein: 6.5, carbs: 58, fat: 0.7 });
    expect(sumMacros([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('monta o corpo da análise em snake_case', () => {
    const items = [{ ingredientId: 3, name: 'Arroz', quantity: 150, unit: 'Grams', macros: { calories: 0, protein: 0, carbs: 0, fat: 0 } }];
    expect(toAnalysisPayload('7', '2026-03-09', items)).toEqual({ daily_meal_id: 7, meal_date: '2026-03-09', items: [{ ingredient_id: 3, quantity: 150, unit: 'Grams' }] });
  });
});

describe('optionMacros', () => {
  const rice = { id: 1, kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 };

  it('soma os itens pelo cache de ingredientes, em 1 casa decimal', () => {
    const items = [{ ingredientId: '1', quantity: '200', unit: 'Grams' }, { ingredientId: 1, quantity: 1, unit: 'Cup' }];
    expect(optionMacros(items, [rice])).toEqual({ kcal: '416.0', p: '8.6', c: '89.6', f: '1.0', fi: '1.3' });
  });

  it('ignora itens sem ingrediente, sem quantidade ou fora do cache', () => {
    const items = [{ ingredientId: '', quantity: 100 }, { ingredientId: 1, quantity: 0 }, { ingredientId: 9, quantity: 100 }];
    expect(optionMacros(items, [rice])).toEqual({ kcal: '0.0', p: '0.0', c: '0.0', f: '0.0', fi: '0.0' });
    expect(optionMacros(undefined, undefined).kcal).toBe('0.0');
  });
});
