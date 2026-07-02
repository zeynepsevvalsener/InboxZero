"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Item } from "@/lib/api";
import { categoryLabel, priorityLabel, sentimentLabel } from "@/lib/labels";
import { useI18n } from "@/providers/I18nProvider";
import { cn } from "@/lib/utils";
import { MessageSquare, RotateCcw } from "lucide-react";

import { StatusBadge } from "./status-badge";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

export function ItemDrawer({
  item,
  jobId,
  open,
  onOpenChange,
  onRetry,
  retryingId,
}: {
  item: Item | null;
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: (itemId: string) => void;
  retryingId?: string;
}) {
  const { t, locale } = useI18n();

  if (!item) return null;

  const isRetrying = retryingId === item.id;
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("drawer.title")}</SheetTitle>
          <SheetDescription>
            {t("drawer.subtitle", { id: jobId.slice(0, 8) })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <DetailRow
            label={t("drawer.currentStatus")}
            value={<StatusBadge status={item.status} />}
          />

          <DetailRow
            label={t("drawer.originalMessage")}
            value={
              <p className="rounded-lg border border-border bg-background/50 p-3 text-sm leading-relaxed">
                {item.input_text}
              </p>
            }
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <DetailRow label={t("drawer.category")} value={categoryLabel(item.category, locale)} />
            <DetailRow label={t("drawer.priority")} value={priorityLabel(item.priority, locale)} />
            <DetailRow label={t("drawer.sentiment")} value={sentimentLabel(item.sentiment, locale)} />
          </div>

          {item.summary && (
            <DetailRow
              label={t("drawer.summary")}
              value={
                <p className="rounded-lg border border-border bg-background/50 p-3 text-sm leading-relaxed">
                  {item.summary}
                </p>
              }
            />
          )}

          {item.suggested_reply && (
            <DetailRow
              label={t("drawer.suggestedReply")}
              value={
                <div className="flex gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p className="text-sm leading-relaxed">{item.suggested_reply}</p>
                </div>
              }
            />
          )}

          <DetailRow
            label={t("drawer.attempts")}
            value={
              <span className="tabular-nums">
                {item.attempts}
                {item.updated_at && (
                  <span className="ml-2 text-xs text-muted">
                    {t("drawer.updated", {
                      date: new Date(item.updated_at).toLocaleString(dateLocale),
                    })}
                  </span>
                )}
              </span>
            }
          />

          {item.status === "processing" && !item.retryable && (
            <p className="text-xs text-muted">
              {t("drawer.processingNote", { status: t("status.processing") })}
            </p>
          )}

          {(item.status === "failed" || item.retryable) && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 p-4">
              {item.error && (
                <>
                  <p className="text-xs font-medium uppercase tracking-wider text-danger">
                    {t("drawer.processingError")}
                  </p>
                  <p className="mt-2 text-sm text-danger/90">{item.error}</p>
                </>
              )}
              {onRetry && item.retryable && (
                <>
                  <p className="mt-3 text-xs text-muted">{t("drawer.retryDesc")}</p>
                  <Button
                    variant="danger"
                    size="sm"
                    className="mt-4"
                    onClick={() => onRetry(item.id)}
                    disabled={isRetrying}
                  >
                    <RotateCcw className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")} />
                    {isRetrying ? t("drawer.requeuing") : t("drawer.retryMessage")}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
