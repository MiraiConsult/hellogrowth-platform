import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// PUT /api/games/[id] - Atualizar game existente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      status,
      google_review_url,
      prizes,
      messages,
      participation_policy,
      prize_validity_days
    } = body;

    const { data, error } = await supabase
      .from('nps_games')
      .update({
        name,
        status,
        google_review_url,
        prizes,
        messages,
        participation_policy: participation_policy || 'unlimited',
        prize_validity_days: prize_validity_days ?? 7,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/games/[id] - Excluir game
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('nps_games')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
