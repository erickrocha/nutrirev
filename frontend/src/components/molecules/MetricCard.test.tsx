import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Users } from 'lucide-react';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('mostra rótulo, valor e detalhe', () => {
    render(<MetricCard icon={Users} label="Clientes" value={12} detail="3 novos" />);
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3 novos')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('com destino vira um link que cobre o cartão todo', () => {
    render(<MemoryRouter><MetricCard icon={Users} label="Clientes" value="—" to="/customers" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Clientes/ })).toHaveAttribute('href', '/customers');
  });
});
