/**
 * Workflows Inngest para os 4 fluxos de Ação Autônoma.
 * 
 * Cada fluxo segue o mesmo padrão:
 * 1. Recebe evento (NPS respondido ou pré-venda acionada)
 * 2. Cria conversa no banco
 * 3. Gera mensagem via IA
 * 4. Salva como draft (modo Copiloto) ou envia direto (modo Autopiloto)
 * 5. Aguarda resposta do paciente
 * 6. Loop de conversa até conclusão ou timeout
 */

import { inngest } from "@/lib/inngest-client";
import { createClient } from "@supabase/supabase-js";
import {
  generateMessage,
  buildConversationContext,
  FlowType,
} from "@/lib/ai-message-engine";
import { sendTextMessage } from "@/lib/whatsapp-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// TIPOS DE EVENTOS
// ============================================================

interface NPSActionEvent {
  name: "hellogrowth/nps.action.trigger";
  data: {
    tenantId: string;
    npsResponseId: string;
    contactName: string;
    contactPhone: string;
    npsScore: number;
    npsComment?: string;
    flowType: "detractor" | "promoter" | "passive";
  };
}

interface PreSaleActionEvent {
  name: "hellogrowth/presale.action.trigger";
  data: {
    tenantId: string;
    leadId: string;
    contactName: string;
    contactPhone: string;
    interestedServices: string[];
    formResponses: Record<string, string>;
  };
}

interface InboundMessageEvent {
  name: "hellogrowth/whatsapp.message.inbound";
  data: {
    tenantId: string;
    conversationId: string;
    contactPhone: string;
    messageContent: string;
    waMessageId: string;
  };
}

// ============================================================
// HELPER: Verificar se WhatsApp está conectado
// ============================================================

async function getWhatsAppConnection(tenantId: string) {
  const { data } = await supabase
    .from("whatsapp_connections")
    .select("id, phone_number_id, business_token, quality_rating, copilot_mode")
    .eq("tenant_id", tenantId)
    .eq("status", "connected")
    .single();
  return data;
}

// ============================================================
// HELPER: Criar conversa no banco
// ============================================================

