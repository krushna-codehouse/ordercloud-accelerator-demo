import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";

interface OrderLike {
  Subtotal?: number;
  ShippingCost?: number;
  TaxCost?: number;
  PromotionDiscount?: number;
  Total?: number;
  Currency?: string;
}

interface OrderSummaryProps {
  order?: OrderLike;
  /** Show shipping/tax as "calculated at checkout" rather than a value. */
  pending?: boolean;
  className?: string;
}

export function OrderSummary({ order, pending, className }: OrderSummaryProps) {
  const currency = order?.Currency || "AUD";
  const shipping = order?.ShippingCost ?? 0;
  const tax = order?.TaxCost ?? 0;
  const discount = order?.PromotionDiscount ?? 0;

  return (
    <dl className={cn("space-y-3 text-sm", className)}>
      <Row label="Subtotal" value={formatPrice(order?.Subtotal ?? 0, currency)} />

      <Row
        label="Shipping"
        value={
          pending && shipping === 0
            ? "Calculated at checkout"
            : shipping === 0
              ? "Free"
              : formatPrice(shipping, currency)
        }
        muted={pending && shipping === 0}
      />

      {(tax > 0 || !pending) && (
        <Row
          label="Tax"
          value={
            pending && tax === 0
              ? "Calculated at checkout"
              : formatPrice(tax, currency)
          }
          muted={pending && tax === 0}
        />
      )}

      {discount > 0 && (
        <Row
          label="Discount"
          value={`−${formatPrice(discount, currency)}`}
          accent
        />
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">
          {formatPrice(order?.Total ?? order?.Subtotal ?? 0, currency)}
        </dd>
      </div>
    </dl>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          muted && "text-xs text-muted-foreground",
          accent && "font-medium text-primary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
