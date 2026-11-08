import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = ['pt', 'en'] as const;

/** Item do menu do usuário: alterna entre português e inglês. */
export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('pt') ? 'pt' : 'en';

  return (
    <button
      type="button" onClick={() => i18n.changeLanguage(current === 'pt' ? 'en' : 'pt')}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[.88rem] text-[var(--text-heading)] hover:bg-[var(--bg-primary)]"
    >
      <Globe size={16} />
      <span>{current === 'pt' ? '🇧🇷 Português → 🇺🇸 English' : '🇺🇸 English → 🇧🇷 Português'}</span>
    </button>
  );
};

/** Botão compacto PT | EN para telas públicas (login, landing), fora do menu do usuário. */
export const LanguageToggle = ({ className = '' }: { className?: string }) => {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('en') ? 'en' : 'pt';

  return (
    <div className={`inline-flex items-center gap-1 ${className}`.trim()} role="group" aria-label="Language">
      <Globe size={16} aria-hidden="true" />
      {LANGUAGES.map((lng) => (
        <button
          key={lng} type="button" onClick={() => i18n.changeLanguage(lng)} aria-pressed={current === lng}
          className={`cursor-pointer border-0 bg-transparent font-[inherit] text-inherit hover:opacity-100 ${current === lng ? 'font-bold opacity-100' : 'opacity-60'}`}
        >{lng.toUpperCase()}</button>
      ))}
    </div>
  );
};
