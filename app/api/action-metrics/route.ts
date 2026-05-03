import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getPeriodDates(period: string): { start: Date; prevStart: Date } {
  const now = new Date();
  let daysBack = 30;

  if (period === "7d") daysBack = 7;
  else if (period === "30d") daysBack = 30;
  else if (period === "90d") daysBack = 90;
  else if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { start, prevStart };
  }

  const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const prevStart = new Date(start.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return { start, prevStart };
}

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const period = req.nextUrl.searchParams.get("period") || "30d";

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
  }

  try {
    const { start, prevStart } = getPeriodDates(period);
    const startIso = start.toISOString();
    const prevStartIso = prevStart.toISOString();
    const endIso = new Date().toISOString();

    // --------------------------------------------------------
    // Buscar conversas do período atual
    // --------------------------------------------------------
    const { data: conversations } = await supabase
      .from("ai_conversations")
      .select(`
        id,
        flow_type,
        status,
        created_at,
        last_message_at,
        ai_conversation_messages(
          id,
          direction,
          status,
          sent_at
        )
      `)
      .eq("tenant_id", tenantId)
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    // --------------------------------------------------------
    // Buscar conversas do período anterior (para comparação)
    // --------------------------------------------------------
    const { data: prevConversations } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .gte("created_at", prevStartIso)
      .lt("created_at", startIso);

    const convs = conversations || [];
    const prevCount = (prevConversations || []).length;
    const currentCount = convs.length;

    // --------------------------------------------------------
    // Calcular métricas gerais
    // --------------------------------------------------------
    const totalMessages = convs.reduce((sum, c) => {
      const sent = (c.ai_conversation_messages || []).filter(
        (m: { direction: string; status: string }) => m.direction === "outbound" && m.status !== "draft"
      ).length;
      return sum + sent;
    }, 0);

    const withReply = convs.filter((c) =>
      (c.ai_conversation_messages || []).some(
        (m: { direction: string }) => m.direction === "inbound"
      )
    ).length;

    const completed = convs.filter((c) => c.status === "completed").length;

    const responseRate = currentCount > 0 ? (withReply / currentCount) * 100 : 0;
    const conversionRate = currentCount > 0 ? (completed / currentCount) * 100 : 0;
    const avgMessages = currentCount > 0 ? totalMessages / currentCount : 0;

    // Tempo médio de resposta (horas entre criação e primeira resposta inbound)
    let totalResponseTimeHours = 0;
    let responseTimeCount = 0;
    for (const conv of convs) {
      const firstInbound = (conv.ai_conversation_messages || [])
        .filter((m: { direction: string }) => m.direction === "inbound")
        .sort((a: { sent_at: string }, b: { sent_at: string }) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())[0];

      if (firstInbound) {
        const diffMs = new Date((firstInbound as { sent_at: string }).sent_at).getTime() - new Date(conv.created_at).getTime();
        totalResponseTimeHours += diffMs / (1000 * 60 * 60);
        responseTimeCount++;
      }
    }
    const avgResponseTimeHours = responseTimeCount > 0 ? totalResponseTimeHours / responseTimeCount : 0;

    // --------------------------------------------------------
    // Métricas por fluxo
    // --------------------------------------------------------
    const flowTypes = ["detractor", "promoter", "passive", "pre_sale"];
    const byFlow = flowTypes.map((flowType) => {
      const flowConvs = convs.filter((c) => c.flow_type === flowType);
      const flowCompleted = flowConvs.filter((c) => c.status === "completed").length;
      const flowReplied = flowConvs.filter((c) =>
        (c.ai_conversation_messages || []).some(
          (m: { direction: string }) => m.direction === "inbound"
        )
      ).length;

      return {
        flow_type: flowType,
        count: flowConvs.length,
        completed: flowCompleted,
        replied: flowReplied,
        conversion_rate: flowConvs.length > 0 ? (flowCompleted / flowConvs.length) * 100 : 0,
      };
    }).filter((f) => f.count > 0);

    // --------------------------------------------------------
    // Volume por dia
    // --------------------------------------------------------
    const dayMap: Record<string, { count: number; completed: number }> = {};

    // Preencher todos os dias do período com zero
    const dayCount = Math.ceil((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i <= Math.min(dayCount, 90); i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dayMap[key] = { count: 0, completed: 0 };
    }

    for (const conv of convs) {
      const key = conv.created_at.split("T")[0];
      if (dayMap[key]) {
        dayMap[key].count++;
        if (conv.status === "completed") dayMap[key].completed++;
      }
    }

    const byDay = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // --------------------------------------------------------
    // Comparação com período anterior
    // --------------------------------------------------------
    const changePct = prevCount > 0
      ? Math.round(((currentCount - prevCount) / prevCount) * 100)
      : currentCount > 0 ? 100 : 0;

    return NextResponse.json({
      overview: {
        total_conversations: currentCount,
        total_messages_sent: totalMessages,
        response_rate: responseRate,
        conversion_rate: conversionRate,
        avg_response_time_hours: avgResponseTimeHours,
        avg_messages_per_conversation: avgMessages,
      },
      by_flow: byFlow,
      by_day: byDay,
      period_comparison: {
        current: currentCount,
        previous: prevCount,
        change_pct: changePct,
      },
    });
  } catch (error) {
    console.error("[ActionMetrics] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
