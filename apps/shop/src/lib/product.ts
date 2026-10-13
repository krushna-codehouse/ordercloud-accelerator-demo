import type { BuyerProduct } from "ordercloud-javascript-sdk";
import { formatPrice } from "./currency";

/**
 * Helpers that translate OrderCloud product/order shapes into the values the
 * UI renders. These tolerate the real seeded data shape:
 *   - images live at xp.Images[].url (lowercase) — older data may use .Url / .ThumbnailUrl
 *   - the display price is on PriceSchedule.PriceBreaks[0].Price, with xp.Price as a fallback
 *   - currency is xp.PriceCurrency (AUD in the demo seed)
 *   - Description is frequently null
 */

type AnyProduct = Pick<BuyerProduct, "Name" | "Description" | "PriceSchedule"> & {
  ID?: string;
  xp?: any;
};

interface ProductImage {
  url?: string;
  Url?: string;
  ThumbnailUrl?: string;
}

export function getProductImages(product?: AnyProduct | null): string[] {
  const images = (product?.xp?.Images ?? []) as ProductImage[];
  return images
    .map((img) => img?.url || img?.Url || img?.ThumbnailUrl)
    .filter((u): u is string => Boolean(u));
}

export function getProductImage(product?: AnyProduct | null): string | undefined {
  return getProductImages(product)[0];
}

export function getProductPrice(product?: AnyProduct | null): number | undefined {
  const fromSchedule = product?.PriceSchedule?.PriceBreaks?.[0]?.Price;
  if (typeof fromSchedule === "number") return fromSchedule;
  const fromXp = product?.xp?.Price;
  return typeof fromXp === "number" ? fromXp : undefined;
}

export function getCurrency(product?: AnyProduct | null): string {
  return product?.xp?.PriceCurrency || "AUD";
}

export function getFormattedPrice(product?: AnyProduct | null): string {
  return formatPrice(getProductPrice(product), getCurrency(product));
}

export function getSku(product?: AnyProduct | null): string | undefined {
  const sku = product?.xp?.SKU;
  return sku ? String(sku) : undefined;
}

/** Seeded category/brand names are UPPERCASE — present them as Title Case. */
export function titleCase(value?: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** A readable fallback when a product has no description (common in the seed). */
export function getDescription(product?: AnyProduct | null): string {
  const desc = product?.Description?.trim();
  if (desc) return desc;
  return `${product?.Name ?? "This product"} — genuine stock, ready to ship. Full specifications available on request.`;
}
