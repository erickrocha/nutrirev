import { daysUntil, detectBrand, formatBRL, formatCardNumber, formatExpiry, isCardNumberValid, isCvvValid, isExpiryValid, parseExpiry } from './card';

const now = new Date(2026, 5, 15); // junho de 2026

describe('card', () => {
  it('detecta a bandeira; Elo tem prioridade sobre Visa', () => {
    expect([detectBrand('4111 1111'), detectBrand('5500'), detectBrand('3714'), detectBrand('4011 78'), detectBrand('606282'), detectBrand('9999')])
      .toEqual(['VISA', 'MASTERCARD', 'AMEX', 'ELO', 'HIPERCARD', 'CARD']);
  });

  it('formata número em grupos de 4 e validade como MM/AA, descartando letras', () => {
    expect(formatCardNumber('4111a1111 1111 1111')).toBe('4111 1111 1111 1111');
    expect(formatCardNumber('41111111111111111111111')).toBe('4111 1111 1111 1111 111');
    expect(formatExpiry('0728')).toBe('07/28');
    expect(formatExpiry('07')).toBe('07');
  });

  it('lê a validade com ano de 2 ou 4 dígitos', () => {
    expect(parseExpiry('07/28')).toEqual({ month: 7, year: 2028 });
    expect(parseExpiry('07/2028')).toEqual({ month: 7, year: 2028 });
    expect(parseExpiry('xx')).toBeNull();
  });

  it('valida a validade: mês 1–12, não vencida, até 2099', () => {
    expect([isExpiryValid('06/26', now), isExpiryValid('05/26', now), isExpiryValid('13/27', now), isExpiryValid('00/27', now), isExpiryValid('12/2100', now), isExpiryValid('01/25', now), isExpiryValid('', now)])
      .toEqual([true, false, false, false, false, false, false]);
  });

  it('valida tamanho do número e do CVV', () => {
    expect([isCardNumberValid('4111 1111 1111 1111'), isCardNumberValid('4111'), isCvvValid('123'), isCvvValid('12'), isCvvValid('12345')]).toEqual([true, false, true, false, false]);
  });

  it('formata reais e calcula dias até o vencimento', () => {
    expect(formatBRL(14900)).toMatch(/R\$\s?149,00/);
    expect(formatBRL(undefined)).toBe('R$ 0,00');
    expect([daysUntil('2026-06-20', now), daysUntil('2026-06-15T10:00:00', now), daysUntil('2026-06-10', now), daysUntil(undefined, now), daysUntil('x', now)]).toEqual([5, 0, -5, null, null]);
  });
});
