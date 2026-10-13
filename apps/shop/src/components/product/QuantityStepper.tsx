import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 999,
  disabled,
  className,
}: QuantityStepperProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));

  return (
    <div
      className={cn(
        "inline-flex h-10 items-center rounded-full border border-input bg-background",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => set(value - 1)}
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-7 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => set(value + 1)}
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
