import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ progress: data || null });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, userId, ...updates } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });
    }

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('onboarding_progress')
      .select('id')
      .eq('tenant_id', tenantId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ progress: data });
    } else {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .insert({ tenant_id: tenantId, user_id: userId, ...updates })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ progress: data });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
