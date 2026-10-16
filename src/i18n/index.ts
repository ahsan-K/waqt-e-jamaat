import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ur from './locales/ur.json';
import urLatn from './locales/ur-Latn.json';
import type { Language } from './languages';

export const resources = {
  en: { translation: en },
  ur: { translation: ur },
  'ur-Latn': { translation: urLatn },
} as const;

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: (typeof resources)['en'];
  }
}

let initialised = false;

/** Initialise once (synchronously, resources are bundled) and follow the settings store. */
export function initI18n(language: Language) {
  if (initialised) return i18n;
  initialised = true;
  void i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return i18n;
}

export default i18n;
