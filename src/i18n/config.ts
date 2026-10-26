import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import zh_CN from "./locales/zh_CN.json";
import {
  LANGUAGE_STORAGE_KEY,
  readStoredLanguage,
  writeLanguageCookie,
} from "@/utils/language";

// 不添加 name 字段的语言将不会在语言切换菜单中显示
// not adding the name field will hide the language from the language switcher menu
const resources = {
  "en-US": {
    translation: en,
    name: "English",
  },
  "zh-CN": {
    translation: zh_CN,
    name: "简体中文",
  },
};

writeLanguageCookie(readStoredLanguage());

i18next.on("languageChanged", (language) => {
  writeLanguageCookie(language);
});

const i18n = i18next;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en-US",
    supportedLngs: ["zh-CN", "en-US"],
    interpolation: {
      escapeValue: false, // React handles XSS
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      convertDetectedLanguage: (language) => language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US",
    },
  });

export default i18n;
export { resources };
