import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { IngredientDetailsModal } from './IngredientDetailsModal';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

const ingredient = { id: 1, name: 'Arroz', tacoId: 7, kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, iron: null, kj: 544 };

const open = (props = {}) => {
  const onClose = vi.fn();
  render(<MemoryRouter><IngredientDetailsModal ingredient={ingredient} displayName="Arroz" onClose={onClose} {...props} /></MemoryRouter>);
  return onClose;
};

describe('IngredientDetailsModal', () => {
  it('mostra nome, TACO e valores com unidade; vazio vira traço', () => {
    open();
    expect(screen.getByRole('dialog', { name: 'Arroz' })).toBeInTheDocument();
    expect(screen.getByText(/TACO #7/)).toBeInTheDocument();
    expect(screen.getByText('130 kcal')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('fecha com Escape, pelo X e pelo botão do rodapé', async () => {
    const onClose = open();
    await userEvent.keyboard('{Escape}');
    const [headerClose, footerClose] = screen.getAllByRole('button', { name: 'common.close' });
    await userEvent.click(headerClose);
    await userEvent.click(footerClose);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('só oferece edição quando há destino', () => {
    open();
    expect(screen.queryByRole('link', { name: /common.edit/ })).not.toBeInTheDocument();
  });

  it('oferece o link de edição quando permitido', () => {
    open({ editTo: '/ingredients/1/edit' });
    expect(screen.getByRole('link', { name: /common.edit/ })).toHaveAttribute('href', '/ingredients/1/edit');
  });
});
