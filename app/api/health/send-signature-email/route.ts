import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signatureId, tenantId, leadId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Buscar assinatura pelo signatureId ou pelo leadId
    let query = supabaseAdmin
      .from('health_signatures')
      .select('*')
      .eq('tenant_id', tenantId);

    if (signatureId) {
      query = query.eq('id', signatureId);
    } else if (leadId) {
      query = query.eq('lead_id', leadId).order('signed_at', { ascending: false }).limit(1);
    } else {
      return NextResponse.json({ error: 'signatureId ou leadId obrigatório' }, { status: 400 });
    }

    const { data: signatures, error: fetchError } = await query;

    if (fetchError || !signatures || signatures.length === 0) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
    }

    const sig = signatures[0];

    if (!sig.patient_email) {
      return NextResponse.json({ error: 'Este paciente não possui email cadastrado' }, { status: 400 });
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 });
    }

    // Buscar perfil do negócio (logo, nome da empresa, cor do termo)
    const { data: businessProfile } = await supabaseAdmin
      .from('business_profile')
      .select('company_name, logo_url')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    // Buscar cor do termo no formulário
    let termColor = '#10b981'; // Verde HelloGrowth padrão
    if (sig.form_id) {
      const { data: form } = await supabaseAdmin
        .from('forms')
        .select('term_color')
        .eq('id', sig.form_id)
        .maybeSingle();
      if (form?.term_color) termColor = form.term_color;
    }

    const companyName = businessProfile?.company_name || 'HelloGrowth';
    const logoUrl = businessProfile?.logo_url || null;

    const signedDate = new Date(sig.signed_at || sig.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

    // Gerar HTML do termo (para o corpo do e-mail e para o anexo)
    const termHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Termo de Assinatura Eletrônica — ${sig.patient_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1f2937; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid ${termColor}; padding-bottom: 20px; margin-bottom: 28px; }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .header-logo { max-height: 56px; max-width: 160px; object-fit: contain; }
    .header-title h1 { font-size: 18px; font-weight: 700; color: ${termColor}; margin-bottom: 2px; }
    .header-title p { font-size: 12px; color: #6b7280; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${termColor}; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .info-item span { font-size: 13px; font-weight: 600; color: #1f2937; }
    .consent-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid ${termColor}; border-radius: 4px; padding: 16px; font-size: 13px; line-height: 1.7; color: #374151; white-space: pre-wrap; }
    .signature-box { border: 2px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa; text-align: center; }
    .signature-box img { max-width: 100%; max-height: 140px; object-fit: contain; }
    .signature-caption { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 8px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.6; }
    .validity-badge { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="header-logo" />` : ''}
      <div class="header-title">
        <h1>Termo de Assinatura Eletrônica</h1>
        <p>${companyName}</p>
      </div>
    </div>
  </div>
  <div style="text-align:center; margin-bottom: 20px;">
    <span class="validity-badge">✓ Documento com validade jurídica — Lei 14.063/2020</span>
  </div>
  <div class="section">
    <div class="section-title">Dados do Signatário</div>
    <div class="info-grid">
      <div class="info-item"><label>Nome completo</label><span>${sig.patient_name || '—'}</span></div>
      <div class="info-item"><label>E-mail</label><span>${sig.patient_email || '—'}</span></div>
      <div class="info-item"><label>Telefone</label><span>${sig.patient_phone || '—'}</span></div>
      <div class="info-item"><label>Data e Hora da Assinatura</label><span>${signedDate}</span></div>
      <div class="info-item"><label>Endereço IP</label><span style="font-family:monospace; font-size:12px;">${sig.ip_address || '—'}</span></div>
      <div class="info-item"><label>ID do Registro</label><span style="font-family:monospace; font-size:11px;">${sig.id}</span></div>
    </div>
  </div>
  ${sig.consent_text ? `
  <div class="section">
    <div class="section-title">Termo de Consentimento</div>
    <div class="consent-box">${sig.consent_text}</div>
  </div>` : ''}
  ${sig.signature_image ? `
  <div class="section">
    <div class="section-title">Assinatura Digital</div>
    <div class="signature-box">
      <img src="${sig.signature_image}" alt="Assinatura do paciente" />
    </div>
    <p class="signature-caption">Assinatura eletrônica simples — Lei 14.063/2020</p>
  </div>` : ''}
  <div class="footer">
    <p>Este documento é um registro oficial de assinatura eletrônica gerado pelo sistema ${companyName}.</p>
    <p>A assinatura eletrônica simples tem validade jurídica conforme a <strong>Lei nº 14.063/2020</strong>.</p>
    <p style="margin-top: 8px; color: #d1d5db;">Gerado em: ${new Date().toLocaleString('pt-BR')} · Powered by <strong style="color: ${termColor};">HelloGrowth</strong></p>
  </div>
</body>
</html>`;

    // Corpo do e-mail (HTML formatado para cliente de e-mail)
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:${termColor};padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height:48px;max-width:160px;object-fit:contain;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />` : ''}
            <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Termo de Assinatura Eletrônica</h1>
            <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${companyName}</p>
          </div>
          <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="color:#374151;font-size:15px;margin:0 0 16px;">Olá, <strong>${sig.patient_name}</strong>!</p>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Sua assinatura eletrônica foi registrada com sucesso em <strong>${signedDate}</strong>.
              Em anexo você encontra o seu <strong>Termo de Assinatura Eletrônica</strong> com validade jurídica conforme a <strong>Lei 14.063/2020</strong>.
            </p>

            ${sig.consent_text ? `
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid ${termColor};border-radius:4px;padding:20px;margin-bottom:24px;">
              <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Termo de Consentimento</p>
              <p style="color:#374151;font-size:13px;line-height:1.7;white-space:pre-wrap;margin:0;">${sig.consent_text}</p>
            </div>
            ` : ''}

            ${sig.signature_image ? `
            <div style="margin-bottom:24px;">
              <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Assinatura Digital</p>
              <div style="border:2px solid #e5e7eb;border-radius:8px;padding:8px;background:#fafafa;text-align:center;">
                <img src="${sig.signature_image}" alt="Assinatura" style="max-width:100%;max-height:120px;object-fit:contain;" />
              </div>
            </div>
            ` : ''}

            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
              <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Dados de Registro</p>
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr><td style="color:#9ca3af;padding:3px 0;width:120px;">Signatário:</td><td style="color:#374151;font-weight:600;">${sig.patient_name}</td></tr>
                <tr><td style="color:#9ca3af;padding:3px 0;">Data/Hora:</td><td style="color:#374151;">${signedDate}</td></tr>
                <tr><td style="color:#9ca3af;padding:3px 0;">IP:</td><td style="color:#374151;">${sig.ip_address || 'Registrado'}</td></tr>
                <tr><td style="color:#9ca3af;padding:3px 0;">ID:</td><td style="color:#374151;font-family:monospace;font-size:11px;">${sig.id}</td></tr>
              </table>
            </div>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">
              Termo gerado automaticamente por <strong>${companyName}</strong>.<br/>
              Guarde este e-mail como prova jurídica da sua assinatura eletrônica.
            </p>
          </div>
          <div style="text-align:center;padding:16px;">
            <p style="color:#d1d5db;font-size:11px;margin:0;">Powered by <strong style="color:${termColor};">HelloGrowth</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Converter HTML do termo para base64 (para enviar como anexo)
    const termHtmlBase64 = Buffer.from(termHtml, 'utf-8').toString('base64');
    const attachmentFilename = `termo-assinatura-${(sig.patient_name || sig.id).replace(/\s+/g, '-').toLowerCase()}.html`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName} <noreply@hellogrowth.com.br>`,
        to: [sig.patient_email],
        subject: `Seu Termo de Assinatura Eletrônica — ${companyName}`,
        html: htmlBody,
        attachments: [
          {
            filename: attachmentFilename,
            content: termHtmlBase64,
          },
        ],
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: resData?.message || `Status ${res.status}` }, { status: 500 });
    }

    // Atualizar registro de email enviado (tolerante a falhas)
    try {
      await supabaseAdmin
        .from('health_signatures')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', sig.id);
    } catch (updateErr) {
      console.warn('[send-signature-email] Não foi possível atualizar email_sent:', updateErr);
    }

    return NextResponse.json({ success: true, sentTo: sig.patient_email });

  } catch (error: any) {
    console.error('[send-signature-email] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
