"use client";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NewProcessingJobButton } from "@/components/layout/app-sidebar";
import { useI18n } from "@/providers/I18nProvider";

export function AppHeader({
  title,
  description,
  showCta = true,
}: {
  title?: string;
  description?: string;
  showCta?: boolean;
}) {
  const { t } = useI18n();

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-card/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title ?? t("nav.dashboard")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {description ?? t("product.description")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <LanguageSwitcher />
        {showCta && <NewProcessingJobButton />}
      </div>
    </header>
  );
}

export function DashboardHero() {
  const { t } = useI18n();

  return (
    <header className="border-b border-border bg-card/50 px-6 py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            {t("product.tagline")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("product.name")}
          </h1>
          <p className="text-sm leading-relaxed text-muted">{t("product.description")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <LanguageSwitcher />
          <NewProcessingJobButton />
        </div>
      </div>
    </header>
  );
}
