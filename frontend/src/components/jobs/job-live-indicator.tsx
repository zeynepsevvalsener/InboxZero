"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/time";
import { useI18n } from "@/providers/I18nProvider";
import { Pause, Radio, Wifi } from "lucide-react";

export function JobLiveIndicator({
  isLive,
  isFetching,
  dataUpdatedAt,
}: {
  isLive: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
}) {
  const { t, locale } = useI18n();

  if (!isLive) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3">
        <Pause className="h-4 w-4 text-accent" />
        <div>
          <p className="text-sm font-medium text-accent">{t("jobDetail.liveComplete")}</p>
          <p className="text-xs text-muted">{t("jobDetail.liveCompleteDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative flex h-8 w-8 items-center justify-center">
          <Radio className={cn("h-4 w-4 text-primary", isFetching && "animate-pulse")} />
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">{t("jobDetail.liveMonitoring")}</p>
          <p className="text-xs text-muted">{t("jobDetail.liveMonitoringDesc")}</p>
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Wifi className="h-3 w-3" />
          {t("jobDetail.lastUpdated")}
        </p>
        <p className="text-xs font-medium text-foreground">
          {formatDistanceToNow(dataUpdatedAt, locale)}
        </p>
      </div>
    </div>
  );
}
