import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'NOT SET';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'NOT SET';
  
  return NextResponse.json({
    supabase_url: url,
    anon_key_prefix: anonKey.substring(0, 30) + '...',
    service_key_set: serviceKey !== 'NOT SET',
    service_key_prefix: serviceKey !== 'NOT SET' ? serviceKey.substring(0, 30) + '...' : 'NOT SET',
  });
}
