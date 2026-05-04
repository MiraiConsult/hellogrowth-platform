/**
 * Trigger Direto: Cria ação na fila com mensagem gerada por IA
 * 
 * Fluxo:
 * 1. Recebe dados do lead/NPS (tenant, nome, telefone, tipo, etc.)
 * 2. Gera mensagem personalizada com Gemini via ai-message-engine
 * 3. Insere ai_conversation + ai_conversation_message com status "draft"
 * 4. A ação aparece na Fila de Ações para aprovação
 * 
 * Não depende do Inngest — funciona diretamente.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateMessage, buildConversationContext } from "@/lib/ai-message-engine";
import type { FlowType } from "@/lib/ai-message-engine";

export const maxDuration = 30;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      contactName,
      contactPhone,
      flowType = "pre_sale",
      npsScore,
      npsComment,
      formResponses,
      interestedServices,
      leadId,
      triggeredBy = "auto",
    } = body;

    // Validação
    if (!tenantId || !contactPhone) {
      return NextResponse.json(
        { error: "tenantId e contactPhone são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verificar se o tenant tem WhatsApp conectado
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .in("status", ["connected", "active"])
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: "WhatsApp não conectado para este tenant" },
        { status: 400 }
      );
    }

    // Verificar se já existe conversa ativa com esse contato
    const { data: existingConv } = await supabase
      .from("ai_conversations")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("contact_phone", contactPhone)
      .in("status", ["pending", "active", "waiting_reply", "draft"])
      .single();

    if (existingConv) {
      return NextResponse.json(
        { 
          status: "skipped", 
          reason: "Já existe conversa ativa com este contato",
          conversationId: existingConv.id 
        },
        { status: 409 }
      );
    }

    // Gerar mensagem com IA
    let aiMessage;
    try {
      const ctx = await buildConversationContext({
        tenantId,
        flowType: flowType as FlowType,
        contactName: contactName || "Cliente",
        contactPhone,
        npsScore,
        npsComment,
        formResponses,
        interestedServices,
        isFirstMessage: true,
      });

      aiMessage = await generateMessage(ctx);
    } catch (aiError: any) {
      console.error("[Create Action] Erro ao gerar mensagem IA:", aiError.message);
      // Fallback: mensagem genérica
      aiMessage = {
        content: `Olá ${contactName || ""}! Tudo bem? Vi que você demonstrou interesse em nossos serviços. Posso te ajudar com mais informações?`,
        reasoning: "Mensagem fallback (erro na geração IA)",
        suggestedNextAction: "wait_reply",
        sentiment: "positive",
      };
    }

    // Inserir conversa no banco
    const { data: conversation, error: convError } = await supabase
      .from("ai_conversations")
      .insert({
        tenant_id: tenantId,
        flow_type: flowType,
        contact_name: contactName || "Cliente",
        contact_phone: contactPhone,
        status: "draft",
        nps_score: npsScore || null,
        trigger_data: {
          leadId,
          formResponses,
          interestedServices,
          npsComment,
        },
        mode: "approval_required",
        triggered_by: triggeredBy,
      })
      .select("id")
      .single();

    if (convError || !conversation) {
      console.error("[Create Action] Erro ao criar conversa:", convError);
      return NextResponse.json(
        { error: "Erro ao criar conversa", details: convError?.message },
        { status: 500 }
      );
    }

    // Inserir mensagem draft (aguardando aprovação)
    const { error: msgError } = await supabase
      .from("ai_conversation_messages")
      .insert({
        conversation_id: conversation.id,
        direction: "outbound",
        content: aiMessage.content,
        status: "draft",
        ai_reasoning: aiMessage.reasoning,
        sent_at: new Date().toISOString(),
      });

    if (msgError) {
      console.error("[Create Action] Erro ao criar mensagem:", msgError);
    }

    // Atualizar lead com flag se leadId fornecido
    if (leadId) {
      await supabase
        .from("leads")
        .update({ ai_action_status: "pending_approval" })
        .eq("id", leadId);
    }

    console.log(
      `[Create Action] Ação criada: ${contactName} (${contactPhone}) - flow: ${flowType} - tenant: ${tenantId}`
    );

    return NextResponse.json({
      status: "created",
      conversationId: conversation.id,
      message: aiMessage.content,
      reasoning: aiMessage.reasoning,
    });
  } catch (error: any) {
    console.error("[Create Action] Erro:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
