"use client";

import { useState } from "react";
import {
  Download, FileText, Table, Calendar, Filter, RefreshCw,
  CheckCircle, MessageSquare, Users, TrendingUp, BarChart3,
  ThumbsDown, Star, Minus, AlertTriangle, ChevronDown
} from "lucide-react";

interface Props {
  isDark: boolean;
  tenantId: string;
}

type ExportFormat = "csv" | "pdf";
type FlowFilter = "all" | "detractor" | "promoter" | "passive" | "pre_sale";
type StatusFilter = "all" | "completed" | "active" | "escalated" | "dismissed";

const FLOW_OPTIONS: { value: FlowFilter; label: string; icon: any; color: string }[] = [
  { value: "all", label: "Todos os fluxos", icon: BarChart3, color: "text-slate-500" },
  { value: "detractor", label: "Reconquista (NPS 0-6)", icon: ThumbsDown, color: "text-red-500" },
  { value: "passive", label: "Feedback (NPS 7-8)", icon: Minus, color: "text-amber-500" },
  { value: "promoter", label: "Indicação (NPS 9-10)", icon: Star, color: "text-emerald-500" },
  { value: "pre_sale", label: "Pré-Venda", icon: TrendingUp, color: "text-purple-500" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "completed", label: "Concluídas" },
  { value: "active", label: "Ativas" },
  { value: "escalated", label: "Escaladas" },
  { value: "dismissed", label: "Ignoradas" },
];

