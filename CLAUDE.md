# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Sitecore OrderCloud accelerator: a set of applications plus a Node.js tooling project that prepares an OrderCloud marketplace. The accelerator's job is to stand up three apps (storefront, admin, integrations/API) wired to OrderCloud and generate their `.env.local` files. (Azure resource provisioning was removed — apps are hosted wherever you choose.)

## Repository layout

- `apps/shop` — **Helix**, the current buyer-facing storefront. React 18 + Vite + **Tailwind CSS v4 + shadcn/ui** (no Chakra). Uses `@ordercloud/react-sdk` for auth/cart/data. Dev port **3001**. This is the active storefront for the demo.
- `apps/storefront` — the original buyer-facing shopping app. React 18 + Vite + Chakra UI. Dev port **3001**. Kept as a reference; superseded by `apps/shop`.
- `apps/admin` — seller/admin dashboard. React 18 + Vite + Chakra UI. Dev port **3000**.
- `apps/api` — the integrations/webhook layer, **Next.js (App Router)**. Dev port **7276**.
- `apps/seeding` — a separate, pre-existing OrderCloud marketplace seeding CLI (the `@ordercloud/seeding` package, vendored from [ordercloud-api/ordercloud-seed](https://github.com/ordercloud-api/ordercloud-seed)). Serializes a whole OrderCloud marketplace to/from a single YAML file. **Not** part of the accelerator's own tooling and unrelated to `infrastructure/`; leave it alone unless asked. Fuller writeup under [The seeding CLI](#the-seeding-cli-appsseeding) below.
- `infrastructure/` — Node.js (TypeScript) CLI that sets up the OrderCloud marketplace and writes the apps' `.env.local` files. Run with `tsx`.
- `architecture.md` — fuller prose description of the cross-app architecture.

There is no root package manager / monorepo orchestrator (no turbo/nx/workspaces). Each app is installed, built, and deployed independently from its own directory.

## Commands

Frontend apps (`apps/shop`, `apps/storefront`, `apps/admin`) — run from each app dir:
```bash
npm install
npm run dev      # vite dev server (shop:3001, storefront:3001, admin:3000)
npm run build    # tsc && vite build
npm run lint     # eslint, --max-warnings 0
npm run preview  # preview a production build
```
`apps/shop` (Helix) is Tailwind v4 + shadcn/ui: design tokens live in `src/index.css` (`@theme`),
the `cn()` helper in `src/lib/utils.ts`, UI primitives in `src/components/ui/`, OrderCloud
data helpers in `src/lib/product.ts`. It reuses the same `VITE_APP_*` env contract as `apps/storefront`,
so the infrastructure tool generates its `.env.local` too. (`apps/shop` and `apps/storefront` both
default to port 3001 — run one at a time.)

API layer (`apps/api`) — run from `apps/api`:
```bash
npm install
npm run dev      # next dev on port 7276
npm run build    # next build
npm run start    # next start on port 7276
```

Infrastructure tool (Node.js, from `infrastructure/`):
```bash
npm install
npm run seed     # create OC API clients, write apps' .env.local, register integration event + webhook
npm run env      # only (re)write the apps' .env.local from configured client IDs (no OC calls)
npx tsc --noEmit # typecheck
```
Config comes from `infrastructure/.env.local` (gitignored; copy from `.env.local.example`) or matching environment variables.

## How the apps fit together

The frontends never call `apps/api` directly. The flow is:

1. **Storefront/Admin → OrderCloud API.** Both apps talk only to the hosted OrderCloud API via `ordercloud-javascript-sdk` / `@ordercloud/react-sdk`. Configuration comes entirely from `VITE_APP_*` env vars read in `src/constants.ts` and passed to `<OrderCloudProvider>` (see `apps/storefront/src/AppProvider.tsx`). Key vars: `VITE_APP_ORDERCLOUD_BASE_API_URL`, `VITE_APP_ORDERCLOUD_CLIENT_ID`, `VITE_APP_ORDERCLOUD_ALLOW_ANONYMOUS`.
2. **OrderCloud → `apps/api`.** During checkout, OrderCloud calls the API layer as **Integration Events** (synchronous) and webhooks. The endpoints:
   - `POST /api/shippingrates` — returns shipping methods/rates for the order
   - `POST /api/ordercalculate` — returns the order's tax total
   - `POST /api/[orderID]/payments/[paymentID]/authorize` — authorizes a card payment, then patches the payment + records a transaction back in OrderCloud
   - `GET /api/getiframecredentials` — returns the payment processor's iframe public key
   - `GET /api/greeting` — sample/health endpoint, the only unauthenticated route
3. **`apps/api` → OrderCloud (server-to-server).** The payment route reads the order worksheet/payment and writes transactions back, authenticating with **client-credentials** (middleware client ID + secret).

### Webhook authentication

Every endpoint except `/api/greeting` verifies the request came from OrderCloud: HMAC-SHA256 of the raw request body keyed with the shared `OC_HASH_KEY`, base64-encoded, compared against the `x-oc-hash` header (`apps/api/lib/webhook-auth.ts`). The same hash key (`OC_HASH_KEY`) is stored in OrderCloud by the infrastructure tool at registration time. For GET routes the hash is computed over an empty string.

### Third-party integrations are mocked

`apps/api/lib/mocks/` provides stand-in implementations so checkout works without real credentials. Shipping returns three fixed rates, tax returns a fixed $7.50, and payment auth throws (the iframe-credentials route falls back to a Stripe test key). The intended integrations are EasyPost (shipping), Avalara (tax), and Stripe (payment) — swap the mock imports in `lib/commands/*` for real SDK calls.

### API code organization (`apps/api`)

Route handlers in `app/api/**/route.ts` stay thin: verify auth, parse the payload, delegate to a command. Business logic lives in `lib/commands/` (greeting, shipping, tax, payment), with `lib/mappers/` for OrderCloud↔integration shape conversion, `lib/oc-client.ts` for the server-to-server OrderCloud client, and `lib/types.ts` for shared types.

## The infrastructure seeding tool

`infrastructure/src/index.ts` is a TypeScript CLI with two commands:
- **`seed`** — authenticates with the middleware client, creates (or reuses) the storefront + admin OrderCloud API clients, writes both apps' `.env.local`, then registers the OrderCheckout integration event and buyer-address webhook against `apiUrl` (skipped if `apiUrl` is blank).
- **`env`** — only (re)writes the apps' `.env.local` from already-configured client IDs; makes no OrderCloud calls.

Logic is split across `config.ts` (loads `.env.local` via dotenv), `oc-client.ts` (SDK auth via `ordercloud-javascript-sdk`), `compose-marketplace.ts` (the OrderCloud resource creation), and `write-env.ts`. Env vars are UPPER_SNAKE_CASE (`OC_API_URL`, `OC_MIDDLEWARE_CLIENT_ID`, `OC_HASH_KEY`, `API_URL`, …). `OC_API_URL` must omit the `/v1` suffix (the SDK appends it).

> The integration event's `CustomImplementationUrl` is set to `${apiUrl}/api` (OrderCloud appends the operation suffix, e.g. `/shippingrates`). The buyer-address webhook is registered at `${apiUrl}/api/webhook/createaddress`, but no handler for it exists in `apps/api` yet.

## The seeding CLI (`apps/seeding`)

A vendored copy of the open-source `@ordercloud/seeding` package — a CLI + JS library that serializes an **entire** OrderCloud marketplace (every resource type) to/from one YAML file. It is independent of the accelerator and is **not** wired into the apps; it ships its own `package.json`, build, and tests.

### Don't confuse it with `infrastructure/`

Both have a `seed` command, but they do different jobs and are not connected:

| | `infrastructure/` (accelerator tooling) | `apps/seeding` (vendored CLI) |
|---|---|---|
| Auth | OrderCloud **client-credentials** against an existing marketplace | **Portal** username/password (`portal.ordercloud.io`) |
| What it does | Creates the storefront/admin API clients, writes apps' `.env.local`, registers the checkout integration event + webhook | Stands up a **brand-new sandbox marketplace** and bulk-uploads catalogs, products, buyers, security profiles, etc. from a YAML template |
| Scope | Just the wiring the three apps need | The full marketplace dataset |
| Run with | `tsx` | its own rollup build / packaged executable |

Typical order if you were bootstrapping from scratch: `apps/seeding seed` to create + populate a marketplace, then `infrastructure` to create the app clients and `.env.local` files against it.

### Commands (run from `apps/seeding`)

```bash
# via the published package without cloning behavior:
npx @ordercloud/seeding seed Simple-B2C -u={portalUser} -p={portalPass}   # new sandbox marketplace from a template alias, local file, or URL
npx @ordercloud/seeding download out.yml -i={marketplaceID} -u=… -p=…      # serialize an existing marketplace to YAML
npx @ordercloud/seeding validate my-file.yml                              # static checks only, no OrderCloud calls

# local dev (this checkout):
npm install
npm run build    # rollup; rebuild after every source change. NOTE: requires Node 16 — Node 17+ fails to build
npm run test     # jest (tests in tests/, fixtures in tests/data/)
node ./dist/cli.js [command]   # debug a built command
npm run scrape -- <url> [opts] # scrape a product listing page into a seed file (see below; runs via tsx)
npm run pkg      # build standalone win/macos/linux executables into exe/ (via @vercel/ncc + pkg)
```

### How it works

- **Entry points:** `src/cli.ts` (yargs CLI) and `src/index.ts` (library exports `seed`, `download`, `validate`, `scrape`, `SerializedMarketplace`).
- **`seed`** authenticates to the Portal, refuses non-sandbox orgs, creates the marketplace, then uploads every resource. The resource catalog lives in `src/models/oc-resource-directory.ts` — each entry declares its SDK object, `createPriority` (resources are created highest-priority first so dependencies exist), foreign keys, owner-ID field, redacted fields, and a custom validation func. Several resource types need special handling (API clients get freshly generated secrets and an old-ID→new-ID map, specs defer their `DefaultOptionID` until options exist, categories upload depth-by-depth, variants are generated then patched).
- **`download`** lists every resource (and child/grandchild resources like variant inventory records), **redacts secrets** (`ClientSecret`, `SharedKey`, etc.) to a placeholder, and swaps the marketplace's own ID for a `<MarketplaceID placeholder>` token so the file is reusable.
- **`validate`** builds the same resource directory and checks duplicate IDs/usernames, required fields, type/length/range, ID character rules, and foreign-key references — all in memory, no API calls.
- **Plumbing:** `src/services/portal.ts` (Portal auth + org create/token), `src/services/ordercloud-bulk.ts` (throttled bulk create/list via Bottleneck — `maxConcurrent: 8`, `minTime: 100ms` — with a retry schedule), and a 10-minute token auto-refresh. Bundled templates and example seed files live in `seeds/` (alias manifest in `seeds/meta.json`, e.g. `Simple-B2C`, `Vercel-B2C`).

### Scraping products into a seed (`scrape`)

An accelerator extension (not part of upstream `@ordercloud/seeding`): scrape a public product-listing page into a seed YAML so a marketplace can be populated with real products. Run with `npm run scrape -- <url> [opts]` (executes via `tsx`, not the rollup build).

```bash
npm run scrape -- "<listing-page-url>" --site my-site   # --limit defaults to 100 (use 0 for no limit)
```

Flow (`src/commands/scrape.ts`): resolve a **site parser** → scrape normalized products → download their images to `output/products/images/` → generate a seed YAML at `output/products/<site>-products.yml`.

- **Site parsers** (`src/scraping/`): each site implements the `SiteParser` interface (`types.ts`) and is registered in `registry.ts`; `--site` or hostname auto-detect picks one. **Adding a site = add a parser file + register it.** Each parser owns its own fetch strategy. No parsers ship with the public repo (`parsers` in `registry.ts` is empty) — add your own for sites whose terms permit scraping. A parser for a client-rendered site can drive a headless browser (Puppeteer) and intercept the page's own JSON responses; keep the response→product mapping a pure function so it can be unit-tested from a fixture.
- **Images** (`src/scraping/image-downloader.ts`): downloaded locally; the YAML references them at a base URL you host them under — `PRODUCT_IMAGE_BASE_URL` in `.env.local` (see `.env.local.example`) or `--image-base-url` (flag wins). `--no-images` skips the download but still writes the hosted URLs into `xp.Images`.
- **Generator** (`src/scraping/generate-seed.ts`): maps products → `Products` (+ `xp.Images`/`xp.Price`/`xp.PriceCurrency`), `PriceSchedules`, a `Catalog`, `Categories`, and the catalog/category `Assignments`, matching `Simple-B2C.yml` shapes. `--mode complete` (default) overlays them onto a scaffold (default: bundled `Simple-B2C.yml`, `--scaffold` to override; its product-dependent collections are cleared to avoid dangling FKs) so the file seeds standalone; `--mode fragment` emits product resources only, to merge into an existing marketplace.
- **Puppeteer** is loaded lazily (`require` inside the parser) so `seed`/`download`/`validate` and the packaged executables are unaffected; it is **not** meant to be bundled by `npm run pkg`. `output/` and `.env.local` are gitignored.
- Validate the result before seeding: `node ./dist/cli.js validate output/products/my-site-products.yml`.

## Setup prerequisites

Per-app `.env.local` files are required for the frontends and `apps/api`. The frontend ones are generated by the infrastructure tool (`npm run seed` / `npm run env`). `apps/api/.env.local.example` lists the API's own vars (`OC_API_URL`, `OC_MIDDLEWARE_CLIENT_ID`, `OC_MIDDLEWARE_CLIENT_SECRET`, `OC_HASH_KEY`) — fill these in by hand. See `infrastructure/README.md` for the OrderCloud setup walkthrough.
