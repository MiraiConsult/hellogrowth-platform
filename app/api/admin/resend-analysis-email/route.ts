import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 30;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.ANALYSIS_EMAIL_FROM || 'analise@hellogrowth.com.br';
const EMAIL_FROM_NAME = process.env.ANALYSIS_EMAIL_FROM_NAME || 'HelloGrowth — Análise de Lead';

export async function POST(request: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY não configurada no servidor.' }, { status: 500 });
    }

    const body = await request.json();
    const { leadId, customRecipients } = body;

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

    // Buscar o formulário para obter destinatários e perguntas
    const { data: form } = await supabase
      .from('forms')
      .select('*')
      .eq('id', lead.form_id)
      .single();

    // Determinar destinatários: customRecipients > form.email_analysis_recipients
    let recipients: string[] = [];
    if (customRecipients && customRecipients.length > 0) {
      recipients = customRecipients;
    } else if (form?.email_analysis_recipients) {
      const raw = form.email_analysis_recipients;
      recipients = typeof raw === 'string'
        ? raw.split(',').map((e: string) => e.trim()).filter(Boolean)
        : Array.isArray(raw) ? raw : [];
    }

    if (recipients.length === 0) {
      return NextResponse.json({
        error: 'Nenhum destinatário configurado. Configure os e-mails de notificação no formulário ou informe destinatários manualmente.',
        noRecipients: true
      }, { status: 400 });
    }

    // Montar perguntas do formulário
    const questions: Array<{ id: string; text: string }> = (form?.questions || []).map((q: any) => ({
      id: q.id,
      text: q.text || q.label || q.id,
    }));

    // Extrair análise de IA das respostas
    const answers = lead.answers || {};
    const aiAnalysis = answers._ai_analysis || {};

    // Montar HTML do e-mail (reutilizando a mesma função do send-analysis-email)
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://hellogrowth.com.br'}/api/send-analysis-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipients,
        leadName: lead.name || 'Lead',
        leadEmail: lead.email || '',
        leadPhone: lead.phone || '',
        formName: form?.name || 'Formulário',
        companyName: form?.company_name || '',
        answers,
        questions,
        aiAnalysis,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data?.error || 'Erro ao enviar e-mail.' }, { status: 500 });
    }

    // Registrar o reenvio no histórico do lead (campo metadata)
    const now = new Date().toISOString();
    const existingMeta = lead.metadata || {};
    const emailHistory = existingMeta.email_resend_history || [];
    emailHistory.push({ sentAt: now, recipients, resent: true });
    await supabase
      .from('leads')
      .update({ metadata: { ...existingMeta, email_resend_history: emailHistory } })
      .eq('id', leadId);

    return NextResponse.json({ sent: true, recipients, id: data.id });
  } catch (e: any) {
    console.error('[resend-analysis-email] Erro:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
