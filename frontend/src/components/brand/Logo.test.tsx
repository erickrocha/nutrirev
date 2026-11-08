import { render, screen } from '@testing-library/react';
import { Logo, LogoMark } from './Logo';

describe('Logo', () => {
  it('a marca é decorativa e respeita o tamanho', () => {
    const { container } = render(<LogoMark size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '24');
  });

  it('o logotipo mostra o nome da marca', () => {
    render(<Logo />);
    expect(screen.getByText('rev')).toBeInTheDocument();
  });
});
