import { NextRequest, NextResponse } from 'next/server'
import { authorizeCardPayment } from '@/lib/commands/payment'
import { unauthorizedResponse, verifyWebhookAuth } from '@/lib/webhook-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderID: string; paymentID: string }> }
) {
  const rawBody = await request.text()
  if (!verifyWebhookAuth(rawBody, request)) return unauthorizedResponse()
  const { orderID, paymentID } = await params
  const payment = await authorizeCardPayment(orderID, paymentID)
  return NextResponse.json(payment)
}
