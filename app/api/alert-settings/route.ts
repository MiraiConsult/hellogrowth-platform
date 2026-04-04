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

    // Extrai companyId e remove campos que não devem ir no upsert (id, company_id, created_at)
    // para evitar conflitos com a constraint UNIQUE em company_id
    const { companyId, id: _id, company_id: _cid, created_at: _cat, ...fields } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'companyId obrigatório' }, { status: 400 });
    }

    // Garante que whatsapp_numbers seja sempre um array
    if (fields.whatsapp_numbers !== undefined && !Array.isArray(fields.whatsapp_numbers)) {
      fields.whatsapp_numbers = [];
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
      console.error('[alert-settings POST] Supabase error:', JSON.stringify(error));
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data });
  } catch (e: any) {
    console.error('[alert-settings POST] Exception:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
