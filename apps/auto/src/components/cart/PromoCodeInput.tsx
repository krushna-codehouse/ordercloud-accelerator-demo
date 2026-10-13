import { useState } from "react";
import { Loader2, Tag, X } from "lucide-react";
import type { OrderPromotion } from "ordercloud-javascript-sdk";
import { toast } from "sonner";

import { formatPrice } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";

interface PromoCodeInputProps {
  appliedPromotions?: OrderPromotion[];
  currency?: string;
}

export function PromoCodeInput({
  appliedPromotions = [],
  currency = "AUD",
}: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [removingId, setRemovingId] = useState<string>();

  const { addCartPromo, removeCartPromo } = useCart();

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setApplying(true);
    try {
      await addCartPromo(trimmed);
      setCode("");
      toast.success(`Promo code "${trimmed}" applied`);
    } catch {
      toast.error("That code isn't valid or has already been applied.");
    } finally {
      setApplying(false);
    }
  };

  const handleRemove = async (promo: OrderPromotion) => {
    if (!promo.ID) return;
    setRemovingId(promo.ID);
    try {
      await removeCartPromo(promo.ID);
    } catch {
      toast.error("Couldn't remove that promotion.");
    } finally {
      setRemovingId(undefined);
    }
  };

  return (
    <div className="space-y-3">
      {appliedPromotions.length > 0 && (
        <ul className="space-y-2">
          {appliedPromotions.map((promo) => (
            <li
              key={promo.ID}
              className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Tag className="size-3.5 shrink-0 text-primary" />
                <span className="font-medium text-primary">
                  {promo.Code ?? promo.Name ?? promo.ID}
                </span>
                {promo.Amount != null && promo.Amount > 0 && (
                  <span className="text-muted-foreground">
                    −{formatPrice(promo.Amount, currency)}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRemove(promo)}
                disabled={removingId === promo.ID}
                className="ml-2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                aria-label={`Remove promo ${promo.Code ?? promo.ID}`}
              >
                {removingId === promo.ID ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !applying && handleApply()}
          placeholder="Promo code"
          className="h-9 text-sm"
          disabled={applying}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleApply}
          disabled={!code.trim() || applying}
          className="h-9 shrink-0"
        >
          {applying ? <Loader2 className="size-3.5 animate-spin" /> : "Apply"}
        </Button>
      </div>
    </div>
  );
}
