'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  History, Trash2, RotateCcw, Search, Loader2, FileText, BarChart2,
  Package, Users, Briefcase, RefreshCw, AlertTriangle, CheckCircle2,
  Filter, X, ChevronLeft, ChevronRight, Clock, Eye, Plus, Edit2,
  Trash, Send, Download, Upload, LogIn, LogOut, Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TabType = 'historico' | 'lixeira';
type EntityType = 'forms' | 'campaigns' | 'leads' | 'products_services' | 'colaboradores';
type LogEntityType = 'form' | 'campaign' | 'lead' | 'product' | 'company' | 'colaborador' | 'note' | 'session' | 'report' | 'integration' | 'other';
type LogAction = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'restore' | 'send' | 'view' | 'export' | 'import' | 'error';

interface DeletedItem {
  id: string;
  name: string;
  type: EntityType;
  typeLabel: string;
  deletedAt: string;
  extra?: string;
}

interface ActivityLog {
  id: string;
  tenant_id?: string;
  user_email?: string;
  user_name?: string;
  action: LogAction;
  entity_type: LogEntityType;
  entity_id?: string;
  entity_name?: string;
  details?: Record<string, any>;
  error_message?: string;
  is_error: boolean;
  created_at: string;
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const TRASH_TYPE_CONFIG: Record<EntityType, { label: string; icon: React.ReactNode; color: string; nameField: string; extraField?: string }> = {
  forms:             { label: 'Formulário',   icon: <FileText size={14} />,  color: 'bg-blue-100 text-blue-700',    nameField: 'name', extraField: 'tenant_id' },
  campaigns:         { label: 'Campanha NPS', icon: <BarChart2 size={14} />, color: 'bg-purple-100 text-purple-700', nameField: 'name', extraField: 'tenant_id' },
  leads:             { label: 'Lead',         icon: <Users size={14} />,     color: 'bg-green-100 text-green-700',  nameField: 'name', extraField: 'email' },
  products_services: { label: 'Produto',      icon: <Package size={14} />,   color: 'bg-orange-100 text-orange-700', nameField: 'name', extraField: 'tenant_id' },
  colaboradores:     { label: 'Colaborador',  icon: <Briefcase size={14} />, color: 'bg-sky-100 text-sky-700',      nameField: 'name', extraField: 'email' },
};

const ACTION_CONFIG: Record<LogAction, { label: string; icon: React.ReactNode; color: string }> = {
  login:   { label: 'Login',    icon: <LogIn size={13} />,      color: 'bg-blue-100 text-blue-700' },
  logout:  { label: 'Logout',   icon: <LogOut size={13} />,     color: 'bg-gray-100 text-gray-600' },
  create:  { label: 'Criou',    icon: <Plus size={13} />,       color: 'bg-emerald-100 text-emerald-700' },
  update:  { label: 'Editou',   icon: <Edit2 size={13} />,      color: 'bg-yellow-100 text-yellow-700' },
  delete:  { label: 'Excluiu',  icon: <Trash size={13} />,      color: 'bg-red-100 text-red-700' },
  restore: { label: 'Restaurou',icon: <RotateCcw size={13} />,  color: 'bg-teal-100 text-teal-700' },
  send:    { label: 'Enviou',   icon: <Send size={13} />,       color: 'bg-violet-100 text-violet-700' },
  view:    { label: 'Visualizou',icon: <Eye size={13} />,       color: 'bg-slate-100 text-slate-600' },
  export:  { label: 'Exportou', icon: <Download size={13} />,   color: 'bg-indigo-100 text-indigo-700' },
  import:  { label: 'Importou', icon: <Upload size={13} />,     color: 'bg-cyan-100 text-cyan-700' },
  error:   { label: 'Erro',     icon: <AlertTriangle size={13} />, color: 'bg-red-100 text-red-700' },
};

const ENTITY_LABELS: Record<LogEntityType, string> = {
  form: 'Formulário', campaign: 'Campanha', lead: 'Lead', product: 'Produto',
  company: 'Empresa', colaborador: 'Colaborador', note: 'Anotação',
  session: 'Sessão', report: 'Relatório', integration: 'Integração', other: 'Outro',
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────

interface Props { isDark?: boolean; }

export default function AdminHistorico({ isDark = false }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('historico');

  // Lixeira state
  const [trashItems, setTrashItems] = useState<DeletedItem[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [trashSearch, setTrashSearch] = useState('');
  const [trashFilterType, setTrashFilterType] = useState<EntityType | 'all'>('all');

  // Histórico state
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsFilterAction, setLogsFilterAction] = useState<LogAction | 'all'>('all');
  const [logsFilterEntity, setLogsFilterEntity] = useState<LogEntityType | 'all'>('all');
  const [logsFilterError, setLogsFilterError] = useState<'all' | 'errors_only'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── LIXEIRA ───────────────────────────────────────────────────────────────

  const fetchTrash = useCallback(async () => {
    setTrashLoading(true);
    try {
      const results = await Promise.all(
        (Object.keys(TRASH_TYPE_CONFIG) as EntityType[]).map(async (type) => {
          const cfg = TRASH_TYPE_CONFIG[type];
          const fields = ['id', cfg.nameField, 'deleted_at', cfg.extraField].filter(Boolean).join(', ');
          const { data } = await supabase.from(type).select(fields).not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
          return (data || []).map((row: any) => ({
            id: row.id, name: row[cfg.nameField] || '(sem nome)', type, typeLabel: cfg.label,
            deletedAt: row.deleted_at, extra: cfg.extraField ? row[cfg.extraField] : undefined,
          } as DeletedItem));
        })
      );
      setTrashItems(results.flat().sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()));
    } catch { showToast('error', 'Erro ao carregar lixeira'); }
    finally { setTrashLoading(false); }
  }, []);

  const handleRestore = async (item: DeletedItem) => {
    setRestoring(item.id);
    try {
      const { error } = await supabase.from(item.type).update({ deleted_at: null }).eq('id', item.id);
      if (error) throw error;
      setTrashItems(prev => prev.filter(i => i.id !== item.id));
      showToast('success', `"${item.name}" restaurado com sucesso!`);
    } catch { showToast('error', 'Erro ao restaurar item'); }
    finally { setRestoring(null); }
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (!confirm(`Excluir permanentemente "${item.name}"? Esta ação não pode ser desfeita.`)) return;
    setRestoring(item.id);
    try {
      const { error } = await supabase.from(item.type).delete().eq('id', item.id);
      if (error) throw error;
      setTrashItems(prev => prev.filter(i => i.id !== item.id));
      showToast('success', `"${item.name}" excluído permanentemente.`);
    } catch { showToast('error', 'Erro ao excluir permanentemente'); }
    finally { setRestoring(null); }
  };

  // ─── HISTÓRICO ─────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        ...(logsSearch && { search: logsSearch }),
        ...(logsFilterAction !== 'all' && { action: logsFilterAction }),
        ...(logsFilterEntity !== 'all' && { entity_type: logsFilterEntity }),
        ...(logsFilterError === 'errors_only' && { is_error: 'true' }),
      });
      const res = await fetch(`/api/admin/activity-logs?${params}`);
      const json = await res.json();
      setLogs(json.data || []);
      setLogsTotal(json.count || 0);
      setLogsPage(page);
    } catch { showToast('error', 'Erro ao carregar histórico'); }
    finally { setLogsLoading(false); }
  }, [logsSearch, logsFilterAction, logsFilterEntity, logsFilterError]);

  useEffect(() => { if (activeTab === 'lixeira') fetchTrash(); }, [activeTab, fetchTrash]);
  useEffect(() => { if (activeTab === 'historico') fetchLogs(1); }, [activeTab, fetchLogs]);

  // ─── STYLES ────────────────────────────────────────────────────────────────

  const bg = isDark ? 'bg-gray-950' : 'bg-slate-50';
  const surface = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';
  const text = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-gray-400' : 'text-slate-500';
  const inputCls = isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const rowHover = isDark ? 'hover:bg-gray-800/60' : 'hover:bg-slate-50';
  const divider = isDark ? 'divide-gray-800' : 'divide-slate-100';
  const borderColor = isDark ? 'border-gray-800' : 'border-slate-100';

  const filteredTrash = trashItems.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(trashSearch.toLowerCase()) || (item.extra || '').toLowerCase().includes(trashSearch.toLowerCase());
    const matchType = trashFilterType === 'all' || item.type === trashFilterType;
    return matchSearch && matchType;
  });

  const totalPages = Math.ceil(logsTotal / 50);

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen ${bg} px-6 py-6`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'historico' ? 'bg-violet-100' : 'bg-red-100'}`}>
            {activeTab === 'historico' ? <History size={20} className="text-violet-600" /> : <Trash2 size={20} className="text-red-600" />}
          </div>
          <div>
            <h1 className={`text-xl font-bold ${text}`}>{activeTab === 'historico' ? 'Histórico de Atividades' : 'Lixeira'}</h1>
            <p className={`text-sm ${textSub}`}>
              {activeTab === 'historico' ? `${logsTotal} eventos registrados` : `${trashItems.length} item${trashItems.length !== 1 ? 's' : ''} excluído${trashItems.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => activeTab === 'historico' ? fetchLogs(logsPage) : fetchTrash()}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${surface} ${textSub} hover:opacity-80`}
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 p-1 rounded-xl mb-6 w-fit ${isDark ? 'bg-gray-800' : 'bg-slate-100'}`}>
        <button
          onClick={() => setActiveTab('historico')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'historico' ? 'bg-violet-600 text-white shadow-sm' : `${textSub} hover:opacity-80`}`}
        >
          <Activity size={15} />
          Histórico
        </button>
        <button
          onClick={() => setActiveTab('lixeira')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'lixeira' ? 'bg-red-600 text-white shadow-sm' : `${textSub} hover:opacity-80`}`}
        >
          <Trash2 size={15} />
          Lixeira
        </button>
      </div>

      {/* ── HISTÓRICO ── */}
      {activeTab === 'historico' && (
        <>
          {/* Filtros do histórico */}
          <div className={`${surface} border rounded-xl p-4 mb-4`}>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSub}`} />
                <input
                  type="text"
                  placeholder="Buscar por empresa, email ou item..."
                  value={logsSearch}
                  onChange={e => setLogsSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchLogs(1)}
                  className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${inputCls}`}
                />
              </div>
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${showFilters ? 'bg-violet-600 text-white border-violet-600' : `${surface} ${textSub}`}`}
              >
                <Filter size={14} />
                Filtros
              </button>
              <button
                onClick={() => fetchLogs(1)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700"
              >
                <Search size={14} />
                Buscar
              </button>
              {(logsFilterAction !== 'all' || logsFilterEntity !== 'all' || logsFilterError !== 'all' || logsSearch) && (
                <button
                  onClick={() => { setLogsSearch(''); setLogsFilterAction('all'); setLogsFilterEntity('all'); setLogsFilterError('all'); }}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50"
                >
                  <X size={14} />
                  Limpar
                </button>
              )}
            </div>

            {showFilters && (
              <div className={`mt-4 pt-4 border-t ${borderColor} flex flex-wrap gap-4`}>
                {/* Filtro por ação */}
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textSub}`}>Ação</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'create', 'update', 'delete', 'send', 'error'] as const).map(a => (
                      <button
                        key={a}
                        onClick={() => setLogsFilterAction(a)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${logsFilterAction === a ? 'bg-violet-600 text-white border-violet-600' : isDark ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        {a === 'all' ? 'Todas' : ACTION_CONFIG[a].label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Filtro por entidade */}
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textSub}`}>Tipo</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'form', 'campaign', 'lead', 'product', 'colaborador'] as const).map(e => (
                      <button
                        key={e}
                        onClick={() => setLogsFilterEntity(e)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${logsFilterEntity === e ? 'bg-violet-600 text-white border-violet-600' : isDark ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        {e === 'all' ? 'Todos' : ENTITY_LABELS[e]}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Filtro por erros */}
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textSub}`}>Status</p>
                  <div className="flex gap-1.5">
                    {(['all', 'errors_only'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setLogsFilterError(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${logsFilterError === s ? (s === 'errors_only' ? 'bg-red-600 text-white border-red-600' : 'bg-violet-600 text-white border-violet-600') : isDark ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        {s === 'all' ? 'Todos' : 'Somente Erros'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tabela de logs */}
          <div className={`${surface} border rounded-xl overflow-hidden`}>
            {logsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-violet-500" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Activity size={40} className={textSub} />
                <p className={`text-sm ${textSub}`}>Nenhum evento registrado ainda</p>
                <p className={`text-xs ${textSub} max-w-xs text-center`}>As ações dos clientes (criar, editar, excluir) aparecerão aqui automaticamente</p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-slate-100 bg-slate-50'}`}>
                      <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Data/Hora</th>
                      <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Cliente</th>
                      <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Ação</th>
                      <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Item</th>
                      <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Tipo</th>
                      <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divider}`}>
                    {logs.map(log => {
                      const actionCfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.error;
                      const isExpanded = expandedLog === log.id;
                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            className={`transition-colors cursor-pointer ${rowHover} ${log.is_error ? (isDark ? 'bg-red-950/20' : 'bg-red-50/50') : ''}`}
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                          >
                            <td className={`px-4 py-3 text-xs ${textSub} whitespace-nowrap`}>
                              <div className="flex items-center gap-1.5">
                                <Clock size={12} />
                                {new Date(log.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className={`px-4 py-3 text-sm`}>
                              <div className={`font-medium ${text}`}>{log.user_name || '—'}</div>
                              <div className={`text-xs ${textSub}`}>{log.user_email || log.tenant_id?.substring(0, 12) || '—'}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${actionCfg.color}`}>
                                {actionCfg.icon}
                                {actionCfg.label}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-sm ${text} max-w-48 truncate`}>
                              {log.entity_name || log.entity_id?.substring(0, 12) || '—'}
                            </td>
                            <td className={`px-4 py-3 text-xs ${textSub}`}>
                              {ENTITY_LABELS[log.entity_type] || log.entity_type}
                            </td>
                            <td className="px-4 py-3">
                              {log.is_error ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                  <AlertTriangle size={11} />
                                  Erro
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 size={11} />
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className={isDark ? 'bg-gray-900/50' : 'bg-slate-50/80'}>
                              <td colSpan={6} className="px-6 py-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  {log.error_message && (
                                    <div className="col-span-2">
                                      <p className="text-xs font-semibold text-red-500 mb-1">Mensagem de Erro</p>
                                      <p className={`text-xs font-mono ${isDark ? 'bg-red-950/30 text-red-300' : 'bg-red-50 text-red-700'} p-2 rounded-lg`}>{log.error_message}</p>
                                    </div>
                                  )}
                                  {log.entity_id && (
                                    <div>
                                      <p className={`text-xs font-semibold ${textSub} mb-1`}>ID do Item</p>
                                      <p className={`text-xs font-mono ${textSub}`}>{log.entity_id}</p>
                                    </div>
                                  )}
                                  {log.tenant_id && (
                                    <div>
                                      <p className={`text-xs font-semibold ${textSub} mb-1`}>Tenant ID</p>
                                      <p className={`text-xs font-mono ${textSub}`}>{log.tenant_id}</p>
                                    </div>
                                  )}
                                  {log.details && Object.keys(log.details).length > 0 && (
                                    <div className="col-span-2">
                                      <p className={`text-xs font-semibold ${textSub} mb-1`}>Detalhes</p>
                                      <pre className={`text-xs font-mono ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-slate-100 text-slate-700'} p-2 rounded-lg overflow-auto max-h-32`}>
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className={`flex items-center justify-between px-4 py-3 border-t ${borderColor}`}>
                    <p className={`text-xs ${textSub}`}>
                      Página {logsPage} de {totalPages} — {logsTotal} eventos
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchLogs(logsPage - 1)}
                        disabled={logsPage === 1}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-40 ${surface} ${textSub}`}
                      >
                        <ChevronLeft size={14} />
                        Anterior
                      </button>
                      <button
                        onClick={() => fetchLogs(logsPage + 1)}
                        disabled={logsPage >= totalPages}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-40 ${surface} ${textSub}`}
                      >
                        Próxima
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── LIXEIRA ── */}
      {activeTab === 'lixeira' && (
        <>
          {/* Filtros da lixeira */}
          <div className={`${surface} border rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center`}>
            <div className="relative flex-1 min-w-48">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSub}`} />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={trashSearch}
                onChange={e => setTrashSearch(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${inputCls}`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', ...Object.keys(TRASH_TYPE_CONFIG)] as (EntityType | 'all')[]).map(type => (
                <button
                  key={type}
                  onClick={() => setTrashFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${trashFilterType === type ? 'bg-red-600 text-white border-red-600' : isDark ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {type === 'all' ? 'Todos' : TRASH_TYPE_CONFIG[type as EntityType].label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela da lixeira */}
          <div className={`${surface} border rounded-xl overflow-hidden`}>
            {trashLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-red-500" />
              </div>
            ) : filteredTrash.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Trash2 size={40} className={textSub} />
                <p className={`text-sm ${textSub}`}>Nenhum item na lixeira</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-slate-100 bg-slate-50'}`}>
                    <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Item</th>
                    <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Tipo</th>
                    <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Info</th>
                    <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Excluído em</th>
                    <th className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Ações</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${divider}`}>
                  {filteredTrash.map(item => {
                    const cfg = TRASH_TYPE_CONFIG[item.type];
                    const isProcessing = restoring === item.id;
                    return (
                      <tr key={`${item.type}-${item.id}`} className={`transition-colors ${rowHover}`}>
                        <td className={`px-4 py-3 text-sm font-medium ${text}`}>{item.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-xs ${textSub} max-w-48 truncate`}>{item.extra || '—'}</td>
                        <td className={`px-4 py-3 text-xs ${textSub}`}>
                          {new Date(item.deletedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRestore(item)}
                              disabled={isProcessing}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                              Restaurar
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(item)}
                              disabled={isProcessing}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
