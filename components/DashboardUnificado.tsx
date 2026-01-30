
import React, { useMemo, useState } from 'react';
import { PlanType, Lead, NPSResponse } from '@/types';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Star, DollarSign, AlertCircle, Zap, 
  FileText, CheckCircle, Target, Heart, Award, ArrowUpRight, ArrowDownRight,
  Calendar, Clock, Sparkles, ChevronRight, Eye, AlertTriangle, Gift
} from 'lucide-react';

// ============================================
// INTERFACES
// ============================================

interface DashboardUnificadoProps {
  activePlan: PlanType;
  leads: Lead[];
  npsData: NPSResponse[];
  formsCount?: number;
  campaignsCount?: number;
}

// ============================================
// CONSTANTES - FORA DO COMPONENTE
// ============================================

const CHART_COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  pink: '#ec4899',
  orange: '#f97316'
};

const NPS_COLORS = {
  promoter: '#10b981',
  neutral: '#f59e0b',
  detractor: '#ef4444'
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const DashboardUnificado: React.FC<DashboardUnificadoProps> = ({ 
  activePlan, 
  leads, 
  npsData, 
  formsCount = 0, 
  campaignsCount = 0 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'value' | 'insights'>('overview');

  // ============================================
  // CÁLCULOS DE MÉTRICAS
  // ============================================

  const metrics = useMemo(() => {
    // Leads
    const totalLeads = leads.length;
    const totalValue = leads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    const convertedLeads = leads.filter(l => l.status === 'Vendido');
    const convertedCount = convertedLeads.length;
    const convertedValue = convertedLeads.reduce((sum, l) => sum + Number(l.value || 0), 0);
    const conversionRate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;
    const averageTicket = convertedCount > 0 ? convertedValue / convertedCount : 0;

    // NPS
    const totalNPS = npsData.length;
    const promoters = npsData.filter(n => n.status === 'Promotor').length;
    const neutrals = npsData.filter(n => n.status === 'Neutro').length;
    const detractors = npsData.filter(n => n.status === 'Detrator').length;
    const npsScore = totalNPS > 0 ? Math.round(((promoters - detractors) / totalNPS) * 100) : 0;

    // Leads por status
    const newLeads = leads.filter(l => l.status === 'Novo').length;
    const inContactLeads = leads.filter(l => l.status === 'Em Contato').length;
    const negotiationLeads = leads.filter(l => l.status === 'Negociação').length;
    const lostLeads = leads.filter(l => l.status === 'Perdido').length;

    // Leads recuperados (vendidos após 7+ dias)
    const recoveredLeads = leads.filter(l => {
      const days = Math.floor((Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24));
      return l.status === 'Vendido' && days > 7;
    });
    const recoveredCount = recoveredLeads.length;
    const recoveredValue = recoveredLeads.reduce((sum, l) => sum + Number(l.value || 0), 0);

    // Oportunidades de alto valor
    const highValueOpportunities = leads.filter(l => 
      l.status === 'Negociação' && Number(l.value || 0) >= 1000
    );
    const highValueCount = highValueOpportunities.length;
    const highValueTotal = highValueOpportunities.reduce((sum, l) => sum + Number(l.value || 0), 0);

    // Leads em risco (parados há mais de 7 dias)
    const atRiskLeads = leads.filter(l => {
      const days = Math.floor((Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24));
      return days > 7 && l.status !== 'Vendido' && l.status !== 'Perdido';
    }).length;

    return {
      totalLeads,
      totalValue,
      convertedCount,
      convertedValue,
      conversionRate,
      averageTicket,
      totalNPS,
      promoters,
      neutrals,
      detractors,
      npsScore,
      newLeads,
      inContactLeads,
      negotiationLeads,
      lostLeads,
      recoveredCount,
      recoveredValue,
      highValueCount,
      highValueTotal,
      atRiskLeads
    };
  }, [leads, npsData]);

  // ============================================
  // DADOS PARA GRÁFICOS
  // ============================================

  // Vendas ao longo do tempo
  const salesOverTime = useMemo(() => {
    const monthlyData: Record<string, { month: string; sortKey: string; value: number; count: number }> = {};
    
    leads.filter(l => l.status === 'Vendido').forEach(lead => {
      const date = new Date(lead.date);
      if (isNaN(date.getTime())) return;
      
      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' });
      
      if (!monthlyData[sortKey]) {
        monthlyData[sortKey] = { month: monthLabel, sortKey, value: 0, count: 0 };
      }
      
      monthlyData[sortKey].value += Number(lead.value || 0);
      monthlyData[sortKey].count += 1;
    });
    
    return Object.values(monthlyData)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-6);
  }, [leads]);

  // Distribuição NPS
  const npsDistribution = useMemo(() => [
    { name: 'Promotores', value: metrics.promoters, color: NPS_COLORS.promoter },
    { name: 'Neutros', value: metrics.neutrals, color: NPS_COLORS.neutral },
    { name: 'Detratores', value: metrics.detractors, color: NPS_COLORS.detractor }
  ], [metrics]);

  // Funil de vendas
  const funnelData = useMemo(() => [
    { name: 'Novos', value: metrics.newLeads, fill: '#93c5fd' },
    { name: 'Em Contato', value: metrics.inContactLeads, fill: '#60a5fa' },
    { name: 'Negociação', value: metrics.negotiationLeads, fill: '#3b82f6' },
    { name: 'Vendido', value: metrics.convertedCount, fill: '#1d4ed8' }
  ], [metrics]);

  // Status dos leads
  const leadStatusData = useMemo(() => {
    const statusCount: Record<string, number> = {};
    leads.forEach(lead => {
      statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
    });
    return Object.entries(statusCount).map(([status, count]) => ({ status, count }));
  }, [leads]);

  // ============================================
  // HELPERS
  // ============================================

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatCurrencyFull = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getNPSClassification = (score: number) => {
    if (score >= 75) return { label: 'Excelente', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 50) return { label: 'Muito Bom', color: 'text-green-500', bg: 'bg-green-50' };
    if (score >= 0) return { label: 'Bom', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Crítico', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const npsClass = getNPSClassification(metrics.npsScore);

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ============================================ */}
      {/* HERO SECTION - VALOR TOTAL */}
      {/* ============================================ */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={20} className="text-yellow-300" />
                <span className="text-emerald-100 text-sm font-medium">Dashboard Inteligente</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                Olá! Veja o valor que estamos gerando juntos
              </h1>
              <p className="text-emerald-100 text-base">
                Acompanhe em tempo real o impacto do Hello Growth no seu negócio
              </p>
            </div>
            
            {/* Hero Metric - Total Value Generated */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-emerald-100 text-sm">Valor Total Identificado</p>
                  <p className="text-3xl font-bold">{formatCurrency(metrics.totalValue)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
                <div className="text-center">
                  <p className="text-2xl font-bold">{metrics.totalLeads}</p>
                  <p className="text-xs text-emerald-100">Oportunidades</p>
                </div>
                <div className="w-px h-8 bg-white/20"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatCurrency(metrics.convertedValue)}</p>
                  <p className="text-xs text-emerald-100">Convertido</p>
                </div>
                <div className="w-px h-8 bg-white/20"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{metrics.conversionRate.toFixed(0)}%</p>
                  <p className="text-xs text-emerald-100">Conversão</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'overview' 
                  ? 'bg-white text-emerald-700 shadow-lg' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Eye size={18} className="inline mr-2" />
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('value')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'value' 
                  ? 'bg-white text-emerald-700 shadow-lg' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Gift size={18} className="inline mr-2" />
              Valor Entregue
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'insights' 
                  ? 'bg-white text-emerald-700 shadow-lg' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Sparkles size={18} className="inline mr-2" />
              Insights
            </button>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* CONTEÚDO PRINCIPAL */}
      {/* ============================================ */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* ============================================ */}
        {/* TAB: VISÃO GERAL */}
        {/* ============================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Oportunidades */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Target size={24} className="text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    Pré-Venda
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Oportunidades</h3>
                <p className="text-3xl font-bold text-gray-900">{metrics.totalLeads}</p>
                <p className="text-sm text-gray-500 mt-2">{formatCurrencyFull(metrics.totalValue)} em pipeline</p>
              </div>

              {/* Vendas */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign size={24} className="text-green-600" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <ArrowUpRight size={16} />
                    {metrics.conversionRate.toFixed(1)}%
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Vendas Convertidas</h3>
                <p className="text-3xl font-bold text-gray-900">{metrics.convertedCount}</p>
                <p className="text-sm text-green-600 mt-2">{formatCurrencyFull(metrics.convertedValue)}</p>
              </div>

              {/* NPS */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Star size={24} className="text-purple-600" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${npsClass.bg} ${npsClass.color}`}>
                    {npsClass.label}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">NPS Score</h3>
                <p className="text-3xl font-bold text-gray-900">{metrics.npsScore}</p>
                <p className="text-sm text-gray-500 mt-2">{metrics.totalNPS} respostas</p>
              </div>

              {/* Ações Pendentes */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertCircle size={24} className="text-red-600" />
                  </div>
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    Atenção
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Ações Pendentes</h3>
                <p className="text-3xl font-bold text-gray-900">{metrics.detractors + metrics.atRiskLeads}</p>
                <p className="text-sm text-gray-500 mt-2">{metrics.detractors} detratores + {metrics.atRiskLeads} leads em risco</p>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vendas ao Longo do Tempo */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Vendas ao Longo do Tempo</h3>
                <div style={{ minHeight: '300px' }}>
                  {salesOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={salesOverTime}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="month" stroke="#9ca3af" axisLine={false} tickLine={false} />
                        <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrencyFull(value), 'Valor']}
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="value" stroke={CHART_COLORS.success} strokeWidth={3} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400">
                      <p>Nenhuma venda registrada ainda</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Funil de Vendas */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Funil de Vendas</h3>
                <div style={{ minHeight: '300px' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                      <XAxis type="number" stroke="#9ca3af" axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#9ca3af" axisLine={false} tickLine={false} width={80} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Distribuição NPS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Distribuição NPS</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div style={{ minHeight: '250px' }}>
                  {metrics.totalNPS > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={npsDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {npsDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-60 flex items-center justify-center text-gray-400">
                      <p>Nenhuma resposta NPS ainda</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="font-medium text-gray-700">Promotores (9-10)</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{metrics.promoters}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                      <span className="font-medium text-gray-700">Neutros (7-8)</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">{metrics.neutrals}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="font-medium text-gray-700">Detratores (0-6)</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">{metrics.detractors}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: VALOR ENTREGUE */}
        {/* ============================================ */}
        {activeTab === 'value' && (
          <div className="space-y-8">
            {/* Resumo Executivo de Valor */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Award size={28} />
                <h2 className="text-2xl font-bold">Resumo do Valor Entregue</h2>
              </div>
              <p className="text-green-100 mb-6">
                Veja o impacto real que o Hello Growth está gerando para o seu negócio
              </p>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-green-100 text-sm">Valor Total Identificado</p>
                  <p className="text-3xl font-bold">{formatCurrency(metrics.totalValue)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-green-100 text-sm">Valor Convertido</p>
                  <p className="text-3xl font-bold">{formatCurrency(metrics.convertedValue)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-green-100 text-sm">Taxa de Conversão</p>
                  <p className="text-3xl font-bold">{metrics.conversionRate.toFixed(1)}%</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <p className="text-green-100 text-sm">Ticket Médio</p>
                  <p className="text-3xl font-bold">{formatCurrency(metrics.averageTicket)}</p>
                </div>
              </div>
            </div>

            {/* Cards de Valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Oportunidades Geradas */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Target size={28} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-blue-700 text-sm font-medium bg-blue-200/50 px-3 py-1 rounded-full">
                    <TrendingUp size={16} />
                    Ativo
                  </div>
                </div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Oportunidades Geradas</h3>
                <p className="text-4xl font-bold text-blue-900 mb-2">{metrics.totalLeads}</p>
                <p className="text-blue-700">
                  {formatCurrencyFull(metrics.totalValue)} em potencial
                </p>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-blue-600">
                    Leads capturados através dos formulários e campanhas
                  </p>
                </div>
              </div>

              {/* Vendas Convertidas */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center">
                    <DollarSign size={28} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-green-700 text-sm font-medium bg-green-200/50 px-3 py-1 rounded-full">
                    <ArrowUpRight size={16} />
                    {metrics.conversionRate.toFixed(0)}%
                  </div>
                </div>
                <h3 className="text-lg font-bold text-green-900 mb-2">Vendas Convertidas</h3>
                <p className="text-4xl font-bold text-green-900 mb-2">{metrics.convertedCount}</p>
                <p className="text-green-700">
                  {formatCurrencyFull(metrics.convertedValue)} faturado
                </p>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm text-green-600">
                    Negócios fechados com sucesso
                  </p>
                </div>
              </div>

              {/* NPS Registrados */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center">
                    <Star size={28} className="text-white" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full ${
                    metrics.npsScore >= 50 ? 'bg-green-200/50 text-green-700' : 'bg-yellow-200/50 text-yellow-700'
                  }`}>
                    {metrics.npsScore >= 50 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {npsClass.label}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-purple-900 mb-2">NPS Registrados</h3>
                <p className="text-4xl font-bold text-purple-900 mb-2">{metrics.totalNPS}</p>
                <p className="text-purple-700">
                  Score: {metrics.npsScore}
                </p>
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <p className="text-sm text-purple-600">
                    {metrics.promoters} promotores identificados
                  </p>
                </div>
              </div>

              {/* Leads Recuperados */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center">
                    <Heart size={28} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-orange-700 text-sm font-medium bg-orange-200/50 px-3 py-1 rounded-full">
                    <CheckCircle size={16} />
                    Recuperados
                  </div>
                </div>
                <h3 className="text-lg font-bold text-orange-900 mb-2">Leads Recuperados</h3>
                <p className="text-4xl font-bold text-orange-900 mb-2">{metrics.recoveredCount}</p>
                <p className="text-orange-700">
                  {formatCurrencyFull(metrics.recoveredValue)} recuperado
                </p>
                <div className="mt-4 pt-4 border-t border-orange-200">
                  <p className="text-sm text-orange-600">
                    Leads que estavam parados e foram convertidos
                  </p>
                </div>
              </div>

              {/* Oportunidades de Alto Valor */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border border-indigo-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <Zap size={28} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-indigo-700 text-sm font-medium bg-indigo-200/50 px-3 py-1 rounded-full">
                    <Sparkles size={16} />
                    Alto Valor
                  </div>
                </div>
                <h3 className="text-lg font-bold text-indigo-900 mb-2">Oportunidades Identificadas</h3>
                <p className="text-4xl font-bold text-indigo-900 mb-2">{metrics.highValueCount}</p>
                <p className="text-indigo-700">
                  {formatCurrencyFull(metrics.highValueTotal)} em negociação
                </p>
                <div className="mt-4 pt-4 border-t border-indigo-200">
                  <p className="text-sm text-indigo-600">
                    Leads de alto valor prontos para fechar
                  </p>
                </div>
              </div>

              {/* Promotores */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl border border-teal-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-teal-600 rounded-xl flex items-center justify-center">
                    <Users size={28} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-teal-700 text-sm font-medium bg-teal-200/50 px-3 py-1 rounded-full">
                    <Gift size={16} />
                    Indicadores
                  </div>
                </div>
                <h3 className="text-lg font-bold text-teal-900 mb-2">Promotores</h3>
                <p className="text-4xl font-bold text-teal-900 mb-2">{metrics.promoters}</p>
                <p className="text-teal-700">
                  Clientes muito satisfeitos
                </p>
                <div className="mt-4 pt-4 border-t border-teal-200">
                  <p className="text-sm text-teal-600">
                    Potenciais indicadores do seu negócio
                  </p>
                </div>
              </div>
            </div>

            {/* Gráfico de Evolução */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Evolução das Vendas</h3>
              <div style={{ minHeight: '350px' }}>
                {salesOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={salesOverTime}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="month" stroke="#9ca3af" axisLine={false} tickLine={false} />
                      <YAxis stroke="#9ca3af" axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'value') return [formatCurrencyFull(value), 'Valor'];
                          return [value, 'Vendas'];
                        }}
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" fill={CHART_COLORS.success} radius={[8, 8, 0, 0]} name="value" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-gray-400">
                    <p>Nenhuma venda registrada ainda</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* TAB: INSIGHTS */}
        {/* ============================================ */}
        {activeTab === 'insights' && (
          <div className="space-y-8">
            {/* Alertas e Oportunidades */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alertas */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Requer Atenção</h3>
                </div>
                
                <div className="space-y-4">
                  {metrics.detractors > 0 && (
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                      <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="text-red-600" />
                        <div>
                          <p className="font-medium text-gray-900">Detratores</p>
                          <p className="text-sm text-gray-500">Clientes insatisfeitos que precisam de atenção</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-red-600">{metrics.detractors}</span>
                    </div>
                  )}
                  
                  {metrics.atRiskLeads > 0 && (
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
                      <div className="flex items-center gap-3">
                        <Clock size={20} className="text-orange-600" />
                        <div>
                          <p className="font-medium text-gray-900">Leads em Risco</p>
                          <p className="text-sm text-gray-500">Parados há mais de 7 dias</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-orange-600">{metrics.atRiskLeads}</span>
                    </div>
                  )}

                  {metrics.detractors === 0 && metrics.atRiskLeads === 0 && (
                    <div className="flex items-center justify-center p-8 bg-green-50 rounded-xl border border-green-100">
                      <div className="text-center">
                        <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
                        <p className="font-medium text-green-700">Tudo em ordem!</p>
                        <p className="text-sm text-green-600">Nenhum alerta no momento</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Oportunidades */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Sparkles size={20} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Oportunidades</h3>
                </div>
                
                <div className="space-y-4">
                  {metrics.promoters > 0 && (
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                      <div className="flex items-center gap-3">
                        <Users size={20} className="text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">Promotores</p>
                          <p className="text-sm text-gray-500">Peça indicações para esses clientes</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-green-600">{metrics.promoters}</span>
                    </div>
                  )}
                  
                  {metrics.highValueCount > 0 && (
                    <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-3">
                        <Zap size={20} className="text-indigo-600" />
                        <div>
                          <p className="font-medium text-gray-900">Alto Valor</p>
                          <p className="text-sm text-gray-500">{formatCurrency(metrics.highValueTotal)} em negociação</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-indigo-600">{metrics.highValueCount}</span>
                    </div>
                  )}

                  {metrics.negotiationLeads > 0 && (
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-3">
                        <Target size={20} className="text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">Em Negociação</p>
                          <p className="text-sm text-gray-500">Leads prontos para fechar</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">{metrics.negotiationLeads}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Métricas Rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Formulários Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{formsCount}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Pesquisas Ativas</p>
                <p className="text-2xl font-bold text-gray-900">{campaignsCount}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Novos Leads</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.newLeads}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Em Contato</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.inContactLeads}</p>
              </div>
            </div>

            {/* Dicas do Sistema */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles size={24} />
                <h3 className="text-xl font-bold">Dicas para Maximizar Resultados</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <h4 className="font-bold mb-2">📞 Contate os Detratores</h4>
                  <p className="text-sm text-indigo-100">
                    Clientes insatisfeitos podem se tornar promotores com o atendimento certo.
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <h4 className="font-bold mb-2">🎯 Foque nos Leads Quentes</h4>
                  <p className="text-sm text-indigo-100">
                    Leads em negociação têm maior chance de conversão. Priorize-os!
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <h4 className="font-bold mb-2">⭐ Peça Indicações</h4>
                  <p className="text-sm text-indigo-100">
                    Promotores são seus melhores vendedores. Peça indicações!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardUnificado;
