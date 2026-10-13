# Building a Composable Commerce Demo on Sitecore OrderCloud: Repo Structure, Setup, and Lessons Learned

*How we took Sitecore's OrderCloud accelerator, reshaped it into a multi-storefront demo with B2B trade pricing, click & collect and self-service sign-up, and why the repository is laid out the way it is.*

**Source code:** https://github.com/krushna-codehouse/ordercloud-accelerator-demo

---

## Why OrderCloud, and why an accelerator?

Sitecore OrderCloud is a **headless, API-first commerce platform**. It doesn't come with a storefront, a CMS or a checkout page. Instead it gives you a REST API for the hard parts of commerce: products, catalogs, buyers, users and groups, carts (orders), promotions, inventory, and a fine-grained, role-based security model. Everything you see on screen is yours to build.

That freedom is the point, but it also means a blank page. Before you can show anyone a working store you need:

- an OrderCloud **marketplace** with products, catalogs and buyers in it,
- **API clients** with the right roles for each app (a buyer-facing storefront needs very different permissions from an admin tool),
- a way to plug **shipping, tax and payment** into checkout,
- and frontends that know which client ID and API URL to use.

Sitecore's OrderCloud accelerator solves the "blank page" problem by giving you a reference storefront, an admin app, an integration API and a setup script. This demo started from that accelerator and evolved it:

- The original Azure Functions API was **ported to Next.js** (App Router) so it runs on any Node host.
- Azure resource provisioning was **removed**; the apps deploy anywhere.
- The Chakra UI storefront was replaced by **Tailwind CSS v4 + shadcn/ui** storefronts.
- A second, richer storefront, **Helix Auto**, was added for an automotive parts retailer, with trade (B2B) accounts, per-user pricing, click & collect, order history and per-account theming.

The rest of this post walks through the folder structure, why each piece exists, and how to stand the whole thing up.

---

## The big picture

```
                ┌──────────────────────┐        ┌──────────────────────┐
                │  apps/auto  (3002)   │        │  apps/admin  (3000)  │
                │  apps/shop  (3001)   │        │  seller dashboard    │
                │  buyer storefronts   │        └──────────┬───────────┘
                └───┬──────────────┬───┘                   │
     Buyer token    │              │ POST /api/register    │ Seller token
     (Me.*, cart)   │              │ (sign-up only)        │ (admin roles)
                    ▼              ▼                       ▼
        ┌────────────────────┐   ┌──────────────────┐   ┌────────────────────┐
        │  OrderCloud API    │◄──┤  apps/api (7276) │   │  OrderCloud API    │
        │  (hosted SaaS)     │   │  Next.js         │   │  (same marketplace)│
        └─────────┬──────────┘   └──────▲───────────┘   └────────────────────┘
                  │  Integration events │
                  │  & webhooks (HMAC)  │
                  └─────────────────────┘
```

Three rules hold this architecture together:

1. **Frontends talk to OrderCloud directly.** The storefronts and admin use the OrderCloud JavaScript/React SDKs with a browser-safe client ID. There is no custom "backend for frontend" in the shopping path.
2. **OrderCloud calls *your* API during checkout.** Shipping rates, tax calculation and payment authorization are delivered as **integration events** and **webhooks**: OrderCloud makes the HTTP call to `apps/api`, signed with a shared HMAC key.
3. **Privileged operations live server-side.** Anything that needs elevated permissions, like creating a user account, goes through `apps/api` using a **client-credentials** token that never reaches the browser.

If you keep those three rules in mind, the folder structure explains itself.

---

## Folder structure

```
ordercloud-accelerator-demo/
├── apps/
│   ├── auto/            # Helix Auto storefront (B2C + trade/B2B), React + Vite + Tailwind v4 + shadcn/ui
│   ├── shop/            # Helix tech storefront, same stack, simpler feature set
│   ├── admin/           # Seller/admin dashboard, React + Vite + Chakra UI, schema-driven
│   ├── api/             # Integration events, webhooks, registration (Next.js App Router)
│   └── seeding/         # Vendored @ordercloud/seeding CLI + scrape → seed → upload pipeline
├── infrastructure/      # Node/TypeScript CLI: creates API clients, registers events, writes .env.local files
├── architecture.md      # Long-form architecture notes
├── CLAUDE.md            # Repo guide for AI coding assistants (also a good human onboarding doc)
└── README.md
```

### Why no monorepo tooling?

There's no Turborepo, Nx or npm workspaces here, on purpose. Each app is **installed, built and deployed independently** from its own folder, with its own `package.json` and lockfile. For a demo/accelerator that's a feature:

