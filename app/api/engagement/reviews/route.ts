import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/engagement/reviews - Listar solicitações de review do tenant
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');
    const leadId = searchParams.get('lead_id');
    const checkDuplicate = searchParams.get('check_duplicate');
    const leadPhone = searchParams.get('lead_phone');

    // Verificar duplicata antes de criar
    if (checkDuplicate === 'true' && leadPhone) {
      const { data, error } = await supabase
        .from('review_requests')
        .select('id, source, created_at')
        .eq('tenant_id', tenantId)
        .eq('lead_phone', leadPhone)
        .limit(1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ already_requested: (data?.length || 0) > 0, record: data?.[0] || null });
    }

    let query = supabase
      .from('review_requests')
      .select(`
        *,
        engagement_campaigns(name, reward_description, google_review_url)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/engagement/reviews - Criar nova solicitação de review
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      campaign_id,
      lead_id,
      lead_name,
      lead_phone,
      source,
    } = body;

    const { data, error } = await supabase
      .from('review_requests')
      .insert({
        tenant_id: tenantId,
        campaign_id: campaign_id || null,
        lead_id: lead_id || null,
        lead_name: lead_name || '',
        lead_phone: lead_phone || '',
        status: 'sent',
        reward_status: 'pending',
        source: source || 'manual',
        last_requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/engagement/reviews - Atualizar status de solicitação de review
export async function PATCH(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { id, status, reward_status, reward_notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Review request ID required' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updateData.status = status;
    if (reward_status !== undefined) {
      updateData.reward_status = reward_status;
      if (reward_status === 'delivered') {
        updateData.reward_delivered_at = new Date().toISOString();
      }
    }
    if (reward_notes !== undefined) updateData.reward_notes = reward_notes;

    const { data, error } = await supabase
      .from('review_requests')
      .update(updateData)
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
