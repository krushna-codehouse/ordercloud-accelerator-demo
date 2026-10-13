import type { Promotion } from "ordercloud-javascript-sdk";

/**
 * Reads only the "X% off product Y" shape the Admin promotions rule builder
 * generates (see apps/admin's promo-recipes.json / ruleProcessor.ts):
 *   EligibleExpression: item.Product.ID = 'a' or item.Product.ID = 'b'
 *   ValueExpression:    item.LineSubtotal * 0.1
 * Anything shaped differently (category-based, $ off, BOGO, order-level...)
 * is intentionally left alone here — it still applies correctly at checkout,
 * it just won't get a pre-cart price preview.
 */

export interface ParsedPercentPromotion {
  percent: number; // e.g. 10 for 10%
  productIds: Set<string>;
  name?: string;
}

const PRODUCT_ID_RE = /item\.Product\.ID\s*=\s*'([^']+)'/g;
const VALUE_PERCENT_RE = /^\s*item\.LineSubtotal\s*\*\s*([\d.]+)\s*$/;

export function parsePercentOffPromotion(promo: Promotion): ParsedPercentPromotion | null {
  if (!promo.Active || !promo.LineItemLevel) return null;
  if (!promo.EligibleExpression || !promo.ValueExpression) return null;

  const valueMatch = promo.ValueExpression.match(VALUE_PERCENT_RE);
  if (!valueMatch) return null;

  const fraction = Number(valueMatch[1]);
  if (!Number.isFinite(fraction) || fraction <= 0 || fraction >= 1) return null;

  const productIds = new Set<string>();
  let match: RegExpExecArray | null;
  PRODUCT_ID_RE.lastIndex = 0;
  while ((match = PRODUCT_ID_RE.exec(promo.EligibleExpression))) {
    productIds.add(match[1]);
  }
  if (productIds.size === 0) return null;

  return { percent: fraction * 100, productIds, name: promo.Name };
}

export function getDiscountedPrice(basePrice: number, percent: number): number {
  return Math.round(basePrice * (1 - percent / 100) * 100) / 100;
}
