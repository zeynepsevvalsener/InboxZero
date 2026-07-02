import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-colors",
  {
    variants: {
      variant: {
        queued: "border-border bg-background/60 text-muted",
        processing: "border-primary/40 bg-primary/15 text-primary",
        done: "border-accent/40 bg-accent/15 text-[#7ec4c8]",
        completed: "border-accent/40 bg-accent/15 text-[#7ec4c8]",
        failed: "border-danger/40 bg-danger/15 text-danger",
        default: "border-border bg-card text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
