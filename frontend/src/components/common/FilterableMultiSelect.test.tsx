import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterableMultiSelect } from './FilterableMultiSelect';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

const options = [{ id: 1, name: 'Açaí' }, { id: 2, name: 'Feijão' }, { id: 3, name: 'Arroz' }];
const open = async () => userEvent.click(screen.getByRole('button', { expanded: false }));

describe('FilterableMultiSelect', () => {
  it('filtra localmente sem onSearch', async () => {
    render(<FilterableMultiSelect options={options} selectedIds={[]} onChange={vi.fn()} />);
    await open();
    await userEvent.type(screen.getByPlaceholderText('select.search'), 'fei');
    expect(screen.getByText('Feijão')).toBeInTheDocument();
    expect(screen.queryByText('Açaí')).not.toBeInTheDocument();
  });

  it('com onSearch delega a busca (debounce) e não filtra localmente', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSearch = vi.fn();
    render(<FilterableMultiSelect options={options} selectedIds={[]} onChange={vi.fn()} onSearch={onSearch} />);
    await open();
    await userEvent.type(screen.getByPlaceholderText('select.search'), 'acai');
    expect(screen.getByText('Feijão')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(onSearch).toHaveBeenLastCalledWith('acai');
    vi.useRealTimers();
  });

  it('múltipla escolha acumula e remove opções', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<FilterableMultiSelect label="Itens" options={options} selectedIds={[]} onChange={onChange} />);
    await open();
    await userEvent.click(screen.getByRole('option', { name: 'Feijão' }));
    expect(onChange).toHaveBeenLastCalledWith([2]);
    rerender(<FilterableMultiSelect label="Itens" options={options} selectedIds={[2]} onChange={onChange} />);
    await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Feijão' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('seleção única troca o valor e fecha o painel', async () => {
    const onChange = vi.fn();
    render(<FilterableMultiSelect isSingleSelect options={options} selectedIds={[]} onChange={onChange} />);
    await open();
    await userEvent.click(screen.getByRole('option', { name: 'Arroz' }));
    expect(onChange).toHaveBeenCalledWith([3]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('seleciona todos, limpa e remove uma etiqueta', async () => {
    const onChange = vi.fn();
    render(<FilterableMultiSelect options={options} selectedIds={[1, 2]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'select.remove Açaí' }));
    expect(onChange).toHaveBeenLastCalledWith([2]);
    await userEvent.click(screen.getByRole('button', { name: 'select.clearSelection' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    await userEvent.click(screen.getByRole('button', { expanded: false }));
    await userEvent.click(screen.getByRole('button', { name: 'select.selectAll' }));
    expect(onChange).toHaveBeenLastCalledWith([1, 2, 3]);
  });

  it('mostra o texto da seleção e a mensagem de vazio; Esc fecha; desabilitado não abre', async () => {
    const { rerender } = render(<FilterableMultiSelect isSingleSelect options={options} selectedIds={[2]} onChange={vi.fn()} emptyMessage="Nada aqui" />);
    expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('Feijão');
    await userEvent.click(screen.getByRole('button', { expanded: false }));
    await userEvent.type(screen.getByPlaceholderText('select.search'), 'zzz');
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    rerender(<FilterableMultiSelect options={options} selectedIds={[]} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('button', { expanded: false })).toBeDisabled();
  });

  it('aceita o id selecionado como texto quando a opção tem id numérico', async () => {
    render(<FilterableMultiSelect options={options} selectedIds={['2'] as unknown as number[]} onChange={vi.fn()} />);
    expect(screen.getByText('Feijão')).toBeInTheDocument();
    expect(screen.getByText('select.itemsSelected')).toBeInTheDocument();
  });
});
