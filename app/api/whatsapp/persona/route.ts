import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Buscar persona do tenant
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("ai_persona_config")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({
      persona: data || {
        name: "Maria",
        role: "Consultora de Atendimento",
        tone: "friendly_professional",
        personality: "consultive",
        custom_instructions: "",
      },
    });
  } catch (error) {
    console.error("[Persona GET] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST - Salvar persona do tenant
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, name, role, tone, personality, custom_instructions } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
    }

    const personaData = {
      tenant_id: tenantId,
      name: name || "Maria",
      role: role || "Consultora de Atendimento",
      tone: tone || "friendly_professional",
      personality: personality || "consultive",
      custom_instructions: custom_instructions || "",
      updated_at: new Date().toISOString(),
    };

    // Upsert: insere ou atualiza
    const { error } = await supabase
      .from("ai_persona_config")
      .upsert(personaData, { onConflict: "tenant_id" });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Persona POST] Error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
