import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — Lista prêmios do tenant
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
  }

  try {
    const { data: rewards, error } = await supabase
      .from("referral_rewards")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      // Tabela pode não existir ainda — retornar vazio
      if (error.code === "42P01") {
        return NextResponse.json({ rewards: [], stats: { total_referrals: 0, pending_rewards: 0, delivered_rewards: 0, top_referrer: null } });
      }
      throw error;
    }

    // Stats de indicações
    const { data: referrals } = await supabase
      .from("referral_leads")
      .select("status, referrer_name")
      .eq("tenant_id", tenantId);

    const refs = referrals || [];
    const pending = refs.filter((r) => r.status === "pending").length;
    const delivered = refs.filter((r) => r.status === "delivered").length;

    // Top referrer
    const referrerCounts: Record<string, number> = {};
    refs.forEach((r) => {
      if (r.referrer_name) {
        referrerCounts[r.referrer_name] = (referrerCounts[r.referrer_name] || 0) + 1;
      }
    });
    const topReferrer = Object.entries(referrerCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    return NextResponse.json({
      rewards: rewards || [],
      stats: {
        total_referrals: refs.length,
        pending_rewards: pending,
        delivered_rewards: delivered,
        top_referrer: topReferrer,
      },
    });
  } catch (error) {
    console.error("[ReferralRewards] GET Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST — Cria novo prêmio
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, name, description, reward_type, reward_value, min_referrals, is_active } = body;

    if (!tenantId || !name || !reward_value) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("referral_rewards")
      .insert({
        tenant_id: tenantId,
        name,
        description: description || null,
        reward_type: reward_type || "discount",
        reward_value,
        min_referrals: min_referrals || 1,
        is_active: is_active !== false,
        usage_count: 0,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id, success: true });
  } catch (error) {
    console.error("[ReferralRewards] POST Error:", error);
    return NextResponse.json({ error: "Erro ao criar prêmio" }, { status: 500 });
  }
}
