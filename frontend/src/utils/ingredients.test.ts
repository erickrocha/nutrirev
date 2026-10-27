import { ingredientName, ingredientPickerOptions } from './ingredients';

const rice = { id: 1, name: 'Arroz, cru', nameEn: 'Rice, raw' };
const bean = { id: 2, name: 'Feijão, cru', nameEn: undefined };

describe('ingredients utils', () => {
  it('usa o nome no idioma da interface, com fallback para o português', () => {
    expect(ingredientName(rice, 'en')).toBe('Rice, raw');
    expect(ingredientName(rice, 'pt')).toBe('Arroz, cru');
    expect(ingredientName(bean, 'en')).toBe('Feijão, cru');
  });

  it('mantém o item escolhido no topo das opções, sem repetir', () => {
    const options = ingredientPickerOptions(2, [rice, bean], [rice, bean], 'pt', (_, name) => name);
    expect(options.map((o) => o.id)).toEqual([2, 1]);
  });

  it('sem escolha, devolve só o resultado da busca', () => {
    const options = ingredientPickerOptions('', [rice], [rice], 'en', (_, name) => `${name}!`);
    expect(options).toEqual([{ id: 1, name: 'Rice, raw!' }]);
  });
});
