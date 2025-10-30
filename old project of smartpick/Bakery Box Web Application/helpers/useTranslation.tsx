import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { translations, Language } from "./translationsMap";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

const getNestedTranslation = (
  obj: { [key: string]: any },
  key: string,
): string => {
  const keys = key.split(".");
  let result = obj;
  for (const k of keys) {
    if (result && typeof result === "object" && k in result) {
      result = result[k];
    } else {
      return key; // Return the key itself if not found
    }
  }
  return typeof result === "string" ? result : key;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const storedLang = window.localStorage.getItem("language");
      return storedLang === "en" || storedLang === "ka" ? storedLang : "ka";
    } catch (error) {
      console.error("Could not access localStorage:", error);
      return "ka";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("language", language);
    } catch (error) {
      console.error("Could not access localStorage:", error);
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = useCallback(
    (key: string): string => {
      return getNestedTranslation(translations[language], key);
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};