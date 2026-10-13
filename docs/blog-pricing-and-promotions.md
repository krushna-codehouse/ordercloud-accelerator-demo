# Showing the Right Price to the Right Customer with Sitecore OrderCloud

*How the Helix Auto demo handles pricing, trade discounts, and promotions on the product card, product listing page, product detail page, cart, and checkout.*

**Source code:** https://github.com/krushna-codehouse/ordercloud-accelerator-demo

## Introduction

In the [first post](./blog-building-an-ordercloud-demo.md), we looked at how the OrderCloud demo is organised. This post focuses on one feature: **pricing**.

Helix Auto sells car parts to two kinds of customers:

- **Retail shoppers**, who pay the normal price.
- **Trade customers**, such as mechanics and workshops, who get discounts on selected products.

A trade customer should see their price everywhere: on the product card, the listing page, the product page, in the cart, and at checkout. A retail shopper or guest should see only the normal price. Whatever price we show before checkout must also match what the customer actually pays.

This post explains how we planned the feature, which OrderCloud tools we used, and how the price travels through each page, with code from the demo repository.

## 1. The plan

We started with four rules.

1. **OrderCloud decides the final price.** The storefront never calculates what a customer pays. It only displays what OrderCloud returns.
2. **OrderCloud decides who is eligible.** The storefront never checks whether a user is "trade". It asks OrderCloud which promotions the current user can use.
3. **Show the discount before the cart, but only when we're sure.** A trade customer should see the trade price while browsing. If we can't be certain what a discount will be, we show the normal price and let the cart show the real result.
4. **Sellers manage discounts without code.** A promotion created in the admin app should appear in the storefront without a deployment.

### Choosing an OrderCloud feature

OrderCloud offers a few ways to give different customers different prices:

| Option | How it works | Good for |
|---|---|---|
| **Price schedules** | Each product has a default price schedule. You can assign a different price schedule for a buyer or user group. | Fixed contract prices and price lists |
| **Promotions** | Rules (expressions) that apply a discount to an order or line item. They can be assigned to buyers or user groups and can apply automatically. | Percentage discounts, sales, promo codes |
| **Extended properties (`xp`)** | Store a custom price in `xp`. | Display-only data. Not safe for real pricing, because OrderCloud doesn't use it at checkout. |

For this demo we used **promotions** for trade discounts, and **price schedules** for the base price:

- A trade discount is usually "X% off these products". That is exactly what a promotion expresses.
- Sellers can create and change promotions in the admin app with a visual rule builder.
- OrderCloud applies promotions at checkout, so the final price is always enforced on the server.
- The same system also handles public promo codes, so there is only one discount mechanism to learn.

## 2. The whole flow at a glance

```text
 ADMIN APP                         ORDERCLOUD                          STOREFRONT (apps/auto)
 ─────────                         ──────────                          ──────────────────────
 Create promotion  ───────────►    Promotion
 "10% off product A"               EligibleExpression / ValueExpression
                                          │
 Assign to the trade  ─────────►   PromotionAssignment
 user group                         (buyer / user group)
                                          │
                                          ▼
                                   Me.ListPromotions()  ─────────────►  useTradePrice()
                                   (only what this user can use)          parse "X% off product"
                                                                                │
                                                                                ▼
                                                                         <PriceTag/>
                                                                         Product card (PLP, home rails)
                                                                         Product detail page
                                          │
 Add to cart  ◄───────────────────────────┼──────────────────────────────  addItem()
                                          ▼
                                   applypromotions (auto-apply)
                                   LineItem.PromotionDiscount
                                   Order.PromotionDiscount, Order.Total
                                          │
                                          ▼
                                   Cart, cart drawer, checkout,  ◄──────  LineItemRow, OrderSummary
                                   confirmation, order history            (display only)
```

There are two halves:

- **Before the cart (preview):** the storefront reads the user's promotions and works out a preview price.
- **In the cart and after:** OrderCloud applies the promotions, and the storefront displays OrderCloud's numbers.

## 3. Where the base price comes from

Every price starts with the product's **price schedule**. When the storefront lists products with `Me.ListProducts`, OrderCloud includes the price schedule that applies to the current user.

`apps/auto/src/lib/product.ts` reads it in one place:

