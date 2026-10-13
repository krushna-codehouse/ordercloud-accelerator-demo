import { NextRequest, NextResponse } from 'next/server'
import { getIFrameCredentials } from '@/lib/commands/payment'
import { unauthorizedResponse, verifyWebhookAuth } from '@/lib/webhook-auth'

export async function GET(request: NextRequest) {
  // GET requests carry no body; hash is computed against an empty string
  if (!verifyWebhookAuth('', request)) return unauthorizedResponse()
  const credential = await getIFrameCredentials()
  return NextResponse.json(credential)
}
