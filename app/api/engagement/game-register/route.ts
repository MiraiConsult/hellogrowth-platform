/**
 * POST /api/engagement/game-register
 * Registra engajamento (review_request ou referral) após o giro da roleta.
 * Chamado pelo PublicSurvey quando um promotor (score >= 9) termina o jogo.
 * Aplica lógica anti-duplicação: não registra se já existe entrada para o telefone.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "x-tenant-id obrigatório" }, { status: 400 });
    }

    const { name, phone, score } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "phone obrigatório" }, { status: 400 });
    }
    if (typeof score !== "number" || score < 9) {
      return NextResponse.json({ skipped: true, reason: "Score não é promotor" });
    }

    const supabase = getSupabase();
    const phoneClean = phone.replace(/\D/g, "");
    const phoneVariants = [phoneClean, phoneClean.replace(/^55/, ""), `55${phoneClean}`];

    // Buscar campanhas de engajamento ativas com game_channel habilitado
    const { data: campaigns } = await supabase
      .from("engagement_campaigns")
      .select("id, type, status, game_enabled")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .eq("game_enabled", true)
      .in("type", ["google_review", "referral"]);

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ skipped: true, reason: "Nenhuma campanha ativa com canal game" });
    }

    const registered: string[] = [];

    for (const campaign of campaigns) {
      if (campaign.type === "google_review") {
        // Anti-duplicação: verificar se já existe review_request para este telefone
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
            lead_name: name || "",
            lead_phone: phone,
            status: "sent",
            source: "game",
          });
          registered.push(`review_request:${campaign.id}`);
        }
      } else if (campaign.type === "referral") {
        // Anti-duplicação: verificar se já existe referral para este telefone
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
            referrer_name: name || "",
            referrer_phone: phone,
            referral_code: code,
            referral_link: `${baseUrl}/r/${code}`,
            status: "pending",
            source: "game",
          });
          registered.push(`referral:${campaign.id}`);
        }
      }
    }

    return NextResponse.json({ success: true, registered });
  } catch (error: any) {
    console.error("[Engagement/GameRegister] Erro:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
