import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }

  try {
    const { data: conv, error } = await supabase
      .from("ai_conversations")
      .select(`
        id,
        flow_type,
        contact_name,
        contact_phone,
        status,
        nps_score,
        trigger_data,
        ai_conversation_messages(
          id,
          direction,
          content,
          status,
          sent_at,
          wa_message_id
        )
      `)
      .eq("id", id)
      .single();

    if (error || !conv) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    // Separar draft da IA das mensagens enviadas
    const messages = (conv.ai_conversation_messages || [])
      .filter((m: { status: string }) => m.status !== "draft")
      .sort((a: { sent_at: string }, b: { sent_at: string }) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());

    const aiDraft = (conv.ai_conversation_messages || [])
      .filter((m: { direction: string; status: string }) => m.direction === "outbound" && m.status === "draft")
      .sort((a: { sent_at: string }, b: { sent_at: string }) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

    return NextResponse.json({
      conversation: {
        id: conv.id,
        contact_name: conv.contact_name,
        contact_phone: conv.contact_phone,
        status: conv.status,
        flow_type: conv.flow_type,
        messages,
        ai_draft: aiDraft?.content || "",
        ai_draft_id: aiDraft?.id || null,
      },
    });
  } catch (error) {
    console.error("[ActionInbox Conversation] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
