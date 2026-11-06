import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ minVersion: '1.2.0', minVersionCode: 4 })
}
