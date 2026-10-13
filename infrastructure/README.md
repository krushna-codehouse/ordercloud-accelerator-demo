# Infrastructure — OrderCloud Setup Tool

A small Node.js CLI that prepares an OrderCloud marketplace for the accelerator's apps. It:

1. Creates (or reuses) the **Storefront** and **Admin** API clients, along with the buyer, security profiles, and anonymous default-context user they need.
2. Writes each app's `apps/<app>/.env.local` with its client ID and OrderCloud config.
3. Registers the **OrderCheckout integration event** and the **buyer-address webhook** pointing at the deployed `apps/api` (Next.js).

> This replaces the previous C# tool. Azure resource provisioning has been removed — the apps are now hosted wherever you choose, and only the OrderCloud setup remains.

## Prerequisites

- Node.js 20+
- An OrderCloud marketplace with a privileged API client (the "middleware" client) that has these roles: `ApiClientAdmin`, `BuyerAdmin`, `BuyerUserAdmin`, `CatalogAdmin`, `WebhookAdmin`, `IntegrationEventAdmin`, `SecurityProfileAdmin`.

## Configure

```bash
cd infrastructure
npm install
cp .env.local.example .env.local   # .env.local is gitignored
```

Fill in `.env.local` (every value can also be supplied as a real environment variable):

| Variable | Required | Purpose |
|----------|----------|---------|
| `OC_API_URL` | yes | OrderCloud API base URL for your region, **without** `/v1` (e.g. `https://australiaeast-sandbox.ordercloud.io`) |
| `OC_MIDDLEWARE_CLIENT_ID` / `OC_MIDDLEWARE_CLIENT_SECRET` | yes | Privileged client used to authenticate this tool. |
| `OC_HASH_KEY` | yes | Shared secret to verify OrderCloud webhook/integration-event requests. Must match `OC_HASH_KEY` in `apps/api`. |
| `API_URL` | for webhooks | Public base URL of the deployed `apps/api`. Leave blank to skip integration-event + webhook registration. |
| `OC_STOREFRONT_CLIENT_ID` / `OC_ADMIN_CLIENT_ID` | no | Reuse existing clients instead of creating new ones. |
| `OC_STOREFRONT_SCOPE` / `OC_ADMIN_SCOPE` | no | Space-delimited role lists. |
| `OC_STOREFRONT_CUSTOM_SCOPE` / `OC_ADMIN_CUSTOM_SCOPE` | no | Space-delimited custom-role lists. |
| `OC_STOREFRONT_ALLOW_ANON` | no | `true` to enable anonymous shopping (creates a default-context user). |
| `STOREFRONT_DIR` / `ADMIN_DIR` | no | Override the `apps/` directory names that receive `.env.local` (default `storefront` / `admin`). |

## Run

```bash
# Full setup: create clients, write .env.local files, register integration event + webhook
npm run seed

# Just (re)write the .env.local files from already-configured client IDs — no OrderCloud calls
npm run env
```

## Structure

| File | Responsibility |
|------|----------------|
| `src/index.ts` | CLI entry point (`seed` / `env` commands) |
| `src/config.ts` | Loads `.env.local` / environment variables |
| `src/oc-client.ts` | Configures the OrderCloud SDK and authenticates |
| `src/compose-marketplace.ts` | Creates API clients, registers the integration event + webhook |
| `src/write-env.ts` | Writes the apps' `.env.local` files |
