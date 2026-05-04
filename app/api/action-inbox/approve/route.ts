import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendUnifiedTextMessage, getTenantWhatsAppConfig } from "@/lib/whatsapp-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { actionId, conversationId, message, tenantId } = await req.json();

    if (!conversationId || !message || !tenantId) {
      return NextResponse.json({ error: "Parâmetros obrigatórios faltando" }, { status: 400 });
    }

    // Buscar configuração WhatsApp do tenant (suporta Evolution, 360dialog, Meta Cloud)
    const config = await getTenantWhatsAppConfig(supabase, tenantId);

    if (!config || !config.provider) {
      return NextResponse.json({ error: "WhatsApp não conectado" }, { status: 404 });
    }

    // Buscar telefone do contato
    const { data: conv, error: convError } = await supabase
      .from("ai_conversations")
      .select("contact_phone, contact_name")
      .eq("id", conversationId)
      .single();

    if (convError || !conv) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    // Enviar mensagem via WhatsApp (roteamento automático por provider)
    const waMessageId = await sendUnifiedTextMessage(config, conv.contact_phone, message);

    // Atualizar ou criar mensagem no banco
    const { data: existingDraft } = await supabase
      .from("ai_conversation_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("direction", "outbound")
      .eq("status", "draft")
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();

    if (existingDraft) {
      await supabase
        .from("ai_conversation_messages")
        .update({
          content: message,
          status: "sent",
          wa_message_id: waMessageId,
          sent_at: new Date().toISOString(),
          approved_by: "human",
        })
        .eq("id", existingDraft.id);
    } else {
      await supabase.from("ai_conversation_messages").insert({
        conversation_id: conversationId,
        direction: "outbound",
        content: message,
        status: "sent",
        wa_message_id: waMessageId,
        sent_at: new Date().toISOString(),
        approved_by: "human",
      });
    }

    // Atualizar status da conversa
    await supabase
      .from("ai_conversations")
      .update({
        status: "waiting_reply",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    // ---- Registrar engajamento se for fluxo promotor ----
    try {
      const { data: fullConv } = await supabase
        .from("ai_conversations")
        .select("flow_type")
        .eq("id", conversationId)
        .single();

      if (fullConv?.flow_type === "promoter") {
        const { data: engCampaigns } = await supabase
          .from("engagement_campaigns")
          .select("id, type, status, ai_enabled")
          .eq("tenant_id", tenantId)
          .eq("status", "active")
          .eq("ai_enabled", true)
          .in("type", ["google_review", "referral"]);

        const phone = conv.contact_phone;
        const name = conv.contact_name || "";
        const phoneClean = phone.replace(/\D/g, "");
        const phoneVariants = [phoneClean, phoneClean.replace(/^55/, ""), `55${phoneClean}`];

        for (const campaign of engCampaigns || []) {
          if (campaign.type === "google_review") {
            const { data: existing } = await supabase
              .from("review_requests")
              .select("id")
              .eq("tenant_id", tenantId)
              .in("lead_phone", phoneVariants)
              .limit(1);

            if (!existing || existing.length === 0) {
              await supabase.from("review_requests").insert({
                tenant_id: tenantId,
                campaign_id: campaign.id,
                lead_name: name,
                lead_phone: phone,
                status: "sent",
                source: "ai",
              });
            }
          } else if (campaign.type === "referral") {
            const { data: existing } = await supabase
              .from("referrals")
              .select("id")
              .eq("tenant_id", tenantId)
              .in("referrer_phone", phoneVariants)
              .limit(1);

            if (!existing || existing.length === 0) {
              const code = `${phoneClean.slice(-4)}${Date.now().toString(36).toUpperCase()}`;
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.hellogrowth.com.br";
              await supabase.from("referrals").insert({
                tenant_id: tenantId,
                campaign_id: campaign.id,
                referrer_name: name,
                referrer_phone: phone,
                referral_code: code,
                referral_link: `${baseUrl}/r/${code}`,
                status: "pending",
                source: "ai",
              });
            }
          }
        }
      }
    } catch (engErr) {
      console.error("[ActionInbox Approve] Erro ao registrar engajamento:", engErr);
    }

    return NextResponse.json({ success: true, waMessageId });
  } catch (error) {
    console.error("[ActionInbox Approve] Error:", error);
    return NextResponse.json({ error: "Erro ao aprovar e enviar mensagem" }, { status: 500 });
  }
}
