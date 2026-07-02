"use client";

import { ItemsTable } from "@/components/jobs/items-table";
import { JobCompletionBanner } from "@/components/jobs/job-completion-banner";
import { JobLiveIndicator } from "@/components/jobs/job-live-indicator";
import { JobPipelineBanner } from "@/components/jobs/job-pipeline-banner";
import { JobProgressHero } from "@/components/jobs/job-progress-hero";
import { QueueStatus } from "@/components/jobs/queue-status";
import { StatusBadge } from "@/components/jobs/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useI18n } from "@/providers/I18nProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

function pipelineStep(counts: {
  queued: number;
  processing: number;
  done: number;
  failed: number;
}): "queue" | "worker" | "done" {
  if (counts.processing > 0) return "worker";
  if (counts.queued > 0) return "queue";
  return "done";
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string>();
  const { t, locale } = useI18n();

  const { data, isLoading, isError, error, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => api.getJob(jobId),
    refetchInterval: (q) =>
      q.state.data?.status === "completed" ? false : 2000,
  });

  const retry = useMutation({
    mutationFn: (itemId: string) => api.retryItem(jobId, itemId),
    onMutate: (itemId) => setRetryingId(itemId),
    onSettled: () => setRetryingId(undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const isLive = data?.status === "processing";
  const activeStep = useMemo(
    () => (data ? pipelineStep(data.counts) : "queue"),
    [data],
  );

  return (
    <>
      <header className="border-b border-border bg-card/50 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
              <Link href="/jobs">
                <ArrowLeft className="h-4 w-4" />
                {t("jobDetail.back")}
              </Link>
            </Button>
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">{t("jobDetail.title")}</h1>
                {data && <StatusBadge status={data.status} />}
              </div>
            )}
            {data && (
              <p className="text-sm text-muted">
                {data.total_items} {t("common.customerMessages")} · {t("common.batch")} #{jobId.slice(0, 8)} ·{" "}
                {new Date(data.created_at).toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
              </p>
            )}
          </div>
          {data && (
            <div className="w-full lg:max-w-xs">
              <QueueStatus counts={data.counts} isProcessing={isLive} />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 space-y-6 p-6">
        {isLoading && (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t("common.loadingStatus")}</p>
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="py-8 text-center text-danger">
              {(error as Error).message}
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <JobLiveIndicator
              isLive={isLive}
              isFetching={isFetching}
              dataUpdatedAt={dataUpdatedAt}
            />

            {data.status === "completed" && (
              <JobCompletionBanner
                done={data.counts.done}
                failed={data.counts.failed}
                total={data.total_items}
              />
            )}

            <JobPipelineBanner activeStep={activeStep} />

            <JobProgressHero
              counts={data.counts}
              total={data.total_items}
              progress={data.progress}
              status={data.status}
            />

            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("jobDetail.messagesTitle")}</h2>
                <p className="text-sm text-muted">{t("jobDetail.messagesDesc")}</p>
              </div>
              <ItemsTable
                items={data.items}
                jobId={jobId}
                onRetry={(id) => retry.mutate(id)}
                retryingId={retryingId}
              />
            </section>
          </>
        )}
      </main>
    </>
  );
}
