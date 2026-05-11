import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FLOW_LABELS: Record<string, string> = {
  detractor: "Reconquista (NPS 0-6)",
  passive: "Feedback (NPS 7-8)",
  promoter: "Indicação (NPS 9-10)",
  pre_sale: "Pré-Venda",
  presale_followup: "Follow-up Pré-Venda",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  active: "Ativa",
  waiting_reply: "Aguardando Resposta",
  completed: "Concluída",
  escalated: "Escalada",
  dismissed: "Ignorada",
  opted_out: "Opt-Out",
};

// ─── Geração de CSV ───────────────────────────────────────────────────────────

function generateCSV(
  conversations: any[],
  messages: Record<string, any[]>,
  includeMessages: boolean,
  includeMetrics: boolean
): string {
  const rows: string[][] = [];

  // Cabeçalho
  const headers = [
    "ID",
    "Nome do Cliente",
    "Telefone",
    "Fluxo",
    "Status",
    "Criado em",
    "Última Atualização",
    "Aprovado por",
    "Enviado via WhatsApp",
  ];

  if (includeMetrics) {
    headers.push(
      "Total de Mensagens",
      "Mensagens Enviadas",
      "Mensagens Entregues",
      "Mensagens Lidas",
      "Mensagens Recebidas",
      "Tempo de Resposta (min)"
    );
  }

  if (includeMessages) {
    headers.push("Histórico de Mensagens");
  }

  rows.push(headers);

  for (const conv of conversations) {
    const msgs = messages[conv.id] || [];
    const outbound = msgs.filter((m: any) => m.direction === "outbound");
    const inbound = msgs.filter((m: any) => m.direction === "inbound");
    const delivered = outbound.filter((m: any) => m.delivered_at);
    const read = outbound.filter((m: any) => m.read_at);

    // Tempo médio de resposta
    let avgResponseTime = "";
    if (inbound.length > 0 && outbound.length > 0) {
      const firstOut = outbound[0]?.sent_at;
      const firstIn = inbound[0]?.sent_at;
      if (firstOut && firstIn) {
        const diffMin = Math.round(
          (new Date(firstIn).getTime() - new Date(firstOut).getTime()) / 60000
        );
        avgResponseTime = diffMin > 0 ? String(diffMin) : "0";
      }
    }

    const row = [
      conv.id,
      conv.customer_name || "",
      conv.customer_phone || "",
      FLOW_LABELS[conv.flow_type] || conv.flow_type || "",
      STATUS_LABELS[conv.status] || conv.status || "",
      conv.created_at ? new Date(conv.created_at).toLocaleString("pt-BR") : "",
      conv.updated_at ? new Date(conv.updated_at).toLocaleString("pt-BR") : "",
      conv.approved_by || "",
      conv.whatsapp_sent ? "Sim" : "Não",
    ];

    if (includeMetrics) {
      row.push(
        String(msgs.length),
        String(outbound.length),
        String(delivered.length),
        String(read.length),
        String(inbound.length),
        avgResponseTime
      );
    }

    if (includeMessages) {
      const msgHistory = msgs
        .map((m: any) => {
          const dir = m.direction === "outbound" ? "→" : "←";
          const time = m.sent_at ? new Date(m.sent_at).toLocaleString("pt-BR") : "";
          return `[${time}] ${dir} ${m.content || ""}`;
        })
        .join(" | ");
      row.push(msgHistory);
    }

    rows.push(row);
  }

  // Escapar campos com vírgula ou aspas
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\n");
}

// ─── Geração de PDF (HTML → string) ──────────────────────────────────────────

