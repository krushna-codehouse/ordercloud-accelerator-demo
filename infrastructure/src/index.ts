import { loadConfig } from './config.js'
import { authenticate } from './oc-client.js'
import {
  configureOrderCheckoutIntegrationEvent,
  configureWebhooks,
  createApiClients,
} from './compose-marketplace.js'
import { writeEnvFile } from './write-env.js'

type Command = 'seed' | 'env'

async function seed(): Promise<void> {
  const config = loadConfig()
  await authenticate(config)

  // 1. Create (or reuse) the storefront + admin API clients.
  const { storefrontClientId, adminClientId } = await createApiClients(config)

  // 2. Write each app's .env.local with its client ID + OrderCloud config.
  writeEnvFile(config, 'storefront', config.storefrontDir, storefrontClientId)
  writeEnvFile(config, 'admin', config.adminDir, adminClientId)
  // Helix storefront (apps/shop) is also a buyer app — reuse the storefront client.
  writeEnvFile(config, 'storefront', config.shopDir, storefrontClientId, config.shopAppName)

  // 3. Register the OrderCheckout integration event + buyer-address webhook.
  //    These require the deployed API URL; skip if it isn't configured yet.
  if (config.apiUrl) {
    await configureOrderCheckoutIntegrationEvent(config, storefrontClientId)
    await configureWebhooks(config, storefrontClientId)
  } else {
    console.warn(
      'API_URL is not set — skipping integration event + webhook registration. Set API_URL in infrastructure/.env.local once apps/api is deployed.'
    )
  }

  console.log('Done.')
}

// Writes .env.local files from already-configured client IDs (no OrderCloud calls).
function env(): void {
  const config = loadConfig()
  if (!config.ocStorefrontClientId || !config.ocAdminClientId) {
    throw new Error(
      'env requires OC_STOREFRONT_CLIENT_ID and OC_ADMIN_CLIENT_ID in infrastructure/.env.local. Run `npm run seed` to create them.'
    )
  }
  writeEnvFile(config, 'storefront', config.storefrontDir, config.ocStorefrontClientId)
  writeEnvFile(config, 'admin', config.adminDir, config.ocAdminClientId)
  writeEnvFile(config, 'storefront', config.shopDir, config.ocStorefrontClientId, config.shopAppName)
  console.log('Done.')
}

async function main(): Promise<void> {
  const command = (process.argv[2] ?? 'seed') as Command
  switch (command) {
    case 'seed':
      await seed()
      break
    case 'env':
      env()
      break
    default:
      console.error(`Unknown command "${command}". Use "seed" or "env".`)
      process.exit(1)
  }
}

main().catch((err: unknown) => {
  console.error('\nSetup failed:')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
