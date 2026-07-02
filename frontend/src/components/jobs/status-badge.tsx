"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/providers/I18nProvider";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  CircleX,
  Clock,
  Loader2,
  type LucideIcon,
} from "lucide-react";

const STATUS_ICONS: Record<string, LucideIcon> = {
  queued: Clock,
  processing: Loader2,
  done: CheckCircle2,
  failed: CircleX,
  completed: CheckCircle2,
};

export function StatusBadge({
  status,
  showIcon = true,
  className,
}: {
  status: string;
  showIcon?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const Icon = STATUS_ICONS[status] ?? Clock;
  const spinning = status === "processing";
  const label = t(`status.${status}` as "status.queued") || status;

  return (
    <Badge variant={status as "queued"} className={cn("gap-1.5", className)}>
      {showIcon && (
        <Icon className={cn("h-3 w-3", spinning && "animate-spin")} />
      )}
      {label}
    </Badge>
  );
}
