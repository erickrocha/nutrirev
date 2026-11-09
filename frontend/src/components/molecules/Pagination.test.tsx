import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

const setup = (page: number, totalPages = 3) => {
  const onPage = vi.fn();
  const onPageSize = vi.fn();
  render(<Pagination page={page} totalPages={totalPages} total={25} label="itens" pageSize={10} pageSizeOptions={[10, 20]} onPage={onPage} onPageSize={onPageSize} />);
  return { onPage, onPageSize };
};

describe('Pagination', () => {
  it('mostra o total e a posição', () => {
    setup(2);
    expect(screen.getByText('25 itens — 2 / 3')).toBeInTheDocument();
  });

  it('navega e limita nas pontas', async () => {
    const { onPage } = setup(1);
    expect(screen.getByRole('button', { name: 'common.previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'common.next' }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('desabilita "próxima" na última página e troca o tamanho', async () => {
    const { onPageSize } = setup(3);
    expect(screen.getByRole('button', { name: 'common.next' })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('common.itemsPerPage'), '20');
    expect(onPageSize).toHaveBeenCalledWith(20);
  });
});
