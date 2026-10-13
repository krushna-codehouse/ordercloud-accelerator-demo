import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export function verifyWebhookAuth(rawBody: string, request: NextRequest): boolean {
  const hashKey = process.env.OC_HASH_KEY
  if (!hashKey) return false
  const receivedHash = request.headers.get('x-oc-hash')
  if (!receivedHash) return false
  const computed = createHmac('sha256', hashKey).update(rawBody).digest('base64')
  return computed === receivedHash
}

export const unauthorizedResponse = () =>
  NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
