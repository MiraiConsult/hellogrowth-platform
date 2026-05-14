import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");
  const period = searchParams.get("period") || "30d";

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromISO = from.toISOString();
  const toISO = new Date().toISOString();

  try {
    // Buscar conversas do período
    const { data: conversations } = await supabase
      .from("ai_conversations")
      .select("id, flow_type, status, contact_name, contact_phone, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", fromISO)
      .order("created_at", { ascending: true });

    const convs = conversations || [];

    // Buscar mensagens do período
    const convIds = convs.map((c: any) => c.id);
    let messages: any[] = [];
    if (convIds.length > 0) {
      const { data: msgs } = await supabase
        .from("ai_messages")
        .select("id, conversation_id, direction, sent_at")
        .in("conversation_id", convIds)
        .order("sent_at", { ascending: true });
      messages = msgs || [];
    }

    // Buscar opt-outs do período
    const { data: optOuts } = await supabase
      .from("opt_out_list")
      .select("id")
      .eq("tenant_id", tenantId)
      .gte("opted_out_at", fromISO);

    const optOutCount = (optOuts || []).length;

    // ---- Calcular métricas ----
    const totalConversations = convs.length;
    const totalMessages = messages.length;

    // Conversas com pelo menos 1 resposta inbound
    const convsWithReply = new Set(
      messages.filter((m: any) => m.direction === "inbound").map((m: any) => m.conversation_id)
    );
    const responseRate = totalConversations > 0
      ? Math.round((convsWithReply.size / totalConversations) * 100)
      : 0;

    // Conversas concluídas
    const completed = convs.filter((c: any) => c.status === "completed").length;
    const completionRate = totalConversations > 0
      ? Math.round((completed / totalConversations) * 100)
      : 0;

    // Escaladas
    const escalations = convs.filter((c: any) => c.status === "escalated").length;
    const escalationRate = totalConversations > 0
      ? Math.round((escalations / totalConversations) * 100)
      : 0;

    // Opt-out rate
    const optOutRate = totalConversations > 0
      ? Math.round((optOutCount / totalConversations) * 100)
      : 0;

    // Tempo médio de resposta (horas) — primeira mensagem inbound após criação
    let totalResponseHours = 0;
    let responseCount = 0;
    convs.forEach((conv: any) => {
      const firstInbound = messages.find(
        (m: any) => m.conversation_id === conv.id && m.direction === "inbound"
      );
      if (firstInbound) {
        const diff = new Date(firstInbound.sent_at).getTime() - new Date(conv.created_at).getTime();
        totalResponseHours += diff / 3600000;
        responseCount++;
      }
    });
    const avgResponseTimeHours = responseCount > 0
      ? Math.round((totalResponseHours / responseCount) * 10) / 10
      : 0;

    // ---- Por fluxo ----
    const flowTypes = ["detractor", "promoter", "passive", "pre_sale"];
    const flowLabels: Record<string, string> = {
      detractor: "Detratores",
      promoter: "Promotores",
      passive: "Neutros",
      pre_sale: "Pré-Venda",
    };

    const by_flow = flowTypes.map((flow) => {
      const flowConvs = convs.filter((c: any) => c.flow_type === flow);
      const flowConvIds = new Set(flowConvs.map((c: any) => c.id));
      const flowMessages = messages.filter((m: any) => flowConvIds.has(m.conversation_id));
      const flowReplies = new Set(
        flowMessages.filter((m: any) => m.direction === "inbound").map((m: any) => m.conversation_id)
      );
      const flowCompleted = flowConvs.filter((c: any) => c.status === "completed").length;

      return {
        flow,
        label: flowLabels[flow],
        conversations: flowConvs.length,
        messages: flowMessages.length,
        response_rate: flowConvs.length > 0 ? Math.round((flowReplies.size / flowConvs.length) * 100) : 0,
        completion_rate: flowConvs.length > 0 ? Math.round((flowCompleted / flowConvs.length) * 100) : 0,
        avg_messages: flowConvs.length > 0 ? Math.round((flowMessages.length / flowConvs.length) * 10) / 10 : 0,
      };
    }).filter((f) => f.conversations > 0);

    // ---- Volume diário ----
    const dailyMap: Record<string, { conversations: number; messages: number }> = {};
    convs.forEach((c: any) => {
      const date = c.created_at.split("T")[0];
      if (!dailyMap[date]) dailyMap[date] = { conversations: 0, messages: 0 };
      dailyMap[date].conversations++;
    });
    messages.forEach((m: any) => {
      const date = m.sent_at.split("T")[0];
      if (!dailyMap[date]) dailyMap[date] = { conversations: 0, messages: 0 };
      dailyMap[date].messages++;
    });
    const daily_volume = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // ---- Top contatos (mais mensagens) ----
    const contactMsgCount: Record<string, number> = {};
    messages.forEach((m: any) => {
      contactMsgCount[m.conversation_id] = (contactMsgCount[m.conversation_id] || 0) + 1;
    });
    const top_contacts = convs
      .map((c: any) => ({
        name: c.contact_name || "Desconhecido",
        phone: c.contact_phone,
        flow: c.flow_type,
        messages: contactMsgCount[c.id] || 0,
        status: c.status,
      }))
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 10);

    return NextResponse.json({
      period: { from: fromISO, to: toISO },
      summary: {
        total_conversations: totalConversations,
        total_messages: totalMessages,
        response_rate: responseRate,
        completion_rate: completionRate,
        escalation_rate: escalationRate,
        opt_out_rate: optOutRate,
        avg_response_time_hours: avgResponseTimeHours,
      },
      by_flow,
      daily_volume,
      top_contacts,
      opt_outs: optOutCount,
      escalations,
    });
  } catch (err: any) {
    console.error("pilot-report error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
