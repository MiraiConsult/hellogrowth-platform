import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 15;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://miraisaleshg-evolution-api.cixapq.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Mirai Sales HG';

// Tipos de alerta disponíveis
export type AlertType =
  | 'new_lead'
  | 'high_value_lead'
  | 'lead_won'
  | 'lead_lost'
  | 'detractor'
  | 'promoter'
  | 'neutral_with_comment'
  | 'any_nps_response'
  | 'trial_expiring'
  | 'stale_lead';

// Mapeamento de tipo → campo na tabela alert_settings
const ALERT_FIELD_MAP: Record<AlertType, string> = {
  new_lead: 'alert_new_lead',
  high_value_lead: 'alert_high_value_lead',
  lead_won: 'alert_lead_won',
  lead_lost: 'alert_lead_lost',
  detractor: 'alert_detractor',
  promoter: 'alert_promoter',
  neutral_with_comment: 'alert_neutral_with_comment',
  any_nps_response: 'alert_any_nps_response',
  trial_expiring: 'alert_trial_expiring',
  stale_lead: 'alert_stale_lead',
};

// Normaliza número de telefone para o formato esperado pela Evolution API
// Suporte a números brasileiros com ou sem o 9 extra
function normalizePhone(phone: string): string {
  let n = phone.replace(/\D/g, '');
  // Adiciona DDI 55 se não tiver
  if (!n.startsWith('55')) n = `55${n}`;
  // Números brasileiros com 13 dígitos (55 + DDD + 9 + 8 dígitos)
  // A Evolution API espera 12 dígitos para celulares (55 + DDD + 8 dígitos)
  // Mas para celulares com 9 na frente (regiões que adotaram), mantém 13
  // Regra: se tem 13 dígitos e o 5º dígito é 9, é celular com 9 extra
  // Deixamos como está — a Evolution API lida com ambos os formatos
  return n;
}

