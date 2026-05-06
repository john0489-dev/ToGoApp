import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

const getSavedLang = (): string => {
  if (typeof window === "undefined") return "pt";
  try {
    return localStorage.getItem("togo_lang") || detectBrowserLang();
  } catch {
    return "pt";
  }
};

const detectBrowserLang = (): string => {
  if (typeof navigator === "undefined") return "pt";
  const lang = navigator.language || "";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("en")) return "en";
  return "pt";
};

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
    es: { translation: es },
  },
  lng: getSavedLang(),
  fallbackLng: "pt",
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = (lang: "pt" | "en" | "es") => {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem("togo_lang", lang);
  } catch {
    /* ignore */
  }
};

export const getCurrentLang = (): string => i18n.language;

export default i18n;
