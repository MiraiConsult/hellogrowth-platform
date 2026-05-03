"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart2, Download, Calendar, Users, MessageSquare,
  TrendingUp, CheckCircle, AlertTriangle, Star, ThumbsDown,
  Minus, Zap, RefreshCw, FileText
} from "lucide-react";

interface Props {
  isDark: boolean;
  tenantId: string;
}

interface ReportData {
  period: { from: string; to: string };
  summary: {
    total_conversations: number;
    total_messages: number;
    response_rate: number;
    avg_response_time_hours: number;
    completion_rate: number;
    escalation_rate: number;
    opt_out_rate: number;
  };
  by_flow: {
    flow: string;
    label: string;
    conversations: number;
    messages: number;
    response_rate: number;
    completion_rate: number;
    avg_messages: number;
  }[];
  top_contacts: {
    name: string;
    phone: string;
    flow: string;
    messages: number;
    status: string;
  }[];
  daily_volume: {
    date: string;
    conversations: number;
    messages: number;
  }[];
  opt_outs: number;
  escalations: number;
}

const FLOW_LABELS: Record<string, string> = {
  detractor: "Detratores",
  promoter: "Promotores",
  passive: "Neutros",
  pre_sale: "Pré-Venda",
};

const FLOW_COLORS: Record<string, string> = {
  detractor: "text-red-500",
  promoter: "text-emerald-500",
  passive: "text-amber-500",
  pre_sale: "text-purple-500",
};

const FLOW_BG: Record<string, string> = {
  detractor: "bg-red-100",
  promoter: "bg-emerald-100",
  passive: "bg-amber-100",
  pre_sale: "bg-purple-100",
};

const FLOW_ICONS: Record<string, any> = {
  detractor: ThumbsDown,
  promoter: Star,
  passive: Minus,
  pre_sale: TrendingUp,
};

