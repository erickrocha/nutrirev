import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageSwitcher, LanguageToggle } from './LanguageSwitcher';

const changeLanguage = vi.fn();
let language = 'pt-BR';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language, changeLanguage } }) }));

beforeEach(() => { changeLanguage.mockClear(); language = 'pt-BR'; });

describe('LanguageSwitcher', () => {
  it('em português oferece trocar para inglês, e vice-versa', async () => {
    const { unmount } = render(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole('button'));
    expect(changeLanguage).toHaveBeenCalledWith('en');
    unmount();
    language = 'en-US';
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole('button'));
    expect(changeLanguage).toHaveBeenLastCalledWith('pt');
  });
});

describe('LanguageToggle', () => {
  it('marca o idioma atual e troca ao clicar no outro', async () => {
    render(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'PT' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(changeLanguage).toHaveBeenCalledWith('en');
  });
});
