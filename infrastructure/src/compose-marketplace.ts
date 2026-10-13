import {
  ApiClients,
  ApiRole,
  Buyers,
  IntegrationEvents,
  SecurityProfiles,
  Webhooks,
} from 'ordercloud-javascript-sdk'
import type { AppSettings } from './config.js'

export interface ApiClientIds {
  storefrontClientId: string
  adminClientId: string
}

// Splits a space-delimited role string into an array. When empty, storefront
// falls back to Shopper (so anonymous auth works) and admin to no roles.
function parseRoles(roles: string | undefined, isStorefront: boolean): ApiRole[] {
  if (!roles) return isStorefront ? ['Shopper'] : []
  return roles.split(' ').filter(Boolean) as ApiRole[]
}

function parseCustomRoles(customScope: string | null | undefined): string[] {
  return customScope ? customScope.split(' ').filter(Boolean) : []
}

/**
 * Creates API clients for the storefront and admin applications if their
 * client IDs aren't already configured. Returns both client IDs.
 */
export async function createApiClients(config: AppSettings): Promise<ApiClientIds> {
  let storefrontClientId = config.ocStorefrontClientId ?? ''
  let adminClientId = config.ocAdminClientId ?? ''

  if (!storefrontClientId) {
    const { storefrontDir } = config
    console.log(`Creating Buyer ${storefrontDir}`)
    const buyer = await Buyers.Save(storefrontDir, {
      ID: storefrontDir,
      Active: true,
      Name: storefrontDir,
    })

    console.log(`Creating Security Profile for ${storefrontDir}`)
    const securityProfile = await SecurityProfiles.Save(storefrontDir, {
      ID: storefrontDir,
      Name: `${storefrontDir} Security Profile`,
      Roles: parseRoles(config.ocStorefrontScope, true),
      CustomRoles: parseCustomRoles(config.ocStorefrontCustomScope),
    })
    await SecurityProfiles.SaveAssignment({
      BuyerID: buyer.ID,
      SecurityProfileID: securityProfile.ID,
    })

    // IsAnonBuyer: true — OrderCloud issues a fresh anonymous token per browser
    // session, so each session has its own isolated cart. No DefaultContextUser
    // needed; that approach shares one user across all sessions.
    console.log('Creating Buyer API Client (IsAnonBuyer for per-session anonymous carts)')
    const existing = await ApiClients.List({ filters: { AppName: storefrontDir } })
    if (existing.Items.length === 0) {
      const created = await ApiClients.Create({
        Active: true,
        AccessTokenDuration: 600,
        AppName: storefrontDir,
        AllowAnyBuyer: true,
        AllowAnySupplier: false,
        AllowSeller: false,
        IsAnonBuyer: true,
      })
      storefrontClientId = created.ID
    } else {
      storefrontClientId = existing.Items[0].ID
      // Patch existing client to per-session isolation in case it was created
      // with the old DefaultContextUser approach.
      await ApiClients.Patch(storefrontClientId, {
        IsAnonBuyer: true,
        DefaultContextUserName: null as unknown as string,
      })
    }
  }

  if (!adminClientId) {
    const { adminDir } = config
    console.log(`Creating Security Profile for ${adminDir}`)
    const securityProfile = await SecurityProfiles.Save(adminDir, {
      ID: adminDir,
      Name: `${adminDir} Security Profile`,
      Roles: parseRoles(config.ocAdminScope, false),
      CustomRoles: parseCustomRoles(config.ocAdminCustomScope),
    })
    // Seller-level assignment (no BuyerID).
    await SecurityProfiles.SaveAssignment({ SecurityProfileID: securityProfile.ID })

    console.log('Creating Seller API Client')
    const existing = await ApiClients.List({ filters: { AppName: adminDir } })
    if (existing.Items.length === 0) {
      const created = await ApiClients.Create({
        Active: true,
        AccessTokenDuration: 600,
        AppName: adminDir,
        AllowAnyBuyer: false,
        AllowAnySupplier: false,
        AllowSeller: true,
        IsAnonBuyer: false,
      })
      adminClientId = created.ID
    } else {
      adminClientId = existing.Items[0].ID
    }
  }

  return { storefrontClientId, adminClientId }
}

/**
 * Creates the OrderCheckout integration event and assigns it to the storefront
 * API client. Both steps are required — OrderCloud will throw "does not have an
 * order calculate event configured" if the event exists but is not assigned.
 */
export async function configureOrderCheckoutIntegrationEvent(
  config: AppSettings,
  storefrontClientId: string,
): Promise<void> {
  console.log('Creating OrderCheckout Integration Event')
  await IntegrationEvents.Save('OrderCheckout', {
    ID: 'OrderCheckout',
    EventType: 'OrderCheckout',
    // OrderCloud appends the operation suffix (e.g. /shippingrates) to this base.
    CustomImplementationUrl: `${config.apiUrl}/api`,
    Name: 'Order Checkout Integration Event',
    HashKey: config.ocHashKey,
  })

  console.log('Assigning OrderCheckout Integration Event to storefront API client')
  await ApiClients.Patch(storefrontClientId, {
    OrderCheckoutIntegrationEventID: 'OrderCheckout',
  })
}

/**
 * Registers the pre-webhook that validates buyer addresses before creation.
 * NOTE: the corresponding handler is not implemented in apps/api yet.
 */
export async function configureWebhooks(config: AppSettings, storefrontClientId: string): Promise<void> {
  console.log('Creating Webhook')
  await Webhooks.Save('validate-buyer-address', {
    Name: 'Validate Buyer Address',
    Description: "Pre-webhook to validate a buyer address before it's created",
    Url: `${config.apiUrl}/api/webhook/createaddress`,
    HashKey: config.ocHashKey,
    BeforeProcessRequest: true,
    ApiClientIDs: [storefrontClientId],
    WebhookRoutes: [{ Route: 'v1/buyers/{buyerID}/addresses', Verb: 'POST' }],
  })
}
