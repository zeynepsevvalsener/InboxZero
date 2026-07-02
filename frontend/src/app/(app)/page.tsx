"use client";

import { DashboardHero } from "@/components/layout/app-header";
import { ProgressBar } from "@/components/jobs/progress";
import { StatusBadge } from "@/components/jobs/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { computeJobStats, formatRelative, hasActiveJob, supportInboxName } from "@/lib/jobs";
import { useI18n } from "@/providers/I18nProvider";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, Inbox, Plus, Workflow } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { t, locale } = useI18n();

  const { data: jobs, isLoading, isError } = useQuery({
    queryKey: ["jobs"],
    queryFn: api.listJobs,
    refetchInterval: (q) => (hasActiveJob(q.state.data) ? 2000 : false),
  });

  const stats = computeJobStats(jobs);

  const statCards = [
    { label: t("dashboard.processingJobs"), value: stats.active, suffix: t("common.active"), icon: Workflow },
    { label: t("dashboard.messagesProcessed"), value: stats.processed, suffix: t("common.total"), icon: CheckCircle2 },
    { label: t("dashboard.queue"), value: stats.queued, suffix: t("common.waiting"), icon: Clock },
    { label: t("dashboard.failed"), value: stats.failed, suffix: t("common.messages"), icon: AlertTriangle },
  ];

  return (
    <>
      <DashboardHero />
      <main className="flex-1 space-y-8 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="transition-transform hover:-translate-y-0.5">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted">{card.label}</CardTitle>
                    <Icon className="h-4 w-4 text-muted" />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <>
                        <p className="text-3xl font-semibold tabular-nums text-foreground">
                          {card.value.toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-muted">{card.suffix}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{t("dashboard.recentJobs")}</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/jobs">{t("common.viewAll")}</Link>
            </Button>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          )}

          {isError && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-danger">
                {t("dashboard.loadError")}
              </CardContent>
            </Card>
          )}

          {!isLoading && !isError && jobs?.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
                  <Inbox className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-foreground">{t("dashboard.emptyTitle")}</h3>
                <p className="mt-2 max-w-md text-sm text-muted">{t("dashboard.emptyDesc")}</p>
                <Button asChild className="mt-6">
                  <Link href="/jobs/new">
                    <Plus className="h-4 w-4" />
                    {t("product.newJob")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {jobs?.slice(0, 6).map((job) => (
              <motion.div key={job.id} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                <Link href={`/jobs/${job.id}`}>
                  <Card className="cursor-pointer">
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-foreground">{supportInboxName(locale)}</p>
                          <StatusBadge status={job.status} />
                        </div>
                        <p className="text-xs text-muted">
                          {t("common.created")} {formatRelative(job.created_at, locale)} · {job.total_items}{" "}
                          {t("common.messages").toLowerCase()}
                        </p>
                      </div>
                      <div className="w-full sm:max-w-xs">
                        <ProgressBar counts={job.counts} total={job.total_items} progress={job.progress} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
