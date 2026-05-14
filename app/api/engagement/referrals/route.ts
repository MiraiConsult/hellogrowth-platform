import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/engagement/referrals - Listar indicações do tenant
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');
    const referrerLeadId = searchParams.get('referrer_lead_id');
    const checkDuplicate = searchParams.get('check_duplicate');
    const referrerPhone = searchParams.get('referrer_phone');

    // Verificar duplicata antes de criar
    if (checkDuplicate === 'true' && referrerPhone) {
      const { data, error } = await supabase
        .from('referrals')
        .select('id, source, created_at')
        .eq('tenant_id', tenantId)
        .eq('referrer_phone', referrerPhone)
        .limit(1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ already_requested: (data?.length || 0) > 0, record: data?.[0] || null });
    }

    let query = supabase
      .from('referrals')
      .select(`
        *,
        engagement_campaigns(name, reward_description)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (referrerLeadId) {
      query = query.eq('referrer_lead_id', referrerLeadId);
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

// POST /api/engagement/referrals - Criar nova indicação
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();
    const {
      campaign_id,
      referrer_lead_id,
      referrer_name,
      referrer_phone,
      referred_name,
      referred_phone,
      source,
    } = body;

    // Gerar código único de indicação
    const referralCode = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hellogrowth-platform1.vercel.app';
    const referralLink = `${baseUrl}/r/${referralCode}`;

    const { data, error } = await supabase
      .from('referrals')
      .insert({
        tenant_id: tenantId,
        campaign_id: campaign_id || null,
        referrer_lead_id: referrer_lead_id || null,
        referrer_name: referrer_name || '',
        referrer_phone: referrer_phone || '',
        referred_name: referred_name || null,
        referred_phone: referred_phone || null,
        referral_code: referralCode,
        referral_link: referralLink,
        status: 'pending',
        reward_status: 'pending',
        source: source || 'manual',
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

// PATCH /api/engagement/referrals - Atualizar status de indicação
export async function PATCH(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { id, referral_code, status, reward_status, reward_notes, referred_name, referred_phone, referred_lead_id } = body;

    if (!id && !referral_code) {
      return NextResponse.json({ error: 'Referral ID or code required' }, { status: 400 });
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
    if (referred_name !== undefined) updateData.referred_name = referred_name;
    if (referred_phone !== undefined) updateData.referred_phone = referred_phone;
    if (referred_lead_id !== undefined) updateData.referred_lead_id = referred_lead_id;

    let query = supabase
      .from('referrals')
      .update(updateData)
      .eq('tenant_id', tenantId);

    if (id) {
      query = query.eq('id', id);
    } else if (referral_code) {
      query = query.eq('referral_code', referral_code);
    }

    const { data, error } = await query.select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
