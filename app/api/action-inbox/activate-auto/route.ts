/**
 * Endpoint: Ativar modo automático e enviar a primeira mensagem imediatamente
 * 
 * POST /api/action-inbox/activate-auto
 * Body: { conversationId, tenantId }
 * 
 * Fluxo:
 * 1. Ativa o modo "auto" na conversa
 * 2. Gera a primeira mensagem com IA (isFirstMessage: true)
 * 3. Envia imediatamente via WhatsApp com timing humano
 * 4. Salva as mensagens no banco
 * 5. Atualiza o status da conversa para "waiting_reply"
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateMessage, buildConversationContext } from "@/lib/ai-message-engine";
import type { FlowType } from "@/lib/ai-message-engine";
import { sendUnifiedTextMessage, getTenantWhatsAppConfig } from "@/lib/whatsapp-client";

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conversationId, tenantId } = await req.json();

    if (!conversationId || !tenantId) {
      return NextResponse.json(
        { error: "conversationId e tenantId são obrigatórios" },
        { status: 400 }
      );
    }

    // ---- 1. Buscar dados completos da conversa ----
    const { data: conv, error: convError } = await supabase
      .from("ai_conversations")
      .select("id, tenant_id, flow_type, contact_name, contact_phone, trigger_data, nps_score, mode, status")
      .eq("id", conversationId)
      .eq("tenant_id", tenantId)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    // Verificar se já tem mensagens enviadas (não repetir se já foi iniciada)
    const { data: existingMessages } = await supabase
      .from("ai_conversation_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .neq("status", "draft")
      .limit(1);

    if (existingMessages && existingMessages.length > 0) {
      // Já tem mensagem enviada — apenas ativar o modo auto sem enviar de novo
      await supabase
        .from("ai_conversations")
        .update({ mode: "auto" })
        .eq("id", conversationId);

      return NextResponse.json({
        success: true,
        mode: "auto",
        firstMessageSent: false,
        reason: "Conversa já tinha mensagens enviadas — apenas modo ativado",
      });
    }

    // ---- 2. Ativar modo auto ----
    await supabase
      .from("ai_conversations")
      .update({ mode: "auto", status: "active" })
      .eq("id", conversationId);

    // ---- 3. Gerar primeira mensagem com IA ----
    const triggerData = conv.trigger_data || {};
    let aiResult;
    try {
      const ctx = await buildConversationContext({
        tenantId,
        flowType: conv.flow_type as FlowType,
        contactName: conv.contact_name || "Cliente",
        contactPhone: conv.contact_phone,
        npsScore: conv.nps_score,
        npsComment: triggerData.npsComment,
        formResponses: triggerData.formResponses,
        interestedServices: triggerData.interestedServices,
        conversationHistory: [],
        isFirstMessage: true,
      });
      aiResult = await generateMessage(ctx);
    } catch (aiError: any) {
      console.error("[Activate Auto] Erro ao gerar mensagem IA:", aiError.message);
      return NextResponse.json(
        { error: "Erro ao gerar mensagem com IA", details: aiError.message },
        { status: 500 }
      );
    }

    if (!aiResult?.content) {
      return NextResponse.json({ error: "IA não retornou conteúdo" }, { status: 500 });
    }

    // ---- 4. Buscar config WhatsApp e enviar mensagens ----
    const waConfig = await getTenantWhatsAppConfig(supabase, tenantId);
    if (!waConfig || !waConfig.provider) {
      return NextResponse.json({ error: "WhatsApp não conectado" }, { status: 400 });
    }

    const messagesToSend: string[] = aiResult.messages && aiResult.messages.length > 0
      ? aiResult.messages
      : [aiResult.content];

    const targetPhone = conv.contact_phone;
    console.log(`[Activate Auto] Enviando ${messagesToSend.length} mensagens para ${targetPhone}`);

    // Remover qualquer draft existente antes de enviar
    await supabase
      .from("ai_conversation_messages")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("status", "draft")
      .eq("direction", "outbound");

    for (let i = 0; i < messagesToSend.length; i++) {
      const msgText = messagesToSend[i];
      if (!msgText?.trim()) continue;

      // Timing humano realista
      if (i === 0) {
        // Primeira mensagem: delay inicial de 2-5s (menor que respostas pois é início da conversa)
        const initialDelay = 2000 + Math.floor(Math.random() * 3000);
        await new Promise(resolve => setTimeout(resolve, initialDelay));
      } else {
        // Mensagens seguintes: leitura da anterior + digitação desta
        const prevText = messagesToSend[i - 1];
        const wordCount = prevText.split(/\s+/).length;
        const readingTime = Math.min(Math.max(wordCount * 250, 1000), 4000);
        const typingTime = Math.min(Math.max(msgText.length * 60, 2000), 9000);
        const jitter = Math.floor(Math.random() * 1600) - 800;
        await new Promise(resolve => setTimeout(resolve, readingTime + typingTime + jitter));
      }

      const waId = await sendUnifiedTextMessage(waConfig, targetPhone, msgText);

      await supabase.from("ai_conversation_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        content: msgText,
        status: "sent",
        wa_message_id: waId,
        sent_at: new Date().toISOString(),
        ai_reasoning: i === 0 ? aiResult.reasoning : `Mensagem ${i + 1}/${messagesToSend.length}`,
        approved_by: "ai_auto",
      });

      console.log(`[Activate Auto] Mensagem ${i + 1}/${messagesToSend.length} enviada: "${msgText.substring(0, 60)}"`);
    }

    // ---- 5. Atualizar status da conversa ----
    await supabase
      .from("ai_conversations")
      .update({
        mode: "auto",
        status: "waiting_reply",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    console.log(`[Activate Auto] Conversa ${conversationId} ativada e primeira mensagem enviada`);

    return NextResponse.json({
      success: true,
      mode: "auto",
      firstMessageSent: true,
      messagesCount: messagesToSend.length,
    });
  } catch (error: any) {
    console.error("[Activate Auto] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno", details: error.message },
      { status: 500 }
    );
  }
}
