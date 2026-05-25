import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Ping the PostgreSQL database to ensure connectivity is live
    await db.query('SELECT 1');
    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('Healthcheck failed:', error);
    return new NextResponse('Service Unavailable', { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
