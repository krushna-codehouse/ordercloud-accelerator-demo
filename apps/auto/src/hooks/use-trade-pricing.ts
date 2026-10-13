import { useMemo } from "react";
import { Me } from "ordercloud-javascript-sdk";
import { useAuthQuery } from "@ordercloud/react-sdk";

import { getDiscountedPrice, parsePercentOffPromotion } from "@/lib/trade-pricing";

export interface TradePrice {
  original: number;
  discounted: number;
  percent: number;
  label: string;
}

/**
 * Product ID -> best available discount, sourced from every promotion
 * OrderCloud says is currently visible/eligible for the signed-in shopper
 * (Me.ListPromotions already accounts for group membership, dates, and
 * assignment — nothing about eligibility is re-checked client-side here).
 * Anonymous/guest sessions simply get an empty map back.
 */
function useEligibleDiscountsByProduct() {
  const { data } = useAuthQuery({
    queryKey: ["myEligiblePromotions"],
    queryFn: async () => await Me.ListPromotions(),
    retry: false,
    refetchOnMount: false,
  });

  return useMemo(() => {
    const map = new Map<string, { percent: number; name?: string }>();
    for (const promo of data?.Items ?? []) {
      const parsed = parsePercentOffPromotion(promo);
      if (!parsed) continue;
      for (const productId of parsed.productIds) {
        const existing = map.get(productId);
        if (!existing || parsed.percent > existing.percent) {
          map.set(productId, { percent: parsed.percent, name: parsed.name });
        }
      }
    }
    return map;
  }, [data]);
}

/** The trade price for one product, or null if this shopper/product isn't eligible for a preview-able discount. */
export function useTradePrice(
  productId: string | undefined,
  basePrice: number | undefined,
): TradePrice | null {
  const discounts = useEligibleDiscountsByProduct();

  return useMemo(() => {
    if (!productId || typeof basePrice !== "number") return null;
    const entry = discounts.get(productId);
    if (!entry) return null;
    return {
      original: basePrice,
      discounted: getDiscountedPrice(basePrice, entry.percent),
      percent: entry.percent,
      label: "Trade Price",
    };
  }, [discounts, productId, basePrice]);
}
