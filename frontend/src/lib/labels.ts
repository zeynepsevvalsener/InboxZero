import type { Locale } from "@/lib/i18n";
import { createTranslator } from "@/lib/i18n";

function enumLabel(
  group: "categories" | "priorities" | "sentiments",
  value: string | null,
  locale: Locale,
): string {
  const { t } = createTranslator(locale);
  if (!value) return t(`${group}.none`);
  const key = `${group}.${value.toLowerCase()}`;
  const label = t(key);
  return label === key ? value : label;
}

export function categoryLabel(category: string | null, locale: Locale = "en"): string {
  return enumLabel("categories", category, locale);
}

export function priorityLabel(priority: string | null, locale: Locale = "en"): string {
  return enumLabel("priorities", priority, locale);
}

export function sentimentLabel(sentiment: string | null, locale: Locale = "en"): string {
  return enumLabel("sentiments", sentiment, locale);
}

export const PRIORITY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
};
