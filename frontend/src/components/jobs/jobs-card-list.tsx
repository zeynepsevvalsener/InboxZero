"use client";

import { ProgressBar } from "@/components/jobs/progress";
import { StatusBadge } from "@/components/jobs/status-badge";
import type { JobSummary } from "@/lib/api";
import { formatRelative, supportInboxName } from "@/lib/jobs";
import { useI18n } from "@/providers/I18nProvider";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import Link from "next/link";

export function JobsCardList({ jobs }: { jobs: JobSummary[] }) {
  const { t, locale } = useI18n();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {jobs.map((job) => (
        <motion.div key={job.id} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
          <Link href={`/jobs/${job.id}`}>
            <article className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{supportInboxName(locale)}</h3>
                    {job.status === "processing" && (
                      <Radio className="h-3 w-3 animate-pulse text-primary" />
                    )}
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-2xl font-semibold tabular-nums text-primary">{job.progress}%</p>
              </div>
              <p className="mt-3 text-xs text-muted">
                {t("common.created")} {formatRelative(job.created_at, locale)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {job.total_items} {t("common.messages").toLowerCase()}
              </p>
              <div className="mt-4">
                <ProgressBar
                  counts={job.counts}
                  total={job.total_items}
                  progress={job.progress}
                  showLegend={false}
                />
              </div>
            </article>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
