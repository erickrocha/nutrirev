import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const currentLang = i18n.language?.startsWith('pt') ? 'pt' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'pt' ? 'en' : 'pt';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      type="button"
      className="dropdown-item"
      onClick={toggleLanguage}
      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
    >
      <Globe size={16} />
      <span>
        {currentLang === 'pt' ? '🇧🇷 Português → 🇺🇸 English' : '🇺🇸 English → 🇧🇷 Português'}
      </span>
    </button>
  );
};

// Botão compacto PT | EN para telas públicas (login, landing), fora do menu do usuário.
export const LanguageToggle = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('en') ? 'en' : 'pt';

  return (
    <div className={className} role="group" aria-label="Language" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      <Globe size={16} aria-hidden="true" />
      {['pt', 'en'].map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => i18n.changeLanguage(lng)}
          aria-pressed={current === lng}
          style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', fontWeight: current === lng ? 700 : 400, opacity: current === lng ? 1 : 0.6 }}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
};
