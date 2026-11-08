import { emptyTenantForm, tenantToForm, toTenantPayload } from './tenantForm';

describe('tenantForm', () => {
  it('formata CNPJ, telefone e CEP ao carregar e usa o país reserva', () => {
    const form = tenantToForm({ id: 1, name: 'Clínica', taxId: '11222333000181', phone: '11987654321', postalCode: '01310100', province: 'SP', city: 'São Paulo' }, 'br');
    expect(form).toMatchObject({ taxId: '11.222.333/0001-81', phone: '(11) 98765-4321', postalCode: '01310-100', administrativeArea: 'SP', locality: 'São Paulo', countryCode: 'BR' });
  });

  it('envia só dígitos nos campos mascarados e null nos vazios', () => {
    const values = { ...emptyTenantForm('BR'), name: ' Clínica ', taxId: '11.222.333/0001-81', phone: '(11) 98765-4321', postalCode: '01310-100', email: ' ' };
    expect(toTenantPayload(values)).toEqual({
      name: 'Clínica', taxId: '11222333000181', email: null, phone: '11987654321', addressLine1: null, addressLine2: null,
      administrativeArea: null, locality: null, postalCode: '01310100', countryCode: 'BR',
    });
  });
});
