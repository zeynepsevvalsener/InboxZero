"use client";

import { useI18n } from "@/providers/I18nProvider";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function JobCompletionBanner({
  done,
  failed,
  total,
}: {
  done: number;
  failed: number;
  total: number;
}) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-5 py-4"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <div>
        <p className="font-medium text-accent">{t("jobDetail.batchComplete")}</p>
        <p className="mt-1 text-sm text-muted">
          {t("jobDetail.batchCompleteDesc", { done, failed, total })}
        </p>
      </div>
    </motion.div>
  );
}
