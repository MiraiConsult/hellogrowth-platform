/**
 * Endpoint: Alternar modo do agente de IA por conversa
 * 
 * POST /api/action-inbox/set-mode
 * Body: { conversationId, mode: 'approval_required' | 'auto', tenantId }
 * 
 * - approval_required: IA gera draft, humano aprova antes de enviar
 * - auto: IA responde automaticamente sem aprovação humana
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { conversationId, mode, tenantId } = await req.json();

    if (!conversationId || !mode || !tenantId) {
      return NextResponse.json(
        { error: "conversationId, mode e tenantId são obrigatórios" },
        { status: 400 }
      );
    }

    if (!["approval_required", "auto"].includes(mode)) {
      return NextResponse.json(
        { error: "mode deve ser 'approval_required' ou 'auto'" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("ai_conversations")
      .update({ mode })
      .eq("id", conversationId)
      .eq("tenant_id", tenantId);

    if (error) {
      console.error("[Set Mode] Erro:", error);
      return NextResponse.json({ error: "Erro ao atualizar modo" }, { status: 500 });
    }

    console.log(`[Set Mode] Conversa ${conversationId} → modo ${mode}`);
    return NextResponse.json({ success: true, mode });
  } catch (error) {
    console.error("[Set Mode] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
