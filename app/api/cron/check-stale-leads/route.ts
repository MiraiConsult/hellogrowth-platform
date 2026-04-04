import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://miraisaleshg-evolution-api.cixapq.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Mirai Sales HG';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!EVOLUTION_API_KEY) return false;
  try {
    let normalizedPhone = phone.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('55')) normalizedPhone = `55${normalizedPhone}`;
    const url = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: normalizedPhone, text: message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron check-stale-leads] Iniciando verificação de leads parados...');

  try {
    // Busca todas as empresas com alerta de lead parado habilitado
    const { data: alertConfigs, error: alertError } = await supabaseAdmin
      .from('alert_settings')
      .select('company_id, whatsapp_number, stale_lead_days')
      .eq('alert_stale_lead', true)
      .not('whatsapp_number', 'is', null);

    if (alertError || !alertConfigs || alertConfigs.length === 0) {
      return NextResponse.json({ message: 'Nenhuma empresa com alerta de lead parado habilitado', sent: 0 });
    }

    let totalSent = 0;

    for (const config of alertConfigs) {
      const staleDays = config.stale_lead_days || 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - staleDays);

      // Busca nome da empresa
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('name')
        .eq('id', config.company_id)
        .single();

      const companyName = company?.name || 'Sua Empresa';

      // Busca leads parados (não vendidos, não perdidos, sem atualização recente)
      const { data: staleLeads } = await supabaseAdmin
        .from('leads')
        .select('id, name, value, status, updated_at')
        .eq('tenant_id', config.company_id)
        .not('status', 'in', '("Vendido","Perdido")')
        .lt('updated_at', cutoffDate.toISOString())
        .order('value', { ascending: false })
        .limit(5); // Máximo 5 alertas por empresa por dia

      if (!staleLeads || staleLeads.length === 0) continue;

      for (const lead of staleLeads) {
        const updatedAt = new Date(lead.updated_at);
        const diffMs = Date.now() - updatedAt.getTime();
        const staleDaysActual = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const message = `⚠️ *Lead Parado — ${companyName}*\n\n👤 ${lead.name || 'Sem nome'}\n💰 ${formatCurrency(lead.value || 0)}\n📋 Etapa: ${lead.status || '—'}\n🕐 Parado há *${staleDaysActual} dia(s)*\n\n💡 Retome o contato!\n\n_HelloGrowth_`;

        const sent = await sendWhatsApp(config.whatsapp_number, message);
        if (sent) {
          totalSent++;
          console.log(`[Cron] ✅ Alerta de lead parado enviado: ${lead.name} (${companyName})`);
        }
      }
    }

    return NextResponse.json({ message: 'Cron executado', totalSent });
  } catch (e: any) {
    console.error('[Cron check-stale-leads] Erro:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
