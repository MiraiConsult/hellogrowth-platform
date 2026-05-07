import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Returns aggregated pipeline + NPS metrics for a client (by tenant/company).
// Falls back to user_id if tenant_id is missing.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const tenantIdParam = req.nextUrl.searchParams.get('tenantId');
  if (!userId && !tenantIdParam) {
    return NextResponse.json({ error: 'userId or tenantId required' }, { status: 400 });
  }

  let tenantId = tenantIdParam;
  if (!tenantId && userId) {
    const { data: u } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single();
    tenantId = u?.tenant_id || null;
  }

  let leadsQuery = supabaseAdmin
    .from('leads')
    .select('value', { count: 'exact' })
    .is('deleted_at', null);
  if (tenantId) leadsQuery = leadsQuery.eq('tenant_id', tenantId);
  else if (userId) leadsQuery = leadsQuery.eq('user_id', userId);
  const { data: leadsData, count: leadsCount, error: leadsErr } = await leadsQuery;
  if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 });
  const pipelineValue = (leadsData || []).reduce((sum, l: any) => sum + (Number(l.value) || 0), 0);

  let npsQuery = supabaseAdmin
    .from('nps_responses')
    .select('score', { count: 'exact' })
    .is('deleted_at', null);
  if (tenantId) npsQuery = npsQuery.eq('tenant_id', tenantId);
  else if (userId) npsQuery = npsQuery.eq('user_id', userId);
  const { data: npsData, count: npsCount, error: npsErr } = await npsQuery;
  if (npsErr) return NextResponse.json({ error: npsErr.message }, { status: 500 });

  let npsScore: number | null = null;
  if (npsData && npsData.length > 0) {
    const promoters = npsData.filter((r: any) => r.score >= 9).length;
    const detractors = npsData.filter((r: any) => r.score <= 6).length;
    npsScore = Math.round(((promoters - detractors) / npsData.length) * 100);
  }

  return NextResponse.json({
    pipeline: { value: pipelineValue, count: leadsCount || 0 },
    nps: { score: npsScore, count: npsCount || 0 },
  });
}
