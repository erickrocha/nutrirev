import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from './SearchBox';

describe('SearchBox', () => {
  it('expõe o campo pelo placeholder e avisa cada digitação', async () => {
    const onChange = vi.fn();
    render(<SearchBox value="" onChange={onChange} placeholder="Pesquisar" />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Pesquisar' }), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });
});
