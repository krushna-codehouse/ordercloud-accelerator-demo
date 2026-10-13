import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = ["Information", "Shipping", "Payment"];

export function CheckoutSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                done && "bg-primary text-primary-foreground",
                active && "border-2 border-primary text-primary",
                !done && !active && "border border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "ml-1 h-px flex-1",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
