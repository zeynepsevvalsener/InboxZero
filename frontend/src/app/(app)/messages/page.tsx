"use client";

import { ItemDrawer } from "@/components/jobs/item-drawer";
import { StatusBadge } from "@/components/jobs/status-badge";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type Item } from "@/lib/api";
import { categoryLabel, priorityLabel } from "@/lib/labels";
import { supportInboxName } from "@/lib/jobs";
import { useI18n } from "@/providers/I18nProvider";
import { useQuery } from "@tanstack/react-query";
import { Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProcessedMessage = Item & { jobId: string };

type ProcessedMessagesResult = {
  messages: ProcessedMessage[];
  hasActive: boolean;
};

async function fetchProcessedMessages(): Promise<ProcessedMessagesResult> {
  const jobs = await api.listJobs();
  const recent = jobs.slice(0, 15);
  const details = await Promise.all(recent.map((j) => api.getJob(j.id)));
  const messages = details
    .flatMap((job) =>
      job.items
        .filter((i) => i.status === "done" || i.status === "failed")
        .map((i) => ({ ...i, jobId: job.id })),
    )
    .sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  const hasActive = details.some((job) => job.status !== "completed");
  return { messages, hasActive };
}

export default function MessagesPage() {
  const [selected, setSelected] = useState<ProcessedMessage | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t, locale } = useI18n();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["processed-messages"],
    queryFn: fetchProcessedMessages,
    // Poll only while a job is still processing; stop once everything is terminal.
    refetchInterval: (q) => (q.state.data?.hasActive ? 5000 : false),
  });

  const messages = data?.messages;

  const counts = useMemo(() => {
    const list = messages ?? [];
    return {
      total: list.length,
      completed: list.filter((m) => m.status === "done").length,
      failed: list.filter((m) => m.status === "failed").length,
    };
  }, [messages]);

  return (
    <>
      <AppHeader title={t("messages.title")} description={t("messages.description")} />
      <main className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {isLoading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : (
            <>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted">{t("common.totalAnalyzed")}</p>
                  <p className="text-2xl font-semibold tabular-nums">{counts.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted">{t("common.completed")}</p>
                  <p className="text-2xl font-semibold tabular-nums text-accent">
                    {counts.completed}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted">{t("status.failed")}</p>
                  <p className="text-2xl font-semibold tabular-nums text-danger">
                    {counts.failed}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {isLoading && <p className="text-sm text-muted">{t("common.loadingAnalysis")}</p>}

        {isError && (
          <Card>
            <CardContent className="py-8 text-center text-danger">{t("messages.loadError")}</CardContent>
          </Card>
        )}

        {!isLoading && !isError && (messages?.length ?? 0) === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Inbox className="mb-4 h-10 w-10 text-muted" />
              <h3 className="text-lg font-medium">{t("messages.emptyTitle")}</h3>
              <p className="mt-2 max-w-md text-sm text-muted">{t("messages.emptyDesc")}</p>
              <Button asChild className="mt-6">
                <Link href="/jobs/new">
                  <Plus className="h-4 w-4" />
                  {t("product.newJob")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {(messages?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.customerMessage")}</TableHead>
                  <TableHead>{t("table.category")}</TableHead>
                  <TableHead>{t("table.priority")}</TableHead>
                  <TableHead>{t("common.batchCol")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages?.map((msg) => (
                  <TableRow
                    key={msg.id}
                    className="cursor-pointer hover:bg-background/50"
                    onClick={() => {
                      setSelected(msg);
                      setDrawerOpen(true);
                    }}
                  >
                    <TableCell>
                      <StatusBadge status={msg.status} />
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm">{msg.input_text}</TableCell>
                    <TableCell>{categoryLabel(msg.category, locale)}</TableCell>
                    <TableCell>{priorityLabel(msg.priority, locale)}</TableCell>
                    <TableCell className="text-muted">{supportInboxName(locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <ItemDrawer
          item={selected}
          jobId={selected?.jobId ?? ""}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </main>
    </>
  );
}
