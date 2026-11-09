import { render, screen } from '@testing-library/react';
import { SelectField } from './SelectField';

describe('SelectField', () => {
  it('associa label ao select e lista as opções', () => {
    render(<SelectField id="gender" label="Gênero"><option value="F">Feminino</option></SelectField>);
    expect(screen.getByLabelText('Gênero')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Feminino' })).toBeInTheDocument();
  });

  it('exibe o erro e marca o campo como inválido', () => {
    render(<SelectField id="gender" label="Gênero" error="Obrigatório"><option /></SelectField>);
    expect(screen.getByRole('alert')).toHaveTextContent('Obrigatório');
    expect(screen.getByLabelText('Gênero')).toHaveAttribute('aria-invalid', 'true');
  });
});
