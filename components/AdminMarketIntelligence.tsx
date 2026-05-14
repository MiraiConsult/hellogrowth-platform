'use client';
import React, { useState } from 'react';
import {
  Loader2, RefreshCw, TrendingUp, Users, MessageSquare,
  Star, AlertTriangle, CheckCircle, Info, MapPin, Package, DollarSign,
  Target, Brain, ChevronDown, ChevronUp, Search,
  BarChart3, ThumbsUp, ThumbsDown, Zap, Globe, Heart, ShoppingBag,
} from 'lucide-react';

const BRAZIL_STATES: Record<string, { name: string }> = {
  AC: { name: 'Acre' }, AL: { name: 'Alagoas' }, AP: { name: 'Amapá' },
  AM: { name: 'Amazonas' }, BA: { name: 'Bahia' }, CE: { name: 'Ceará' },
  DF: { name: 'Distrito Federal' }, ES: { name: 'Espírito Santo' }, GO: { name: 'Goiás' },
  MA: { name: 'Maranhão' }, MT: { name: 'Mato Grosso' }, MS: { name: 'Mato Grosso do Sul' },
  MG: { name: 'Minas Gerais' }, PA: { name: 'Pará' }, PB: { name: 'Paraíba' },
  PR: { name: 'Paraná' }, PE: { name: 'Pernambuco' }, PI: { name: 'Piauí' },
  RJ: { name: 'Rio de Janeiro' }, RN: { name: 'Rio Grande do Norte' },
  RS: { name: 'Rio Grande do Sul' }, RO: { name: 'Rondônia' }, RR: { name: 'Roraima' },
  SC: { name: 'Santa Catarina' }, SP: { name: 'São Paulo' }, SE: { name: 'Sergipe' },
  TO: { name: 'Tocantins' },
};

function PlanLabel({ plan }: { plan: string }) {
  const map: Record<string, { label: string; color: string }> = {
    hello_growth: { label: 'Hello Growth', color: 'text-emerald-500' },
    hello_rating: { label: 'Hello Rating', color: 'text-blue-500' },
    hello_client: { label: 'Hello Client', color: 'text-violet-500' },
    growth: { label: 'Hello Growth', color: 'text-emerald-500' },
    rating: { label: 'Hello Rating', color: 'text-blue-500' },
    client: { label: 'Hello Client', color: 'text-violet-500' },
    trial: { label: 'Trial', color: 'text-amber-500' },
  };
  const cfg = map[plan?.toLowerCase()] || { label: plan || '—', color: 'text-gray-400' };
  return <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>;
}

function NpsBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-500 text-xs">—</span>;
  const pct = Math.max(0, Math.min(100, ((value + 100) / 200) * 100));
  const color = value >= 70 ? 'bg-emerald-500' : value >= 30 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = value >= 70 ? 'text-emerald-400' : value >= 30 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${textColor}`}>{value}</span>
    </div>
  );
}

function InsightCard({ insight }: { insight: any }) {
  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle size={16} className="text-emerald-400 shrink-0" />,
    warning: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
    info: <Info size={16} className="text-blue-400 shrink-0" />,
  };
  const borders: Record<string, string> = {
    success: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
  };
  return (
    <div className={`rounded-xl border p-4 ${borders[insight.type] || borders.info}`}>
      <div className="flex items-start gap-3">
        {icons[insight.type] || icons.info}
        <div>
          <div className="text-sm font-semibold text-white">{insight.title}</div>
          <div className="text-xs mt-0.5 text-gray-400">{insight.description}</div>
        </div>
      </div>
    </div>
  );
}

function SortTh({ label, field, currentField, currentDir, onSort, align = 'left' }: any) {
  return (
    <th
      onClick={() => onSort(field)}
      className={`py-2.5 px-3 font-semibold cursor-pointer select-none group hover:text-emerald-500 transition-colors whitespace-nowrap ${align === 'center' ? 'text-center' : 'text-left'} ${currentField === field ? 'text-emerald-500' : 'text-gray-400'}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
        {label}
        {currentField === field
          ? (currentDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
          : <ChevronDown size={11} className="opacity-25 group-hover:opacity-60" />}
      </span>
    </th>
  );
}

