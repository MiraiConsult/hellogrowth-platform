'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Search, ChevronDown, ChevronRight, ExternalLink,
  CreditCard, Loader2, Clock, Calendar, User, Phone, Mail,
  BarChart3, ArrowUpRight, ArrowDownRight, Filter
} from 'lucide-react';

interface AdminFinanceiroProps {
  isDark: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE:    { label: 'Ativo',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  INACTIVE:  { label: 'Inativo',     color: 'bg-slate-100 text-slate-600 border-slate-200',       icon: <XCircle size={12} /> },
  OVERDUE:   { label: 'Inadimplente',color: 'bg-red-100 text-red-700 border-red-200',             icon: <AlertTriangle size={12} /> },
  EXPIRED:   { label: 'Expirado',    color: 'bg-orange-100 text-orange-700 border-orange-200',    icon: <Clock size={12} /> },
  PENDING:   { label: 'Pendente',    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',    icon: <Clock size={12} /> },
  RECEIVED:  { label: 'Recebido',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  CONFIRMED: { label: 'Confirmado',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
};

const BILLING_TYPE: Record<string, string> = {
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de Crédito',
  PIX: 'PIX',
  DEBIT_CARD: 'Cartão de Débito',
  UNDEFINED: 'Não definido',
};

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function fmtDate(dateStr: string) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function daysUntil(dateStr: string) {
  if (!dateStr) return null;
  const due = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function AdminFinanceiro({ isDark }: AdminFinanceiroProps) {
  const t = isDark
    ? { bg: 'bg-gray-950', surface: 'bg-gray-900', border: 'border-gray-800', text: 'text-white', textSub: 'text-gray-400', textMuted: 'text-gray-500', input: 'bg-gray-800 border-gray-700 text-gray-100', badge: 'bg-gray-800 text-gray-300 border-gray-700', inner: 'bg-gray-800/40', card: 'bg-gray-900 border-gray-800' }
    : { bg: 'bg-slate-50', surface: 'bg-white', border: 'border-slate-200', text: 'text-slate-900', textSub: 'text-slate-500', textMuted: 'text-slate-400', input: 'bg-white border-slate-300 text-slate-900', badge: 'bg-slate-100 text-slate-600 border-slate-200', inner: 'bg-slate-50', card: 'bg-white border-slate-200' };

  const [overview, setOverview] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, any[]>>({});
  const [loadingPayments, setLoadingPayments] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/asaas?action=overview');
      const data = await res.json();
      setOverview(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch('/api/admin/asaas?action=subscriptions');
      const data = await res.json();
      setSubscriptions(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  const loadPayments = async (customerId: string, subscriptionId: string, subId: string) => {
    if (payments[subId]) return;
    setLoadingPayments(subId);
    try {
      const res = await fetch(`/api/admin/asaas?action=payments&customerId=${customerId}&subscriptionId=${subscriptionId}`);
      const data = await res.json();
      setPayments(prev => ({ ...prev, [subId]: data.data || [] }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPayments(null);
    }
  };

  useEffect(() => {
    loadOverview();
    loadSubscriptions();
  }, [loadOverview, loadSubscriptions]);

  const handleExpand = (sub: any) => {
    if (expanded === sub.id) {
      setExpanded(null);
    } else {
      setExpanded(sub.id);
      loadPayments(sub.customerId, sub.id, sub.id);
    }
  };

  const filtered = subscriptions.filter(s => {
    const matchSearch = !search ||
      s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      s.customerEmail?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Ordenar: inadimplentes primeiro, depois ativos, depois outros
  const sorted = [...filtered].sort((a, b) => {
    const order: Record<string, number> = { OVERDUE: 0, ACTIVE: 1, PENDING: 2, INACTIVE: 3, EXPIRED: 4 };
    return (order[a.status] ?? 5) - (order[b.status] ?? 5);
  });

  return (
    <div className={`min-h-screen ${t.bg} p-4 md:p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-xl font-bold ${t.text}`}>Financeiro</h1>
          <p className={`text-sm ${t.textMuted} mt-0.5`}>Assinaturas e cobranças via Asaas</p>
        </div>
        <button
          onClick={() => { loadOverview(); loadSubscriptions(); }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${t.border} ${t.textSub} hover:text-emerald-600 text-sm transition-colors`}
        >
          <RefreshCw size={14} className={(loading || loadingSubs) ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Cards de visão geral */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`rounded-xl border ${t.card} p-4 animate-pulse`}>
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-3"></div>
              <div className="h-7 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-xl border ${t.card} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <span className={`text-xs font-medium ${t.textMuted}`}>MRR</span>
            </div>
            <p className={`text-2xl font-bold ${t.text}`}>{fmt(overview.mrr)}</p>
            <p className={`text-xs ${t.textMuted} mt-1`}>Receita recorrente mensal</p>
          </div>

          <div className={`rounded-xl border ${t.card} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 size={16} className="text-blue-600" />
              </div>
              <span className={`text-xs font-medium ${t.textMuted}`}>Ativos</span>
            </div>
            <p className={`text-2xl font-bold ${t.text}`}>{overview.activeSubscriptions}</p>
            <p className={`text-xs ${t.textMuted} mt-1`}>de {overview.totalSubscriptions} assinaturas</p>
          </div>

          <div className={`rounded-xl border ${t.card} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-600" />
              </div>
              <span className={`text-xs font-medium ${t.textMuted}`}>Inadimplentes</span>
            </div>
            <p className={`text-2xl font-bold text-red-600`}>{overview.overdueCount}</p>
            <p className={`text-xs ${t.textMuted} mt-1`}>{fmt(overview.overdueAmount)} em aberto</p>
          </div>

          <div className={`rounded-xl border ${t.card} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <DollarSign size={16} className="text-violet-600" />
              </div>
              <span className={`text-xs font-medium ${t.textMuted}`}>Recebido (mês)</span>
            </div>
            <p className={`text-2xl font-bold ${t.text}`}>{fmt(overview.receivedThisMonth)}</p>
            <p className={`text-xs ${t.textMuted} mt-1`}>Pagamentos confirmados</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className={`flex flex-wrap items-center gap-3 mb-4 p-4 rounded-xl border ${t.border} ${t.surface}`}>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full text-sm pl-8 pr-3 py-2 rounded-lg border ${t.input} focus:outline-none focus:ring-2 focus:ring-emerald-500/30`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={`text-sm px-3 py-2 rounded-lg border ${t.input} focus:outline-none`}
        >
          <option value="ALL">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="OVERDUE">Inadimplentes</option>
          <option value="INACTIVE">Inativos</option>
          <option value="EXPIRED">Expirados</option>
        </select>
        <span className={`text-xs ${t.textMuted}`}>{sorted.length} resultado{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Lista de assinaturas */}
      {loadingSubs ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
        </div>
      ) : sorted.length === 0 ? (
        <div className={`text-center py-20 ${t.textMuted}`}>
          <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma assinatura encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(sub => {
            const statusCfg = STATUS_CONFIG[sub.status] || { label: sub.status, color: 'bg-slate-100 text-slate-600 border-slate-200', icon: null };
            const days = daysUntil(sub.nextDueDate);
            const isExpanded = expanded === sub.id;

            return (
              <div key={sub.id} className={`rounded-xl border ${t.border} ${t.surface} overflow-hidden`}>
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => handleExpand(sub)}
                >
                  {/* Expand icon */}
                  <button className={`shrink-0 p-1 rounded ${t.textMuted}`}>
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {sub.customerName?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${t.text} truncate`}>{sub.customerName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${statusCfg.color}`}>
                        {statusCfg.icon} {statusCfg.label}
                      </span>
                    </div>
                    <div className={`flex items-center gap-3 mt-0.5 text-xs ${t.textMuted} flex-wrap`}>
                      {sub.customerEmail && <span className="flex items-center gap-1"><Mail size={10} />{sub.customerEmail}</span>}
                      {sub.customerPhone && <span className="flex items-center gap-1"><Phone size={10} />{sub.customerPhone}</span>}
                    </div>
                  </div>

                  {/* Valor e vencimento */}
                  <div className="text-right shrink-0">
                    <p className={`text-base font-bold ${t.text}`}>{fmt(sub.value)}<span className={`text-xs font-normal ${t.textMuted}`}>/mês</span></p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <Calendar size={10} className={t.textMuted} />
                      <span className={`text-xs ${
                        days !== null && days < 0 ? 'text-red-500 font-medium' :
                        days !== null && days <= 5 ? 'text-orange-500 font-medium' :
                        t.textMuted
                      }`}>
                        {sub.nextDueDate ? (
                          days !== null && days < 0 ? `Venceu há ${Math.abs(days)}d` :
                          days === 0 ? 'Vence hoje' :
                          days !== null && days <= 5 ? `Vence em ${days}d` :
                          fmtDate(sub.nextDueDate)
                        ) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Forma de pagamento */}
                  <div className="hidden md:flex items-center gap-1 shrink-0">
                    <CreditCard size={13} className={t.textMuted} />
                    <span className={`text-xs ${t.textMuted}`}>{BILLING_TYPE[sub.billingType] || sub.billingType}</span>
                  </div>
                </div>

                {/* Expandido: histórico de cobranças */}
                {isExpanded && (
                  <div className={`border-t ${t.border} px-4 py-3`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className={`text-xs font-semibold ${t.textSub}`}>Histórico de cobranças</p>
                      <a
                        href={`https://www.asaas.com/customerAccount/${sub.customerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-500"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink size={11} /> Ver no Asaas
                      </a>
                    </div>

                    {loadingPayments === sub.id ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 size={18} className="animate-spin text-emerald-500" />
                      </div>
                    ) : (payments[sub.id] || []).length === 0 ? (
                      <p className={`text-xs ${t.textMuted} text-center py-4`}>Nenhuma cobrança encontrada.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(payments[sub.id] || []).slice(0, 10).map((pay: any) => {
                          const payCfg = STATUS_CONFIG[pay.status] || { label: pay.status, color: 'bg-slate-100 text-slate-600 border-slate-200', icon: null };
                          return (
                            <div key={pay.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${t.border} ${t.inner}`}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium flex items-center gap-1 ${payCfg.color}`}>
                                    {payCfg.icon} {payCfg.label}
                                  </span>
                                  <span className={`text-xs ${t.textMuted}`}>
                                    Venc. {fmtDate(pay.dueDate)}
                                    {pay.paymentDate && ` · Pago ${fmtDate(pay.paymentDate)}`}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-sm font-semibold ${t.text}`}>{fmt(pay.value)}</span>
                                {pay.invoiceUrl && (
                                  <a
                                    href={pay.invoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-1 rounded ${t.textMuted} hover:text-emerald-600`}
                                    onClick={e => e.stopPropagation()}
                                    title="Ver fatura"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Detalhes da assinatura */}
                    <div className={`mt-3 pt-3 border-t ${t.border} grid grid-cols-2 md:grid-cols-4 gap-3`}>
                      <div>
                        <p className={`text-xs ${t.textMuted}`}>ID Asaas</p>
                        <p className={`text-xs font-mono ${t.textSub} truncate`}>{sub.id}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${t.textMuted}`}>Criado em</p>
                        <p className={`text-xs ${t.textSub}`}>{fmtDate(sub.dateCreated)}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${t.textMuted}`}>Ciclo</p>
                        <p className={`text-xs ${t.textSub}`}>{sub.cycle === 'MONTHLY' ? 'Mensal' : sub.cycle}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${t.textMuted}`}>Forma de pagamento</p>
                        <p className={`text-xs ${t.textSub}`}>{BILLING_TYPE[sub.billingType] || sub.billingType}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
