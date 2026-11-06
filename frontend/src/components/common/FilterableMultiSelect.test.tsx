import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterableMultiSelect } from './FilterableMultiSelect';

const options = [{ id: 1, name: 'Açaí' }, { id: 2, name: 'Feijão' }];

describe('FilterableMultiSelect', () => {
  it('filtra localmente sem onSearch', async () => {
    render(<FilterableMultiSelect options={options} selectedIds={[]} onChange={vi.fn()} />);
    await userEvent.click(screen.getByText('Selecione...'));
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'fei');
    expect(screen.getByText('Feijão')).toBeInTheDocument();
    expect(screen.queryByText('Açaí')).not.toBeInTheDocument();
  });

  it('com onSearch delega a busca (debounce) e não filtra localmente', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSearch = vi.fn();
    render(<FilterableMultiSelect options={options} selectedIds={[]} onChange={vi.fn()} onSearch={onSearch} />);
    await userEvent.click(screen.getByText('Selecione...'));
    await userEvent.type(screen.getByPlaceholderText('Buscar...'), 'acai');
    expect(screen.getByText('Feijão')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(onSearch).toHaveBeenLastCalledWith('acai');
    vi.useRealTimers();
  });
});
