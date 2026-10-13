import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import type { LineItem } from "ordercloud-javascript-sdk";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { getProductImage, getStockStatus } from "@/lib/product";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductImage } from "@/components/product/ProductImage";
import { QuantityStepper } from "@/components/product/QuantityStepper";
import { StockBadge } from "@/components/product/StockBadge";

interface LineItemRowProps {
  lineItem: LineItem;
  currency?: string;
  editable?: boolean;
  compact?: boolean;
  /** Aggregate stock for this line's product — looked up separately since LineItem.Product is a lightweight snapshot without Inventory. */
  quantityAvailable?: number;
  onPatch?: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
}

export function LineItemRow({
  lineItem,
  currency = "AUD",
  editable = true,
  compact = false,
  quantityAvailable,
  onPatch,
  onRemove,
}: LineItemRowProps) {
  const [quantity, setQuantity] = useState(lineItem.Quantity ?? 1);
  const debounced = useDebounce(quantity, 350);
  const lastSent = useRef(lineItem.Quantity ?? 1);

  useEffect(() => {
    if (debounced !== lastSent.current && lineItem.ID) {
      lastSent.current = debounced;
      onPatch?.(lineItem.ID, debounced);
    }
  }, [debounced, lineItem.ID, onPatch]);

  // Never let this line sit above what's actually available (e.g. stock dropped after adding).
  useEffect(() => {
    if (quantityAvailable === undefined) return;
    setQuantity((q) => Math.min(q, Math.max(1, quantityAvailable)));
  }, [quantityAvailable]);

  const image = getProductImage(lineItem.Product as never);
  const stockStatus = getStockStatus(quantityAvailable);
  const outOfStock = stockStatus === "out-of-stock";
  const hasDiscount = (lineItem.PromotionDiscount ?? 0) > 0;
  const unitPriceAfterDiscount =
    hasDiscount && lineItem.Quantity
      ? (lineItem.LineTotal ?? 0) / lineItem.Quantity
      : lineItem.UnitPrice;

  return (
    <div className="flex gap-4">
      <Link
        to={`/products/${lineItem.Product?.ID}`}
        className="shrink-0"
      >
        <ProductImage
          src={image}
          alt={lineItem.Product?.Name}
          className={cn(
            "rounded-xl border border-border p-1.5",
            compact ? "size-20" : "size-24",
          )}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/products/${lineItem.Product?.ID}`}
            className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary"
          >
            {lineItem.Product?.Name}
          </Link>
          <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
            {hasDiscount ? (
              <span className="flex flex-col items-end gap-0.5">
                <span className="text-primary">
                  {formatPrice(lineItem.LineTotal, currency)}
                </span>
                <span className="text-xs font-normal text-muted-foreground line-through">
                  {formatPrice(lineItem.LineSubtotal, currency)}
                </span>
              </span>
            ) : (
              formatPrice(lineItem.LineSubtotal, currency)
            )}
          </span>
        </div>

        <StockBadge status={stockStatus} quantityAvailable={quantityAvailable} className="mt-1" />

        {lineItem.Specs && lineItem.Specs.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lineItem.Specs.map((s) => `${s.Name}: ${s.Value}`).join(" · ")}
          </p>
        )}

        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {formatPrice(unitPriceAfterDiscount, currency)} each
          {hasDiscount && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
              Trade Price
            </span>
          )}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          {editable ? (
            <div className="flex flex-col gap-1">
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                max={quantityAvailable ?? 999}
                disabled={outOfStock}
                className="h-9"
              />
              {!outOfStock && quantityAvailable !== undefined && quantity >= quantityAvailable && (
                <p className="text-xs text-muted-foreground">
                  Only {quantityAvailable} available
                </p>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              Qty {lineItem.Quantity}
            </span>
          )}
          {editable && (
            <button
              type="button"
              onClick={() => lineItem.ID && onRemove?.(lineItem.ID)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
