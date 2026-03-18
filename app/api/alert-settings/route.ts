import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — busca configurações de alerta de uma empresa
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json({ error: 'companyId obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('alert_settings')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data || null });
}

// POST — cria ou atualiza configurações de alerta (upsert)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, ...fields } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId obrigatório' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('alert_settings')
      .upsert(
        {
          company_id: companyId,
          ...fields,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
