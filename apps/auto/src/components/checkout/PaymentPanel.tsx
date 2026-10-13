import { useState } from "react";
import { CreditCard, Loader2, Lock } from "lucide-react";

import { PAYMENT_PROVIDER, PAYMENT_PROVIDERS } from "@/constants";
import { formatPrice } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentPanelProps {
  total?: number;
  currency?: string;
  submitting?: boolean;
  onPlaceOrder: () => void;
}

export function PaymentPanel({
  total,
  currency = "AUD",
  submitting,
  onPlaceOrder,
}: PaymentPanelProps) {
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12 / 28");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        <Lock className="size-4 shrink-0" />
        <span>
          Sandbox checkout via{" "}
          <span className="font-medium text-foreground">
            {providerLabel(PAYMENT_PROVIDER)}
          </span>
          . Use the pre-filled test card — no real charge is made.
        </span>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="card">Card number</Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="card"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              inputMode="numeric"
              className="pl-9"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="expiry">Expiry</Label>
            <Input
              id="expiry"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cvc">CVC</Label>
            <Input
              id="cvc"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              inputMode="numeric"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name on card</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="As it appears on your card"
          />
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={onPlaceOrder}
        disabled={submitting}
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {submitting
          ? "Placing order…"
          : `Pay ${formatPrice(total ?? 0, currency)}`}
      </Button>
    </div>
  );
}

function providerLabel(provider: PAYMENT_PROVIDERS): string {
  switch (provider) {
    case PAYMENT_PROVIDERS.STRIPE:
      return "Stripe";
    case PAYMENT_PROVIDERS.PAYPAL:
      return "PayPal";
    case PAYMENT_PROVIDERS.CARD_CONNECT:
      return "CardConnect";
    case PAYMENT_PROVIDERS.BLUESNAP:
      return "BlueSnap";
    default:
      return "your payment provider";
  }
}
