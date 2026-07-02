import type { Locale } from "@/lib/i18n";
import { createTranslator } from "@/lib/i18n";

export function formatDistanceToNow(timestamp: number, locale: Locale = "en"): string {
  const { t } = createTranslator(locale);
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return t("time.justNow");
  if (seconds < 60) return t("time.secondsAgo", { n: seconds });
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return t("time.minutesShort", { n: mins });
  const hrs = Math.floor(mins / 60);
  return t("time.hoursShort", { n: hrs });
}