- You can copy a single folder (say, `apps/api`) into another project and it just works.
- Each app can be hosted on a different platform (static hosting for the Vite apps, a Node host for Next.js).
- Nobody has to learn a build orchestrator to run the demo.

The cost is some duplication (`apps/auto` and `apps/shop` share a lot of code), which is acceptable at this size.

### Why one shared configuration contract?

Every frontend reads the same `VITE_APP_*` environment variables:

| Variable | Purpose |
|---|---|
| `VITE_APP_ORDERCLOUD_BASE_API_URL` | Regional OrderCloud API URL (**with** `/v1`) |
| `VITE_APP_ORDERCLOUD_CLIENT_ID` | The app's OrderCloud API client |
| `VITE_APP_ORDERCLOUD_ALLOW_ANONYMOUS` | Allow guest browsing and guest carts |
| `VITE_APP_ORDERCLOUD_AUTO_APPLY_PROMOS` | Auto-apply eligible promotions to the cart |
| `VITE_APP_PAYMENT_PROVIDER` | `STRIPE`, `CARD_CONNECT`, `PAYPAL` or `BLUESNAP` |

Because the contract is shared, the `infrastructure` tool can generate the `.env.local` for **any** storefront folder. Adding a new storefront is "copy a storefront, point `STOREFRONT_DIR` at it, re-run the tool".

---

## `infrastructure/`: the setup tool

```
infrastructure/
├── src/
│   ├── index.ts               # CLI entry: `seed` and `env` commands
│   ├── config.ts              # Loads .env.local via dotenv into typed settings
│   ├── oc-client.ts           # Authenticates the SDK with the middleware client
│   ├── compose-marketplace.ts # Creates buyer, security profiles, API clients, integration event, webhook
│   └── write-env.ts           # Writes apps/<dir>/.env.local
└── .env.local.example
```

