import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendConsentEmail(params: {
  to: string;
  patientName: string;
  consentText: string;
  signatureImage: string;
  signedAt: string;
  formName?: string;
  companyName?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('[signature-email] RESEND_API_KEY não configurada — email não enviado');
    return { ok: false, error: 'RESEND_API_KEY não configurada' };
  }

  const { to, patientName, consentText, signatureImage, signedAt, formName, companyName } = params;

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:24px;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Comprovante de Assinatura Eletrônica</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${companyName || 'HelloGrowth'}</p>
        </div>
        
        <!-- Body -->
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="color:#374151;font-size:15px;margin:0 0 16px;">Olá, <strong>${patientName}</strong>!</p>
          <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Este é o comprovante da sua assinatura eletrônica realizada em <strong>${new Date(signedAt).toLocaleString('pt-BR')}</strong>.
            Esta assinatura é válida como prova jurídica conforme a <strong>Lei 14.063/2020</strong> (Assinatura Eletrônica Simples).
          </p>
          
          <!-- Termo -->
          <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:20px;margin-bottom:24px;">
            <p style="color:#5b21b6;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Termo de Consentimento Assinado</p>
            <p style="color:#374151;font-size:13px;line-height:1.7;white-space:pre-wrap;margin:0;">${consentText}</p>
          </div>
          
          <!-- Assinatura -->
          <div style="margin-bottom:24px;">
            <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Assinatura Digital</p>
            <div style="border:2px solid #e5e7eb;border-radius:8px;padding:8px;background:#fafafa;text-align:center;">
              <img src="${signatureImage}" alt="Assinatura de ${patientName}" style="max-width:100%;max-height:120px;object-fit:contain;" />
            </div>
          </div>
          
          <!-- Metadados -->
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Dados de Registro</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="color:#9ca3af;padding:3px 0;width:120px;">Signatário:</td><td style="color:#374151;font-weight:600;">${patientName}</td></tr>
              <tr><td style="color:#9ca3af;padding:3px 0;">Data/Hora:</td><td style="color:#374151;">${new Date(signedAt).toLocaleString('pt-BR')}</td></tr>
              ${formName ? `<tr><td style="color:#9ca3af;padding:3px 0;">Formulário:</td><td style="color:#374151;">${formName}</td></tr>` : ''}
            </table>
          </div>
          
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">
            Este email é um comprovante automático gerado pelo sistema HelloGrowth.<br/>
            Guarde este documento para fins de comprovação jurídica.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="text-align:center;padding:16px;">
          <p style="color:#d1d5db;font-size:11px;margin:0;">Powered by <strong style="color:#7c3aed;">HelloGrowth</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HelloGrowth <noreply@hellogrowth.com.br>',
        to: [to],
        subject: `Comprovante de Assinatura Eletrônica — ${companyName || 'HelloGrowth'}`,
        html: htmlBody,
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
      // Não retornar erro — o lead já foi salvo, a assinatura é secundária
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
      });

      if (emailResult.ok && savedSignature) {
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
