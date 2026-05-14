import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 15;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.ANALYSIS_EMAIL_FROM || 'analise@hellogrowth.com.br';
const EMAIL_FROM_NAME = process.env.ANALYSIS_EMAIL_FROM_NAME || 'HelloGrowth — Análise de Lead';

// Monta o HTML do e-mail de análise
function buildAnalysisEmail(data: {
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  formName: string;
  companyName: string;
  answers: Record<string, { value: any; optionSelected?: any }>;
  questions: Array<{ id: string; text: string }>;
  aiAnalysis: {
    reasoning?: string;
    client_insights?: string[];
    recommended_products?: Array<{ name: string; reason: string }>;
    sales_script?: string;
    next_steps?: string[];
    classification?: string;
    confidence?: number;
  };
  panelLink?: string;
}): string {
  const { leadName, leadEmail, leadPhone, formName, companyName, answers, questions, aiAnalysis, panelLink } = data;

  // Montar lista de perguntas e respostas
  const qaRows = questions
    .filter(q => answers[q.id])
    .map(q => {
      const ans = answers[q.id];
      const value = Array.isArray(ans?.value) ? ans.value.join(', ') : (ans?.value || '—');
      return `
        <tr>
          <td style="padding: 10px 16px; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; width: 40%; vertical-align: top;">${q.text}</td>
          <td style="padding: 10px 16px; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 13px; font-weight: 500;">${value}</td>
        </tr>`;
    }).join('');

  // Montar produtos recomendados (sem valor)
  const productsHtml = aiAnalysis.recommended_products && aiAnalysis.recommended_products.length > 0
    ? aiAnalysis.recommended_products.map(p => `
        <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 8px;">
          <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-top: 5px; flex-shrink: 0;"></div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #065f46; font-size: 14px;">${p.name}</p>
            <p style="margin: 4px 0 0; color: #374151; font-size: 13px;">${p.reason}</p>
          </div>
        </div>`).join('')
    : '<p style="color: #6b7280; font-size: 13px;">Nenhum produto identificado.</p>';

  // Insights do cliente
  const insightsHtml = aiAnalysis.client_insights && aiAnalysis.client_insights.length > 0
    ? aiAnalysis.client_insights.map(i => `
        <li style="color: #374151; font-size: 13px; margin-bottom: 6px; padding-left: 4px;">${i}</li>`).join('')
    : '';

  // Próximos passos
  const nextStepsHtml = aiAnalysis.next_steps && aiAnalysis.next_steps.length > 0
    ? aiAnalysis.next_steps.map((s, idx) => `
        <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px;">
          <span style="background: #10b981; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0;">${idx + 1}</span>
          <p style="margin: 0; color: #374151; font-size: 13px; padding-top: 2px;">${s}</p>
        </div>`).join('')
    : '';

  // Badge de classificação
  const classMap: Record<string, { label: string; color: string; bg: string }> = {
    opportunity: { label: '🔥 Oportunidade', color: '#065f46', bg: '#d1fae5' },
    risk: { label: '⚠️ Risco', color: '#92400e', bg: '#fef3c7' },
    monitoring: { label: '👁️ Monitoramento', color: '#1e40af', bg: '#dbeafe' },
  };
  const cls = classMap[aiAnalysis.classification || 'monitoring'] || classMap.monitoring;
  const confidencePct = aiAnalysis.confidence ? Math.round(aiAnalysis.confidence * 100) : 0;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  <div style="max-width: 680px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 28px 32px;">
      <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">HelloGrowth · Análise de Lead</p>
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">${leadName}</h1>
      <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Formulário: <strong>${formName}</strong> · ${companyName}</p>
    </div>

    <!-- Dados do Lead -->
    <div style="padding: 24px 32px 0;">
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        ${leadEmail ? `<div style="background: #f3f4f6; border-radius: 8px; padding: 8px 14px; font-size: 13px; color: #374151;">📧 ${leadEmail}</div>` : ''}
        ${leadPhone ? `<div style="background: #f3f4f6; border-radius: 8px; padding: 8px 14px; font-size: 13px; color: #374151;">📞 ${leadPhone}</div>` : ''}
        <div style="background: ${cls.bg}; border-radius: 8px; padding: 8px 14px; font-size: 13px; color: ${cls.color}; font-weight: 600;">${cls.label}</div>
        ${confidencePct > 0 ? `<div style="background: #f3f4f6; border-radius: 8px; padding: 8px 14px; font-size: 13px; color: #374151;">Confiança: <strong>${confidencePct}%</strong></div>` : ''}
      </div>
    </div>

    <!-- Respostas do Formulário -->
    <div style="padding: 24px 32px 0;">
      <h2 style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">📋 Respostas do Formulário</h2>
      <table style="width: 100%; border-collapse: collapse; background: #fafafa; border-radius: 8px; overflow: hidden; border: 1px solid #f3f4f6;">
        <tbody>${qaRows}</tbody>
      </table>
    </div>

    <!-- Análise da IA -->
    ${aiAnalysis.reasoning ? `
    <div style="padding: 24px 32px 0;">
      <h2 style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">🧠 Análise da IA</h2>
      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; background: #f8fafc; padding: 14px; border-radius: 8px; border-left: 3px solid #10b981;">${aiAnalysis.reasoning}</p>
    </div>` : ''}

    <!-- Insights do Cliente -->
    ${insightsHtml ? `
    <div style="padding: 24px 32px 0;">
      <h2 style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">💡 Insights do Cliente</h2>
      <ul style="margin: 0; padding-left: 20px;">${insightsHtml}</ul>
    </div>` : ''}

    <!-- Produtos Sugeridos -->
    <div style="padding: 24px 32px 0;">
      <h2 style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">🎯 Produtos/Serviços Sugeridos</h2>
      ${productsHtml}
    </div>

    <!-- Script de Vendas -->
    ${aiAnalysis.sales_script ? `
    <div style="padding: 24px 32px 0;">
      <h2 style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">🗣️ Script de Vendas</h2>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${aiAnalysis.sales_script}</p>
      </div>
    </div>` : ''}

    <!-- Próximos Passos -->
    ${nextStepsHtml ? `
    <div style="padding: 24px 32px 0;">
      <h2 style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">✅ Próximos Passos</h2>
      ${nextStepsHtml}
    </div>` : ''}

    <!-- Botão Ver no Painel -->
    ${panelLink ? `
    <div style="padding: 20px 32px 0; text-align: center;">
      <a href="${panelLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 8px; letter-spacing: 0.3px;">🔗 Ver Análise Completa no Painel</a>
    </div>` : ''}

    <!-- Footer -->
    <div style="padding: 24px 32px 32px; margin-top: 24px; border-top: 1px solid #f3f4f6; text-align: center;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        Análise gerada automaticamente pela <strong>HelloGrowth</strong> · Plataforma de Gestão Comercial<br>
        Este e-mail foi enviado porque você ativou o envio de análises para este formulário.
      </p>
    </div>

  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY não configurada no servidor.' }, { status: 500 });
    }

    const body = await request.json();
    const {
      recipients,       // string[] — e-mails destinatários
      leadName,
      leadEmail,
      leadPhone,
      formName,
      companyName,
      answers,          // Record<string, { value: any }>
      questions,        // Array<{ id: string; text: string }>
      aiAnalysis,       // objeto da análise de IA
      panelLink,        // link direto para a análise no painel
    } = body;

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'Nenhum destinatário informado.' }, { status: 400 });
    }

    const html = buildAnalysisEmail({
      leadName: leadName || 'Lead',
      leadEmail: leadEmail || '',
      leadPhone: leadPhone || '',
      formName: formName || 'Formulário',
      companyName: companyName || 'Empresa',
      answers: answers || {},
      questions: questions || [],
      aiAnalysis: aiAnalysis || {},
      panelLink: panelLink || undefined,
    });

    const subject = `🔔 Novo Lead: ${leadName || 'Lead'} — ${formName || 'Formulário'}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
        to: recipients,
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[send-analysis-email] Resend error:', data);
      return NextResponse.json({ error: data?.message || `Resend status ${res.status}` }, { status: 500 });
    }

    return NextResponse.json({ sent: true, id: data.id });
  } catch (e: any) {
    console.error('[send-analysis-email] Erro:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
