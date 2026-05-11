import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { actionId, tenantId } = await req.json();

    if (!actionId || !tenantId) {
      return NextResponse.json({ error: "actionId e tenantId são obrigatórios" }, { status: 400 });
    }

    const { error } = await supabase
      .from("ai_conversations")
      .update({ status: "dismissed" })
      .eq("id", actionId)
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json({ error: "Erro ao ignorar ação" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ActionInbox Dismiss] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
