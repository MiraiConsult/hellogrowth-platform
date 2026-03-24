import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { tenantId, locationId } = await request.json();

    if (!tenantId || !locationId) {
      return NextResponse.json({ error: 'tenantId e locationId são obrigatórios' }, { status: 400 });
    }

    // Limpar o locationId: remover prefixo "locations/" se presente
    const cleanLocationId = locationId.replace(/^locations\//, '').trim();

    if (!cleanLocationId) {
      return NextResponse.json({ error: 'Location ID inválido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('business_profile')
      .update({ gbp_location_id: cleanLocationId })
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error saving location ID:', error);
      return NextResponse.json({ error: 'Erro ao salvar Location ID' }, { status: 500 });
    }

    return NextResponse.json({ success: true, locationId: cleanLocationId });
  } catch (err: any) {
    console.error('set-location route error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
