import { emptyBusinessPlanForm, planToForm, toPlanPayload } from './businessPlanForm';

describe('businessPlanForm', () => {
  it('começa com os padrões do plano', () => {
    expect(emptyBusinessPlanForm()).toMatchObject({ availableUsers: '1', periodDays: '30', dailyAiQuota: '4', tiers: [] });
  });

  it('carrega o plano: preço em reais, cota padrão 4 e faixa ilimitada vazia', () => {
    const form = planToForm({ id: 1, name: 'Pro', priceInCents: 14900, availableUsers: 5, periodDays: 30, paymentDate: '2026-03-09', tiers: [{ id: 7, upToUsers: 0, pricePerUserInCents: 990 }, { upToUsers: 10, pricePerUserInCents: 500 }] });
    expect(form).toMatchObject({ price: '149.00', dailyAiQuota: '4' });
    expect(form.tiers).toEqual([{ tierId: 7, upToUsers: '', pricePerUser: '9.90' }, { tierId: null, upToUsers: '10', pricePerUser: '5.00' }]);
  });

  it('monta o corpo em centavos; sem faixas envia null; faixa vazia vira 0 e novas não levam id', () => {
    const values = { ...emptyBusinessPlanForm(), name: ' Pro ', price: '149,9'.replace(',', '.'), paymentDate: '2026-03-09' };
    expect(toPlanPayload(values)).toMatchObject({ name: 'Pro', priceInCents: 14990, availableUsers: 1, tiers: null });
    const withTiers = toPlanPayload({ ...values, tiers: [{ tierId: null, upToUsers: '', pricePerUser: '9.9' }, { tierId: 3, upToUsers: '10', pricePerUser: '5' }] });
    expect(withTiers.tiers).toEqual([{ upToUsers: 0, pricePerUserInCents: 990 }, { id: 3, upToUsers: 10, pricePerUserInCents: 500 }]);
  });
});