```ts
export function getProductPrice(product?: AnyProduct | null): number | undefined {
  const fromSchedule = product?.PriceSchedule?.PriceBreaks?.[0]?.Price;
  if (typeof fromSchedule === "number") return fromSchedule;
  const fromXp = product?.xp?.Price;
  return typeof fromXp === "number" ? fromXp : undefined;
}

export function getCurrency(product?: AnyProduct | null): string {
  return product?.xp?.PriceCurrency || "AUD";
}
```

Two things to note:

- The price schedule wins. `xp.Price` is only a fallback for seeded data that has no schedule.
- Every component uses this helper, so there is a single rule for "what is this product's price".

Currency formatting is also centralised, in `lib/currency.ts`, using the browser's `Intl.NumberFormat`:

```ts
export function formatPrice(amount?: number | null, currency = "AUD"): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "";
  const code = currency || "AUD";
  const locale = LOCALE_BY_CURRENCY[code] ?? "en-AU";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    currencyDisplay: "symbol",
  }).format(amount);
}
```

## 4. Creating a trade promotion in the admin app

OrderCloud promotions are written as two expressions:

- **`EligibleExpression`** decides which line items qualify.
- **`ValueExpression`** decides how much discount to give.

Writing these by hand is error-prone, so the admin app has a **promotion rule builder** with ready-made recipes (`apps/admin/.../ExpressionRecipes/promo-recipes.json`):

- X% off product Y
- $X off product Y
- X% off products in category Y
- $X off products in category Y
- Buy one, get one free (two variants)
- Free shipping on orders over $X

For trade pricing we use **"X% off product Y"**. The seller enters a percentage and picks products, and the builder produces expressions like:

```text
EligibleExpression: item.Product.ID = 'OIL-5W30' or item.Product.ID = 'BATT-100AH'
ValueExpression:    item.LineSubtotal * 0.1
LineItemLevel:      true
```

The recipe converts the percentage for you: entering `10` becomes `0.1` through a small `divideBy100` transform.

### Who gets the discount

A promotion on its own applies to nobody. You give it to customers with a **promotion assignment**, which targets a buyer or a **user group**.

In the demo:

1. Create a user group for trade customers, for example `trade-customers`.
2. Assign the trade promotion to that user group.
3. When a trade application is approved in the admin app, add that user to the group.

To also apply the discount in the cart without a code, set the promotion's **`AutoApply`** to `true`.

## 5. Finding out which discounts a user can see

This is where the storefront's work starts. `apps/auto/src/hooks/use-trade-pricing.ts` asks OrderCloud for the current user's promotions:

```ts
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
```

What this does:

- **`Me.ListPromotions()`** returns only the promotions assigned to this user, either directly, through their buyer, or through their user groups. A guest or a retail customer simply gets no trade promotions back.
- The result is turned into a **map from product ID to discount**, so each product card can look up its discount instantly.
- If two promotions cover the same product, the **bigger discount wins**.
- The query is fetched **once** and shared by every card on the page through React Query's cache. A product listing with 24 cards makes one promotions request, not 24.

Notice that the storefront never asks "is this user a trade customer?". Group membership decides that inside OrderCloud.

## 6. Reading the promotion safely

Promotion expressions can be complex: category rules, minimum spend, buy-one-get-one, and more. The storefront doesn't try to understand all of them. `apps/auto/src/lib/trade-pricing.ts` recognises **one** shape, the "X% off product Y" recipe, and ignores everything else:

```ts
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
```

This is the most important design decision in the feature. If a promotion doesn't match the expected shape **exactly**, the function returns `null` and the storefront shows the normal price. The promotion still works at checkout; it just doesn't get a preview.

That means a preview can be **missing**, but it should never be **wrong**. Showing a lower price on the product page and a higher one in the cart would damage the customer's trust far more than showing no preview at all.

The final hook combines the base price and the discount for one product:

```ts
export function useTradePrice(productId: string | undefined, basePrice: number | undefined): TradePrice | null {
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
```

## 7. One price component for every page

Rather than adding discount logic to each page, all pre-cart prices go through a single component: `apps/auto/src/components/product/PriceTag.tsx`.