export default function ConversationExport({ isDark, tenantId }: Props) {
  const t = {
    card: isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
    text: isDark ? "text-slate-100" : "text-slate-800",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
    input: isDark
      ? "bg-slate-700 border-slate-600 text-slate-100"
      : "bg-white border-slate-300 text-slate-800",
    divider: isDark ? "border-slate-700" : "border-slate-200",
    highlight: isDark ? "bg-slate-700/50" : "bg-slate-50",
    label: isDark ? "text-slate-300" : "text-slate-600",
  };

  // Período padrão: últimos 30 dias
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);
  const [flowFilter, setFlowFilter] = useState<FlowFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [includeMessages, setIncludeMessages] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportResult, setExportResult] = useState<{ ok: boolean; message: string; count?: number } | null>(null);

  const presets = [
    { label: "Últimos 7 dias", days: 7 },
    { label: "Últimos 30 dias", days: 30 },
    { label: "Últimos 90 dias", days: 90 },
    { label: "Este mês", days: 0, thisMonth: true },
  ];

  const applyPreset = (days: number, thisMonth?: boolean) => {
    const to = new Date();
    let from: Date;
    if (thisMonth) {
      from = new Date(to.getFullYear(), to.getMonth(), 1);
    } else {
      from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    }
    setDateFrom(from.toISOString().split("T")[0]);
    setDateTo(to.toISOString().split("T")[0]);
  };

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    setExportResult(null);

    try {
      const params = new URLSearchParams({
        tenantId,
        format,
        dateFrom,
        dateTo,
        flow: flowFilter,
        status: statusFilter,
        includeMessages: String(includeMessages),
        includeMetrics: String(includeMetrics),
      });

      const res = await fetch(`/api/conversation-export?${params}`);

      if (!res.ok) {
        const err = await res.json();
        setExportResult({ ok: false, message: err.error || "Erro ao exportar" });
        return;
      }

      // Obter nome do arquivo do header
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `conversas-${dateFrom}-${dateTo}.${format}`;

      // Contar registros do header customizado
      const count = parseInt(res.headers.get("x-record-count") || "0");

      // Download do arquivo
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setExportResult({
        ok: true,
        message: `${count} conversa(s) exportada(s) com sucesso`,
        count,
      });
    } catch (err: any) {
      setExportResult({ ok: false, message: err?.message || "Erro inesperado" });
    } finally {
      setExporting(null);
      setTimeout(() => setExportResult(null), 5000);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
          <Download size={20} className="text-purple-500" />
          Exportar Conversas
        </h1>
        <p className={`text-sm ${t.textMuted} mt-0.5`}>
          Exporte conversas e métricas em CSV ou PDF para análise externa
        </p>
      </div>

      {/* Período */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.divider} flex items-center gap-2 ${t.highlight}`}>
          <Calendar size={14} className="text-purple-500" />
          <h2 className={`text-sm font-semibold ${t.text}`}>Período</h2>
        </div>
        <div className="p-5 space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.days, p.thisMonth)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${t.card} ${t.textMuted} hover:border-purple-300 hover:text-purple-600`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Datas customizadas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-medium ${t.label} block mb-1`}>De</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>
            <div>
              <label className={`text-xs font-medium ${t.label} block mb-1`}>Até</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.divider} flex items-center gap-2 ${t.highlight}`}>
          <Filter size={14} className="text-purple-500" />
          <h2 className={`text-sm font-semibold ${t.text}`}>Filtros</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className={`text-xs font-medium ${t.label} block mb-1`}>Fluxo</label>
            <select
              value={flowFilter}
              onChange={(e) => setFlowFilter(e.target.value as FlowFilter)}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500`}
            >
              {FLOW_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`text-xs font-medium ${t.label} block mb-1`}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500`}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Opções de conteúdo */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.divider} flex items-center gap-2 ${t.highlight}`}>
          <FileText size={14} className="text-purple-500" />
          <h2 className={`text-sm font-semibold ${t.text}`}>Conteúdo do Arquivo</h2>
        </div>
        <div className="p-5 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMessages}
              onChange={(e) => setIncludeMessages(e.target.checked)}
              className="w-4 h-4 rounded accent-purple-600"
            />
            <div>
              <p className={`text-sm font-medium ${t.text}`}>Incluir histórico de mensagens</p>
              <p className={`text-xs ${t.textMuted}`}>
                Todas as mensagens trocadas em cada conversa (aumenta o tamanho do arquivo)
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMetrics}
              onChange={(e) => setIncludeMetrics(e.target.checked)}
              className="w-4 h-4 rounded accent-purple-600"
            />
            <div>
              <p className={`text-sm font-medium ${t.text}`}>Incluir métricas de engajamento</p>
              <p className={`text-xs ${t.textMuted}`}>
                Taxa de resposta, tempo de resposta, status de entrega e leitura
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Resultado */}
      {exportResult && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
          exportResult.ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {exportResult.ok
            ? <CheckCircle size={15} />
            : <AlertTriangle size={15} />}
          <span className="text-sm font-medium">{exportResult.message}</span>
        </div>
      )}

      {/* Botões de exportação */}
      <div className="grid grid-cols-2 gap-4">
        {/* CSV */}
        <button
          onClick={() => handleExport("csv")}
          disabled={!!exporting}
          className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
            exporting === "csv"
              ? "border-purple-300 bg-purple-50"
              : "border-slate-200 hover:border-purple-300 hover:bg-purple-50"
          } ${t.card}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            exporting === "csv" ? "bg-purple-100" : isDark ? "bg-slate-700" : "bg-slate-100"
          }`}>
            {exporting === "csv"
              ? <RefreshCw size={20} className="animate-spin text-purple-500" />
              : <Table size={20} className="text-emerald-600" />}
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold ${t.text}`}>Exportar CSV</p>
            <p className={`text-xs ${t.textMuted} mt-0.5`}>
              Planilha compatível com Excel e Google Sheets
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            exporting === "csv"
              ? "bg-purple-100 text-purple-600"
              : "bg-emerald-100 text-emerald-700"
          }`}>
            {exporting === "csv" ? "Gerando..." : "Download .csv"}
          </span>
        </button>

        {/* PDF */}
        <button
          onClick={() => handleExport("pdf")}
          disabled={!!exporting}
          className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
            exporting === "pdf"
              ? "border-purple-300 bg-purple-50"
              : "border-slate-200 hover:border-purple-300 hover:bg-purple-50"
          } ${t.card}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            exporting === "pdf" ? "bg-purple-100" : isDark ? "bg-slate-700" : "bg-slate-100"
          }`}>
            {exporting === "pdf"
              ? <RefreshCw size={20} className="animate-spin text-purple-500" />
              : <FileText size={20} className="text-red-500" />}
          </div>
          <div className="text-center">
            <p className={`text-sm font-semibold ${t.text}`}>Exportar PDF</p>
            <p className={`text-xs ${t.textMuted} mt-0.5`}>
              Relatório formatado para apresentação e arquivo
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            exporting === "pdf"
              ? "bg-purple-100 text-purple-600"
              : "bg-red-100 text-red-700"
          }`}>
            {exporting === "pdf" ? "Gerando..." : "Download .pdf"}
          </span>
        </button>
      </div>

      {/* Nota informativa */}
      <div className={`flex items-start gap-2 p-3 rounded-lg ${t.highlight} border ${t.divider}`}>
        <MessageSquare size={13} className="text-purple-500 flex-shrink-0 mt-0.5" />
        <p className={`text-xs ${t.textMuted}`}>
          Os arquivos exportados contêm dados pessoais dos clientes. Mantenha-os em local seguro e em conformidade com a LGPD. O acesso deve ser restrito aos responsáveis pelo relacionamento com o cliente.
        </p>
      </div>
    </div>
  );
}
