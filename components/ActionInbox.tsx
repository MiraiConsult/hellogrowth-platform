'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Zap, MessageSquare, CheckCircle, Clock, AlertTriangle, TrendingUp,
  Users, Star, Heart, Send, Eye, ChevronRight, Loader2, RefreshCw,
  Filter, Search, ThumbsUp, ThumbsDown, Minus, Phone, X, Check,
  Bot, User, ArrowRight, Sparkles, Bell, ChevronLeft, ChevronDown,
  BarChart2, MessageCircle, CheckSquare, AlertCircle, Inbox,
  MoreVertical, Copy, RotateCcw, ExternalLink, Info, CalendarDays,
  FileText, BarChart3, GitBranch, ChevronUp, Package
} from 'lucide-react';

// ---- Tipos de objetivo da conversa ----
type ConversationObjectiveType =
  | 'schedule_first'
  | 'reschedule'
  | 'post_consultation'
  | 'close_budget'
  | 'reactivate';

interface Props {
  isDark: boolean;
  tenantId: string;
  actionsModule?: 'none' | 'simplified' | 'complete';
}

interface FlowStatus {
  dispatch_campaign_id: string;
  phone: string;
  lead_id?: string;
  current_step: 'confirmation' | 'anamnese' | 'insistence' | 'postsale_pending' | 'postsale_sent' | 'done';
  status: 'active' | 'paused' | 'completed';
  flow_config: any;
  last_action_at?: string;
  next_action_at?: string;
  insistence_count?: number;
}

interface ClientInfo {
  anamnese?: {
    answered_at?: string;
    answers?: Record<string, any>;
    ai_analysis?: string;
    suggested_products?: string[];
  };
  nps?: {
    score?: number;
    answered_at?: string;
    comment?: string;
    campaign_name?: string;
  }[];
  products?: { name: string; value: number }[];
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
  ai_draft_id?: string;
  mode?: 'approval_required' | 'auto';
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

export default function ActionInbox({ isDark, tenantId, actionsModule = 'none' }: Props) {
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
  const [conversationMode, setConversationMode] = useState<'approval_required' | 'auto'>('approval_required');
  const [settingMode, setSettingMode] = useState(false);
  // Fluxo simplificado
  const [flowStatus, setFlowStatus] = useState<FlowStatus | null>(null);
  const [loadingFlowStatus, setLoadingFlowStatus] = useState(false);
  const [confirmingConsultation, setConfirmingConsultation] = useState(false);
  const [showPostsaleModal, setShowPostsaleModal] = useState(false);
  const [postsaleNpsId, setPostsaleNpsId] = useState('');
  // Painel de informações do cliente
  const [showClientInfo, setShowClientInfo] = useState(false);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loadingClientInfo, setLoadingClientInfo] = useState(false);
  // Modal de objetivo da conversa
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState<ConversationObjectiveType>('schedule_first');
  const [objectiveContext, setObjectiveContext] = useState('');
  const [objectiveNpsFormId, setObjectiveNpsFormId] = useState('');
  const [objectiveNpsFormName, setObjectiveNpsFormName] = useState('');
  const [sendNpsAfterConsultation, setSendNpsAfterConsultation] = useState(false);
  const [availableForms, setAvailableForms] = useState<Array<{id: string; name: string}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

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

