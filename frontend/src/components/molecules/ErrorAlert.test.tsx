import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorAlert } from './ErrorAlert';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);

describe('ErrorAlert', () => {
  it('mostra a mensagem e chama a nova tentativa', async () => {
    const onRetry = vi.fn();
    render(<ErrorAlert message="boom" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
    await userEvent.click(screen.getByRole('button', { name: /common.retry/ }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('sem onRetry não oferece o botão', () => {
    render(<ErrorAlert message="boom" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
