"use client";

import { Button } from "@/components/ui/button";
import { clearToken } from "@/lib/auth";
import { useI18n } from "@/providers/I18nProvider";
import { cn } from "@/lib/utils";
import {
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Plus,
  Settings,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const navItems = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/jobs", label: t("nav.processingJobs"), icon: Workflow },
    { href: "/messages", label: t("nav.processedMessages"), icon: MessageSquareText },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
          <Inbox className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t("product.name")}</p>
          <p className="text-xs text-muted">{t("product.supportOps")}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:bg-accent/10 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted"
          onClick={() => {
            clearToken();
            router.replace("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          {t("nav.signOut")}
        </Button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/jobs", label: t("nav.processingJobs"), icon: Workflow },
    { href: "/messages", label: t("nav.processedMessages"), icon: MessageSquareText },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <nav className="flex border-t border-border bg-card md:hidden">
      {navItems.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs",
              active ? "text-primary" : "text-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="max-w-[4.5rem] truncate text-center text-[10px]">
              {item.label.split(" ")[0]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function NewProcessingJobButton({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <Button asChild className={className}>
      <Link href="/jobs/new">
        <Plus className="h-4 w-4" />
        {t("product.newJob")}
      </Link>
    </Button>
  );
}

export const NewBatchButton = NewProcessingJobButton;
