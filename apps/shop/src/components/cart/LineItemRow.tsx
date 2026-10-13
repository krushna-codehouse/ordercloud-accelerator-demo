import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import type { LineItem } from "ordercloud-javascript-sdk";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { getProductImage } from "@/lib/product";
import { useDebounce } from "@/hooks/use-debounce";
import { ProductImage } from "@/components/product/ProductImage";
import { QuantityStepper } from "@/components/product/QuantityStepper";

interface LineItemRowProps {
  lineItem: LineItem;
  currency?: string;
  editable?: boolean;
  compact?: boolean;
  onPatch?: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
}

export function LineItemRow({
  lineItem,
  currency = "AUD",
  editable = true,
  compact = false,
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

  const image = getProductImage(lineItem.Product as never);

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
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {formatPrice(lineItem.LineSubtotal, currency)}
          </span>
        </div>

        {lineItem.Specs && lineItem.Specs.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lineItem.Specs.map((s) => `${s.Name}: ${s.Value}`).join(" · ")}
          </p>
        )}

        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatPrice(lineItem.UnitPrice, currency)} each
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          {editable ? (
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              className="h-9"
            />
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