// Envia mensagem via Evolution API
async function sendWhatsApp(phone: string, message: string): Promise<{ ok: boolean; phone: string }> {
  if (!EVOLUTION_API_KEY) return { ok: false, phone };
  try {
    const normalizedPhone = normalizePhone(phone);
    const url = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: normalizedPhone, text: message }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[send-alert] Falha ao enviar para ${normalizedPhone}: ${res.status} ${err}`);
    }
    return { ok: res.ok, phone: normalizedPhone };
  } catch (e) {
    console.error(`[send-alert] Exceção ao enviar para ${phone}:`, e);
    return { ok: false, phone };
  }
}

// Formata valor em BRL
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Monta a mensagem de acordo com o tipo de alerta
function buildMessage(type: AlertType, data: Record<string, any>): string {
  const companyName = data.companyName || 'Sua Empresa';

  switch (type) {
    case 'new_lead':
      return `📥 *Novo Lead — ${companyName}*\n\n👤 ${data.name || 'Sem nome'}\n📧 ${data.email || '—'}\n📞 ${data.phone || '—'}\n💰 ${formatCurrency(data.value || 0)}\n📋 Formulário: ${data.formSource || '—'}\n\n_HelloGrowth_`;

    case 'high_value_lead':
      return `🔥 *Lead de Alto Valor — ${companyName}*\n\n👤 ${data.name || 'Sem nome'}\n📞 ${data.phone || '—'}\n💰 *${formatCurrency(data.value || 0)}*\n📋 Formulário: ${data.formSource || '—'}\n\n⚡ Entre em contato agora!\n\n_HelloGrowth_`;

    case 'lead_won':
      return `🏆 *Venda Fechada! — ${companyName}*\n\n👤 ${data.name || 'Sem nome'}\n💰 *${formatCurrency(data.value || 0)}*\n📋 Formulário: ${data.formSource || '—'}\n\n🎉 Parabéns pela conquista!\n\n_HelloGrowth_`;

    case 'lead_lost':
      return `❌ *Lead Perdido — ${companyName}*\n\n👤 ${data.name || 'Sem nome'}\n💰 ${formatCurrency(data.value || 0)}\n📋 Formulário: ${data.formSource || '—'}\n\n💡 Analise o motivo para melhorar.\n\n_HelloGrowth_`;

    case 'detractor':
      return `🚨 *Detrator Identificado — ${companyName}*\n\n👤 ${data.customerName || 'Cliente'}\n⭐ Nota: *${data.score}/10*\n💬 "${data.comment || 'Sem comentário'}"\n📞 ${data.phone || '—'}\n\n⚠️ Ação imediata recomendada!\n\n_HelloGrowth_`;

    case 'promoter':
      return `⭐ *Promotor Identificado — ${companyName}*\n\n👤 ${data.customerName || 'Cliente'}\n⭐ Nota: *${data.score}/10*\n💬 "${data.comment || 'Sem comentário'}"\n\n🙏 Peça uma indicação!\n\n_HelloGrowth_`;

    case 'neutral_with_comment':
      return `💬 *Feedback Neutro — ${companyName}*\n\n👤 ${data.customerName || 'Cliente'}\n⭐ Nota: *${data.score}/10*\n💬 "${data.comment}"\n\n💡 Oportunidade de melhoria identificada.\n\n_HelloGrowth_`;

    case 'any_nps_response':
      return `📊 *Nova Resposta NPS — ${companyName}*\n\n👤 ${data.customerName || 'Cliente'}\n⭐ Nota: *${data.score}/10*\n💬 "${data.comment || 'Sem comentário'}"\n\n_HelloGrowth_`;

    case 'trial_expiring':
      return `⏰ *Trial Expirando — ${companyName}*\n\n🏢 ${data.clientCompany || '—'}\n📅 Vence em: *${data.daysLeft} dia(s)*\n\n👉 Envie o link de pagamento agora!\n\n_HelloGrowth_`;

    case 'stale_lead':
      return `⚠️ *Lead Parado — ${companyName}*\n\n👤 ${data.name || 'Sem nome'}\n💰 ${formatCurrency(data.value || 0)}\n📋 Etapa: ${data.status || '—'}\n🕐 Parado há *${data.staleDays} dia(s)*\n\n💡 Retome o contato!\n\n_HelloGrowth_`;

    default:
      return `🔔 *Alerta — ${companyName}*\n\n_HelloGrowth_`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, companyId, data } = body as {
      type: AlertType;
      companyId: string;
      data: Record<string, any>;
    };

    if (!type || !companyId) {
      return NextResponse.json({ error: 'type e companyId são obrigatórios' }, { status: 400 });
    }

    // Busca configurações de alerta da empresa
    const { data: settings, error } = await supabaseAdmin
      .from('alert_settings')
      .select('*')
      .eq('company_id', companyId)
      .single();

    if (error || !settings) {
      // Sem configuração = não envia (silencioso)
      return NextResponse.json({ sent: false, reason: 'Sem configuração de alertas' });
    }

    // Suporte a múltiplos números com fallback para campo legado
    const numbers: string[] = [
      ...(Array.isArray(settings.whatsapp_numbers) ? settings.whatsapp_numbers : []),
    ];
    if (settings.whatsapp_number && !numbers.includes(settings.whatsapp_number)) {
      numbers.unshift(settings.whatsapp_number);
    }
    if (numbers.length === 0) {
      return NextResponse.json({ sent: false, reason: 'Número de WhatsApp não configurado' });
    }

    // Verifica se o alerta está habilitado
    const fieldName = ALERT_FIELD_MAP[type];
    if (!fieldName || !settings[fieldName]) {
      return NextResponse.json({ sent: false, reason: `Alerta "${type}" desabilitado` });
    }

    // Verificação especial para lead de alto valor
    if (type === 'high_value_lead') {
      const threshold = settings.high_value_threshold || 1000;
      if ((data.value || 0) < threshold) {
        return NextResponse.json({ sent: false, reason: 'Valor abaixo do limite configurado' });
      }
    }

    // Buscar nome da empresa se não foi passado pelo frontend
    let companyName = data.companyName;
    if (!companyName) {
      // Tentar buscar em business_profile primeiro
      const { data: bizProfile } = await supabaseAdmin
        .from('business_profile')
        .select('company_name')
        .eq('tenant_id', companyId)
        .maybeSingle();
      if (bizProfile?.company_name) {
        companyName = bizProfile.company_name;
      } else {
        // Fallback: buscar em users
        const { data: userProfile } = await supabaseAdmin
          .from('users')
          .select('company_name, settings')
          .eq('id', companyId)
          .maybeSingle();
        companyName = userProfile?.company_name || userProfile?.settings?.companyName || 'Sua Empresa';
      }
    }

    // Monta e envia a mensagem para todos os números cadastrados
    const message = buildMessage(type, { ...data, companyName });
    const results = await Promise.all(numbers.map(num => sendWhatsApp(num, message)));
    const sent = results.some(r => r.ok);
    const sentCount = results.filter(r => r.ok).length;
    const failedPhones = results.filter(r => !r.ok).map(r => r.phone);

    console.log(`[send-alert] type=${type} sent=${sent} total=${numbers.length} ok=${sentCount} failed=${failedPhones.join(',')}`);
    return NextResponse.json({ sent, type, phones: numbers, sentCount, failedPhones });
  } catch (e: any) {
    console.error('[send-alert] Erro:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
