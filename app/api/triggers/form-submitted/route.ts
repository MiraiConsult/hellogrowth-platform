/**
 * Gatilho Automático: Formulário Preenchido → Agenda Auto-Trigger 48h
 * 
 * Quando um lead preenche o formulário de pré-venda, este endpoint:
 * 1. Agenda um auto-trigger de 48h (caso a clínica não acione manualmente)
 * 2. O auto-trigger verifica se a clínica já acionou antes de disparar
 * 
 * Este endpoint é chamado pelo Supabase Database Webhook na tabela leads (INSERT).
 */

import { NextRequest, NextResponse } from "next/server";
import { Inngest } from "inngest";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 15;

const inngest = new Inngest({ id: "hellogrowth" });

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verificar webhook secret
    const webhookSecret = request.headers.get("x-webhook-secret");
    const expectedSecret = process.env.SUPABASE_WEBHOOK_SIGNING_SECRET;

    if (expectedSecret && webhookSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const record = body.record || body;

    const tenantId = record.tenant_id;
    const leadId = record.id;
    const contactName = record.name || "Lead";
    const contactPhone = record.phone || "";
    const interestedServices = record.interested_services || [];
    const formResponses = record.form_responses || {};

    if (!tenantId || !contactPhone) {
      return NextResponse.json({
        status: "skipped",
        reason: "tenant_id ou phone não disponível",
      });
    }

    // Verificar se o tenant tem WhatsApp conectado
    const supabase = getSupabase();
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "connected")
      .single();

    if (!connection) {
      return NextResponse.json({
        status: "skipped",
        reason: "WhatsApp não conectado",
      });
    }

    // Agendar auto-trigger de 48h
    await inngest.send({
      name: "hellogrowth/presale.auto.scheduled",
      data: {
        tenantId,
        leadId,
        contactName,
        contactPhone,
        interestedServices,
        formResponses,
      },
    });

    console.log(
      `[Form Trigger] Auto-trigger 48h agendado para ${contactName} (${contactPhone}) - tenant: ${tenantId}`
    );

    return NextResponse.json({
      status: "scheduled",
      leadId,
      message: "Auto-trigger de 48h agendado",
    });
  } catch (error: any) {
    console.error("[Form Trigger] Erro:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
