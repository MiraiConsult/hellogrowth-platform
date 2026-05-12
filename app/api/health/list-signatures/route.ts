import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId é obrigatório' }, { status: 400 });
    }

    // Usar service_role key para bypassar RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Buscar assinaturas
    const { data: signatures, error: sigError } = await supabaseAdmin
      .from('health_signatures')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('signed_at', { ascending: false });

    if (sigError) {
      console.error('[list-signatures] Erro ao buscar assinaturas:', sigError);
      return NextResponse.json({ error: sigError.message }, { status: 500 });
    }

    const sigs = signatures || [];

    // Enriquecer com dados de leads e forms
    const leadIds = [...new Set(sigs.map((s: any) => s.lead_id).filter(Boolean))];
    const formIds = [...new Set(sigs.map((s: any) => s.form_id).filter(Boolean))];

    const [leadsRes, formsRes] = await Promise.all([
      leadIds.length > 0
        ? supabaseAdmin.from('leads').select('id, name, answers, form_source').in('id', leadIds)
        : Promise.resolve({ data: [] as any[] }),
      formIds.length > 0
        ? supabaseAdmin.from('forms').select('id, name').in('id', formIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const leadsMap: Record<string, any> = {};
    (leadsRes.data || []).forEach((l: any) => { leadsMap[l.id] = l; });

    const formsMap: Record<string, any> = {};
    (formsRes.data || []).forEach((f: any) => { formsMap[f.id] = f; });

    const enriched = sigs.map((s: any) => ({
      ...s,
      lead: s.lead_id ? leadsMap[s.lead_id] || null : null,
      form: s.form_id ? formsMap[s.form_id] || null : null,
    }));

    return NextResponse.json({ signatures: enriched });
  } catch (error: any) {
    console.error('[list-signatures] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
