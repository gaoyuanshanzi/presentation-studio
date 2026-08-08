import { NextResponse } from 'next/server';
import { initDbTables, getDbClient } from '@/lib/db';

export async function GET() {
  const isConnected = !!getDbClient();
  if (!isConnected) {
    return NextResponse.json({
      connected: false,
      message: 'DATABASE_URL env variable not detected. Local storage fallback active.'
    });
  }

  const result = await initDbTables();
  return NextResponse.json({ connected: result.success, message: result.message });
}
