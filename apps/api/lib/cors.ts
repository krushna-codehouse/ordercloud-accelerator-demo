// The frontend calling apps/api directly (rather than OrderCloud invoking it as a
// webhook/integration event) is new — this is the CORS handling that makes it possible.
const ALLOWED_ORIGIN = process.env.STOREFRONT_ORIGIN ?? '*'

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}
