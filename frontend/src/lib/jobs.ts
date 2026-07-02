import type { JobSummary } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import { createTranslator } from "@/lib/i18n";

export function hasActiveJob(jobs: JobSummary[] | undefined) {
  return !!jobs?.some((j) => j.status !== "completed");
}

export function formatRelative(date: string, locale: Locale) {
  const { t } = createTranslator(locale);
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("time.justNow");
  if (mins < 60) return t("time.minutesAgo", { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("time.hoursAgo", { n: hrs });
  return new Date(date).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

export function supportInboxName(locale: Locale) {
  return createTranslator(locale).t("product.supportInbox");
}

export function computeJobStats(jobs: JobSummary[] | undefined) {
  const list = jobs ?? [];
  return {
    total: list.length,
    active: list.filter((j) => j.status === "processing").length,
    processing: list.filter((j) => j.status === "processing").length,
    completed: list.filter((j) => j.status === "completed").length,
    messages: list.reduce((s, j) => s + j.total_items, 0),
    processed: list.reduce((s, j) => s + j.counts.done, 0),
    queued: list.reduce((s, j) => s + j.counts.queued + j.counts.processing, 0),
    failed: list.reduce((s, j) => s + j.counts.failed, 0),
  };
}

export type JobFilter = "all" | "processing" | "completed";

export function filterJobs(jobs: JobSummary[], filter: JobFilter, query: string) {
  let result = jobs;
  if (filter === "processing") result = result.filter((j) => j.status === "processing");
  if (filter === "completed") result = result.filter((j) => j.status === "completed");
  if (query.trim()) {
    const q = query.toLowerCase();
    result = result.filter((j) => j.id.toLowerCase().includes(q));
  }
  return result;
}
