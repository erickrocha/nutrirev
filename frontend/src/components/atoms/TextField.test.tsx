import { render, screen } from '@testing-library/react';
import { TextField } from './TextField';

describe('TextField', () => {
  it('associa label ao input', () => {
    render(<TextField id="name" label="Nome" />);
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
  });

  it('exibe o erro e marca o campo como inválido', () => {
    render(<TextField id="name" label="Nome" error="Obrigatório" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Obrigatório');
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-invalid', 'true');
  });
});
