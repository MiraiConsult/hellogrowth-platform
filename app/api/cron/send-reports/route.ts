import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// Supabase com service role para acesso sem restrição de RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Credenciais Z-API do servidor
const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID!;
const ZAPI_TOKEN = process.env.ZAPI_TOKEN!;
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN!;

// Retorna o intervalo do dia anterior em horário de Brasília (UTC-3)
function getYesterdayRange(): { startISO: string; endISO: string; dateLabel: string } {
  const now = new Date();
  // Ajusta para Brasília (UTC-3)
  const brasiliaOffset = -3 * 60 * 60 * 1000;
  const brasiliaNow = new Date(now.getTime() + brasiliaOffset);

  // Ontem em Brasília
  const yesterday = new Date(brasiliaNow);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  // Início do dia anterior: 00:00:00 Brasília = 03:00:00 UTC
  const start = new Date(Date.UTC(
    yesterday.getUTCFullYear(),
    yesterday.getUTCMonth(),
    yesterday.getUTCDate(),
    3, 0, 0, 0 // 00:00 Brasília = 03:00 UTC
  ));

  // Fim do dia anterior: 23:59:59 Brasília = 02:59:59 UTC do dia atual
  const end = new Date(Date.UTC(
    yesterday.getUTCFullYear(),
    yesterday.getUTCMonth(),
    yesterday.getUTCDate(),
    26, 59, 59, 999 // 23:59:59 Brasília = 02:59:59 UTC próximo dia
  ));

  const dateLabel = yesterday.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return { startISO: start.toISOString(), endISO: end.toISOString(), dateLabel };
}

// Busca KPIs do dia anterior para o tenant
async function fetchYesterdayKPIs(tenantId: string) {
  const { startISO, endISO } = getYesterdayRange();

  // Busca leads criados ontem
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, value, stage, created_at')
    .eq('company_id', tenantId)
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  // Busca respostas NPS de ontem
  const { data: npsResponses } = await supabaseAdmin
    .from('nps_responses')
    .select('id, score, created_at')
    .eq('company_id', tenantId)
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  const totalLeads = leads?.length || 0;
  const totalValue = leads?.reduce((sum, l) => sum + (l.value || 0), 0) || 0;
  const wonLeads = leads?.filter(l => l.stage === 'won' || l.stage === 'closed_won').length || 0;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const npsCount = npsResponses?.length || 0;
  const promoters = npsResponses?.filter(r => r.score >= 9).length || 0;
  const detractors = npsResponses?.filter(r => r.score <= 6).length || 0;
  const npsScore = npsCount > 0
    ? Math.round(((promoters - detractors) / npsCount) * 100)
    : null;

  return { totalLeads, totalValue, wonLeads, conversionRate, npsCount, npsScore, promoters, detractors };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Monta a mensagem do relatório diário
function buildDailyReportMessage(
  companyName: string,
  dateLabel: string,
  kpis: Awaited<ReturnType<typeof fetchYesterdayKPIs>>
): string {
  const npsLine = kpis.npsScore !== null
    ? `📊 *NPS:* ${kpis.npsScore} pts (${kpis.npsCount} respostas | ${kpis.promoters} promotores | ${kpis.detractors} detratores)`
    : `📊 *NPS:* Sem respostas no período`;

  return `🚀 *HelloGrowth — Relatório Diário*
📅 Dados de ontem: ${dateLabel}
🏢 ${companyName}
━━━━━━━━━━━━━━━━━━━━
💼 *VENDAS*
• Leads: ${kpis.totalLeads}
• Valor no Funil: ${formatCurrency(kpis.totalValue)}
• Ganhos: ${kpis.wonLeads}
• Conversão: ${kpis.conversionRate}%
━━━━━━━━━━━━━━━━━━━━
⭐ *SATISFAÇÃO*
${npsLine}
━━━━━━━━━━━━━━━━━━━━
_Enviado automaticamente pelo HelloGrowth_`;
}

// Envia mensagem via Z-API
async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) {
    console.error('[Cron] Credenciais Z-API não configuradas');
    return false;
  }

  try {
    const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': ZAPI_CLIENT_TOKEN
      },
      body: JSON.stringify({
        phone: phone.replace(/\D/g, ''),
        message
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Cron] Z-API error:', err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Cron] Erro ao enviar WhatsApp:', error);
    return false;
  }
}

// GET — chamado pelo Vercel Cron todo dia às 12:00 UTC (09:00 Brasília)
export async function GET(request: NextRequest) {
  // Verificação de segurança: apenas o Vercel Cron pode chamar esta rota
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { dateLabel } = getYesterdayRange();
  console.log(`[Cron] Executando relatório diário — dados de: ${dateLabel}`);

  try {
    // Busca todos os clientes com relatório diário habilitado e número de WhatsApp
    const { data: settings, error } = await supabaseAdmin
      .from('report_settings')
      .select('*')
      .eq('daily_enabled', true)
      .not('whatsapp_number', 'is', null);

    if (error) {
      console.error('[Cron] Erro ao buscar configurações:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!settings || settings.length === 0) {
      console.log('[Cron] Nenhum cliente com relatório diário habilitado');
      return NextResponse.json({ message: 'Nenhum relatório configurado', sent: 0 });
    }

    let totalSent = 0;
    const results: any[] = [];

    for (const setting of settings) {
      const tenantId = setting.company_id;

      // Busca o nome do usuário/empresa
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('name, email')
        .eq('id', tenantId)
        .maybeSingle();

      const companyName = userData?.name || 'Sua Empresa';

      // Busca os KPIs do dia anterior
      const kpis = await fetchYesterdayKPIs(tenantId);

      // Monta e envia a mensagem
      const message = buildDailyReportMessage(companyName, dateLabel, kpis);
      const sent = await sendWhatsAppMessage(setting.whatsapp_number, message);

      if (sent) {
        totalSent++;
        results.push({ tenantId, companyName, whatsapp: setting.whatsapp_number });
        console.log(`[Cron] ✅ Enviado para ${companyName} (${setting.whatsapp_number})`);
      } else {
        console.error(`[Cron] ❌ Falha ao enviar para ${companyName} (${setting.whatsapp_number})`);
      }
    }

    return NextResponse.json({
      message: 'Cron executado com sucesso',
      date: dateLabel,
      totalSent,
      results
    });

  } catch (error: any) {
    console.error('[Cron] Erro geral:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
