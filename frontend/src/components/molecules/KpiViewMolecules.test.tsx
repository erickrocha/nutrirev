import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Users } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { ViewToggle } from './ViewToggle';

describe('KpiCard', () => {
  it('mostra valor e rótulo', () => {
    render(<KpiCard icon={<Users size={20} />} value={7} label="Clientes" tone="gold" />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
  });
});

describe('ViewToggle', () => {
  const options = [
    { id: 'cards' as const, label: 'Cards', title: 'Ver cards', icon: Users },
    { id: 'table' as const, label: 'Tabela', title: 'Ver tabela', icon: Users },
  ];

  it('marca a opção atual e avisa a troca', async () => {
    const onChange = vi.fn();
    render(<ViewToggle value="cards" options={options} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /Cards/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Tabela/ })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: /Tabela/ }));
    expect(onChange).toHaveBeenCalledWith('table');
  });
});
