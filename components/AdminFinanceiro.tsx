'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Search, ChevronDown, ChevronRight, ExternalLink,
  CreditCard, Loader2, Clock, Calendar, Phone, Mail,
  Download, Filter, BarChart3, Users, Percent, Target
} from 'lucide-react';

interface AdminFinanceiroProps { isDark: boolean; }

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  ACTIVE:    { label: 'Ativo',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  INACTIVE:  { label: 'Inativo',      color: 'bg-slate-100 text-slate-600 border-slate-200',       dot: 'bg-slate-400' },
  OVERDUE:   { label: 'Inadimplente', color: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500' },
  EXPIRED:   { label: 'Expirado',     color: 'bg-orange-100 text-orange-700 border-orange-200',    dot: 'bg-orange-400' },
  PENDING:   { label: 'Pendente',     color: 'bg-yellow-100 text-yellow-700 border-yellow-200',    dot: 'bg-yellow-400' },
  RECEIVED:  { label: 'Recebido',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  CONFIRMED: { label: 'Confirmado',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

const BILLING_LABEL: Record<string, string> = {
  BOLETO: 'Boleto', CREDIT_CARD: 'Cartão', PIX: 'PIX', UNDEFINED: 'N/D',
};

const PIE_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function fmtMonth(m: string) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(mo) - 1]}/${y.slice(2)}`;
}
function daysUntil(d: string) {
  if (!d) return null;
  const due = new Date(d + 'T12:00:00');
  return Math.ceil((due.getTime() - Date.now()) / 86400000);
}

// ── Tooltip customizado ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, isDark }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs shadow-lg ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
      <p className="font-semibold mb-1">{fmtMonth(label) || label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 100 ? fmt(p.value) : p.value}</p>
      ))}
    </div>
  );
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color, isDark }: any) {
  const t = isDark
    ? 'bg-gray-900 border-gray-800 text-white'
    : 'bg-white border-slate-200 text-slate-900';
  return (
    <div className={`rounded-xl border p-4 ${t}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

export default function AdminFinanceiro({ isDark }: AdminFinanceiroProps) {
  const t = isDark
    ? { bg: 'bg-gray-950', surface: 'bg-gray-900', border: 'border-gray-800', text: 'text-white', textSub: 'text-gray-400', textMuted: 'text-gray-500', input: 'bg-gray-800 border-gray-700 text-gray-100', inner: 'bg-gray-800/40', btnSec: 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' }
    : { bg: 'bg-slate-50', surface: 'bg-white', border: 'border-slate-200', text: 'text-slate-900', textSub: 'text-slate-500', textMuted: 'text-slate-400', input: 'bg-white border-slate-300 text-slate-900', inner: 'bg-slate-50', btnSec: 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50' };

  const [overview, setOverview] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [billingFilter, setBillingFilter] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payments, setPayments] = useState<Record<string, any[]>>({});
  const [loadingPayments, setLoadingPayments] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'list'>('dashboard');

  // Filtros de data
  const now = new Date();
  const defaultFrom = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState('all');

  const applyPreset = (preset: string) => {
    setDatePreset(preset);
    const n = new Date();
    if (preset === 'all') { setDateFrom(''); setDateTo(''); return; }
    if (preset === 'month') {
      setDateFrom(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`);
      setDateTo(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()).padStart(2, '0')}`);
    } else if (preset === '3m') {
      const from = new Date(n); from.setMonth(from.getMonth() - 3);
      setDateFrom(from.toISOString().split('T')[0]);
      setDateTo(n.toISOString().split('T')[0]);
    } else if (preset === '6m') {
      const from = new Date(n); from.setMonth(from.getMonth() - 6);
      setDateFrom(from.toISOString().split('T')[0]);
      setDateTo(n.toISOString().split('T')[0]);
    } else if (preset === 'year') {
      setDateFrom(`${n.getFullYear()}-01-01`);
      setDateTo(`${n.getFullYear()}-12-31`);
    }
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ action: 'overview' });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/admin/asaas?${params}`);
      setOverview(await res.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  const loadCharts = useCallback(async () => {
    setLoadingCharts(true);
    try {
      const res = await fetch('/api/admin/asaas?action=charts');
      setCharts(await res.json());
    } catch (e) { console.error(e); } finally { setLoadingCharts(false); }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch('/api/admin/asaas?action=subscriptions');
      const data = await res.json();
      setSubscriptions(data.data || []);
    } catch (e) { console.error(e); } finally { setLoadingSubs(false); }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { loadCharts(); loadSubscriptions(); }, [loadCharts, loadSubscriptions]);

  const loadPayments = async (customerId: string, subscriptionId: string, subId: string) => {
    if (payments[subId]) return;
    setLoadingPayments(subId);
    try {
      const res = await fetch(`/api/admin/asaas?action=payments&customerId=${customerId}&subscriptionId=${subscriptionId}`);
      const data = await res.json();
      setPayments(prev => ({ ...prev, [subId]: data.data || [] }));
    } catch (e) { console.error(e); } finally { setLoadingPayments(null); }
  };

  const handleExpand = (sub: any) => {
    if (expanded === sub.id) { setExpanded(null); return; }
    setExpanded(sub.id);
    loadPayments(sub.customerId, sub.id, sub.id);
  };

  const handleExport = (type: 'subscriptions' | 'payments') => {
    window.open(`/api/admin/asaas?action=export&type=${type}`, '_blank');
  };

  const filtered = subscriptions
    .filter(s => {
      const matchSearch = !search || s.customerName?.toLowerCase().includes(search.toLowerCase()) || s.customerEmail?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchBilling = billingFilter === 'ALL' || s.billingType === billingFilter;
      const matchOverdue = !overdueOnly || s.status === 'OVERDUE';
      return matchSearch && matchStatus && matchBilling && matchOverdue;
    })
    .sort((a, b) => {
      const order: Record<string, number> = { OVERDUE: 0, ACTIVE: 1, PENDING: 2, INACTIVE: 3, EXPIRED: 4 };
      return (order[a.status] ?? 5) - (order[b.status] ?? 5);
    });

  // Dados para gráfico de pizza de status
  const statusPieData = charts?.statusDist
    ? Object.entries(charts.statusDist).map(([k, v]: any) => ({ name: STATUS_CFG[k]?.label || k, value: v }))
    : [];

  const billingPieData = charts?.billingDist
    ? Object.entries(charts.billingDist).map(([k, v]: any) => ({ name: BILLING_LABEL[k] || k, value: v }))
    : [];

  return (
    <div className={`min-h-screen min-w-0 ${t.bg} p-4 md:p-6`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className={`text-xl font-bold ${t.text}`}>Financeiro</h1>
          <p className={`text-sm ${t.textMuted} mt-0.5`}>Integração em tempo real com Asaas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Abas */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${t.border} ${t.surface}`}>
            <button onClick={() => setActiveView('dashboard')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'dashboard' ? 'bg-violet-600 text-white' : t.textSub}`}>
              Dashboard
            </button>
            <button onClick={() => setActiveView('list')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'list' ? 'bg-violet-600 text-white' : t.textSub}`}>
              Assinaturas
            </button>
          </div>
          {/* Exportar */}
          <div className="flex items-center gap-1">
            <button onClick={() => handleExport('subscriptions')} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border ${t.btnSec} transition-colors`}>
              <Download size={13} /> Assinaturas CSV
            </button>
            <button onClick={() => handleExport('payments')} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border ${t.btnSec} transition-colors`}>
              <Download size={13} /> Cobranças CSV
            </button>
          </div>
          <button onClick={() => { loadOverview(); loadCharts(); loadSubscriptions(); }} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${t.btnSec} text-sm transition-colors`}>
            <RefreshCw size={14} className={(loading || loadingCharts) ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filtros de data */}
      <div className={`flex flex-wrap items-center gap-2 mb-6 p-3 rounded-xl border ${t.border} ${t.surface}`}>
        <Calendar size={14} className={t.textMuted} />
        <span className={`text-xs font-medium ${t.textSub}`}>Período:</span>
        {['all', 'month', '3m', '6m', 'year'].map(p => (
          <button key={p} onClick={() => applyPreset(p)} className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${datePreset === p ? 'bg-violet-600 text-white border-violet-600' : `${t.btnSec} border`}`}>
            {p === 'all' ? 'Tudo' : p === 'month' ? 'Este mês' : p === '3m' ? '3 meses' : p === '6m' ? '6 meses' : 'Este ano'}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-2">
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }} className={`text-xs px-2 py-1 rounded-lg border ${t.input} focus:outline-none`} />
          <span className={`text-xs ${t.textMuted}`}>até</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setDatePreset('custom'); }} className={`text-xs px-2 py-1 rounded-lg border ${t.input} focus:outline-none`} />
          {(dateFrom || dateTo) && (
            <button onClick={() => applyPreset('all')} className={`text-xs px-2 py-1 rounded-lg border ${t.btnSec}`}>Limpar</button>
          )}
        </div>
      </div>

      {/* ── DASHBOARD VIEW ─────────────────────────────────────────────────── */}
      {activeView === 'dashboard' && (
        <>
          {/* KPIs */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`rounded-xl border ${t.surface} ${t.border} p-4 animate-pulse`}>
                  <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-2/3 mb-3"></div>
                  <div className="h-7 bg-slate-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KpiCard isDark={isDark} icon={<TrendingUp size={16} className="text-emerald-600" />} color="bg-emerald-100" label="MRR" value={fmt(overview.mrr)} sub="Receita recorrente mensal" />
              <KpiCard isDark={isDark} icon={<Target size={16} className="text-blue-600" />} color="bg-blue-100" label="ARR" value={fmt(overview.arr)} sub="Receita anual recorrente" />
              <KpiCard isDark={isDark} icon={<DollarSign size={16} className="text-violet-600" />} color="bg-violet-100" label="Ticket Médio" value={fmt(overview.ticketMedio)} sub="Por assinatura ativa" />
              <KpiCard isDark={isDark} icon={<DollarSign size={16} className="text-teal-600" />} color="bg-teal-100" label="LTV Estimado" value={fmt(overview.ltv)} sub="Valor vitalício do cliente" />
              <KpiCard isDark={isDark} icon={<Users size={16} className="text-indigo-600" />} color="bg-indigo-100" label="Assinantes Ativos" value={overview.activeSubscriptions} sub={`de ${overview.totalSubscriptions} total`} />
              <KpiCard isDark={isDark} icon={<AlertTriangle size={16} className="text-red-600" />} color="bg-red-100" label="Inadimplentes" value={overview.overdueCount} sub={fmt(overview.overdueAmount) + ' em aberto'} />
              <KpiCard isDark={isDark} icon={<Percent size={16} className="text-orange-600" />} color="bg-orange-100" label="Churn Rate" value={`${overview.churnRate}%`} sub="Taxa de cancelamento" />
              <KpiCard isDark={isDark} icon={<CheckCircle2 size={16} className="text-green-600" />} color="bg-green-100" label="Recebido (período)" value={fmt(overview.receivedThisMonth)} sub="Pagamentos confirmados" />
            </div>
          )}

          {/* Gráficos */}
          {loadingCharts ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 size={28} className="animate-spin text-violet-500" />
            </div>
          ) : charts && (
            <div className="space-y-6">
              {/* MRR ao longo do tempo */}
              <div className={`rounded-xl border ${t.border} ${t.surface} p-5`}>
                <h3 className={`text-sm font-semibold ${t.text} mb-4`}>MRR ao longo do tempo</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={charts.mrrData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e2e8f0'} />
                    <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#64748b' }} />
                    <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#64748b' }} width={55} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Area type="monotone" dataKey="mrr" name="MRR" stroke="#8b5cf6" fill="url(#mrrGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Pagamentos recebidos vs pendentes por mês */}
              <div className={`rounded-xl border ${t.border} ${t.surface} p-5`}>
                <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Pagamentos por mês</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={charts.paymentsData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e2e8f0'} />
                    <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#64748b' }} />
                    <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#64748b' }} width={55} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="received" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pending" name="Pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overdue" name="Inadimplente" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Novos clientes por mês */}
              <div className={`rounded-xl border ${t.border} ${t.surface} p-5`}>
                <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Novos clientes por mês</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={charts.newSubsData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e2e8f0'} />
                    <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? '#9ca3af' : '#64748b' }} width={30} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Bar dataKey="count" name="Novos clientes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pizzas: Status + Forma de pagamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`rounded-xl border ${t.border} ${t.surface} p-5`}>
                  <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Status das assinaturas</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                        {statusPieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [v, n]} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className={`rounded-xl border ${t.border} ${t.surface} p-5`}>
                  <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Forma de pagamento</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={billingPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                        {billingPieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [v, n]} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── LIST VIEW ──────────────────────────────────────────────────────── */}
      {activeView === 'list' && (
        <>
          {/* Filtros */}
          <div className={`flex flex-wrap items-center gap-3 mb-4 p-4 rounded-xl border ${t.border} ${t.surface}`}>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
              <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full text-sm pl-8 pr-3 py-2 rounded-lg border ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500/30`} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`text-sm px-3 py-2 rounded-lg border ${t.input} focus:outline-none`}>
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="OVERDUE">Inadimplentes</option>
              <option value="INACTIVE">Inativos</option>
              <option value="EXPIRED">Expirados</option>
            </select>
            <select value={billingFilter} onChange={e => setBillingFilter(e.target.value)} className={`text-sm px-3 py-2 rounded-lg border ${t.input} focus:outline-none`}>
              <option value="ALL">Todas as formas</option>
              <option value="BOLETO">Boleto</option>
              <option value="CREDIT_CARD">Cartão</option>
              <option value="PIX">PIX</option>
            </select>
            <label className={`flex items-center gap-2 text-xs ${t.textMuted} cursor-pointer select-none`}>
              <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} className="rounded" />
              Só inadimplentes
            </label>
            <span className={`text-xs ${t.textMuted} ml-auto`}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Lista */}
          {loadingSubs ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-violet-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className={`text-center py-20 ${t.textMuted}`}>
              <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma assinatura encontrada.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(sub => {
                const sc = STATUS_CFG[sub.status] || { label: sub.status, color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
                const days = daysUntil(sub.nextDueDate);
                const isExp = expanded === sub.id;

                return (
                  <div key={sub.id} className={`rounded-xl border ${t.border} ${t.surface} overflow-hidden`}>
                    <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/30 transition-colors" onClick={() => handleExpand(sub)}>
                      <button className={`shrink-0 p-1 rounded ${t.textMuted}`}>{isExp ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {sub.customerName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${t.text} truncate`}>{sub.customerName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc.color}`}>{sc.label}</span>
                        </div>
                        <div className={`flex items-center gap-3 mt-0.5 text-xs ${t.textMuted} flex-wrap`}>
                          {sub.customerEmail && <span className="flex items-center gap-1"><Mail size={10} />{sub.customerEmail}</span>}
                          {sub.customerPhone && <span className="flex items-center gap-1"><Phone size={10} />{sub.customerPhone}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-base font-bold ${t.text}`}>{fmt(sub.value)}<span className={`text-xs font-normal ${t.textMuted}`}>/mês</span></p>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <Calendar size={10} className={t.textMuted} />
                          <span className={`text-xs ${days !== null && days < 0 ? 'text-red-500 font-medium' : days !== null && days <= 5 ? 'text-orange-500 font-medium' : t.textMuted}`}>
                            {sub.nextDueDate ? (days !== null && days < 0 ? `Venceu há ${Math.abs(days)}d` : days === 0 ? 'Vence hoje' : days !== null && days <= 5 ? `Vence em ${days}d` : fmtDate(sub.nextDueDate)) : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="hidden md:flex items-center gap-1 shrink-0">
                        <CreditCard size={13} className={t.textMuted} />
                        <span className={`text-xs ${t.textMuted}`}>{BILLING_LABEL[sub.billingType] || sub.billingType}</span>
                      </div>
                      {sub.status === 'OVERDUE' && sub.customerPhone && (
                        <a
                          href={`https://wa.me/55${sub.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Ol\u00e1 ${sub.customerName?.split(' ')[0] || ''}! Identificamos uma pend\u00eancia financeira em sua conta HelloGrowth. Podemos ajudar a regularizar? \uD83D\uDE0A`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="shrink-0 flex items-center gap-1.5 text-xs bg-green-500 hover:bg-green-400 text-white px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                          title="Enviar lembrete via WhatsApp"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Lembrete
                        </a>
                      )}
                    </div>

                    {isExp && (
                      <div className={`border-t ${t.border} px-4 py-3`}>
                        <div className="flex items-center justify-between mb-3">
                          <p className={`text-xs font-semibold ${t.textSub}`}>Histórico de cobranças</p>
                          <a href={`https://www.asaas.com/customerAccount/${sub.customerId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-400" onClick={e => e.stopPropagation()}>
                            <ExternalLink size={11} /> Ver no Asaas
                          </a>
                        </div>
                        {loadingPayments === sub.id ? (
                          <div className="flex items-center justify-center py-6"><Loader2 size={18} className="animate-spin text-violet-500" /></div>
                        ) : (payments[sub.id] || []).length === 0 ? (
                          <p className={`text-xs ${t.textMuted} text-center py-4`}>Nenhuma cobrança encontrada.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {(payments[sub.id] || []).slice(0, 10).map((pay: any) => {
                              const pc = STATUS_CFG[pay.status] || { label: pay.status, color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
                              return (
                                <div key={pay.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${t.border} ${t.inner}`}>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${pc.color}`}>{pc.label}</span>
                                      <span className={`text-xs ${t.textMuted}`}>Venc. {fmtDate(pay.dueDate)}{pay.paymentDate && ` · Pago ${fmtDate(pay.paymentDate)}`}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-sm font-semibold ${t.text}`}>{fmt(pay.value)}</span>
                                    {pay.invoiceUrl && (
                                      <a href={pay.invoiceUrl} target="_blank" rel="noopener noreferrer" className={`p-1 rounded ${t.textMuted} hover:text-violet-500`} onClick={e => e.stopPropagation()} title="Ver fatura">
                                        <ExternalLink size={12} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className={`mt-3 pt-3 border-t ${t.border} grid grid-cols-2 md:grid-cols-4 gap-3`}>
                          <div><p className={`text-xs ${t.textMuted}`}>ID Asaas</p><p className={`text-xs font-mono ${t.textSub} truncate`}>{sub.id}</p></div>
                          <div><p className={`text-xs ${t.textMuted}`}>Criado em</p><p className={`text-xs ${t.textSub}`}>{fmtDate(sub.dateCreated)}</p></div>
                          <div><p className={`text-xs ${t.textMuted}`}>Ciclo</p><p className={`text-xs ${t.textSub}`}>{sub.cycle === 'MONTHLY' ? 'Mensal' : sub.cycle}</p></div>
                          <div><p className={`text-xs ${t.textMuted}`}>Forma de pagamento</p><p className={`text-xs ${t.textSub}`}>{BILLING_LABEL[sub.billingType] || sub.billingType}</p></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
