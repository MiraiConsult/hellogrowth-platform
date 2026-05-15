/**
 * /api/admin/agent-config
 *
 * GET  — Busca a configuração do agente de um tenant
 * POST — Salva/atualiza a configuração do agente de um tenant
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id é obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('ai_agent_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // Tabela não existe — retornar padrão
    if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
      return NextResponse.json({ config: { agent_mode: 'full', is_active: true } });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    config: data || { agent_mode: 'full', is_active: true },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tenant_id, agent_mode, is_active } = body;

  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id é obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('ai_agent_config')
    .upsert(
      {
        tenant_id,
        agent_mode: agent_mode || 'full',
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data });
}
