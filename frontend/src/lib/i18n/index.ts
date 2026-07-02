import { en, type TranslationDict } from "./en";
import { tr } from "./tr";

export type Locale = "en" | "tr";

export const LOCALES: Locale[] = ["en", "tr"];
export const LOCALE_STORAGE_KEY = "inboxzero-locale";
export const DEFAULT_LOCALE: Locale = "en";

const dictionaries: Record<Locale, TranslationDict> = { en, tr };

export function getDictionary(locale: Locale): TranslationDict {
  return dictionaries[locale] ?? dictionaries.en;
}

type Interpolation = Record<string, string | number>;

function interpolate(template: string, params?: Interpolation): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    if (val === undefined) return `{${key}}`;
    if (key === "s" && "n" in params) {
      return Number(params.n) === 1 ? "" : "s";
    }
    return String(val);
  });
}

export function createTranslator(locale: Locale) {
  const dict = getDictionary(locale);

  function t(path: string, params?: Interpolation): string {
    const keys = path.split(".");
    let value: unknown = dict;
    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return path;
      }
    }
    if (typeof value !== "string") return path;
    return interpolate(value, params);
  }

  return { t, dict, locale };
}

export type Translator = ReturnType<typeof createTranslator>;