interface AdminMarketIntelligenceProps {
  isDark?: boolean;
}

export default function AdminMarketIntelligence({ isDark = true }: AdminMarketIntelligenceProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'feedback' | 'produtos' | 'icp' | 'nicho' | 'geo' | 'odonto'>('insights');

  const [commentFilter, setCommentFilter] = useState<'all' | 'elogios' | 'reclamacoes'>('all');
  const [commentSearch, setCommentSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productSortField, setProductSortField] = useState<'count' | 'totalValue' | 'name'>('count');
  const [productSortDir, setProductSortDir] = useState<'asc' | 'desc'>('desc');
  const [icpSearch, setIcpSearch] = useState('');
  const [icpSortField, setIcpSortField] = useState<'nps' | 'leads' | 'pipeline' | 'company'>('nps');
  const [icpSortDir, setIcpSortDir] = useState<'asc' | 'desc'>('desc');
  const [nicheSearch, setNicheSearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/market-intelligence');
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredComments = data ? (() => {
    let list = commentFilter === 'elogios'
      ? (data.elogios || [])
      : commentFilter === 'reclamacoes'
        ? (data.reclamacoes || [])
        : [...(data.elogios || []), ...(data.reclamacoes || [])];
    if (commentSearch) {
      const q = commentSearch.toLowerCase();
      list = list.filter((c: any) =>
        c.text.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        (c.niche || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  })() : [];

  const filteredProducts = data ? [...(data.topProducts || [])]
    .filter((p: any) => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
    .sort((a: any, b: any) => {
      const va = a[productSortField] ?? 0;
      const vb = b[productSortField] ?? 0;
      if (typeof va === 'string') return productSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return productSortDir === 'asc' ? va - vb : vb - va;
    }) : [];

  const filteredIcp = data ? [...(data.icpCandidates || [])]
    .filter((c: any) => !icpSearch || c.company.toLowerCase().includes(icpSearch.toLowerCase()) || (c.niche || '').toLowerCase().includes(icpSearch.toLowerCase()))
    .sort((a: any, b: any) => {
      const va = a[icpSortField] ?? 0;
      const vb = b[icpSortField] ?? 0;
      if (typeof va === 'string') return icpSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return icpSortDir === 'asc' ? va - vb : vb - va;
    }) : [];

  const handleProductSort = (f: string) => {
    if (productSortField === f) setProductSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setProductSortField(f as any); setProductSortDir('desc'); }
  };
  const handleIcpSort = (f: string) => {
    if (icpSortField === f) setIcpSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setIcpSortField(f as any); setIcpSortDir('desc'); }
  };

  const tabs = [
    { id: 'insights', label: 'Insights', icon: <Brain size={14} /> },
    { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={14} /> },
    { id: 'produtos', label: 'Produtos & Valores', icon: <ShoppingBag size={14} /> },
    { id: 'icp', label: 'ICP / Persona', icon: <Target size={14} /> },
    { id: 'nicho', label: 'Por Nicho', icon: <BarChart3 size={14} /> },
    { id: 'geo', label: 'Geográfico', icon: <Globe size={14} /> },
    { id: 'odonto', label: 'Odontologia', icon: <Heart size={14} /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-white">Inteligência de Mercado</h2>
          <p className="text-xs mt-0.5 text-gray-500">Análise completa de feedback, produtos, ICP e oportunidades</p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {data ? 'Atualizar' : 'Carregar Análise'}
        </button>
      </div>

      {/* Empty state */}
      {!data && !isLoading && !error && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-16 text-center">
          <Brain size={40} className="text-emerald-500 mx-auto mb-4" />
          <div className="text-base font-semibold text-white mb-2">Central de Inteligência de Mercado</div>
          <div className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
            Clique em "Carregar Análise" para processar todos os dados de feedback, produtos, ICP, persona e insights estratégicos dos seus clientes.
          </div>
          <button onClick={loadData} className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors">
            Carregar Análise
          </button>
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-16 flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-emerald-500" />
          <div className="text-sm text-gray-400">Processando dados de mercado...</div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertTriangle size={24} className="text-red-400 mx-auto mb-2" />
          <div className="text-red-400 text-sm font-medium">{error}</div>
          <button onClick={loadData} className="mt-3 text-xs text-red-400 hover:text-red-300 underline">Tentar novamente</button>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Comentários', value: data.totalComments, icon: <MessageSquare size={16} className="text-blue-400" />, sub: `${data.elogioCount} elogios` },
              { label: 'Reclamações', value: data.reclamacaoCount, icon: <ThumbsDown size={16} className="text-red-400" />, sub: `${data.totalComments > 0 ? Math.round((data.reclamacaoCount / data.totalComments) * 100) : 0}% do total` },
              { label: 'Elogios', value: data.elogioCount, icon: <ThumbsUp size={16} className="text-emerald-400" />, sub: `${data.totalComments > 0 ? Math.round((data.elogioCount / data.totalComments) * 100) : 0}% do total` },
              { label: 'Produtos', value: data.totalProductCount, icon: <Package size={16} className="text-violet-400" />, sub: `${data.topProducts?.length || 0} únicos` },
              { label: 'Valor Total', value: `R$ ${(data.totalProductValue || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: <DollarSign size={16} className="text-emerald-400" />, sub: `Média R$ ${Math.round(data.avgProductValue || 0).toLocaleString('pt-BR')}` },
              { label: 'Pipeline', value: `R$ ${(data.totalPipeline || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={16} className="text-amber-400" />, sub: `${data.totalLeads} leads` },
              { label: 'Perfil ICP', value: data.icpCandidates?.length || 0, icon: <Target size={16} className="text-emerald-400" />, sub: 'NPS ≥ 70 + leads' },
            ].map((kpi, i) => (
              <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-1">{kpi.icon}<span className="text-xs text-gray-400">{kpi.label}</span></div>
                <div className="text-lg font-bold text-white">{kpi.value}</div>
                <div className="text-xs text-gray-500">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:opacity-80'}`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* ── INSIGHTS ── */}
          {activeTab === 'insights' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Insights Automáticos de Mercado</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(data.insights || []).map((ins: any, i: number) => (
                    <InsightCard key={i} insight={ins} />
                  ))}
                  {(!data.insights || data.insights.length === 0) && (
                    <div className="text-sm text-gray-500 col-span-2 text-center py-8">Nenhum insight disponível ainda.</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ThumbsUp size={15} className="text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Palavras mais citadas em Elogios</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(data.topElogioWords || []).slice(0, 20).map((w: any, i: number) => {
                      const maxCount = data.topElogioWords[0]?.count || 1;
                      const opacity = 0.4 + (w.count / maxCount) * 0.6;
                      return (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" style={{ opacity }}>
                          {w.word} <span className="text-emerald-600 font-bold">{w.count}</span>
                        </span>
                      );
                    })}
                    {(!data.topElogioWords || data.topElogioWords.length === 0) && (
                      <span className="text-sm text-gray-500">Nenhum dado disponível</span>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ThumbsDown size={15} className="text-red-400" />
                    <h3 className="text-sm font-semibold text-white">Palavras mais citadas em Reclamações</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(data.topReclamacaoWords || []).slice(0, 20).map((w: any, i: number) => {
                      const maxCount = data.topReclamacaoWords[0]?.count || 1;
                      const opacity = 0.4 + (w.count / maxCount) * 0.6;
                      return (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20" style={{ opacity }}>
                          {w.word} <span className="text-red-600 font-bold">{w.count}</span>
                        </span>
                      );
                    })}
                    {(!data.topReclamacaoWords || data.topReclamacaoWords.length === 0) && (
                      <span className="text-sm text-gray-500">Nenhum dado disponível</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={15} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Distribuição de Leads por Status</h3>
                </div>
                <div className="space-y-2">
                  {(data.leadStatusRanking || []).slice(0, 10).map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-xs w-36 truncate text-gray-400">{s.status}</div>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${s.pct}%` }} />
                      </div>
                      <div className="text-xs font-semibold w-10 text-right text-white">{s.count}</div>
                      <div className="text-xs w-8 text-right text-gray-500">{s.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── FEEDBACK ── */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex flex-wrap items-center gap-3">
                <div className="flex gap-2">
                  {(['all', 'elogios', 'reclamacoes'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setCommentFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        commentFilter === f
                          ? f === 'reclamacoes' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {f === 'all' ? `Todos (${data.totalComments})` : f === 'elogios' ? `Elogios (${data.elogioCount})` : `Reclamações (${data.reclamacaoCount})`}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 min-w-48">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar por texto, empresa ou nicho..."
                    value={commentSearch}
                    onChange={e => setCommentSearch(e.target.value)}
                    className="w-full text-sm pl-8 pr-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                <div className="divide-y divide-gray-800">
                  {filteredComments.slice(0, 50).map((c: any, i: number) => (
                    <div key={i} className="p-4 hover:bg-gray-800/40 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${c.score >= 9 ? 'bg-emerald-500/20 text-emerald-400' : c.score >= 7 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                          {c.score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-white">{c.company}</span>
                            {c.niche && c.niche !== 'Não informado' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">{c.niche}</span>
                            )}
                            <span className="text-xs text-gray-500 ml-auto">{new Date(c.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <p className="text-sm text-gray-400 leading-relaxed">"{c.text}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredComments.length === 0 && (
                    <div className="p-12 text-center text-gray-500 text-sm">Nenhum comentário encontrado.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUTOS & VALORES ── */}
          {activeTab === 'produtos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total de Produtos', value: data.totalProductCount, icon: <Package size={16} className="text-violet-400" />, sub: `${data.topProducts?.length || 0} nomes únicos` },
                  { label: 'Valor Total Cadastrado', value: `R$ ${(data.totalProductValue || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: <DollarSign size={16} className="text-emerald-400" />, sub: 'soma de todos os produtos' },
                  { label: 'Ticket Médio', value: `R$ ${Math.round(data.avgProductValue || 0).toLocaleString('pt-BR')}`, icon: <TrendingUp size={16} className="text-amber-400" />, sub: 'por produto/serviço' },
                  { label: 'Pipeline Total', value: `R$ ${(data.totalPipeline || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: <BarChart3 size={16} className="text-blue-400" />, sub: `${data.totalLeads} leads` },
                ].map((kpi, i) => (
                  <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                    <div className="flex items-center gap-2 mb-1">{kpi.icon}<span className="text-xs text-gray-400">{kpi.label}</span></div>
                    <div className="text-lg font-bold text-white">{kpi.value}</div>
                    <div className="text-xs text-gray-500">{kpi.sub}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="text-sm font-semibold mb-4 text-white">Distribuição por Faixa de Preço</h3>
                <div className="space-y-2.5">
                  {(data.valueRanges || []).map((r: any, i: number) => {
                    const maxCount = Math.max(...(data.valueRanges || []).map((x: any) => x.count), 1);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="text-xs w-36 text-gray-400">{r.label}</div>
                        <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                        </div>
                        <div className="text-xs font-semibold w-10 text-right text-white">{r.count}</div>
                        <div className="text-xs w-8 text-right text-gray-500">{data.totalProductCount > 0 ? Math.round((r.count / data.totalProductCount) * 100) : 0}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-white">Produtos/Serviços Mais Comuns</h3>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Buscar produto..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="text-sm pl-8 pr-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 w-48"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <SortTh label="Produto/Serviço" field="name" currentField={productSortField} currentDir={productSortDir} onSort={handleProductSort} />
                        <SortTh label="Qtd. Clientes" field="count" currentField={productSortField} currentDir={productSortDir} onSort={handleProductSort} align="center" />
                        <SortTh label="Empresas" field="tenantCount" currentField={productSortField} currentDir={productSortDir} onSort={handleProductSort} align="center" />
                        <SortTh label="Valor Total" field="totalValue" currentField={productSortField} currentDir={productSortDir} onSort={handleProductSort} align="center" />
                        <th className="text-center py-2.5 px-3 text-gray-400">Ticket Médio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p: any, i: number) => (
                        <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-white">{p.name}</td>
                          <td className="text-center py-2.5 px-3 text-gray-400">{p.count}</td>
                          <td className="text-center py-2.5 px-3 text-gray-400">{p.tenantCount}</td>
                          <td className="text-center py-2.5 px-3 font-semibold text-emerald-400">R$ {p.totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                          <td className="text-center py-2.5 px-3 text-gray-400">R$ {p.count > 0 ? Math.round(p.totalValue / p.count).toLocaleString('pt-BR') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── ICP / PERSONA ── */}
          {activeTab === 'icp' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Perfil do Cliente Ideal (ICP)</h3>
                  <span className="ml-auto text-xs text-gray-500">Critério: NPS ≥ 70 e ≥ 5 leads gerados</span>
                </div>

                {data.icpCandidates?.length > 0 && (() => {
                  const icp = data.icpCandidates;
                  const countFreq = (arr: string[]) => {
                    const f: Record<string, number> = {};
                    arr.forEach((v: string) => { f[v] = (f[v] || 0) + 1; });
                    return Object.entries(f).sort((a, b) => b[1] - a[1]);
                  };
                  const niches = icp.map((c: any) => c.niche).filter(Boolean);
                  const states = icp.map((c: any) => c.state).filter(Boolean);
                  const plans = icp.map((c: any) => c.plan).filter(Boolean);
                  const topNiche = countFreq(niches)[0];
                  const topState = countFreq(states)[0];
                  const topPlan = countFreq(plans)[0];
                  const avgNps = Math.round(icp.reduce((s: number, c: any) => s + (c.nps || 0), 0) / icp.length);
                  const avgLeads = Math.round(icp.reduce((s: number, c: any) => s + c.leads, 0) / icp.length);
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                      {[
                        { label: 'Clientes ICP', value: icp.length, icon: <Users size={14} className="text-emerald-400" /> },
                        { label: 'Nicho Principal', value: topNiche?.[0] || '—', icon: <BarChart3 size={14} className="text-blue-400" /> },
                        { label: 'Estado Principal', value: topState?.[0] || '—', icon: <MapPin size={14} className="text-violet-400" /> },
                        { label: 'Plano Comum', value: topPlan?.[0] ? <PlanLabel plan={topPlan[0]} /> : '—', icon: <Star size={14} className="text-amber-400" /> },
                        { label: 'NPS Médio', value: avgNps, icon: <Heart size={14} className="text-emerald-400" /> },
                        { label: 'Leads Médios', value: avgLeads, icon: <TrendingUp size={14} className="text-amber-400" /> },
                      ].map((kpi, i) => (
                        <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-3">
                          <div className="flex items-center gap-1.5 mb-1">{kpi.icon}<span className="text-xs text-gray-400">{kpi.label}</span></div>
                          <div className="text-sm font-bold text-white">{kpi.value}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <span className="text-xs text-gray-500">{data.icpCandidates?.length || 0} clientes com perfil ideal</span>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Buscar empresa ou nicho..."
                      value={icpSearch}
                      onChange={e => setIcpSearch(e.target.value)}
                      className="text-sm pl-8 pr-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 w-52"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <SortTh label="Empresa" field="company" currentField={icpSortField} currentDir={icpSortDir} onSort={handleIcpSort} />
                        <th className="text-left py-2.5 px-3 text-gray-400">Nicho</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Estado</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Plano</th>
                        <SortTh label="NPS" field="nps" currentField={icpSortField} currentDir={icpSortDir} onSort={handleIcpSort} align="center" />
                        <SortTh label="Leads" field="leads" currentField={icpSortField} currentDir={icpSortDir} onSort={handleIcpSort} align="center" />
                        <SortTh label="Pipeline" field="pipeline" currentField={icpSortField} currentDir={icpSortDir} onSort={handleIcpSort} align="center" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIcp.map((c: any, i: number) => (
                        <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-white">{c.company}</td>
                          <td className="py-2.5 px-3 text-gray-400 text-xs">{c.niche || '—'}</td>
                          <td className="text-center py-2.5 px-3 text-gray-400 text-xs">{c.state || '—'}</td>
                          <td className="text-center py-2.5 px-3"><PlanLabel plan={c.plan} /></td>
                          <td className="py-2.5 px-3 w-28"><NpsBar value={c.nps} /></td>
                          <td className="text-center py-2.5 px-3 font-semibold text-white">{c.leads}</td>
                          <td className="text-center py-2.5 px-3 text-emerald-400 font-semibold">R$ {c.pipeline.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                        </tr>
                      ))}
                      {filteredIcp.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-10 text-gray-500 text-sm">Nenhum cliente com perfil ICP encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="text-sm font-semibold mb-4 text-white">Distribuição por Plano</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-2.5 px-3 text-gray-400">Plano</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Clientes</th>
                        <th className="text-left py-2.5 px-3 text-gray-400 w-32">NPS Médio</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Leads Médios</th>
                        <th className="text-left py-2.5 px-3 text-gray-400">Distribuição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.planDistribution || []).map((p: any, i: number) => {
                        const maxCount = Math.max(...(data.planDistribution || []).map((x: any) => x.count), 1);
                        return (
                          <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                            <td className="py-2.5 px-3"><PlanLabel plan={p.plan} /></td>
                            <td className="text-center py-2.5 px-3 font-semibold text-white">{p.count}</td>
                            <td className="py-2.5 px-3 w-28"><NpsBar value={p.avgNps} /></td>
                            <td className="text-center py-2.5 px-3 text-gray-400">{p.avgLeads}</td>
                            <td className="py-2.5 px-3 w-40">
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(p.count / maxCount) * 100}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── POR NICHO ── */}
          {activeTab === 'nicho' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-white">Análise por Nicho de Mercado</h3>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Buscar nicho..."
                      value={nicheSearch}
                      onChange={e => setNicheSearch(e.target.value)}
                      className="text-sm pl-8 pr-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 w-44"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-2.5 px-3 text-gray-400">Nicho</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Clientes</th>
                        <th className="text-left py-2.5 px-3 text-gray-400 w-32">NPS Médio</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Total Leads</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Leads/Cliente</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Pipeline Total</th>
                        <th className="text-left py-2.5 px-3 text-gray-400">Estados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.nicheRanking || [])
                        .filter((n: any) => !nicheSearch || n.niche.toLowerCase().includes(nicheSearch.toLowerCase()))
                        .map((n: any, i: number) => (
                          <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-white">{n.niche}</td>
                            <td className="text-center py-2.5 px-3 font-semibold text-white">{n.count}</td>
                            <td className="py-2.5 px-3"><NpsBar value={n.avgNps} /></td>
                            <td className="text-center py-2.5 px-3 text-gray-400">{n.totalLeads}</td>
                            <td className={`text-center py-2.5 px-3 ${n.avgLeadsPerClient >= 10 ? 'text-emerald-400 font-semibold' : 'text-gray-400'}`}>{n.avgLeadsPerClient}</td>
                            <td className="text-center py-2.5 px-3 text-emerald-400 font-semibold">R$ {n.totalPipeline.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                            <td className="py-2.5 px-3 text-gray-500 text-xs">{(n.topStates || []).join(', ') || '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── GEOGRÁFICO ── */}
          {activeTab === 'geo' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="text-sm font-semibold mb-4 text-white">Distribuição Geográfica por Estado</h3>
                <div className="flex items-center gap-4 mb-4 flex-wrap">
                  {[
                    { color: 'bg-gray-700', label: '0 clientes' },
                    { color: 'bg-emerald-900', label: '1-2' },
                    { color: 'bg-emerald-700', label: '3-5' },
                    { color: 'bg-emerald-500', label: '6-10' },
                    { color: 'bg-emerald-400', label: '11+' },
                  ].map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-3 h-3 rounded ${l.color}`} />
                      <span className="text-gray-400">{l.label}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2">
                  {Object.entries(BRAZIL_STATES).map(([abbr, info]) => {
                    const stateData = (data.stateRanking || []).find((s: any) => s.state === abbr || s.state === info.name);
                    const count = stateData?.count || 0;
                    const color = count === 0 ? 'bg-gray-800 text-gray-600' : count <= 2 ? 'bg-emerald-900/60 text-emerald-400' : count <= 5 ? 'bg-emerald-800/70 text-emerald-300' : count <= 10 ? 'bg-emerald-700/80 text-emerald-200' : 'bg-emerald-500/90 text-white';
                    return (
                      <div
                        key={abbr}
                        className={`rounded-lg p-2 text-center cursor-pointer transition-all hover:scale-105 ${color} border border-gray-700/30`}
                        title={`${info.name}: ${count} clientes${stateData ? `, NPS ${stateData.avgNps ?? '—'}, ${stateData.totalLeads} leads` : ''}`}
                      >
                        <div className="text-xs font-bold">{abbr}</div>
                        {count > 0 && <div className="text-xs opacity-80">{count}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-white">Ranking por Estado</h3>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Buscar estado..."
                      value={stateSearch}
                      onChange={e => setStateSearch(e.target.value)}
                      className="text-sm pl-8 pr-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 w-40"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-2.5 px-3 text-gray-400">Estado</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Clientes</th>
                        <th className="text-left py-2.5 px-3 text-gray-400 w-32">NPS Médio</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Leads</th>
                        <th className="text-center py-2.5 px-3 text-gray-400">Pipeline</th>
                        <th className="text-left py-2.5 px-3 text-gray-400">Nichos</th>
                        <th className="text-left py-2.5 px-3 text-gray-400">Presença</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.stateRanking || [])
                        .filter((s: any) => !stateSearch || s.state.toLowerCase().includes(stateSearch.toLowerCase()))
                        .map((s: any, i: number) => {
                          const maxCount = (data.stateRanking[0]?.count) || 1;
                          return (
                            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                              <td className="py-2.5 px-3 font-medium text-white">{s.state}</td>
                              <td className="text-center py-2.5 px-3 font-semibold text-white">{s.count}</td>
                              <td className="py-2.5 px-3"><NpsBar value={s.avgNps} /></td>
                              <td className="text-center py-2.5 px-3 text-gray-400">{s.totalLeads}</td>
                              <td className="text-center py-2.5 px-3 text-emerald-400 font-semibold">R$ {s.totalPipeline.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                              <td className="py-2.5 px-3 text-gray-500 text-xs">{(s.topNiches || []).join(', ') || '—'}</td>
                              <td className="py-2.5 px-3 w-32">
                                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {(() => {
                const statesWithClients = new Set((data.stateRanking || []).map((s: any) => s.state));
                const opportunities = Object.entries(BRAZIL_STATES).filter(([abbr, info]) => !statesWithClients.has(abbr) && !statesWithClients.has(info.name));
                if (opportunities.length === 0) return null;
                return (
                  <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin size={15} className="text-amber-400" />
                      <h3 className="text-sm font-semibold text-white">Estados sem Clientes — Oportunidades de Expansão</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opportunities.map(([abbr, info]) => (
                        <span key={abbr} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {abbr} — {info.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── ODONTOLOGIA ── */}
          {activeTab === 'odonto' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Análise Exclusiva — Clínicas Odontológicas</h3>
                </div>
                <p className="text-xs text-gray-500 mb-5">{data.odontologiaCount || 0} clientes identificados como clínicas/dentistas</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: 'Distribuição por Cadeiras', dataKey: 'odontoCadeiras', color: 'bg-blue-500' },
                    { title: 'Distribuição por Dentistas', dataKey: 'odontoDentistas', color: 'bg-violet-500' },
                    { title: 'Possui Secretária', dataKey: 'odontoSecretaria', color: 'bg-emerald-500', altColor: 'bg-red-500' },
                  ].map((section, si) => {
                    const sectionData = data[section.dataKey] || {};
                    return (
                      <div key={si}>
                        <h4 className="text-xs font-semibold mb-3 text-gray-400">{section.title}</h4>
                        <div className="space-y-2">
                          {Object.entries(sectionData).map(([label, count]: [string, any]) => {
                            const total = Object.values(sectionData).reduce((a: any, b: any) => a + b, 0) as number;
                            const barColor = section.altColor && label === 'Não' ? section.altColor : section.color;
                            return (
                              <div key={label} className="flex items-center gap-2">
                                <span className="text-xs w-12 text-gray-400">{label}</span>
                                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                  <div className={`h-full ${barColor} rounded-full`} style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }} />
                                </div>
                                <span className="text-xs w-6 text-right font-semibold text-white">{count}</span>
                                <span className="text-xs text-gray-500">{total > 0 ? Math.round((count / total) * 100) : 0}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h3 className="text-sm font-semibold mb-4 text-white">Correlação: Porte da Clínica × Resultados</h3>
                {(() => {
                  const odontologiaTenants = (data.tenantProfiles || []).filter((tp: any) =>
                    (tp.niche || '').toLowerCase().includes('odontolog') ||
                    (tp.niche || '').toLowerCase().includes('dentist') ||
                    (tp.niche || '').toLowerCase().includes('clínica') ||
                    (tp.niche || '').toLowerCase().includes('clinica')
                  );
                  const groups: Record<string, { label: string; npsScores: number[]; leads: number; count: number }> = {
                    small: { label: '1-2 cadeiras', npsScores: [], leads: 0, count: 0 },
                    medium: { label: '3-5 cadeiras', npsScores: [], leads: 0, count: 0 },
                    large: { label: '6+ cadeiras', npsScores: [], leads: 0, count: 0 },
                  };
                  for (const tp of odontologiaTenants) {
                    const cadeiras = parseInt(String(tp.nicheData?.cadeiras || tp.nicheData?.chairs || 0));
                    const key = cadeiras >= 6 ? 'large' : cadeiras >= 3 ? 'medium' : 'small';
                    groups[key].count++;
                    if (tp.nps !== null) groups[key].npsScores.push(tp.nps);
                    groups[key].leads += tp.leads;
                  }
                  return (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left py-2.5 px-3 text-gray-400">Porte</th>
                          <th className="text-center py-2.5 px-3 text-gray-400">Clínicas</th>
                          <th className="text-left py-2.5 px-3 text-gray-400 w-32">NPS Médio</th>
                          <th className="text-center py-2.5 px-3 text-gray-400">Total Leads</th>
                          <th className="text-center py-2.5 px-3 text-gray-400">Leads/Clínica</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(groups).map((g, i) => {
                          const avgNps = g.npsScores.length > 0 ? Math.round(g.npsScores.reduce((a, b) => a + b, 0) / g.npsScores.length) : null;
                          return (
                            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                              <td className="py-2.5 px-3 font-medium text-white">{g.label}</td>
                              <td className="text-center py-2.5 px-3 font-semibold text-white">{g.count}</td>
                              <td className="py-2.5 px-3"><NpsBar value={avgNps} /></td>
                              <td className="text-center py-2.5 px-3 text-gray-400">{g.leads}</td>
                              <td className="text-center py-2.5 px-3 text-gray-400">{g.count > 0 ? Math.round(g.leads / g.count) : 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
