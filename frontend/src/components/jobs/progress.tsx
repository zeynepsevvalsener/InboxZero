"use client";

import type { JobCounts } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nProvider";
import { motion } from "framer-motion";

export function ProgressBar({
  counts,
  total,
  progress,
  showLegend = true,
  className,
}: {
  counts: JobCounts;
  total: number;
  progress?: number;
  showLegend?: boolean;
  className?: string;
}) {
  const { t } = useI18n();

  if (total === 0) return null;

  const pct = (n: number) => `${(n / total) * 100}%`;
  const terminal = counts.done + counts.failed;
  const progressValue = progress ?? Math.round((terminal / total) * 100);

  return (
    <div className={cn("space-y-2", className)}>
      {showLegend && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">{t("common.progress")}</span>
          <span className="font-medium text-foreground">{progressValue}%</span>
        </div>
      )}
      <div className="flex h-2 overflow-hidden rounded-full bg-background">
        <motion.div
          className="h-full bg-accent"
          initial={false}
          animate={{ width: pct(counts.done) }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <motion.div
          className="h-full bg-danger"
          initial={false}
          animate={{ width: pct(counts.failed) }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <motion.div
          className="h-full bg-primary"
          initial={false}
          animate={{ width: pct(counts.processing) }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <motion.div
          className="h-full bg-border"
          initial={false}
          animate={{ width: pct(counts.queued) }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function StatusCounts({ counts }: { counts: JobCounts }) {
  const { t } = useI18n();

  const items = [
    { label: t("filters.queued"), value: counts.queued, color: "text-muted" },
    { label: t("filters.processing"), value: counts.processing, color: "text-primary" },
    { label: t("filters.done"), value: counts.done, color: "text-accent" },
    { label: t("filters.failed"), value: counts.failed, color: "text-danger" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-background/50 px-4 py-3"
        >
          <p className="text-xs text-muted">{item.label}</p>
          <p className={cn("mt-1 text-2xl font-semibold tabular-nums", item.color)}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
