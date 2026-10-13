# Solution Architecture

This is a Sitecore OrderCloud accelerator monorepo containing three independently deployed applications under `apps/`.

---

## Applications

| App | Path | Tech | Default Port |
|-----|------|------|-------------|
| Admin dashboard | `apps/admin` | React + Vite | 3000 |
| Storefront | `apps/storefront` | React + Vite | 3001 |
| API / webhook handler | `apps/api` | Next.js (App Router) | 7276 |
| OrderCloud setup tool | `infrastructure` | Node.js (TypeScript CLI) | — |

> `apps/seeding` is a separate, pre-existing OrderCloud YAML-based seeding CLI and is not part of the accelerator's own tooling.

---

## Architecture Overview

```
┌─────────────────────┐   ┌──────────────────────┐
│  Storefront (3001)  │   │  Admin Dashboard (3000)│
│  React + Vite       │   │  React + Vite          │
└────────┬────────────┘   └──────────┬─────────────┘
         │ ordercloud-javascript-sdk  │ ordercloud-javascript-sdk
         ▼                            ▼
┌─────────────────────────────────────────────────────┐
│               OrderCloud API                        │
│         (australiaeast-sandbox.ordercloud.io)       │
└────────────────────┬────────────────────────────────┘
                     │ webhooks & integration events
                     ▼
         ┌───────────────────────┐
         │  API Layer (7276)     │
         │  Next.js App Router   │
         ├───────────────────────┤
         │ POST /api/shippingrates        │
         │ POST /api/ordercalculate       │
         │ POST /api/:orderID/            │
         │      payments/:paymentID/      │
         │      authorize                 │
         │ GET  /api/getiframecredentials │
         └──────────┬────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    EasyPost    Avalara      Stripe
   (shipping)   (tax)       (payment)
```

---

## How the Apps Interact

### Frontend → OrderCloud (direct)

Neither the storefront nor the admin call the `apps/api` layer directly. Both use the **ordercloud-javascript-sdk** to communicate with the OrderCloud API. Configuration is provided via environment variables:

**Storefront** (`apps/storefront/.env.local`):
```
VITE_APP_ORDERCLOUD_BASE_API_URL=https://australiaeast-sandbox.ordercloud.io
VITE_APP_ORDERCLOUD_CLIENT_ID=<buyer-app-client-id>
VITE_APP_ORDERCLOUD_SCOPE=<buyer-roles>
VITE_APP_ORDERCLOUD_ALLOW_ANONYMOUS=true
```

**Admin** (`apps/admin/.env.local`):
```
VITE_APP_ORDERCLOUD_BASE_API_URL=https://australiaeast-sandbox.ordercloud.io
VITE_APP_ORDERCLOUD_CLIENT_ID=<admin-client-id>
VITE_APP_ORDERCLOUD_SCOPE=<admin-roles>
```

### OrderCloud → API (webhooks)

The OrderCloud platform calls the `apps/api` layer as webhook/integration events during checkout. The webhook URLs are registered with OrderCloud once during initial setup via the `infrastructure/` seeding tool.

All webhook endpoints are protected with **HMAC-SHA256 signature verification**: OrderCloud signs the request body with a shared `HashKey` and includes the base64-encoded result in the `x-oc-hash` header. The API validates this before processing.

#### Integration Events (synchronous, called during checkout)

| Event | Endpoint | Purpose |
|-------|----------|---------|
| Shipping estimate | `POST /api/shippingrates` | Returns available shipping methods and rates for the order |
| Order calculate | `POST /api/ordercalculate` | Calculates tax total; result is written back to the order's `TaxTotal` field |

Both receive an `OrderCheckoutIEPayload` containing the full `OrderWorksheet` (order + line items).

#### Webhooks

| Trigger | Endpoint | Purpose |
|---------|----------|---------|
| Payment authorize | `POST /api/:orderID/payments/:paymentID/authorize` | Calls the payment processor to authorize the card; patches the payment and records a transaction back to OrderCloud |
| Get iframe credentials | `GET /api/getiframecredentials` | Returns the payment processor's public key for the card-entry iframe |

### API → OrderCloud (server-to-server)

