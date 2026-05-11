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
  const search = req.nextUrl.searchParams.get("search") || "";
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") || "20");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
  }

  try {
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("ai_conversations")
      .select(`
        id,
        flow_type,
        module_type,
        contact_name,
        contact_phone,
        status,
        nps_score,
        trigger_data,
        created_at,
        last_message_at,
        flow_step,
        flow_step_status,
        appointment_datetime,
        dispatch_campaign_id,
        ai_conversation_messages(
          id,
          direction,
          content,
          status,
          sent_at
        )
      `, { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (filter === "pending") {
      query = query.in("status", ["pending", "draft"]);
    } else if (filter === "active") {
      query = query.in("status", ["active", "waiting_reply"]);
    } else if (filter === "completed") {
      query = query.in("status", ["completed", "dismissed"]);
    } else {
      query = query.not("status", "eq", "dismissed");
    }

    if (typeFilter !== "all") {
      query = query.eq("flow_type", typeFilter);
    }

    if (search) {
      query = query.or(`contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%`);
    }

    const { data: conversations, error, count } = await query;

    if (error) {
      console.error("[ActionInbox] Error:", error);
      return NextResponse.json({ error: "Erro ao buscar ações" }, { status: 500 });
    }

    const actions = (conversations || []).map((conv) => {
      const messages = conv.ai_conversation_messages || [];

      const lastOutboundDraft = messages
        .filter((m: { direction: string; status: string }) => m.direction === "outbound" && m.status === "draft")
        .sort((a: { sent_at: string }, b: { sent_at: string }) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

      const triggerData = conv.trigger_data as Record<string, unknown> | null;

      let triggerSummary = "";
      if (conv.flow_type === "detractor") {
        triggerSummary = `Deu nota ${conv.nps_score} no NPS.${triggerData?.main_complaint ? ` Reclamação: "${triggerData.main_complaint}"` : " Precisa de atenção urgente."}`;
      } else if (conv.flow_type === "promoter") {
        triggerSummary = `Deu nota ${conv.nps_score} no NPS. Momento ideal para pedir indicação.`;
      } else if (conv.flow_type === "passive") {
        triggerSummary = `Deu nota ${conv.nps_score} no NPS. Oportunidade de entender o que melhorar.`;
      } else if (conv.flow_type === "pre_sale") {
        const services = triggerData?.interested_services as string[] | undefined;
        triggerSummary = `Preencheu formulário de pré-venda.${services?.length ? ` Interesse em: ${services.join(", ")}.` : ""}`;
      }

      let priority: "high" | "medium" | "low" = "medium";
      if (conv.flow_type === "detractor") {
        priority = "high";
      } else if (conv.flow_type === "pre_sale") {
        priority = "high";
      } else if (conv.flow_type === "promoter") {
        priority = "medium";
      } else {
        priority = "low";
      }

      const sentMessages = messages.filter((m: { direction: string; status: string }) =>
        m.direction === "outbound" && m.status !== "draft"
      );

      return {
        id: conv.id,
        type: conv.flow_type as "detractor" | "promoter" | "passive" | "pre_sale",
        flow_type: conv.flow_type,
        priority,
        contact_name: conv.contact_name,
        contact_phone: conv.contact_phone,
        trigger_summary: triggerSummary,
        ai_recommendation: lastOutboundDraft?.content || "",
        status: conv.status,
        created_at: conv.created_at,
        last_message_at: conv.last_message_at,
        conversation_id: conv.id,
        nps_score: conv.nps_score,
        lead_services: (triggerData?.interested_services as string[]) || [],
        message_count: sentMessages.length,
        module_type: (conv as any).module_type || null,
        flow_step: (conv as any).flow_step || null,
        flow_step_status: (conv as any).flow_step_status || null,
        appointment_datetime: (conv as any).appointment_datetime || null,
        dispatch_campaign_id: (conv as any).dispatch_campaign_id || null,
      };
    });

    // Stats globais
    const { data: allConvs } = await supabase
      .from("ai_conversations")
      .select("status, flow_type")
      .eq("tenant_id", tenantId)
      .not("status", "eq", "dismissed");

    const all = allConvs || [];
    const pending = all.filter((c) => ["pending", "draft"].includes(c.status)).length;
    const active = all.filter((c) => ["active", "waiting_reply"].includes(c.status)).length;
    const completed = all.filter((c) => c.status === "completed").length;
    const total = all.length;

    const byType = {
      detractor: all.filter((c) => c.flow_type === "detractor").length,
      promoter: all.filter((c) => c.flow_type === "promoter").length,
      passive: all.filter((c) => c.flow_type === "passive").length,
      pre_sale: all.filter((c) => c.flow_type === "pre_sale").length,
    };

    const withReply = all.filter((c) => ["active", "waiting_reply", "completed"].includes(c.status)).length;
    const responseRate = total > 0 ? Math.round((withReply / total) * 100) : 0;

    return NextResponse.json({
      actions,
      total: count || 0,
      stats: {
        pending,
        active,
        completed,
        total,
        by_type: byType,
        response_rate: responseRate,
        avg_messages: 0,
      },
    });
  } catch (error) {
    console.error("[ActionInbox] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
