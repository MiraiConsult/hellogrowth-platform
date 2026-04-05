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

// Retorna todos os números configurados (array + legado)
function getNumbers(config: { whatsapp_number?: string; whatsapp_numbers?: string[] }): string[] {
  const numbers: string[] = [
    ...(Array.isArray(config.whatsapp_numbers) ? config.whatsapp_numbers : []),
  ];
  if (config.whatsapp_number && !numbers.includes(config.whatsapp_number)) {
    numbers.unshift(config.whatsapp_number);
  }
  return numbers.filter(Boolean);
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
      .select('company_id, whatsapp_number, whatsapp_numbers, stale_lead_days')
      .eq('alert_stale_lead', true);

    if (alertError || !alertConfigs || alertConfigs.length === 0) {
      return NextResponse.json({ message: 'Nenhuma empresa com alerta de lead parado habilitado', sent: 0 });
    }

    let totalSent = 0;

    for (const config of alertConfigs) {
      const numbers = getNumbers(config);
      if (numbers.length === 0) continue;

      const staleDays = config.stale_lead_days || 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - staleDays);

      // Busca nome da empresa via users (tabela correta)
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('company_name, settings')
        .eq('id', config.company_id)
        .maybeSingle();
      const companyName = userProfile?.company_name || userProfile?.settings?.companyName || 'Sua Empresa';

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

        // Envia para TODOS os números cadastrados
        const results = await Promise.all(numbers.map(num => sendWhatsApp(num, message)));
        const sent = results.some(Boolean);
        if (sent) {
          totalSent++;
          console.log(`[Cron] ✅ Alerta de lead parado enviado: ${lead.name} (${companyName}) → ${numbers.join(', ')}`);
        }
      }
    }

    return NextResponse.json({ message: 'Cron executado', totalSent });
  } catch (e: any) {
    console.error('[Cron check-stale-leads] Erro:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
