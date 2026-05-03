/**
 * /api/prompts
 * 
 * GET  — Lista todas as versões de prompts do tenant (agrupadas por flow_type)
 * POST — Cria uma nova versão de prompt para um fluxo
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildPrompt, type FlowType } from "@/lib/prompts";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// GET — Lista versões de prompts do tenant
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenant_id");
    const flowType = searchParams.get("flow_type") as FlowType | null;

    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id obrigatório" }, { status: 400 });
    }

    const supabase = getSupabase();

    let query = supabase
      .from("prompt_versions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("flow_type", { ascending: true })
      .order("version_number", { ascending: false });

    if (flowType) {
      query = query.eq("flow_type", flowType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Prompts API] Erro ao buscar versões:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Agrupar por flow_type para facilitar o frontend
    const grouped: Record<string, typeof data> = {};
    for (const version of data || []) {
      if (!grouped[version.flow_type]) grouped[version.flow_type] = [];
      grouped[version.flow_type]!.push(version);
    }

    return NextResponse.json({
      versions: data || [],
      grouped,
      total: data?.length || 0,
    });
  } catch (err: any) {
    console.error("[Prompts API] Erro inesperado:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================
// POST — Cria nova versão de prompt
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenant_id,
      flow_type,
      prompt_content,
      version_name,
      activate_immediately = false,
    } = body;

    if (!tenant_id || !flow_type || !prompt_content) {
      return NextResponse.json(
        { error: "tenant_id, flow_type e prompt_content são obrigatórios" },
        { status: 400 }
      );
    }

    const validFlowTypes: FlowType[] = ["detractor", "promoter", "passive", "pre_sale"];
    if (!validFlowTypes.includes(flow_type)) {
      return NextResponse.json(
        { error: `flow_type inválido. Use: ${validFlowTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Buscar maior número de versão atual para este tenant + flow_type
    const { data: existing } = await supabase
      .from("prompt_versions")
      .select("version_number")
      .eq("tenant_id", tenant_id)
      .eq("flow_type", flow_type)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (existing?.version_number || 0) + 1;

    // Se ativar imediatamente, desativar versões anteriores
    if (activate_immediately) {
      await supabase
        .from("prompt_versions")
        .update({ is_active: false })
        .eq("tenant_id", tenant_id)
        .eq("flow_type", flow_type);
    }

    // Inserir nova versão
    const { data: newVersion, error } = await supabase
      .from("prompt_versions")
      .insert({
        tenant_id,
        flow_type,
        prompt_content,
        version_number: nextVersion,
        version_name: version_name || `v${nextVersion}`,
        is_active: activate_immediately,
        created_by: tenant_id, // Simplificado — em produção usar user_id do auth
      })
      .select()
      .single();

    if (error) {
      console.error("[Prompts API] Erro ao criar versão:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
      message: activate_immediately
        ? `Versão ${nextVersion} criada e ativada com sucesso`
        : `Versão ${nextVersion} criada (inativa — ative quando quiser)`,
    });
  } catch (err: any) {
    console.error("[Prompts API] Erro inesperado:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================
// GET /api/prompts/default — Retorna o prompt padrão do sistema
// (sem customização, apenas o prompt base do código)
// ============================================================
export async function HEAD(req: NextRequest) {
  // Usado para health check do endpoint
  return new NextResponse(null, { status: 200 });
}
