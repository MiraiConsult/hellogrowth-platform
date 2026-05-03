/**
 * weekly-report-cron.ts
 *
 * Cron Job Inngest que roda toda segunda-feira às 08:00 UTC-3 (11:00 UTC).
 * Para cada tenant com weekly_report_enabled = true, calcula métricas da semana
 * anterior e envia o relatório por email via Resend.
 */

import { inngest } from "@/lib/inngest-client";
import { createClient } from "@supabase/supabase-js";

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function getWeekRange(): { from: string; to: string; label: string } {
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() - 1); // ontem
  to.setHours(23, 59, 59, 999);

  const from = new Date(to);
  from.setDate(from.getDate() - 6); // 7 dias atrás
  from.setHours(0, 0, 0, 0);

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    label: `${fmt(from)} a ${fmt(to)}`,
  };
}

// ─── Cálculo de métricas ──────────────────────────────────────────────────────

async function calcWeeklyMetrics(tenantId: string, from: string, to: string) {
  const supabase = getSupabase();

  // Conversas da semana
  const { data: conversations } = await supabase
    .from("ai_conversations")
    .select("id, status, flow_type, created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", from)
    .lte("created_at", to);

  const total = conversations?.length || 0;
  const completed = conversations?.filter((c: any) => c.status === "completed").length || 0;
  const escalated = conversations?.filter((c: any) => c.status === "escalated").length || 0;

  // Mensagens enviadas
  const convIds = (conversations || []).map((c: any) => c.id);
  let messagesSent = 0;
  let messagesDelivered = 0;
  let messagesRead = 0;

  if (convIds.length > 0) {
    const { data: messages } = await supabase
      .from("ai_conversation_messages")
      .select("id, status, direction, delivered_at, read_at")
      .in("conversation_id", convIds)
      .eq("direction", "outbound");

    messagesSent = messages?.length || 0;
    messagesDelivered = messages?.filter((m: any) => m.delivered_at).length || 0;
    messagesRead = messages?.filter((m: any) => m.read_at).length || 0;
  }

  // Opt-outs da semana
  const { count: optouts } = await supabase
    .from("opt_out_list")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("created_at", from)
    .lte("created_at", to);

  // Breakdown por fluxo
  const flowBreakdown: Record<string, number> = {};
  for (const conv of conversations || []) {
    const ft = conv.flow_type || "unknown";
    flowBreakdown[ft] = (flowBreakdown[ft] || 0) + 1;
  }

  const responseRate = messagesSent > 0 ? (messagesDelivered / messagesSent) * 100 : 0;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  const readRate = messagesSent > 0 ? (messagesRead / messagesSent) * 100 : 0;

  return {
    total,
    completed,
    escalated,
    messagesSent,
    messagesDelivered,
    messagesRead,
    optouts: optouts || 0,
    responseRate,
    completionRate,
    readRate,
    flowBreakdown,
  };
}

// ─── Template HTML do email ───────────────────────────────────────────────────

