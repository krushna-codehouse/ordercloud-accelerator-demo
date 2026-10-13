import { Truck } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ShipMethodLike {
  ID?: string;
  Name?: string;
  Cost?: number;
  EstimatedTransitDays?: number;
}

interface ShippingMethodsProps {
  methods: ShipMethodLike[];
  value?: string;
  onChange: (id: string) => void;
  currency?: string;
}

export function ShippingMethods({
  methods,
  value,
  onChange,
  currency = "AUD",
}: ShippingMethodsProps) {
  if (!methods.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <Truck className="mx-auto mb-2 size-6" />
        No shipping methods available for this address yet.
      </div>
    );
  }

  return (
    <RadioGroup value={value} onValueChange={onChange} className="gap-3">
      {methods.map((method) => {
        const id = method.ID ?? "";
        const selected = value === id;
        return (
          <Label
            key={id}
            htmlFor={`ship-${id}`}
            className={cn(
              "flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors",
              selected
                ? "border-primary bg-accent/50"
                : "border-border hover:border-muted-foreground/40",
            )}
          >
            <RadioGroupItem id={`ship-${id}`} value={id} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {method.Name}
              </p>
              <p className="text-xs text-muted-foreground">
                {method.EstimatedTransitDays === 1
                  ? "Next business day"
                  : `${method.EstimatedTransitDays ?? "3–5"} business days`}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {method.Cost === 0
                ? "Free"
                : formatPrice(method.Cost, currency)}
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
