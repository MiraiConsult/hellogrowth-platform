import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendUnifiedTextMessage, getTenantWhatsAppConfig } from "@/lib/whatsapp-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { actionId, conversationId, message, tenantId } = await req.json();

    if (!conversationId || !message || !tenantId) {
      return NextResponse.json({ error: "Parâmetros obrigatórios faltando" }, { status: 400 });
    }

    // Buscar configuração WhatsApp do tenant (suporta Evolution, 360dialog, Meta Cloud)
    const config = await getTenantWhatsAppConfig(supabase, tenantId);

    if (!config || !config.provider) {
      return NextResponse.json({ error: "WhatsApp não conectado" }, { status: 404 });
    }

    // Buscar telefone do contato
    const { data: conv, error: convError } = await supabase
      .from("ai_conversations")
      .select("contact_phone, contact_name")
      .eq("id", conversationId)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    // Enviar mensagem via WhatsApp (roteamento automático por provider)
    const waMessageId = await sendUnifiedTextMessage(config, conv.contact_phone, message);

    // Atualizar ou criar mensagem no banco
    const { data: existingDraft } = await supabase
      .from("ai_conversation_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .eq("status", "draft")
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();

    if (existingDraft) {
      await supabase
        .from("ai_conversation_messages")
        .update({
          content: message,
          status: "sent",
          wa_message_id: waMessageId,
          sent_at: new Date().toISOString(),
          approved_by: "human",
        })
        .eq("id", existingDraft.id);
    } else {
      await supabase.from("ai_conversation_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        content: message,
        status: "sent",
        wa_message_id: waMessageId,
        sent_at: new Date().toISOString(),
        approved_by: "human",
      });
    }

    // Atualizar status da conversa
    await supabase
      .from("ai_conversations")
      .update({
        status: "waiting_reply",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return NextResponse.json({ success: true, waMessageId });
  } catch (error) {
    console.error("[ActionInbox Approve] Error:", error);
    return NextResponse.json({ error: "Erro ao aprovar e enviar mensagem" }, { status: 500 });
  }
}
