/**
 * Gatilho Automático: NPS Response → Ação Autônoma
 * 
 * Este endpoint é chamado por um Supabase Database Webhook quando uma nova
 * resposta NPS é inserida. Ele classifica a nota e dispara o evento Inngest
 * correspondente (detractor, passive, promoter).
 * 
 * Configuração no Supabase:
 * - Tabela: nps_responses
 * - Evento: INSERT
 * - URL: https://www.hellogrowth.online/api/triggers/nps-action
 * - Headers: x-webhook-secret: <SUPABASE_WEBHOOK_SIGNING_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { Inngest } from "inngest";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

const inngest = new Inngest({ id: "hellogrowth" });

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function classifyNPS(score: number): "detractor" | "passive" | "promoter" {
  if (score <= 6) return "detractor";
  if (score <= 8) return "passive";
  return "promoter";
}

export async function POST(request: NextRequest) {
  try {
    // Verificar webhook secret
    const webhookSecret = request.headers.get("x-webhook-secret");
    const expectedSecret = process.env.SUPABASE_WEBHOOK_SIGNING_SECRET;

    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.error("[NPS Trigger] Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Supabase Database Webhooks enviam no formato { type, table, record, ... }
    const record = body.record || body;

    if (!record.score && record.score !== 0) {
      return NextResponse.json({ error: "Missing score" }, { status: 400 });
    }

    const npsScore = Number(record.score);
    const tenantId = record.tenant_id;
    const npsResponseId = record.id;
    const npsComment = record.comment || record.feedback || "";

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
    }

    // Buscar dados do contato
    const supabase = getSupabase();

    // Verificar se o tenant tem WhatsApp conectado e módulo de ação ativo
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("status", "connected")
      .single();

    if (!connection) {
      return NextResponse.json({
        status: "skipped",
        reason: "WhatsApp não conectado para este tenant",
      });
    }

    // Buscar nome e telefone do respondente
    const contactName = record.respondent_name || record.name || "Cliente";
    const contactPhone = record.respondent_phone || record.phone || "";

    if (!contactPhone) {
      return NextResponse.json({
        status: "skipped",
        reason: "Telefone do respondente não disponível",
      });
    }

    // Classificar e disparar evento
    const flowType = classifyNPS(npsScore);

    await inngest.send({
      name: "hellogrowth/nps.action.trigger",
      data: {
        tenantId,
        npsResponseId,
        contactName,
        contactPhone,
        npsScore,
        npsComment,
        flowType,
      },
    });

    console.log(
      `[NPS Trigger] Disparado fluxo ${flowType} para ${contactName} (score: ${npsScore}) - tenant: ${tenantId}`
    );

    return NextResponse.json({
      status: "triggered",
      flowType,
      npsScore,
      contactName,
    });
  } catch (error: any) {
    console.error("[NPS Trigger] Erro:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
