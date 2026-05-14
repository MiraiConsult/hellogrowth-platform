import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendUnifiedTextMessage, getTenantWhatsAppConfig } from '@/lib/whatsapp-client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const {
      tenantId,
      phone,
      message,
      recipientName,
      leadId,
      campaignId,
      dispatchType,
      formId,
      npsId,
    } = await req.json();

    if (!tenantId || !phone || !message) {
      return NextResponse.json({ ok: false, error: 'Parâmetros obrigatórios faltando' }, { status: 400 });
    }

    // Buscar configuração do WhatsApp do tenant
    const waConfig = await getTenantWhatsAppConfig(supabaseAdmin, tenantId);

    // Enviar mensagem via WhatsApp com a configuração correta do tenant
    let waMessageId: string | null = null;
    try {
      waMessageId = await sendUnifiedTextMessage(waConfig, phone, message);
    } catch (sendErr: any) {
      console.error('[send-dispatch] Erro ao enviar via WhatsApp:', sendErr.message);
      return NextResponse.json({ ok: false, error: sendErr.message });
    }

    // Criar ou atualizar conversa no sistema para este contato
    const { data: existingConv } = await supabaseAdmin
      .from('ai_conversations')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .or(`contact_phone.eq.${phone},contact_phone.eq.${phone.replace(/^55/, '')}`)
      .in('status', ['active', 'waiting_reply'])
      .maybeSingle();

    let conversationId = existingConv?.id;

    if (!conversationId) {
      // Criar nova conversa
      const { data: newConv } = await supabaseAdmin
        .from('ai_conversations')
        .insert({
          tenant_id: tenantId,
          contact_name: recipientName,
          contact_phone: phone,
          lead_id: leadId || null,
          status: 'waiting_reply',
          mode: 'auto',
          flow_type: 'pre_sale',
          trigger_type: 'dispatch',
          dispatch_campaign_id: campaignId || null,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      conversationId = newConv?.id;
    }

    // Salvar a mensagem enviada no histórico
    if (conversationId) {
      await supabaseAdmin
        .from('ai_conversation_messages')
        .insert({
          conversation_id: conversationId,
          tenant_id: tenantId,
          direction: 'outbound',
          content: message,
          status: 'sent',
          approved_by: 'dispatch',
          wa_message_id: waMessageId || null,
          sent_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      ok: true,
      waMessageId,
      conversationId,
    });
  } catch (error: any) {
    console.error('[send-dispatch] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
