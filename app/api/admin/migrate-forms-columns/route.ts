import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verificar colunas existentes
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'forms' AND column_name IN ('signature_auto_email', 'signature_auto_whatsapp', 'term_color', 'signature_enabled', 'consent_text') ORDER BY column_name`
      });

    // Tentar via query direta
    const checkResult = await supabase
      .from('forms')
      .select('signature_auto_email, signature_auto_whatsapp, term_color, signature_enabled, consent_text')
      .limit(1);

    if (checkResult.error) {
      // Colunas não existem - precisamos adicionar
      const migrations = [
        `ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS signature_enabled BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS consent_text TEXT`,
        `ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS signature_auto_email BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS signature_auto_whatsapp BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS term_color TEXT DEFAULT '#10b981'`,
      ];

      const results = [];
      for (const sql of migrations) {
        const { error } = await supabase.rpc('exec_sql', { sql });
        results.push({ sql: sql.substring(0, 60), error: error?.message || 'ok' });
      }

      return NextResponse.json({ 
        status: 'migrated', 
        checkError: checkResult.error.message,
        results 
      });
    }

    // Colunas existem - verificar quais têm valores
    const { data: sample } = await supabase
      .from('forms')
      .select('id, name, signature_enabled, signature_auto_email, signature_auto_whatsapp, term_color, consent_text')
      .limit(3);

    return NextResponse.json({ 
      status: 'columns_exist', 
      sample,
      message: 'All columns exist in forms table'
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
