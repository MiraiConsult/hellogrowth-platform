import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

// Credenciais Z-API fixas do servidor (configuradas nas env vars do Vercel)
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://miraisaleshg-evolution-api.cixapq.easypanel.host';

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Mirai Sales HG';

// Supabase com service role para buscar dados sem restrição de RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Envia mensagem via Evolution API
async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!EVOLUTION_API_KEY) {
      return { ok: false, error: 'Credenciais Evolution API não configuradas no servidor.' };
    }
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
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data?.message || data?.error || `Status ${response.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── Busca de KPIs ──────────────────────────────────────────────────────────

async function fetchLeadsKPIs(companyId: string, period: 'day' | 'week' | 'month') {
  const startDate = getPeriodStart(period);
  const startISO = startDate.toISOString();

  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, value, stage, created_at')
    .eq('company_id', companyId)
    .gte('created_at', startISO);

  const totalLeads = leads?.length || 0;
  const totalValue = leads?.reduce((sum, l) => sum + (l.value || 0), 0) || 0;
  const wonLeads = leads?.filter(l => l.stage === 'won' || l.stage === 'closed_won').length || 0;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return { totalLeads, totalValue, wonLeads, conversionRate };
}

async function fetchNPSKPIs(companyId: string, period: 'day' | 'week' | 'month') {
  const startDate = getPeriodStart(period);
  const startISO = startDate.toISOString();

  const { data: npsResponses } = await supabaseAdmin
    .from('nps_responses')
    .select('id, score, created_at')
    .eq('company_id', companyId)
    .gte('created_at', startISO);

  const npsCount = npsResponses?.length || 0;
  const promoters = npsResponses?.filter(r => r.score >= 9).length || 0;
  const detractors = npsResponses?.filter(r => r.score <= 6).length || 0;
  const neutrals = npsCount - promoters - detractors;
  const npsScore = npsCount > 0
    ? Math.round(((promoters - detractors) / npsCount) * 100)
    : null;

  return { npsCount, npsScore, promoters, neutrals, detractors };
}

function getPeriodStart(period: 'day' | 'week' | 'month'): Date {
  const now = new Date();
  if (period === 'day') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ─── Construtores de mensagem por plano ─────────────────────────────────────

function buildClientMessage(
  companyName: string,
  periodLabel: string,
  dateStr: string,
  leads: Awaited<ReturnType<typeof fetchLeadsKPIs>>
): string {
  return `🚀 *HelloGrowth — Relatório ${periodLabel}*
📅 ${dateStr}
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

function buildRatingMessage(
  companyName: string,
  periodLabel: string,
  dateStr: string,
  nps: Awaited<ReturnType<typeof fetchNPSKPIs>>
): string {
  const npsLine = nps.npsScore !== null
    ? `• NPS Score: ${nps.npsScore} pts`
    : `• NPS Score: Sem respostas no período`;

  return `🚀 *HelloGrowth — Relatório ${periodLabel}*
📅 ${dateStr}
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

function buildGrowthMessage(
  companyName: string,
  periodLabel: string,
  dateStr: string,
  leads: Awaited<ReturnType<typeof fetchLeadsKPIs>>,
  nps: Awaited<ReturnType<typeof fetchNPSKPIs>>
): string {
  const npsLine = nps.npsScore !== null
    ? `• NPS Score: ${nps.npsScore} pts`
    : `• NPS Score: Sem respostas no período`;

  return `🚀 *HelloGrowth — Relatório ${periodLabel}*
📅 ${dateStr}
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

async function buildMessageForPlan(
  plan: string,
  companyName: string,
  period: 'day' | 'week' | 'month',
  companyId: string
): Promise<string> {
  const periodLabel = period === 'day' ? 'Diário' : period === 'week' ? 'Semanal' : 'Mensal';
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const normalizedPlan = (plan || '').toLowerCase();

  if (normalizedPlan === 'hello_client' || normalizedPlan === 'client') {
    const leads = await fetchLeadsKPIs(companyId, period);
    return buildClientMessage(companyName, periodLabel, dateStr, leads);
  }

  if (normalizedPlan === 'hello_rating' || normalizedPlan === 'rating') {
    const nps = await fetchNPSKPIs(companyId, period);
    return buildRatingMessage(companyName, periodLabel, dateStr, nps);
  }

  // hello_growth, growth ou qualquer outro → mensagem completa
  const [leads, nps] = await Promise.all([
    fetchLeadsKPIs(companyId, period),
    fetchNPSKPIs(companyId, period)
  ]);
  return buildGrowthMessage(companyName, periodLabel, dateStr, leads, nps);
}

// ─── Mensagem de teste de conexão ───────────────────────────────────────────

function buildTestMessage(companyName?: string): string {
  return `✅ *HelloGrowth — Teste de Conexão*

${companyName ? `🏢 ${companyName}\n\n` : ''}Sua integração com o WhatsApp está funcionando corretamente! 🎉

Os relatórios automáticos de KPIs serão enviados neste número conforme a periodicidade configurada.

_HelloGrowth — Plataforma de Gestão Comercial_`;
}

// ─── Handler principal ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, companyId, whatsappNumber } = body;

    if (!whatsappNumber) {
      return NextResponse.json({ error: 'Número de WhatsApp não informado.' }, { status: 400 });
    }

    // Busca nome e plano da empresa
    let companyName = 'Sua Empresa';
    let plan = 'hello_growth';

    if (companyId) {
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('name, plan')
        .eq('id', companyId)
        .single();

      if (company?.name) companyName = company.name;
      if (company?.plan) plan = company.plan;
    }

    // Teste de conexão
    if (type === 'test') {
      const result = await sendWhatsAppMessage(whatsappNumber, buildTestMessage(companyName));
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Mensagem de teste enviada!' });
    }

    // Relatório completo adaptado ao plano
    if (type === 'report' && companyId) {
      const period: 'day' | 'week' | 'month' = body.period || 'day';
      const message = await buildMessageForPlan(plan, companyName, period, companyId);

      const result = await sendWhatsAppMessage(whatsappNumber, message);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Relatório enviado com sucesso!' });
    }

    return NextResponse.json({ error: 'Tipo de requisição inválido.' }, { status: 400 });

  } catch (e: any) {
    console.error('Erro na API send-report:', e);
    return NextResponse.json({ error: e.message || 'Erro interno.' }, { status: 500 });
  }
}
