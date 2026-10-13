import { useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

import { formatPrice } from "@/lib/currency";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LineItemRow } from "@/components/cart/LineItemRow";
import { PromoCodeInput } from "@/components/cart/PromoCodeInput";
import { useCart, useCartUI } from "@/hooks/use-cart";

export function CartSheet() {
  const { isOpen, setOpen, close } = useCartUI();
  const {
    orderWorksheet,
    worksheetLoading,
    lineItems,
    itemCount,
    patchCartLineItem,
    deleteCartLineItem,
  } = useCart();
  const navigate = useNavigate();

  const order = orderWorksheet?.Order;
  const currency = order?.Currency || "AUD";
  const hasItems = lineItems.length > 0;

  const goTo = (path: string) => {
    close();
    navigate(path);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5" />
            Your bag {itemCount > 0 && `(${itemCount})`}
          </SheetTitle>
        </SheetHeader>

        {worksheetLoading ? (
          <div className="flex flex-1 flex-col gap-4 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-20 rounded-xl" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : hasItems ? (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-2">
              {lineItems.map((li) => (
                <LineItemRow
                  key={li.ID}
                  lineItem={li}
                  currency={currency}
                  compact
                  onPatch={(id, quantity) =>
                    patchCartLineItem({ ID: id, lineItem: { Quantity: quantity } })
                  }
                  onRemove={(id) => deleteCartLineItem(id)}
                />
              ))}
            </div>

            <div className="border-t border-border p-6 space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-base font-semibold text-foreground tabular-nums">
                  {formatPrice(order?.Subtotal ?? 0, currency)}
                </span>
              </div>
              <PromoCodeInput
                appliedPromotions={orderWorksheet?.OrderPromotions ?? []}
                currency={currency}
              />
              <p className="text-xs text-muted-foreground">
                Shipping &amp; taxes calculated at checkout.
              </p>
              <div className="flex flex-col gap-2">
                <Button size="lg" onClick={() => goTo("/checkout")}>
                  Checkout
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => goTo("/cart")}
                >
                  View bag
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Your bag is empty</p>
              <p className="text-sm text-muted-foreground">
                Find something brilliant to fill it.
              </p>
            </div>
            <Separator />
            <Button onClick={() => goTo("/products")}>Start shopping</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
