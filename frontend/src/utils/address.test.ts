import { formatAddress } from './address';

describe('formatAddress', () => {
  it('junta as partes preenchidas na ordem rua, região e CEP/país', () => {
    expect(formatAddress({ addressLine1: 'Rua A, 10', addressLine2: 'Sala 2', locality: 'Recife', administrativeArea: 'PE', postalCode: '50000000', countryCode: 'BR' }))
      .toBe('Rua A, 10 — Sala 2 — Recife, PE — 50000000 · BR');
  });

  it('aceita os campos alternativos da API (city, province, zipcode)', () => {
    expect(formatAddress({ city: 'Recife', province: 'PE', zipcode: '50000000' })).toBe('Recife, PE — 50000000');
  });

  it('sem nada devolve o texto reserva', () => {
    expect(formatAddress({}, 'N/D')).toBe('N/D');
    expect(formatAddress({})).toBe('');
  });
});