The payment authorize endpoint makes callbacks to the OrderCloud API using **client credentials** (middleware client ID + secret), fetching the order worksheet and payment, then patching/creating a transaction after authorization.

---

## Webhook Registration

The Integration Event is registered during the initial accelerator setup using the `infrastructure/` Node tool (`infrastructure/src/compose-marketplace.ts`). The tool calls the OrderCloud API to create an **Integration Event** of type `OrderCheckout` whose `CustomImplementationUrl` is `{apiBaseUrl}/api` (OrderCloud appends the operation suffix, e.g. `/shippingrates`). It also registers a buyer-address pre-webhook at `{apiBaseUrl}/api/webhook/createaddress` (note: no handler for that route exists in `apps/api` yet).

The same `HashKey` configured in the API's `OC_HASH_KEY` environment variable is stored in OrderCloud during registration.

---

## Local Development Setup

Run each app independently:

```bash
# Terminal 1 — API layer
cd apps/api
cp .env.local.example .env.local   # fill in OC_MIDDLEWARE_CLIENT_ID, OC_MIDDLEWARE_CLIENT_SECRET, OC_HASH_KEY
npm install && npm run dev          # http://localhost:7276

# Terminal 2 — Storefront
cd apps/storefront
npm install && npm run dev          # http://localhost:3001

# Terminal 3 — Admin
cd apps/admin
npm install && npm run dev          # http://localhost:3000
```

For OrderCloud to reach your local API during development, expose port 7276 via a tunnel (e.g. `ngrok http 7276`) and update the Integration Event URL in the OrderCloud portal or re-run the infrastructure tool with the tunnel URL.

---

## Mock Services

The API ships with in-memory mocks for all third-party integrations so checkout flows work without real credentials:

| Service | Mock behaviour |
|---------|---------------|
| Shipping (EasyPost) | Returns three hardcoded rates: Express $45.45, Priority $9.75, GroundAdvantage $5.62 |
| Tax (Avalara) | Returns a fixed $7.50 tax total |
| Payment (Stripe) | `getIFrameCredentials` returns `null` → falls back to Stripe test key; `authorizeCC` throws (endpoint returns 500) |

Replace the mock imports in `lib/commands/payment.ts`, `lib/commands/shipping.ts`, and `lib/commands/tax.ts` with real third-party SDK calls when integrating for production.

---

## Infrastructure / Setup Tool

Located at `infrastructure/`. A Node.js (TypeScript) CLI, run with `tsx`, that prepares the OrderCloud marketplace. Two commands:

- **`npm run seed`** — creates (or reuses) the storefront + admin API clients, the buyer, security profiles, and anonymous default-context user; writes the `.env.local` files for the storefront and admin apps; then registers the OrderCheckout integration event and buyer-address webhook against the deployed API URL.
- **`npm run env`** — only (re)writes the `.env.local` files from already-configured client IDs (no OrderCloud calls).

Configuration is read from `infrastructure/.env.local` (gitignored; copy from `.env.local.example`) or matching environment variables. Azure resource provisioning that previously lived here has been removed — apps are hosted wherever you choose. See `infrastructure/README.md` for details.

---

## Planned: Google sign-in (OpenID Connect) for the buyer storefronts

> **Status: planned, not yet implemented.** This section documents the intended design so it can
> be picked up later. The buyer storefronts this targets are `apps/shop` (Helix tech store, port
> 3001) and `apps/auto` (Helix Auto, port 3002) — the active React + Vite + Tailwind/shadcn
> storefronts that use `@ordercloud/react-sdk`. Today both authenticate buyers with
> username/password only.

### Goal

Add a **"Continue with Google"** option to both storefronts. A Google account becomes a real
OrderCloud buyer user, so shoppers get saved carts, addresses, and order history. OrderCloud
itself brokers the OAuth handshake via its **OpenID Connect** feature — the apps never talk to
Google directly.

### Why it's mostly wiring on the front end

Both apps already pass an `openIdConnect` block to `OrderCloudProvider` (reading
`VITE_APP_ORDERCLOUD_OPENIDCONNECT_*` env vars) — the values are simply empty today. The
`@ordercloud/react-sdk` does the heavy lifting:

