/**
 * /api/prompts/[id]
 * 
 * GET    — Retorna uma versão específica de prompt
 * PATCH  — Ativa uma versão (desativa as outras do mesmo flow_type)
 * DELETE — Remove uma versão (não pode remover a ativa)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// GET — Busca versão específica
// ============================================================
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenant_id");

    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id obrigatório" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("prompt_versions")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Versão não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ version: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================
// PATCH — Ativa uma versão de prompt
// ============================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { tenant_id, action, prompt_content, version_name } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: "tenant_id obrigatório" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Buscar a versão
    const { data: version, error: fetchError } = await supabase
      .from("prompt_versions")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant_id)
      .single();

    if (fetchError || !version) {
      return NextResponse.json({ error: "Versão não encontrada" }, { status: 404 });
    }

    // Ação: ativar versão
    if (action === "activate") {
      // Desativar todas as versões do mesmo flow_type
      await supabase
        .from("prompt_versions")
        .update({ is_active: false })
        .eq("tenant_id", tenant_id)
        .eq("flow_type", version.flow_type);

      // Ativar esta versão
      const { data: updated, error: updateError } = await supabase
        .from("prompt_versions")
        .update({ is_active: true, activated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        version: updated,
        message: `Versão "${version.version_name}" ativada para o fluxo ${version.flow_type}`,
      });
    }

    // Ação: deactivate
    if (action === "deactivate") {
      const { data: updated, error: updateError } = await supabase
        .from("prompt_versions")
        .update({ is_active: false })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        version: updated,
        message: `Versão "${version.version_name}" desativada — sistema usará prompt padrão`,
      });
    }

    // Ação: editar conteúdo (sem criar nova versão)
    if (action === "edit") {
      if (!prompt_content) {
        return NextResponse.json({ error: "prompt_content obrigatório para edição" }, { status: 400 });
      }

      const { data: updated, error: updateError } = await supabase
        .from("prompt_versions")
        .update({
          prompt_content,
          version_name: version_name || version.version_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        version: updated,
        message: "Prompt atualizado com sucesso",
      });
    }

    return NextResponse.json(
      { error: "Ação inválida. Use: activate, deactivate, edit" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ============================================================
// DELETE — Remove versão (não pode ser a ativa)
// ============================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenant_id");

    if (!tenantId) {
      return NextResponse.json({ error: "tenant_id obrigatório" }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verificar se existe e se é ativa
    const { data: version, error: fetchError } = await supabase
      .from("prompt_versions")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !version) {
      return NextResponse.json({ error: "Versão não encontrada" }, { status: 404 });
    }

    if (version.is_active) {
      return NextResponse.json(
        { error: "Não é possível deletar a versão ativa. Ative outra versão primeiro." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("prompt_versions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Versão "${version.version_name}" removida com sucesso`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
