import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AppSettings } from './config.js'

const appsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps')

type AppType = 'storefront' | 'admin'

// For storefront, fall back to "Shopper" when no scope is set but anonymous
// shopping is enabled, so anon auth can succeed. Admin gets no scope here.
function determineRoles(config: AppSettings, appType: AppType): string {
  if (appType === 'storefront') {
    if (!config.ocStorefrontScope) return config.ocStorefrontAllowAnon ? 'Shopper' : ''
    return config.ocStorefrontScope
  }
  return ''
}

/** Writes apps/<directory>/.env.local with the VITE_APP_* values the frontends read. */
export function writeEnvFile(
  config: AppSettings,
  appType: AppType,
  directory: string,
  clientId: string,
  appName?: string
): void {
  const isStorefront = appType === 'storefront'
  const entries: Record<string, string> = {
    VITE_APP_NAME: appName ?? directory,
    VITE_APP_CONFIG_BASE: '/',
    VITE_APP_ORDERCLOUD_BASE_API_URL: config.ocApiUrl,
    VITE_APP_ORDERCLOUD_CLIENT_ID: clientId,
    VITE_APP_ORDERCLOUD_SCOPE: determineRoles(config, appType),
    VITE_APP_ORDERCLOUD_CUSTOM_SCOPE: isStorefront ? config.ocStorefrontCustomScope ?? '' : '',
    VITE_APP_ORDERCLOUD_ALLOW_ANONYMOUS:
      isStorefront && config.ocStorefrontAllowAnon != null
        ? String(config.ocStorefrontAllowAnon).toLowerCase()
        : '',
  }

  const content = Object.entries(entries)
    .map(([name, value]) => `${name}="${value}"`)
    .join('\n')

  const target = resolve(appsDir, directory, '.env.local')
  writeFileSync(target, content)
  console.log(`Wrote ${target}`)
}
