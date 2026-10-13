import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Load infrastructure/.env.local. Real environment variables take precedence
// (dotenv does not override values already present in process.env).
loadEnv({ path: resolve(projectRoot, '.env.local') })

export interface AppSettings {
  ocApiUrl: string
  ocMiddlewareClientId: string
  ocMiddlewareClientSecret: string
  ocHashKey: string
  /** Public base URL of the deployed apps/api. Empty => skip integration event + webhook registration. */
  apiUrl: string
  ocStorefrontClientId?: string
  ocStorefrontScope?: string
  ocStorefrontCustomScope?: string | null
  ocStorefrontAllowAnon: boolean
  ocAdminClientId?: string
  ocAdminScope?: string
  ocAdminCustomScope?: string | null
  storefrontDir: string
  adminDir: string
  /** Helix storefront (Tailwind + shadcn rebuild). Buyer app, shares the storefront client. */
  shopDir: string
  shopAppName: string
}

// Reads configuration from environment variables (populated from .env.local above).
export function loadConfig(): AppSettings {
  const str = (key: string): string => {
    const v = process.env[key]
    return typeof v === 'string' ? v.trim() : ''
  }

  const settings: AppSettings = {
    ocApiUrl: str('OC_API_URL') || 'https://api.ordercloud.io',
    ocMiddlewareClientId: str('OC_MIDDLEWARE_CLIENT_ID'),
    ocMiddlewareClientSecret: str('OC_MIDDLEWARE_CLIENT_SECRET'),
    ocHashKey: str('OC_HASH_KEY'),
    apiUrl: str('API_URL').replace(/\/$/, ''),
    ocStorefrontClientId: str('OC_STOREFRONT_CLIENT_ID') || undefined,
    ocStorefrontScope: str('OC_STOREFRONT_SCOPE') || undefined,
    ocStorefrontCustomScope: str('OC_STOREFRONT_CUSTOM_SCOPE') || null,
    ocStorefrontAllowAnon: str('OC_STOREFRONT_ALLOW_ANON').toLowerCase() === 'true',
    ocAdminClientId: str('OC_ADMIN_CLIENT_ID') || undefined,
    ocAdminScope: str('OC_ADMIN_SCOPE') || undefined,
    ocAdminCustomScope: str('OC_ADMIN_CUSTOM_SCOPE') || null,
    storefrontDir: str('STOREFRONT_DIR') || 'storefront',
    adminDir: str('ADMIN_DIR') || 'admin',
    shopDir: str('SHOP_DIR') || 'shop',
    shopAppName: str('SHOP_APP_NAME') || 'Helix',
  }

  if (!settings.ocMiddlewareClientId || !settings.ocMiddlewareClientSecret) {
    throw new Error(
      'Missing middleware API client credentials. Set OC_MIDDLEWARE_CLIENT_ID and OC_MIDDLEWARE_CLIENT_SECRET in infrastructure/.env.local (or your environment).'
    )
  }

  return settings
}
