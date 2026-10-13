import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { StockStatus } from "@/lib/product";

interface StockBadgeProps {
  status: StockStatus;
  /** Shown alongside "Low stock" when the caller has a specific quantity to report. */
  quantityAvailable?: number;
  className?: string;
}

const STATUS_CONFIG = {
  "out-of-stock": {
    label: "Out of stock",
    icon: XCircle,
    classes: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-400/30",
  },
  "low-stock": {
    label: "Low stock",
    icon: AlertTriangle,
    classes:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/30",
  },
  "in-stock": {
    label: "In stock",
    icon: CheckCircle2,
    classes:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/30",
  },
} as const;

/** Icon + label stock-status pill — same tiers used on the grid, PDP, and cart. */
export function StockBadge({ status, quantityAvailable, className }: StockBadgeProps) {
  const { label, icon: Icon, classes } = STATUS_CONFIG[status];
  const text = status === "low-stock" && quantityAvailable !== undefined
    ? `Low stock — ${quantityAvailable} left`
    : label;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        classes,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {text}
    </span>
  );
}
