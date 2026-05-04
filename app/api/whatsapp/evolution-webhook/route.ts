/**
 * Webhook para Evolution API
 * 
 * Recebe mensagens enviadas/recebidas pela Evolution API e:
 * 1. Salva mensagens inbound no banco (para exibir na fila de ações)
 * 2. Aciona o agente de IA híbrido para responder automaticamente
 *    quando a conversa está em modo "auto" ou gera draft para aprovação
 *    quando está em modo "approval_required"
 * 
 * URL para configurar no Evolution: /api/whatsapp/evolution-webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { detectIntent, isOptOut } from "@/lib/intent-detector";
import { generateMessage, buildConversationContext } from "@/lib/ai-message-engine";
import { sendUnifiedTextMessage, getTenantWhatsAppConfig } from "@/lib/whatsapp-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Evolution API envia diferentes formatos dependendo do evento
    const event = body.event;
    
    console.log(`[Evolution Webhook] Evento recebido: ${event}`);
    console.log(`[Evolution Webhook] Data type: ${Array.isArray(body.data) ? 'array' : typeof body.data}`);
    console.log(`[Evolution Webhook] Body keys: ${Object.keys(body).join(', ')}`);
    if (body.data) {
      const sample = Array.isArray(body.data) ? body.data[0] : body.data;
      console.log(`[Evolution Webhook] Data sample keys: ${Object.keys(sample || {}).join(', ')}`);
      if (sample?.key) console.log(`[Evolution Webhook] key.fromMe=${sample.key.fromMe}, remoteJid=${sample.key.remoteJid}`);
    }

    // Processar mensagens recebidas - aceitar múltiplos formatos de evento
    const isMessageEvent = event === "messages.upsert" || event === "message" || 
      event === "MESSAGES_UPSERT" || event === "messages.update" ||
      (body.data && (body.data.key || (Array.isArray(body.data) && body.data[0]?.key)));
    
    if (isMessageEvent) {
      // Evolution API v2 envia data como:
      // - Array de mensagens: [{key:{...}, message:{...}, ...}]
      // - Objeto único com key: {key:{...}, message:{...}, ...}
      // IMPORTANTE: NÃO usar rawData.message pois isso retorna o conteúdo da mensagem,
      // não o wrapper completo com key/pushName/messageTimestamp
      const rawData = body.data;
      const messages = Array.isArray(rawData) 
        ? rawData 
        : rawData?.key 
          ? [rawData]  // Objeto único com key = mensagem completa
          : Array.isArray(rawData?.messages) 
            ? rawData.messages 
            : [rawData]; // Fallback

      for (const message of messages) {
        if (!message) continue;

        // Ignorar mensagens enviadas pelo próprio número (fromMe)
        if (message.key?.fromMe === true) {
          console.log(`[Evolution Webhook] Ignorando mensagem fromMe`);
          continue;
        }

        const from = message.key?.remoteJid?.replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@g.us", "");
        if (!from) continue;
        
        // Ignorar grupos (contêm '-' no número)
        if (from.includes("-")) continue;

        // Extrair conteúdo da mensagem
        const content =
          message.message?.conversation ||
          message.message?.extendedTextMessage?.text ||
          message.message?.imageMessage?.caption ||
          message.message?.videoMessage?.caption ||
          message.text ||
          `[${Object.keys(message.message || {})[0] || "media"}]`;

        const contactName = message.pushName || message.notifyName || from;
        const waMessageId = message.key?.id || `evo_${Date.now()}`;
        const timestamp = message.messageTimestamp
          ? new Date(Number(message.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString();

        console.log(`[Evolution Webhook] Mensagem de ${from}: "${content.substring(0, 80)}"`);

        await handleIncomingMessage({
          from,
          content,
          contactName,
          waMessageId,
          timestamp,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Evolution Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleIncomingMessage({
  from,
  content,
  contactName,
  waMessageId,
  timestamp,
}: {
  from: string;
  content: string;
  contactName: string;
  waMessageId: string;
  timestamp: string;
}) {
  // Normalizar número (remover não-dígitos exceto +)
  const normalizedFrom = from.replace(/\D/g, "");

  // --------------------------------------------------------
  // Detecção de opt-out ANTES de buscar conversa (LGPD)
  // --------------------------------------------------------
  if (isOptOut(content)) {
    console.log(`[Evolution Webhook] Opt-out detectado de ${normalizedFrom}`);
    await supabase.from("whatsapp_optouts").upsert(
      { phone: normalizedFrom, opted_out_at: new Date().toISOString(), reason: content.substring(0, 100) },
      { onConflict: "phone" }
    );
    await supabase
      .from("ai_conversations")
      .update({ status: "dismissed" })
      .eq("contact_phone", normalizedFrom)
      .in("status", ["active", "waiting_reply", "draft", "pending"]);
    return;
  }

  // --------------------------------------------------------
  // Encontrar conversa ativa para este número
  // Tenta com e sem código de país para maior compatibilidade
  // --------------------------------------------------------
  // Gerar variantes do número para compatibilidade com formato brasileiro
  // Evolution envia 5551993188000 (com 55), banco pode ter 51993188000 (sem 55)
  const withoutCountry = normalizedFrom.replace(/^55/, "");
  const phoneVariants = [
    normalizedFrom,                                      // ex: 5551993188000
    withoutCountry,                                      // ex: 51993188000 (sem código país)
    normalizedFrom.startsWith("55") ? normalizedFrom : `55${normalizedFrom}`,
    `+${normalizedFrom}`,                                // ex: +5551993188000
    `+55${withoutCountry}`,                              // ex: +5551993188000
    // Variante com 9 adicionado (celular BR): 55 + DDD(2) + 9 + número(8)
    withoutCountry.length === 10 ? `55${withoutCountry.slice(0,2)}9${withoutCountry.slice(2)}` : "",
    withoutCountry.length === 10 ? `${withoutCountry.slice(0,2)}9${withoutCountry.slice(2)}` : "",
    // Variante sem 9 (formato antigo): 55 + DDD(2) + número(8)
    withoutCountry.length === 11 && withoutCountry[2] === "9" ? `55${withoutCountry.slice(0,2)}${withoutCountry.slice(3)}` : "",
    withoutCountry.length === 11 && withoutCountry[2] === "9" ? `${withoutCountry.slice(0,2)}${withoutCountry.slice(3)}` : "",
  ].filter(Boolean);
  // Remover duplicatas
  const uniqueVariants = [...new Set(phoneVariants)];

  let conversation: any = null;
  for (const phone of uniqueVariants) {
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, tenant_id, status, flow_type, contact_name, contact_phone, mode")
      .eq("contact_phone", phone)
      .in("status", ["active", "waiting_reply", "draft"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) { conversation = data; break; }
  }

  if (!conversation) {
    console.log(`[Evolution Webhook] Nenhuma conversa ativa para ${normalizedFrom}`);
    return;
  }

  // --------------------------------------------------------
  // Detectar intent
  // --------------------------------------------------------
  const intentResult = detectIntent(content);
  console.log(`[Evolution Webhook] Intent: ${intentResult.intent} (${intentResult.confidence}) — "${content.substring(0, 50)}"`);

  // --------------------------------------------------------
  // Salvar mensagem recebida no banco
  // --------------------------------------------------------
  await supabase.from("ai_conversation_messages").insert({
    conversation_id: conversation.id,
    direction: "inbound",
    content,
    status: "received",
    wa_message_id: waMessageId,
    sent_at: timestamp,
    ai_reasoning: `Intent: ${intentResult.intent} (${intentResult.confidence})`,
  });

  // --------------------------------------------------------
  // Escalar para humano se necessário
  // --------------------------------------------------------
  if (intentResult.intent === "escalate_human" && intentResult.confidence !== "low") {
    await supabase
      .from("ai_conversations")
      .update({ status: "escalated", last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);
    console.log(`[Evolution Webhook] Conversa ${conversation.id} escalada para humano`);
    return;
  }

  // Atualizar timestamp da última mensagem
  await supabase
    .from("ai_conversations")
    .update({ last_message_at: new Date().toISOString(), status: "active" })
    .eq("id", conversation.id);

  // --------------------------------------------------------
  // Modo do agente:
  // - "auto": responde automaticamente sem aprovação humana
  // - "approval_required" (padrão): gera draft para aprovação
  // --------------------------------------------------------
  const mode = conversation.mode || "approval_required";

  // Buscar histórico completo da conversa
  const { data: messages } = await supabase
    .from("ai_conversation_messages")
    .select("direction, content, sent_at")
    .eq("conversation_id", conversation.id)
    .neq("status", "draft")
    .order("sent_at", { ascending: true })
    .limit(20);

  const conversationHistory = (messages || []).map((m: any) => ({
    role: m.direction === "inbound" ? "user" as const : "assistant" as const,
    content: m.content,
  }));

  // Buscar dados do lead/trigger para personalização
  const { data: convFull } = await supabase
    .from("ai_conversations")
    .select("trigger_data, nps_score, contact_name, contact_phone, flow_type")
    .eq("id", conversation.id)
    .single();

  const triggerData = convFull?.trigger_data || {};

  // Gerar resposta com IA
  let aiResult;
  try {
    const ctx = await buildConversationContext({
      tenantId: conversation.tenant_id,
      flowType: conversation.flow_type,
      contactName: convFull?.contact_name || contactName,
      contactPhone: convFull?.contact_phone || normalizedFrom,
      npsScore: convFull?.nps_score,
      npsComment: triggerData.npsComment,
      formResponses: triggerData.formResponses,
      interestedServices: triggerData.interestedServices,
      conversationHistory,
      isFirstMessage: false,
    });
    aiResult = await generateMessage(ctx);
  } catch (err: any) {
    console.error("[Evolution Webhook] Erro ao gerar resposta IA:", err.message);
    return;
  }

  if (!aiResult?.content) return;

  if (mode === "auto") {
    // ---- MODO AUTO: enviar imediatamente ----
    try {
      const waConfig = await getTenantWhatsAppConfig(supabase, conversation.tenant_id);
      const waMessageId = await sendUnifiedTextMessage(
        waConfig,
        convFull?.contact_phone || normalizedFrom,
        aiResult.content
      );

      await supabase.from("ai_conversation_messages").insert({
        conversation_id: conversation.id,
        direction: "outbound",
        content: aiResult.content,
        status: "sent",
        wa_message_id: waMessageId,
        sent_at: new Date().toISOString(),
        ai_reasoning: aiResult.reasoning,
        approved_by: "ai_auto",
      });

      await supabase
        .from("ai_conversations")
        .update({ status: "waiting_reply", last_message_at: new Date().toISOString() })
        .eq("id", conversation.id);

      console.log(`[Evolution Webhook] Resposta automática enviada para ${normalizedFrom}: ${waMessageId}`);
    } catch (sendErr: any) {
      console.error("[Evolution Webhook] Erro ao enviar resposta automática:", sendErr.message);
    }
  } else {
    // ---- MODO APPROVAL: criar novo draft para aprovação ----
    // Remover draft anterior se existir
    await supabase
      .from("ai_conversation_messages")
      .delete()
      .eq("conversation_id", conversation.id)
      .eq("status", "draft")
      .eq("direction", "outbound");

    // Inserir novo draft
    await supabase.from("ai_conversation_messages").insert({
      conversation_id: conversation.id,
      direction: "outbound",
      content: aiResult.content,
      status: "draft",
      sent_at: new Date().toISOString(),
      ai_reasoning: aiResult.reasoning,
    });

    // Atualizar status da conversa para waiting_reply (para aparecer na fila)
    await supabase
      .from("ai_conversations")
      .update({ status: "waiting_reply", last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    console.log(`[Evolution Webhook] Novo draft gerado para aprovação — conversa ${conversation.id}`);
  }
}
