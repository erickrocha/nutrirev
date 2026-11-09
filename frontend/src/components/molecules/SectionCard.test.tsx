import { render, screen } from '@testing-library/react';
import { SectionCard } from './SectionCard';

describe('SectionCard', () => {
  it('mostra o título e o conteúdo', () => {
    render(<SectionCard title="Localização" icon={<span>i</span>}><p>corpo</p></SectionCard>);
    expect(screen.getByRole('heading', { name: /Localização/ })).toBeInTheDocument();
    expect(screen.getByText('corpo')).toBeInTheDocument();
  });
});
