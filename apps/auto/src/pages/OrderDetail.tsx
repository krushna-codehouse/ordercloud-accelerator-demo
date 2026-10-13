import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  LineItems,
  Me,
  Orders,
  type Address,
  type LineItem,
  type Order,
} from "ordercloud-javascript-sdk";
import { ChevronLeft, Loader2, Package, XCircle } from "lucide-react";
import { toast } from "sonner";

import type { OrderFulfilmentXp } from "@/hooks/use-fulfilment";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { LineItemRow } from "@/components/cart/LineItemRow";
import { OrderSummary } from "@/components/cart/OrderSummary";

// Only these statuses can still be canceled — once shipped/completed/already
// canceled/declined, there's nothing left to cancel.
const CANCELABLE_STATUSES = new Set(["Open", "AwaitingApproval"]);

export default function OrderDetail() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order>();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [address, setAddress] = useState<Address>();
  const [canceling, setCanceling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
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
            /* address may be unavailable */
          }
        }
      } catch {
        /* handled by the not-found state below */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  const handleCancel = async () => {
    if (!order?.ID) return;
    setCanceling(true);
    try {
      const updated = await Orders.Cancel("Outgoing", order.ID);
      setOrder(updated);
      setConfirmingCancel(false);
      toast.success("Order canceled");
    } catch {
      toast.error("Couldn't cancel this order. Please try again or contact support.");
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Skeleton className="mb-8 h-9 w-40" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={Package}
          title="Order not found"
          description="We couldn't find that order."
          action={
            <Button asChild>
              <Link to="/orders">Back to your orders</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const currency = order.Currency || "AUD";
  const orderXp = order.xp as OrderFulfilmentXp | undefined;
  const isPickup = orderXp?.fulfilmentType === "pickup";
  const canCancel = order.Status ? CANCELABLE_STATUSES.has(order.Status) : false;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
          <ChevronLeft className="size-4" />
          Back to your orders
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Order {order.ID}
        </h1>
        {order.Status && <Badge>{order.Status}</Badge>}
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          {(address || order.FromUser?.Email) && (
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              {address && (
                <div>
                  <p className="mb-1 font-medium">
                    {isPickup ? "Pickup location" : "Shipping to"}
                  </p>
                  <p className="text-muted-foreground">
                    {isPickup ? (
                      orderXp?.pickupStoreName && (
                        <>
                          {orderXp.pickupStoreName}
                          <br />
                        </>
                      )
                    ) : (
                      <>
                        {address.FirstName} {address.LastName}
                        <br />
                      </>
                    )}
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
                  {order.DateSubmitted &&
                    new Date(order.DateSubmitted).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  <br />
                  {isPickup
                    ? "Ready for pickup — free"
                    : order.ShippingCost && order.ShippingCost > 0
                      ? "Standard shipping"
                      : "Free shipping"}
                </p>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            {lineItems.map((li) => (
              <LineItemRow key={li.ID} lineItem={li} currency={currency} editable={false} compact />
            ))}
          </div>

          <Separator />
          <OrderSummary order={order} />
        </CardContent>
      </Card>

      {canCancel && (
        <div className="mt-6 rounded-xl border border-border p-5">
          {!confirmingCancel ? (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmingCancel(true)}
            >
              <XCircle className="size-4" />
              Cancel this order
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Cancel order {order.ID}? This can't be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={canceling}
                >
                  {canceling && <Loader2 className="size-4 animate-spin" />}
                  Yes, cancel it
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={canceling}
                >
                  Never mind
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
