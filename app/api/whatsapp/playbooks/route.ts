import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Playbooks padrão para cada fluxo
const DEFAULT_PLAYBOOKS: Record<string, { operation_mode: string; objective: string }> = {
  pre_sale: { operation_mode: 'auto', objective: 'consultive' },
  promoter: { operation_mode: 'auto', objective: 'request_referral_reward' },
  passive: { operation_mode: 'auto', objective: 'understand_and_reconquer' },
  detractor: { operation_mode: 'hybrid', objective: 'understand_problem' },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  const { data: playbooks } = await supabase
    .from('ai_flow_playbooks')
    .select('*')
    .eq('tenant_id', tenantId);

  // Retornar playbooks com defaults para os que não existem
  const result: Record<string, any> = {};
  for (const flowType of ['pre_sale', 'promoter', 'passive', 'detractor']) {
    const existing = playbooks?.find(p => p.flow_type === flowType);
    result[flowType] = existing || {
      flow_type: flowType,
      ...DEFAULT_PLAYBOOKS[flowType],
      escalate_on_unknown: true,
      escalate_after_turns: 10,
      escalate_on_human_request: true,
      custom_objective_prompt: '',
    };
  }

  return NextResponse.json({ playbooks: result });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tenantId, playbooks } = body;
  if (!tenantId || !playbooks) return NextResponse.json({ error: 'tenantId and playbooks required' }, { status: 400 });

  const upserts = Object.entries(playbooks).map(([flow_type, config]: [string, any]) => ({
    tenant_id: tenantId,
    flow_type,
    operation_mode: config.operation_mode,
    objective: config.objective,
    escalate_on_unknown: config.escalate_on_unknown ?? true,
    escalate_after_turns: config.escalate_after_turns ?? 10,
    escalate_on_human_request: config.escalate_on_human_request ?? true,
    custom_objective_prompt: config.custom_objective_prompt || null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('ai_flow_playbooks')
    .upsert(upserts, { onConflict: 'tenant_id,flow_type' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
