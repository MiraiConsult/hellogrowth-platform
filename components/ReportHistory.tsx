"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, Mail, CheckCircle, XCircle, Clock, RefreshCw,
  ChevronDown, ChevronRight, Download, Eye, EyeOff, Calendar,
  TrendingUp, MessageSquare, Users, AlertTriangle
} from "lucide-react";

interface Props {
  isDark: boolean;
  tenantId: string;
}

interface ReportLog {
  id: string;
  tenant_id: string;
  report_type: string;
  recipient_email: string;
  period_from: string;
  period_to: string;
  status: "sent" | "failed" | "skipped";
  error_message?: string;
  metrics_snapshot?: {
    total: number;
    completed: number;
    escalated: number;
    messagesSent: number;
    messagesDelivered: number;
    messagesRead: number;
    optouts: number;
    responseRate: number;
    completionRate: number;
    readRate: number;
    flowBreakdown: Record<string, number>;
  };
  created_at: string;
}

const FLOW_LABELS: Record<string, string> = {
  detractor: "Reconquista",
  passive: "Feedback",
  promoter: "Indicação",
  pre_sale: "Pré-Venda",
  presale_followup: "Follow-up",
};

export default function ReportHistory({ isDark, tenantId }: Props) {
  const t = {
    card: isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
    text: isDark ? "text-slate-100" : "text-slate-800",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
    input: isDark
      ? "bg-slate-700 border-slate-600 text-slate-100"
      : "bg-white border-slate-300 text-slate-800",
    divider: isDark ? "border-slate-700" : "border-slate-200",
    highlight: isDark ? "bg-slate-700/50" : "bg-slate-50",
    hover: isDark ? "hover:bg-slate-700" : "hover:bg-slate-50",
    row: isDark ? "border-slate-700" : "border-slate-100",
  };

  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 15;

  const fetchLogs = async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    try {
      const res = await fetch(
        `/api/report-history?tenantId=${tenantId}&page=${pageNum}&pageSize=${PAGE_SIZE}`
      );
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setLogs((prev) => [...prev, ...(data.logs || [])]);
        } else {
          setLogs(data.logs || []);
        }
        setHasMore((data.logs || []).length === PAGE_SIZE);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (tenantId) fetchLogs(1, false);
  }, [tenantId]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatPeriod = (from: string, to: string) => {
    const f = new Date(from).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const t2 = new Date(to).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return `${f} a ${t2}`;
  };

  const statusConfig = {
    sent: { label: "Enviado", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50", textColor: "text-emerald-700" },
    failed: { label: "Falhou", icon: XCircle, color: "text-red-500", bg: "bg-red-50", textColor: "text-red-700" },
    skipped: { label: "Ignorado", icon: Clock, color: "text-amber-500", bg: "bg-amber-50", textColor: "text-amber-700" },
  };

  const sentCount = logs.filter((l) => l.status === "sent").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
            <BarChart3 size={20} className="text-blue-500" />
            Histórico de Relatórios
          </h1>
          <p className={`text-sm ${t.textMuted} mt-0.5`}>
            Registro de todos os relatórios automáticos enviados
          </p>
        </div>
        <button
          onClick={() => fetchLogs(1, false)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${t.card} ${t.textMuted} hover:text-purple-500 transition-colors`}
        >
          <RefreshCw size={13} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-xl border ${t.card} p-4 text-center`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${t.textMuted} mb-1`}>Total</p>
          <p className={`text-2xl font-bold ${t.text}`}>{logs.length}</p>
          <p className={`text-xs ${t.textMuted} mt-0.5`}>relatórios</p>
        </div>
        <div className={`rounded-xl border ${t.card} p-4 text-center`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500 mb-1">Enviados</p>
          <p className="text-2xl font-bold text-emerald-600">{sentCount}</p>
          <p className={`text-xs ${t.textMuted} mt-0.5`}>com sucesso</p>
        </div>
        <div className={`rounded-xl border ${t.card} p-4 text-center`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">Falhas</p>
          <p className="text-2xl font-bold text-red-600">{failedCount}</p>
          <p className={`text-xs ${t.textMuted} mt-0.5`}>com erro</p>
        </div>
      </div>

      {/* Lista */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={18} className="animate-spin text-purple-500 mr-2" />
            <span className={`text-sm ${t.textMuted}`}>Carregando histórico...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BarChart3 size={32} className="text-slate-300 mb-3" />
            <p className={`text-sm font-medium ${t.textMuted}`}>Nenhum relatório enviado ainda</p>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              Ative o relatório semanal em Configurações → Notificações
            </p>
          </div>
        ) : (
          <div>
            {/* Header da tabela */}
            <div className={`grid grid-cols-12 gap-2 px-5 py-2.5 border-b ${t.divider} ${t.highlight}`}>
              <div className={`col-span-2 text-xs font-semibold uppercase tracking-wide ${t.textMuted}`}>Status</div>
              <div className={`col-span-2 text-xs font-semibold uppercase tracking-wide ${t.textMuted}`}>Tipo</div>
              <div className={`col-span-3 text-xs font-semibold uppercase tracking-wide ${t.textMuted}`}>Período</div>
              <div className={`col-span-3 text-xs font-semibold uppercase tracking-wide ${t.textMuted}`}>Destinatário</div>
              <div className={`col-span-2 text-xs font-semibold uppercase tracking-wide ${t.textMuted}`}>Enviado em</div>
            </div>

            {logs.map((log) => {
              const sc = statusConfig[log.status] || statusConfig.skipped;
              const StatusIcon = sc.icon;
              const isExpanded = expandedId === log.id;
              const m = log.metrics_snapshot;

              return (
                <div key={log.id} className={`border-b ${t.row} last:border-b-0`}>
                  {/* Linha principal */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className={`w-full grid grid-cols-12 gap-2 px-5 py-3 text-left transition-colors ${t.hover}`}
                  >
                    <div className="col-span-2 flex items-center gap-1.5">
                      <StatusIcon size={13} className={sc.color} />
                      <span className={`text-xs font-medium ${sc.textColor}`}>{sc.label}</span>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>
                        {log.report_type === "weekly" ? "Semanal" : log.report_type}
                      </span>
                    </div>
                    <div className={`col-span-3 text-xs ${t.textMuted}`}>
                      {formatPeriod(log.period_from, log.period_to)}
                    </div>
                    <div className={`col-span-3 text-xs ${t.text} truncate`}>
                      {log.recipient_email}
                    </div>
                    <div className={`col-span-2 flex items-center justify-between`}>
                      <span className={`text-xs ${t.textMuted}`}>
                        {formatDate(log.created_at)}
                      </span>
                      {m && (
                        isExpanded
                          ? <ChevronDown size={13} className={t.textMuted} />
                          : <ChevronRight size={13} className={t.textMuted} />
                      )}
                    </div>
                  </button>

                  {/* Detalhe expandido */}
                  {isExpanded && m && (
                    <div className={`px-5 pb-4 ${t.highlight} border-t ${t.divider}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${t.textMuted} mb-3 pt-3`}>
                        Métricas do relatório
                      </p>
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div className={`rounded-lg p-3 border ${t.card}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare size={11} className="text-purple-500" />
                            <span className={`text-xs ${t.textMuted}`}>Conversas</span>
                          </div>
                          <p className={`text-lg font-bold ${t.text}`}>{m.total}</p>
                          <p className={`text-xs ${t.textMuted}`}>{m.completed} concluídas</p>
                        </div>
                        <div className={`rounded-lg p-3 border ${t.card}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <TrendingUp size={11} className="text-blue-500" />
                            <span className={`text-xs ${t.textMuted}`}>Entregues</span>
                          </div>
                          <p className={`text-lg font-bold ${t.text}`}>{Math.round(m.responseRate)}%</p>
                          <p className={`text-xs ${t.textMuted}`}>{m.messagesDelivered} msgs</p>
                        </div>
                        <div className={`rounded-lg p-3 border ${t.card}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <CheckCircle size={11} className="text-emerald-500" />
                            <span className={`text-xs ${t.textMuted}`}>Lidas</span>
                          </div>
                          <p className={`text-lg font-bold ${t.text}`}>{Math.round(m.readRate)}%</p>
                          <p className={`text-xs ${t.textMuted}`}>{m.messagesRead} msgs</p>
                        </div>
                        <div className={`rounded-lg p-3 border ${t.card}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle size={11} className="text-amber-500" />
                            <span className={`text-xs ${t.textMuted}`}>Escaladas</span>
                          </div>
                          <p className={`text-lg font-bold ${t.text}`}>{m.escalated}</p>
                          <p className={`text-xs ${t.textMuted}`}>{m.optouts} opt-outs</p>
                        </div>
                      </div>

                      {/* Breakdown por fluxo */}
                      {Object.keys(m.flowBreakdown).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(m.flowBreakdown).map(([flow, count]) => (
                            <span
                              key={flow}
                              className={`text-xs px-2.5 py-1 rounded-full border ${t.card} ${t.textMuted}`}
                            >
                              {FLOW_LABELS[flow] || flow}: <strong className={t.text}>{count}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Erro expandido */}
                  {isExpanded && log.status === "failed" && log.error_message && (
                    <div className={`px-5 pb-4 ${t.highlight} border-t ${t.divider}`}>
                      <p className="text-xs font-semibold text-red-500 mb-1 pt-3">Mensagem de erro:</p>
                      <p className={`text-xs font-mono ${t.textMuted}`}>{log.error_message}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Carregar mais */}
            {hasMore && (
              <div className={`px-5 py-3 border-t ${t.divider} flex justify-center`}>
                <button
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchLogs(next, true);
                  }}
                  className={`text-sm text-purple-500 hover:text-purple-600 font-medium`}
                >
                  Carregar mais
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
