import { NextRequest, NextResponse } from 'next/server'
import { calculateOrder } from '@/lib/commands/tax'
import { unauthorizedResponse, verifyWebhookAuth } from '@/lib/webhook-auth'
import type { OrderCheckoutIEPayload } from '@/lib/types'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!verifyWebhookAuth(rawBody, request)) return unauthorizedResponse()
  const payload = JSON.parse(rawBody) as OrderCheckoutIEPayload
  const response = await calculateOrder(payload)
  return NextResponse.json(response)
}
