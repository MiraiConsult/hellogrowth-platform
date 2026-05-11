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
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Comprovante de Assinatura Eletrônica</h1>
          </div>
          <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="color:#374151;font-size:15px;margin:0 0 16px;">Olá, <strong>${sig.patient_name}</strong>!</p>
            <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Este é o comprovante da sua assinatura eletrônica realizada em <strong>${new Date(sig.signed_at).toLocaleString('pt-BR')}</strong>.
              Esta assinatura é válida como prova jurídica conforme a <strong>Lei 14.063/2020</strong>.
            </p>
            <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="color:#5b21b6;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Termo de Consentimento</p>
              <p style="color:#374151;font-size:13px;line-height:1.7;white-space:pre-wrap;margin:0;">${sig.consent_text}</p>
            </div>
            <div style="margin-bottom:24px;">
              <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Assinatura Digital</p>
              <div style="border:2px solid #e5e7eb;border-radius:8px;padding:8px;background:#fafafa;text-align:center;">
                <img src="${sig.signature_image}" alt="Assinatura" style="max-width:100%;max-height:120px;object-fit:contain;" />
              </div>
            </div>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px;">
              <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 10px;">Dados de Registro</p>
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr><td style="color:#9ca3af;padding:3px 0;width:120px;">Signatário:</td><td style="color:#374151;font-weight:600;">${sig.patient_name}</td></tr>
                <tr><td style="color:#9ca3af;padding:3px 0;">Data/Hora:</td><td style="color:#374151;">${new Date(sig.signed_at).toLocaleString('pt-BR')}</td></tr>
                <tr><td style="color:#9ca3af;padding:3px 0;">IP:</td><td style="color:#374151;">${sig.ip_address || 'Registrado'}</td></tr>
              </table>
            </div>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">
              Comprovante gerado automaticamente pelo sistema HelloGrowth.<br/>
              Guarde este documento para fins de comprovação jurídica.
            </p>
          </div>
          <div style="text-align:center;padding:16px;">
            <p style="color:#d1d5db;font-size:11px;margin:0;">Powered by <strong style="color:#7c3aed;">HelloGrowth</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HelloGrowth <noreply@hellogrowth.com.br>',
        to: [sig.patient_email],
        subject: 'Comprovante de Assinatura Eletrônica — HelloGrowth',
        html: htmlBody,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: resData?.message || `Status ${res.status}` }, { status: 500 });
    }

    // Atualizar registro de email enviado
    await supabaseAdmin
      .from('health_signatures')
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq('id', sig.id);

    return NextResponse.json({ success: true, sentTo: sig.patient_email });

  } catch (error: any) {
    console.error('[send-signature-email] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
