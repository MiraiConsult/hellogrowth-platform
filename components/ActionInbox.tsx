'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, MessageSquare, CheckCircle, Clock, AlertTriangle, TrendingUp,
  Users, Star, Heart, Send, Eye, ChevronRight, Loader2, RefreshCw,
  Filter, Search, ThumbsUp, ThumbsDown, Minus, Phone, X, Check,
  Bot, User, ArrowRight, Sparkles, Bell
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
  status: 'pending' | 'approved' | 'sent' | 'replied' | 'completed' | 'dismissed';
  created_at: string;
  conversation_id?: string;
  nps_score?: number;
  lead_services?: string[];
}

interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  status: string;
  sent_at: string;
  approved_by?: string;
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

const FLOW_CONFIG = {
  detractor: {
    label: 'Detrator',
    icon: ThumbsDown,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
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
    description: 'Iniciar abordagem comercial',
  },
};

export default function ActionInbox({ isDark, tenantId }: Props) {
  const t = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    input: isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400',
    label: isDark ? 'text-slate-300' : 'text-slate-600',
    divider: isDark ? 'border-slate-700' : 'border-slate-200',
    highlight: isDark ? 'bg-slate-700' : 'bg-slate-50',
    hover: isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50',
  };

  const [actions, setActions] = useState<ActionItem[]>([]);
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConv, setLoadingConv] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'detractor' | 'promoter' | 'passive' | 'pre_sale'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingDraft, setEditingDraft] = useState('');
  const [stats, setStats] = useState({ pending: 0, active: 0, completed: 0, total: 0 });

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/action-inbox?tenantId=${tenantId}&filter=${filter}&type=${typeFilter}`);
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions || []);
        setStats(data.stats || { pending: 0, active: 0, completed: 0, total: 0 });
      }
    } catch (err) {
      console.error('Error fetching actions:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filter, typeFilter]);

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
    fetchActions();
  }, [fetchActions]);

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
        await fetchActions();
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
      await fetchActions();
      if (selectedAction?.id === actionId) {
        setSelectedAction(null);
        setConversation(null);
      }
    } catch (err) {
      console.error('Error dismissing action:', err);
    }
  };

  const filteredActions = actions.filter((a) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.contact_name.toLowerCase().includes(q) || a.contact_phone.includes(q);
    }
    return true;
  });

  const getPriorityDot = (priority: string) => {
    if (priority === 'high') return 'bg-red-500';
    if (priority === 'medium') return 'bg-amber-500';
    return 'bg-slate-400';
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  return (
    <div className={`flex h-screen ${t.bg}`} style={{ height: 'calc(100vh - 64px)' }}>

      {/* Coluna esquerda: Lista de ações */}
      <div className={`w-96 flex-shrink-0 border-r ${t.divider} flex flex-col`}>

        {/* Header com stats */}
        <div className={`p-4 border-b ${t.divider}`}>
          <div className="flex items-center justify-between mb-3">
            <h1 className={`text-lg font-bold ${t.text}`}>Fila de Ações</h1>
            <button onClick={fetchActions} className={`p-1.5 rounded-lg ${t.hover} ${t.textMuted}`}>
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Stats rápidos */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Pendentes', value: stats.pending, color: 'text-amber-500' },
              { label: 'Ativos', value: stats.active, color: 'text-blue-500' },
              { label: 'Concluídos', value: stats.completed, color: 'text-emerald-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-lg p-2 text-center ${t.highlight}`}>
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className={`text-xs ${t.textMuted}`}>{label}</p>
              </div>
            ))}
          </div>

          {/* Busca */}
          <div className="relative mb-2">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contato..."
              className={`w-full pl-8 pr-3 py-2 text-sm rounded-lg border ${t.input}`}
            />
          </div>

          {/* Filtros de tipo */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'detractor', 'promoter', 'passive', 'pre_sale'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                  typeFilter === type
                    ? 'bg-purple-600 text-white'
                    : `${t.highlight} ${t.textMuted} hover:bg-purple-100 hover:text-purple-700`
                }`}
              >
                {type === 'all' ? 'Todos' :
                 type === 'detractor' ? 'Detratores' :
                 type === 'promoter' ? 'Promotores' :
                 type === 'passive' ? 'Neutros' : 'Pré-Venda'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de ações */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-purple-500" size={24} />
            </div>
          ) : filteredActions.length === 0 ? (
            <div className={`text-center py-12 px-4 ${t.textMuted}`}>
              <Zap size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Nenhuma ação pendente</p>
              <p className="text-xs mt-1">A IA monitorará novos eventos automaticamente</p>
            </div>
          ) : (
            filteredActions.map((action) => {
              const config = FLOW_CONFIG[action.type];
              const Icon = config.icon;
              const isSelected = selectedAction?.id === action.id;

              return (
                <button
                  key={action.id}
                  onClick={() => handleSelectAction(action)}
                  className={`w-full text-left p-4 border-b ${t.divider} transition-colors ${
                    isSelected
                      ? isDark ? 'bg-slate-700' : 'bg-purple-50'
                      : t.hover
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                      <Icon size={16} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-sm font-semibold ${t.text} truncate`}>{action.contact_name}</span>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityDot(action.priority)}`} />
                      </div>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${config.badgeBg} ${config.badgeText}`}>
                        {config.label}
                        {action.nps_score !== undefined && ` • NPS ${action.nps_score}`}
                      </span>
                      <p className={`text-xs mt-1 ${t.textMuted} line-clamp-2`}>{action.trigger_summary}</p>
                      <p className={`text-xs mt-1 ${t.textMuted}`}>{formatTime(action.created_at)}</p>
                    </div>
                    {action.status === 'pending' && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Coluna direita: Detalhe da ação */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedAction ? (
          <div className={`flex-1 flex items-center justify-center ${t.textMuted}`}>
            <div className="text-center">
              <Sparkles size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Selecione uma ação</p>
              <p className="text-sm mt-1">A IA já preparou a mensagem ideal para cada contato</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header do detalhe */}
            <div className={`p-4 border-b ${t.divider} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${FLOW_CONFIG[selectedAction.type].bg}`}>
                  {React.createElement(FLOW_CONFIG[selectedAction.type].icon, {
                    size: 18,
                    className: FLOW_CONFIG[selectedAction.type].color,
                  })}
                </div>
                <div>
                  <p className={`font-semibold ${t.text}`}>{selectedAction.contact_name}</p>
                  <p className={`text-sm ${t.textMuted}`}>{selectedAction.contact_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDismiss(selectedAction.id)}
                  className={`p-2 rounded-lg ${t.hover} ${t.textMuted} text-sm`}
                  title="Ignorar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Contexto do gatilho */}
            <div className={`p-4 border-b ${t.divider}`}>
              <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-700' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-start gap-2">
                  <Bell size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'} mb-0.5`}>
                      Por que a IA recomenda agir agora
                    </p>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-amber-800'}`}>
                      {selectedAction.trigger_summary}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Histórico de conversa (se existir) */}
            {conversation && conversation.messages.length > 0 && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm ${
                        msg.direction === 'outbound'
                          ? 'bg-purple-600 text-white rounded-br-sm'
                          : isDark ? 'bg-slate-700 text-slate-100 rounded-bl-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : ''}`}>
                        <span className={`text-xs opacity-70`}>
                          {new Date(msg.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.direction === 'outbound' && (
                          <span className="text-xs opacity-70">
                            {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Editor de mensagem da IA */}
            <div className={`p-4 border-t ${t.divider}`}>
              <div className="flex items-center gap-2 mb-2">
                <Bot size={14} className="text-purple-500" />
                <span className={`text-xs font-semibold text-purple-600`}>Mensagem sugerida pela IA</span>
                <span className={`text-xs ${t.textMuted}`}>— você pode editar antes de enviar</span>
              </div>
              <textarea
                value={editingDraft}
                onChange={(e) => setEditingDraft(e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 text-sm rounded-xl border resize-none ${t.input} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                placeholder="Mensagem da IA..."
              />
              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs ${t.textMuted}`}>
                  {editingDraft.length} caracteres
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDismiss(selectedAction.id)}
                    className={`px-4 py-2 text-sm rounded-lg border ${t.divider} ${t.textMuted} ${t.hover} font-medium`}
                  >
                    Ignorar
                  </button>
                  <button
                    onClick={handleApproveAndSend}
                    disabled={sendingMessage || !editingDraft.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {sendingMessage ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
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
