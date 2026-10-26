import { render, screen } from '@testing-library/react';
import { FormCard } from './FormCard';

describe('FormCard', () => {
  it('mantém os botões no footer, separados de header e body', () => {
    render(<FormCard header={<h2>Título</h2>} footer={<button>Salvar</button>}><p>Corpo</p></FormCard>);
    expect(screen.getByRole('banner')).toHaveTextContent('Título');
    expect(screen.getByRole('contentinfo')).toContainElement(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Corpo').closest('footer')).toBeNull();
  });
});
