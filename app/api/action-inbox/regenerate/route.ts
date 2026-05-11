import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateMessage, buildConversationContext, FlowType } from "@/lib/ai-message-engine";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conversationId, tenantId } = await req.json();

    if (!conversationId || !tenantId) {
      return NextResponse.json({ error: "conversationId e tenantId são obrigatórios" }, { status: 400 });
    }

    // Buscar conversa
    const { data: conv, error: convError } = await supabase
      .from("ai_conversations")
      .select("*, ai_conversation_messages(direction, content, status, sent_at)")
      .eq("id", conversationId)
      .eq("tenant_id", tenantId)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    // Construir histórico de mensagens (excluindo drafts)
    const conversationHistory = (conv.ai_conversation_messages || [])
      .filter((m: { status: string }) => m.status !== "draft")
      .sort((a: { sent_at: string }, b: { sent_at: string }) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
      .map((m: { direction: string; content: string }) => ({
        role: (m.direction === "outbound" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      }));

    const triggerData = (conv.trigger_data as Record<string, unknown>) || {};

    // Construir contexto usando buildConversationContext
    const context = await buildConversationContext({
      tenantId,
      flowType: conv.flow_type as FlowType,
      contactName: conv.contact_name,
      contactPhone: conv.contact_phone,
      npsScore: conv.nps_score ?? undefined,
      interestedServices: (triggerData.interested_services as string[]) || undefined,
      formResponses: (triggerData.form_responses as Record<string, string>) || undefined,
      conversationHistory,
      isFirstMessage: conversationHistory.length === 0,
    });

    // Regenerar mensagem
    const generated = await generateMessage(context);

    // Atualizar o draft no banco
    await supabase
      .from("ai_conversation_messages")
      .update({ content: generated.content })
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .eq("status", "draft");

    return NextResponse.json({ message: generated.content, reasoning: generated.reasoning });
  } catch (error) {
    console.error("[Regenerate] Error:", error);
    return NextResponse.json({ error: "Erro ao regenerar mensagem" }, { status: 500 });
  }
}
