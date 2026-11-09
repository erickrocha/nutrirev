import { formatAddress, formatBirthDate, isMobileEnabled, matchesCustomerSearch, mealIdOf, phoneLabel, planIdOf } from './customerView';

const base = { id: 1, name: 'Ana Souza', email: 'ana@x.com' };

describe('customerView', () => {
  it('aceita os dois formatos de campo da API', () => {
    expect(planIdOf({ ...base, clinical_plan_id: 3 })).toBe(3);
    expect(planIdOf({ ...base, clinicalPlanId: 4, clinical_plan_id: 3 })).toBe(4);
    expect(mealIdOf({ ...base })).toBeNull();
    expect(isMobileEnabled({ ...base, mobile_enabled: true })).toBe(true);
    expect(isMobileEnabled(base)).toBe(false);
  });

  it('monta o endereço pulando partes vazias, com fallback', () => {
    expect(formatAddress({ ...base, addressLine1: 'Rua A, 10', locality: 'Recife', administrativeArea: 'PE', postalCode: '50000000', countryCode: 'BR' }, '-'))
      .toBe('Rua A, 10 — Recife, PE — 50000000 · BR');
    expect(formatAddress(base, 'N/D')).toBe('N/D');
  });

  it('formata a data de nascimento sem deslocar o dia', () => {
    expect(formatBirthDate('1990-05-10', 'pt-BR')).toBe('10/05/1990');
    expect(formatBirthDate('1990-05-10T00:00:00', 'en-US')).toBe('5/10/1990');
    expect(formatBirthDate('', 'pt')).toBe('');
    expect(formatBirthDate('abc', 'pt')).toBe('abc');
  });

  it('formata o telefone e usa N/A quando vazio', () => {
    expect(phoneLabel('11987654321')).toBe('(11) 98765-4321');
    expect(phoneLabel(null)).toBe('N/A');
  });

  it('busca por nome, e-mail ou telefone', () => {
    const c = { ...base, phone: '11987654321' };
    expect([matchesCustomerSearch(c, 'ana'), matchesCustomerSearch(c, 'X.COM'), matchesCustomerSearch(c, '9876'), matchesCustomerSearch(c, 'zzz')]).toEqual([true, true, true, false]);
  });
});
