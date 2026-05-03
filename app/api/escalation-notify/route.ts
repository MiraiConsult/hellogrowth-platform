import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEscalationNotification } from "@/lib/escalation-notifier";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      conversationId,
      contactName,
      contactPhone,
      flowType,
      lastMessage,
      reason,
    } = body;

    if (!tenantId || !conversationId) {
      return NextResponse.json(
        { error: "tenantId and conversationId required" },
        { status: 400 }
      );
    }

    // Buscar configurações de notificação do tenant
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("alert_phone, alert_email, business_name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .single();

    // Buscar configurações do perfil de negócio como fallback
    const { data: profile } = await supabase
      .from("business_profile")
      .select("name, email")
      .eq("tenant_id", tenantId)
      .single();

    const config = {
      whatsappAlertPhone: connection?.alert_phone || undefined,
      emailAlert: connection?.alert_email || profile?.email || undefined,
      businessName: connection?.business_name || profile?.name || "seu negócio",
    };

    const escalatedAt = new Date().toISOString();

    // Atualizar status da conversa para escalated
    await supabase
      .from("ai_conversations")
      .update({
        status: "escalated",
        escalated_at: escalatedAt,
        escalation_reason: reason || "Solicitação do cliente",
      })
      .eq("id", conversationId)
      .eq("tenant_id", tenantId);

    // Registrar no log de mensagens
    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      direction: "system",
      content: `Conversa escalada para atendimento humano. Motivo: ${reason || "Solicitação do cliente"}`,
      status: "delivered",
      sent_at: escalatedAt,
    });

    // Enviar notificações
    const notificationResult = await sendEscalationNotification(
      {
        tenantId,
        conversationId,
        contactName: contactName || "Contato",
        contactPhone: contactPhone || "",
        flowType: flowType || "unknown",
        lastMessage: lastMessage || "",
        reason: reason || "Solicitação do cliente",
        escalatedAt,
      },
      config
    );

    return NextResponse.json({
      success: true,
      notifications: notificationResult,
      escalatedAt,
    });
  } catch (err: any) {
    console.error("escalation-notify error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
