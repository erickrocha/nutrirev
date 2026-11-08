import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanChoiceCard } from './PlanChoiceCard';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

const plan = {
  id: 3, name: 'Pro', priceInCents: 14900, availableUsers: 5, periodDays: 30, paymentDate: '2026-03-09',
  tiers: [{ id: 2, upToUsers: 0, pricePerUserInCents: 500 }, { id: 1, upToUsers: 10, pricePerUserInCents: 900 }],
};

describe('PlanChoiceCard', () => {
  it('mostra preço, usa a cota padrão 4 e ordena as faixas com a ilimitada por último', () => {
    render(<PlanChoiceCard plan={plan} selected={false} lang="pt" onSelect={vi.fn()} />);
    expect(screen.getByText(/R\$\s?149,00/)).toBeInTheDocument();
    const ranges = screen.getAllByText(/tenants\.(upToUsers|unlimitedTier)/).map((node) => node.textContent);
    expect(ranges).toEqual(['tenants.upToUsers', 'tenants.unlimitedTier']);
  });

  it('marca a seleção e avisa o clique', async () => {
    const onSelect = vi.fn();
    render(<PlanChoiceCard plan={{ ...plan, tiers: null }} selected lang="pt" onSelect={onSelect} />);
    const card = screen.getByRole('radio', { name: /Pro/ });
    expect(card).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('tenants.fixedPricing')).toBeInTheDocument();
    await userEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith(3);
  });
});