export default function PilotReport({ isDark, tenantId }: Props) {
  const t = {
    bg: isDark ? "bg-slate-900" : "bg-slate-50",
    card: isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
    text: isDark ? "text-slate-100" : "text-slate-800",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
    divider: isDark ? "border-slate-700" : "border-slate-200",
    highlight: isDark ? "bg-slate-700" : "bg-slate-100",
  };

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [exporting, setExporting] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pilot-report?tenantId=${tenantId}&period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error("Error fetching pilot report:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportCSV = () => {
    if (!report) return;
    setExporting(true);

    const lines: string[] = [];
    lines.push("RELATÓRIO DE PILOTO — MÓDULO IA HELLO GROWTH");
    lines.push(`Período: ${new Date(report.period.from).toLocaleDateString("pt-BR")} a ${new Date(report.period.to).toLocaleDateString("pt-BR")}`);
    lines.push(`Gerado em: ${new Date().toLocaleString("pt-BR")}`);
    lines.push("");
    lines.push("RESUMO GERAL");
    lines.push(`Total de conversas,${report.summary.total_conversations}`);
    lines.push(`Total de mensagens,${report.summary.total_messages}`);
    lines.push(`Taxa de resposta,${report.summary.response_rate}%`);
    lines.push(`Taxa de conclusão,${report.summary.completion_rate}%`);
    lines.push(`Taxa de escalada,${report.summary.escalation_rate}%`);
    lines.push(`Taxa de opt-out,${report.summary.opt_out_rate}%`);
    lines.push(`Tempo médio de resposta,${report.summary.avg_response_time_hours}h`);
    lines.push("");
    lines.push("DESEMPENHO POR FLUXO");
    lines.push("Fluxo,Conversas,Mensagens,Taxa Resposta,Taxa Conclusão,Média Msgs");
    report.by_flow.forEach((f) => {
      lines.push(`${f.label},${f.conversations},${f.messages},${f.response_rate}%,${f.completion_rate}%,${f.avg_messages}`);
    });
    lines.push("");
    lines.push("VOLUME DIÁRIO");
    lines.push("Data,Conversas,Mensagens");
    report.daily_volume.forEach((d) => {
      lines.push(`${new Date(d.date).toLocaleDateString("pt-BR")},${d.conversations},${d.messages}`);
    });

    const csv = lines.join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-piloto-${period}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const maxVolume = report
    ? Math.max(...report.daily_volume.map((d) => d.conversations), 1)
    : 1;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${t.text} flex items-center gap-2`}>
            <FileText size={22} className="text-purple-500" />
            Relatório de Piloto
          </h1>
          <p className={`text-sm ${t.textMuted} mt-1`}>
            Métricas de desempenho do Módulo IA — primeiros clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Seletor de período */}
          <div className={`flex rounded-lg border ${t.divider} overflow-hidden`}>
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === p
                    ? "bg-purple-600 text-white"
                    : `${t.text} ${t.highlight} hover:bg-purple-50 hover:text-purple-700`
                }`}
              >
                {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchReport()}
            className={`p-2 rounded-lg border ${t.divider} ${t.text} hover:bg-purple-50`}
            title="Atualizar"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={exportCSV}
            disabled={!report || exporting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium disabled:opacity-50"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className={`text-sm ${t.textMuted}`}>Carregando relatório...</p>
          </div>
        </div>
      ) : !report ? (
        <div className={`text-center py-16 ${t.textMuted}`}>
          <BarChart2 size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-base font-medium">Nenhum dado disponível</p>
          <p className="text-sm mt-1">Configure o módulo IA e aguarde as primeiras conversas</p>
        </div>
      ) : (
        <>
          {/* Período */}
          <div className={`flex items-center gap-2 text-xs ${t.textMuted} mb-5`}>
            <Calendar size={12} />
            <span>
              {new Date(report.period.from).toLocaleDateString("pt-BR")} até{" "}
              {new Date(report.period.to).toLocaleDateString("pt-BR")}
            </span>
          </div>

          {/* KPIs Principais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Conversas", value: report.summary.total_conversations, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
              { label: "Mensagens", value: report.summary.total_messages, icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-50" },
              { label: "Taxa de Resposta", value: `${report.summary.response_rate}%`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
              { label: "Taxa de Conclusão", value: `${report.summary.completion_rate}%`, icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`rounded-xl border ${t.card} p-4`}>
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                  <Icon size={16} className={color} />
                </div>
                <p className={`text-2xl font-bold ${t.text}`}>{value}</p>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>{label}</p>
              </div>
            ))}
          </div>

          {/* KPIs Secundários */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className={`rounded-xl border ${t.card} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>Escaladas</p>
                <AlertTriangle size={14} className="text-red-500" />
              </div>
              <p className={`text-2xl font-bold text-red-500`}>{report.escalations}</p>
              <p className={`text-xs ${t.textMuted} mt-0.5`}>{report.summary.escalation_rate}% das conversas</p>
            </div>
            <div className={`rounded-xl border ${t.card} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>Opt-Outs</p>
                <Zap size={14} className="text-amber-500" />
              </div>
              <p className={`text-2xl font-bold text-amber-500`}>{report.opt_outs}</p>
              <p className={`text-xs ${t.textMuted} mt-0.5`}>{report.summary.opt_out_rate}% das conversas</p>
            </div>
            <div className={`rounded-xl border ${t.card} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>Tempo Médio</p>
                <Calendar size={14} className="text-blue-500" />
              </div>
              <p className={`text-2xl font-bold ${t.text}`}>{report.summary.avg_response_time_hours}h</p>
              <p className={`text-xs ${t.textMuted} mt-0.5`}>até primeira resposta</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Desempenho por Fluxo */}
            <div className={`rounded-xl border ${t.card} p-5`}>
              <h2 className={`text-sm font-semibold ${t.text} mb-4`}>Desempenho por Fluxo</h2>
              <div className="space-y-4">
                {report.by_flow.map((flow) => {
                  const Icon = FLOW_ICONS[flow.flow] || Zap;
                  return (
                    <div key={flow.flow}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg ${FLOW_BG[flow.flow] || "bg-slate-100"} flex items-center justify-center`}>
                            <Icon size={12} className={FLOW_COLORS[flow.flow] || "text-slate-500"} />
                          </div>
                          <span className={`text-sm font-medium ${t.text}`}>{flow.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className={t.textMuted}>{flow.conversations} conv.</span>
                          <span className={`font-semibold ${FLOW_COLORS[flow.flow] || t.text}`}>{flow.response_rate}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            flow.flow === "detractor" ? "bg-red-400" :
                            flow.flow === "promoter" ? "bg-emerald-400" :
                            flow.flow === "passive" ? "bg-amber-400" : "bg-purple-400"
                          }`}
                          style={{ width: `${flow.response_rate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {report.by_flow.length === 0 && (
                  <p className={`text-sm ${t.textMuted} text-center py-4`}>Nenhum dado no período</p>
                )}
              </div>
            </div>

            {/* Volume Diário */}
            <div className={`rounded-xl border ${t.card} p-5`}>
              <h2 className={`text-sm font-semibold ${t.text} mb-4`}>Volume Diário</h2>
              {report.daily_volume.length === 0 ? (
                <p className={`text-sm ${t.textMuted} text-center py-8`}>Nenhum dado no período</p>
              ) : (
                <div className="flex items-end gap-1 h-32">
                  {report.daily_volume.slice(-14).map((day) => {
                    const height = Math.max((day.conversations / maxVolume) * 100, 4);
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-1 group relative"
                      >
                        <div
                          className="w-full bg-purple-500 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                          style={{ height: `${height}%` }}
                          title={`${new Date(day.date).toLocaleDateString("pt-BR")}: ${day.conversations} conversas`}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                          {day.conversations} conv.
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {report.daily_volume.length > 0 && (
                <div className={`flex justify-between text-xs ${t.textMuted} mt-2`}>
                  <span>{new Date(report.daily_volume[Math.max(0, report.daily_volume.length - 14)].date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                  <span>{new Date(report.daily_volume[report.daily_volume.length - 1].date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Top Contatos */}
          {report.top_contacts.length > 0 && (
            <div className={`rounded-xl border ${t.card} overflow-hidden`}>
              <div className={`px-5 py-3 border-b ${t.divider}`}>
                <h2 className={`text-sm font-semibold ${t.text}`}>Conversas mais ativas</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${t.divider} ${t.highlight}`}>
                      <th className={`text-left px-4 py-2.5 text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>Contato</th>
                      <th className={`text-left px-4 py-2.5 text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>Fluxo</th>
                      <th className={`text-center px-4 py-2.5 text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>Mensagens</th>
                      <th className={`text-left px-4 py-2.5 text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.top_contacts.map((contact, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className={`px-4 py-3`}>
                          <div>
                            <p className={`font-medium ${t.text} text-sm`}>{contact.name}</p>
                            <p className={`text-xs ${t.textMuted} font-mono`}>{contact.phone}</p>
                          </div>
                        </td>
                        <td className={`px-4 py-3`}>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FLOW_BG[contact.flow] || "bg-slate-100"} ${FLOW_COLORS[contact.flow] || t.textMuted}`}>
                            {FLOW_LABELS[contact.flow] || contact.flow}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center`}>
                          <span className={`font-semibold ${t.text}`}>{contact.messages}</span>
                        </td>
                        <td className={`px-4 py-3`}>
                          <span className={`text-xs ${
                            contact.status === "completed" ? "text-emerald-600" :
                            contact.status === "escalated" ? "text-red-600" :
                            contact.status === "active" ? "text-blue-600" :
                            t.textMuted
                          }`}>
                            {contact.status === "completed" ? "✓ Concluído" :
                             contact.status === "escalated" ? "⚠ Escalado" :
                             contact.status === "active" ? "● Ativo" :
                             contact.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
