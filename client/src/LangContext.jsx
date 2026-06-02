import { createContext, useContext, useState } from 'react';
import translations from './translations';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'th');

  const toggleLang = () => {
    const next = lang === 'en' ? 'th' : 'en';
    localStorage.setItem('lang', next);
    setLang(next);
  };

  const t = (key) => translations[lang][key] ?? translations['en'][key] ?? key;

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
