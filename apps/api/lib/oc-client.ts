const baseUrl = (process.env.OC_API_URL ?? 'https://api.ordercloud.io').replace(/\/$/, '')

// Must match roles actually granted to the middleware client's security profile —
// requesting a role the profile doesn't have (e.g. a blanket "FullAccess") silently
// yields a token with zero roles rather than an error, so every ocClient call 403s.
const OC_CLIENT_SCOPE = 'AddressAdmin AddressReader OrderAdmin BuyerUserAdmin BuyerUserReader'

async function getAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.OC_MIDDLEWARE_CLIENT_ID!,
    client_secret: process.env.OC_MIDDLEWARE_CLIENT_SECRET!,
    scope: OC_CLIENT_SCOPE,
  })
  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!res.ok) throw new Error(`OC auth failed: ${res.status}`)
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

async function ocRequest<T>(path: string, options: RequestInit): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${baseUrl}/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`OC API error ${res.status}: ${error}`)
  }
  return res.json() as Promise<T>
}

export const ocClient = {
  get: <T>(path: string) => ocRequest<T>(path, { method: 'GET' }),
  patch: <T>(path: string, body: unknown) =>
    ocRequest<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  post: <T>(path: string, body: unknown) =>
    ocRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }),
}
