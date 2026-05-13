import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Rota pública: GET /api/health/view-term?id=<signatureId>&tenant=<tenantId>
// Retorna o HTML do termo de assinatura eletrônica (pode ser impresso como PDF pelo browser)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const signatureId = searchParams.get('id');
    const tenantId = searchParams.get('tenant');

    if (!signatureId || !tenantId) {
      return new NextResponse('<h1>Parâmetros inválidos</h1><p>ID e tenant são obrigatórios.</p>', {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Buscar assinatura
    const { data: signatures, error: fetchError } = await supabaseAdmin
      .from('health_signatures')
      .select('*')
      .eq('id', signatureId)
      .eq('tenant_id', tenantId);

    if (fetchError || !signatures || signatures.length === 0) {
      return new NextResponse('<h1>Termo não encontrado</h1><p>Este termo não existe ou foi removido.</p>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const sig = signatures[0];

    // Buscar perfil do negócio
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

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Termo de Assinatura Eletrônica — ${sig.patient_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1f2937; background: #f9fafb; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 24px; background: #fff; min-height: 100vh; }
    .print-btn { position: fixed; top: 16px; right: 16px; background: ${termColor}; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 100; }
    .print-btn:hover { opacity: 0.9; }
    .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid ${termColor}; padding-bottom: 20px; margin-bottom: 28px; }
    .header-logo { max-height: 56px; max-width: 160px; object-fit: contain; }
    .header-title h1 { font-size: 18px; font-weight: 700; color: ${termColor}; margin-bottom: 2px; }
    .header-title p { font-size: 12px; color: #6b7280; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${termColor}; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 600px) { .info-grid { grid-template-columns: 1fr; } }
    .info-item label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
    .info-item span { font-size: 13px; font-weight: 600; color: #1f2937; }
    .consent-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid ${termColor}; border-radius: 4px; padding: 16px; font-size: 13px; line-height: 1.7; color: #374151; white-space: pre-wrap; }
    .signature-box { border: 2px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa; text-align: center; }
    .signature-box img { max-width: 100%; max-height: 140px; object-fit: contain; }
    .signature-caption { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 8px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; line-height: 1.6; }
    .validity-badge { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
    @media print {
      .print-btn { display: none; }
      body { background: #fff; }
      .container { padding: 20px; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  <div class="container">
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="header-logo" />` : ''}
      <div class="header-title">
        <h1>Termo de Assinatura Eletrônica</h1>
        <p>${companyName}</p>
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
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('[view-term] Erro:', error);
    return new NextResponse('<h1>Erro interno</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
