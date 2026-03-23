import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId é obrigatório' }, { status: 400 });
    }

    const { error: dbError } = await supabaseAdmin
      .from('business_profiles')
      .update({
        gbp_access_token: null,
        gbp_refresh_token: null,
        gbp_token_expiry: null,
        gbp_account_name: null,
        gbp_location_id: null,
        gbp_location_title: null,
        gbp_maps_uri: null,
        gbp_connected_at: null,
      })
      .eq('tenant_id', tenantId);

    if (dbError) {
      console.error('Error disconnecting GBP:', dbError);
      return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Disconnect error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
