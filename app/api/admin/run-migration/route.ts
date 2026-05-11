import { NextRequest, NextResponse } from 'next/server';

// Rota temporária de migração — executar apenas uma vez
// Usa a Supabase Management API para executar DDL diretamente
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-migration-secret');
  if (secret !== 'hg-migration-2026-health') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectRef = 'vwkzrcfewxekcowbhvzf';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const steps: { step: string; success: boolean; error?: string }[] = [];

  // Execute SQL via Supabase Management API (pg endpoint)
  const execSQL = async (label: string, sql: string) => {
    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });
      
      if (!resp.ok) {
        const errText = await resp.text();
        // If exec_sql doesn't exist, try direct approach
        if (errText.includes('exec_sql') || errText.includes('PGRST202')) {
          steps.push({ step: label, success: false, error: `exec_sql RPC not available: ${errText.slice(0, 100)}` });
        } else {
          steps.push({ step: label, success: false, error: errText.slice(0, 200) });
        }
      } else {
        steps.push({ step: label, success: true });
      }
    } catch (e: any) {
      steps.push({ step: label, success: false, error: e.message });
    }
  };

  // Try using the Supabase Management API directly (requires management token, not service key)
  // Alternative: use pg-meta endpoint which is available in Supabase
  const execSQLViaPgMeta = async (label: string, sql: string) => {
    try {
      // Supabase pg-meta endpoint for running queries
      const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });
      
      const text = await resp.text();
      if (!resp.ok) {
        steps.push({ step: label, success: false, error: `${resp.status}: ${text.slice(0, 200)}` });
      } else {
        steps.push({ step: label, success: true });
      }
    } catch (e: any) {
      steps.push({ step: label, success: false, error: e.message });
    }
  };

  // Execute all migration steps
  const migrations = [
    {
      label: 'Add signature_enabled to forms',
      sql: `ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS signature_enabled BOOLEAN DEFAULT FALSE`
    },
    {
      label: 'Add signature_auto_email to forms',
      sql: `ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS signature_auto_email BOOLEAN DEFAULT FALSE`
    },
    {
      label: 'Add consent_text to forms',
      sql: `ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS consent_text TEXT`
    },
    {
      label: 'Create health_signatures table',
      sql: `CREATE TABLE IF NOT EXISTS public.health_signatures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        form_id UUID NOT NULL,
        lead_id UUID,
        patient_name TEXT NOT NULL,
        patient_email TEXT,
        patient_phone TEXT,
        patient_cpf TEXT,
        signature_image TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        consent_text TEXT,
        signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        email_sent BOOLEAN DEFAULT FALSE,
        email_sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    },
    {
      label: 'Create tenant_id index',
      sql: `CREATE INDEX IF NOT EXISTS idx_health_signatures_tenant_id ON public.health_signatures(tenant_id)`
    },
    {
      label: 'Create form_id index',
      sql: `CREATE INDEX IF NOT EXISTS idx_health_signatures_form_id ON public.health_signatures(form_id)`
    },
    {
      label: 'Enable RLS on health_signatures',
      sql: `ALTER TABLE public.health_signatures ENABLE ROW LEVEL SECURITY`
    },
    {
      label: 'Create tenant isolation policy',
      sql: `DO $$ BEGIN
        DROP POLICY IF EXISTS "tenant_isolation_health_signatures" ON public.health_signatures;
        CREATE POLICY "tenant_isolation_health_signatures" ON public.health_signatures
          USING (tenant_id = auth.uid() OR tenant_id IN (
            SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
          ));
      END $$`
    },
    {
      label: 'Create public insert policy',
      sql: `DO $$ BEGIN
        DROP POLICY IF EXISTS "public_insert_health_signatures" ON public.health_signatures;
        CREATE POLICY "public_insert_health_signatures" ON public.health_signatures
          FOR INSERT WITH CHECK (true);
      END $$`
    },
  ];

  for (const m of migrations) {
    await execSQLViaPgMeta(m.label, m.sql);
  }

  const allSuccess = steps.every(s => s.success);
  return NextResponse.json({ 
    success: allSuccess, 
    steps,
    note: 'Delete this route after successful migration'
  });
}
