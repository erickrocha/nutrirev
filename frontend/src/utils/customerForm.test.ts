import { buildDefaults, toSubmit } from './customerForm';

const none = { restrictionIds: [], bowelFunctionIds: [], conditionIds: [], dailyMealIds: [] };

describe('customerForm', () => {
  it('monta os padrões de um novo cliente com país e primeiros itens do catálogo', () => {
    const values = buildDefaults(null, none, 'BR', '3', '8');
    expect(values).toMatchObject({ countryCode: 'BR', clinicalPlanId: '3', prepareMealId: '8', gender: 'Feminino' });
  });

  it('exibe telefone e CEP mascarados ao editar', () => {
    const values = buildDefaults({ id: 1, name: 'Ana', email: 'a@x.com', phone: '11987654321', postalCode: '01310100', countryCode: 'br' }, none, 'US', '', '');
    expect(values).toMatchObject({ phone: '(11) 98765-4321', postalCode: '01310-100', countryCode: 'BR' });
  });

  it('envia telefone e CEP só com dígitos e converte ids e vazios', () => {
    const values = { ...buildDefaults(null, none, 'BR', '', ''), name: ' Ana ', phone: '(11) 98765-4321', postalCode: '01310-100', clinicalPlanId: '4' };
    const { payload } = toSubmit(values);
    expect(payload).toMatchObject({ name: 'Ana', phone: '11987654321', postalCode: '01310100', clinicalPlanId: 4, prepareMealId: null, addressLine1: null });
  });
});
