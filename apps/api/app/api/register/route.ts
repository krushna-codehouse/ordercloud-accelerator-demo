import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/commands/register'
import { corsHeaders } from '@/lib/cors'
import type { RegisterPayload } from '@/lib/types'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as RegisterPayload
  const result = await registerUser(payload)
  return NextResponse.json(result, { status: result.success ? 201 : 400, headers: corsHeaders() })
}
