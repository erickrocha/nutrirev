import { render, screen } from '@testing-library/react';
import { MacroGrid } from './MacroGrid';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

describe('MacroGrid', () => {
  it('mostra os quatro macros com unidade', () => {
    render(<MacroGrid macros={{ calories: 361, protein: 6.5, carbs: 58, fat: 0.7 }} />);
    expect(screen.getByText('361 kcal')).toBeInTheDocument();
    expect(screen.getByText('6.5g')).toBeInTheDocument();
    expect(screen.getByText('manualMealAnalysis.fat')).toBeInTheDocument();
  });
});
