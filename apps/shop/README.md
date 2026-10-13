# Helix storefront (`apps/shop`)

The buyer-facing storefront for the Sitecore OrderCloud accelerator — a modern tech/3C
("Helix") demo shop built with **React 18 + Vite + Tailwind CSS v4 + shadcn/ui**, talking to
OrderCloud through **`@ordercloud/react-sdk`** (anonymous browsing, cart, and checkout).

It replaces the original `apps/storefront` (Chakra UI) as the active storefront and reuses the
same `VITE_APP_*` configuration contract, so the `infrastructure` tool generates its `.env.local`.

## Develop

```bash
npm install
npm run dev      # vite dev server on http://localhost:3001
npm run build    # tsc && vite build
npm run lint     # eslint, --max-warnings 0
npm run preview  # preview the production build
```

> `apps/shop` and `apps/storefront` both default to port **3001** — run one at a time.

## Configuration

Copy `.env.local.example` → `.env.local` and fill in, or generate it with the infrastructure
tool (`cd ../../infrastructure && npm run env`). Key vars:

- `VITE_APP_ORDERCLOUD_BASE_API_URL` — OrderCloud API base URL
- `VITE_APP_ORDERCLOUD_CLIENT_ID` — storefront buyer API client ID
- `VITE_APP_ORDERCLOUD_ALLOW_ANONYMOUS` — `true` to allow guest shopping (recommended for the demo)
- `VITE_APP_PAYMENT_PROVIDER` — `STRIPE` | `CARD_CONNECT` | `PAYPAL` | `BLUESNAP`

## Structure

```
src/
  index.css            Tailwind v4 + design tokens (@theme) — Helix crimson brand palette
  AppProvider.tsx      ThemeProvider + OrderCloudProvider + Router + Toaster
  routes.tsx  Layout.tsx
  constants.ts         reads the VITE_APP_* env contract
  lib/        utils.ts (cn)  currency.ts  product.ts (xp image/price/currency helpers)
  hooks/      use-cart (wraps useShopper)  use-catalog  use-current-user  use-debounce
  components/
    ui/        shadcn/ui primitives
    brand/     Logo + theme toggle      layout/  header, footer, nav, search, cart sheet
    product/   card, grid, gallery, filters, sort, pagination, add-to-cart
    cart/      line item row, order summary, cart sheet
    checkout/  stepper, address form, shipping methods, payment panel
  pages/      Home  Products (PLP)  ProductDetail (PDP)  Cart  Checkout  OrderConfirmation
```

## Data flow

All product/catalog/cart data is fetched live from OrderCloud via the SDK
(`Me.Products`, `Me.Catalogs`, `Me.Categories`, `useShopper`). Products render
`xp.Images[].url`, `xp.Price` / `PriceSchedule`, and `xp.PriceCurrency`. Checkout drives the
OrderCloud integration events (shipping/tax/payment) handled by `apps/api` — live shipping/tax
work against the bundled mocks; live payment needs `apps/api` running plus a configured provider.
