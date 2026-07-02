"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Item, ItemStatus } from "@/lib/api";
import { categoryLabel, priorityLabel, sentimentLabel, PRIORITY_RANK } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/providers/I18nProvider";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { ItemDrawer } from "./item-drawer";
import { StatusBadge } from "./status-badge";

const MotionTableRow = motion(TableRow);

type SortColumn = "category" | "priority";
type SortDirection = "asc" | "desc";

function sortItems(
  items: Item[],
  column: SortColumn,
  direction: SortDirection,
  locale: Locale,
): Item[] {
  const dir = direction === "asc" ? 1 : -1;
  const none = categoryLabel(null, locale);
  return [...items].sort((a, b) => {
    if (column === "category") {
      const aVal = categoryLabel(a.category, locale);
      const bVal = categoryLabel(b.category, locale);
      if (aVal === none && bVal !== none) return 1;
      if (bVal === none && aVal !== none) return -1;
      return aVal.localeCompare(bVal) * dir;
    }
    const aRank = a.priority ? (PRIORITY_RANK[a.priority.toLowerCase()] ?? 99) : 0;
    const bRank = b.priority ? (PRIORITY_RANK[b.priority.toLowerCase()] ?? 99) : 0;
    if (aRank === 0 && bRank !== 0) return 1;
    if (bRank === 0 && aRank !== 0) return -1;
    return (aRank - bRank) * dir;
  });
}

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn | null;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const active = activeColumn === column;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted",
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  );
}

const FILTERS_KEYS: (ItemStatus | "all")[] = ["all", "queued", "processing", "done", "failed"];

export function ItemsTable({
  items,
  jobId,
  onRetry,
  retryingId,
  loading,
}: {
  items: Item[];
  jobId: string;
  onRetry: (itemId: string) => void;
  retryingId?: string;
  loading?: boolean;
}) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<Item | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<ItemStatus | "all">("all");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter],
  );

  const sorted = useMemo(() => {
    if (!sortColumn) return filtered;
    return sortItems(filtered, sortColumn, sortDirection, locale);
  }, [filtered, sortColumn, sortDirection, locale]);

  const counts = useMemo(
    () =>
      (["queued", "processing", "done", "failed"] as const).reduce(
        (acc, key) => {
          acc[key] = items.filter((i) => i.status === key).length;
          return acc;
        },
        {} as Record<ItemStatus, number>,
      ),
    [items],
  );

  const openItem = (item: Item) => {
    setSelected(item);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-muted">{t("common.loadingAnalysis")}</p>
    );
  }

  const filterLabel = (key: ItemStatus | "all") =>
    key === "all" ? t("filters.all") : t(`filters.${key}` as "filters.queued");

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS_KEYS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted hover:text-foreground",
              )}
            >
              {filterLabel(f)}
              {f !== "all" && (
                <span className="ml-1.5 tabular-nums opacity-70">
                  {counts[f as ItemStatus]}
                </span>
              )}
              {f === "all" && (
                <span className="ml-1.5 tabular-nums opacity-70">{items.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.customerMessage")}</TableHead>
                <SortableHeader
                  label={t("table.category")}
                  column="category"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label={t("table.priority")}
                  column="priority"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <TableHead>{t("table.sentiment")}</TableHead>
                <TableHead>{t("table.attempts")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((item) => (
                <MotionTableRow
                  key={`${item.id}-${item.status}`}
                  layout
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="cursor-pointer hover:bg-background/50"
                  onClick={() => openItem(item)}
                >
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">
                    {item.input_text}
                  </TableCell>
                  <TableCell>{categoryLabel(item.category, locale)}</TableCell>
                  <TableCell>{priorityLabel(item.priority, locale)}</TableCell>
                  <TableCell>{sentimentLabel(item.sentiment, locale)}</TableCell>
                  <TableCell className="tabular-nums">{item.attempts}</TableCell>
                  <TableCell className="text-right">
                    {item.retryable && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetry(item.id);
                        }}
                        disabled={retryingId === item.id}
                      >
                        <RotateCcw
                          className={cn(
                            "h-3.5 w-3.5",
                            retryingId === item.id && "animate-spin",
                          )}
                        />
                        {t("common.retry")}
                      </Button>
                    )}
                  </TableCell>
                </MotionTableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted">
                    {t("common.noMessagesFilter")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ItemDrawer
        item={selected}
        jobId={jobId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onRetry={onRetry}
        retryingId={retryingId}
      />
    </>
  );
}
