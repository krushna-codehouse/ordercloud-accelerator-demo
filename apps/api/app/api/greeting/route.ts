import { NextRequest, NextResponse } from 'next/server'
import { getGreeting } from '@/lib/commands/greeting'

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  return NextResponse.json(getGreeting(name))
}
