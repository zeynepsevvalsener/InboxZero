"use client";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useI18n } from "@/providers/I18nProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const MAX_ITEMS = 50;

const PLACEHOLDER = `I was charged twice for my subscription.
The application crashes when I save my profile.
Please add dark mode.
I forgot my password.`;

export default function NewJobPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const { t, locale } = useI18n();

  const items = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const overLimit = items.length > MAX_ITEMS;

  const mutation = useMutation({
    mutationFn: () => api.submitBatch(items, locale),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      router.push(`/jobs/${job.id}`);
    },
  });

  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.split(",")[0]?.trim())
        .filter(Boolean);
      setText(lines.join("\n"));
    };
    reader.readAsText(file);
  };

  return (
    <>
      <AppHeader
        title={t("newJob.title")}
        description={t("newJob.description")}
        showCta={false}
      />
      <main className="flex-1 p-6">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle>{t("newJob.cardTitle")}</CardTitle>
            <CardDescription>{t("newJob.cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="batch">{t("newJob.label")}</Label>
              <Textarea
                id="batch"
                placeholder={PLACEHOLDER}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[280px] font-mono text-sm"
              />
              <p className="text-xs text-muted">
                {t("newJob.tip", { fail: "FAIL" })}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {t("common.uploadCsv")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setText(PLACEHOLDER)}
                >
                  {t("common.loadExample")}
                </Button>
                <span className={overLimit ? "text-sm text-danger" : "text-sm text-muted"}>
                  {t("newJob.count", { n: items.length, max: MAX_ITEMS })}
                </span>
              </div>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || items.length === 0 || overLimit}
              >
                {mutation.isPending ? t("common.submitting") : t("common.startProcessing")}
              </Button>
            </div>

            {overLimit && (
              <p className="text-sm text-danger">{t("newJob.maxError", { max: MAX_ITEMS })}</p>
            )}
            {mutation.isError && (
              <p className="text-sm text-danger">{(mutation.error as Error).message}</p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
