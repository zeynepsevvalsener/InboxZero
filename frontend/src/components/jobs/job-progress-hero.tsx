"use client";

import type { JobCounts } from "@/lib/api";
import { ProgressBar, StatusCounts } from "@/components/jobs/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/providers/I18nProvider";
import { motion } from "framer-motion";

export function JobProgressHero({
  counts,
  total,
  progress,
  status,
}: {
  counts: JobCounts;
  total: number;
  progress: number;
  status: string;
}) {
  const { t } = useI18n();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-background/30 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("jobDetail.progressTitle")}</CardTitle>
          <motion.span
            key={progress}
            initial={{ scale: 1.1, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-bold tabular-nums text-primary"
          >
            {progress}%
          </motion.span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <ProgressBar counts={counts} total={total} progress={progress} />
        <StatusCounts counts={counts} />
        {status === "completed" && (
          <p className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-xs text-muted">
            {t("jobDetail.progressComplete", {
              done: counts.done,
              failed: counts.failed,
              total,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
