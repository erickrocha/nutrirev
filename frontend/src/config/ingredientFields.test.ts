import { ALL_NUTRIENT_FIELDS, MACRO_FIELDS, ingredientCsvColumns, unitOf } from './ingredientFields';

describe('ingredientFields', () => {
  it('não repete campos entre as abas', () => {
    expect(new Set(ALL_NUTRIENT_FIELDS).size).toBe(ALL_NUTRIENT_FIELDS.length);
    expect(ALL_NUTRIENT_FIELDS).toHaveLength(30);
  });

  it('define a unidade por nutriente', () => {
    expect([unitOf('kcal'), unitOf('kj'), unitOf('moisture'), unitOf('rae'), unitOf('fat'), unitOf('iron'), unitOf('tacoId')]).toEqual(['kcal', 'kJ', '%', 'mcg', 'g', 'mg', '']);
  });

  it('monta as colunas do CSV em snake_case, só os macros obrigatórios', () => {
    const columns = ingredientCsvColumns((key) => key);
    expect(columns).toHaveLength(31);
    expect(columns.map((c) => c.key).slice(0, 8)).toEqual(['name', 'kcal', 'protein', 'carbs', 'fat', 'fiber', 'taco_id', 'moisture']);
    expect(columns.find((c) => c.key === 'vitamin_c')?.label).toBe('ingredients.vitaminC');
    expect(columns.filter((c) => c.required).map((c) => c.key)).toEqual(['name', ...MACRO_FIELDS]);
  });
});