function buildEmailHtml(params: {
  businessName: string;
  weekLabel: string;
  metrics: ReturnType<typeof calcWeeklyMetrics> extends Promise<infer T> ? T : never;
}): string {
  const { businessName, weekLabel, metrics } = params;

  const flowLabels: Record<string, string> = {
    detractor: "Reconquista (NPS 0-6)",
    passive: "Feedback (NPS 7-8)",
    promoter: "Indicação (NPS 9-10)",
    pre_sale: "Pré-Venda",
    presale_followup: "Follow-up Pré-Venda",
  };

  const flowRows = Object.entries(metrics.flowBreakdown)
    .map(
      ([flow, count]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">
          ${flowLabels[flow] || flow}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#1e293b;font-size:13px;">
          ${count}
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Semanal Hello Growth</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <p style="color:#c4b5fd;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Hello Growth IA</p>
      <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 8px;">Relatório Semanal</h1>
      <p style="color:#ddd6fe;font-size:14px;margin:0;">${businessName} · Semana ${weekLabel}</p>
    </div>

    <!-- KPIs principais -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
      
      <div style="background:#fff;border-radius:12px;padding:20px;text-align:center;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Conversas</p>
        <p style="color:#1e293b;font-size:28px;font-weight:700;margin:0;">${formatNumber(metrics.total)}</p>
        <p style="color:#10b981;font-size:11px;margin:4px 0 0;">${metrics.completed} concluídas</p>
      </div>

      <div style="background:#fff;border-radius:12px;padding:20px;text-align:center;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Entregues</p>
        <p style="color:#1e293b;font-size:28px;font-weight:700;margin:0;">${formatPercent(metrics.responseRate)}</p>
        <p style="color:#64748b;font-size:11px;margin:4px 0 0;">${formatNumber(metrics.messagesDelivered)} de ${formatNumber(metrics.messagesSent)}</p>
      </div>

      <div style="background:#fff;border-radius:12px;padding:20px;text-align:center;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <p style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Lidas</p>
        <p style="color:#1e293b;font-size:28px;font-weight:700;margin:0;">${formatPercent(metrics.readRate)}</p>
        <p style="color:#64748b;font-size:11px;margin:4px 0 0;">${formatNumber(metrics.messagesRead)} mensagens</p>
      </div>

    </div>

    <!-- Alertas -->
    ${
      metrics.escalated > 0 || metrics.optouts > 0
        ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="color:#92400e;font-size:13px;font-weight:600;margin:0 0 8px;">⚠️ Atenção esta semana</p>
        ${metrics.escalated > 0 ? `<p style="color:#78350f;font-size:13px;margin:0 0 4px;">• <strong>${metrics.escalated}</strong> conversa(s) escalada(s) para atendimento humano</p>` : ""}
        ${metrics.optouts > 0 ? `<p style="color:#78350f;font-size:13px;margin:0;">• <strong>${metrics.optouts}</strong> novo(s) opt-out(s) registrado(s)</p>` : ""}
      </div>`
        : ""
    }

    <!-- Breakdown por fluxo -->
    ${
      Object.keys(metrics.flowBreakdown).length > 0
        ? `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="padding:16px 20px;border-bottom:1px solid #f1f5f9;background:#f8fafc;">
          <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0;">Conversas por Fluxo</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${flowRows}
        </table>
      </div>`
        : ""
    }

    <!-- Taxa de conclusão -->
    <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <p style="color:#1e293b;font-size:14px;font-weight:600;margin:0 0 12px;">Taxa de Conclusão</p>
      <div style="background:#f1f5f9;border-radius:100px;height:8px;overflow:hidden;">
        <div style="background:linear-gradient(90deg,#7c3aed,#a855f7);height:100%;width:${Math.min(metrics.completionRate, 100)}%;border-radius:100px;"></div>
      </div>
      <p style="color:#64748b;font-size:12px;margin:8px 0 0;">${formatPercent(metrics.completionRate)} das conversas foram concluídas com sucesso</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.hellogrowth.com.br"}#action-metrics"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
        Ver Relatório Completo →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:16px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">
        Hello Growth IA · Você recebe este email porque ativou o relatório semanal automático.
      </p>
      <p style="color:#94a3b8;font-size:11px;margin:4px 0 0;">
        Para desativar, acesse Configurações → Notificações.
      </p>
    </div>

  </div>
</body>
</html>`;
}

// ─── Envio via Resend ─────────────────────────────────────────────────────────

async function sendWeeklyReportEmail(params: {
  to: string;
  businessName: string;
  weekLabel: string;
  metrics: any;
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn("[weekly-report] RESEND_API_KEY not set, skipping email");
    return { ok: false, reason: "no_resend_key" };
  }

  const html = buildEmailHtml({
    businessName: params.businessName,
    weekLabel: params.weekLabel,
    metrics: params.metrics,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Hello Growth IA <noreply@hellogrowth.com.br>",
      to: [params.to],
      subject: `📊 Relatório Semanal Hello Growth · ${params.weekLabel}`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[weekly-report] Resend error:", err);
    return { ok: false, reason: err };
  }

  return { ok: true };
}

// ─── Função Inngest ───────────────────────────────────────────────────────────

export const weeklyReportCron = inngest.createFunction(
  {
    id: "weekly-report-cron",
    name: "Weekly Report Cron",
    triggers: [{ cron: "0 11 * * 1" }],
    retries: 2,
  },
  // Toda segunda-feira às 11:00 UTC (08:00 BRT)
  async ({ step }) => {
    const supabase = getSupabase();

    // Buscar todos os tenants com relatório semanal ativo
    const tenants = await step.run("fetch-tenants", async () => {
      const { data } = await supabase
        .from("notification_settings")
        .select("tenant_id, weekly_report_email, business_name, timezone")
        .eq("weekly_report_enabled", true)
        .not("weekly_report_email", "is", null);
      return data || [];
    });

    const { from, to, label } = getWeekRange();

    const results: { tenantId: string; status: string; reason?: string }[] = [];

    for (const tenant of tenants as any[]) {
      const result = await step.run(`report-${tenant.tenant_id}`, async () => {
        try {
          const metrics = await calcWeeklyMetrics(tenant.tenant_id, from, to);

          // Não enviar se não houve nenhuma conversa
          if (metrics.total === 0) {
            return { status: "skipped", reason: "no_conversations" };
          }

          const emailResult = await sendWeeklyReportEmail({
            to: tenant.weekly_report_email,
            businessName: tenant.business_name || "Seu Negócio",
            weekLabel: label,
            metrics,
          });

          if (!emailResult.ok) {
            return { status: "failed", reason: emailResult.reason };
          }

          // Registrar no log
          await supabase.from("report_send_log").insert({
            tenant_id: tenant.tenant_id,
            report_type: "weekly",
            recipient_email: tenant.weekly_report_email,
            period_from: from,
            period_to: to,
            status: "sent",
            metrics_snapshot: metrics,
          });

          return { status: "sent" };
        } catch (err: any) {
          await supabase.from("report_send_log").insert({
            tenant_id: tenant.tenant_id,
            report_type: "weekly",
            recipient_email: tenant.weekly_report_email,
            period_from: from,
            period_to: to,
            status: "failed",
            error_message: err?.message || "Unknown error",
          });
          return { status: "error", reason: err?.message };
        }
      });

      results.push({ tenantId: tenant.tenant_id, ...result });
    }

    return {
      processed: tenants.length,
      results,
      weekLabel: label,
    };
  }
);
