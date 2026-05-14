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
      .select("id, tenant_id, status, flow_type, contact_name, contact_phone, mode, human_took_over")
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
  // Verificar se humano assumiu a conversa (IA pausada)
  // --------------------------------------------------------
  if (conversation.human_took_over === true) {
    // Salvar mensagem inbound mas NÃO gerar resposta automática
    console.log(`[Evolution Webhook] Humano assumiu conversa ${conversation.id} — IA pausada, mensagem salva sem resposta`);
    // Ainda salva a mensagem (feito abaixo), mas retorna após salvar
    await supabase.from("ai_conversation_messages").insert({
      conversation_id: conversation.id,
      direction: "inbound",
      content,
      status: "received",
      wa_message_id: waMessageId,
      sent_at: timestamp,
      ai_reasoning: "IA pausada — humano assumiu conversa",
    });
    await supabase
      .from("ai_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);
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
  // MÓDULO SIMPLIFICADO: processar fluxo estruturado sem IA
  // --------------------------------------------------------
  // Buscar module_type e dados do fluxo simplificado
  const { data: convExtra } = await supabase
    .from("ai_conversations")
    .select("module_type, flow_step, flow_step_status, dispatch_campaign_id, appointment_datetime")
    .eq("id", conversation.id)
    .single();

  if (convExtra?.module_type === "simplified") {
    console.log(`[Evolution Webhook] Módulo SIMPLIFICADO detectado — processando fluxo estruturado (step: ${convExtra.flow_step})`);
    // Atualizar apenas last_message_at sem mudar status para active
    await supabase
      .from("ai_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    await processSimplifiedFlowEvolution({
      conversation: {
        id: conversation.id,
        tenant_id: conversation.tenant_id,
        contact_name: conversation.contact_name || contactName,
        contact_phone: conversation.contact_phone || normalizedFrom,
        flow_step: convExtra.flow_step || "confirmation",
        flow_step_status: convExtra.flow_step_status || "waiting_client",
        dispatch_campaign_id: convExtra.dispatch_campaign_id,
        appointment_datetime: convExtra.appointment_datetime,
      },
      messageContent: content,
    });
    return;
  }

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

  // Atualizar timestamp da última mensagem (apenas para módulo completo/IA)
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
    .select("trigger_data, nps_score, contact_name, contact_phone, flow_type, conversation_objective")
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
      conversationObjective: convFull?.conversation_objective || null,
    });
    aiResult = await generateMessage(ctx);
  } catch (err: any) {
    console.error("[Evolution Webhook] Erro ao gerar resposta IA:", err.message);
    return;
  }

  if (!aiResult?.content) return;

  if (mode === "auto") {
    // ---- MODO AUTO: enviar cada mensagem com delay (simula digitação humana) ----
    try {
      const waConfig = await getTenantWhatsAppConfig(supabase, conversation.tenant_id);
      const targetPhone = convFull?.contact_phone || normalizedFrom;

      // Usar array de mensagens (novo formato) ou fallback para content único
      const messagesToSend: string[] = aiResult.messages && aiResult.messages.length > 0
        ? aiResult.messages
        : [aiResult.content];

      console.log(`[Evolution Webhook] Enviando ${messagesToSend.length} mensagens para ${targetPhone}`);

      // Timestamp da mensagem do cliente que gerou esta resposta
      const clientMessageTimestamp = new Date().toISOString();

      let lastWaMessageId = "";
      let abortedDueToNewMessage = false;

      for (let i = 0; i < messagesToSend.length; i++) {
        const msgText = messagesToSend[i];
        if (!msgText?.trim()) continue;

        // Delay antes de enviar — simula comportamento humano realista
        if (i === 0) {
          // Primeira mensagem: delay inicial de 3-8s (simula leitura + início de digitação)
          const initialDelay = 3000 + Math.floor(Math.random() * 5000);
          await new Promise(resolve => setTimeout(resolve, initialDelay));
        } else {
          // Mensagens seguintes: tempo de leitura da anterior + tempo de digitação desta
          const prevText = messagesToSend[i - 1];
          const wordCount = prevText.split(/\s+/).length;
          // ~250ms por palavra para leitura (mín 1s, máx 4s)
          const readingTime = Math.min(Math.max(wordCount * 250, 1000), 4000);
          // ~60ms por caractere para digitação (mín 2s, máx 9s)
          const typingTime = Math.min(Math.max(msgText.length * 60, 2000), 9000);
          // Jitter aleatório +/- 800ms para parecer mais humano
          const jitter = Math.floor(Math.random() * 1600) - 800;
          await new Promise(resolve => setTimeout(resolve, readingTime + typingTime + jitter));
        }

        // Verificar se o cliente enviou uma nova mensagem DURANTE o delay
        // Se sim, abortar as mensagens restantes para não enviar conteúdo desatualizado
        if (i > 0) {
          const { data: newClientMsg } = await supabase
            .from("ai_conversation_messages")
            .select("id")
            .eq("conversation_id", conversation.id)
            .eq("direction", "inbound")
            .gt("sent_at", clientMessageTimestamp)
            .limit(1);

          if (newClientMsg && newClientMsg.length > 0) {
            console.log(`[Evolution Webhook] Cliente enviou nova mensagem durante envio do lote — abortando mensagens restantes (${i + 1} a ${messagesToSend.length})`);
            abortedDueToNewMessage = true;
            break;
          }
        }

        const waId = await sendUnifiedTextMessage(waConfig, targetPhone, msgText);
        lastWaMessageId = waId || lastWaMessageId;

        await supabase.from("ai_conversation_messages").insert({
          conversation_id: conversation.id,
          direction: "outbound",
          content: msgText,
          status: "sent",
          wa_message_id: waId,
          sent_at: new Date().toISOString(),
          ai_reasoning: i === 0 ? aiResult.reasoning : `Mensagem ${i + 1}/${messagesToSend.length}`,
          approved_by: "ai_auto",
        });

        console.log(`[Evolution Webhook] Mensagem ${i + 1}/${messagesToSend.length} enviada: "${msgText.substring(0, 60)}"`);
      }

      await supabase
        .from("ai_conversations")
        .update({ status: "waiting_reply", last_message_at: new Date().toISOString() })
        .eq("id", conversation.id);

      console.log(`[Evolution Webhook] Todas as mensagens enviadas para ${targetPhone}`);
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

    // Inserir novo draft (todas as mensagens concatenadas com \n\n para visualização)
    const draftContent = aiResult.messages && aiResult.messages.length > 1
      ? aiResult.messages.join("\n\n")
      : aiResult.content;

    await supabase.from("ai_conversation_messages").insert({
      conversation_id: conversation.id,
      direction: "outbound",
      content: draftContent,
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

// ============================================================
// Processamento do fluxo simplificado (Evolution API)
// ============================================================
async function processSimplifiedFlowEvolution(params: {
  conversation: {
    id: string;
    tenant_id: string;
    contact_name: string;
    contact_phone: string;
    flow_step: string;
    flow_step_status: string;
    dispatch_campaign_id: string | null;
    appointment_datetime: string | null;
  };
  messageContent: string;
}) {
  const { conversation, messageContent } = params;
  const msg = messageContent.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Buscar configuração do fluxo (dispatch_flow_configs)
  // Usar array em vez de maybeSingle para evitar erro com múltiplos registros
  const { data: flowConfigs, error: flowConfigError } = await supabase
    .from("dispatch_flow_configs")
    .select("*")
    .eq("contact_phone", conversation.contact_phone)
    .eq("tenant_id", conversation.tenant_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (flowConfigError) {
    console.error(`[SimplifiedFlow-Evo] Erro ao buscar flow_config:`, flowConfigError.message);
  }
  const flowConfig = flowConfigs?.[0] || null;
  const config = (flowConfig?.flow_config as any) || {};
  console.log(`[SimplifiedFlow-Evo] flow_config encontrado: ${!!flowConfig}, step2_anamnese=${config.step2_anamnese}, step4_postsale=${config.step4_postsale}`);

  // Buscar form_id e nps_campaign_id da dispatch_campaign
  let campaignFormId: string | null = null;
  let campaignNpsId: string | null = config.postsale_nps_id || null;
  if (conversation.dispatch_campaign_id) {
    const { data: campaign, error: campaignError } = await supabase
      .from("dispatch_campaigns")
      .select("form_id, nps_campaign_id")
      .eq("id", conversation.dispatch_campaign_id)
      .single();
    if (campaignError) {
      console.error(`[SimplifiedFlow-Evo] Erro ao buscar campaign:`, campaignError.message);
    }
    campaignFormId = campaign?.form_id || null;
    campaignNpsId = campaign?.nps_campaign_id || campaignNpsId;
    console.log(`[SimplifiedFlow-Evo] campaign form_id=${campaignFormId}, nps_campaign_id=${campaignNpsId}`);
  } else {
    console.log(`[SimplifiedFlow-Evo] AVISO: dispatch_campaign_id é null!`);
  }
  const currentStep = conversation.flow_step;

  let nextStep: string | null = null;
  let replyMessage: string | null = null;
  let newStatus = "active";

  if (currentStep === "confirmation") {
    // Reconhece variações de SIM
    const confirmed = /^(SIM|S|OK|1)$/.test(msg) ||
      msg.includes("SIM") || msg.includes("CONFIRMO") || msg.includes("CONFIRMADO") ||
      msg.includes("CERTO") || msg.includes("CLARO") || msg.includes("CERTEZA") ||
      msg.includes("PODE") || msg.startsWith("TA ") || msg === "TA" || msg === "TO" ||
      msg.includes("COMBINADO") || msg.includes("ESTAREI") || msg.includes("PRESENTE");
    // Reconhece variações de NÃO
    const denied = /^(NAO|N|0)$/.test(msg) ||
      msg.includes("NAO") || msg.includes("CANCELAR") || msg.includes("CANCELO") ||
      msg.includes("CANCELA") || msg.includes("IMPOSSIVEL") || msg.includes("NAO POSSO") ||
      msg.includes("DESMARCAR") || msg.includes("DESMARCO") || msg.includes("REMARCAR");

    if (confirmed) {
      const firstName = conversation.contact_name.split(" ")[0];
      console.log(`[SimplifiedFlow-Evo] CONFIRMED! step2_anamnese=${config.step2_anamnese}, step4_postsale=${config.step4_postsale}, campaignFormId=${campaignFormId}, dispatch_campaign_id=${conversation.dispatch_campaign_id}`);
      if (config.step2_anamnese) {
        nextStep = "presale";
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hellogrowth.online";
        const formLink = campaignFormId ? `${baseUrl}/form/${campaignFormId}` : null;
        replyMessage = formLink
          ? `Ótimo, ${firstName}! Consulta confirmada! 😊 Para nos preparar melhor para o seu atendimento, pedimos que preencha este formulário rápido antes da consulta: ${formLink}`
          : `Ótimo, ${firstName}! Consulta confirmada! 😊 Para nos preparar melhor, aguardamos o preenchimento do formulário de pré-venda.`;
        console.log(`[SimplifiedFlow-Evo] Confirmação SIM → presale: form_id=${campaignFormId}, formLink=${formLink}`);
      } else if (config.step4_postsale) {
        nextStep = "postsale_pending";
        replyMessage = `Ótimo, ${firstName}! Consulta confirmada! 😊 Aguardamos você!`;
        console.log(`[SimplifiedFlow-Evo] Confirmação SIM → postsale_pending`);
      } else {
        nextStep = "done";
        newStatus = "completed";
        replyMessage = `Ótimo, ${firstName}! Consulta confirmada! 😊 Aguardamos você!`;
        console.log(`[SimplifiedFlow-Evo] Confirmação SIM → done (sem step2 nem step4)`);
      }
    } else if (denied) {
      nextStep = "cancelled";
      newStatus = "completed";
      replyMessage = `Entendido, ${conversation.contact_name.split(" ")[0]}. Se quiser reagendar, entre em contato conosco. Até logo!`;
    } else {
      // Resposta não reconhecida — pedir para confirmar novamente
      replyMessage = `Olá ${conversation.contact_name.split(" ")[0]}! Por favor, responda SIM para confirmar ou NÃO para cancelar sua consulta.`;
    }
  } else if (currentStep === "presale") {
    // Etapa pré-venda: aguardar preenchimento do formulário
    console.log(`[SimplifiedFlow-Evo] Etapa presale: mensagem recebida do cliente, aguardando ação do usuário`);
  } else if (currentStep === "postsale_pending") {
    console.log(`[SimplifiedFlow-Evo] Etapa postsale_pending: aguardando ação do usuário`);
  } else if (currentStep === "postsale_sent") {
    console.log(`[SimplifiedFlow-Evo] Etapa postsale_sent: mensagem recebida após NPS`);
  }

  // Atualizar o flow_step na conversa
  if (nextStep) {
    // Para etapas que aguardam resposta do cliente, manter como waiting_reply
    const conversationStatus = newStatus === "completed" ? "completed" 
      : (nextStep === "presale" || nextStep === "postsale_sent") ? "waiting_reply" 
      : newStatus;
    await supabase
      .from("ai_conversations")
      .update({
        flow_step: nextStep,
        flow_step_status: nextStep === "postsale_pending" ? "waiting_user" : "waiting_client",
        flow_step_updated_at: new Date().toISOString(),
        status: conversationStatus,
      })
      .eq("id", conversation.id);
    console.log(`[SimplifiedFlow-Evo] Conversa atualizada: flow_step=${nextStep}, status=${conversationStatus}`);

    // Atualizar dispatch_flow_configs
    if (flowConfig?.id) {
      await supabase
        .from("dispatch_flow_configs")
        .update({ current_step: nextStep, status: newStatus === "completed" ? "completed" : "active" })
        .eq("id", flowConfig.id);
    }
  }

  // Enviar resposta automática via Evolution API
  if (replyMessage) {
    const waConfig = await getTenantWhatsAppConfig(supabase, conversation.tenant_id);
    console.log(`[SimplifiedFlow-Evo] Provider: ${waConfig.provider}, tenant: ${conversation.tenant_id}`);

    try {
      const waMessageId = await sendUnifiedTextMessage(
        waConfig,
        conversation.contact_phone,
        replyMessage
      );

      await supabase.from("ai_conversation_messages").insert({
        conversation_id: conversation.id,
        direction: "outbound",
        content: replyMessage,
        status: "sent",
        wa_message_id: waMessageId,
        sent_at: new Date().toISOString(),
        ai_reasoning: `Simplified flow (evo): ${currentStep} → ${nextStep || currentStep}`,
      });

      console.log(`[SimplifiedFlow-Evo] ✅ Mensagem enviada via ${waConfig.provider}: ${currentStep} → ${nextStep || currentStep}`);
    } catch (sendError: any) {
      console.error(`[SimplifiedFlow-Evo] ❌ Erro ao enviar:`, sendError?.message || sendError);
      await supabase.from("ai_conversation_messages").insert({
        conversation_id: conversation.id,
        direction: "outbound",
        content: replyMessage,
        status: "draft",
        sent_at: new Date().toISOString(),
        ai_reasoning: `Simplified flow (evo): ${currentStep} → ${nextStep || currentStep} (erro: ${sendError?.message || 'unknown'})`,
      });
    }
  }
}
