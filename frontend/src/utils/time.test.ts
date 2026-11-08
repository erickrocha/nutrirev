import { formatDisplayTime, toApiTime, toInputTime } from './time';

describe('time', () => {
  it('formata no 24h em português e no 12h em inglês', () => {
    expect(formatDisplayTime('13:05:00', 'pt-BR')).toBe('13:05:00');
    expect(formatDisplayTime('13:05', 'pt-BR')).toBe('13:05');
    expect(formatDisplayTime('13:05', 'en-US')).toMatch(/1:05\s?PM/);
  });

  it('devolve marcador ou o texto original quando não há horário válido', () => {
    expect(formatDisplayTime(null, 'pt')).toBe('-');
    expect(formatDisplayTime('abc', 'pt')).toBe('abc');
  });

  it('converte entre HH:mm e HH:mm:ss', () => {
    expect(toInputTime('12:00:00')).toBe('12:00');
    expect(toInputTime(undefined)).toBe('');
    expect(toApiTime('12:00')).toBe('12:00:00');
    expect(toApiTime('12:00:30')).toBe('12:00:30');
  });
});
