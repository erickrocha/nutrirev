import { render, screen } from '@testing-library/react';
import { PlanSummary } from './PlanSummary';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

const plan = { uuid: 'p', name: 'Profissional', priceInCents: 34900, availableUsers: 5, periodDays: 30, dailyAiQuota: 4, tiers: [] };

describe('PlanSummary', () => {
  it('mostra nome e preço do plano', () => {
    render(<PlanSummary plan={plan} lang="pt" />);
    expect(screen.getByText('Profissional')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?349/)).toBeInTheDocument();
  });

  it('só lista faixas quando o plano tem tiers', () => {
    render(<PlanSummary plan={{ ...plan, tiers: [{ upToUsers: 0, pricePerUserInCents: 4000 }] }} lang="pt" />);
    expect(screen.getByText(/site\.plans\.tiers/)).toBeInTheDocument();
  });
});
