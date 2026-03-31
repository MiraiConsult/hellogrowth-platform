import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};
  const tenantId = request.nextUrl.searchParams.get('tenantId') || '45406cf8-8cf8-4d78-8546-2b952648be47';

  // 1. Verificar variáveis de ambiente
  results.env = {
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    googleClientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 12) || 'NOT SET',
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) || 'NOT SET',
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    usingKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON',
  };

  // 2. Testar conexão com Supabase (READ ONLY — não altera dados)
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Apenas ler — NÃO fazer upsert para não sobrescrever tokens
    const { data: readData, error: readError } = await supabase
      .from('business_profile')
      .select('tenant_id, gbp_connected_at, gbp_access_token, gbp_refresh_token, gbp_location_id, gbp_account_name')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    results.read = {
      data: readData ? {
        tenant_id: readData.tenant_id,
        gbp_connected_at: readData.gbp_connected_at,
        has_access_token: !!readData.gbp_access_token,
        has_refresh_token: !!readData.gbp_refresh_token,
        gbp_location_id: readData.gbp_location_id,
        gbp_account_name: readData.gbp_account_name,
      } : null,
      error: readError,
    };
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
