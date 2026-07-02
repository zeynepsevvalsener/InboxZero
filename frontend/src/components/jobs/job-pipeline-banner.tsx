"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nProvider";
import { ArrowRight, Cpu, Database, Inbox, Zap } from "lucide-react";

export function JobPipelineBanner({ activeStep }: { activeStep: "queue" | "worker" | "done" }) {
  const { t } = useI18n();
  const stepIndex = { queue: 1, worker: 2, done: 3 }[activeStep];

  const STEPS = [
    { icon: Zap, label: t("jobDetail.pipelineApi"), key: "submit" },
    { icon: Database, label: t("jobDetail.pipelineRedis"), key: "queue" },
    { icon: Cpu, label: t("jobDetail.pipelineWorker"), key: "worker" },
    { icon: Inbox, label: t("jobDetail.pipelineDb"), key: "done" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
        {t("jobDetail.pipelineLabel")}
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:gap-0">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i <= stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <div key={step.key} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                  isCurrent && "bg-primary/15 text-primary ring-1 ring-primary/30",
                  isActive && !isCurrent && "text-accent",
                  !isActive && "text-muted",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isCurrent && "animate-pulse")} />
                {step.label}
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="mx-1 hidden h-3.5 w-3.5 text-muted sm:block" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
