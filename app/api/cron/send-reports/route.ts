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

// Retorna a hora atual no horário de Brasília (UTC-3)
function getBrasiliaHour(): { hour: number; minute: number; dayOfWeek: number; dayOfMonth: number } {
  const now = new Date();
  const brasiliaOffset = -3 * 60; // UTC-3 em minutos
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const brasiliaMinutes = ((utcMinutes + brasiliaOffset) + 1440) % 1440;
  const hour = Math.floor(brasiliaMinutes / 60);
  const minute = brasiliaMinutes % 60;

  // Dia da semana e do mês em Brasília
  const brasiliaDate = new Date(now.getTime() + brasiliaOffset * 60 * 1000);
  const dayOfWeek = brasiliaDate.getUTCDay(); // 0=Dom, 1=Seg, ..., 6=Sab
  const dayOfMonth = brasiliaDate.getUTCDate();

  return { hour, minute, dayOfWeek, dayOfMonth };
}

// Verifica se o horário configurado bate com o horário atual (tolerância de 5 min)
function isTimeToSend(scheduledTime: string, currentHour: number, currentMinute: number): boolean {
  const parts = scheduledTime.split(':');
  const scheduledHour = parseInt(parts[0], 10);
  const scheduledMinute = parseInt(parts[1] || '0', 10);
  const diff = Math.abs((currentHour * 60 + currentMinute) - (scheduledHour * 60 + scheduledMinute));
  return diff <= 5;
}

// Busca KPIs do tenant no Supabase
async function fetchKPIs(tenantId: string, period: 'day' | 'week' | 'month') {
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

  // Busca leads
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('id, value, stage, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', startISO);

  // Busca respostas NPS
  const { data: npsResponses } = await supabaseAdmin
    .from('nps_responses')
    .select('id, score, created_at')
    .eq('tenant_id', tenantId)
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

  return { totalLeads, totalValue, wonLeads, conversionRate, npsCount, npsScore, promoters, detractors };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Monta a mensagem do relatório
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

// GET — chamado pelo Vercel Cron a cada hora
export async function GET(request: NextRequest) {
  // Verificação de segurança: apenas o Vercel Cron pode chamar esta rota
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { hour, minute, dayOfWeek, dayOfMonth } = getBrasiliaHour();
  const isMonday = dayOfWeek === 1;
  const isFirstDayOfMonth = dayOfMonth === 1;

  console.log(`[Cron] Executando - Brasília: ${hour}:${String(minute).padStart(2, '0')} | Seg: ${isMonday} | 1º dia: ${isFirstDayOfMonth}`);

  try {
    // Busca todos os registros com pelo menos um tipo de relatório habilitado
    const { data: settings, error } = await supabaseAdmin
      .from('report_settings')
      .select('*')
      .or('daily_enabled.eq.true,weekly_enabled.eq.true,monthly_enabled.eq.true');

    if (error) {
      console.error('[Cron] Erro ao buscar configurações:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!settings || settings.length === 0) {
      return NextResponse.json({ message: 'Nenhum relatório configurado', sent: 0 });
    }

    let totalSent = 0;
    const results: any[] = [];

    for (const setting of settings) {
      const tenantId = setting.company_id; // company_id = user.id (tenant_id) no pre-production/main
      const scheduledTime = setting.scheduled_time?.substring(0, 5) || '08:00';

      // Verifica se é a hora certa para este cliente
      if (!isTimeToSend(scheduledTime, hour, minute)) {
        continue;
      }

      // Busca o nome do usuário/empresa
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('name, email')
        .eq('id', tenantId)
        .maybeSingle();

      const companyName = userData?.name || 'Sua Empresa';
      const reportsSent: string[] = [];

      // Relatório Diário — envia todos os dias no horário configurado
      if (setting.daily_enabled && setting.whatsapp_number) {
        const kpis = await fetchKPIs(tenantId, 'day');
        const message = buildReportMessage(companyName, 'day', kpis);
        const sent = await sendWhatsAppMessage(setting.whatsapp_number, message);
        if (sent) {
          reportsSent.push('daily');
          totalSent++;
        }
      }

      // Relatório Semanal — apenas às segundas-feiras
      if (setting.weekly_enabled && isMonday && setting.whatsapp_number) {
        const kpis = await fetchKPIs(tenantId, 'week');
        const message = buildReportMessage(companyName, 'week', kpis);
        const sent = await sendWhatsAppMessage(setting.whatsapp_number, message);
        if (sent) {
          reportsSent.push('weekly');
          totalSent++;
        }
      }

      // Relatório Mensal — apenas no 1º dia do mês
      if (setting.monthly_enabled && isFirstDayOfMonth && setting.whatsapp_number) {
        const kpis = await fetchKPIs(tenantId, 'month');
        const message = buildReportMessage(companyName, 'month', kpis);
        const sent = await sendWhatsAppMessage(setting.whatsapp_number, message);
        if (sent) {
          reportsSent.push('monthly');
          totalSent++;
        }
      }

      if (reportsSent.length > 0) {
        results.push({ tenantId, companyName, reportsSent, scheduledTime });
        console.log(`[Cron] ✅ Enviado para ${companyName}: ${reportsSent.join(', ')}`);
      }
    }

    return NextResponse.json({
      message: 'Cron executado com sucesso',
      brasiliaTime: `${hour}:${String(minute).padStart(2, '0')}`,
      totalSent,
      results
    });

  } catch (error: any) {
    console.error('[Cron] Erro geral:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
