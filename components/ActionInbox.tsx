'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap, MessageSquare, CheckCircle, Clock, AlertTriangle, TrendingUp,
  Users, Star, Heart, Send, Eye, ChevronRight, Loader2, RefreshCw,
  Filter, Search, ThumbsUp, ThumbsDown, Minus, Phone, X, Check,
  Bot, User, ArrowRight, Sparkles, Bell, ChevronLeft, ChevronDown,
  BarChart2, MessageCircle, CheckSquare, AlertCircle, Inbox,
  MoreVertical, Copy, RotateCcw, ExternalLink
} from 'lucide-react';

interface Props {
  isDark: boolean;
  tenantId: string;
}

interface ActionItem {
  id: string;
  type: 'detractor' | 'promoter' | 'passive' | 'pre_sale';
  priority: 'high' | 'medium' | 'low';
  contact_name: string;
  contact_phone: string;
  trigger_summary: string;
  ai_recommendation: string;
  status: 'pending' | 'draft' | 'active' | 'waiting_reply' | 'completed' | 'dismissed' | 'escalated';
  created_at: string;
  last_message_at?: string;
  conversation_id?: string;
  nps_score?: number;
  lead_services?: string[];
  message_count?: number;
}

interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  status: string;
  sent_at: string;
  approved_by?: string;
  ai_reasoning?: string;
}

interface Conversation {
  id: string;
  contact_name: string;
  contact_phone: string;
  status: string;
  flow_type: string;
  messages: ConversationMessage[];
  ai_draft?: string;
}

interface Stats {
  pending: number;
  active: number;
  completed: number;
  total: number;
  by_type: {
    detractor: number;
    promoter: number;
    passive: number;
    pre_sale: number;
  };
  response_rate: number;
  avg_messages: number;
}

const FLOW_CONFIG = {
  detractor: {
    label: 'Detrator',
    icon: ThumbsDown,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    darkBg: 'bg-red-900/20',
    description: 'Recuperar cliente insatisfeito',
  },
  promoter: {
    label: 'Promotor',
    icon: Star,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    darkBg: 'bg-emerald-900/20',
    description: 'Pedir indicação',
  },
  passive: {
    label: 'Neutro',
    icon: Minus,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    darkBg: 'bg-amber-900/20',
    description: 'Coletar feedback',
  },
  pre_sale: {
    label: 'Pré-Venda',
    icon: TrendingUp,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    darkBg: 'bg-purple-900/20',
    description: 'Iniciar abordagem comercial',
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: 'Pendente', color: 'text-amber-500', dot: 'bg-amber-500' },
  draft: { label: 'Rascunho', color: 'text-blue-500', dot: 'bg-blue-500' },
  active: { label: 'Ativo', color: 'text-green-500', dot: 'bg-green-500' },
  waiting_reply: { label: 'Aguardando', color: 'text-purple-500', dot: 'bg-purple-500' },
  escalated: { label: '⚠ Escalado', color: 'text-red-600', dot: 'bg-red-500' },
  completed: { label: 'Concluído', color: 'text-slate-400', dot: 'bg-slate-400' },
  dismissed: { label: 'Ignorado', color: 'text-slate-300', dot: 'bg-slate-300' },
};

const PAGE_SIZE = 20;

