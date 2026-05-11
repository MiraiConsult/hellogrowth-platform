import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/admin/client-usage?tenant_id=xxx
// Returns usage metrics for a specific tenant to calculate health score
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // 1. NPS responses received in last 30 days
    const { data: npsResponses, count: npsCount } = await supabase
      .from('nps_responses')
      .select('id, created_at, score', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('created_at', thirtyDaysAgoStr)
      .order('created_at', { ascending: false })
      .limit(100);

    // 2. Form responses (leads) received in last 30 days
    const { count: formResponseCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('created_at', thirtyDaysAgoStr);

    // 3. Active campaigns — using 'campaigns' table
    const { count: campaignCount } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .eq('status', 'active');

    // 4. Active forms in last 30 days
    const { data: forms, count: formCount } = await supabase
      .from('forms')
      .select('id, name, created_at, active', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .eq('active', true);

    // 5. Total NPS responses all time
    const { count: totalNpsCount } = await supabase
      .from('nps_responses')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    // 6. Total form responses (leads) all time
    const { count: totalFormResponseCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    // 7. Last login from users table
    const { data: tenantUsers } = await supabase
      .from('users')
      .select('last_login, name, email, sdr_name, cs_name, internal_notes')
      .eq('tenant_id', tenantId)
      .order('last_login', { ascending: false })
      .limit(1);

    const lastLogin = tenantUsers?.[0]?.last_login || null;
    const sdrName = tenantUsers?.[0]?.sdr_name || null;
    const csName = tenantUsers?.[0]?.cs_name || null;
    const internalNotes = tenantUsers?.[0]?.internal_notes || null;

    // 8. NPS responses in last 7 days
    const { count: npsLast7Days } = await supabase
      .from('nps_responses')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('created_at', sevenDaysAgoStr);

    // 9. Form responses (leads) in last 7 days
    const { count: formResponsesLast7Days } = await supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('created_at', sevenDaysAgoStr);

    // Calculate health score (0-100)
    let healthScore = 0;
    const indicators = {
      hasRecentLogin: false,
      hasNpsResponses: false,
      hasFormResponses: false,
      hasActiveCampaigns: false,
      hasActiveForms: false,
    };

    // Last login in last 7 days = 25 pts
    if (lastLogin && new Date(lastLogin) >= sevenDaysAgo) {
      healthScore += 25;
      indicators.hasRecentLogin = true;
    }
    // NPS responses in last 30 days = 25 pts
    if ((npsCount || 0) > 0) {
      healthScore += 25;
      indicators.hasNpsResponses = true;
    }
    // Form responses in last 30 days = 25 pts
    if ((formResponseCount || 0) > 0) {
      healthScore += 25;
      indicators.hasFormResponses = true;
    }
    // Active campaigns or forms = 25 pts
    if ((campaignCount || 0) > 0 || (formCount || 0) > 0) {
      healthScore += 25;
      indicators.hasActiveCampaigns = (campaignCount || 0) > 0;
      indicators.hasActiveForms = (formCount || 0) > 0;
    }

    // Monthly activity breakdown (last 6 months)
    const monthlyActivity: { month: string; nps: number; forms: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      const [{ count: mNps }, { count: mForms }] = await Promise.all([
        supabase.from('nps_responses').select('id', { count: 'exact' }).eq('tenant_id', tenantId).is('deleted_at', null).gte('created_at', start).lte('created_at', end),
        supabase.from('leads').select('id', { count: 'exact' }).eq('tenant_id', tenantId).is('deleted_at', null).gte('created_at', start).lte('created_at', end),
      ]);

      monthlyActivity.push({ month: monthLabel, nps: mNps || 0, forms: mForms || 0 });
    }

    return NextResponse.json({
      healthScore,
      indicators,
      metrics: {
        npsLast30Days: npsCount || 0,
        formResponsesLast30Days: formResponseCount || 0,
        npsLast7Days: npsLast7Days || 0,
        formResponsesLast7Days: formResponsesLast7Days || 0,
        activeCampaigns: campaignCount || 0,
        activeForms: formCount || 0,
        totalNpsAllTime: totalNpsCount || 0,
        totalFormResponsesAllTime: totalFormResponseCount || 0,
        lastLogin,
      },
      monthlyActivity,
      sdrName,
      csName,
      internalNotes,
    });
  } catch (error: any) {
    console.error('client-usage error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/client-usage — update sdr_name, cs_name, internal_notes
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, sdr_name, cs_name, internal_notes } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('users')
      .update({ sdr_name, cs_name, internal_notes })
      .eq('id', user_id);

    if (error) throw error;

    // Sincronizar CS/SDR com o kanban_cards correspondente
    const syncPayload: Record<string, any> = {};
    if (sdr_name !== undefined) syncPayload.sdr_name = sdr_name;
    if (cs_name !== undefined) syncPayload.cs_name = cs_name;

    if (Object.keys(syncPayload).length > 0) {
      // Buscar o e-mail do user para encontrar o card
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', user_id)
        .single();

      if (userData?.email) {
        // Atualizar cards que tenham user_id ou client_email correspondente
        await supabase
          .from('kanban_cards')
          .update({ ...syncPayload, updated_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .is('deleted_at', null);

        await supabase
          .from('kanban_cards')
          .update({ ...syncPayload, updated_at: new Date().toISOString() })
          .eq('client_email', userData.email)
          .is('deleted_at', null);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
