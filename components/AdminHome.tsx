'use client';
import React, { useState, useEffect } from 'react';
import {
  Users, DollarSign, AlertTriangle, TrendingUp, Clock, CheckCircle,
  RefreshCw, ArrowRight, Zap, Activity, UserCheck, AlertCircle,
  BarChart2, CreditCard, Calendar, ExternalLink, MessageSquare,
  Target, Eye, Star, ShoppingBag
} from 'lucide-react';

interface AdminHomeProps {
  isDark?: boolean;
  onNavigate: (tab: string, filter?: { status?: string; search?: string }) => void;
  hideFinancial?: boolean;
}

const DARK = {
  bg: 'bg-gray-950',
  surface: 'bg-gray-900',
  border: 'border-gray-800',
  text: 'text-white',
  textSub: 'text-gray-400',
  textMuted: 'text-gray-500',
  card: 'bg-gray-900 border-gray-800',
  cardInner: 'bg-gray-800/50 border-gray-700',
  divider: 'divide-gray-800',
  badge: 'bg-gray-800 text-gray-300',
  row: 'hover:bg-gray-800/50',
};
const LIGHT = {
  bg: 'bg-gray-50',
  surface: 'bg-white',
  border: 'border-slate-200',
  text: 'text-slate-900',
  textSub: 'text-slate-500',
  textMuted: 'text-slate-400',
  card: 'bg-white border-slate-200',
  cardInner: 'bg-slate-50 border-slate-200',
  divider: 'divide-slate-100',
  badge: 'bg-slate-100 text-slate-600',
  row: 'hover:bg-slate-50',
};

