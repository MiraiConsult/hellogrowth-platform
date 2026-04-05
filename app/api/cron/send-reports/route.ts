import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// Supabase com service role para acesso sem restrição de RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Credenciais Z-API do servidor
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://miraisaleshg-evolution-api.cixapq.easypanel.host';

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Mirai Sales HG';

// Retorna o intervalo do dia anterior em horário de Brasília (UTC-3)
function getYesterdayRange(): { startISO: string; endISO: string; dateLabel: string } {
  const now = new Date();
  const brasiliaOffset = -3 * 60 * 60 * 1000;
  const brasiliaNow = new Date(now.getTime() + brasiliaOffset);

  const yesterday = new Date(brasiliaNow);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const start = new Date(Date.UTC(
    yesterday.getUTCFullYear(),
    yesterday.getUTCMonth(),
    yesterday.getUTCDate(),
    3, 0, 0, 0 // 00:00 Brasília = 03:00 UTC
  ));

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

// Busca KPIs de vendas (leads) do dia anterior
async function fetchLeadsKPIs(tenantId: string) {
  const { startISO, endISO } = getYesterdayRange();

  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, value, stage, created_at')
    .eq('company_id', tenantId)
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  const totalLeads = leads?.length || 0;
  const totalValue = leads?.reduce((sum, l) => sum + (l.value || 0), 0) || 0;
  const wonLeads = leads?.filter(l => l.stage === 'won' || l.stage === 'closed_won').length || 0;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return { totalLeads, totalValue, wonLeads, conversionRate };
}

// Busca KPIs de NPS do dia anterior
async function fetchNPSKPIs(tenantId: string) {
  const { startISO, endISO } = getYesterdayRange();

  const { data: npsResponses } = await supabaseAdmin
    .from('nps_responses')
    .select('id, score, created_at')
    .eq('company_id', tenantId)
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  const npsCount = npsResponses?.length || 0;
  const promoters = npsResponses?.filter(r => r.score >= 9).length || 0;
  const detractors = npsResponses?.filter(r => r.score <= 6).length || 0;
  const neutrals = npsCount - promoters - detractors;
  const npsScore = npsCount > 0
    ? Math.round(((promoters - detractors) / npsCount) * 100)
    : null;

  return { npsCount, npsScore, promoters, neutrals, detractors };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ─── Mensagem Hello Client (apenas Pré-venda) ───────────────────────────────
function buildClientMessage(
  companyName: string,
  dateLabel: string,
  leads: Awaited<ReturnType<typeof fetchLeadsKPIs>>
): string {
  return `🚀 *HelloGrowth — Relatório Diário*
📅 Dados de ontem: ${dateLabel}
🏢 ${companyName}
━━━━━━━━━━━━━━━━━━━━
💼 *PRÉ-VENDA*
• Leads: ${leads.totalLeads}
• Valor no Funil: ${formatCurrency(leads.totalValue)}
• Ganhos: ${leads.wonLeads}
• Conversão: ${leads.conversionRate}%
━━━━━━━━━━━━━━━━━━━━
_Enviado automaticamente pelo HelloGrowth_`;
}

// ─── Mensagem Hello Rating (apenas Satisfação / NPS) ────────────────────────
function buildRatingMessage(
  companyName: string,
  dateLabel: string,
  nps: Awaited<ReturnType<typeof fetchNPSKPIs>>
): string {
  const npsLine = nps.npsScore !== null
    ? `• NPS Score: ${nps.npsScore} pts`
    : `• NPS Score: Sem respostas no período`;

  return `🚀 *HelloGrowth — Relatório Diário*
📅 Dados de ontem: ${dateLabel}
🏢 ${companyName}
━━━━━━━━━━━━━━━━━━━━
⭐ *SATISFAÇÃO DO CLIENTE*
• Respostas NPS: ${nps.npsCount}
${npsLine}
• Promotores: ${nps.promoters}
• Neutros: ${nps.neutrals}
• Detratores: ${nps.detractors}
━━━━━━━━━━━━━━━━━━━━
_Enviado automaticamente pelo HelloGrowth_`;
}

// ─── Mensagem Hello Growth (Pré-venda + Satisfação) ─────────────────────────
function buildGrowthMessage(
  companyName: string,
  dateLabel: string,
  leads: Awaited<ReturnType<typeof fetchLeadsKPIs>>,
  nps: Awaited<ReturnType<typeof fetchNPSKPIs>>
): string {
  const npsLine = nps.npsScore !== null
    ? `• NPS Score: ${nps.npsScore} pts`
    : `• NPS Score: Sem respostas no período`;

  return `🚀 *HelloGrowth — Relatório Diário*
📅 Dados de ontem: ${dateLabel}
🏢 ${companyName}
━━━━━━━━━━━━━━━━━━━━
💼 *PRÉ-VENDA*
• Leads: ${leads.totalLeads}
• Valor no Funil: ${formatCurrency(leads.totalValue)}
• Ganhos: ${leads.wonLeads}
• Conversão: ${leads.conversionRate}%
━━━━━━━━━━━━━━━━━━━━
⭐ *SATISFAÇÃO DO CLIENTE*
• Respostas NPS: ${nps.npsCount}
${npsLine}
• Promotores: ${nps.promoters}
• Neutros: ${nps.neutrals}
• Detratores: ${nps.detractors}
━━━━━━━━━━━━━━━━━━━━
_Enviado automaticamente pelo HelloGrowth_`;
}

// Seleciona e monta a mensagem correta de acordo com o plano
async function buildMessageForPlan(
  plan: string,
  companyName: string,
  dateLabel: string,
  tenantId: string
): Promise<string> {
  const normalizedPlan = (plan || '').toLowerCase();

  if (normalizedPlan === 'hello_client' || normalizedPlan === 'client') {
    const leads = await fetchLeadsKPIs(tenantId);
    return buildClientMessage(companyName, dateLabel, leads);
  }

  if (normalizedPlan === 'hello_rating' || normalizedPlan === 'rating') {
    const nps = await fetchNPSKPIs(tenantId);
    return buildRatingMessage(companyName, dateLabel, nps);
  }

  // hello_growth, growth ou qualquer outro plano → mensagem completa
  const [leads, nps] = await Promise.all([
    fetchLeadsKPIs(tenantId),
    fetchNPSKPIs(tenantId)
  ]);
  return buildGrowthMessage(companyName, dateLabel, leads, nps);
}

// Envia mensagem via Evolution API
async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!EVOLUTION_API_KEY) {
    console.error('[Cron] Credenciais Evolution API não configuradas');
    return false;
  }

  try {
    let normalizedPhone = phone.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('55')) normalizedPhone = `55${normalizedPhone}`;
    const url = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({ number: normalizedPhone, text: message })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Cron] Evolution API error:', err);
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
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { dateLabel } = getYesterdayRange();
  console.log(`[Cron] Executando relatório diário — dados de: ${dateLabel}`);

  try {
    // Busca todos os clientes com relatório diário habilitado
    const { data: settings, error } = await supabaseAdmin
      .from('report_settings')
      .select('*')
      .eq('daily_enabled', true);

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

      // Busca nome e plano via tabela users (tabela correta no schema do HelloGrowth)
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('company_name, plan, settings')
        .eq('id', tenantId)
        .maybeSingle();
      const companyName = userProfile?.company_name || userProfile?.settings?.companyName || 'Sua Empresa';
      const plan = userProfile?.plan || 'hello_growth';

      // Monta lista de números: array whatsapp_numbers + campo legado whatsapp_number
      const numbers: string[] = [
        ...(Array.isArray(setting.whatsapp_numbers) ? setting.whatsapp_numbers : []),
      ];
      if (setting.whatsapp_number && !numbers.includes(setting.whatsapp_number)) {
        numbers.unshift(setting.whatsapp_number);
      }
      if (numbers.length === 0) {
        console.log(`[Cron] Sem número para ${companyName}, pulando`);
        continue;
      }

      console.log(`[Cron] Processando ${companyName} — plano: ${plan} — números: ${numbers.join(', ')}`);

      // Monta a mensagem de acordo com o plano
      const message = await buildMessageForPlan(plan, companyName, dateLabel, tenantId);

      // Envia para TODOS os números cadastrados
      const sendResults = await Promise.all(numbers.map(num => sendWhatsAppMessage(num, message)));
      const sent = sendResults.some(Boolean);

      if (sent) {
        totalSent++;
        results.push({ tenantId, companyName, plan, phones: numbers });
        console.log(`[Cron] ✅ Enviado para ${companyName} (${numbers.join(', ')}) — plano: ${plan}`);
      } else {
        console.error(`[Cron] ❌ Falha ao enviar para ${companyName} (${numbers.join(', ')})`);
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