**What it's for:** wiring. It doesn't load products (that's `apps/seeding`). It creates the things the apps need to *connect*:

- `npm run seed`
  1. Authenticates with a privileged **middleware** API client.
  2. Creates a **buyer**, a **security profile** (`Shopper`, `MeAdmin`) and a storefront **API client** with `IsAnonBuyer: true`, so every browser session gets its own anonymous token and its own isolated cart.
  3. Creates a seller-level security profile and an **admin API client**.
  4. Writes `.env.local` into the storefront, shop and admin folders.
  5. If `API_URL` is set, registers the **`OrderCheckout` integration event** (`CustomImplementationUrl = ${API_URL}/api`) and **assigns it to the storefront client**, then registers the buyer-address **pre-webhook**.
- `npm run env`: rewrites the `.env.local` files from already-known client IDs without calling OrderCloud.

**Why a script instead of clicking through the portal?** Repeatability. Every new sandbox marketplace, every teammate and every CI environment gets identical wiring, and the script documents exactly which roles each client has.

> **Gotcha:** creating the integration event isn't enough. It must also be **assigned to the API client** (`OrderCheckoutIntegrationEventID`), or checkout fails with *"does not have an order calculate event configured"*. The tool does both.

---

## `apps/api`: where OrderCloud calls you

```
apps/api/
├── app/api/
│   ├── shippingrates/route.ts                              # Integration event: shipping estimates
│   ├── ordercalculate/route.ts                             # Integration event: tax
│   ├── [orderID]/payments/[paymentID]/authorize/route.ts   # Card authorization
│   ├── getiframecredentials/route.ts                       # Payment iframe public key
│   ├── webhook/createaddress/route.ts                      # Pre-webhook: validate buyer addresses
│   ├── register/route.ts                                   # Self-service sign-up (called by the storefront)
│   └── greeting/route.ts                                   # Health check (unauthenticated)
└── lib/
    ├── commands/        # Business logic: shipping, tax, payment, register, createaddress
    ├── mappers/         # OrderCloud ↔ provider shape conversion
    ├── mocks/           # Stand-in shipping/tax/payment providers
    ├── oc-client.ts     # Server-to-server OrderCloud client (client credentials)
    ├── webhook-auth.ts  # HMAC-SHA256 verification of x-oc-hash
    ├── cors.ts          # CORS for the one browser-called route
    └── types.ts
```

**Thin routes, fat commands.** Each `route.ts` does three things: verify the request, parse it, delegate to a command in `lib/commands/`. This keeps the HTTP layer swappable. The code began life as Azure Functions, and the commands moved to Next.js almost unchanged.

**Mocks by default.** `lib/mocks/` returns three fixed shipping rates, a flat $7.50 tax, and a "not configured" payment processor. Checkout works end-to-end with zero third-party accounts, which is exactly what you want for a demo. Swapping in EasyPost, Avalara or Stripe means replacing the mock import in a command, nothing else.

**Webhook authentication.** OrderCloud signs every integration-event and webhook request: it computes HMAC-SHA256 of the raw body with your shared hash key and sends it base64-encoded in `x-oc-hash`. `webhook-auth.ts` recomputes and compares it. The key is the same `OC_HASH_KEY` the infrastructure tool registered with OrderCloud.

**Why `/api/register` exists.** A storefront with anonymous shopping uses a public client ID that anyone can read from the browser bundle. That client must **never** have permission to create users. So sign-up posts to `apps/api`, which validates the payload and creates the buyer user with its own server-side credentials. Trade applicants are created with `xp.accountType = "trade"` and `xp.approvalStatus = "pending"`, ready for a human to approve in the admin app.

> **Lesson learned (roles and scopes):** when you request an OAuth token, OrderCloud grants the **intersection** of the roles you ask for and the roles your security profile actually has. Requesting a role you don't hold (for example a blanket `FullAccess`) doesn't throw an error. You get a token with **zero roles**, and every call then fails with a 403. `oc-client.ts` therefore requests an explicit list (`AddressAdmin AddressReader OrderAdmin BuyerUserAdmin BuyerUserReader`) that matches the middleware security profile.

> **Lesson learned (the `/v1` suffix):** the server-side config (`OC_API_URL`) must **omit** `/v1` because the client appends it, while the frontends' `VITE_APP_ORDERCLOUD_BASE_API_URL` **includes** it. Mixing them up gives you `/v1/v1/...` 404s.

---

## `apps/auto`: the Helix Auto storefront

This is the flagship of the demo: an automotive parts store that serves both retail shoppers and trade customers (mechanics, workshops).

```
apps/auto/src/
├── AppProvider.tsx   # Theme + OrderCloudProvider + router + toasts + cart/fulfilment providers
├── routes.tsx        # Home, PLP, PDP, cart, checkout, orders, profile, signup
├── constants.ts      # Reads the VITE_APP_* contract
├── index.css         # Tailwind v4 @theme design tokens (brand orange/steel)
├── components/
│   ├── ui/           # shadcn/ui primitives (button, dialog, sheet, tabs…)
│   ├── product/      # Card, grid, gallery, filters, PriceTag, StockBadge, AddToCart
│   ├── cart/         # Cart sheet, line items, order summary, promo codes
│   ├── checkout/     # Stepper, address form, shipping methods, payment panel
│   ├── orders/       # Order history UI
│   ├── auth/         # Login dialog
│   ├── layout/ brand/ theme/ common/
├── hooks/            # Data + domain logic (see below)
├── lib/              # Pure helpers: product xp, currency, trade pricing, account theme
└── pages/            # One file per route
```

**Why this shape?** Pages compose components; components are dumb; **hooks own OrderCloud data access and domain rules**; `lib/` holds pure, easily testable functions. If you want to know how a feature works, start at its hook.

### Feature walkthrough

**Anonymous shopping, isolated carts.** `@ordercloud/react-sdk`'s `OrderCloudProvider` handles token acquisition. With `IsAnonBuyer` on the API client, each visitor gets their own anonymous token and cart.

**User-specific "trade" pricing (`hooks/use-trade-pricing.ts`, `lib/trade-pricing.ts`).** Trade customers see discounted prices on product cards and product pages *before* adding to the cart. The approach is deliberately conservative:

- Promotions are authored in the admin app's promotion rule builder and assigned to the right buyer/user groups in OrderCloud.
- The storefront calls `Me.ListPromotions()`, which already applies OrderCloud's eligibility rules (group membership, dates, assignments). **The client never re-implements eligibility.**
- `parsePercentOffPromotion` recognises one specific expression shape, "X% off these product IDs" (`item.Product.ID = '…'` with `item.LineSubtotal * 0.1`), and builds a product → best-discount map for preview badges.
- Any other promotion shape is ignored for *preview* purposes but still applies normally at checkout, because OrderCloud remains the source of truth for the actual price.

That split (OrderCloud calculates, the UI only previews what it can parse safely) gives dynamic, per-user pricing without the storefront ever being able to show a price the backend won't honour.

**Click & collect (`hooks/use-fulfilment.tsx`, `hooks/use-stores.ts`).** Shoppers choose delivery or pickup for the whole order:

- Store locations are shared buyer addresses tagged with `xp.isStoreLocation = true`.
- The choice is stored on the order itself (`Order.xp.fulfilmentType`, `Order.xp.pickupStoreName`), and for pickup the store address becomes the shipping address. The checkout, confirmation and order-detail pages all read the same xp.
- Per-store stock comes from OrderCloud **inventory records** (`hooks/use-product-stock.ts`). The admin app manages records for each location (Sydney, Melbourne, warehouse).

> **Lesson learned (xp filtering):** filtering a list on a *boolean* xp field didn't match reliably in our tests, so `use-stores` fetches the shopper's addresses and filters in JavaScript. The list is always small, so that's simpler and more robust.

**Per-account theming (`hooks/use-account-theme.ts`, `lib/account-theme.ts`).** A user's `xp.theme` (primary/brand/accent colours, display name) overrides the site's CSS custom properties at runtime. A trade customer can log in and see the store in their own company colours. It's a small feature that lands well in demos, and it shows how far `xp` can take you without a schema migration.

**Self-service sign-up (`pages/Signup.tsx`).** Personal and trade tabs post to `apps/api`'s `/api/register`, then log the user straight in.

**Orders and profile.** `pages/Orders.tsx` lists past orders, `pages/OrderDetail.tsx` shows each order including its delivery or pickup choice, and `pages/Profile.tsx` shows the shopper's account details.

## `apps/shop`: the Helix tech storefront

`apps/shop` is the simpler sibling: same stack, same structure, same env contract, without the trade, pickup and theming features. It's useful as a clean starting point for a new vertical and as a comparison to show how much of a storefront is "just" OrderCloud SDK calls.

---

## `apps/admin`: a schema-driven back office

```
apps/admin/src/
├── components/
│   ├── ResourceList/ ResourceDetail/ OperationForm/   # Generic list/detail/edit UI for any OC resource
│   ├── OperationForm/ExpressionBuilder/               # Visual rule builder for promotions
│   ├── Inventory/ProductInventoryPanel.tsx            # Per-location stock editing
│   ├── Authentication/ Dashboard/ Layout/ Products/ …
├── config/
│   ├── xpSchemas/            # JSON Schemas describing each resource's xp
│   ├── tableOverrides.ts     # Which columns to show per resource
│   ├── formOverrides.ts      # Form tweaks per resource
│   └── inventoryLocations.ts # The physical stock locations
└── routes/ providers/ hooks/ theme/ utils/
```

**Why schema-driven?** OrderCloud publishes an OpenAPI spec. The admin app renders lists, detail pages and edit forms **from that spec**, so new OrderCloud resources mostly "just appear". You customise behaviour through `config/`, not by writing a page per resource.

**Teaching it about your xp.** OrderCloud's `xp` (extended properties) is free-form JSON, so the spec can't describe it. `config/xpSchemas/` fills that gap. For example, `users.ts` describes the `accountType` / `approvalStatus` / `companyName` fields that sign-up writes, so an admin can review a trade application and flip `approvalStatus` to `approved` with a proper form instead of raw JSON.

**Promotions without writing expressions.** OrderCloud promotions use an expression language (`EligibleExpression`, `ValueExpression`). The `ExpressionBuilder` provides recipes like "X% off selected products" that generate those expressions. These are exactly the shapes the storefront's trade-pricing preview knows how to parse, which closes the loop between admin and storefront.

---

## `apps/seeding`: getting data into the marketplace

This folder vendors the open-source [`@ordercloud/seeding`](https://github.com/ordercloud-api/ordercloud-seed) CLI (MIT licensed), which serializes an **entire** marketplace to and from a single YAML file:

- `seed`: create a fresh sandbox marketplace from a YAML template (for example `Simple-B2C`).
- `download`: export an existing marketplace to YAML, with secrets redacted.
- `validate`: static checks (IDs, required fields, foreign keys) with no API calls.

We added a small **scrape → seed → upload** pipeline for populating demos with realistic catalogues:

- `src/scraping/types.ts` defines a `SiteParser` interface; parsers are registered in `registry.ts`. (No site parsers ship in the public repo. Write your own, and only for sites whose terms permit it.)
- `generate-seed.ts` maps normalised products into OrderCloud `Products`, `PriceSchedules`, `Catalogs`, `Categories` and assignments.
- `upload` pushes just the product-related resources into an **existing** marketplace with client credentials, and is idempotent, so re-runs are safe.

**Don't confuse it with `infrastructure/`.** Both have a `seed` command, but they solve different problems:

| | `infrastructure/` | `apps/seeding` |
|---|---|---|
| Auth | Client credentials on an existing marketplace | Portal username/password |
| Job | Wire the apps (API clients, events, `.env.local`) | Create and populate marketplace data |
| Scope | A handful of resources | The full dataset |

When starting from scratch, the order is: **seeding first** (create and populate the marketplace), **then infrastructure** (wire the apps to it).

---

## Setting it up yourself

### Prerequisites

- Node.js 20+ (the seeding package's `npm run build` specifically needs Node 16)
- A free [OrderCloud Portal](https://portal.ordercloud.io/) account and a **sandbox** marketplace
- For local checkout testing: a tunnel such as `ngrok`, so OrderCloud can reach `localhost:7276`

### 1. Prepare the marketplace (once, in the OrderCloud Portal API Console)

1. Create a **middleware API client** with `AllowSeller: true` and a long random `ClientSecret`.
2. Create an **admin user**.
3. Create a **security profile** with `ApiClientAdmin`, `BuyerAdmin`, `BuyerUserAdmin`, `CatalogAdmin`, `WebhookAdmin`, `SecurityProfileAdmin`, `IntegrationEventAdmin` (plus `AddressAdmin`, `AddressReader`, `OrderAdmin`, `BuyerUserReader` for `apps/api`), and assign it to the admin user.
4. Set the middleware client's `DefaultContextUser` to that admin user.

Optionally, seed demo data first: `cd apps/seeding && npx @ordercloud/seeding seed Simple-B2C -u=<portal user> -p=<portal password>`.

### 2. Start the API and expose it

```bash
cd apps/api
cp .env.local.example .env.local   # OC_API_URL (no /v1), middleware ID/secret, a random OC_HASH_KEY, OC_BUYER_ID
npm install && npm run dev         # http://localhost:7276
ngrok http 7276                    # note the https URL
```

### 3. Run the setup tool

```bash
cd infrastructure
cp .env.local.example .env.local   # same OC_API_URL / middleware creds / OC_HASH_KEY; API_URL = your ngrok URL
npm install
npm run seed
```

This creates the storefront and admin clients, registers the checkout integration event and webhook against your tunnel, and writes `.env.local` for `apps/auto`, `apps/shop` and `apps/admin`.

### 4. Run the apps

```bash
cd apps/auto  && npm install && npm run dev   # http://localhost:3002
cd apps/shop  && npm install && npm run dev   # http://localhost:3001
cd apps/admin && npm install && npm run dev   # http://localhost:3000
```

Browse as a guest, add to cart, check out: shipping and tax come back from `apps/api` via the integration event. Then sign up as a trade customer, approve yourself in the admin app, add yourself to the group your trade promotion is assigned to, and watch the "Trade Price" badges appear.

---

## Keeping secrets out of the repo

Since this is a public repo, a few conventions keep credentials out:

- **Every app reads secrets from `.env.local`**, which is gitignored. Each app ships a `.env.local.example` with empty values and comments.
- **Browser apps only ever get public values**: an API URL and a client ID. Anything privileged (middleware secret, hash key) exists only in `apps/api` and `infrastructure`.
- **No fallback credentials in code.** The payment iframe key, for example, comes from `PAYMENT_IFRAME_PUBLIC_KEY` and defaults to empty.
- **Seed exports redact secrets** (`ClientSecret`, `SharedKey`) automatically.

If you fork the repo, rotate your middleware secret and hash key if they ever touch a commit.

---

## Where to take it next

- Replace the mocks in `apps/api/lib/mocks/` with real EasyPost, Avalara and Stripe calls.
- Use a constant-time comparison (`crypto.timingSafeEqual`) in `webhook-auth.ts` and cache the server-side access token instead of fetching one per request.
- Automate trade approval: an admin "approve" action that sets `approvalStatus` and assigns the user group in one step.
- Add OpenID Connect (the env contract already has the `VITE_APP_ORDERCLOUD_OPENIDCONNECT_*` hooks).
- Pair it with a CMS (Sitecore XM Cloud or any headless CMS) for content-rich product pages.

---

## Takeaways

- **OrderCloud is the system of record; your apps are thin.** Storefronts talk to it directly; your server code only exists where OrderCloud calls out (checkout) or where privileges must stay server-side (registration).
- **`xp` is your friend.** Fulfilment choice, store locations, trade applications and per-account themes are all extended properties, with no schema migrations. Describe them with JSON Schemas so your admin UI stays usable.
- **Let OrderCloud decide eligibility and price.** Preview in the UI only what you can derive safely; the cart is the truth.
- **Script your wiring.** A setup CLI that creates clients, assigns integration events and writes env files saves hours every time you spin up a new sandbox.

Happy building! Issues and PRs are welcome on the repo.
