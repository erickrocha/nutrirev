import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MethodToggle } from './MethodToggle';

describe('MethodToggle', () => {
  it('associa rótulo e dica ao checkbox e avisa a mudança', async () => {
    const onChange = vi.fn();
    render(<MethodToggle icon={null} label="Pix" hint="QR Code" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Pix/ }));
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByText('QR Code')).toBeInTheDocument();
  });

  it('não permite alterar quando desabilitado', async () => {
    const onChange = vi.fn();
    render(<MethodToggle icon={null} label="Pix" hint="x" checked={false} disabled onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
