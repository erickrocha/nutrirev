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