  const fetchConversation = useCallback(async (conversationId: string, silent = false) => {
    if (!silent) setLoadingConv(true);
    try {
      const res = await fetch(`/api/action-inbox/conversation?id=${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        if (!silent) {
          setEditingDraft(data.conversation?.ai_draft || '');
        } else if (data.conversation?.ai_draft) {
          // Em modo silent, atualiza draft apenas se houver novo draft
          setEditingDraft(prev => data.conversation.ai_draft || prev);
        }
        setConversationMode(data.conversation?.mode || 'approval_required');
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
    } finally {
      if (!silent) setLoadingConv(false);
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

  // Auto-refresh: atualiza a conversa a cada 5s quando há conversa ativa em waiting_reply
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (selectedAction?.conversation_id && selectedAction?.status === 'waiting_reply') {
      autoRefreshRef.current = setInterval(() => {
        fetchConversation(selectedAction.conversation_id!, true);
      }, 5000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [selectedAction?.conversation_id, selectedAction?.status, fetchConversation]);

  const handleSelectAction = async (action: ActionItem) => {
    setSelectedAction(action);
    setShowClientInfo(false);
    setClientInfo(null);
    setFlowStatus(null);
    if (action.conversation_id) {
      await fetchConversation(action.conversation_id);
    } else {
      setConversation(null);
      setEditingDraft(action.ai_recommendation);
    }
    // Buscar fluxo simplificado se módulo ativo
    if (actionsModule === 'simplified') {
      fetchFlowStatus(action.contact_phone);
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

  const handleSetMode = async (mode: 'approval_required' | 'auto') => {
    if (!selectedAction?.conversation_id || !conversation) return;
    setSettingMode(true);
    try {
      const res = await fetch('/api/action-inbox/set-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          mode,
          tenantId,
        }),
      });
      if (res.ok) {
        setConversationMode(mode);
        setConversation(prev => prev ? { ...prev, mode } : prev);
      }
    } catch (err) {
      console.error('Error setting mode:', err);
    } finally {
      setSettingMode(false);
    }
  };

  // Buscar pesquisas NPS disponíveis para o select do modal
  const fetchForms = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (!error && data) {
        setAvailableForms(data.map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch (err) {
      console.error('Error fetching NPS campaigns:', err);
    }
  }, [tenantId]);

  // Abrir modal de objetivo
  const handleOpenObjectiveModal = () => {
    setSelectedObjective('schedule_first');
    setObjectiveContext('');
    setObjectiveNpsFormId('');
    setObjectiveNpsFormName('');
    setSendNpsAfterConsultation(false);
    fetchForms();
    setShowObjectiveModal(true);
  };

  // Ativar modo auto E enviar a primeira mensagem imediatamente
  const handleActivateAutoAndSend = async (objective?: {
    type: ConversationObjectiveType;
    context?: string;
    npsFormId?: string;
    npsFormName?: string;
  }) => {
    if (!selectedAction?.conversation_id || !conversation) return;
    setShowObjectiveModal(false);
    setSettingMode(true);
    try {
      // Atualizar UI imediatamente para feedback visual
      setConversationMode('auto');
      setConversation(prev => prev ? { ...prev, mode: 'auto' } : prev);

      const res = await fetch('/api/action-inbox/activate-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          tenantId,
          objective,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[ActionInbox] Modo auto ativado:', data);
        // Recarregar mensagens após envio (com delay para aguardar o envio)
        setTimeout(() => {
          if (selectedAction?.conversation_id) {
            fetchConversation(selectedAction.conversation_id);
          }
        }, 3000);
      } else {
        console.error('[ActionInbox] Erro ao ativar modo auto');
        // Reverter UI em caso de erro
        setConversationMode('approval_required');
        setConversation(prev => prev ? { ...prev, mode: 'approval_required' } : prev);
      }
    } catch (err) {
      console.error('Error activating auto mode:', err);
      setConversationMode('approval_required');
      setConversation(prev => prev ? { ...prev, mode: 'approval_required' } : prev);
    } finally {
      setSettingMode(false);
    }
  };

  // Buscar status do fluxo simplificado para o contato selecionado
  const fetchFlowStatus = useCallback(async (phone: string) => {
    if (!tenantId || actionsModule !== 'simplified') return;
    setLoadingFlowStatus(true);
    try {
      const { data } = await supabase
        .from('dispatch_flow_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      setFlowStatus(data || null);
    } catch {
      setFlowStatus(null);
    } finally {
      setLoadingFlowStatus(false);
    }
  }, [tenantId, actionsModule]);

  // Buscar informações do cliente (anamnese, NPS, produtos)
  const fetchClientInfo = useCallback(async (phone: string, leadId?: string) => {
    if (!tenantId) return;
    setLoadingClientInfo(true);
    try {
      const info: ClientInfo = {};

      // Buscar anamnese (lead com respostas)
      if (leadId) {
        const { data: lead } = await supabase
          .from('leads')
          .select('answers, created_at')
          .eq('id', leadId)
          .single();
        if (lead?.answers) {
          info.anamnese = {
            answered_at: lead.created_at,
            answers: lead.answers,
            ai_analysis: lead.answers?._ai_analysis,
            suggested_products: lead.answers?._suggested_products,
          };
        }
      }

      // Buscar respostas NPS pelo telefone
      const { data: npsResponses } = await supabase
        .from('nps_responses')
        .select('score, created_at, comment, campaign_id, campaigns(name)')
        .eq('tenant_id', tenantId)
        .or(`phone.eq.${phone},respondent_phone.eq.${phone}`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (npsResponses && npsResponses.length > 0) {
        info.nps = npsResponses.map((r: any) => ({
          score: r.score,
          answered_at: r.created_at,
          comment: r.comment,
          campaign_name: r.campaigns?.name,
        }));
      }

      // Buscar produtos do catálogo
      const { data: products } = await supabase
        .from('products_services')
        .select('name, value')
        .eq('tenant_id', tenantId)
        .limit(10);
      if (products) info.products = products;

      setClientInfo(info);
    } catch (err) {
      console.error('Error fetching client info:', err);
    } finally {
      setLoadingClientInfo(false);
    }
  }, [tenantId]);

  // Confirmar consulta realizada e liberar pós-venda
  const handleConfirmConsultation = async () => {
    if (!flowStatus || !selectedAction) return;
    setConfirmingConsultation(true);
    try {
      await supabase
        .from('dispatch_flow_configs')
        .update({
          current_step: 'postsale_pending',
          consultation_confirmed_at: new Date().toISOString(),
        })
        .eq('dispatch_campaign_id', flowStatus.dispatch_campaign_id)
        .eq('phone', flowStatus.phone);
      setShowPostsaleModal(true);
      await fetchFlowStatus(selectedAction.contact_phone);
    } finally {
      setConfirmingConsultation(false);
    }
  };

  // Enviar pós-venda
  const handleSendPostsale = async () => {
    if (!flowStatus || !selectedAction || !postsaleNpsId) return;
    setConfirmingConsultation(true);
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${base}/nps/${postsaleNpsId}`;
      const firstName = selectedAction.contact_name.split(' ')[0];
      const message = `Olá ${firstName}! 😊 Gostaríamos muito de saber como foi sua consulta. Leva menos de 2 minutos: ${link}`;

      await fetch('/api/whatsapp/send-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          phone: selectedAction.contact_phone,
          message,
          recipientName: selectedAction.contact_name,
          npsId: postsaleNpsId,
        }),
      });

      await supabase
        .from('dispatch_flow_configs')
        .update({
          current_step: 'postsale_sent',
          postsale_sent_at: new Date().toISOString(),
          postsale_nps_id: postsaleNpsId,
        })
        .eq('dispatch_campaign_id', flowStatus.dispatch_campaign_id)
        .eq('phone', flowStatus.phone);

      setShowPostsaleModal(false);
      setPostsaleNpsId('');
      await fetchFlowStatus(selectedAction.contact_phone);
    } finally {
      setConfirmingConsultation(false);
    }
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
    <>
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

