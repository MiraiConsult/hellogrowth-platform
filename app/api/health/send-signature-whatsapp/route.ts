import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://miraisaleshg-evolution-api.cixapq.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'Mirai Sales HG';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signatureId, tenantId } = body;

    if (!tenantId || !signatureId) {
      return NextResponse.json({ error: 'tenantId e signatureId são obrigatórios' }, { status: 400 });
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
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
    }

    const sig = signatures[0];

    if (!sig.patient_phone) {
      return NextResponse.json({ error: 'Este paciente não possui telefone cadastrado' }, { status: 400 });
    }

    if (!EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Credenciais WhatsApp não configuradas no servidor' }, { status: 500 });
    }

    // Buscar nome da empresa
    const { data: businessProfile } = await supabaseAdmin
      .from('business_profile')
      .select('company_name')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const companyName = businessProfile?.company_name || 'HelloGrowth';

    // Normalizar telefone
    let phone = sig.patient_phone.replace(/\D/g, '');
    if (!phone.startsWith('55')) {
      phone = `55${phone}`;
    }

    const signedDate = new Date(sig.signed_at || sig.created_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    // Gerar link de visualização do termo
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://system.hellogrowth.online';
    const termLink = `${baseUrl}/api/health/view-term?id=${sig.id}&tenant=${tenantId}`;

    // Montar mensagem com o termo e link
    const consentSection = sig.consent_text
      ? `\n\n📄 *Termo de Consentimento:*\n${sig.consent_text}`
      : '';

    const message = `✅ *Termo de Assinatura Eletrônica*
*${companyName}*

Olá, *${sig.patient_name}*!

Sua assinatura eletrônica foi registrada com sucesso.${consentSection}

---
📅 *Data/Hora:* ${signedDate}
🌐 *IP registrado:* ${sig.ip_address || 'Registrado'}
🔑 *ID do registro:* ${sig.id}

---
📎 *Visualizar e salvar seu termo:*
${termLink}

_Acesse o link acima para visualizar o documento completo e salvá-lo como PDF (use a opção "Imprimir > Salvar como PDF" no seu navegador)._

---
_Esta assinatura é válida como prova jurídica conforme a Lei 14.063/2020._
_${companyName} — Powered by HelloGrowth_`;

    // Enviar via Evolution API
    const url = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: phone, text: message }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[send-signature-whatsapp] Erro Evolution:', data);
      return NextResponse.json({ error: data?.message || `Status ${response.status}` }, { status: 500 });
    }

    // Atualizar registro (tolerante a falhas — coluna pode não existir em todos os ambientes)
    try {
      await supabaseAdmin
        .from('health_signatures')
        .update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() })
        .eq('id', sig.id);
    } catch (updateErr) {
      console.warn('[send-signature-whatsapp] Não foi possível atualizar whatsapp_sent:', updateErr);
    }

    return NextResponse.json({ success: true, sentTo: phone });

  } catch (error: any) {
    console.error('[send-signature-whatsapp] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
