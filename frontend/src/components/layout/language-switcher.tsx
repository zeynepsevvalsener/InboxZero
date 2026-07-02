"use client";

import { useI18n } from "@/providers/I18nProvider";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { Languages } from "lucide-react";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "tr", label: "TR" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border bg-background/60 p-1",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <Languages className="mx-1.5 h-3.5 w-3.5 text-muted" />
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLocale(opt.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            locale === opt.value
              ? "bg-primary/15 text-primary"
              : "text-muted hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
