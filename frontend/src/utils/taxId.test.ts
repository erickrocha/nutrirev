import { isValidTaxId } from './taxId';

describe('isValidTaxId', () => {
  it('aceita CPF e CNPJ válidos, com ou sem máscara', () => {
    expect(isValidTaxId('529.982.247-25')).toBe(true);
    expect(isValidTaxId('52998224725')).toBe(true);
    expect(isValidTaxId('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita dígito verificador errado, tamanho errado e repetidos', () => {
    expect(isValidTaxId('529.982.247-26')).toBe(false);
    expect(isValidTaxId('123')).toBe(false);
    expect(isValidTaxId('111.111.111-11')).toBe(false);
    expect(isValidTaxId('')).toBe(false);
  });
});
