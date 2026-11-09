import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

describe('ConfirmDialog', () => {
  it('descreve a ação e chama confirmar e cancelar', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Excluir" message="Excluir 'Arroz'?" confirmLabel="Excluir" busy={false} onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('alertdialog', { name: 'Excluir' })).toHaveAccessibleDescription("Excluir 'Arroz'?");
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await userEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('bloqueia os botões enquanto processa', () => {
    render(<ConfirmDialog title="t" message="m" confirmLabel="Excluir" busy onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
  });

  it('mostra conteúdo extra entre a mensagem e os botões', () => {
    render(<ConfirmDialog title="t" message="m" confirmLabel="ok" busy={false} tone="primary" onConfirm={vi.fn()} onCancel={vi.fn()}><p>detalhes</p></ConfirmDialog>);
    expect(screen.getByText('detalhes')).toBeInTheDocument();
  });
});