function fmt(v: number) {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function timeAgo(dateStr: string) {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days}d atrás`;
  if (days < 30) return `${Math.floor(days / 7)} sem atrás`;
  return `${Math.floor(days / 30)} mês(es)`;
}

function getAccessStatus(lastLogin: string | null) {
  if (!lastLogin) return { label: 'Nunca acessou', color: 'text-red-500', bg: 'bg-red-50', bgDark: 'bg-red-500/10' };
  const days = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 3) return { label: 'Ativo', color: 'text-emerald-500', bg: 'bg-emerald-50', bgDark: 'bg-emerald-500/10' };
  if (days <= 7) return { label: 'Recente', color: 'text-blue-500', bg: 'bg-blue-50', bgDark: 'bg-blue-500/10' };
  if (days <= 14) return { label: 'Moderado', color: 'text-amber-500', bg: 'bg-amber-50', bgDark: 'bg-amber-500/10' };
  return { label: 'Inativo', color: 'text-red-500', bg: 'bg-red-50', bgDark: 'bg-red-500/10' };
}

export default function AdminHome({ isDark = false, onNavigate, hideFinancial = false }: AdminHomeProps) {
  const t = isDark ? DARK : LIGHT;
  const [loading, setLoading] = useState(true);
  const [asaasData, setAsaasData] = useState<any>(null);
  const [clientsData, setClientsData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        fetch('/api/admin/clients').then(r => r.json()),
        fetch('/api/admin/analytics?view=overview').then(r => r.json()),
      ];
      if (!hideFinancial) {
        promises.push(fetch('/api/admin/asaas?action=overview').then(r => r.json()));
      }

      const results = await Promise.all(promises);
      setClientsData(results[0]);
      setUsageData(results[1]);
      if (!hideFinancial && results[2]) setAsaasData(results[2]);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const mrr = asaasData?.mrr || 0;
  const arr = asaasData?.arr || 0;
  const activeSubs = asaasData?.statusCount?.ACTIVE || 0;
  const totalSubs = asaasData?.totalSubscriptions || 0;
  const overdueCount = asaasData?.overdueCount || 0;
  const overdueAmount = asaasData?.overdueAmount || 0;
  const receivedAmount = asaasData?.receivedAmount || 0;
  const churnRate = asaasData?.churnRate || 0;
  const ticketMedio = asaasData?.ticketMedio || 0;

  const stats = clientsData?.stats || {};
  const clients = clientsData?.clients || [];

  // Dados de uso da plataforma (do analytics)
  const tenants = usageData?.tenants || [];
  const totalNpsResponses = tenants.reduce((sum: number, t: any) => sum + (t.nps?.totalResponses || 0), 0);
  const totalLeads = tenants.reduce((sum: number, t: any) => sum + (t.leads?.total || 0), 0);
  const totalLeadsVendidos = tenants.reduce((sum: number, t: any) => sum + (t.leads?.vendido || 0), 0);
  const totalPipeline = tenants.reduce((sum: number, t: any) => sum + (t.leads?.pipelineValue || 0), 0);
  const avgNps = tenants.length > 0 
    ? Math.round(tenants.filter((t: any) => t.nps?.totalResponses > 0).reduce((sum: number, t: any) => sum + (t.nps?.score || 0), 0) / Math.max(1, tenants.filter((t: any) => t.nps?.totalResponses > 0).length))
    : 0;

  // Classificar clientes por acesso
  const activeIn3Days = clients.filter((c: any) => {
    if (!c.lastLogin) return false;
    return (Date.now() - new Date(c.lastLogin).getTime()) <= 3 * 24 * 60 * 60 * 1000;
  }).length;
  const activeIn7Days = clients.filter((c: any) => {
    if (!c.lastLogin) return false;
    return (Date.now() - new Date(c.lastLogin).getTime()) <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const neverLoggedIn = clients.filter((c: any) => !c.lastLogin).length;
  const inactiveOver14 = clients.filter((c: any) => {
    if (!c.lastLogin) return true;
    return (Date.now() - new Date(c.lastLogin).getTime()) > 14 * 24 * 60 * 60 * 1000;
  }).length;

  // Últimos acessos
  const recentLogins = [...clients]
    .filter((c: any) => c.lastLogin)
    .sort((a: any, b: any) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime())
    .slice(0, 8);

  // Clientes com trial expirando em 3 dias
  const urgentTrials = clients.filter((c: any) =>
    c.consolidatedDaysRemaining !== null && c.consolidatedDaysRemaining <= 3 && c.consolidatedDaysRemaining >= 0
  ).length;

  // Top clientes por uso (NPS + leads)
  const topClients = [...tenants]
    .map((t: any) => ({
      name: t.companyName,
      nps: t.nps?.totalResponses || 0,
      leads: t.leads?.total || 0,
      pipeline: t.leads?.pipelineValue || 0,
      vendidos: t.leads?.vendido || 0,
      lastLogin: clients.find((c: any) => c.tenantId === t.tenantId)?.lastLogin || null,
    }))
    .sort((a, b) => (b.nps + b.leads) - (a.nps + a.leads))
    .slice(0, 6);

  // KPIs de uso da plataforma
  const usageKpis = [
    {
      label: 'Acessaram (3 dias)',
      value: activeIn3Days,
      sub: `de ${clients.length} clientes`,
      icon: <Eye size={18} />,
      color: 'text-emerald-500',
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      onClick: () => onNavigate('clients'),
    },
    {
      label: 'Acessaram (7 dias)',
      value: activeIn7Days,
      sub: `${Math.round((activeIn7Days / Math.max(1, clients.length)) * 100)}% dos clientes`,
      icon: <Activity size={18} />,
      color: 'text-blue-500',
      bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
      onClick: () => onNavigate('clients'),
    },
    {
      label: 'Inativos (+14d)',
      value: inactiveOver14,
      sub: neverLoggedIn > 0 ? `${neverLoggedIn} nunca acessaram` : 'Todos já acessaram',
      icon: <AlertTriangle size={18} />,
      color: inactiveOver14 > 0 ? 'text-red-500' : 'text-slate-400',
      bg: inactiveOver14 > 0 ? (isDark ? 'bg-red-500/10' : 'bg-red-50') : (isDark ? 'bg-gray-800' : 'bg-slate-50'),
      onClick: () => onNavigate('intelligence'),
    },
    {
      label: 'Avaliações NPS',
      value: totalNpsResponses,
      sub: `NPS médio: ${avgNps}`,
      icon: <Star size={18} />,
      color: 'text-amber-500',
      bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      onClick: () => onNavigate('intelligence'),
    },
    {
      label: 'Leads Captados',
      value: totalLeads,
      sub: `${totalLeadsVendidos} vendidos`,
      icon: <Target size={18} />,
      color: 'text-violet-500',
      bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50',
      onClick: () => onNavigate('intelligence'),
    },
    {
      label: 'Oportunidades',
      value: totalPipeline > 0 ? fmt(totalPipeline) : 'R$ 0',
      sub: `${totalLeads > 0 ? Math.round((totalLeadsVendidos / totalLeads) * 100) : 0}% conversão`,
      icon: <ShoppingBag size={18} />,
      color: 'text-teal-500',
      bg: isDark ? 'bg-teal-500/10' : 'bg-teal-50',
      onClick: () => onNavigate('intelligence'),
    },
  ];

  // KPIs financeiros
  const financialKpis = !hideFinancial ? [
    {
      label: 'MRR',
      value: fmt(mrr),
      sub: `ARR: ${fmt(arr)}`,
      icon: <DollarSign size={18} />,
      color: 'text-emerald-500',
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      onClick: () => onNavigate('financeiro'),
    },
    {
      label: 'Assinantes',
      value: activeSubs,
      sub: `${totalSubs} total`,
      icon: <CheckCircle size={18} />,
      color: 'text-blue-500',
      bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
      onClick: () => onNavigate('financeiro'),
    },
    {
      label: 'Inadimplentes',
      value: overdueCount,
      sub: overdueAmount > 0 ? `${fmt(overdueAmount)} em aberto` : 'Nenhum',
      icon: <AlertTriangle size={18} />,
      color: overdueCount > 0 ? 'text-red-500' : 'text-slate-400',
      bg: overdueCount > 0 ? (isDark ? 'bg-red-500/10' : 'bg-red-50') : (isDark ? 'bg-gray-800' : 'bg-slate-50'),
      onClick: () => onNavigate('financeiro'),
    },
    {
      label: 'Ticket Médio',
      value: fmt(ticketMedio),
      sub: `Churn: ${churnRate.toFixed(1)}%`,
      icon: <TrendingUp size={18} />,
      color: 'text-violet-500',
      bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50',
      onClick: () => onNavigate('financeiro'),
    },
  ] : [];

  const alerts = [
    urgentTrials > 0 && {
      type: 'warning',
      icon: <Clock size={14} />,
      text: `${urgentTrials} cliente${urgentTrials > 1 ? 's' : ''} com trial expirando em até 3 dias`,
      action: () => onNavigate('clients', { status: 'trialing' }),
      actionLabel: 'Ver clientes →',
    },
    !hideFinancial && overdueCount > 0 && {
      type: 'danger',
      icon: <AlertTriangle size={14} />,
      text: `${overdueCount} assinatura${overdueCount > 1 ? 's' : ''} inadimplente${overdueCount > 1 ? 's' : ''} — ${fmt(overdueAmount)} em aberto`,
      action: () => onNavigate('financeiro'),
      actionLabel: 'Ver financeiro →',
    },
    neverLoggedIn > 0 && {
      type: 'info',
      icon: <AlertCircle size={14} />,
      text: `${neverLoggedIn} cliente${neverLoggedIn > 1 ? 's' : ''} nunca fizeram login na plataforma`,
      action: () => onNavigate('clients', { status: 'never_login' }),
      actionLabel: 'Ver clientes →',
    },
    inactiveOver14 > 3 && {
      type: 'danger',
      icon: <Eye size={14} />,
      text: `${inactiveOver14} clientes não acessam há mais de 14 dias — risco de churn`,
      action: () => onNavigate('intelligence'),
      actionLabel: 'Ver uso real →',
    },
  ].filter(Boolean) as any[];

  const alertColors: Record<string, string> = {
    danger: isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700',
    warning: isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700',
    info: isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700',
  };

  const quickLinks = [
    { label: 'Clientes', icon: <Users size={16} />, tab: 'clients', color: 'text-emerald-500', desc: 'Gerenciar usuários e planos' },
    ...(!hideFinancial ? [{ label: 'Financeiro', icon: <DollarSign size={16} />, tab: 'financeiro', color: 'text-violet-500', desc: 'Assinaturas e cobranças' }] : []),
    { label: 'Inteligência', icon: <Zap size={16} />, tab: 'intelligence', color: 'text-purple-500', desc: 'NPS, leads e tendências' },
    { label: 'Templates', icon: <BarChart2 size={16} />, tab: 'templates', color: 'text-blue-500', desc: 'Formulários e pesquisas' },
    { label: 'Catálogos', icon: <Activity size={16} />, tab: 'catalogs', color: 'text-orange-500', desc: 'Produtos por segmento' },
    { label: 'Disparo', icon: <UserCheck size={16} />, tab: 'broadcast', color: 'text-teal-500', desc: 'Mensagens em massa' },
  ];

  if (loading) {
    return (
      <div className={`min-h-screen ${t.bg} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className={`text-sm ${t.textMuted}`}>Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${t.text}`}>Painel HelloGrowth</h1>
            <p className={`text-sm ${t.textMuted} mt-0.5`}>
              {lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Carregando...'}
            </p>
          </div>
          <button
            onClick={load}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${t.card} ${t.textSub} hover:opacity-80 transition-opacity`}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium ${alertColors[alert.type]}`}>
                <div className="flex items-center gap-2">
                  {alert.icon}
                  <span>{alert.text}</span>
                </div>
                <button onClick={alert.action} className="flex items-center gap-1 text-xs font-semibold opacity-80 hover:opacity-100 transition-opacity">
                  {alert.actionLabel} <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Seção: Uso da Plataforma */}
        <div>
          <h2 className={`text-sm font-semibold ${t.textSub} uppercase tracking-wider mb-3 flex items-center gap-2`}>
            <Activity size={14} className="text-emerald-500" /> Uso da Plataforma
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {usageKpis.map((kpi, i) => (
              <button
                key={i}
                onClick={kpi.onClick}
                className={`${t.card} border rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group`}
              >
                <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-3 ${kpi.color}`}>
                  {kpi.icon}
                </div>
                <p className={`text-xl font-bold ${t.text}`}>{kpi.value}</p>
                <p className={`text-xs font-medium ${t.textMuted} mt-0.5`}>{kpi.label}</p>
                <p className={`text-xs ${t.textMuted} opacity-70 mt-1`}>{kpi.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Seção: Financeiro (se não oculto) */}
        {!hideFinancial && financialKpis.length > 0 && (
          <div>
            <h2 className={`text-sm font-semibold ${t.textSub} uppercase tracking-wider mb-3 flex items-center gap-2`}>
              <DollarSign size={14} className="text-violet-500" /> Financeiro
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {financialKpis.map((kpi, i) => (
                <button
                  key={i}
                  onClick={kpi.onClick}
                  className={`${t.card} border rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group`}
                >
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-3 ${kpi.color}`}>
                    {kpi.icon}
                  </div>
                  <p className={`text-xl font-bold ${t.text}`}>{kpi.value}</p>
                  <p className={`text-xs font-medium ${t.textMuted} mt-0.5`}>{kpi.label}</p>
                  <p className={`text-xs ${t.textMuted} opacity-70 mt-1`}>{kpi.sub}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Linha: Últimos acessos + Top clientes por uso */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Últimos acessos */}
          <div className={`${t.card} border rounded-xl shadow-sm`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-emerald-500" />
                <h2 className={`text-sm font-semibold ${t.text}`}>Últimos Acessos</h2>
              </div>
              <button onClick={() => onNavigate('clients')} className={`text-xs ${t.textMuted} hover:text-emerald-500 flex items-center gap-1 transition-colors`}>
                Ver todos <ArrowRight size={12} />
              </button>
            </div>
            <div className={`divide-y ${t.divider}`}>
              {recentLogins.length === 0 ? (
                <div className={`px-5 py-8 text-center text-sm ${t.textMuted}`}>Nenhum acesso registrado</div>
              ) : recentLogins.map((client: any, i: number) => {
                const status = getAccessStatus(client.lastLogin);
                return (
                  <div key={i} className={`flex items-center justify-between px-5 py-3 ${t.row} transition-colors`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-slate-100 text-slate-600'} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                        {client.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${t.text}`}>{client.companyName || client.name}</p>
                        <p className={`text-xs ${t.textMuted}`}>{client.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium ${status.color}`}>{timeAgo(client.lastLogin)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top clientes por uso */}
          <div className={`${t.card} border rounded-xl shadow-sm`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-violet-500" />
                <h2 className={`text-sm font-semibold ${t.text}`}>Top Clientes por Uso</h2>
              </div>
              <button onClick={() => onNavigate('intelligence')} className={`text-xs ${t.textMuted} hover:text-violet-500 flex items-center gap-1 transition-colors`}>
                Ver detalhes <ArrowRight size={12} />
              </button>
            </div>
            <div className={`divide-y ${t.divider}`}>
              {topClients.length === 0 ? (
                <div className={`px-5 py-8 text-center text-sm ${t.textMuted}`}>Nenhum dado disponível</div>
              ) : topClients.map((client: any, i: number) => (
                <div key={i} className={`flex items-center justify-between px-5 py-3 ${t.row} transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : (isDark ? 'bg-gray-700 text-gray-300' : 'bg-slate-50 text-slate-500')
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${t.text}`}>{client.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className={`text-xs ${t.textMuted}`}><Star size={10} className="inline text-amber-500" /> {client.nps} NPS</span>
                        <span className={`text-xs ${t.textMuted}`}><Target size={10} className="inline text-violet-500" /> {client.leads} leads</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${client.pipeline > 0 ? 'text-emerald-500' : t.textMuted}`}>
                      {client.pipeline > 0 ? fmt(client.pipeline) : '-'}
                    </p>
                    <p className={`text-xs ${t.textMuted}`}>{client.vendidos} vendidos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Linha: Status de clientes + Acesso rápido */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Distribuição de planos */}
          <div className={`${t.card} border rounded-xl shadow-sm`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-500" />
                <h2 className={`text-sm font-semibold ${t.text}`}>Clientes por Status</h2>
              </div>
              <button onClick={() => onNavigate('clients')} className={`text-xs ${t.textMuted} hover:text-emerald-500 flex items-center gap-1 transition-colors`}>
                Gerenciar <ArrowRight size={12} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Ativos', value: stats.active || 0, color: 'bg-emerald-500', total: stats.total || 1 },
                { label: 'Em Trial', value: stats.trialing || 0, color: 'bg-blue-500', total: stats.total || 1 },
                { label: 'Trial Expirado', value: stats.trial_expired || 0, color: 'bg-red-500', total: stats.total || 1 },
                { label: 'Modelo A', value: stats.model_a || 0, color: 'bg-purple-500', total: stats.total || 1 },
                { label: 'Modelo B', value: stats.model_b || 0, color: 'bg-teal-500', total: stats.total || 1 },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${t.textSub}`}>{item.label}</span>
                    <span className={`text-xs font-semibold ${t.text}`}>{item.value}</span>
                  </div>
                  <div className={`h-1.5 rounded-full ${isDark ? 'bg-gray-800' : 'bg-slate-100'}`}>
                    <div
                      className={`h-1.5 rounded-full ${item.color} transition-all`}
                      style={{ width: `${Math.min(100, (item.value / item.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acesso rápido */}
          <div className={`${t.card} border rounded-xl shadow-sm`}>
            <div className={`flex items-center gap-2 px-5 py-4 border-b ${t.border}`}>
              <Activity size={16} className="text-violet-500" />
              <h2 className={`text-sm font-semibold ${t.text}`}>Acesso Rápido</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              {quickLinks.map((link, i) => (
                <button
                  key={i}
                  onClick={() => onNavigate(link.tab)}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${t.cardInner} ${t.row} transition-all hover:scale-[1.02] text-left`}
                >
                  <div className={`${link.color} flex-shrink-0`}>{link.icon}</div>
                  <div>
                    <p className={`text-xs font-semibold ${t.text}`}>{link.label}</p>
                    <p className={`text-xs ${t.textMuted} leading-tight`}>{link.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resumo financeiro detalhado (se não oculto) */}
        {!hideFinancial && (
          <div className={`${t.card} border rounded-xl shadow-sm`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-500" />
                <h2 className={`text-sm font-semibold ${t.text}`}>Resumo Financeiro</h2>
              </div>
              <button onClick={() => onNavigate('financeiro')} className={`text-xs ${t.textMuted} hover:text-emerald-500 flex items-center gap-1 transition-colors`}>
                Ver detalhes <ArrowRight size={12} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'MRR', value: fmt(mrr), color: 'text-emerald-500' },
                { label: 'ARR', value: fmt(arr), color: 'text-emerald-400' },
                { label: 'Ticket Médio', value: fmt(ticketMedio), color: 'text-blue-500' },
                { label: 'Recebido (mês)', value: fmt(receivedAmount), color: 'text-teal-500' },
                { label: 'Inadimplência', value: fmt(overdueAmount), color: overdueAmount > 0 ? 'text-red-500' : 'text-slate-400' },
                { label: 'Churn Rate', value: `${churnRate.toFixed(1)}%`, color: churnRate > 10 ? 'text-red-500' : 'text-slate-400' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
