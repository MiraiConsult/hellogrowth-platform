import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, locationId, locationTitle, newReviewUri, mapsUri } = body;

    if (!tenantId || !locationId) {
      return NextResponse.json({ error: 'tenantId e locationId são obrigatórios' }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      gbp_location_id: locationId,
      gbp_location_title: locationTitle || null,
      gbp_maps_uri: mapsUri || null,
    };

    // Tentar extrair place_id da URL de review
    if (newReviewUri) {
      const placeIdMatch = newReviewUri.match(/placeid=([^&]+)/);
      if (placeIdMatch) {
        updateData.google_place_id = placeIdMatch[1];
      }
    }

    const { error: dbError } = await supabaseAdmin
      .from('business_profiles')
      .update(updateData)
      .eq('tenant_id', tenantId);

    if (dbError) {
      console.error('Error saving location:', dbError);
      return NextResponse.json({ error: 'Erro ao salvar localização' }, { status: 500 });
    }

    return NextResponse.json({ success: true, placeIdUpdated: !!updateData.google_place_id });
  } catch (err: any) {
    console.error('Select location error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
