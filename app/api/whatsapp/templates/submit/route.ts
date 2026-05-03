import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { submitTemplate, HG_TEMPLATES } from "@/lib/whatsapp-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Submeter os 6 templates padrão do Hello Growth para aprovação da Meta
// Chamado automaticamente após o Embedded Signup (Ajuste 1 do Claude)
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
    }

    // Buscar a conexão WhatsApp do tenant
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("waba_id, business_token")
      .eq("tenant_id", tenantId)
      .eq("status", "connected")
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "Conexão WhatsApp não encontrada" },
        { status: 404 }
      );
    }

    const results = [];

    for (const template of HG_TEMPLATES) {
      try {
        // Verificar se já foi submetido
        const { data: existing } = await supabase
          .from("whatsapp_templates")
          .select("id, status")
          .eq("tenant_id", tenantId)
          .eq("template_name", template.name)
          .single();

        if (existing && existing.status !== "REJECTED") {
          results.push({ name: template.name, status: "already_submitted", existing_status: existing.status });
          continue;
        }

        // Submeter template à Meta
        const { id: metaId, status } = await submitTemplate({
          wabaId: connection.waba_id,
          accessToken: connection.business_token,
          name: template.name,
          category: template.category,
          language: template.language,
          components: template.components,
        });

        // Salvar no banco
        await supabase.from("whatsapp_templates").upsert({
          tenant_id: tenantId,
          waba_id: connection.waba_id,
          template_name: template.name,
          template_category: template.category,
          template_language: template.language,
          template_body: (template.components[0] as { text?: string })?.text ?? "",
          status,
          meta_template_id: metaId,
          submitted_at: new Date().toISOString(),
        }, { onConflict: "tenant_id,template_name" });

        results.push({ name: template.name, status: "submitted", meta_id: metaId });
      } catch (err) {
        console.error(`[Templates Submit] Error for ${template.name}:`, err);
        results.push({ name: template.name, status: "error", error: String(err) });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[Templates Submit] Error:", error);
    return NextResponse.json({ error: "Erro ao submeter templates" }, { status: 500 });
  }
}

// GET: Verificar status dos templates de um tenant
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
  }

  const { data: templates, error } = await supabase
    .from("whatsapp_templates")
    .select("template_name, template_category, status, submitted_at, approved_at, rejected_reason")
    .eq("tenant_id", tenantId)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Erro ao buscar templates" }, { status: 500 });
  }

  return NextResponse.json({ templates });
}
