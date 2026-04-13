import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { from_email, from_name } = await req.json();

    if (!from_email || !from_name) {
      return NextResponse.json({ error: 'from_email e from_name são obrigatórios' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const value = JSON.stringify({ from_email, from_name });

    // Upsert na tabela global_settings
    const { error } = await supabase
      .from('global_settings')
      .upsert({ key: 'analysis_email_config', value }, { onConflict: 'key' });

    if (error) {
      // Se a tabela não existe, tenta criar
      if (error.code === '42P01') {
        const { error: createErr } = await supabase.rpc('exec_sql', {
          sql: `CREATE TABLE IF NOT EXISTS global_settings (
            key TEXT PRIMARY KEY,
            value JSONB,
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );`
        });
        if (!createErr) {
          await supabase
            .from('global_settings')
            .upsert({ key: 'analysis_email_config', value }, { onConflict: 'key' });
        }
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ saved: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
