import { centsToDisplay, displayToCents } from './currency';
import { ENUM_VALUES, enumLabel, ROLES } from './enums';
import { isTokenExpired } from './jwt';

const token = (payload: object) => `h.${btoa(JSON.stringify(payload))}.s`;

describe('jwt', () => {
  it('considera expirado: vazio, mal formado, vencido ou dentro da folga de segurança', () => {
    const soon = Math.floor(Date.now() / 1000) + 5;
    expect([isTokenExpired(null), isTokenExpired('abc'), isTokenExpired(token({ exp: 1 })), isTokenExpired(token({ exp: soon })), isTokenExpired('h.@@@.s')]).toEqual([true, true, true, true, true]);
  });

  it('válido quando falta tempo ou quando não há `exp`', () => {
    const later = Math.floor(Date.now() / 1000) + 3600;
    expect([isTokenExpired(token({ exp: later })), isTokenExpired(token({ name: 'x' }))]).toEqual([false, false]);
  });
});

describe('enums', () => {
  it('o rótulo vem da tradução, com o próprio valor como reserva, e vazio sem valor', () => {
    const t = (key: string, options?: Record<string, unknown>) => (key === 'enums.role.User' ? 'Usuário' : String(options?.defaultValue));
    expect([enumLabel(t, 'role', 'User'), enumLabel(t, 'role', 'Outro'), enumLabel(t, 'role', null)]).toEqual(['Usuário', 'Outro', '']);
    expect(ENUM_VALUES.role).toEqual(Object.values(ROLES));
  });
});

describe('currency', () => {
  it('converte centavos e reais nos dois sentidos, sem deriva de ponto flutuante', () => {
    expect([centsToDisplay(12345), centsToDisplay('990'), centsToDisplay(null), centsToDisplay('x')]).toEqual(['123.45', '9.90', '', '']);
    expect([displayToCents('123,45'), displayToCents(19.9), displayToCents(''), displayToCents('x')]).toEqual([12345, 1990, null, null]);
  });
});
