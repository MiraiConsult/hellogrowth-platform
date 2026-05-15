import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const maxDuration = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://miraisaleshg-evolution-api.cixapq.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Mirai Sales HG';

// Limite seguro de caracteres por mensagem WhatsApp (Evolution API)
const MAX_MSG_LENGTH = 3800;

async function sendWhatsAppMessage(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
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
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: normalizedPhone, text: message }),
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

/**
 * Divide uma mensagem longa em partes respeitando o limite de caracteres.
 * Tenta quebrar em linhas para não cortar no meio de uma palavra.
 */
function splitMessage(message: string, maxLength: number = MAX_MSG_LENGTH): string[] {
  if (message.length <= maxLength) return [message];

  const parts: string[] = [];
  const lines = message.split('\n');
  let current = '';

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      if (current) parts.push(current.trim());
      // Se a linha sozinha é maior que o limite, corta na força
      if (line.length > maxLength) {
        let remaining = line;
        while (remaining.length > maxLength) {
          parts.push(remaining.slice(0, maxLength));
          remaining = remaining.slice(maxLength);
        }
        current = remaining;
      } else {
        current = line;
      }
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function buildWhatsAppMessage(params: {
  leadName: string;
  leadPhone: string;
  formName: string;
  aiAnalysis: any;
  answers: any;
  questions: Array<{ id: string; text: string }>;
}): string {
  const { leadName, formName, aiAnalysis, answers, questions } = params;

  const classMap: Record<string, string> = {
    opportunity: '🔥 Oportunidade',
    risk: '⚠️ Risco',
    monitoring: '👁️ Monitoramento',
  };
  const classification = classMap[aiAnalysis?.classification || 'monitoring'] || '👁️ Monitoramento';
  const confidence = aiAnalysis?.confidence ? `${Math.round(aiAnalysis.confidence * 100)}%` : '';

  let msg = `*📊 Análise de Lead — HelloGrowth*\n\n`;
  msg += `*Lead:* ${leadName}\n`;
  msg += `*Formulário:* ${formName}\n`;
  msg += `*Classificação:* ${classification}${confidence ? ` (${confidence})` : ''}\n\n`;

  // Perguntas e respostas relevantes
  const qaLines = questions
    .filter(q => answers[q.id])
    .map(q => {
      const ans = answers[q.id];
      const value = Array.isArray(ans?.value) ? ans.value.join(', ') : (ans?.value || '—');
      return `• *${q.text}:* ${value}`;
    });
  if (qaLines.length > 0) {
    msg += `*Respostas:*\n${qaLines.join('\n')}\n\n`;
  }

  // Raciocínio
  if (aiAnalysis?.reasoning) {
    msg += `*🧠 Raciocínio:*\n${aiAnalysis.reasoning}\n\n`;
  }

  // Insights
  if (aiAnalysis?.client_insights?.length > 0) {
    msg += `*💡 Insights:*\n`;
    aiAnalysis.client_insights.forEach((i: string) => { msg += `• ${i}\n`; });
    msg += '\n';
  }

  // Produtos recomendados
  if (aiAnalysis?.recommended_products?.length > 0) {
    msg += `*🎯 Produtos Recomendados:*\n`;
    aiAnalysis.recommended_products.forEach((p: any) => {
      msg += `• *${p.name}*: ${p.reason}\n`;
    });
    msg += '\n';
  }

  // Próximos passos
  if (aiAnalysis?.next_steps?.length > 0) {
    msg += `*✅ Próximos Passos:*\n`;
    aiAnalysis.next_steps.forEach((s: string, idx: number) => {
      msg += `${idx + 1}. ${s}\n`;
    });
    msg += '\n';
  }

  // Script de vendas
  if (aiAnalysis?.sales_script) {
    msg += `*📝 Script de Vendas:*\n${aiAnalysis.sales_script}\n`;
  }

  return msg.trim();
}

export async function POST(request: NextRequest) {
  try {
    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Credenciais WhatsApp (Evolution API) não configuradas no servidor.' }, { status: 500 });
    }

    const body = await request.json();
    const { leadId, customPhone } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId é obrigatório.' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Buscar o lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    // Buscar o formulário
    const { data: form } = await supabase
      .from('forms')
      .select('*')
      .eq('id', lead.form_id)
      .single();

    // Determinar destinatário: customPhone > form.whatsapp_analysis_recipients > lead.phone
    let recipientPhone: string | null = null;
    if (customPhone?.trim()) {
      recipientPhone = customPhone.trim();
    } else if (form?.whatsapp_analysis_recipients) {
      // Pegar o primeiro número configurado no formulário
      const raw = form.whatsapp_analysis_recipients;
      const phones = typeof raw === 'string'
        ? raw.split(',').map((p: string) => p.trim()).filter(Boolean)
        : Array.isArray(raw) ? raw : [];
      recipientPhone = phones[0] || null;
    }

    if (!recipientPhone) {
      return NextResponse.json({
        error: 'Nenhum número de WhatsApp configurado. Configure os destinatários no formulário ou informe um número abaixo.',
        noRecipients: true,
      }, { status: 400 });
    }

    // Montar perguntas
    const questions: Array<{ id: string; text: string }> = (form?.questions || []).map((q: any) => ({
      id: q.id,
      text: q.text || q.label || q.id,
    }));

    const answers = lead.answers || {};
    const aiAnalysis = answers._ai_analysis || {};

    const fullMessage = buildWhatsAppMessage({
      leadName: lead.name || 'Lead',
      leadPhone: lead.phone || '',
      formName: form?.name || 'Formulário',
      aiAnalysis,
      answers,
      questions,
    });

    // Dividir mensagem em partes se necessário (limite Evolution API ~4096 chars)
    const parts = splitMessage(fullMessage, MAX_MSG_LENGTH);

    // Enviar todas as partes sequencialmente
    for (let i = 0; i < parts.length; i++) {
      const part = parts.length > 1 ? `*(${i + 1}/${parts.length})*\n${parts[i]}` : parts[i];
      const result = await sendWhatsAppMessage(recipientPhone, part);
      if (!result.ok) {
        console.error(`[resend-analysis-whatsapp] Erro ao enviar parte ${i + 1}/${parts.length}:`, result.error);
        return NextResponse.json({ error: result.error || 'Erro ao enviar WhatsApp.' }, { status: 500 });
      }
      // Pequeno delay entre partes para não sobrecarregar
      if (i < parts.length - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    // Registrar no histórico do lead
    const now = new Date().toISOString();
    const existingMeta = lead.metadata || {};
    const wppHistory = existingMeta.whatsapp_resend_history || [];
    wppHistory.push({ sentAt: now, phone: recipientPhone, resent: true, parts: parts.length });
    await supabase
      .from('leads')
      .update({ metadata: { ...existingMeta, whatsapp_resend_history: wppHistory } })
      .eq('id', leadId);

    return NextResponse.json({ sent: true, phone: recipientPhone, parts: parts.length });
  } catch (e: any) {
    console.error('[resend-analysis-whatsapp] Erro:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
