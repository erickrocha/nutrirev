import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Button } from './Button';

describe('Button', () => {
  it('dispara onClick e aplica a classe da variante', async () => {
    const onClick = vi.fn();
    render(<Button variant="accent" onClick={onClick}>Atualizar</Button>);
    const button = screen.getByRole('button', { name: 'Atualizar' });
    expect(button).toHaveClass('btn-action-accent');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('não dispara quando desabilitado', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Salvar</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('vira link quando recebe `to`', () => {
    render(<MemoryRouter><Button to="/x">Abrir</Button></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Abrir' })).toHaveAttribute('href', '/x');
  });
});