export default function ActionInbox({ isDark, tenantId }: Props) {
  const t = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    input: isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400',
    label: isDark ? 'text-slate-300' : 'text-slate-600',
    divider: isDark ? 'border-slate-700' : 'border-slate-200',
    highlight: isDark ? 'bg-slate-700' : 'bg-slate-100',
    hover: isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50',
    selected: isDark ? 'bg-slate-700' : 'bg-purple-50',
  };

  const [actions, setActions] = useState<ActionItem[]>([]);
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConv, setLoadingConv] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'detractor' | 'promoter' | 'passive' | 'pre_sale'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingDraft, setEditingDraft] = useState('');
  const [stats, setStats] = useState<Stats>({
    pending: 0, active: 0, completed: 0, total: 0,
    by_type: { detractor: 0, promoter: 0, passive: 0, pre_sale: 0 },
    response_rate: 0, avg_messages: 0,
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [showReasoningId, setShowReasoningId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchActions = useCallback(async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        filter: statusFilter,
        type: typeFilter,
        page: String(pageNum),
        pageSize: String(PAGE_SIZE),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      const res = await fetch(`/api/action-inbox?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setActions((prev) => [...prev, ...(data.actions || [])]);
        } else {
          setActions(data.actions || []);
        }
        setStats(data.stats || stats);
        setTotalCount(data.total || 0);
        setHasMore((data.actions || []).length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Error fetching actions:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter, typeFilter, searchQuery]);

  const fetchConversation = useCallback(async (conversationId: string) => {
    setLoadingConv(true);
    try {
      const res = await fetch(`/api/action-inbox/conversation?id=${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        setEditingDraft(data.conversation?.ai_draft || '');
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
    } finally {
      setLoadingConv(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchActions(1, false);
  }, [fetchActions]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation?.messages]);

  const handleSelectAction = async (action: ActionItem) => {
    setSelectedAction(action);
    if (action.conversation_id) {
      await fetchConversation(action.conversation_id);
    } else {
      setConversation(null);
      setEditingDraft(action.ai_recommendation);
    }
  };

  const handleApproveAndSend = async () => {
    if (!selectedAction || !editingDraft.trim()) return;
    setSendingMessage(true);
    try {
      const res = await fetch('/api/action-inbox/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId: selectedAction.id,
          conversationId: selectedAction.conversation_id,
          message: editingDraft,
          tenantId,
        }),
      });
      if (res.ok) {
        await fetchActions(1, false);
        if (selectedAction.conversation_id) {
          await fetchConversation(selectedAction.conversation_id);
        }
      }
    } catch (err) {
      console.error('Error approving message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDismiss = async (actionId: string) => {
    try {
      await fetch('/api/action-inbox/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, tenantId }),
      });
      await fetchActions(1, false);
      if (selectedAction?.id === actionId) {
        setSelectedAction(null);
        setConversation(null);
      }
    } catch (err) {
      console.error('Error dismissing action:', err);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedAction) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/action-inbox/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedAction.conversation_id,
          tenantId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditingDraft(data.message || editingDraft);
      }
    } catch (err) {
      console.error('Error regenerating:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(editingDraft);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActions(nextPage, true);
  };

  const getPriorityDot = (priority: string) => {
    if (priority === 'high') return 'bg-red-500';
    if (priority === 'medium') return 'bg-amber-500';
    return 'bg-slate-400';
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const formatFullTime = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className={`flex h-screen ${t.bg}`} style={{ height: 'calc(100vh - 64px)' }}>

      {/* ============================================================
          COLUNA ESQUERDA: Lista de ações
      ============================================================ */}
      <div className={`w-96 flex-shrink-0 border-r ${t.divider} flex flex-col`}>

        {/* Header */}
        <div className={`p-4 border-b ${t.divider}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Inbox size={18} className="text-purple-500" />
              <h1 className={`text-base font-bold ${t.text}`}>Fila de Ações</h1>
              {totalCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  {totalCount}
                </span>
              )}
            </div>
            <button
              onClick={() => fetchActions(1, false)}
              className={`p-1.5 rounded-lg ${t.hover} ${t.textMuted} transition-colors`}
              title="Atualizar"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Stats rápidos */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {[
              { label: 'Pendentes', value: stats.pending, color: 'text-amber-500', filter: 'pending' as const },
              { label: 'Ativos', value: stats.active, color: 'text-blue-500', filter: 'active' as const },
              { label: 'Concluídos', value: stats.completed, color: 'text-emerald-500', filter: 'completed' as const },
              { label: 'Total', value: stats.total, color: t.textMuted, filter: 'all' as const },
            ].map(({ label, value, color, filter: f }) => (
              <button
                key={label}
                onClick={() => setStatusFilter(f)}
                className={`rounded-lg p-2 text-center transition-all ${
                  statusFilter === f
                    ? isDark ? 'bg-purple-900/40 ring-1 ring-purple-500' : 'bg-purple-50 ring-1 ring-purple-300'
                    : t.highlight
                }`}
              >
                <p className={`text-base font-bold ${color}`}>{value}</p>
                <p className={`text-xs ${t.textMuted} leading-tight`}>{label}</p>
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="relative mb-2">
            <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border ${t.input} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textMuted}`}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filtros de tipo */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'detractor', 'promoter', 'passive', 'pre_sale'] as const).map((type) => {
              const count = type === 'all' ? stats.total : (stats.by_type?.[type] || 0);
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                    typeFilter === type
                      ? 'bg-purple-600 text-white'
                      : `${t.highlight} ${t.textMuted} hover:bg-purple-100 hover:text-purple-700`
                  }`}
                >
                  {type === 'all' ? 'Todos' :
                   type === 'detractor' ? 'Detratores' :
                   type === 'promoter' ? 'Promotores' :
                   type === 'passive' ? 'Neutros' : 'Pré-Venda'}
                  {count > 0 && type !== 'all' && (
                    <span className={`text-xs rounded-full px-1 ${typeFilter === type ? 'bg-purple-500' : isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de ações */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-purple-500" size={24} />
            </div>
          ) : actions.length === 0 ? (
            <div className={`text-center py-12 px-4 ${t.textMuted}`}>
              <Zap size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Nenhuma ação encontrada</p>
              <p className="text-xs mt-1 opacity-70">
                {searchQuery ? 'Tente outro termo de busca' : 'A IA monitorará novos eventos automaticamente'}
              </p>
            </div>
          ) : (
            <>
              {actions.map((action) => {
                const config = FLOW_CONFIG[action.type];
                const Icon = config.icon;
                const isSelected = selectedAction?.id === action.id;
                const statusCfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.pending;

                return (
                  <button
                    key={action.id}
                    onClick={() => handleSelectAction(action)}
                    className={`w-full text-left p-3.5 border-b ${t.divider} transition-colors ${
                      isSelected ? t.selected : t.hover
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar com ícone do fluxo */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? config.darkBg : config.bg}`}>
                        <Icon size={15} className={config.color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Nome + prioridade + tempo */}
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-sm font-semibold ${t.text} truncate`}>{action.contact_name}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(action.priority)}`} />
                            <span className={`text-xs ${t.textMuted}`}>{formatTime(action.created_at)}</span>
                          </div>
                        </div>

                        {/* Badge de tipo + status */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${isDark ? config.darkBg : config.badgeBg} ${config.badgeText}`}>
                            {config.label}
                            {action.nps_score !== undefined && ` • ${action.nps_score}`}
                          </span>
                          <span className={`flex items-center gap-0.5 text-xs ${statusCfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Resumo do gatilho */}
                        <p className={`text-xs ${t.textMuted} line-clamp-2 leading-relaxed`}>
                          {action.trigger_summary}
                        </p>

                        {/* Contagem de mensagens */}
                        {(action.message_count || 0) > 0 && (
                          <div className={`flex items-center gap-1 mt-1 text-xs ${t.textMuted}`}>
                            <MessageCircle size={10} />
                            <span>{action.message_count} mensagem{action.message_count !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Indicador de não lido */}
                      {(action.status === 'pending' || action.status === 'draft') && (
                        <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
                      )}
                      {/* Badge de escalada */}
                      {action.status === 'escalated' && (
                        <span className="flex-shrink-0 mt-1" title="Escalado para humano">
                          <AlertTriangle size={14} className="text-red-500" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Botão de carregar mais */}
              {hasMore && (
                <div className="p-3 text-center">
                  <button
                    onClick={handleLoadMore}
                    className={`text-sm font-medium text-purple-500 hover:text-purple-600 flex items-center gap-1 mx-auto`}
                  >
                    <ChevronDown size={14} />
                    Carregar mais
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============================================================
          COLUNA DIREITA: Detalhe da ação
      ============================================================ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedAction ? (
          /* Estado vazio */
          <div className={`flex-1 flex items-center justify-center ${t.textMuted}`}>
            <div className="text-center max-w-sm">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
                <Sparkles size={28} className="text-purple-400" />
              </div>
              <p className={`text-base font-semibold ${t.text} mb-1`}>Selecione uma ação</p>
              <p className="text-sm">A IA já preparou a mensagem ideal para cada contato. Revise e aprove com um clique.</p>

              {/* Métricas rápidas no estado vazio */}
              {stats.total > 0 && (
                <div className={`mt-6 grid grid-cols-2 gap-3 text-left`}>
                  <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
                    <p className={`text-xs ${t.textMuted} mb-1`}>Taxa de resposta</p>
                    <p className={`text-xl font-bold ${t.text}`}>{stats.response_rate}%</p>
                  </div>
                  <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
                    <p className={`text-xs ${t.textMuted} mb-1`}>Média de mensagens</p>
                    <p className={`text-xl font-bold ${t.text}`}>{stats.avg_messages}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* ---- Header do detalhe ---- */}
            <div className={`p-4 border-b ${t.divider} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? FLOW_CONFIG[selectedAction.type].darkBg : FLOW_CONFIG[selectedAction.type].bg}`}>
                  {React.createElement(FLOW_CONFIG[selectedAction.type].icon, {
                    size: 18,
                    className: FLOW_CONFIG[selectedAction.type].color,
                  })}
                </div>
                <div>
                  <p className={`font-semibold ${t.text}`}>{selectedAction.contact_name}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${t.textMuted}`}>{selectedAction.contact_phone}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isDark ? FLOW_CONFIG[selectedAction.type].darkBg : FLOW_CONFIG[selectedAction.type].badgeBg} ${FLOW_CONFIG[selectedAction.type].badgeText}`}>
                      {FLOW_CONFIG[selectedAction.type].label}
                      {selectedAction.nps_score !== undefined && ` • NPS ${selectedAction.nps_score}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <a
                  href={`https://wa.me/${selectedAction.contact_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg ${t.hover} text-green-500`}
                  title="Abrir no WhatsApp"
                >
                  <Phone size={15} />
                </a>
                <button
                  onClick={() => handleDismiss(selectedAction.id)}
                  className={`p-2 rounded-lg ${t.hover} ${t.textMuted}`}
                  title="Ignorar ação"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ---- Contexto do gatilho ---- */}
            <div className={`px-4 pt-3 pb-2 border-b ${t.divider}`}>
              <div className={`rounded-xl p-3 ${isDark ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-start gap-2">
                  <Bell size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'} mb-0.5`}>
                      Por que agir agora
                    </p>
                    <p className={`text-sm ${isDark ? 'text-amber-200' : 'text-amber-800'} leading-relaxed`}>
                      {selectedAction.trigger_summary}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Histórico de conversa ---- */}
            {loadingConv ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-purple-500" size={20} />
              </div>
            ) : conversation && conversation.messages.length > 0 ? (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {conversation.messages.map((msg) => (
                  <div key={msg.id}>
                    <div className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-sm rounded-2xl px-3.5 py-2.5 text-sm ${
                        msg.direction === 'outbound'
                          ? 'bg-purple-600 text-white rounded-br-sm'
                          : isDark
                            ? 'bg-slate-700 text-slate-100 rounded-bl-sm'
                            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1.5 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : ''}`}>
                          <span className="text-xs opacity-60">
                            {new Date(msg.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.direction === 'outbound' && (
                            <span
                              className="flex items-center text-xs"
                              title={msg.status === 'read' ? 'Lida' : msg.status === 'delivered' ? 'Entregue' : msg.status === 'failed' ? 'Falha no envio' : 'Enviada'}
                            >
                              {msg.status === 'read' ? (
                                <span className="font-bold text-blue-300">✓✓</span>
                              ) : msg.status === 'delivered' ? (
                                <span className="font-bold opacity-70">✓✓</span>
                              ) : msg.status === 'failed' ? (
                                <span className="font-bold text-red-300">!</span>
                              ) : (
                                <span className="opacity-40">✓</span>
                              )}
                            </span>
                          )}
                          {msg.approved_by && (
                            <span className="text-xs opacity-60">• {msg.approved_by}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Raciocínio da IA (colapsável) */}
                    {msg.ai_reasoning && msg.direction === 'outbound' && (
                      <div className="flex justify-end mt-1">
                        <button
                          onClick={() => setShowReasoningId(showReasoningId === msg.id ? null : msg.id)}
                          className={`text-xs flex items-center gap-1 ${t.textMuted} hover:text-purple-500`}
                        >
                          <Bot size={10} />
                          {showReasoningId === msg.id ? 'Ocultar raciocínio' : 'Ver raciocínio da IA'}
                        </button>
                      </div>
                    )}
                    {showReasoningId === msg.id && msg.ai_reasoning && (
                      <div className={`mt-1 ml-auto max-w-sm rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                        <p className="font-medium mb-0.5 text-purple-500">Raciocínio da IA:</p>
                        <p className="leading-relaxed">{msg.ai_reasoning}</p>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className={`flex-1 flex items-center justify-center ${t.textMuted}`}>
                <div className="text-center">
                  <MessageCircle size={24} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                  <p className="text-xs mt-0.5 opacity-70">Aprove a mensagem abaixo para iniciar a conversa</p>
                </div>
              </div>
            )}

            {/* ---- Editor de mensagem da IA ---- */}
            <div className={`p-4 border-t ${t.divider}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot size={13} className="text-purple-500" />
                  <span className="text-xs font-semibold text-purple-600">Mensagem sugerida pela IA</span>
                  <span className={`text-xs ${t.textMuted}`}>— edite se necessário</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyDraft}
                    className={`p-1.5 rounded-lg ${t.hover} ${t.textMuted} text-xs flex items-center gap-1`}
                    title="Copiar mensagem"
                  >
                    {copySuccess ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className={`p-1.5 rounded-lg ${t.hover} ${t.textMuted}`}
                    title="Regenerar mensagem"
                  >
                    {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                  </button>
                </div>
              </div>

              <textarea
                value={editingDraft}
                onChange={(e) => setEditingDraft(e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 text-sm rounded-xl border resize-none ${t.input} focus:ring-2 focus:ring-purple-500 focus:border-transparent leading-relaxed`}
                placeholder="Mensagem da IA..."
              />

              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${t.textMuted}`}>
                  {editingDraft.length} caracteres
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDismiss(selectedAction.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${t.divider} ${t.textMuted} ${t.hover} font-medium`}
                  >
                    Ignorar
                  </button>
                  <button
                    onClick={handleApproveAndSend}
                    disabled={sendingMessage || !editingDraft.trim()}
                    className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {sendingMessage ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} />
                    )}
                    {sendingMessage ? 'Enviando...' : 'Aprovar e Enviar'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
