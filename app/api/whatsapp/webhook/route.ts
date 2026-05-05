import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhookSignature, sendTextMessage } from "@/lib/whatsapp-client";
import { detectIntent, isOptOut } from "@/lib/intent-detector";
import { generateMessage, type ConversationContext } from "@/lib/ai-message-engine";
import { inngest } from "@/lib/inngest-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Verificação do webhook pela Meta (challenge)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WhatsApp Webhook] Verification successful");
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST: Recebimento de mensagens e status updates
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const signingSecret = process.env.WHATSAPP_WEBHOOK_SIGNING_SECRET ?? "";

    if (signingSecret && !verifyWebhookSignature(rawBody, signature, signingSecret)) {
      console.error("[WhatsApp Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;

        for (const message of value.messages ?? []) {
          await handleIncomingMessage(
            value.metadata?.phone_number_id,
            message,
            value.contacts?.[0]
          );
        }

        for (const status of value.statuses ?? []) {
          await handleStatusUpdate(status);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleIncomingMessage(
  phoneNumberId: string,
  message: {
    id: string;
    from: string;
    type: string;
    text?: { body: string };
    timestamp: string;
  },
  contact?: { profile?: { name?: string } }
) {
  if (!phoneNumberId || !message.id) return;

  const content = message.type === "text" ? message.text?.body ?? "" : `[${message.type}]`;

  // --------------------------------------------------------
  // Detecção de opt-out ANTES de buscar conversa (LGPD)
  // --------------------------------------------------------
  if (message.type === "text" && isOptOut(content)) {
    console.log(`[WhatsApp Webhook] Opt-out detectado de ${message.from}`);

    // Registrar opt-out na tabela de contatos bloqueados
    await supabase.from("whatsapp_optouts").upsert({
      phone: message.from,
      opted_out_at: new Date().toISOString(),
      reason: content.substring(0, 100),
    }, { onConflict: "phone" });

    // Marcar todas as conversas ativas como canceladas
    await supabase
      .from("ai_conversations")
      .update({ status: "dismissed" })
      .eq("contact_phone", message.from)
      .in("status", ["active", "waiting_reply", "draft", "pending"]);

    console.log(`[WhatsApp Webhook] Opt-out processado para ${message.from}`);
    return;
  }

  // --------------------------------------------------------
  // Encontrar a conversa ativa para este número
  // --------------------------------------------------------
  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("id, tenant_id, status, flow_type, contact_name, contact_phone, module_type, flow_step, flow_step_status, dispatch_campaign_id, appointment_datetime")
    .eq("contact_phone", message.from)
    .in("status", ["active", "waiting_reply", "draft", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!conversation) {
    console.log(`[WhatsApp Webhook] No active conversation for ${message.from}`);
    return;
  }

  // --------------------------------------------------------
  // Detectar intent da mensagem
  // --------------------------------------------------------
  const intentResult = message.type === "text" ? detectIntent(content) : { intent: "continue" as const, confidence: "low" as const, reason: "Non-text message" };

  console.log(`[WhatsApp Webhook] Intent: ${intentResult.intent} (${intentResult.confidence}) — "${content.substring(0, 50)}"`);

  // --------------------------------------------------------
  // Salvar mensagem recebida no banco
  // --------------------------------------------------------
  await supabase.from("ai_conversation_messages").insert({
    conversation_id: conversation.id,
    direction: "inbound",
    content,
    status: "received",
    wa_message_id: message.id,
    sent_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    ai_reasoning: `Intent: ${intentResult.intent} (${intentResult.confidence})`,
  });

  // --------------------------------------------------------
  // Processar com base no intent
  // --------------------------------------------------------
  if (intentResult.intent === "escalate_human" && intentResult.confidence !== "low") {
    // Escalar diretamente para humano sem passar pela IA
    await supabase
      .from("ai_conversations")
      .update({
        status: "escalated",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);

    console.log(`[WhatsApp Webhook] Conversa ${conversation.id} escalada para humano automaticamente`);
    // Disparar notificação de escalada para o responsável
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      fetch(`${appUrl}/api/escalation-notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: conversation.tenant_id,
          conversationId: conversation.id,
          contactName: (conversation as any).contact_name || contact?.profile?.name || "Contato",
          contactPhone: message.from,
          flowType: conversation.flow_type,
          lastMessage: content,
          reason: intentResult.reason || "Solicitação do cliente",
        }),
      }).catch((e) => console.error("[Escalation notify]", e));
    } catch (_) {}
    return;
  }

  // --------------------------------------------------------
  // Módulo Simplificado: processar fluxo estruturado ANTES de qualquer IA
  // --------------------------------------------------------
  if ((conversation as any).module_type === "simplified") {
    // Apenas atualizar last_message_at, sem mudar status
    await supabase
      .from("ai_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    await processSimplifiedFlow({
      conversation: conversation as any,
      messageContent: content,
      contactPhone: message.from,
    });
    return;
  }

  // Atualizar status da conversa (apenas para módulo completo/IA)
  await supabase
    .from("ai_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      status: "active",
    })
    .eq("id", conversation.id);

  // --------------------------------------------------------
  // Processar resposta: via Inngest (se configurado) ou direto
  // --------------------------------------------------------
  if (process.env.INNGEST_EVENT_KEY) {
    try {
      await inngest.send({
        name: "hellogrowth/whatsapp.reply.process",
        data: {
          conversationId: conversation.id,
          tenantId: conversation.tenant_id,
          messageContent: content,
          waMessageId: message.id,
          contactPhone: message.from,
          contactName: contact?.profile?.name,
          detectedIntent: intentResult.intent,
          intentConfidence: intentResult.confidence,
        },
      });
      return;
    } catch (e) {
      console.error("[WhatsApp Webhook] Inngest send failed, falling back to direct:", e);
    }
  }

  // Fallback: processar diretamente sem Inngest
  await processReplyDirect({
    conversationId: conversation.id,
    tenantId: conversation.tenant_id,
    messageContent: content,
    contactPhone: message.from,
    contactName: contact?.profile?.name || "",
    flowType: conversation.flow_type,
  });
}

// ============================================================
// Processamento do fluxo simplificado
// ============================================================
async function processSimplifiedFlow(params: {
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
  contactPhone: string;
}) {
  const { conversation, messageContent } = params;
  const msg = messageContent.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Buscar configuração do fluxo
  const { data: flowConfig } = await supabase
    .from("dispatch_flow_configs")
    .select("*")
    .eq("contact_phone", conversation.contact_phone)
    .eq("tenant_id", conversation.tenant_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const config = (flowConfig?.flow_config as any) || {};
  const currentStep = conversation.flow_step;

  let nextStep: string | null = null;
  let replyMessage: string | null = null;
  let newStatus = "active";

  if (currentStep === "confirmation") {
    // Cliente respondeu à confirmação de consulta
    // Reconhece variações de SIM: sim, s, confirmo, confirmado, ok, certo, claro, com certeza, pode ser, pode, tá, ta, 1
    const confirmed = /^(SIM|S|OK|1)$/.test(msg) ||
      msg.includes("SIM") || msg.includes("CONFIRMO") || msg.includes("CONFIRMADO") ||
      msg.includes("CERTO") || msg.includes("CLARO") || msg.includes("CERTEZA") ||
      msg.includes("PODE") || msg.startsWith("TA ") || msg === "TA" || msg === "TO" ||
      msg.includes("COMBINADO") || msg.includes("ESTAREI") || msg.includes("PRESENTE");
    // Reconhece variações de NÃO: não, nao, n, cancela, cancelar, cancelo, impossivel, nao posso
    const denied = /^(NAO|N|0)$/.test(msg) ||
      msg.includes("NAO") || msg.includes("CANCELAR") || msg.includes("CANCELO") ||
      msg.includes("CANCELA") || msg.includes("IMPOSSIVEL") || msg.includes("NAO POSSO") ||
      msg.includes("DESMARCAR") || msg.includes("DESMARCO") || msg.includes("REMARCAR");

    if (confirmed) {
      if (config.step2_anamnese) {
        nextStep = "presale";
        // Buscar link do formulário de pré-venda
        const formId = config.form_id || null;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hellogrowth.online";
        const formLink = formId ? `${baseUrl}/form/${formId}` : null;
        replyMessage = formLink
          ? `Ótimo, ${conversation.contact_name.split(" ")[0]}! Consulta confirmada! 😊 Para nos preparar melhor para o seu atendimento, pedimos que preencha este formulário rápido: ${formLink}`
          : `Ótimo, ${conversation.contact_name.split(" ")[0]}! Consulta confirmada! 😊 Aguardamos você!`;
      } else if (config.step4_postsale) {
        nextStep = "postsale_pending";
        replyMessage = `Ótimo, ${conversation.contact_name.split(" ")[0]}! Consulta confirmada! 😊 Aguardamos você!`;
      } else {
        nextStep = "done";
        newStatus = "completed";
        replyMessage = `Ótimo, ${conversation.contact_name.split(" ")[0]}! Consulta confirmada! 😊 Aguardamos você!`;
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
    // Cliente está na etapa de pré-venda
    // Apenas registrar a mensagem — NÃO avançar automaticamente
    // O avanço para postsale_pending só ocorre quando o usuário clica em "Consulta realizada"
    // Não fazer nada aqui — a mensagem já foi salva acima
    console.log(`[SimplifiedFlow] Etapa presale: mensagem recebida do cliente, aguardando ação do usuário`);
  } else if (currentStep === "postsale_pending") {
    // Etapa aguardando o usuário confirmar a consulta — ignorar mensagens do cliente
    console.log(`[SimplifiedFlow] Etapa postsale_pending: mensagem ignorada, aguardando ação do usuário`);
  } else if (currentStep === "postsale_sent") {
    // NPS já enviado — registrar resposta mas não fazer mais nada automaticamente
    console.log(`[SimplifiedFlow] Etapa postsale_sent: mensagem recebida após NPS`);
  }

  // Atualizar o flow_step na conversa
  if (nextStep) {
    await supabase
      .from("ai_conversations")
      .update({
        flow_step: nextStep,
        flow_step_status: nextStep === "postsale_pending" ? "waiting_user" : "waiting_client",
        flow_step_updated_at: new Date().toISOString(),
        status: newStatus,
      })
      .eq("id", conversation.id);

    // Atualizar dispatch_flow_configs
    if (flowConfig?.id) {
      await supabase
        .from("dispatch_flow_configs")
        .update({ current_step: nextStep, status: newStatus === "completed" ? "completed" : "active" })
        .eq("id", flowConfig.id);
    }
  }

  // Enviar resposta automática se houver
  if (replyMessage) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    const accessToken = process.env.WHATSAPP_API_KEY || process.env.WHATSAPP_BUSINESS_TOKEN || "";

    const waMessageId = await sendTextMessage({
      phoneNumberId,
      accessToken,
      to: conversation.contact_phone,
      text: replyMessage,
    });

    await supabase.from("ai_conversation_messages").insert({
      conversation_id: conversation.id,
      direction: "outbound",
      content: replyMessage,
      status: "sent",
      wa_message_id: waMessageId,
      sent_at: new Date().toISOString(),
      ai_reasoning: `Simplified flow: ${currentStep} → ${nextStep || currentStep}`,
    });
  }
}

// ============================================================
// Processamento direto (fallback sem Inngest)
// ============================================================
async function processReplyDirect(params: {
  conversationId: string;
  tenantId: string;
  messageContent: string;
  contactPhone: string;
  contactName: string;
  flowType: string;
}) {
  try {
    // Buscar histórico da conversa
    const { data: messages } = await supabase
      .from("ai_conversation_messages")
      .select("direction, content, sent_at")
      .eq("conversation_id", params.conversationId)
      .order("sent_at", { ascending: true })
      .limit(10);

    // Buscar dados da empresa
    const { data: company } = await supabase
      .from("companies")
      .select("name, segment")
      .eq("id", params.tenantId)
      .single();

    // Montar histórico no formato esperado
    const conversationHistory = (messages || []).map((m: any) => ({
      role: m.direction === "inbound" ? "user" as const : "assistant" as const,
      content: m.content,
    }));

    // Gerar resposta com IA
    const ctx: ConversationContext = {
      tenantId: params.tenantId,
      flowType: (params.flowType || "nps_detractor") as any,
      contactName: params.contactName,
      contactPhone: params.contactPhone,
      companyName: company?.name || "Clínica",
      companySegment: company?.segment,
      conversationHistory,
      isFirstMessage: conversationHistory.length <= 1,
    };

    const result = await generateMessage(ctx);

    if (!result || !result.content) {
      console.log("[WhatsApp Webhook] AI returned empty response");
      return;
    }

    const aiResponse = result.content;

    // Enviar mensagem via WhatsApp
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    const accessToken = process.env.WHATSAPP_API_KEY || process.env.WHATSAPP_BUSINESS_TOKEN || "";

    const waMessageId = await sendTextMessage({
      phoneNumberId,
      accessToken,
      to: params.contactPhone,
      text: aiResponse,
    });

    // Salvar mensagem enviada no banco
    await supabase.from("ai_conversation_messages").insert({
      conversation_id: params.conversationId,
      direction: "outbound",
      content: aiResponse,
      status: "sent",
      wa_message_id: waMessageId,
      sent_at: new Date().toISOString(),
      ai_reasoning: "Direct processing (no Inngest)",
    });

    console.log(`[WhatsApp Webhook] Direct reply sent to ${params.contactPhone}: ${waMessageId}`);
  } catch (error) {
    console.error("[WhatsApp Webhook] Direct processing error:", error);
  }
}

async function handleStatusUpdate(status: {
  id: string;
  status: string;
  timestamp: string;
  errors?: { code: number; title: string }[];
}) {
  if (!status.id) return;

  const updates: Record<string, string> = {};

  if (status.status === "delivered") {
    updates.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
    updates.status = "delivered";
  } else if (status.status === "read") {
    updates.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
    updates.status = "read";
  } else if (status.status === "failed") {
    updates.status = "failed";
    updates.error_message = status.errors?.[0]?.title ?? "Unknown error";
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from("ai_conversation_messages")
      .update(updates)
      .eq("wa_message_id", status.id);
  }
}