```tsx
export function PriceTag({ productId, price, currency = "AUD", size = "sm", className }: PriceTagProps) {
  const trade = useTradePrice(productId, price);
  const priceClass = size === "lg" ? "text-3xl font-bold" : "font-display text-lg font-semibold";

  if (!trade) {
    return <span className={cn(priceClass, className)}>{formatPrice(price, currency)}</span>;
  }

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn(priceClass, "text-primary")}>{formatPrice(trade.discounted, currency)}</span>
      <span className="text-sm text-muted-foreground line-through">{formatPrice(trade.original, currency)}</span>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        {trade.label}
      </span>
    </span>
  );
}
```

There are only two outcomes:

- **No eligible discount:** the normal price, e.g. **$49.95**.
- **Eligible trade discount:** the trade price, the original price struck through, and a **Trade Price** badge, e.g. **$44.96** ~~$49.95~~ `TRADE PRICE`.

Because every page uses `PriceTag`, a change to how discounts look happens in one file.

### On the product card

`ProductCard.tsx` passes the product's ID, price, and currency:

```tsx
<PriceTag
  productId={product.ID}
  price={getProductPrice(product)}
  currency={getCurrency(product)}
/>
```

### On the product listing page (PLP) and home page

The listing page (`pages/Products.tsx`) renders a `ProductGrid`, and the home page's product rails render a `ProductRail`. Both are made of `ProductCard`s, so they show trade prices automatically, with no extra code.

### On the product detail page (PDP)

`pages/ProductDetail.tsx` uses the same component in a larger size:

```tsx
<PriceTag
  productId={product.ID}
  price={getProductPrice(product)}
  currency={getCurrency(product)}
  size="lg"
/>
<span className="text-sm text-muted-foreground">incl. GST</span>
```

The card, the listing, the home page, and the PDP therefore always agree, because they share the same hook, the same cached promotion data, and the same rounding.

## 8. In the cart: OrderCloud takes over

When the customer adds a product to the cart, the preview's job is done. From here on, **every number comes from OrderCloud**.

### Applying promotions automatically

`AppProvider.tsx` turns on automatic promotions for the OrderCloud React SDK, using a setting from the environment file:

```tsx
<OrderCloudProvider
  // ...
  autoApplyPromotions={IS_AUTO_APPLY}   // VITE_APP_ORDERCLOUD_AUTO_APPLY_PROMOS
>
```

With this on, OrderCloud applies every eligible auto-apply promotion to the cart. The trade discount lands on the line item as **`PromotionDiscount`**, and the order totals update.

### Keeping discounts correct when the cart changes

Promotions can stop being valid when the cart changes, for example when a "spend $100" promotion no longer qualifies after an item is removed. `hooks/use-cart.tsx` re-checks promotions after every add, quantity change, or removal:

```ts
const revalidatePromos = useCallback(async () => {
  const promos = shopper.orderWorksheet?.OrderPromotions ?? [];
  if (promos.length) {
    await Promise.all(
      promos
        .filter((p): p is typeof p & { ID: string } => Boolean(p.ID))
        .map((p) => shopper.removeCartPromo(p.ID)),
    );
    await shopper.applyPromotions();
  }

  if ((shopper.orderWorksheet?.Order?.TaxCost ?? 0) > 0) {
    try {
      await shopper.calculateOrder();
    } catch {
      // calculateOrder requires apps/api + a shipping selection; ignore if not ready.
    }
  }
}, [shopper]);
```

It removes the applied promotions, asks OrderCloud to apply everything that is **still** eligible, and, if tax was already calculated, recalculates it so the totals stay accurate.

### Showing the discount on each line

`components/cart/LineItemRow.tsx` displays what OrderCloud calculated. It doesn't recalculate anything:

```tsx
const hasDiscount = (lineItem.PromotionDiscount ?? 0) > 0;
const unitPriceAfterDiscount =
  hasDiscount && lineItem.Quantity
    ? (lineItem.LineTotal ?? 0) / lineItem.Quantity
    : lineItem.UnitPrice;
```

- **`LineSubtotal`** is the price before discount (shown struck through).
- **`LineTotal`** is the price after discount (shown highlighted).
- The "each" price is `LineTotal ÷ Quantity`, with a **Trade Price** badge.

The same row is used in the cart drawer, the cart page, checkout, and order history, so a line item always looks the same.

## 9. Promo codes

Not every discount is for trade customers. Anyone can type a promo code in the cart drawer or at checkout. `components/cart/PromoCodeInput.tsx` sends the code to OrderCloud and lists the applied promotions with their amounts:

```ts
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
```

OrderCloud checks whether the code exists, whether this customer can use it, and whether the cart qualifies. The storefront only shows the result.