async function createConversation(params: {
  tenantId: string;
  flowType: FlowType;
  contactName: string;
  contactPhone: string;
  npsScore?: number;
  triggerData: Record<string, unknown>;
  sourceId?: string;
  sourceType?: string;
}) {
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      tenant_id: params.tenantId,
      flow_type: params.flowType,
      contact_name: params.contactName,
      contact_phone: params.contactPhone,
      nps_score: params.npsScore || null,
      trigger_data: params.triggerData,
      source_id: params.sourceId || null,
      source_type: params.sourceType || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Erro ao criar conversa: ${error.message}`);
  return data!.id;
}

// ============================================================
// HELPER: Salvar mensagem no banco
// ============================================================

async function saveMessage(params: {
  conversationId: string;
  direction: "inbound" | "outbound";
  content: string;
  status: "draft" | "sent" | "delivered" | "read";
  waMessageId?: string;
  approvedBy?: string;
  aiReasoning?: string;
}) {
  const { error } = await supabase.from("ai_conversation_messages").insert({
    conversation_id: params.conversationId,
    direction: params.direction,
    content: params.content,
    status: params.status,
    wa_message_id: params.waMessageId || null,
    approved_by: params.approvedBy || null,
    ai_reasoning: params.aiReasoning || null,
    sent_at: new Date().toISOString(),
  });

  if (error) throw new Error(`Erro ao salvar mensagem: ${error.message}`);
}

// ============================================================
// HELPER: Buscar histórico de conversa
// ============================================================

async function getConversationHistory(conversationId: string) {
  const { data } = await supabase
    .from("ai_conversation_messages")
    .select("direction, content, status")
    .eq("conversation_id", conversationId)
    .in("status", ["sent", "delivered", "read"])
    .order("sent_at", { ascending: true });

  return (data || []).map((msg) => ({
    role: (msg.direction === "outbound" ? "assistant" : "user") as "user" | "assistant",
    content: msg.content,
  }));
}

// ============================================================
// WORKFLOW 1: FLUXO NPS (Detrator, Promotor, Neutro)
// ============================================================

export const npsActionFlow = inngest.createFunction(
  {
    id: "nps-action-flow",
    name: "NPS Action Flow",
    retries: 2,
    triggers: [{ event: "hellogrowth/nps.action.trigger" }],
    concurrency: [{ limit: 10, key: "event.data.tenantId" }],
  },
  async ({ event, step }) => {
    const { tenantId, contactName, contactPhone, npsScore, npsComment, flowType, npsResponseId } = event.data;

    // Step 1: Verificar WhatsApp conectado
    const connection = await step.run("check-whatsapp", async () => {
      const conn = await getWhatsAppConnection(tenantId);
      if (!conn) throw new Error(`WhatsApp não conectado para tenant ${tenantId}`);
      return conn;
    });

    // Step 2: Verificar se já existe conversa ativa com esse contato
    const existingConv = await step.run("check-existing-conversation", async () => {
      const { data } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("contact_phone", contactPhone)
        .in("status", ["pending", "active", "waiting_reply", "draft"])
        .single();
      return data;
    });

    if (existingConv) {
      return { status: "skipped", reason: "Conversa ativa já existe com esse contato" };
    }

    // Step 3: Criar conversa no banco
    const conversationId = await step.run("create-conversation", async () => {
      return await createConversation({
        tenantId,
        flowType,
        contactName,
        contactPhone,
        npsScore,
        triggerData: { npsComment, npsResponseId },
        sourceId: npsResponseId,
        sourceType: "nps_response",
      });
    });

    // Step 4: Gerar primeira mensagem via IA
    const aiMessage = await step.run("generate-first-message", async () => {
      const ctx = await buildConversationContext({
        tenantId,
        flowType,
        contactName,
        contactPhone,
        npsScore,
        npsComment,
        isFirstMessage: true,
      });
      return await generateMessage(ctx);
    });

    // Step 5: Decidir se é Copiloto ou Autopiloto
    const isCopilot = connection.copilot_mode !== false; // Default: copiloto

    if (isCopilot) {
      // Modo Copiloto: salvar como draft para aprovação humana
      await step.run("save-draft", async () => {
        await saveMessage({
          conversationId,
          direction: "outbound",
          content: aiMessage.content,
          status: "draft",
          aiReasoning: aiMessage.reasoning,
        });
        await supabase
          .from("ai_conversations")
          .update({ status: "draft" })
          .eq("id", conversationId);
      });

      return {
        status: "draft_created",
        conversationId,
        flowType,
        message: "Mensagem gerada e aguardando aprovação na Fila de Ações",
      };
    } else {
      // Modo Autopiloto: enviar direto
      const waMessageId = await step.run("send-message", async () => {
        const msgId = await sendTextMessage({
          phoneNumberId: connection.phone_number_id,
          accessToken: connection.business_token,
          to: contactPhone,
          text: aiMessage.content,
        });

        await saveMessage({
          conversationId,
          direction: "outbound",
          content: aiMessage.content,
          status: "sent",
          waMessageId: msgId,
          approvedBy: "autopilot",
          aiReasoning: aiMessage.reasoning,
        });

        await supabase
          .from("ai_conversations")
          .update({ status: "waiting_reply", last_message_at: new Date().toISOString() })
          .eq("id", conversationId);

        return msgId;
      });

      // Step 6: Aguardar resposta (timeout 72h)
      const reply = await step.waitForEvent("wait-for-reply", {
        event: "hellogrowth/whatsapp.message.inbound",
        match: "data.conversationId",
        timeout: "72h",
      });

      if (!reply) {
        // Timeout: marcar como expirado
        await step.run("handle-timeout", async () => {
          await supabase
            .from("ai_conversations")
            .update({ status: "expired" })
            .eq("id", conversationId);
        });
        return { status: "expired", conversationId };
      }

      // Step 7: Processar resposta e continuar conversa
      return await step.run("process-reply", async () => {
        // Salvar mensagem inbound
        await saveMessage({
          conversationId,
          direction: "inbound",
          content: reply.data.messageContent,
          status: "delivered",
          waMessageId: reply.data.waMessageId,
        });

        // Gerar resposta da IA
        const history = await getConversationHistory(conversationId);
        const ctx = await buildConversationContext({
          tenantId,
          flowType,
          contactName,
          contactPhone,
          npsScore,
          npsComment,
          conversationHistory: history,
          isFirstMessage: false,
        });
        const nextMessage = await generateMessage(ctx);

        if (nextMessage.suggestedNextAction === "escalate_human") {
          await supabase
            .from("ai_conversations")
            .update({ status: "escalated" })
            .eq("id", conversationId);
          return { status: "escalated", conversationId, reason: nextMessage.reasoning };
        }

        if (nextMessage.suggestedNextAction === "close_conversation") {
          await saveMessage({
            conversationId,
            direction: "outbound",
            content: nextMessage.content,
            status: "sent",
            approvedBy: "autopilot",
            aiReasoning: nextMessage.reasoning,
          });
          await sendTextMessage({
            phoneNumberId: connection.phone_number_id,
            accessToken: connection.business_token,
            to: contactPhone,
            text: nextMessage.content,
          });
          await supabase
            .from("ai_conversations")
            .update({ status: "completed", last_message_at: new Date().toISOString() })
            .eq("id", conversationId);
          return { status: "completed", conversationId };
        }

        // Continuar conversa: salvar como draft (volta para copiloto) ou enviar
        if (isCopilot) {
          await saveMessage({
            conversationId,
            direction: "outbound",
            content: nextMessage.content,
            status: "draft",
            aiReasoning: nextMessage.reasoning,
          });
          await supabase
            .from("ai_conversations")
            .update({ status: "draft" })
            .eq("id", conversationId);
        }

        return { status: "reply_processed", conversationId };
      });
    }
  }
);

// ============================================================
// WORKFLOW 2: FLUXO PRÉ-VENDA (acionado manualmente)
// ============================================================

export const preSaleActionFlow = inngest.createFunction(
  {
    id: "presale-action-flow",
    name: "Pre-Sale Action Flow",
    retries: 2,
    triggers: [{ event: "hellogrowth/presale.action.trigger" }],
    concurrency: [{ limit: 10, key: "event.data.tenantId" }],
  },
  async ({ event, step }) => {
    const { tenantId, leadId, contactName, contactPhone, interestedServices, formResponses } = event.data;

    // Step 1: Verificar WhatsApp conectado
    const connection = await step.run("check-whatsapp", async () => {
      const conn = await getWhatsAppConnection(tenantId);
      if (!conn) throw new Error(`WhatsApp não conectado para tenant ${tenantId}`);
      return conn;
    });

    // Step 2: Verificar conversa existente
    const existingConv = await step.run("check-existing", async () => {
      const { data } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("contact_phone", contactPhone)
        .in("status", ["pending", "active", "waiting_reply", "draft"])
        .single();
      return data;
    });

    if (existingConv) {
      return { status: "skipped", reason: "Conversa ativa já existe" };
    }

    // Step 3: Criar conversa
    const conversationId = await step.run("create-conversation", async () => {
      return await createConversation({
        tenantId,
        flowType: "pre_sale",
        contactName,
        contactPhone,
        triggerData: { interestedServices, formResponses, leadId },
        sourceId: leadId,
        sourceType: "lead",
      });
    });

    // Step 4: Gerar primeira mensagem
    const aiMessage = await step.run("generate-message", async () => {
      const ctx = await buildConversationContext({
        tenantId,
        flowType: "pre_sale",
        contactName,
        contactPhone,
        interestedServices,
        formResponses,
        isFirstMessage: true,
      });
      return await generateMessage(ctx);
    });

    // Step 5: Pré-venda SEMPRE começa em modo Copiloto
    await step.run("save-draft", async () => {
      await saveMessage({
        conversationId,
        direction: "outbound",
        content: aiMessage.content,
        status: "draft",
        aiReasoning: aiMessage.reasoning,
      });
      await supabase
        .from("ai_conversations")
        .update({ status: "draft" })
        .eq("id", conversationId);
    });

    return {
      status: "draft_created",
      conversationId,
      flowType: "pre_sale",
      message: "Mensagem de pré-venda gerada e aguardando aprovação",
    };
  }
);

// ============================================================
// WORKFLOW 3: PROCESSAR RESPOSTA INBOUND (continuação de conversa)
// ============================================================

export const processInboundReply = inngest.createFunction(
  {
    id: "process-inbound-reply",
    name: "Process Inbound WhatsApp Reply",
    retries: 2,
    triggers: [{ event: "hellogrowth/whatsapp.reply.process" }],
    concurrency: [{ limit: 20, key: "event.data.tenantId" }],
  },
  async ({ event, step }) => {
    const { tenantId, conversationId, messageContent, waMessageId } = event.data;

    // GUARD PRIMEIRO: Verificar module_type ANTES de qualquer processamento
    const moduleCheck = await step.run("check-module-type", async () => {
      const { data } = await supabase
        .from("ai_conversations")
        .select("module_type")
        .eq("id", conversationId)
        .single();
      return data?.module_type;
    });

    if (moduleCheck === "simplified") {
      console.log(`[Inngest] Conversa ${conversationId} é do módulo simplificado, IGNORANDO completamente`);
      return { status: "skipped", reason: "Módulo simplificado não usa IA" };
    }

    // Step 1: Salvar mensagem inbound (apenas para módulo completo)
    await step.run("save-inbound", async () => {
      await saveMessage({
        conversationId,
        direction: "inbound",
        content: messageContent,
        status: "delivered",
        waMessageId,
      });
      await supabase
        .from("ai_conversations")
        .update({ status: "active", last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    });

    // Step 2: Buscar dados da conversa
    const convData = await step.run("fetch-conversation", async () => {
      const { data } = await supabase
        .from("ai_conversations")
        .select("flow_type, contact_name, contact_phone, nps_score, trigger_data, tenant_id, module_type")
        .eq("id", conversationId)
        .single();
      return data;
    });

    if (!convData) {
      return { status: "error", reason: "Conversa não encontrada" };
    }

    // Step 3: Buscar histórico
    const history = await step.run("fetch-history", async () => {
      return await getConversationHistory(conversationId);
    });

    // Step 4: Gerar resposta da IA
    const aiMessage = await step.run("generate-reply", async () => {
      const triggerData = convData.trigger_data as Record<string, unknown> | null;
      const ctx = await buildConversationContext({
        tenantId,
        flowType: convData.flow_type as FlowType,
        contactName: convData.contact_name,
        contactPhone: convData.contact_phone,
        npsScore: convData.nps_score || undefined,
        npsComment: (triggerData?.npsComment as string) || undefined,
        interestedServices: (triggerData?.interestedServices as string[]) || undefined,
        formResponses: (triggerData?.formResponses as Record<string, string>) || undefined,
        conversationHistory: history,
        isFirstMessage: false,
      });
      return await generateMessage(ctx);
    });

    // Step 5: Verificar conexão WhatsApp
    const connection = await step.run("check-whatsapp", async () => {
      return await getWhatsAppConnection(tenantId);
    });

    if (!connection) {
      return { status: "error", reason: "WhatsApp desconectado" };
    }

    const isCopilot = connection.copilot_mode !== false;

    // Step 6: Escalar se necessário
    if (aiMessage.suggestedNextAction === "escalate_human") {
      await step.run("escalate", async () => {
        await saveMessage({
          conversationId,
          direction: "outbound",
          content: aiMessage.content,
          status: "draft",
          aiReasoning: `[ESCALADO] ${aiMessage.reasoning}`,
        });
        await supabase
          .from("ai_conversations")
          .update({ status: "escalated" })
          .eq("id", conversationId);
      });
      return { status: "escalated", conversationId };
    }

    // Step 7: Salvar como draft (copiloto) ou enviar (autopiloto)
    if (isCopilot) {
      await step.run("save-draft", async () => {
        await saveMessage({
          conversationId,
          direction: "outbound",
          content: aiMessage.content,
          status: "draft",
          aiReasoning: aiMessage.reasoning,
        });
        await supabase
          .from("ai_conversations")
          .update({ status: "draft" })
          .eq("id", conversationId);
      });
      return { status: "draft_created", conversationId };
    } else {
      await step.run("send-auto", async () => {
        const msgId = await sendTextMessage({
          phoneNumberId: connection.phone_number_id,
          accessToken: connection.business_token,
          to: convData.contact_phone,
          text: aiMessage.content,
        });
        await saveMessage({
          conversationId,
          direction: "outbound",
          content: aiMessage.content,
          status: "sent",
          waMessageId: msgId,
          approvedBy: "autopilot",
          aiReasoning: aiMessage.reasoning,
        });

        const newStatus = aiMessage.suggestedNextAction === "close_conversation" ? "completed" : "waiting_reply";
        await supabase
          .from("ai_conversations")
          .update({ status: newStatus, last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      });
      return { status: "reply_sent", conversationId };
    }
  }
);

// ============================================================
// WORKFLOW 4: AUTO-TRIGGER PRÉ-VENDA (48h sem ação manual)
// ============================================================

export const preSaleAutoTrigger = inngest.createFunction(
  {
    id: "presale-auto-trigger",
    name: "Pre-Sale Auto Trigger (48h delay)",
    triggers: [{ event: "hellogrowth/presale.auto.scheduled" }],
    retries: 1,
  },
  async ({ event, step }) => {
    const { tenantId, leadId, contactName, contactPhone, interestedServices, formResponses } = event.data;

    // Aguardar 48h
    await step.sleep("wait-48h", "48h");

    // Verificar se a clínica já acionou manualmente
    const alreadyTriggered = await step.run("check-if-triggered", async () => {
      const { data } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("contact_phone", contactPhone)
        .eq("flow_type", "pre_sale")
        .single();
      return !!data;
    });

    if (alreadyTriggered) {
      return { status: "skipped", reason: "Clínica já acionou manualmente" };
    }

    // Disparar o fluxo de pré-venda
    await step.sendEvent("trigger-presale", {
      name: "hellogrowth/presale.action.trigger",
      data: { tenantId, leadId, contactName, contactPhone, interestedServices, formResponses },
    });

    return { status: "auto_triggered", leadId };
  }
);
