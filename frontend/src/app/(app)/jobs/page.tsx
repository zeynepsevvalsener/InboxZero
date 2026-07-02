"use client";

import { PipelineOverview } from "@/components/dashboard/pipeline-overview";
import { StatCard } from "@/components/dashboard/stat-card";
import { JobsCardList } from "@/components/jobs/jobs-card-list";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { computeJobStats, filterJobs, hasActiveJob, type JobFilter } from "@/lib/jobs";
import { useI18n } from "@/providers/I18nProvider";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Inbox, Plus, Radio, Search, Workflow } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function JobsPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<JobFilter>("all");
  const [search, setSearch] = useState("");

  const FILTERS: { id: JobFilter; label: string }[] = [
    { id: "all", label: t("filters.all") },
    { id: "processing", label: t("filters.processing") },
    { id: "completed", label: t("status.completed") },
  ];

  const { data: jobs, isLoading, isError } = useQuery({
    queryKey: ["jobs"],
    queryFn: api.listJobs,
    refetchInterval: (q) => (hasActiveJob(q.state.data) ? 2000 : false),
  });

  const stats = useMemo(() => computeJobStats(jobs), [jobs]);
  const filtered = useMemo(() => filterJobs(jobs ?? [], filter, search), [jobs, filter, search]);
  const isLive = hasActiveJob(jobs);

  return (
    <>
      <AppHeader title={t("jobs.title")} description={t("jobs.description")} />
      <main className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <StatCard
                label={t("jobs.statJobs")}
                value={stats.active}
                description={t("jobs.statJobsDesc", { active: stats.active, completed: stats.completed })}
                icon={Workflow}
              />
              <StatCard
                label={t("jobs.statProcessed")}
                value={stats.processed}
                description={t("jobs.statProcessedDesc", { total: stats.messages })}
                icon={CheckCircle2}
                accent="accent"
              />
              <StatCard
                label={t("jobs.statQueue")}
                value={stats.queued}
                description={t("jobs.statQueueDesc")}
                icon={Clock}
                accent="primary"
              />
              <StatCard
                label={t("jobs.statFailed")}
                value={stats.failed}
                description={t("jobs.statFailedDesc")}
                icon={AlertTriangle}
                accent="danger"
              />
            </>
          )}
        </div>

        <PipelineOverview />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  filter === f.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:bg-accent/10 hover:text-foreground",
                )}
              >
                {f.label}
                {f.id === "processing" && stats.processing > 0 && (
                  <span className="ml-1.5 text-xs">({stats.processing})</span>
                )}
              </button>
            ))}
            {isLive && (
              <Badge variant="processing" className="ml-1">
                <Radio className="mr-1 h-3 w-3" />
                {t("common.live")}
              </Badge>
            )}
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading && (
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="py-8 text-center text-danger">{t("dashboard.loadError")}</CardContent>
          </Card>
        )}

        {!isLoading && !isError && (jobs?.length ?? 0) === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Inbox className="mb-4 h-10 w-10 text-muted" />
              <h3 className="text-lg font-medium">{t("jobs.emptyTitle")}</h3>
              <p className="mt-2 max-w-md text-sm text-muted">{t("jobs.emptyDesc")}</p>
              <Button asChild className="mt-6">
                <Link href="/jobs/new">
                  <Plus className="h-4 w-4" />
                  {t("product.newJob")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && (jobs?.length ?? 0) > 0 && filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted">{t("common.noMatch")}</CardContent>
          </Card>
        )}

        {!isLoading && filtered.length > 0 && <JobsCardList jobs={filtered} />}
      </main>
    </>
  );
}
