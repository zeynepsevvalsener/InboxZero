import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  accent?: "primary" | "accent" | "danger" | "muted";
}) {
  const accentClass = {
    primary: "text-primary",
    accent: "text-accent",
    danger: "text-danger",
    muted: "text-muted",
  }[accent ?? "muted"];

  return (
    <Card className="transition-transform hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted">{label}</CardTitle>
        <Icon className={cn("h-4 w-4", accentClass)} />
      </CardHeader>
      <CardContent>
        <p className={cn("text-3xl font-semibold tabular-nums", accentClass)}>{value}</p>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </CardContent>
    </Card>
  );
}
