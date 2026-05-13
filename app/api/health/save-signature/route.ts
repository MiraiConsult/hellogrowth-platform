import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Envia o termo de assinatura eletrônica por e-mail (disparado automaticamente ao assinar)
async function sendConsentEmail(params: {
  to: string;
  patientName: string;
  consentText: string;
  signatureImage: string;
  signedAt: string;
  formName?: string;
  companyName?: string;
  logoUrl?: string;
  termColor?: string;
  signatureId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('[signature-email] RESEND_API_KEY não configurada — email não enviado');
    return { ok: false, error: 'RESEND_API_KEY não configurada' };
  }

  const {
    to, patientName, consentText, signatureImage, signedAt,
    formName, companyName, logoUrl, termColor = '#10b981', signatureId,
  } = params;

  const company = companyName || 'HelloGrowth';
  const signedDateStr = new Date(signedAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  // Gerar HTML do termo para anexo
  const termHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo de Assinatura Eletrônica — ${patientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1f2937; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 3px solid ${termColor}; padding-bottom: 20px; margin-bottom: 28px; display: flex; align-items: center; gap: 16px; }
    .header h1 { font-size: 18px; font-weight: 700; color: ${termColor}; margin-bottom: 2px; }
    .header p { font-size: 12px; color: #6b7280; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${termColor}; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .info-item span { font-size: 13px; font-weight: 600; color: #1f2937; }
    .consent-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid ${termColor}; border-radius: 4px; padding: 16px; font-size: 13px; line-height: 1.7; color: #374151; white-space: pre-wrap; }
    .signature-box { border: 2px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa; text-align: center; }
    .signature-box img { max-width: 100%; max-height: 140px; object-fit: contain; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.6; }
    .validity-badge { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="${company}" style="max-height:56px;max-width:160px;object-fit:contain;" />` : ''}
    <div>
      <h1>Termo de Assinatura Eletrônica</h1>
      <p>${company}</p>
    </div>
  </div>
  <div style="text-align:center; margin-bottom: 20px;">
    <span class="validity-badge">✓ Documento com validade jurídica — Lei 14.063/2020</span>
  </div>
  <div class="section">
    <div class="section-title">Dados do Signatário</div>
    <div class="info-grid">
      <div class="info-item"><label>Nome completo</label><span>${patientName}</span></div>
      <div class="info-item"><label>E-mail</label><span>${to}</span></div>
      <div class="info-item"><label>Data e Hora</label><span>${signedDateStr}</span></div>
      ${signatureId ? `<div class="info-item"><label>ID do Registro</label><span style="font-family:monospace;font-size:11px;">${signatureId}</span></div>` : ''}
    </div>
  </div>
  ${consentText ? `
  <div class="section">
    <div class="section-title">Termo de Consentimento</div>
    <div class="consent-box">${consentText}</div>
  </div>` : ''}
  ${signatureImage ? `
  <div class="section">
    <div class="section-title">Assinatura Digital</div>
    <div class="signature-box">
      <img src="${signatureImage}" alt="Assinatura do paciente" />
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:8px;">Assinatura eletrônica simples — Lei 14.063/2020</p>
  </div>` : ''}
  <div class="footer">
    <p>Este documento é um registro oficial de assinatura eletrônica gerado pelo sistema ${company}.</p>
    <p>A assinatura eletrônica simples tem validade jurídica conforme a <strong>Lei nº 14.063/2020</strong>.</p>
    <p style="margin-top: 8px; color: #d1d5db;">Gerado em: ${new Date().toLocaleString('pt-BR')} · Powered by <strong style="color: ${termColor};">HelloGrowth</strong></p>
  </div>
</body>
</html>`;

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:24px;">
        <div style="background:${termColor};padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${company}" style="max-height:48px;max-width:160px;object-fit:contain;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />` : ''}
          <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Termo de Assinatura Eletrônica</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">${company}</p>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="color:#374151;font-size:15px;margin:0 0 16px;">Olá, <strong>${patientName}</strong>!</p>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Sua assinatura eletrônica foi registrada com sucesso em <strong>${signedDateStr}</strong>.
            Em anexo você encontra o seu <strong>Termo de Assinatura Eletrônica</strong> com validade jurídica conforme a <strong>Lei 14.063/2020</strong>.
          </p>
          ${consentText ? `
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-left:4px solid ${termColor};border-radius:4px;padding:20px;margin-bottom:24px;">
            <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Termo de Consentimento</p>
            <p style="color:#374151;font-size:13px;line-height:1.7;white-space:pre-wrap;margin:0;">${consentText}</p>
          </div>` : ''}
          ${signatureImage ? `
          <div style="margin-bottom:24px;">
            <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Assinatura Digital</p>
            <div style="border:2px solid #e5e7eb;border-radius:8px;padding:8px;background:#fafafa;text-align:center;">
              <img src="${signatureImage}" alt="Assinatura" style="max-width:100%;max-height:120px;object-fit:contain;" />
            </div>
          </div>` : ''}
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Dados de Registro</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="color:#9ca3af;padding:3px 0;width:120px;">Signatário:</td><td style="color:#374151;font-weight:600;">${patientName}</td></tr>
              <tr><td style="color:#9ca3af;padding:3px 0;">Data/Hora:</td><td style="color:#374151;">${signedDateStr}</td></tr>
              ${formName ? `<tr><td style="color:#9ca3af;padding:3px 0;">Formulário:</td><td style="color:#374151;">${formName}</td></tr>` : ''}
              ${signatureId ? `<tr><td style="color:#9ca3af;padding:3px 0;">ID:</td><td style="color:#374151;font-family:monospace;font-size:11px;">${signatureId}</td></tr>` : ''}
            </table>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">
            Termo gerado automaticamente por <strong>${company}</strong>.<br/>
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
  const attachmentFilename = `termo-assinatura-${patientName.replace(/\s+/g, '-').toLowerCase()}.html`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${company} <noreply@hellogrowth.com.br>`,
        to: [to],
        subject: `Seu Termo de Assinatura Eletrônica — ${company}`,
        html: htmlBody,
        attachments: [
          {
            filename: attachmentFilename,
            content: termHtmlBase64,
          },
        ],
      }),
    });
    const responseData = await res.json();
    if (!res.ok) return { ok: false, error: responseData?.message || `Status ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      formId,
      leadId,
      patientName,
      patientEmail,
      patientPhone,
      signatureImage,
      consentText,
      signatureAutoEmail,
      formName,
      companyName,
      logoUrl,
      termColor,
    } = body;

    if (!tenantId || !formId || !patientName || !signatureImage) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Obter IP do request
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || '';

    // Montar o texto do termo final
    const finalConsentText = (consentText || `Eu, ${patientName}, declaro que as informações prestadas neste formulário são verdadeiras e autorizo o uso dos meus dados para fins de atendimento, conforme a LGPD (Lei 13.709/2018) e a Lei de Assinatura Eletrônica (Lei 14.063/2020).`)
      .replace('[NOME]', patientName);

    const signedAt = new Date().toISOString();

    // Salvar no banco de dados usando service_role key (ou anon key como fallback para staging)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const signatureId = randomUUID();

    const { data: savedSignature, error: saveError } = await supabaseAdmin
      .from('health_signatures')
      .insert([{
        id: signatureId,
        tenant_id: tenantId,
        form_id: formId,
        lead_id: leadId || null,
        patient_name: patientName,
        patient_email: patientEmail || null,
        patient_phone: patientPhone || null,
        signature_image: signatureImage,
        ip_address: ipAddress,
        user_agent: userAgent,
        consent_text: finalConsentText,
        signed_at: signedAt,
        email_sent: false,
      }])
      .select()
      .single();

    if (saveError) {
      console.error('[save-signature] Erro ao salvar:', saveError);
      return NextResponse.json({ 
        success: false, 
        error: saveError.message,
        note: 'Lead salvo, mas assinatura não pôde ser persistida. Execute a migração do banco de dados.'
      });
    }

    // Enviar email automaticamente se configurado e se tiver email do paciente
    if (signatureAutoEmail && patientEmail && savedSignature) {
      const emailResult = await sendConsentEmail({
        to: patientEmail,
        patientName,
        consentText: finalConsentText,
        signatureImage,
        signedAt,
        formName,
        companyName,
        logoUrl,
        termColor: termColor || '#10b981',
        signatureId: savedSignature.id,
      });

      if (emailResult.ok) {
        await supabaseAdmin
          .from('health_signatures')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', savedSignature.id);
      }

      return NextResponse.json({ 
        success: true, 
        signatureId: savedSignature?.id,
        emailSent: emailResult.ok,
        emailError: emailResult.error,
      });
    }

    return NextResponse.json({ 
      success: true, 
      signatureId: savedSignature?.id,
      emailSent: false,
    });

  } catch (error: any) {
    console.error('[save-signature] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
