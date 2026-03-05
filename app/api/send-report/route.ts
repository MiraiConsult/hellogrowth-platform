import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

// Cria um cliente Supabase com service role para buscar dados sem RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Envia mensagem via Z-API
async function sendWhatsAppMessage(
  instanceId: string,
  token: string,
  clientToken: string,
  phone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': clientToken
      },
      body: JSON.stringify({
        phone,
        message
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { ok: false, error: data?.message || `Status ${response.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// Busca os KPIs da empresa no Supabase
async function fetchKPIs(companyId: string, period: 'day' | 'week' | 'month') {
  const now = new Date();
  let startDate: Date;

  if (period === 'day') {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const startISO = startDate.toISOString();

  // Busca leads (oportunidades) do período
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, value, stage, created_at')
    .eq('company_id', companyId)
    .gte('created_at', startISO);

  // Busca respostas NPS do período
  const { data: npsResponses } = await supabaseAdmin
    .from('nps_responses')
    .select('id, score, created_at')
    .eq('company_id', companyId)
    .gte('created_at', startISO);

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

  return {
    totalLeads,
    totalValue,
    wonLeads,
    conversionRate,
    npsCount,
    npsScore,
    promoters,
    detractors
  };
}

// Formata o número de valor em BRL
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Monta a mensagem de relatório
function buildReportMessage(
  companyName: string,
  period: 'day' | 'week' | 'month',
  kpis: Awaited<ReturnType<typeof fetchKPIs>>
): string {
  const periodLabel = period === 'day' ? 'Diário' : period === 'week' ? 'Semanal' : 'Mensal';
  const dateStr = new Date().toLocaleDateString('pt-BR');

  const npsLine = kpis.npsScore !== null
    ? `📊 *NPS:* ${kpis.npsScore} pts (${kpis.npsCount} respostas | ${kpis.promoters} promotores | ${kpis.detractors} detratores)`
    : `📊 *NPS:* Sem respostas no período`;

  return `🚀 *HelloGrowth — Relatório ${periodLabel}*
📅 ${dateStr}
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

// Mensagem de teste
function buildTestMessage(): string {
  return `✅ *HelloGrowth — Teste de Conexão*

Sua integração com o WhatsApp via Z-API está funcionando corretamente! 🎉

Os relatórios automáticos de KPIs serão enviados neste número conforme a periodicidade configurada.

_HelloGrowth — Plataforma de Gestão Comercial_`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, companyId, whatsappNumber, zapiInstanceId, zapiToken, zapiClientToken } = body;

    if (!zapiInstanceId || !zapiToken || !zapiClientToken) {
      return NextResponse.json({ error: 'Credenciais Z-API incompletas.' }, { status: 400 });
    }

    if (!whatsappNumber) {
      return NextResponse.json({ error: 'Número de WhatsApp não informado.' }, { status: 400 });
    }

    // Teste de conexão
    if (type === 'test') {
      const result = await sendWhatsAppMessage(
        zapiInstanceId,
        zapiToken,
        zapiClientToken,
        whatsappNumber,
        buildTestMessage()
      );

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Mensagem de teste enviada!' });
    }

    // Relatório completo
    if (type === 'report' && companyId) {
      const period: 'day' | 'week' | 'month' = body.period || 'day';

      // Busca o nome da empresa
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      const companyName = company?.name || 'Sua Empresa';
      const kpis = await fetchKPIs(companyId, period);
      const message = buildReportMessage(companyName, period, kpis);

      const result = await sendWhatsAppMessage(
        zapiInstanceId,
        zapiToken,
        zapiClientToken,
        whatsappNumber,
        message
      );

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
