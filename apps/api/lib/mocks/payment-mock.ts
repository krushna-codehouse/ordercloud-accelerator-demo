// Returns null so the caller falls back to the Stripe test key.
// Replace with a real ICreditCardProcessor integration (e.g. Stripe) for production.
export async function getIFrameCredential(): Promise<string | null> {
  return null
}

// Throws to signal the processor is not configured.
// Replace with a real credit card authorization call for production.
export async function authorizeCC(): Promise<never> {
  throw new Error('Payment processor not implemented')
}
