import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  LineItems,
  Me,
  Orders,
  type Address,
  type LineItem,
  type Order,
} from "ordercloud-javascript-sdk";
import { CheckCircle2, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { LineItemRow } from "@/components/cart/LineItemRow";
import { OrderSummary } from "@/components/cart/OrderSummary";

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderID");

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order>();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [address, setAddress] = useState<Address>();

  useEffect(() => {
    let active = true;
    (async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const result = await Orders.Get("Outgoing", orderId);
        if (!active) return;
        setOrder(result);

        const items = await LineItems.List("Outgoing", orderId);
        if (!active) return;
        setLineItems(items.Items ?? []);

        if (result.ShippingAddressID) {
          try {
            const addr = await Me.GetAddress(result.ShippingAddressID);
            if (active) setAddress(addr);
          } catch {
            /* address may be unavailable for anonymous orders */
          }
        }
      } catch {
        /* handled by empty state below */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Skeleton className="mx-auto h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto mt-6 h-8 w-64" />
        <Skeleton className="mt-10 h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={Package}
          title="Order not found"
          description="We couldn't find that order. If you just placed it, give it a moment and refresh."
          action={
            <Button asChild>
              <Link to="/products">Continue shopping</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const currency = order.Currency || "AUD";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-accent text-primary">
          <CheckCircle2 className="size-9" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">
          Order confirmed
        </h1>
        <p className="mt-2 text-muted-foreground">
          Thanks{order.FromUser?.FirstName ? `, ${order.FromUser.FirstName}` : ""}! Your
          order{" "}
          <span className="font-medium text-foreground">{order.ID}</span> is on
          its way.
        </p>
      </div>

      <Card className="mt-10">
        <CardContent className="space-y-6 p-6">
          {(address || order.FromUser?.Email) && (
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              {address && (
                <div>
                  <p className="mb-1 font-medium">Shipping to</p>
                  <p className="text-muted-foreground">
                    {address.FirstName} {address.LastName}
                    <br />
                    {address.Street1}
                    {address.Street2 ? `, ${address.Street2}` : ""}
                    <br />
                    {address.City}, {address.State} {address.Zip}
                    <br />
                    {address.Country}
                  </p>
                </div>
              )}
              <div>
                <p className="mb-1 font-medium">Order details</p>
                <p className="text-muted-foreground">
                  {order.FromUser?.Email && (
                    <>
                      {order.FromUser.Email}
                      <br />
                    </>
                  )}
                  {order.ShippingCost && order.ShippingCost > 0
                    ? "Standard shipping"
                    : "Free shipping"}
                </p>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            {lineItems.map((li) => (
              <LineItemRow
                key={li.ID}
                lineItem={li}
                currency={currency}
                editable={false}
                compact
              />
            ))}
          </div>

          <Separator />
          <OrderSummary order={order} />
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-center">
        <Button asChild size="lg">
          <Link to="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
