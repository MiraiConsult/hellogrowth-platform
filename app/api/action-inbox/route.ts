import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const filter = req.nextUrl.searchParams.get("filter") || "all";
  const typeFilter = req.nextUrl.searchParams.get("type") || "all";

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
  }

  try {
    // Buscar conversas com informações do contato
    let query = supabase
      .from("ai_conversations")
      .select(`
        id,
        flow_type,
        contact_name,
        contact_phone,
        status,
        nps_score,
        trigger_data,
        created_at,
        last_message_at,
        ai_conversation_messages(
          id,
          direction,
          content,
          status,
          sent_at
        )
      `)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(100);

    // Filtros de status
    if (filter === "pending") {
      query = query.in("status", ["pending", "draft"]);
    } else if (filter === "active") {
      query = query.in("status", ["active", "waiting_reply"]);
    } else if (filter === "completed") {
      query = query.in("status", ["completed", "dismissed"]);
    } else {
      query = query.not("status", "eq", "dismissed");
    }

    // Filtro de tipo
    if (typeFilter !== "all") {
      query = query.eq("flow_type", typeFilter);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error("[ActionInbox] Error:", error);
      return NextResponse.json({ error: "Erro ao buscar ações" }, { status: 500 });
    }

    // Transformar em ActionItems
    const actions = (conversations || []).map((conv) => {
      const lastOutboundDraft = conv.ai_conversation_messages
        ?.filter((m: { direction: string; status: string }) => m.direction === "outbound" && m.status === "draft")
        .sort((a: { sent_at: string }, b: { sent_at: string }) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

      const triggerData = conv.trigger_data as Record<string, unknown> | null;

      // Gerar resumo do gatilho
      let triggerSummary = "";
      if (conv.flow_type === "detractor") {
        triggerSummary = `Deu nota ${conv.nps_score} no NPS. ${triggerData?.main_complaint ? `Principal reclamação: "${triggerData.main_complaint}"` : "Precisa de atenção urgente."}`;
      } else if (conv.flow_type === "promoter") {
        triggerSummary = `Deu nota ${conv.nps_score} no NPS. Momento ideal para pedir indicação.`;
      } else if (conv.flow_type === "passive") {
        triggerSummary = `Deu nota ${conv.nps_score} no NPS. Oportunidade de entender o que melhorar.`;
      } else if (conv.flow_type === "pre_sale") {
        const services = triggerData?.interested_services as string[] | undefined;
        triggerSummary = `Preencheu formulário de pré-venda.${services?.length ? ` Interesse em: ${services.join(", ")}.` : ""}`;
      }

      // Determinar prioridade
      let priority: "high" | "medium" | "low" = "medium";
      if (conv.flow_type === "detractor" && conv.nps_score !== null && conv.nps_score <= 3) {
        priority = "high";
      } else if (conv.flow_type === "pre_sale") {
        priority = "high";
      } else if (conv.flow_type === "promoter") {
        priority = "medium";
      } else {
        priority = "low";
      }

      return {
        id: conv.id,
        type: conv.flow_type as "detractor" | "promoter" | "passive" | "pre_sale",
        priority,
        contact_name: conv.contact_name,
        contact_phone: conv.contact_phone,
        trigger_summary: triggerSummary,
        ai_recommendation: lastOutboundDraft?.content || "",
        status: conv.status,
        created_at: conv.created_at,
        conversation_id: conv.id,
        nps_score: conv.nps_score,
        lead_services: (triggerData?.interested_services as string[]) || [],
      };
    });

    // Calcular stats
    const allConvs = await supabase
      .from("ai_conversations")
      .select("status", { count: "exact" })
      .eq("tenant_id", tenantId)
      .not("status", "eq", "dismissed");

    const pending = (conversations || []).filter((c) => ["pending", "draft"].includes(c.status)).length;
    const active = (conversations || []).filter((c) => ["active", "waiting_reply"].includes(c.status)).length;
    const completed = (conversations || []).filter((c) => c.status === "completed").length;

    return NextResponse.json({
      actions,
      stats: {
        pending,
        active,
        completed,
        total: (allConvs.count || 0),
      },
    });
  } catch (error) {
    console.error("[ActionInbox] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
