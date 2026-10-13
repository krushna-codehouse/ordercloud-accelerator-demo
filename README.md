# OrderCloud Accelerator Demo

A demo built on the Sitecore OrderCloud accelerator. It provides storefronts, an admin app and an integrations API wired to an OrderCloud marketplace, plus a small Node.js tool that sets up the marketplace and generates each app's local configuration.

> This is a demo project, not production software. No credentials are included — every app reads its configuration from a gitignored `.env.local` (copy the matching `.env.local.example`).

| App | Path | Description |
|-----|------|-------------|
| Helix Auto storefront | `apps/auto` | Automotive B2C/B2B demo store — trade accounts with per-user pricing, click & collect, per-account theming. React + Vite + Tailwind v4 + shadcn/ui (port 3002) |
| Helix storefront | `apps/shop` | Tech-store demo storefront — React + Vite + Tailwind v4 + shadcn/ui (port 3001) |
| Admin | `apps/admin` | Seller/admin dashboard (React + Vite + Chakra UI, port 3000) |
| API | `apps/api` | Integration-event / webhook handler called by OrderCloud during checkout, plus self-service registration (Next.js, port 7276) |
| Setup tool | `infrastructure` | Node.js CLI that creates OrderCloud API clients, registers the checkout integration event + webhook, and writes the apps' `.env.local` files |
| Seeding CLI | `apps/seeding` | Vendored [`@ordercloud/seeding`](https://github.com/ordercloud-api/ordercloud-seed) (MIT) with an added scrape → seed → upload pipeline |

> Azure resource provisioning is not part of this demo — deploy the apps to whatever host you prefer. `apps/seeding` is optional and not required to run the apps.

## Getting Started

### 1. Configure OrderCloud

In the API console for your marketplace:

1. Create an API Client for the middleware/setup tool:
    ```json
    {
        "AppName": "Middleware",
        "Active": true,
        "ClientSecret": "GENERATE_A_LONG_NONGUESSABLE_SECRET",
        "AccessTokenDuration": 600,
        "RefreshTokenDuration": 3200,
        "AllowSeller": true
    }
    ```
2. Create an admin user:
    ```json
    { "ID": "admin", "Username": "admin", "FirstName": "Admin", "LastName": "User", "Email": "admin@example.com", "Active": true }
    ```
3. Create a security profile with the roles the setup tool needs:
    ```json
    {
        "ID": "middleware",
        "Name": "Middleware",
        "Roles": ["ApiClientAdmin", "BuyerAdmin", "BuyerUserAdmin", "CatalogAdmin", "WebhookAdmin", "SecurityProfileAdmin", "IntegrationEventAdmin"]
    }
    ```
4. Assign the security profile to the admin user, and set the API Client's `DefaultContextUser` to the admin user.

### 2. Run the setup tool

```bash
cd infrastructure
npm install
cp .env.local.example .env.local   # gitignored; fill in your values
npm run seed
```

This creates the storefront + admin API clients, writes `apps/auto/.env.local`, `apps/shop/.env.local` and `apps/admin/.env.local` (directories set by `STOREFRONT_DIR` / `SHOP_DIR` / `ADMIN_DIR`), and — if `API_URL` is set — registers the OrderCheckout integration event and buyer-address webhook. See [`infrastructure/README.md`](infrastructure/README.md) for the full configuration reference.

### 3. Configure and run the API

```bash
cd apps/api
cp .env.local.example .env.local   # fill in OC_MIDDLEWARE_CLIENT_ID/SECRET, OC_HASH_KEY
npm install && npm run dev          # http://localhost:7276
```

For OrderCloud to reach the API during local development, expose port 7276 with a tunnel (e.g. `ngrok http 7276`) and set that URL as `API_URL` in `infrastructure/.env.local` before running `npm run seed`.

### 4. Run the apps

```bash
cd apps/auto       && npm install && npm run dev   # http://localhost:3002  (Helix Auto)
cd apps/shop       && npm install && npm run dev   # http://localhost:3001  (Helix tech store)
cd apps/admin      && npm install && npm run dev   # http://localhost:3000
```

`apps/auto`'s sign-up page calls `apps/api` directly (`POST /api/register`); set `VITE_APP_API_URL` in `apps/auto/.env.local` if the API isn't on `http://localhost:7276`.

### Admin application login

To log into the admin app, create an admin user **with a password** in the [OrderCloud Portal](https://portal.ordercloud.io/) API Console. It will inherit the admin security profile roles needed to view and edit the resources in the admin application.

## Architecture

See [`architecture.md`](architecture.md) for how the apps and OrderCloud interact.