- `loginWithOpenIdConnect(configId)` redirects the browser to `{baseApiUrl}/ocrplogin?id=…&cid=…`.
- On return, an SDK effect reads the OrderCloud token / refresh / IDP token from the query params,
  stores them, and strips them from the URL — so **no token-parsing code is needed in the app**.

### End-to-end flow

```
 Storefront ──loginWithOpenIdConnect()──▶ OrderCloud /ocrplogin
      ▲                                          │
      │                                          ▼
      │                                    Google consent
      │                                          │
      │                                          ▼
      │                              Google ─▶ OrderCloud /ocrpcode
      │                                          │
      │   (first login) OrderCloud ──▶ apps/api  POST /api/createuser   ── creates buyer user
      │   (next logins) OrderCloud ──▶ apps/api  POST /api/syncuser     ── updates buyer user
      │                                          │
      └──── redirect to AppStartUrl ?token={0} ──┘   (SDK stores token, cleans URL)
```

### New OrderCloud resources (registered by the `infrastructure/` tool)

| Resource | Purpose |
|----------|---------|
| `OpenIDConnect` Integration Event | `CustomImplementationUrl` = `{apiBaseUrl}/api` (shares the base with OrderCheckout; OrderCloud appends `/createuser` and `/syncuser`). `ElevatedRoles: ["BuyerUserAdmin"]`, HMAC-protected with the shared `OC_HASH_KEY`. |
| `OpenIdConnect` config `google-shop` | Points at the **storefront** API client; `AppStartUrl` → `apps/shop` (`http://localhost:3001/?token={0}&idptoken={1}&refresh={3}`). |
| `OpenIdConnect` config `google-auto` | Points at the **auto** API client; `AppStartUrl` → `apps/auto` (port 3002). |

Each `OpenIdConnect` config carries the Google `ConnectClientID`/`ConnectClientSecret`,
`AuthorizationEndpoint=https://accounts.google.com/o/oauth2/v2/auth`,
`TokenEndpoint=https://oauth2.googleapis.com/token`, and `IntegrationEventID` referencing the
event above. `apps/auto` gets its **own** OrderCloud buyer + security profile + API client
(mirroring how `apps/shop` reuses the storefront client today); the infra tool, which currently
only manages storefront/admin/shop, is extended to provision and write `.env.local` for it.

### New `apps/api` endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/createuser` | First Google login: decode the Google `id_token`, create the OrderCloud buyer user, return `{ Username, ErrorMessage }`. |
| `POST /api/syncuser` | Subsequent logins: update the existing buyer user from current Google claims. |

Both reuse the existing **HMAC-SHA256 `x-oc-hash`** verification (`apps/api/lib/webhook-auth.ts`)
and follow the thin-route → `lib/commands/` pattern used by the existing integration events.

### Prerequisites & new configuration

- **Manual (one-time):** create a Google Cloud OAuth 2.0 Client ID with the authorized redirect URI
  set to OrderCloud's callback — `https://{OC_API_HOST}/ocrpcode` (not the app). Supply its client
  ID/secret to the infra tool.
- **Infra `.env.local`:** `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `SHOP_APP_URL`,
  `AUTO_APP_URL`, `AUTO_DIR`, `AUTO_APP_NAME` (OIDC registration is skipped when the Google creds
  are blank, like webhook registration is skipped when `API_URL` is blank).
- **Per-app `.env.local`** (written by the infra tool): `VITE_APP_ORDERCLOUD_OPENIDCONNECT_ENABLED`,
  `…_CONFIG_ID` (`google-shop` / `google-auto`), and the `…_ACCESS_TOKEN_QUERY_PARAM_NAME` /
  `…_REFRESH_…` / `…_IDP_ACCESS_…` param names matching each config's `AppStartUrl`.
- **`apps/api`** needs a config-id → buyer-id mapping so `/createuser` targets the right buyer.
- OrderCloud calls `/createuser` and `/syncuser` server-to-server, so `apps/api` must be reachable
  at a public `API_URL` (the same tunnel already required for the OrderCheckout integration event).
