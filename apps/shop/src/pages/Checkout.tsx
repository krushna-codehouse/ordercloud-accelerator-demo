import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, Loader2, ShoppingBag } from "lucide-react";
import type { Address } from "ordercloud-javascript-sdk";
import { toast } from "sonner";

import { Logo } from "@/components/brand/Logo";
import { CHECKOUT_ADDRESS_KEY } from "@/components/checkout/AddressForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { AddressForm } from "@/components/checkout/AddressForm";
import { ShippingMethods } from "@/components/checkout/ShippingMethods";
import { PaymentPanel } from "@/components/checkout/PaymentPanel";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { LineItemRow } from "@/components/cart/LineItemRow";
import { PromoCodeInput } from "@/components/cart/PromoCodeInput";
import { useCart } from "@/hooks/use-cart";

export default function Checkout() {
  const {
    orderWorksheet,
    worksheetLoading,
    lineItems,
    setShippingAddress,
    estimateShipping,
    selectShipMethods,
    calculateOrder,
    submitCart,
  } = useCart();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shipMethodID, setShipMethodID] = useState<string>();

  const order = orderWorksheet?.Order;
  const currency = order?.Currency || "AUD";
  const shipEstimate = orderWorksheet?.ShipEstimateResponse?.ShipEstimates?.[0];
  const shipMethods = shipEstimate?.ShipMethods ?? [];

  // Restore checkout state from the worksheet after it loads.
  const stepRestored = useRef(false);
  useEffect(() => {
    // Keep shipMethodID in sync with the worksheet's persisted selection.
    if (shipEstimate?.SelectedShipMethodID) {
      setShipMethodID(shipEstimate.SelectedShipMethodID);
    }

    // Advance the step indicator once on initial load so a page refresh
    // doesn't drop the user back to the address form.
    if (!worksheetLoading && !stepRestored.current) {
      stepRestored.current = true;
      if (shipEstimate?.SelectedShipMethodID && (order?.TaxCost ?? 0) > 0) {
        setStep(2);
      } else if ((shipEstimate?.ShipMethods?.length ?? 0) > 0) {
        setStep(1);
      }
    }
  }, [worksheetLoading, order, shipEstimate]);

  // ── Step handlers ─────────────────────────────────────────────────────
  const handleAddress = async (address: Address) => {
    setBusy(true);
    try {
      await setShippingAddress(address);
      await estimateShipping();
      setStep(1);
    } catch {
      toast.error("We couldn't save that address. Please check it and retry.");
    } finally {
      setBusy(false);
    }
  };

  const handleShipping = async () => {
    if (!shipMethodID || !shipEstimate?.ID) return;
    setBusy(true);
    try {
      await selectShipMethods({
        ShipMethodSelections: [
          { ShipEstimateID: shipEstimate.ID, ShipMethodID: shipMethodID },
        ],
      });
      await calculateOrder();
      setStep(2);
    } catch {
      toast.error("Couldn't apply that shipping method. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handlePlaceOrder = async () => {
    const orderId = order?.ID;
    if (!orderId) return;
    setSubmitting(true);
    try {
      await submitCart();
      sessionStorage.removeItem(CHECKOUT_ADDRESS_KEY);
      navigate(`/order-confirmation?orderID=${orderId}`);
    } catch {
      setSubmitting(false);
      toast.error(
        "Payment could not be completed. In this demo, live payment needs the API + a configured provider.",
      );
    }
  };

  if (worksheetLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-40" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!lineItems.length) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={ShoppingBag}
          title="Nothing to check out"
          description="Add some products to your bag before checking out."
          action={
            <Button asChild>
              <Link to="/products">Browse products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Checkout
        </h1>
        <Button asChild variant="ghost" size="sm">
          <Link to="/cart">
            <ChevronLeft className="size-4" />
            Back to bag
          </Link>
        </Button>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-8">
            <CheckoutSteps current={step} />
          </div>

          {step === 0 && (
            <section>
              <h2 className="mb-4 font-display text-lg font-semibold">
                Shipping information
              </h2>
              <AddressForm onSubmit={handleAddress} submitting={busy} />
            </section>
          )}

          {step === 1 && (
            <section>
              <h2 className="mb-4 font-display text-lg font-semibold">
                Shipping method
              </h2>
              <ShippingMethods
                methods={shipMethods}
                value={shipMethodID}
                onChange={setShipMethodID}
                currency={currency}
              />
              <div className="mt-6 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  <ArrowLeft className="size-4" />
                  Edit address
                </Button>
                <Button
                  size="lg"
                  onClick={handleShipping}
                  disabled={!shipMethodID || busy}
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Continue to payment
                </Button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="mb-4 font-display text-lg font-semibold">
                Payment
              </h2>
              <PaymentPanel
                total={order?.Total}
                currency={currency}
                submitting={submitting}
                onPlaceOrder={handlePlaceOrder}
              />
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                <ArrowLeft className="size-4" />
                Back to shipping
              </Button>
            </section>
          )}
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-28 lg:h-fit">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  Order summary
                </h2>
                <Logo markOnly size={24} />
              </div>

              <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
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
              <PromoCodeInput
                appliedPromotions={orderWorksheet?.OrderPromotions ?? []}
                currency={currency}
              />
              <Separator />
              <OrderSummary order={order} pending={step === 0} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
