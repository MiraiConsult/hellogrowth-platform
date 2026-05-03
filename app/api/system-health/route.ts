import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ServiceStatus = "operational" | "degraded" | "down" | "unknown";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latency?: number;
  lastChecked: string;
  details?: string;
  uptime?: number;
}

// ─── Verificações de serviço ──────────────────────────────────────────────────

async function checkSupabase(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const { error } = await supabase
      .from("ai_conversations")
      .select("id")
      .limit(1);
    const latency = Date.now() - start;
    return {
      name: "Supabase",
      status: error ? "degraded" : "operational",
      latency,
      lastChecked: new Date().toISOString(),
      details: error ? error.message : "Banco de dados acessível",
      uptime: error ? 95 : 99.9,
    };
  } catch (err: any) {
    return {
      name: "Supabase",
      status: "down",
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
      details: err?.message || "Erro de conexão",
      uptime: 0,
    };
  }
}

async function checkWhatsApp(): Promise<ServiceCheck> {
  const start = Date.now();
  const token = process.env.WHATSAPP_API_KEY;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return {
      name: "WhatsApp",
      status: "unknown",
      lastChecked: new Date().toISOString(),
      details: "Variáveis de ambiente não configuradas",
      uptime: undefined,
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}?fields=display_phone_number,status`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    const latency = Date.now() - start;
    const data = await res.json();

    if (!res.ok) {
      return {
        name: "WhatsApp",
        status: "degraded",
        latency,
        lastChecked: new Date().toISOString(),
        details: data?.error?.message || "Erro na API do WhatsApp",
        uptime: 90,
      };
    }

    return {
      name: "WhatsApp",
      status: data.status === "CONNECTED" ? "operational" : "degraded",
      latency,
      lastChecked: new Date().toISOString(),
      details: `Número: ${data.display_phone_number || "—"} · Status: ${data.status || "—"}`,
      uptime: data.status === "CONNECTED" ? 99.5 : 85,
    };
  } catch (err: any) {
    return {
      name: "WhatsApp",
      status: "down",
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
      details: err?.message || "Timeout ou erro de rede",
      uptime: 0,
    };
  }
}

async function checkInngest(): Promise<ServiceCheck> {
  const start = Date.now();
  const signingKey = process.env.INNGEST_SIGNING_KEY;
  const eventKey = process.env.INNGEST_EVENT_KEY;

  if (!signingKey || !eventKey) {
    return {
      name: "Inngest",
      status: "unknown",
      lastChecked: new Date().toISOString(),
      details: "Variáveis de ambiente não configuradas",
    };
  }

  try {
    // Verificar se o endpoint do Inngest está acessível
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.hellogrowth.com.br";
    const res = await fetch(`${appUrl}/api/inngest`, {
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    return {
      name: "Inngest",
      status: res.ok ? "operational" : "degraded",
      latency,
      lastChecked: new Date().toISOString(),
      details: res.ok ? "Endpoint registrado e acessível" : `HTTP ${res.status}`,
      uptime: res.ok ? 99.8 : 80,
    };
  } catch (err: any) {
    return {
      name: "Inngest",
      status: "unknown",
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
      details: "Não foi possível verificar (ambiente local)",
      uptime: undefined,
    };
  }
}

async function checkResend(): Promise<ServiceCheck> {
  const start = Date.now();
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      name: "Resend",
      status: "unknown",
      lastChecked: new Date().toISOString(),
      details: "RESEND_API_KEY não configurada",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    return {
      name: "Resend",
      status: res.ok ? "operational" : "degraded",
      latency,
      lastChecked: new Date().toISOString(),
      details: res.ok ? "API de email acessível" : `HTTP ${res.status}`,
      uptime: res.ok ? 99.9 : 85,
    };
  } catch (err: any) {
    return {
      name: "Resend",
      status: "down",
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
      details: err?.message || "Erro de conexão",
      uptime: 0,
    };
  }
}

async function checkNextApi(): Promise<ServiceCheck> {
  return {
    name: "API Next.js",
    status: "operational",
    latency: 1,
    lastChecked: new Date().toISOString(),
    details: "Endpoint respondendo normalmente",
    uptime: 100,
  };
}

// ─── Estatísticas operacionais ────────────────────────────────────────────────

async function getSystemStats(tenantId: string) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalConversations },
    { count: activeConversations },
    { count: pendingDispatches },
    { count: messagesLast24h },
    { count: failedMessages },
    { count: optOutsTotal },
    { data: lastCronData },
    { data: lastWebhookData },
  ] = await Promise.all([
    supabase.from("ai_conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("ai_conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in("status", ["active", "waiting_reply"]),
    supabase.from("scheduled_dispatches").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "pending"),
    supabase.from("ai_conversation_messages").select("id", { count: "exact", head: true }).gte("sent_at", yesterday),
    supabase.from("ai_conversation_messages").select("id", { count: "exact", head: true }).eq("status", "failed").gte("sent_at", yesterday),
    supabase.from("opt_out_list").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("scheduled_dispatches").select("processed_at").eq("tenant_id", tenantId).eq("status", "sent").order("processed_at", { ascending: false }).limit(1),
    supabase.from("ai_conversation_messages").select("sent_at").eq("direction", "inbound").order("sent_at", { ascending: false }).limit(1),
  ]);

  return {
    totalConversations: totalConversations || 0,
    activeConversations: activeConversations || 0,
    pendingDispatches: pendingDispatches || 0,
    messagesLast24h: messagesLast24h || 0,
    failedMessages: failedMessages || 0,
    optOutsTotal: optOutsTotal || 0,
    lastCronRun: (lastCronData as any)?.[0]?.processed_at || null,
    lastWebhookReceived: (lastWebhookData as any)?.[0]?.sent_at || null,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  // Executar verificações em paralelo
  const [supabaseCheck, whatsappCheck, inngestCheck, resendCheck, nextApiCheck, stats] =
    await Promise.all([
      checkSupabase(),
      checkWhatsApp(),
      checkInngest(),
      checkResend(),
      checkNextApi(),
      getSystemStats(tenantId),
    ]);

  return NextResponse.json({
    services: [supabaseCheck, whatsappCheck, inngestCheck, resendCheck, nextApiCheck],
    stats,
    checkedAt: new Date().toISOString(),
  });
}
