import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Buscar conexão WhatsApp de um tenant
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
  }

  try {
    const { data: connection, error } = await supabase
      .from("whatsapp_connections")
      .select(
        "id, display_name, phone_number, quality_rating, messaging_tier, status, ai_persona_name, ai_persona_tone, connected_at"
      )
      .eq("tenant_id", tenantId)
      .eq("status", "connected")
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[WhatsApp Connection] Supabase error:", JSON.stringify(error));
      return NextResponse.json({ error: "Erro ao buscar conexão", details: error.message, code: error.code }, { status: 500 });
    }

    // Buscar persona
    const { data: persona } = await supabase
      .from("ai_persona_config")
      .select("name, role, tone, personality, custom_instructions")
      .eq("tenant_id", tenantId)
      .single();

    return NextResponse.json({
      connection: connection || null,
      persona: persona || {
        name: "Maria",
        role: "Consultora de Atendimento",
        tone: "friendly_professional",
        personality: "consultive",
        custom_instructions: "",
      },
    });
  } catch (error) {
    console.error("[WhatsApp Connection GET] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH: Atualizar persona da IA
export async function PATCH(req: NextRequest) {
  try {
    const { tenantId, ai_persona_name, ai_persona_tone } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
    }

    const { error } = await supabase
      .from("whatsapp_connections")
      .update({ ai_persona_name, ai_persona_tone })
      .eq("tenant_id", tenantId)
      .eq("status", "connected");

    if (error) {
      return NextResponse.json({ error: "Erro ao atualizar persona" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WhatsApp Connection PATCH] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
