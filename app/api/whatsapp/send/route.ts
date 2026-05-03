import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTextMessage, sendTemplateMessage } from "@/lib/whatsapp-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conversationId, messageId, approved_by } = await req.json();

    if (!conversationId || !messageId) {
      return NextResponse.json(
        { error: "conversationId e messageId são obrigatórios" },
        { status: 400 }
      );
    }

    // Buscar a mensagem e a conversa
    const { data: message, error: msgError } = await supabase
      .from("ai_conversation_messages")
      .select("*, ai_conversations(tenant_id, contact_phone, status)")
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .single();

    if (msgError || !message) {
      return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
    }

    if (message.status !== "draft" && message.status !== "pending_approval") {
      return NextResponse.json(
        { error: "Mensagem já foi enviada ou não está disponível para envio" },
        { status: 409 }
      );
    }

    // Buscar a conexão WhatsApp do tenant
    const tenantId = message.ai_conversations?.tenant_id;
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("phone_number_id, business_token")
      .eq("tenant_id", tenantId)
      .eq("status", "connected")
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "Conexão WhatsApp não encontrada para este tenant" },
        { status: 404 }
      );
    }

    const contactPhone = message.ai_conversations?.contact_phone;

    // Enviar via WhatsApp Cloud API
    const waMessageId = await sendTextMessage({
      phoneNumberId: connection.phone_number_id,
      accessToken: connection.business_token,
      to: contactPhone,
      text: message.content,
    });

    // Atualizar status da mensagem
    await supabase
      .from("ai_conversation_messages")
      .update({
        status: "sent",
        wa_message_id: waMessageId,
        sent_at: new Date().toISOString(),
        approved_by: approved_by ?? null,
      })
      .eq("id", messageId);

    // Atualizar conversa
    await supabase
      .from("ai_conversations")
      .update({
        status: "active",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    // Incrementar contador de aprovações no copiloto
    if (approved_by) {
      await supabase.rpc("increment_copilot_approval", { p_tenant_id: tenantId });
    }

    return NextResponse.json({ success: true, waMessageId });
  } catch (error) {
    console.error("[WhatsApp Send] Error:", error);
    return NextResponse.json(
      { error: "Erro ao enviar mensagem" },
      { status: 500 }
    );
  }
}
