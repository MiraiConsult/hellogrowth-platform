import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  // 1. Verificar variáveis de ambiente
  results.env = {
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 12) || 'NOT SET',
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'NOT SET',
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    usingKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON',
  };

  // 2. Testar conexão com Supabase
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Tentar ler
    const { data: readData, error: readError } = await supabase
      .from('business_profile')
      .select('tenant_id, gbp_connected_at')
      .eq('tenant_id', '2cfdc04c-6759-419c-9270-5defcb305e58')
      .maybeSingle();

    results.read = { data: readData, error: readError };

    // Tentar escrever
    const { data: writeData, error: writeError } = await supabase
      .from('business_profile')
      .update({ gbp_connected_at: new Date().toISOString() })
      .eq('tenant_id', '2cfdc04c-6759-419c-9270-5defcb305e58')
      .select('tenant_id, gbp_connected_at');

    results.write = { data: writeData, error: writeError };
  } catch (err: any) {
    results.supabaseError = err.message;
  }

  // 3. Testar google-auth-library
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${request.nextUrl.protocol}//${request.nextUrl.host}/api/gbp/callback`
    );
    results.googleAuth = { loaded: true, redirectUri: `${request.nextUrl.protocol}//${request.nextUrl.host}/api/gbp/callback` };
  } catch (err: any) {
    results.googleAuth = { loaded: false, error: err.message };
  }

  return NextResponse.json(results, { status: 200 });
}
