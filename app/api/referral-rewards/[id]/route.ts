import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH — Atualiza prêmio
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { tenantId, ...updates } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
    }

    const allowedFields = ["name", "description", "reward_type", "reward_value", "min_referrals", "is_active"];
    const filteredUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) filteredUpdates[key] = updates[key];
    }

    const { error } = await supabase
      .from("referral_rewards")
      .update({ ...filteredUpdates, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ReferralRewards] PATCH Error:", error);
    return NextResponse.json({ error: "Erro ao atualizar prêmio" }, { status: 500 });
  }
}

// DELETE — Remove prêmio
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from("referral_rewards")
      .delete()
      .eq("id", params.id)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ReferralRewards] DELETE Error:", error);
    return NextResponse.json({ error: "Erro ao excluir prêmio" }, { status: 500 });
  }
}
