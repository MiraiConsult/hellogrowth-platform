import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendUnifiedTextMessage } from '@/lib/whatsapp-client';

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

    // Enviar mensagem via WhatsApp
    const result = await sendUnifiedTextMessage(tenantId, phone, message);

    if (!result.success) {
      return NextResponse.json({ ok: false, error: result.error || 'Falha ao enviar mensagem' });
    }

    // Criar ou atualizar conversa no sistema para este contato
    // Verificar se já existe conversa ativa
    const { data: existingConv } = await supabaseAdmin
      .from('ai_conversations')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .or(`contact_phone.eq.${phone},contact_phone.eq.${phone.replace(/^55/, '')}`)
      .eq('status', 'active')
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
          status: 'active',
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
          wa_message_id: result.waMessageId || null,
          sent_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      ok: true,
      waMessageId: result.waMessageId,
      conversationId,
    });
  } catch (error: any) {
    console.error('[send-dispatch] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
