"use client";

import type { JobCounts } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/providers/I18nProvider";
import { Cpu } from "lucide-react";

export function QueueStatus({
  counts,
  isProcessing,
}: {
  counts: JobCounts;
  isProcessing: boolean;
}) {
  const { t } = useI18n();
  const pending = counts.queued + counts.processing;

  return (
    <Card className="hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted">
          <Cpu className="h-4 w-4 text-accent" />
          {t("jobDetail.liveStatus")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">{t("common.worker")}</span>
          <span className="flex items-center gap-2 font-medium text-accent">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            {t("common.online")}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t("common.queue")}</span>
          <span className="font-medium text-foreground">
            {t("jobDetail.queuePending", { n: pending })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t("jobDetail.currentlyProcessing")}</span>
          <span className="font-medium text-primary">{counts.processing}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t("common.completed")}</span>
          <span className="font-medium text-accent">{counts.done}</span>
        </div>
        {isProcessing && (
          <p className="border-t border-border pt-3 text-xs text-muted">
            {t("jobDetail.workerAsync")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