## 10. Order summary: cart, checkout, confirmation, and order history

`components/cart/OrderSummary.tsx` is the final piece. It shows the order's subtotal, shipping, tax, discount, and total, all taken straight from the OrderCloud order:

```tsx
<Row label="Subtotal" value={formatPrice(order?.Subtotal ?? 0, currency)} />
{/* Shipping and tax: "Calculated at checkout" until OrderCloud has them */}
{discount > 0 && (
  <Row label="Discount" value={`−${formatPrice(discount, currency)}`} accent />
)}
<dd className="tabular-nums">{formatPrice(order?.Total ?? order?.Subtotal ?? 0, currency)}</dd>
```

| Page | What the summary shows |
|---|---|
| Cart | Subtotal and discount; shipping and tax say "Calculated at checkout" |
| Checkout | Updates live as the address, shipping method, and promo codes change |
| Order confirmation | The final, submitted totals |
| Order detail (history) | The same totals for any past order |

During checkout, shipping and tax come from the demo's integration API (`apps/api`) through OrderCloud's checkout integration event. Promotions are applied by OrderCloud itself. The storefront never adds these numbers up.

## 11. What we learned

**Preview, don't decide.** The storefront shows a helpful preview, but OrderCloud is always the source of truth. If you remember one thing from this post, make it this.

**Recognise a few shapes well.** Trying to understand every promotion expression in the browser would be fragile. Supporting one common shape exactly, and ignoring the rest, gives a reliable result.

**Keep price logic in one place.** One helper for the base price, one hook for the trade price, one component for display, and one row component for the cart. Each page stays simple.

**Let group membership drive eligibility.** Making a customer "trade" is an admin action (adding them to a user group), not a code change.

**Re-check promotions when the cart changes.** Removing and re-applying promotions after each change keeps discounts honest.

## 12. Known limitations

This is a demo, so a few rough edges remain:

- **Only one promotion shape gets a preview.** Category discounts, fixed-amount discounts, and BOGO still apply at checkout, but product pages show the normal price for them.
- **Conditions aren't previewed.** If a percentage promotion also had extra conditions, such as a minimum quantity, the preview wouldn't know about them. Keep trade promotions to the simple "X% off product Y" recipe.
- **The cart badge always says "Trade Price".** `LineItemRow` shows that label for any line-item discount, including discounts from promo codes. Using the promotion's name instead would be more accurate.
- **Sorting uses `xp.Price`.** The listing page sorts by `xp.Price`, while the displayed price comes from the price schedule. Keep the two in sync in your data, or sort by the schedule price.
- **Price schedule features aren't used for trade pricing.** Quantity price breaks and group-specific price schedules work in OrderCloud, but this demo only reads the first price break.

## 13. Ideas for the next version

1. Use **group-specific price schedules** for customers with fixed contract prices, and keep promotions for time-limited deals.
2. Support **quantity price breaks** on the PDP ("Buy 10+ for $X each").
3. Preview **category** percentage discounts as well as product discounts.
4. Show the promotion's **name** on cart lines instead of a fixed label.
5. Add an admin action that **approves a trade account and adds the user to the trade group** in one step.

## Try it yourself

1. Follow the setup steps in the [first post](./blog-building-an-ordercloud-demo.md) and run `apps/api`, `apps/auto`, and `apps/admin`.
2. In the admin app, create a promotion with the **"X% off product Y"** recipe, mark it as **Active**, **Line item level**, and **Auto apply**, and pick a few products.
3. Create a `trade-customers` user group and assign the promotion to it.
4. Sign up in the storefront as a trade customer, then add that user to the group in the admin app.
5. Sign in again. The selected products show the **Trade Price** badge on the listing page, the home page, and the product page.
6. Add one to the cart. The cart shows the same discount, now calculated by OrderCloud.
7. Sign out and browse as a guest. The same products show the normal price.

## Conclusion

Pricing is where customers' trust is won or lost. The approach in this demo is simple: OrderCloud owns the rules and the final numbers, the storefront previews discounts only when it can do so accurately, and every page shares the same small set of pricing helpers and components.

The result is a trade customer who sees their price from the first product card to the order confirmation, and a seller who can change that price from the admin app without touching any code.

Explore the source code here: https://github.com/krushna-codehouse/ordercloud-accelerator-demo

Happy building!
