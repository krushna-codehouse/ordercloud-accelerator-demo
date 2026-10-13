import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowRight, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { LineItemRow } from "@/components/cart/LineItemRow";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { FulfilmentChoice } from "@/components/cart/Fulfilment";
import { useCart } from "@/hooks/use-cart";
import { useProductStockByIds } from "@/hooks/use-product-stock";

export default function Cart() {
  const {
    orderWorksheet,
    worksheetLoading,
    lineItems,
    itemCount,
    patchCartLineItem,
    deleteCartLineItem,
    deleteCart,
  } = useCart();
  const navigate = useNavigate();
  const stockByProductId = useProductStockByIds(lineItems.map((li) => li.ProductID));

  const order = orderWorksheet?.Order;
  const currency = order?.Currency || "AUD";

  if (worksheetLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Skeleton className="mb-8 h-9 w-48" />
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!lineItems.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Once you add products they'll show up here, ready for checkout."
          action={
            <Button asChild>
              <Link to="/products">Start shopping</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Your bag
          <span className="ml-2 text-lg font-normal text-muted-foreground">
            ({itemCount} item{itemCount === 1 ? "" : "s"})
          </span>
        </h1>
        <button
          onClick={() => deleteCart()}
          className="hidden items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive sm:flex"
        >
          <Trash2 className="size-4" />
          Clear bag
        </button>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {lineItems.map((li, i) => (
            <div key={li.ID}>
              <LineItemRow
                lineItem={li}
                currency={currency}
                quantityAvailable={stockByProductId[li.ProductID]}
                onPatch={(id, quantity) =>
                  patchCartLineItem({ ID: id, lineItem: { Quantity: quantity } })
                }
                onRemove={(id) => deleteCartLineItem(id)}
              />
              {i < lineItems.length - 1 && <Separator className="mt-6" />}
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-28 lg:h-fit space-y-6">
          <FulfilmentChoice />

          <Card>
            <CardContent className="space-y-5 p-6">
              <h2 className="font-display text-lg font-semibold">
                Order summary
              </h2>
              <OrderSummary order={order} pending />
              <Button
                size="lg"
                className="w-full"
                onClick={() => navigate("/checkout")}
              >
                Checkout
                <ArrowRight className="size-4" />
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/products">Continue shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
