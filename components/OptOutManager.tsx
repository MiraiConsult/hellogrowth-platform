"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BellOff, Search, Trash2, RefreshCw, UserX, Phone,
  Calendar, AlertTriangle, CheckCircle, Download, Plus, X
} from "lucide-react";

interface Props {
  isDark: boolean;
  tenantId: string;
}

interface OptOutEntry {
  id: string;
  phone: string;
  contact_name?: string;
  reason?: string;
  opted_out_at: string;
  flow_type?: string;
  reactivated?: boolean;
  reactivated_at?: string;
}

interface Stats {
  total: number;
  this_month: number;
  by_flow: Record<string, number>;
}

const FLOW_LABELS: Record<string, string> = {
  detractor: "Detrator",
  promoter: "Promotor",
  passive: "Neutro",
  pre_sale: "Pré-Venda",
  unknown: "Desconhecido",
};

export default function OptOutManager({ isDark, tenantId }: Props) {
  const t = {
    bg: isDark ? "bg-slate-900" : "bg-slate-50",
    card: isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
    text: isDark ? "text-slate-100" : "text-slate-800",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
    input: isDark
      ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
      : "bg-white border-slate-300 text-slate-800 placeholder-slate-400",
    divider: isDark ? "border-slate-700" : "border-slate-200",
    highlight: isDark ? "bg-slate-700" : "bg-slate-100",
    hover: isDark ? "hover:bg-slate-700" : "hover:bg-slate-50",
  };

  const [entries, setEntries] = useState<OptOutEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, this_month: 0, by_flow: {} });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newReason, setNewReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const fetchOptOuts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId });
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/opt-out?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setStats(data.stats || { total: 0, this_month: 0, by_flow: {} });
      }
    } catch (err) {
      console.error("Error fetching opt-outs:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, searchQuery]);

  useEffect(() => {
    fetchOptOuts();
  }, [fetchOptOuts]);

  const handleAddOptOut = async () => {
    if (!newPhone.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/opt-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          phone: newPhone.replace(/\D/g, ""),
          contact_name: newName || undefined,
          reason: newReason || "Manual",
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewPhone("");
        setNewName("");
        setNewReason("");
        await fetchOptOuts();
      }
    } catch (err) {
      console.error("Error adding opt-out:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOptOut = async (id: string) => {
    try {
      await fetch(`/api/opt-out/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      setConfirmRemove(null);
      await fetchOptOuts();
    } catch (err) {
      console.error("Error removing opt-out:", err);
    }
  };

  const handleExportCSV = () => {
    const header = "Telefone,Nome,Motivo,Fluxo,Data\n";
    const rows = entries.map((e) =>
      [
        e.phone,
        e.contact_name || "",
        e.reason || "",
        FLOW_LABELS[e.flow_type || "unknown"] || e.flow_type || "",
        new Date(e.opted_out_at).toLocaleDateString("pt-BR"),
      ].join(",")
    );
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opt-out-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`p-6 max-w-5xl mx-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${t.text} flex items-center gap-2`}>
            <BellOff size={22} className="text-red-500" />
            Opt-Out / Descadastros
          </h1>
          <p className={`text-sm ${t.textMuted} mt-1`}>
            Contatos que solicitaram não receber mensagens automáticas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={entries.length === 0}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t.divider} ${t.text} ${t.hover} text-sm disabled:opacity-40`}
          >
            <Download size={14} />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            <Plus size={14} />
            Adicionar manualmente
          </button>
        </div>
      </div>

      {/* Modal Adicionar */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Adicionar Opt-Out Manual</h2>
              <button onClick={() => setShowAddModal(false)}>
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone (com DDD) *
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="5511999999999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Nome do contato (opcional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ex: Solicitação direta, LGPD..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddOptOut}
                disabled={!newPhone.trim() || saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Remoção */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={20} className="text-amber-500" />
              <h2 className="text-base font-semibold text-gray-900">Reativar contato?</h2>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Ao remover da lista de opt-out, este contato poderá receber mensagens automáticas novamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRemoveOptOut(confirmRemove)}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
              >
                Reativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className={`rounded-xl border ${t.card} p-4`}>
          <p className={`text-xs ${t.textMuted} mb-1`}>Total na lista</p>
          <p className={`text-3xl font-bold text-red-500`}>{stats.total}</p>
          <p className={`text-xs ${t.textMuted} mt-1`}>contatos opt-out</p>
        </div>
        <div className={`rounded-xl border ${t.card} p-4`}>
          <p className={`text-xs ${t.textMuted} mb-1`}>Este mês</p>
          <p className={`text-3xl font-bold ${t.text}`}>{stats.this_month}</p>
          <p className={`text-xs ${t.textMuted} mt-1`}>novos descadastros</p>
        </div>
        <div className={`rounded-xl border ${t.card} p-4`}>
          <p className={`text-xs ${t.textMuted} mb-2`}>Por fluxo</p>
          {Object.keys(stats.by_flow).length === 0 ? (
            <p className={`text-sm ${t.textMuted}`}>Nenhum dado</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(stats.by_flow).map(([flow, count]) => (
                <div key={flow} className="flex items-center justify-between text-xs">
                  <span className={t.textMuted}>{FLOW_LABELS[flow] || flow}</span>
                  <span className={`font-semibold ${t.text}`}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Aviso LGPD */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Conformidade LGPD</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Contatos nesta lista não receberão mensagens automáticas. A remoção da lista deve ser feita
            apenas com consentimento explícito do contato. Mantenha registros de opt-out por no mínimo 5 anos.
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        {/* Header da tabela */}
        <div className={`p-4 border-b ${t.divider} flex items-center justify-between`}>
          <h2 className={`text-sm font-semibold ${t.text}`}>
            Lista de Opt-Out ({entries.length})
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className={`pl-8 pr-3 py-1.5 text-sm rounded-lg border ${t.input} focus:ring-2 focus:ring-red-500 focus:border-transparent w-56`}
              />
            </div>
            <button
              onClick={() => fetchOptOuts()}
              className={`p-1.5 rounded-lg ${t.hover} ${t.textMuted}`}
              title="Atualizar"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
          </div>
        ) : entries.length === 0 ? (
          <div className={`text-center py-12 ${t.textMuted}`}>
            <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
            <p className="text-sm font-medium">Nenhum opt-out registrado</p>
            <p className="text-xs mt-1 opacity-70">
              {searchQuery ? "Nenhum resultado para esta busca" : "Todos os contatos estão ativos"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${t.divider} ${t.highlight}`}>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>
                    Contato
                  </th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>
                    Telefone
                  </th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>
                    Fluxo
                  </th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>
                    Motivo
                  </th>
                  <th className={`text-left px-4 py-3 text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>
                    Data
                  </th>
                  <th className={`text-right px-4 py-3 text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className={`${t.hover} transition-colors`}>
                    <td className={`px-4 py-3`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center bg-red-100`}>
                          <UserX size={13} className="text-red-500" />
                        </div>
                        <span className={`font-medium ${t.text}`}>
                          {entry.contact_name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className={`px-4 py-3`}>
                      <div className="flex items-center gap-1">
                        <Phone size={11} className={t.textMuted} />
                        <span className={`font-mono text-xs ${t.text}`}>{entry.phone}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3`}>
                      {entry.flow_type ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-slate-100 ${t.textMuted} font-medium`}>
                          {FLOW_LABELS[entry.flow_type] || entry.flow_type}
                        </span>
                      ) : (
                        <span className={`text-xs ${t.textMuted}`}>—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3`}>
                      <span className={`text-xs ${t.textMuted}`}>{entry.reason || "Solicitação via WhatsApp"}</span>
                    </td>
                    <td className={`px-4 py-3`}>
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className={t.textMuted} />
                        <span className={`text-xs ${t.textMuted}`}>{formatDate(entry.opted_out_at)}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right`}>
                      <button
                        onClick={() => setConfirmRemove(entry.id)}
                        className={`p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors`}
                        title="Reativar contato (remover do opt-out)"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
