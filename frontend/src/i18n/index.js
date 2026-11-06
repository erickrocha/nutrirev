import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import pt from './locales/pt.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
    },
    fallbackLng: 'pt',
    supportedLngs: ['pt', 'en'],
    interpolation: {
      escapeValue: false, // React already protects from XSS
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

const syncDocumentLanguage = (language) => {
  document.documentElement.lang = language?.startsWith('en') ? 'en-US' : 'pt-BR';
};

syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;
