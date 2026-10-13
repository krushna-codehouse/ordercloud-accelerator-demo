import { formatPrice } from "@/lib/currency";
import { useTradePrice } from "@/hooks/use-trade-pricing";
import { cn } from "@/lib/utils";

interface PriceTagProps {
  productId?: string;
  price?: number;
  currency?: string;
  size?: "sm" | "lg";
  className?: string;
}

/** Shows a plain price, or — for an eligible signed-in shopper — the
 * discounted price with the original struck through and a badge. Used
 * everywhere a product's price appears before it's in a cart (listing,
 * search results, related-products rail, PDP). */
export function PriceTag({
  productId,
  price,
  currency = "AUD",
  size = "sm",
  className,
}: PriceTagProps) {
  const trade = useTradePrice(productId, price);
  const priceClass = size === "lg" ? "text-3xl font-bold" : "font-display text-lg font-semibold";

  if (!trade) {
    return (
      <span className={cn(priceClass, className)}>{formatPrice(price, currency)}</span>
    );
  }

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn(priceClass, "text-primary")}>
        {formatPrice(trade.discounted, currency)}
      </span>
      <span className="text-sm text-muted-foreground line-through">
        {formatPrice(trade.original, currency)}
      </span>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        {trade.label}
      </span>
    </span>
  );
}