                        {/* Tags de etapa do fluxo simplificado */}
                        {actionsModule === 'simplified' && (action as any).flow_step && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              (action as any).flow_step === 'confirmation' ? 'bg-purple-100 text-purple-700' :
                              (action as any).flow_step === 'anamnese' ? 'bg-blue-100 text-blue-700' :
                              (action as any).flow_step === 'insistence' ? 'bg-amber-100 text-amber-700' :
                              (action as any).flow_step === 'postsale_pending' ? 'bg-orange-100 text-orange-700' :
                              (action as any).flow_step === 'postsale_sent' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {(action as any).flow_step === 'confirmation' ? '📅 Confirmação' :
                               (action as any).flow_step === 'anamnese' ? '📋 Anamnese' :
                               (action as any).flow_step === 'insistence' ? '🔁 Insistência' :
                               (action as any).flow_step === 'postsale_pending' ? '⏳ Aguarda pós-venda' :
                               (action as any).flow_step === 'postsale_sent' ? '✅ Pós-venda enviado' :
                               '✓ Concluído'}
                            </span>
                            {(action as any).waiting_user && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                ⚠ Aguarda você
                              </span>
                            )}
                          </div>
                        )}

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
          COLUNA DIREITA: Detalhe da ação (estilo WhatsApp Web)
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
            {/* ---- Header estilo WhatsApp (verde/roxo com info do contato) ---- */}
            <div className={`px-4 py-3 flex items-center justify-between ${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-[#f0f2f5] border-b border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 text-white font-bold text-sm`}>
                  {selectedAction.contact_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className={`font-semibold text-[15px] ${t.text}`}>{selectedAction.contact_name}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-xs ${t.textMuted}`}>{selectedAction.contact_phone}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isDark ? FLOW_CONFIG[selectedAction.type].darkBg : FLOW_CONFIG[selectedAction.type].badgeBg} ${FLOW_CONFIG[selectedAction.type].badgeText}`}>
                      {FLOW_CONFIG[selectedAction.type].label}
                      {selectedAction.nps_score !== undefined && selectedAction.nps_score !== null && ` • NPS ${selectedAction.nps_score}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Botão de informações do cliente */}
                <button
                  onClick={() => {
                    if (!showClientInfo) {
                      fetchClientInfo(selectedAction.contact_phone, (selectedAction as any).lead_id);
                    }
                    setShowClientInfo(!showClientInfo);
                  }}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    showClientInfo
                      ? 'bg-purple-600 text-white'
                      : `${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`
                  }`}
                  title="Informações do cliente"
                >
                  <Info size={13} />
                  <span className="hidden sm:inline">Info</span>
                </button>
                {/* Toggle modo IA */}
                {selectedAction.conversation_id && (
                  <div className={`flex items-center gap-0.5 rounded-lg p-0.5 border ${t.divider} ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                    <button
                      onClick={() => handleSetMode('approval_required')}
                      disabled={settingMode}
                      title="Modo Aprovação: IA gera draft, você aprova antes de enviar"
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                        conversationMode === 'approval_required'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : `${t.textMuted} hover:text-purple-500`
                      }`}
                    >
                      <User size={10} />
                      <span>Aprovação</span>
                    </button>
                    <button
                      onClick={() => {
                        // Se não há mensagens enviadas ainda, abre modal de objetivo
                        const hasMessages = conversation?.messages?.some(
                          (m: ConversationMessage) => m.direction === 'outbound' && m.status === 'sent'
                        );
                        if (!hasMessages && conversationMode !== 'auto') {
                          handleOpenObjectiveModal();
                        } else {
                          handleSetMode('auto');
                        }
                      }}
                      disabled={settingMode}
                      title="Modo Automático: IA inicia e responde sozinha"
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                        conversationMode === 'auto'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : `${t.textMuted} hover:text-emerald-500`
                      }`}
                    >
                      <Bot size={10} />
                      <span>Auto</span>
                    </button>
                  </div>
                )}
                <a
                  href={`https://wa.me/${selectedAction.contact_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-lg ${t.hover} text-green-500`}
                  title="Abrir no WhatsApp"
                >
                  <ExternalLink size={15} />
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

            {/* ---- Layout com painel de info opcional ---- */}
            <div className="flex flex-1 overflow-hidden">

            {/* ---- Área de chat estilo WhatsApp (fundo com padrão) ---- */}
            <div className={`flex-1 overflow-y-auto relative`} style={{
              backgroundColor: isDark ? '#0b141a' : '#efeae2',
              backgroundImage: isDark
                ? 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M0 20h40M20 0v40\' stroke=\'%23ffffff\' stroke-width=\'0.3\' opacity=\'0.03\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23p)\'/%3E%3C/svg%3E")'
                : 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M0 20h40M20 0v40\' stroke=\'%23000000\' stroke-width=\'0.3\' opacity=\'0.03\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23p)\'/%3E%3C/svg%3E")'
            }}>
              {/* Contexto do gatilho (banner compacto no topo) */}
              <div className="px-4 pt-3 pb-1">
                <div className={`rounded-lg px-3 py-2 text-center ${isDark ? 'bg-slate-800/80 border border-slate-700' : 'bg-white/80 border border-amber-200'} backdrop-blur-sm shadow-sm`}>
                  <div className="flex items-center justify-center gap-2">
                    <Bell size={11} className="text-amber-500" />
                    <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      {selectedAction.trigger_summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status bar do fluxo simplificado */}
              {actionsModule === 'simplified' && flowStatus && (
                <div className="px-4 pb-2">
                  <div className={`rounded-xl border p-3 ${
                    flowStatus.current_step === 'postsale_pending'
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-white/90 border-slate-200'
                  } backdrop-blur-sm shadow-sm`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <GitBranch size={12} className="text-purple-600" />
                          <span className="text-xs font-semibold text-gray-700">Fluxo Simplificado</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            flowStatus.current_step === 'confirmation' ? 'bg-purple-100 text-purple-700' :
                            flowStatus.current_step === 'anamnese' ? 'bg-blue-100 text-blue-700' :
                            flowStatus.current_step === 'insistence' ? 'bg-amber-100 text-amber-700' :
                            flowStatus.current_step === 'postsale_pending' ? 'bg-orange-100 text-orange-700' :
                            flowStatus.current_step === 'postsale_sent' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {flowStatus.current_step === 'confirmation' ? 'Aguardando confirmação' :
                             flowStatus.current_step === 'anamnese' ? 'Aguardando anamnese' :
                             flowStatus.current_step === 'insistence' ? 'Insistindo' :
                             flowStatus.current_step === 'postsale_pending' ? '⏳ Aguarda sua confirmação' :
                             flowStatus.current_step === 'postsale_sent' ? 'Pós-venda enviado' :
                             'Concluído'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600">
                          {flowStatus.current_step === 'postsale_pending'
                            ? '⚠️ Aguardando sua confirmação de que a consulta foi realizada para enviar o pós-venda.'
                            : flowStatus.current_step === 'postsale_sent'
                            ? '✅ Pós-venda enviado com sucesso.'
                            : flowStatus.current_step === 'done'
                            ? '✅ Fluxo concluído.'
                            : `Status: aguardando cliente responder. ${flowStatus.last_action_at ? `Última ação: ${new Date(flowStatus.last_action_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}`
                          }
                        </p>
                        {flowStatus.current_step === 'insistence' && flowStatus.next_action_at && (
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Próximo reenvio: {new Date(flowStatus.next_action_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      {/* Botão de ação conforme etapa */}
                      {flowStatus.current_step === 'postsale_pending' && (
                        <button
                          onClick={() => setShowPostsaleModal(true)}
                          disabled={confirmingConsultation}
                          className="flex items-center gap-1 bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-green-700 transition flex-shrink-0"
                        >
                          {confirmingConsultation ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                          Consulta realizada
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Mensagens */}
              {loadingConv ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="animate-spin text-purple-500" size={20} />
                </div>
              ) : conversation && conversation.messages.length > 0 ? (
                <div className="px-6 py-3 space-y-1.5">
                  {conversation.messages.map((msg, idx) => {
                    // Agrupar por data
                    const msgDate = new Date(msg.sent_at).toLocaleDateString('pt-BR');
                    const prevDate = idx > 0 ? new Date(conversation.messages[idx - 1].sent_at).toLocaleDateString('pt-BR') : null;
                    const showDateSeparator = idx === 0 || msgDate !== prevDate;

                    return (
                      <div key={msg.id}>
                        {showDateSeparator && (
                          <div className="flex justify-center my-3">
                            <span className={`text-xs px-3 py-1 rounded-lg shadow-sm ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600'}`}>
                              {msgDate === new Date().toLocaleDateString('pt-BR') ? 'Hoje' : msgDate}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`relative max-w-[65%] rounded-lg px-3 py-2 text-[14px] shadow-sm ${
                            msg.direction === 'outbound'
                              ? isDark ? 'bg-[#005c4b] text-slate-100' : 'bg-[#d9fdd3] text-slate-900'
                              : isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-900'
                          }`} style={{
                            borderRadius: msg.direction === 'outbound' ? '8px 8px 0 8px' : '8px 8px 8px 0'
                          }}>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-0.5 ${msg.direction === 'outbound' ? 'justify-end' : ''}`}>
                              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {new Date(msg.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {msg.direction === 'outbound' && (
                                <span className="flex items-center text-[11px]">
                                  {msg.status === 'read' ? (
                                    <span className="font-bold text-blue-500">✓✓</span>
                                  ) : msg.status === 'delivered' ? (
                                    <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>✓✓</span>
                                  ) : msg.status === 'failed' ? (
                                    <span className="font-bold text-red-500">!</span>
                                  ) : (
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>✓</span>
                                  )}
                                </span>
                              )}
                              {msg.approved_by && (
                                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {msg.approved_by === 'ai_auto' ? '🤖' : '👤'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Raciocínio da IA (colapsável) */}
                        {msg.ai_reasoning && msg.direction === 'outbound' && (
                          <div className="flex justify-end mt-0.5">
                            <button
                              onClick={() => setShowReasoningId(showReasoningId === msg.id ? null : msg.id)}
                              className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-500 hover:text-purple-400' : 'text-slate-400 hover:text-purple-500'}`}
                            >
                              <Bot size={9} />
                              {showReasoningId === msg.id ? 'Ocultar' : 'Raciocínio IA'}
                            </button>
                          </div>
                        )}
                        {showReasoningId === msg.id && msg.ai_reasoning && (
                          <div className={`mt-1 ml-auto max-w-[65%] rounded-lg px-3 py-2 text-xs ${isDark ? 'bg-slate-800/90 text-slate-400 border border-slate-700' : 'bg-white/90 text-slate-500 border border-slate-200'} backdrop-blur-sm`}>
                            <p className="font-medium mb-0.5 text-purple-500 text-[10px]">Raciocínio:</p>
                            <p className="leading-relaxed text-[11px]">{msg.ai_reasoning}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center h-40">
                  <div className={`text-center ${t.textMuted}`}>
                    <MessageCircle size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
                    {conversationMode === 'auto' ? (
                      <div className={`mt-3 rounded-xl px-4 py-3 ${isDark ? 'bg-emerald-900/30 border border-emerald-800/40' : 'bg-emerald-50 border border-emerald-200'}`}>
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Bot size={14} className="text-emerald-500" />
                          {settingMode ? (
                            <p className={`text-xs font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Enviando primeira mensagem...</p>
                          ) : (
                            <p className={`text-xs font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Modo Automático Ativo</p>
                          )}
                        </div>
                        <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {settingMode
                            ? 'A IA está gerando e enviando a primeira mensagem...'
                            : 'A IA irá responder automaticamente quando o cliente responder'
                          }
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs mt-1 opacity-70">Envie a primeira mensagem abaixo, ou ative o modo automático para a IA iniciar a conversa sozinha</p>
                        {selectedAction.conversation_id && (
                          <button
                            onClick={handleOpenObjectiveModal}
                            disabled={settingMode}
                            className={`mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white transition-colors shadow-sm`}
                          >
                            {settingMode ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                            {settingMode ? 'Enviando...' : 'Ativar Automático'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ---- Painel lateral de informações do cliente ---- */}
            {showClientInfo && (
              <div className={`w-80 flex-shrink-0 border-l ${t.divider} overflow-y-auto ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <div className={`p-4 border-b ${t.divider} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Info size={15} className="text-purple-600" />
                    <span className={`font-semibold text-sm ${t.text}`}>Informações do Cliente</span>
                  </div>
                  <button onClick={() => setShowClientInfo(false)} className={`p-1 rounded-lg ${t.hover} ${t.textMuted}`}>
                    <X size={14} />
                  </button>
                </div>

                {loadingClientInfo ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-purple-500" size={20} />
                  </div>
                ) : (
                  <div className="p-4 space-y-5">

                    {/* Anamnese */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={14} className="text-blue-600" />
                        <span className={`text-xs font-semibold ${t.text}`}>Anamnese</span>
                      </div>
                      {clientInfo?.anamnese ? (
                        <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-700' : 'bg-blue-50'} space-y-2`}>
                          <p className="text-[11px] text-gray-500">
                            Respondida em: {clientInfo.anamnese.answered_at ? new Date(clientInfo.anamnese.answered_at).toLocaleDateString('pt-BR') : 'N/A'}
                          </p>
                          {clientInfo.anamnese.ai_analysis && (
                            <div>
                              <p className="text-[10px] font-semibold text-purple-600 mb-0.5">Análise da IA:</p>
                              <p className="text-[11px] text-gray-700 leading-relaxed">{clientInfo.anamnese.ai_analysis}</p>
                            </div>
                          )}
                          {clientInfo.anamnese.suggested_products && Array.isArray(clientInfo.anamnese.suggested_products) && clientInfo.anamnese.suggested_products.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-green-600 mb-1">Produtos sugeridos:</p>
                              <div className="flex flex-wrap gap-1">
                                {clientInfo.anamnese.suggested_products.map((p: string, i: number) => (
                                  <span key={i} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{p}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {clientInfo.anamnese.answers && (
                            <div>
                              <p className="text-[10px] font-semibold text-gray-500 mb-1">Respostas:</p>
                              <div className="space-y-1">
                                {Object.entries(clientInfo.anamnese.answers)
                                  .filter(([k]) => !k.startsWith('_'))
                                  .slice(0, 5)
                                  .map(([k, v]: [string, any]) => (
                                    <div key={k}>
                                      <p className="text-[10px] text-gray-500">{k}</p>
                                      <p className="text-[11px] text-gray-800 font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className={`text-xs ${t.textMuted} italic`}>Nenhuma anamnese respondida</p>
                      )}
                    </div>

                    {/* Respostas NPS */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 size={14} className="text-green-600" />
                        <span className={`text-xs font-semibold ${t.text}`}>Pesquisas NPS</span>
                      </div>
                      {clientInfo?.nps && clientInfo.nps.length > 0 ? (
                        <div className="space-y-2">
                          {clientInfo.nps.map((nps, i) => (
                            <div key={i} className={`rounded-xl p-3 ${isDark ? 'bg-slate-700' : 'bg-green-50'}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-gray-500">{nps.campaign_name || 'Pesquisa'}</span>
                                <span className={`text-sm font-bold ${
                                  (nps.score || 0) >= 9 ? 'text-green-600' :
                                  (nps.score || 0) >= 7 ? 'text-amber-600' : 'text-red-600'
                                }`}>{nps.score}/10</span>
                              </div>
                              {nps.comment && <p className="text-[11px] text-gray-700 italic">"{nps.comment}"</p>}
                              <p className="text-[10px] text-gray-400 mt-1">{nps.answered_at ? new Date(nps.answered_at).toLocaleDateString('pt-BR') : ''}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`text-xs ${t.textMuted} italic`}>Nenhuma resposta NPS</p>
                      )}
                    </div>

                    {/* Produtos do catálogo */}
                    {clientInfo?.products && clientInfo.products.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Package size={14} className="text-purple-600" />
                          <span className={`text-xs font-semibold ${t.text}`}>Catálogo de Produtos</span>
                        </div>
                        <div className="space-y-1">
                          {clientInfo.products.slice(0, 8).map((p, i) => (
                            <div key={i} className={`flex items-center justify-between py-1 px-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                              <span className="text-[11px] text-gray-800">{p.name}</span>
                              <span className="text-[11px] font-medium text-purple-600">
                                {p.value > 0 ? `R$ ${p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            </div>{/* fim div flex layout (chat + painel info) */}

            {/* ---- Barra de input estilo WhatsApp (compacta) ---- */}
            <div className={`px-3 py-2 ${isDark ? 'bg-slate-800 border-t border-slate-700' : 'bg-[#f0f2f5] border-t border-slate-200'}`}>
              {/* Banner modo automático (compacto) */}
              {conversationMode === 'auto' && (
                <div className={`mb-2 rounded-lg px-3 py-1.5 flex items-center gap-2 ${isDark ? 'bg-emerald-900/30 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <Bot size={12} className="text-emerald-500 flex-shrink-0" />
                  <p className={`text-[11px] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    <span className="font-semibold">Modo Auto</span> — IA responde sozinha
                  </p>
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* Botões de ação à esquerda */}
                <div className="flex items-center gap-0.5 pb-1">
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                    title="Regenerar mensagem"
                  >
                    {regenerating ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                  </button>
                  <button
                    onClick={handleCopyDraft}
                    className={`p-2 rounded-full ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                    title="Copiar mensagem"
                  >
                    {copySuccess ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Campo de texto */}
                <div className="flex-1">
                  <textarea
                    value={editingDraft}
                    onChange={(e) => setEditingDraft(e.target.value)}
                    rows={Math.min(Math.max(1, editingDraft.split('\n').length), 4)}
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border-0 resize-none ${isDark ? 'bg-slate-700 text-slate-100 placeholder-slate-400' : 'bg-white text-slate-800 placeholder-slate-400'} focus:ring-1 focus:ring-purple-500 leading-relaxed shadow-sm`}
                    placeholder={conversationMode === 'auto' ? 'Próxima mensagem da IA...' : 'Mensagem sugerida pela IA (edite se necessário)...'}
                  />
                </div>

                {/* Botão enviar */}
                <div className="pb-1">
                  <button
                    onClick={handleApproveAndSend}
                    disabled={sendingMessage || !editingDraft.trim()}
                    className="p-2.5 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:hover:bg-purple-600 text-white transition-colors shadow-sm"
                    title={conversationMode === 'auto' ? 'Enviar agora' : 'Aprovar e Enviar'}
                  >
                    {sendingMessage ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Info de caracteres e botão ignorar */}
              <div className="flex items-center justify-between mt-1 px-1">
                <span className={`text-[10px] ${t.textMuted}`}>
                  {editingDraft.length > 0 && `${editingDraft.length} caracteres`}
                </span>
                <button
                  onClick={() => handleDismiss(selectedAction.id)}
                  className={`text-[11px] ${t.textMuted} hover:text-red-500 transition-colors`}
                >
                  Ignorar conversa
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

    {/* ---- Modal de Pós-Venda ---- */}
    {showPostsaleModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} overflow-hidden`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Enviar Pós-Venda</h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Selecione a pesquisa NPS para enviar ao cliente</p>
              </div>
              <button onClick={() => setShowPostsaleModal(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-700/50' : 'bg-green-50'} flex items-start gap-2`}>
              <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Consulta confirmada para <strong>{selectedAction?.contact_name}</strong>. Escolha qual pesquisa NPS enviar:
              </p>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Pesquisa NPS</label>
              <select
                value={postsaleNpsId}
                onChange={e => setPostsaleNpsId(e.target.value)}
                className={`w-full text-sm rounded-xl px-3 py-2.5 border ${
                  isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="">Selecionar pesquisa...</option>
                {availableForms.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className={`px-5 py-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} flex gap-2`}>
            <button
              onClick={() => setShowPostsaleModal(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              } transition-colors`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSendPostsale}
              disabled={!postsaleNpsId || confirmingConsultation}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {confirmingConsultation ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar Pós-Venda
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ---- Modal de Objetivo da Conversa ---- */}
    {showObjectiveModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className={`w-full max-w-md rounded-2xl shadow-2xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} overflow-hidden`}>
          {/* Header */}
          <div className={`px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Qual é o objetivo com esse lead?</h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>A IA vai adaptar a abordagem conforme o objetivo</p>
              </div>
              <button onClick={() => setShowObjectiveModal(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Opções de objetivo */}
          <div className="px-5 py-4 space-y-2">
            {([
              { type: 'schedule_first' as ConversationObjectiveType, icon: '📅', label: 'Agendar primeira consulta', desc: 'Lead novo que ainda não veio' },
              { type: 'reschedule' as ConversationObjectiveType, icon: '🔄', label: 'Reagendar / Retomar contato', desc: 'Sumiu após responder o formulário' },
              { type: 'post_consultation' as ConversationObjectiveType, icon: '💬', label: 'Acompanhar pós-consulta', desc: 'Acabou de fazer uma consulta' },
              { type: 'close_budget' as ConversationObjectiveType, icon: '💰', label: 'Fechar orçamento', desc: 'Recebeu proposta mas não fechou' },
              { type: 'reactivate' as ConversationObjectiveType, icon: '✨', label: 'Reativar cliente inativo', desc: 'Não vem há muito tempo' },
            ] as const).map((opt) => (
              <button
                key={opt.type}
                onClick={() => setSelectedObjective(opt.type)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  selectedObjective === opt.type
                    ? isDark ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50'
                    : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-xl mt-0.5">{opt.icon}</span>
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{opt.label}</p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{opt.desc}</p>
                </div>
                {selectedObjective === opt.type && (
                  <Check size={16} className="ml-auto mt-1 text-purple-500 flex-shrink-0" />
                )}
              </button>
            ))}

            {/* Enviar NPS (apenas para pós-consulta) */}
            {selectedObjective === 'post_consultation' && (
              <div className={`mt-1 p-3 rounded-xl border ${isDark ? 'border-slate-700 bg-slate-700/30' : 'border-slate-200 bg-slate-50'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendNpsAfterConsultation}
                    onChange={(e) => setSendNpsAfterConsultation(e.target.checked)}
                    className="w-4 h-4 rounded accent-purple-500"
                  />
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Enviar pesquisa NPS</span>
                </label>
                {sendNpsAfterConsultation && (
                  <div className="mt-2">
                    <p className={`text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Qual pesquisa enviar?</p>
                    <select
                      value={objectiveNpsFormId}
                      onChange={(e) => {
                        const form = availableForms.find(f => f.id === e.target.value);
                        setObjectiveNpsFormId(e.target.value);
                        setObjectiveNpsFormName(form?.name || '');
                      }}
                      className={`w-full text-sm rounded-lg px-3 py-2 border ${
                        isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value="">Selecione uma pesquisa...</option>
                      {availableForms.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Contexto adicional */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Contexto adicional <span className="font-normal opacity-70">(opcional)</span>
              </label>
              <textarea
                value={objectiveContext}
                onChange={(e) => setObjectiveContext(e.target.value)}
                placeholder="Ex: Ela veio semana passada, gostou mas disse que ia pensar no preço..."
                rows={2}
                className={`w-full text-sm rounded-xl px-3 py-2 border resize-none ${
                  isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={`px-5 py-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'} flex gap-2`}>
            <button
              onClick={() => setShowObjectiveModal(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
                isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              } transition-colors`}
            >
              Cancelar
            </button>
            <button
              onClick={() => handleActivateAutoAndSend({
                type: selectedObjective,
                context: objectiveContext || undefined,
                npsFormId: (selectedObjective === 'post_consultation' && sendNpsAfterConsultation) ? objectiveNpsFormId : undefined,
                npsFormName: (selectedObjective === 'post_consultation' && sendNpsAfterConsultation) ? objectiveNpsFormName : undefined,
              })}
              disabled={settingMode || (selectedObjective === 'post_consultation' && sendNpsAfterConsultation && !objectiveNpsFormId)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Bot size={14} />
              Ativar e Iniciar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
