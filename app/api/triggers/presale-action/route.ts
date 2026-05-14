/**
 * Gatilho Manual: Botão "Iniciar IA Comercial" no Kanban
 * 
 * Chamado quando a clínica clica no botão para iniciar o fluxo de pré-venda
 * para um lead específico. Também agenda o auto-trigger de 48h caso a clínica
 * não acione manualmente.
 */

import { NextRequest, NextResponse } from "next/server";
import { Inngest } from "inngest";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 15;

const inngest = new Inngest({ id: "hellogrowth" });

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, leadId } = body;

    if (!tenantId || !leadId) {
      return NextResponse.json(
        { error: "tenantId e leadId são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verificar se o tenant tem WhatsApp conectado
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "connected")
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: "WhatsApp não conectado. Configure em WhatsApp IA." },
        { status: 400 }
      );
    }

    // Buscar dados do lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, phone, interested_services, form_responses")
      .eq("id", leadId)
      .eq("tenant_id", tenantId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    if (!lead.phone) {
      return NextResponse.json(
        { error: "Lead não tem telefone cadastrado" },
        { status: 400 }
      );
    }

    // Verificar se já existe conversa ativa com esse lead
    const { data: existingConv } = await supabase
      .from("ai_conversations")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("contact_phone", lead.phone)
      .in("status", ["pending", "active", "waiting_reply", "draft"])
      .single();

    if (existingConv) {
      return NextResponse.json(
        { error: "Já existe uma conversa ativa com esse lead", conversationId: existingConv.id },
        { status: 409 }
      );
    }

    // Extrair serviços de interesse e respostas do formulário
    const interestedServices = lead.interested_services || [];
    const formResponses = lead.form_responses || {};

    // Disparar evento Inngest
    await inngest.send({
      name: "hellogrowth/presale.action.trigger",
      data: {
        tenantId,
        leadId: lead.id,
        contactName: lead.name,
        contactPhone: lead.phone,
        interestedServices,
        formResponses,
      },
    });

    // Atualizar lead com flag de IA acionada
    await supabase
      .from("leads")
      .update({ ai_action_status: "triggered" })
      .eq("id", leadId);

    console.log(
      `[PreSale Trigger] Fluxo pré-venda acionado para ${lead.name} (${lead.phone}) - tenant: ${tenantId}`
    );

    return NextResponse.json({
      status: "triggered",
      leadId: lead.id,
      contactName: lead.name,
      message: "IA Comercial acionada. A mensagem aparecerá na Fila de Ações.",
    });
  } catch (error: any) {
    console.error("[PreSale Trigger] Erro:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