function generatePDFHTML(
  conversations: any[],
  messages: Record<string, any[]>,
  includeMessages: boolean,
  includeMetrics: boolean,
  filters: { dateFrom: string; dateTo: string; flow: string; status: string }
): string {
  const totalConvs = conversations.length;
  const completed = conversations.filter((c) => c.status === "completed").length;
  const escalated = conversations.filter((c) => c.status === "escalated").length;
  const allMsgs = Object.values(messages).flat();
  const outbound = allMsgs.filter((m) => m.direction === "outbound");
  const read = outbound.filter((m) => m.read_at);

  const convRows = conversations
    .map((conv) => {
      const msgs = messages[conv.id] || [];
      const msgRows = includeMessages
        ? msgs
            .map((m: any) => {
              const dir = m.direction === "outbound" ? "→ IA" : "← Cliente";
              const time = m.sent_at
                ? new Date(m.sent_at).toLocaleString("pt-BR")
                : "";
              const statusBadge =
                m.direction === "outbound"
                  ? `<span style="font-size:10px;color:#64748b;margin-left:4px">${
                      m.read_at ? "✓✓ lida" : m.delivered_at ? "✓✓ entregue" : "✓ enviada"
                    }</span>`
                  : "";
              return `<tr style="background:${m.direction === "inbound" ? "#f8fafc" : "#fff"}">
              <td style="padding:4px 8px;font-size:11px;color:#64748b;white-space:nowrap">${time}</td>
              <td style="padding:4px 8px;font-size:11px;color:#7c3aed;font-weight:600">${dir}</td>
              <td style="padding:4px 8px;font-size:12px;color:#1e293b">${m.content || ""}${statusBadge}</td>
            </tr>`;
            })
            .join("")
        : "";

      const statusColor =
        conv.status === "completed"
          ? "#10b981"
          : conv.status === "escalated"
          ? "#ef4444"
          : conv.status === "active"
          ? "#3b82f6"
          : "#94a3b8";

      return `
      <div style="margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;page-break-inside:avoid">
        <div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-size:13px;font-weight:700;color:#1e293b">${conv.customer_name || "Cliente"}</span>
            <span style="font-size:11px;color:#64748b;margin-left:8px">${conv.customer_phone || ""}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span style="font-size:11px;padding:2px 8px;border-radius:12px;background:#ede9fe;color:#7c3aed">${FLOW_LABELS[conv.flow_type] || conv.flow_type || ""}</span>
            <span style="font-size:11px;padding:2px 8px;border-radius:12px;background:${statusColor}20;color:${statusColor};font-weight:600">${STATUS_LABELS[conv.status] || conv.status || ""}</span>
          </div>
        </div>
        ${
          includeMessages && msgRows
            ? `<table style="width:100%;border-collapse:collapse">
              <thead>
                <tr style="background:#f1f5f9">
                  <th style="padding:4px 8px;font-size:10px;color:#64748b;text-align:left;font-weight:600">Horário</th>
                  <th style="padding:4px 8px;font-size:10px;color:#64748b;text-align:left;font-weight:600">Direção</th>
                  <th style="padding:4px 8px;font-size:10px;color:#64748b;text-align:left;font-weight:600">Mensagem</th>
                </tr>
              </thead>
              <tbody>${msgRows}</tbody>
            </table>`
            : `<div style="padding:8px 14px"><p style="font-size:12px;color:#94a3b8;margin:0">Histórico de mensagens não incluído</p></div>`
        }
        <div style="padding:6px 14px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8">
          Criado em ${conv.created_at ? new Date(conv.created_at).toLocaleString("pt-BR") : "—"}
          ${conv.approved_by ? ` · Aprovado por ${conv.approved_by}` : ""}
        </div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório de Conversas — Hello Growth</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #fff; padding: 32px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <!-- Cabeçalho -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #7c3aed">
    <div>
      <h1 style="font-size:22px;font-weight:800;color:#7c3aed">Hello Growth</h1>
      <p style="font-size:13px;color:#64748b;margin-top:2px">Relatório de Conversas IA</p>
    </div>
    <div style="text-align:right">
      <p style="font-size:12px;color:#64748b">Período: <strong>${filters.dateFrom} a ${filters.dateTo}</strong></p>
      <p style="font-size:12px;color:#64748b">Gerado em: ${new Date().toLocaleString("pt-BR")}</p>
    </div>
  </div>

  <!-- Filtros aplicados -->
  <div style="margin-bottom:20px;padding:10px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
    <p style="font-size:11px;color:#64748b">
      <strong>Filtros:</strong>
      Fluxo: ${FLOW_LABELS[filters.flow] || "Todos"} ·
      Status: ${STATUS_LABELS[filters.status] || "Todos"}
    </p>
  </div>

  <!-- KPIs -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
    ${[
      { label: "Total de Conversas", value: totalConvs, color: "#7c3aed" },
      { label: "Concluídas", value: completed, color: "#10b981" },
      { label: "Escaladas", value: escalated, color: "#ef4444" },
      { label: "Taxa de Leitura", value: outbound.length > 0 ? `${Math.round((read.length / outbound.length) * 100)}%` : "—", color: "#3b82f6" },
    ]
      .map(
        (kpi) => `
      <div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;text-align:center">
        <p style="font-size:11px;color:#64748b;margin-bottom:4px">${kpi.label}</p>
        <p style="font-size:22px;font-weight:800;color:${kpi.color}">${kpi.value}</p>
      </div>`
      )
      .join("")}
  </div>

  <!-- Conversas -->
  <h2 style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:12px">
    Conversas (${totalConvs})
  </h2>
  ${convRows || '<p style="color:#94a3b8;font-size:13px">Nenhuma conversa encontrada para os filtros selecionados.</p>'}

  <!-- Rodapé -->
  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="font-size:10px;color:#94a3b8">
      Este relatório contém dados pessoais. Mantenha-o em local seguro conforme a LGPD.
      Gerado automaticamente pelo Hello Growth.
    </p>
  </div>
</body>
</html>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const tenantId = params.get("tenantId");
  const format = params.get("format") as "csv" | "pdf";
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const flow = params.get("flow") || "all";
  const status = params.get("status") || "all";
  const includeMessages = params.get("includeMessages") !== "false";
  const includeMetrics = params.get("includeMetrics") !== "false";

  if (!tenantId || !format || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "Parâmetros obrigatórios ausentes" }, { status: 400 });
  }

  // Buscar conversas
  let query = supabase
    .from("ai_conversations")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("created_at", `${dateFrom}T00:00:00`)
    .lte("created_at", `${dateTo}T23:59:59`)
    .order("created_at", { ascending: false });

  if (flow !== "all") query = query.eq("flow_type", flow);
  if (status !== "all") query = query.eq("status", status);

  const { data: conversations, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const convList = conversations || [];

  // Buscar mensagens se necessário
  const messagesMap: Record<string, any[]> = {};
  if (includeMessages || includeMetrics) {
    const ids = convList.map((c) => c.id);
    if (ids.length > 0) {
      const { data: msgs } = await supabase
        .from("ai_conversation_messages")
        .select("*")
        .in("conversation_id", ids)
        .order("sent_at", { ascending: true });

      for (const msg of msgs || []) {
        if (!messagesMap[msg.conversation_id]) messagesMap[msg.conversation_id] = [];
        messagesMap[msg.conversation_id].push(msg);
      }
    }
  }

  const now = new Date().toISOString().split("T")[0];

  if (format === "csv") {
    const csv = generateCSV(convList, messagesMap, includeMessages, includeMetrics);
    const filename = `conversas-${dateFrom}-${dateTo}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "x-record-count": String(convList.length),
      },
    });
  }

  if (format === "pdf") {
    const html = generatePDFHTML(convList, messagesMap, includeMessages, includeMetrics, {
      dateFrom,
      dateTo,
      flow,
      status,
    });
    const filename = `conversas-${dateFrom}-${dateTo}.html`;

    // Retornar HTML para o browser renderizar como PDF via print
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "x-record-count": String(convList.length),
      },
    });
  }

  return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
}
