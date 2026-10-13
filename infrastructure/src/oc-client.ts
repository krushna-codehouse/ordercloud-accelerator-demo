import { ApiRole, Auth, Configuration, Tokens } from 'ordercloud-javascript-sdk'
import type { AppSettings } from './config.js'

// Roles required to create API clients, buyers, security profiles, users,
// webhooks and integration events (mirrors the original C# seeding client).
const SEED_ROLES: ApiRole[] = [
  'ApiClientAdmin',
  'BuyerAdmin',
  'BuyerUserAdmin',
  'CatalogAdmin',
  'WebhookAdmin',
  'IntegrationEventAdmin',
  'SecurityProfileAdmin',
]

// Points the SDK at the configured marketplace and authenticates with the
// middleware client credentials. baseApiUrl must NOT include the /v1 suffix —
// the SDK appends the API version itself.
export async function authenticate(config: AppSettings): Promise<void> {
  Configuration.Set({ baseApiUrl: config.ocApiUrl })
  const auth = await Auth.ClientCredentials(
    config.ocMiddlewareClientSecret,
    config.ocMiddlewareClientId,
    SEED_ROLES
  )
  Tokens.SetAccessToken(auth.access_token)
}
