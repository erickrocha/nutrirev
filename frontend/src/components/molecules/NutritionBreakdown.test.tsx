import { render, screen } from '@testing-library/react';
import { NutritionBreakdown } from './NutritionBreakdown';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

describe('NutritionBreakdown', () => {
  it('mostra os totais arredondados e a lista de itens', () => {
    render(<NutritionBreakdown totals={{ calories: 300.4, protein_g: 12.345, carbs_g: 40, fat_g: 5 }} items={[{ name: 'Arroz', estimated_grams: 150, calories: 195.6 }, { name: 'Ovo', calories: 70 }]} />);
    expect(screen.getByText('300 kcal')).toBeInTheDocument();
    expect(screen.getByText('12.3g')).toBeInTheDocument();
    expect(screen.getByText('196 kcal')).toBeInTheDocument();
    expect(screen.getByText('150g')).toBeInTheDocument();
    expect(screen.getByText('Ovo')).toBeInTheDocument();
  });

  it('sem totais mostra zeros', () => {
    render(<NutritionBreakdown />);
    expect(screen.getByText('0 kcal')).toBeInTheDocument();
    expect(screen.getAllByText('0.0g')).toHaveLength(3);
  });
});
