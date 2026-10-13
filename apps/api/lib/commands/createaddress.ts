import type { Address } from '@/lib/types'

const REQUIRED_FIELDS: (keyof Address)[] = ['Street1', 'City', 'State', 'Zip', 'Country']

export interface CreateAddressWebhookResponse {
  proceed: boolean
  body?: string
}

export function validateAddress(address: Address): CreateAddressWebhookResponse {
  const missing = REQUIRED_FIELDS.filter((f) => !address[f])
  if (missing.length > 0) {
    return { proceed: false, body: `Missing required address fields: ${missing.join(', ')}` }
  }
  return { proceed: true }
}
