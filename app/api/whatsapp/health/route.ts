import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getQualityRating } from "@/lib/whatsapp-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Verificar quality rating de todas as conexões ativas
// Chamado via cron job diário (Inngest scheduled function)
export async function GET(req: NextRequest) {
  // Verificar se é chamada interna (Inngest) ou externa
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Buscar todas as conexões ativas
    const { data: connections, error } = await supabase
      .from("whatsapp_connections")
      .select("id, tenant_id, phone_number_id, business_token, quality_rating")
      .eq("status", "connected");

    if (error || !connections) {
      return NextResponse.json({ error: "Erro ao buscar conexões" }, { status: 500 });
    }

    const results = [];

    for (const conn of connections) {
      try {
        const { qualityRating, messagingLimitTier } = await getQualityRating(
          conn.phone_number_id,
          conn.business_token
        );

        const previousRating = conn.quality_rating;
        const ratingChanged = previousRating !== qualityRating;

        // Atualizar no banco
        await supabase
          .from("whatsapp_connections")
          .update({
            quality_rating: qualityRating,
            messaging_tier: messagingLimitTier,
            last_health_check: new Date().toISOString(),
          })
          .eq("id", conn.id);

        // Se rating caiu para RED, aplicar rate limiting automático
        if (qualityRating === "RED" && ratingChanged) {
          console.warn(`[WhatsApp Health] Tenant ${conn.tenant_id} quality rating dropped to RED`);
          // TODO: Notificar admin via email/Slack
        }

        results.push({
          tenantId: conn.tenant_id,
          qualityRating,
          messagingLimitTier,
          changed: ratingChanged,
        });
      } catch (err) {
        console.error(`[WhatsApp Health] Error for ${conn.id}:`, err);
        results.push({ tenantId: conn.tenant_id, error: String(err) });
      }
    }

    return NextResponse.json({ success: true, checked: results.length, results });
  } catch (error) {
    console.error("[WhatsApp Health] Error:", error);
    return NextResponse.json({ error: "Erro no health check" }, { status: 500 });
  }
}
