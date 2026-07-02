"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/providers/I18nProvider";
import { ArrowRight, Cpu, Database, Inbox, Upload } from "lucide-react";

export function PipelineOverview() {
  const { t } = useI18n();

  const STEPS = [
    { icon: Upload, title: t("jobs.pipelineUpload"), desc: t("jobs.pipelineUploadDesc") },
    { icon: Database, title: t("jobs.pipelineQueue"), desc: t("jobs.pipelineQueueDesc") },
    { icon: Cpu, title: t("jobs.pipelineWorker"), desc: t("jobs.pipelineWorkerDesc") },
    { icon: Inbox, title: t("jobs.pipelineReview"), desc: t("jobs.pipelineReviewDesc") },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("jobs.pipelineTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative rounded-lg border border-border bg-background/50 p-4"
              >
                {i < STEPS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted lg:block" />
                )}
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
