import { formatPrice, maskPhone, maskPostalCode, maskTaxId, onlyDigits } from './format';

describe('format', () => {
  it('formata preço em BRL sem centavos quando inteiro', () => {
    expect(formatPrice(14900, 'pt').replace(/\s/g, ' ')).toBe('R$ 149');
    expect(formatPrice(14950, 'pt').replace(/\s/g, ' ')).toBe('R$ 149,50');
  });

  it('mascara CPF e CNPJ', () => {
    expect(maskTaxId('12345678901')).toBe('123.456.789-01');
    expect(maskTaxId('12345678000195')).toBe('12.345.678/0001-95');
  });

  it('mascara telefone fixo e celular', () => {
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
    expect(maskPhone('11999990000')).toBe('(11) 99999-0000');
  });

  it('mascara CEP e extrai dígitos', () => {
    expect(maskPostalCode('01310100')).toBe('01310-100');
    expect(onlyDigits('(11) 9', 1)).toBe('1');
  });
});
