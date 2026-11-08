import { formatLocalDate, formatCents, formatIsoDate, todayIso } from './date';

describe('date', () => {
  it('formata data ISO e preserva o que não for data', () => {
    expect(formatIsoDate('2026-03-09')).toBe('09/03/2026');
    expect(formatIsoDate('09/03')).toBe('09/03');
    expect(formatIsoDate(null)).toBe('—');
  });

  it('gera a data de hoje no formato ISO', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formata centavos com duas casas', () => {
    expect(formatCents(12345)).toMatch(/123[.,]45/);
    expect(formatCents(undefined)).toMatch(/0[.,]00/);
  });
});

describe('formatLocalDate', () => {
  it('formata no idioma e usa traço quando vazio', () => {
    expect(formatLocalDate('2026-03-09', 'pt-BR')).toBe('09/03/2026');
    expect(formatLocalDate('2026-03-09', 'en-US')).toBe('3/9/2026');
    expect(formatLocalDate(null, 'pt')).toBe('—');
  });
});
