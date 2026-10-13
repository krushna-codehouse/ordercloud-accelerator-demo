import { NextRequest, NextResponse } from 'next/server'
import { validateAddress } from '@/lib/commands/createaddress'
import { unauthorizedResponse, verifyWebhookAuth } from '@/lib/webhook-auth'
import type { CreateAddressWebhookPayload } from '@/lib/types'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!verifyWebhookAuth(rawBody, request)) return unauthorizedResponse()
  const payload = JSON.parse(rawBody) as CreateAddressWebhookPayload
  const response = validateAddress(payload.Request.Body)
  return NextResponse.json(response)
}
