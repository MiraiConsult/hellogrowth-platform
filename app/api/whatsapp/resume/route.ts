import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTemplateMessage } from "@/lib/whatsapp-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Reabrir conversa após janela de 24h expirada (Ajuste 2 do Claude)
// Usa o template hg_resume_conversation (categoria UTILITY)
export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId é obrigatório" }, { status: 400 });
    }

    // Buscar a conversa
    const { data: conversation, error: convError } = await supabase
      .from("ai_conversations")
      .select("id, tenant_id, contact_phone, contact_name, status")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    // Buscar conexão WhatsApp
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("phone_number_id, business_token")
      .eq("tenant_id", conversation.tenant_id)
      .eq("status", "connected")
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "Conexão WhatsApp não encontrada" },
        { status: 404 }
      );
    }

    // Enviar template de retomada
    const waMessageId = await sendTemplateMessage({
      phoneNumberId: connection.phone_number_id,
      accessToken: connection.business_token,
      to: conversation.contact_phone,
      templateName: "hg_resume_conversation",
      languageCode: "pt_BR",
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: conversation.contact_name }],
        },
      ],
    });

    // Registrar a mensagem no banco
    await supabase.from("ai_conversation_messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      content: `[Template: hg_resume_conversation] Olá ${conversation.contact_name}! Continuando nossa conversa anterior...`,
      status: "sent",
      wa_message_id: waMessageId,
      sent_at: new Date().toISOString(),
    });

    // Atualizar conversa
    await supabase
      .from("ai_conversations")
      .update({
        status: "waiting_reply",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return NextResponse.json({ success: true, waMessageId });
  } catch (error) {
    console.error("[WhatsApp Resume] Error:", error);
    return NextResponse.json({ error: "Erro ao retomar conversa" }, { status: 500 });
  }
}
