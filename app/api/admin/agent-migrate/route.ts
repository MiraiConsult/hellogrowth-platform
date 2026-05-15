/**
 * /api/admin/agent-migrate
 * Cria as tabelas ai_niche_knowledge e ai_agent_mode_config no Supabase
 * Usar apenas uma vez. Requer header x-migration-secret.
 */
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-migration-secret');
  if (secret !== 'hg-agent-migrate-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectRef = 'vwkzrcfewxekcowbhvzf';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const steps: { step: string; success: boolean; error?: string }[] = [];

  const execSQL = async (label: string, sql: string) => {
    try {
      const resp = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: sql }),
        }
      );
      const text = await resp.text();
      if (!resp.ok) {
        steps.push({ step: label, success: false, error: `${resp.status}: ${text.slice(0, 300)}` });
      } else {
        steps.push({ step: label, success: true });
      }
    } catch (e: any) {
      steps.push({ step: label, success: false, error: e.message });
    }
  };

  const migrations = [
    {
      label: 'Create ai_niche_knowledge table',
      sql: `CREATE TABLE IF NOT EXISTS public.ai_niche_knowledge (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        niche_slug TEXT NOT NULL,
        agent_mode TEXT NOT NULL DEFAULT 'full',
        section_type TEXT NOT NULL DEFAULT 'presentation',
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    },
    {
      label: 'Create index niche_slug on ai_niche_knowledge',
      sql: `CREATE INDEX IF NOT EXISTS idx_ai_niche_knowledge_slug ON public.ai_niche_knowledge(niche_slug, agent_mode)`,
    },
    {
      label: 'Create ai_agent_mode_config table',
      sql: `CREATE TABLE IF NOT EXISTS public.ai_agent_mode_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL UNIQUE,
        agent_mode TEXT NOT NULL DEFAULT 'full',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        custom_instructions TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    },
    {
      label: 'Create index tenant_id on ai_agent_mode_config',
      sql: `CREATE INDEX IF NOT EXISTS idx_ai_agent_mode_config_tenant ON public.ai_agent_mode_config(tenant_id)`,
    },
  ];

  for (const m of migrations) {
    await execSQL(m.label, m.sql);
  }

  const allSuccess = steps.every((s) => s.success);
  return NextResponse.json({ success: allSuccess, steps });
}
