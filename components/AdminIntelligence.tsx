'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Brain, BarChart2, MessageSquare,
  Loader2, RefreshCw, ChevronDown, ChevronUp, Zap, AlertTriangle,
  CheckCircle, Star, Target, Lightbulb, ArrowUp, ArrowDown,
  ThumbsUp, ThumbsDown, Activity, Users, DollarSign, Award, Minus,
  Calendar, FileText, Package, Search, Eye, Tag, ShoppingBag, Download, Globe
} from 'lucide-react';
import AdminMarketIntelligence from './AdminMarketIntelligence';

interface AdminIntelligenceProps {
  isDark: boolean;
  tenants: any[];
  globalStats: any;
  sectorAnalytics?: any[];
}

const DARK = {
  bg: 'bg-gray-950', surface: 'bg-gray-900', border: 'border-gray-800',
  text: 'text-white', textSub: 'text-gray-400', textMuted: 'text-gray-500',
  label: 'text-gray-400', kpi: 'bg-gray-900 border-gray-800', card: 'bg-gray-900 border-gray-800',
  cardInner: 'bg-gray-800/50 border-gray-700', badge: 'bg-gray-800 text-gray-300',
  tableRow: 'hover:bg-gray-800/30', input: 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500',
};
const LIGHT = {
  bg: 'bg-slate-50', surface: 'bg-white', border: 'border-slate-200',
  text: 'text-slate-900', textSub: 'text-slate-500', textMuted: 'text-slate-400',
  label: 'text-slate-500', kpi: 'bg-white border-slate-200', card: 'bg-white border-slate-200',
  cardInner: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-600',
  tableRow: 'hover:bg-slate-50', input: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
};

function NpsGauge({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' | 'lg' }) {
  if (score === null || score === undefined) return <span className="text-gray-400 text-sm font-medium">—</span>;
  const color = score >= 70 ? 'text-emerald-500' : score >= 30 ? 'text-yellow-500' : 'text-red-500';
  const sizes = { sm: 'text-base font-bold', md: 'text-2xl font-bold', lg: 'text-4xl font-bold' };
  return <span className={`${color} ${sizes[size]}`}>{score}</span>;
}

function TrendIcon({ trend }: { trend: string | null }) {
  if (!trend || trend === 'stable') return <Minus size={14} className="text-gray-400" />;
  if (trend === 'up') return <ArrowUp size={14} className="text-emerald-500" />;
  return <ArrowDown size={14} className="text-red-400" />;
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-yellow-500' : 'text-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200/30 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className={`text-xs font-bold ${textColor} w-6 text-right`}>{score}</span>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    hello_growth: { label: 'Growth', cls: 'bg-violet-100 text-violet-700' },
    growth: { label: 'Growth', cls: 'bg-violet-100 text-violet-700' },
    hello_rating: { label: 'Rating', cls: 'bg-blue-100 text-blue-700' },
    rating: { label: 'Rating', cls: 'bg-blue-100 text-blue-700' },
    hello_client: { label: 'Client', cls: 'bg-indigo-100 text-indigo-700' },
    client: { label: 'Client', cls: 'bg-indigo-100 text-indigo-700' },
    trial: { label: 'Trial', cls: 'bg-slate-100 text-slate-600' },
    growth_lifetime: { label: 'Lifetime', cls: 'bg-amber-100 text-amber-700' },
  };
  const cfg = map[plan] || { label: plan || '—', cls: 'bg-slate-100 text-slate-500' };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cfg.cls}`}>{cfg.label}</span>;
}

function QuestionTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    nps: { label: 'NPS', cls: 'bg-emerald-100 text-emerald-700' },
    text: { label: 'Texto', cls: 'bg-blue-100 text-blue-700' },
    single: { label: 'Única', cls: 'bg-violet-100 text-violet-700' },
    multiple_choice: { label: 'Múltipla', cls: 'bg-orange-100 text-orange-700' },
    rating: { label: 'Avaliação', cls: 'bg-yellow-100 text-yellow-700' },
    csat: { label: 'CSAT', cls: 'bg-teal-100 text-teal-700' },
  };
  const cfg = map[type] || { label: type, cls: 'bg-slate-100 text-slate-500' };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
}

export default function AdminIntelligence({ isDark, tenants, globalStats, sectorAnalytics = [] }: AdminIntelligenceProps) {
  const t = isDark ? DARK : LIGHT;

  const [activeSection, setActiveSection] = useState<'overview' | 'usage' | 'sectors' | 'trends' | 'products' | 'clients' | 'surveys' | 'ai_costs' | 'mercado'>('overview');

  // Custos de IA
  const [aiUsageData, setAiUsageData] = useState<any>(null);
  const [isLoadingAiUsage, setIsLoadingAiUsage] = useState(false);
  const [aiUsagePeriod, setAiUsagePeriod] = useState('30');

  // Filtro de data para Tendências NPS
  const [trendsDatePreset, setTrendsDatePreset] = useState('12m');

  // Tendências
  const [trendsData, setTrendsData] = useState<any>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // Pesquisas
  const [surveysData, setSurveysData] = useState<any>(null);
  const [isLoadingSurveys, setIsLoadingSurveys] = useState(false);
  const [surveySearch, setSurveySearch] = useState('');
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);
  const [surveyTenantFilter, setSurveyTenantFilter] = useState('');

  // Produtos
  const [productsData, setProductsData] = useState<any>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsAI, setProductsAI] = useState<any>(null);
  const [isLoadingProductsAI, setIsLoadingProductsAI] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productTenantFilter, setProductTenantFilter] = useState('');
  const [productSortField, setProductSortField] = useState<'name' | 'tenant' | 'value'>('value');
  const [productSortDir, setProductSortDir] = useState<'asc' | 'desc'>('desc');

  // Clientes
  const [tenantAI, setTenantAI] = useState<Record<string, any>>({});
  const [isLoadingTenantAI, setIsLoadingTenantAI] = useState<string | null>(null);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSortField, setClientSortField] = useState<'healthScore' | 'companyName' | 'nps' | 'leads' | 'pipeline'>('healthScore');
  const [clientSortDir, setClientSortDir] = useState<'asc' | 'desc'>('desc');
  const [clientPlanFilter, setClientPlanFilter] = useState('all');

  // Ordenação da tabela de ranking (visão geral)
  const [rankSortField, setRankSortField] = useState<'healthScore' | 'companyName' | 'nps' | 'responses' | 'leads' | 'pipeline' | 'trend' | 'plan'>('healthScore');
  const [rankSortDir, setRankSortDir] = useState<'asc' | 'desc'>('desc');
  const [rankSearch, setRankSearch] = useState('');

  // Busca e ordenação para Uso Real
  const [usageSearch, setUsageSearch] = useState('');
  const [usageSortField, setUsageSortField] = useState<'engagementScore' | 'companyName' | 'npsResponses' | 'leadsTotal' | 'daysSinceActivity'>('engagementScore');
  const [usageSortDir, setUsageSortDir] = useState<'asc' | 'desc'>('desc');

  // Busca e ordenação para Análise por Setor
  const [sectorSearch, setSectorSearch] = useState('');
  const [sectorSortField, setSectorSortField] = useState<'tenantCount' | 'sector' | 'avgNps' | 'totalLeads' | 'conversionRate' | 'totalPipeline'>('tenantCount');
  const [sectorSortDir, setSectorSortDir] = useState<'asc' | 'desc'>('desc');

  // Busca para Tendências
  const [trendSearch, setTrendSearch] = useState('');

  // Busca e ordenação para Custos IA
  const [aiEndpointSearch, setAiEndpointSearch] = useState('');
  const [aiEndpointSortField, setAiEndpointSortField] = useState('calls');
  const [aiEndpointSortDir, setAiEndpointSortDir] = useState<'asc' | 'desc'>('desc');
  const [aiClientSearch, setAiClientSearch] = useState('');
  const [aiClientSortField, setAiClientSortField] = useState('calls');
  const [aiClientSortDir, setAiClientSortDir] = useState<'asc' | 'desc'>('desc');

  const handleRankSort = (field: typeof rankSortField) => {
    if (rankSortField === field) setRankSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setRankSortField(field); setRankSortDir('desc'); }
  };

  const rankSortedTenants = [...tenants].filter(t => !rankSearch || t.companyName?.toLowerCase().includes(rankSearch.toLowerCase())).sort((a, b) => {
    let va: any, vb: any;
    if (rankSortField === 'healthScore') { va = a.healthScore || 0; vb = b.healthScore || 0; }
    else if (rankSortField === 'companyName') { va = a.companyName || ''; vb = b.companyName || ''; }
    else if (rankSortField === 'nps') { va = a.nps?.score ?? -999; vb = b.nps?.score ?? -999; }
    else if (rankSortField === 'responses') { va = a.nps?.totalResponses || 0; vb = b.nps?.totalResponses || 0; }
    else if (rankSortField === 'leads') { va = a.leads?.total || 0; vb = b.leads?.total || 0; }
    else if (rankSortField === 'pipeline') { va = a.leads?.pipelineValue || 0; vb = b.leads?.pipelineValue || 0; }
    else if (rankSortField === 'trend') { va = a.nps?.trend || ''; vb = b.nps?.trend || ''; }
    else if (rankSortField === 'plan') { va = a.plan || ''; vb = b.plan || ''; }
    else { va = 0; vb = 0; }
    if (typeof va === 'string') return rankSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return rankSortDir === 'asc' ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
  });

  const loadTrends = useCallback(async (preset?: string) => {
    setIsLoadingTrends(true);
    try {
      const p = preset !== undefined ? preset : trendsDatePreset;
      const params = new URLSearchParams({ type: 'trends' });
      const n = new Date();
      if (p === '3m') { const f = new Date(n); f.setMonth(f.getMonth() - 3); params.set('dateFrom', f.toISOString().split('T')[0]); }
      else if (p === '6m') { const f = new Date(n); f.setMonth(f.getMonth() - 6); params.set('dateFrom', f.toISOString().split('T')[0]); }
      else if (p === '12m') { const f = new Date(n); f.setFullYear(f.getFullYear() - 1); params.set('dateFrom', f.toISOString().split('T')[0]); }
      else if (p === 'year') { params.set('dateFrom', `${n.getFullYear()}-01-01`); }
      const res = await fetch(`/api/admin/analytics?${params}`);
      setTrendsData(await res.json());
    } finally { setIsLoadingTrends(false); }
  }, [trendsDatePreset]);

  const loadSurveys = useCallback(async () => {
    setIsLoadingSurveys(true);
    try {
      const res = await fetch('/api/admin/surveys');
      setSurveysData(await res.json());
    } finally { setIsLoadingSurveys(false); }
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch('/api/admin/products');
      setProductsData(await res.json());
    } finally { setIsLoadingProducts(false); }
  }, []);

  const generateProductsAI = useCallback(async () => {
    if (!productsData) return;
    setIsLoadingProductsAI(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productsData.allProducts }),
      });
      const data = await res.json();
      setProductsAI(data.analysis);
    } finally { setIsLoadingProductsAI(false); }
  }, [productsData]);

  const generateTenantAI = useCallback(async (tenant: any) => {
    const tid = tenant.tenantId;
    setIsLoadingTenantAI(tid);
    try {
      const detailRes = await fetch(`/api/admin/analytics?type=tenant&tenantId=${tid}`);
      const detail = await detailRes.json();
      const res = await fetch('/api/admin/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tenant-analysis',
          tenantId: tid,
          data: {
            companyName: tenant.companyName,
            npsScore: tenant.nps?.score,
            totalResponses: tenant.nps?.totalResponses,
            comments: detail?.nps?.allTexts?.slice(0, 30),
            leads: tenant.leads,
            lastDiagnostic: tenant.lastDiagnostic,
            monthlyTrend: detail?.nps?.monthly?.slice(-4),
          }
        })
      });
      const data = await res.json();
      setTenantAI(prev => ({ ...prev, [tid]: data.analysis }));
    } finally { setIsLoadingTenantAI(null); }
  }, []);

  useEffect(() => {
    if (activeSection === 'trends' && !trendsData) loadTrends();
    if (activeSection === 'surveys' && !surveysData) loadSurveys();
    if (activeSection === 'products' && !productsData) loadProducts();
  }, [activeSection]);

  const filteredTenants = tenants
    .filter(ten => {
      const matchSearch = !clientSearch || ten.companyName?.toLowerCase().includes(clientSearch.toLowerCase());
      const matchPlan = clientPlanFilter === 'all' || ten.plan === clientPlanFilter;
      return matchSearch && matchPlan;
    })
    .sort((a, b) => {
      let va: any, vb: any;
      if (clientSortField === 'healthScore') { va = a.healthScore || 0; vb = b.healthScore || 0; }
      else if (clientSortField === 'companyName') { va = a.companyName || ''; vb = b.companyName || ''; }
      else if (clientSortField === 'nps') { va = a.nps?.score ?? -999; vb = b.nps?.score ?? -999; }
      else if (clientSortField === 'leads') { va = a.leads || 0; vb = b.leads || 0; }
      else if (clientSortField === 'pipeline') { va = a.pipeline || 0; vb = b.pipeline || 0; }
      else { va = 0; vb = 0; }
      if (clientSortDir === 'asc') return va > vb ? 1 : va < vb ? -1 : 0;
      return va < vb ? 1 : va > vb ? -1 : 0;
    });

  const filteredSurveys = (surveysData?.campaigns || []).filter((c: any) => {
    const matchSearch = !surveySearch || c.name?.toLowerCase().includes(surveySearch.toLowerCase());
    const matchTenant = !surveyTenantFilter || c.tenantId === surveyTenantFilter;
    return matchSearch && matchTenant;
  });

  const filteredProducts = (() => {
    if (!productsData) return [];
    let all = productsData.allProducts || [];
    if (productSearch) all = all.filter((p: any) => p.name?.toLowerCase().includes(productSearch.toLowerCase()));
    if (productTenantFilter) all = all.filter((p: any) => p.tenant === productTenantFilter);
    return all;
  })();

  const cardCls = `${t.card} border rounded-xl p-5`;
  const sectionBtnCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active
      ? 'bg-emerald-600 text-white'
      : `${t.badge} hover:opacity-80`}`;

  return (
    <div className={`min-h-screen min-w-0 ${t.bg}`}>
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* Navegação */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'overview', label: 'Visão Geral', icon: <BarChart2 size={14} /> },
            { id: 'usage', label: 'Uso Real', icon: <Activity size={14} /> },
            { id: 'sectors', label: 'Análise por Setor', icon: <Tag size={14} /> },
            { id: 'trends', label: 'Tendências NPS', icon: <TrendingUp size={14} /> },
            { id: 'products', label: 'Produtos & Preços', icon: <Package size={14} /> },
            { id: 'clients', label: 'Análise por Cliente', icon: <Users size={14} /> },
            { id: 'ai_costs', label: 'Custos IA', icon: <Zap size={14} /> },
            { id: 'mercado', label: 'Inteligência de Mercado', icon: <Globe size={14} /> },
          ].map(sec => (
            <button key={sec.id} onClick={() => setActiveSection(sec.id as any)} className={sectionBtnCls(activeSection === sec.id)}>
              <span className="flex items-center gap-1.5">{sec.icon} {sec.label}</span>
            </button>
          ))}
        </div>

        {/* ── VISÃO GERAL ── */}
        {activeSection === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'NPS Global', value: <NpsGauge score={globalStats?.npsScore} />, sub: `${globalStats?.totalNpsResponses || 0} respostas`, icon: <Star size={16} className="text-yellow-500" /> },
                { label: 'Clientes Ativos', value: <span className="text-2xl font-bold text-emerald-500">{globalStats?.activeTenantsCount || 0}</span>, sub: 'com dados', icon: <Users size={16} className="text-emerald-500" /> },
                { label: 'Leads Totais', value: <span className="text-2xl font-bold text-blue-500">{globalStats?.totalLeads || 0}</span>, sub: 'captados', icon: <Target size={16} className="text-blue-500" /> },
                { label: 'Pipeline', value: <span className="text-2xl font-bold text-purple-500">R$ {((globalStats?.totalPipelineValue || 0) / 1000).toFixed(1)}k</span>, sub: 'em oportunidades', icon: <DollarSign size={16} className="text-purple-500" /> },
                { label: 'Diagnósticos MPD', value: <span className="text-2xl font-bold text-orange-500">{globalStats?.totalDiagnostics || 0}</span>, sub: 'realizados', icon: <Activity size={16} className="text-orange-500" /> },
                { label: 'Clientes', value: <span className="text-2xl font-bold text-teal-500">{tenants.length}</span>, sub: 'com atividade', icon: <Award size={16} className="text-teal-500" /> },
              ].map((kpi, i) => (
                <div key={i} className={`${t.kpi} border rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs ${t.textMuted} font-medium`}>{kpi.label}</span>
                    {kpi.icon}
                  </div>
                  <div className="mb-0.5">{kpi.value}</div>
                  <div className={`text-xs ${t.textMuted}`}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Ranking de clientes */}
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
                  <Award size={16} className="text-emerald-500" /> Ranking de Clientes por Health Score
                  <span className={`text-xs font-normal ${t.textMuted}`}>{rankSortedTenants.length} clientes</span>
                </h3>
                <div className="relative">
                  <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                  <input type="text" placeholder="Buscar empresa..." value={rankSearch} onChange={e => setRankSearch(e.target.value)} className={`text-sm pl-8 pr-3 py-1.5 rounded-lg border ${t.input} w-44`} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-xs border-b ${t.border}`}>
                      {([
                        { label: 'Empresa', field: 'companyName', align: 'left' },
                        { label: 'Plano', field: 'plan', align: 'center' },
                        { label: 'NPS', field: 'nps', align: 'center' },
                        { label: 'Respostas', field: 'responses', align: 'center' },
                        { label: 'Leads', field: 'leads', align: 'center' },
                        { label: 'Pipeline', field: 'pipeline', align: 'center' },
                        { label: 'Tendência', field: 'trend', align: 'center' },
                        { label: 'Health Score', field: 'healthScore', align: 'left' },
                      ] as { label: string; field: typeof rankSortField; align: string }[]).map(col => (
                        <th
                          key={col.field}
                          onClick={() => handleRankSort(col.field)}
                          className={`py-2.5 px-3 font-semibold cursor-pointer select-none whitespace-nowrap group transition-colors hover:text-emerald-500 ${
                            col.align === 'left' ? 'text-left' : 'text-center'
                          } ${rankSortField === col.field ? 'text-emerald-500' : t.textMuted}`}
                        >
                          <span className={`inline-flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : ''}`}>
                            {col.label}
                            {rankSortField === col.field
                              ? (rankSortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
                              : <ChevronDown size={11} className="opacity-25 group-hover:opacity-60" />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${t.border}`}>
                    {rankSortedTenants.map((tenant) => (
                      <tr key={tenant.tenantId} className={`${t.tableRow} transition-colors`}>
                        <td className={`py-3 pr-4 font-semibold ${t.text}`}>{tenant.companyName}</td>
                        <td className="py-3 px-3 text-center"><PlanBadge plan={tenant.plan} /></td>
                        <td className="py-3 px-3 text-center"><NpsGauge score={tenant.nps?.score} size="sm" /></td>
                        <td className={`py-3 px-3 text-center ${t.textSub}`}>{tenant.nps?.totalResponses || 0}</td>
                        <td className={`py-3 px-3 text-center ${t.textSub}`}>{tenant.leads?.total || 0}</td>
                        <td className="py-3 px-3 text-center text-purple-500 font-medium">
                          {tenant.leads?.pipelineValue > 0 ? `R$ ${(tenant.leads.pipelineValue / 1000).toFixed(1)}k` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center"><div className="flex justify-center"><TrendIcon trend={tenant.nps?.trend} /></div></td>
                        <td className="py-3 pl-3 w-40"><HealthBar score={tenant.healthScore || 0} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Distribuição NPS */}
            <div className={cardCls}>
              <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
                <MessageSquare size={16} className="text-blue-500" /> Distribuição NPS Global
              </h3>
              {(() => {
                const total = tenants.reduce((s, ten) => s + (ten.nps?.totalResponses || 0), 0);
                const promo = tenants.reduce((s, ten) => s + (ten.nps?.promotores || 0), 0);
                const detr = tenants.reduce((s, ten) => s + (ten.nps?.detratores || 0), 0);
                const pass = tenants.reduce((s, ten) => s + (ten.nps?.passivos || 0), 0);
                const pPromo = total > 0 ? Math.round((promo / total) * 100) : 0;
                const pDetr = total > 0 ? Math.round((detr / total) * 100) : 0;
                const pPass = total > 0 ? Math.round((pass / total) * 100) : 0;
                return (
                  <div className="space-y-4">
                    <div className="flex h-8 rounded-lg overflow-hidden gap-0.5">
                      <div className="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${pPromo}%` }}>{pPromo > 8 ? `${pPromo}%` : ''}</div>
                      <div className="bg-yellow-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${pPass}%` }}>{pPass > 8 ? `${pPass}%` : ''}</div>
                      <div className="bg-red-500 flex items-center justify-center text-white text-xs font-bold" style={{ width: `${pDetr}%` }}>{pDetr > 8 ? `${pDetr}%` : ''}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { label: 'Promotores', count: promo, pct: pPromo, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                        { label: 'Passivos', count: pass, pct: pPass, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                        { label: 'Detratores', count: detr, pct: pDetr, color: 'text-red-400', bg: 'bg-red-500/10' },
                      ].map(item => (
                        <div key={item.label} className={`${item.bg} rounded-lg p-3`}>
                          <div className={`text-xl font-bold ${item.color}`}>{item.count}</div>
                          <div className={`text-xs ${t.textMuted}`}>{item.label}</div>
                          <div className={`text-xs font-semibold ${item.color}`}>{item.pct}%</div>
                        </div>
                      ))}
                    </div>
                    <div className={`text-center text-xs ${t.textMuted}`}>{total} respostas totais na base</div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── USO REAL DA PLATAFORMA ── */}
        {activeSection === 'usage' && (() => {
          // Classificar clientes por nível de uso
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          const usageClients = tenants.map((ten: any) => {
            const lastActivity = ten.lastActivity ? new Date(ten.lastActivity) : null;
            const daysSinceActivity = lastActivity ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 999;
            const npsResponses = ten.nps?.totalResponses || 0;
            const leadsTotal = ten.leads?.total || 0;
            const leadsVendidos = ten.leads?.vendido || 0;
            const campaigns = ten.campaignCount || 0;
            const diagnostics = ten.diagnosticCount || 0;

            // Score de engajamento (0-100)
            let engagementScore = 0;
            if (daysSinceActivity <= 7) engagementScore += 30;
            else if (daysSinceActivity <= 30) engagementScore += 15;
            if (npsResponses >= 50) engagementScore += 25;
            else if (npsResponses >= 10) engagementScore += 15;
            else if (npsResponses > 0) engagementScore += 5;
            if (leadsTotal >= 10) engagementScore += 20;
            else if (leadsTotal > 0) engagementScore += 10;
            if (campaigns > 0) engagementScore += 15;
            if (diagnostics > 0) engagementScore += 10;

            let usageLevel: 'ativo' | 'moderado' | 'baixo' | 'inativo' = 'inativo';
            if (engagementScore >= 60) usageLevel = 'ativo';
            else if (engagementScore >= 30) usageLevel = 'moderado';
            else if (engagementScore > 0) usageLevel = 'baixo';

            return {
              ...ten,
              daysSinceActivity,
              engagementScore,
              usageLevel,
              npsResponses,
              leadsTotal,
              leadsVendidos,
              campaigns,
              diagnostics,
            };
          }).sort((a: any, b: any) => b.engagementScore - a.engagementScore);

          const ativos = usageClients.filter((c: any) => c.usageLevel === 'ativo').length;
          const moderados = usageClients.filter((c: any) => c.usageLevel === 'moderado').length;
          const baixos = usageClients.filter((c: any) => c.usageLevel === 'baixo').length;
          const inativos = usageClients.filter((c: any) => c.usageLevel === 'inativo').length;

          const usageLevelColors: Record<string, { bg: string; text: string; label: string }> = {
            ativo: { bg: 'bg-emerald-500/15', text: 'text-emerald-500', label: 'Ativo' },
            moderado: { bg: 'bg-yellow-500/15', text: 'text-yellow-500', label: 'Moderado' },
            baixo: { bg: 'bg-orange-500/15', text: 'text-orange-500', label: 'Baixo' },
            inativo: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Inativo' },
          };

          return (
            <div className="space-y-5">
              <h2 className={`text-base font-semibold ${t.text}`}>Uso Real da Plataforma</h2>

              {/* KPIs de uso */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Ativos', value: ativos, color: 'text-emerald-500', icon: <CheckCircle size={16} className="text-emerald-500" />, sub: 'Engajamento alto' },
                  { label: 'Moderados', value: moderados, color: 'text-yellow-500', icon: <Activity size={16} className="text-yellow-500" />, sub: 'Uso parcial' },
                  { label: 'Uso Baixo', value: baixos, color: 'text-orange-500', icon: <AlertTriangle size={16} className="text-orange-500" />, sub: 'Precisam atenção' },
                  { label: 'Inativos', value: inativos, color: 'text-red-400', icon: <AlertTriangle size={16} className="text-red-400" />, sub: 'Sem atividade' },
                ].map((kpi, i) => (
                  <div key={i} className={`${t.kpi} border rounded-xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs ${t.textMuted} font-medium`}>{kpi.label}</span>
                      {kpi.icon}
                    </div>
                    <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                    <div className={`text-xs ${t.textMuted}`}>{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* Barra de distribuição */}
              <div className={cardCls}>
                <h3 className={`text-sm font-semibold ${t.text} mb-3`}>Distribuição de Engajamento</h3>
                <div className="flex h-8 rounded-lg overflow-hidden gap-0.5">
                  {[{ count: ativos, color: 'bg-emerald-500', label: 'Ativos' }, { count: moderados, color: 'bg-yellow-500', label: 'Moderados' }, { count: baixos, color: 'bg-orange-500', label: 'Baixo' }, { count: inativos, color: 'bg-red-500', label: 'Inativos' }].map((seg, i) => {
                    const pct = usageClients.length > 0 ? Math.round((seg.count / usageClients.length) * 100) : 0;
                    return pct > 0 ? (
                      <div key={i} className={`${seg.color} flex items-center justify-center text-white text-xs font-bold`} style={{ width: `${pct}%` }}>
                        {pct > 10 ? `${pct}%` : ''}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Tabela de uso real */}
              <div className={cardCls}>
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h3 className={`text-sm font-semibold ${t.text}`}>Detalhamento por Cliente</h3>
                  <div className="relative">
                    <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                    <input type="text" placeholder="Buscar empresa..." value={usageSearch} onChange={e => setUsageSearch(e.target.value)} className={`text-sm pl-8 pr-3 py-1.5 rounded-lg border ${t.input} w-44`} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`text-xs ${t.textMuted} border-b ${t.border}`}>
                        {([
                          { label: 'Empresa', field: 'companyName', align: 'left' },
                          { label: 'Status', field: null, align: 'center' },
                          { label: 'Último Acesso', field: 'daysSinceActivity', align: 'center' },
                          { label: 'NPS Resp.', field: 'npsResponses', align: 'center' },
                          { label: 'Leads', field: 'leadsTotal', align: 'center' },
                          { label: 'Vendidos', field: null, align: 'center' },
                          { label: 'Campanhas', field: null, align: 'center' },
                          { label: 'MPD', field: null, align: 'center' },
                          { label: 'Engajamento', field: 'engagementScore', align: 'left' },
                        ] as { label: string; field: string | null; align: string }[]).map((col, ci) => (
                          <th key={ci} onClick={() => col.field ? (usageSortField === col.field ? setUsageSortDir(d => d === 'asc' ? 'desc' : 'asc') : (setUsageSortField(col.field as any), setUsageSortDir('desc'))) : undefined}
                            className={`py-2.5 px-2 font-semibold whitespace-nowrap ${col.align === 'left' ? 'text-left' : 'text-center'} ${col.field ? 'cursor-pointer select-none group hover:text-emerald-500 transition-colors' : ''} ${col.field && usageSortField === col.field ? 'text-emerald-500' : t.textMuted}`}>
                            <span className={`inline-flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : ''}`}>
                              {col.label}
                              {col.field && (usageSortField === col.field
                                ? (usageSortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
                                : <ChevronDown size={11} className="opacity-25 group-hover:opacity-60" />)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${t.border}`}>
                      {usageClients.filter((c: any) => !usageSearch || c.companyName?.toLowerCase().includes(usageSearch.toLowerCase())).sort((a: any, b: any) => {
                        let va = a[usageSortField] ?? 0, vb = b[usageSortField] ?? 0;
                        if (typeof va === 'string') return usageSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
                        return usageSortDir === 'asc' ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
                      }).map((client: any) => {
                        const lvl = usageLevelColors[client.usageLevel];
                        const engColor = client.engagementScore >= 60 ? 'bg-emerald-500' : client.engagementScore >= 30 ? 'bg-yellow-500' : client.engagementScore > 0 ? 'bg-orange-500' : 'bg-red-500';
                        return (
                          <tr key={client.tenantId} className={`${t.tableRow} transition-colors`}>
                            <td className={`py-3 pr-3 font-semibold ${t.text}`}>
                              <div>{client.companyName}</div>
                              <div className="flex items-center gap-1 mt-0.5"><PlanBadge plan={client.plan} />{client.sector && client.sector !== 'Não informado' && <span className={`text-xs ${t.textMuted}`}>{client.sector}</span>}</div>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lvl.bg} ${lvl.text}`}>{lvl.label}</span>
                            </td>
                            <td className={`py-3 px-2 text-center text-xs ${client.daysSinceActivity <= 7 ? 'text-emerald-500 font-medium' : client.daysSinceActivity <= 30 ? t.textSub : 'text-red-400 font-medium'}`}>
                              {client.daysSinceActivity < 999 ? `${client.daysSinceActivity}d atrás` : 'Nunca'}
                            </td>
                            <td className={`py-3 px-2 text-center ${client.npsResponses > 0 ? t.textSub : 'text-red-400'}`}>{client.npsResponses}</td>
                            <td className={`py-3 px-2 text-center ${client.leadsTotal > 0 ? t.textSub : 'text-red-400'}`}>{client.leadsTotal}</td>
                            <td className={`py-3 px-2 text-center ${client.leadsVendidos > 0 ? 'text-emerald-500 font-medium' : t.textMuted}`}>{client.leadsVendidos}</td>
                            <td className={`py-3 px-2 text-center ${client.campaigns > 0 ? t.textSub : t.textMuted}`}>{client.campaigns}</td>
                            <td className={`py-3 px-2 text-center ${client.diagnostics > 0 ? t.textSub : t.textMuted}`}>{client.diagnostics}</td>
                            <td className="py-3 pl-2 w-32">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200/30 rounded-full h-1.5">
                                  <div className={`${engColor} h-1.5 rounded-full`} style={{ width: `${Math.min(100, client.engagementScore)}%` }} />
                                </div>
                                <span className={`text-xs font-bold w-6 text-right ${client.engagementScore >= 60 ? 'text-emerald-500' : client.engagementScore >= 30 ? 'text-yellow-500' : 'text-red-400'}`}>{client.engagementScore}</span>
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
          );
        })()}

        {/* ── ANÁLISE POR SETOR ── */}
        {activeSection === 'sectors' && (() => {
          // Agrupar tenants por setor
          const sectorData: Record<string, { tenants: any[]; npsScores: number[]; leads: number; pipeline: number; responses: number; vendidos: number }> = {};
          for (const ten of tenants) {
            const sec = ten.sector || 'Não informado';
            if (!sectorData[sec]) sectorData[sec] = { tenants: [], npsScores: [], leads: 0, pipeline: 0, responses: 0, vendidos: 0 };
            sectorData[sec].tenants.push(ten);
            if (ten.nps?.score !== null && ten.nps?.score !== undefined) sectorData[sec].npsScores.push(ten.nps.score);
            sectorData[sec].leads += ten.leads?.total || 0;
            sectorData[sec].pipeline += ten.leads?.pipelineValue || 0;
            sectorData[sec].responses += ten.nps?.totalResponses || 0;
            sectorData[sec].vendidos += ten.leads?.vendido || 0;
          }

          const sectors = Object.entries(sectorData)
            .map(([sector, data]) => ({
              sector,
              tenantCount: data.tenants.length,
              avgNps: data.npsScores.length > 0 ? Math.round(data.npsScores.reduce((a, b) => a + b, 0) / data.npsScores.length) : null,
              totalLeads: data.leads,
              totalPipeline: data.pipeline,
              totalResponses: data.responses,
              totalVendidos: data.vendidos,
              conversionRate: data.leads > 0 ? Math.round((data.vendidos / data.leads) * 100) : 0,
              avgResponsesPerTenant: data.tenants.length > 0 ? Math.round(data.responses / data.tenants.length) : 0,
              tenants: data.tenants,
            }))
            .sort((a, b) => b.tenantCount - a.tenantCount);

          return (
            <div className="space-y-5">
              <h2 className={`text-base font-semibold ${t.text}`}>Análise por Setor / Nicho de Mercado</h2>

              {/* KPIs por setor */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {sectors.filter(s => s.sector !== 'Não informado').slice(0, 8).map((sec, i) => (
                  <div key={i} className={`${t.kpi} border rounded-xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs ${t.textMuted} font-medium truncate`}>{sec.sector}</span>
                      <span className={`text-xs font-bold ${t.textSub}`}>{sec.tenantCount} clientes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <NpsGauge score={sec.avgNps} size="sm" />
                        <div className={`text-xs ${t.textMuted}`}>NPS médio</div>
                      </div>
                      <div className="text-right flex-1">
                        <div className={`text-sm font-bold ${t.text}`}>{sec.totalResponses}</div>
                        <div className={`text-xs ${t.textMuted}`}>respostas</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela completa por setor */}
              <div className={cardCls}>
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h3 className={`text-sm font-semibold ${t.text}`}>Comparativo por Setor</h3>
                  <div className="relative">
                    <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                    <input type="text" placeholder="Buscar setor..." value={sectorSearch} onChange={e => setSectorSearch(e.target.value)} className={`text-sm pl-8 pr-3 py-1.5 rounded-lg border ${t.input} w-40`} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`text-xs ${t.textMuted} border-b ${t.border}`}>
                        {([
                          { label: 'Setor', field: 'sector', align: 'left' },
                          { label: 'Clientes', field: 'tenantCount', align: 'center' },
                          { label: 'NPS Médio', field: 'avgNps', align: 'center' },
                          { label: 'Respostas', field: null, align: 'center' },
                          { label: 'Resp./Cliente', field: null, align: 'center' },
                          { label: 'Leads', field: 'totalLeads', align: 'center' },
                          { label: 'Vendidos', field: null, align: 'center' },
                          { label: 'Conversão', field: 'conversionRate', align: 'center' },
                          { label: 'Pipeline', field: 'totalPipeline', align: 'right' },
                        ] as { label: string; field: string | null; align: string }[]).map((col, ci) => (
                          <th key={ci} onClick={() => col.field ? (sectorSortField === col.field ? setSectorSortDir(d => d === 'asc' ? 'desc' : 'asc') : (setSectorSortField(col.field as any), setSectorSortDir('desc'))) : undefined}
                            className={`py-2.5 px-2 font-semibold whitespace-nowrap ${col.align === 'left' ? 'text-left' : col.align === 'right' ? 'text-right' : 'text-center'} ${col.field ? 'cursor-pointer select-none group hover:text-emerald-500 transition-colors' : ''} ${col.field && sectorSortField === col.field ? 'text-emerald-500' : t.textMuted}`}>
                            <span className={`inline-flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                              {col.label}
                              {col.field && (sectorSortField === col.field
                                ? (sectorSortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
                                : <ChevronDown size={11} className="opacity-25 group-hover:opacity-60" />)}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${t.border}`}>
                      {sectors.filter(s => !sectorSearch || s.sector.toLowerCase().includes(sectorSearch.toLowerCase())).sort((a, b) => {
                        let va: any = (a as any)[sectorSortField] ?? 0, vb: any = (b as any)[sectorSortField] ?? 0;
                        if (typeof va === 'string') return sectorSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
                        return sectorSortDir === 'asc' ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
                      }).map((sec, i) => (
                        <tr key={i} className={`${t.tableRow} transition-colors`}>
                          <td className={`py-3 pr-3 font-semibold ${t.text}`}>{sec.sector}</td>
                          <td className={`py-3 px-2 text-center ${t.textSub}`}>{sec.tenantCount}</td>
                          <td className="py-3 px-2 text-center"><NpsGauge score={sec.avgNps} size="sm" /></td>
                          <td className={`py-3 px-2 text-center ${t.textSub}`}>{sec.totalResponses}</td>
                          <td className={`py-3 px-2 text-center ${t.textSub}`}>{sec.avgResponsesPerTenant}</td>
                          <td className={`py-3 px-2 text-center ${t.textSub}`}>{sec.totalLeads}</td>
                          <td className={`py-3 px-2 text-center text-emerald-500 font-medium`}>{sec.totalVendidos}</td>
                          <td className={`py-3 px-2 text-center ${sec.conversionRate >= 30 ? 'text-emerald-500' : sec.conversionRate >= 15 ? 'text-yellow-500' : 'text-red-400'} font-medium`}>{sec.conversionRate}%</td>
                          <td className="py-3 pl-2 text-right text-purple-500 font-medium">
                            {sec.totalPipeline > 0 ? `R$ ${(sec.totalPipeline / 1000).toFixed(1)}k` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detalhamento: empresas por setor */}
              <div className={cardCls}>
                <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Empresas por Setor</h3>
                <div className="space-y-3">
                  {sectors.filter(s => s.sector !== 'Não informado').map((sec, i) => (
                    <details key={i} className={`${t.cardInner} border rounded-lg overflow-hidden`}>
                      <summary className={`flex items-center justify-between p-3 cursor-pointer ${t.tableRow} transition-colors`}>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold ${t.text}`}>{sec.sector}</span>
                          <span className={`text-xs ${t.textMuted}`}>{sec.tenantCount} clientes</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <NpsGauge score={sec.avgNps} size="sm" />
                          <ChevronDown size={14} className={t.textMuted} />
                        </div>
                      </summary>
                      <div className={`border-t ${t.border} p-3`}>
                        <div className="space-y-1">
                          {sec.tenants.sort((a: any, b: any) => (b.nps?.totalResponses || 0) - (a.nps?.totalResponses || 0)).map((ten: any, j: number) => (
                            <div key={j} className={`flex items-center justify-between py-1.5 px-2 rounded ${t.tableRow}`}>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${t.text}`}>{ten.companyName}</span>
                                <PlanBadge plan={ten.plan} />
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className={t.textSub}>{ten.nps?.totalResponses || 0} resp.</span>
                                <NpsGauge score={ten.nps?.score} size="sm" />
                                <span className={t.textSub}>{ten.leads?.total || 0} leads</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── TENDÊNCIAS NPS ── */}
        {activeSection === 'trends' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={`text-base font-semibold ${t.text}`}>Evolução do NPS — Base Completa</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filtros de período */}
                <div className={`flex items-center gap-1 p-1 rounded-lg border ${t.border} ${t.surface}`}>
                  {[{ id: '3m', label: '3 meses' }, { id: '6m', label: '6 meses' }, { id: '12m', label: '12 meses' }, { id: 'year', label: 'Este ano' }, { id: 'all', label: 'Tudo' }].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setTrendsDatePreset(opt.id); setTrendsData(null); loadTrends(opt.id); }}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        trendsDatePreset === opt.id ? 'bg-emerald-600 text-white' : `${t.textSub} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => loadTrends()} disabled={isLoadingTrends} className={`flex items-center gap-1.5 text-xs ${t.textSub} hover:${t.text} transition-colors`}>
                  {isLoadingTrends ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
                </button>
              </div>
            </div>

            {isLoadingTrends ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>
            ) : trendsData ? (
              <div className="space-y-5">
                {/* Gráfico de barras corrigido */}
                <div className={cardCls}>
                  <h3 className={`text-sm font-semibold ${t.text} mb-6`}>NPS Mensal da Base</h3>
                  <div className="space-y-3">
                    {trendsData.trend?.slice(-8).map((m: any, i: number) => {
                      const nps = m.nps ?? 0;
                      const color = nps >= 70 ? 'bg-emerald-500' : nps >= 30 ? 'bg-yellow-500' : 'bg-red-500';
                      const textColor = nps >= 70 ? 'text-emerald-500' : nps >= 30 ? 'text-yellow-500' : 'text-red-400';
                      // Normalizar: NPS vai de -100 a 100, exibir como % da barra
                      const barWidth = Math.max(2, ((nps + 100) / 200) * 100);
                      const monthLabel = m.month ? `${m.month.substring(5)}/${m.month.substring(2, 4)}` : '';
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className={`text-xs ${t.textMuted} w-12 text-right shrink-0`}>{monthLabel}</span>
                          <div className="flex-1 bg-gray-200/20 rounded-full h-6 relative overflow-hidden">
                            <div className={`${color} h-6 rounded-full flex items-center justify-end pr-2 transition-all`} style={{ width: `${barWidth}%` }}>
                              {barWidth > 15 && <span className="text-white text-xs font-bold">{nps}</span>}
                            </div>
                            {barWidth <= 15 && <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold ${textColor}`}>{nps}</span>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs">
                            <span className={`${t.textMuted} w-16`}>{m.count} resp.</span>
                            <span className="text-emerald-500 w-8">{m.promotores}P</span>
                            <span className="text-red-400 w-8">{m.detratores}D</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={`flex items-center gap-4 mt-4 text-xs ${t.textMuted}`}>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> NPS ≥ 70</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> NPS 30–69</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> NPS &lt; 30</span>
                    <span className="ml-2">P = Promotores | D = Detratores</span>
                  </div>
                </div>

                {/* Tabela mensal */}
                <div className={cardCls}>
                  <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                    <h3 className={`text-sm font-semibold ${t.text}`}>Detalhamento Mensal</h3>
                    <div className="relative">
                      <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                      <input type="text" placeholder="Filtrar mês (ex: 2025-01)" value={trendSearch} onChange={e => setTrendSearch(e.target.value)} className={`text-sm pl-8 pr-3 py-1.5 rounded-lg border ${t.input} w-48`} />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`text-xs ${t.textMuted} border-b ${t.border}`}>
                          <th className="text-left py-2 pr-4">Mês</th>
                          <th className="text-center py-2 px-3">NPS</th>
                          <th className="text-center py-2 px-3">Média</th>
                          <th className="text-center py-2 px-3">Respostas</th>
                          <th className="text-center py-2 px-3">Promotores</th>
                          <th className="text-center py-2 px-3">Passivos</th>
                          <th className="text-center py-2 px-3">Detratores</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${t.border}`}>
                        {(trendsData.trend?.slice(-8).reverse() || []).filter((m: any) => !trendSearch || m.month?.includes(trendSearch)).map((m: any, i: number) => (
                          <tr key={i} className={`${t.tableRow} transition-colors`}>
                            <td className={`py-2.5 pr-4 font-medium ${t.text}`}>{m.month}</td>
                            <td className="py-2.5 px-3 text-center"><NpsGauge score={m.nps} size="sm" /></td>
                            <td className={`py-2.5 px-3 text-center ${t.textSub}`}>{m.avg}</td>
                            <td className={`py-2.5 px-3 text-center ${t.textSub}`}>{m.count}</td>
                            <td className="py-2.5 px-3 text-center text-emerald-500 font-medium">{m.promotores}</td>
                            <td className="py-2.5 px-3 text-center text-yellow-500 font-medium">{m.passivos}</td>
                            <td className="py-2.5 px-3 text-center text-red-400 font-medium">{m.detratores}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-center py-20 ${t.textMuted}`}>Sem dados disponíveis.</div>
            )}
          </div>
        )}

        {/* ── PESQUISAS & FORMULÁRIOS ── */}
        {activeSection === 'surveys' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className={`text-base font-semibold ${t.text}`}>Pesquisas & Formulários NPS dos Clientes</h2>
              <button onClick={loadSurveys} disabled={isLoadingSurveys} className={`flex items-center gap-1.5 text-xs ${t.textSub} hover:${t.text} transition-colors`}>
                {isLoadingSurveys ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
              </button>
            </div>

            {isLoadingSurveys ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>
            ) : surveysData ? (
              <div className="space-y-5">
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total de Pesquisas', value: surveysData.stats?.totalCampaigns || 0, color: 'text-emerald-500', icon: <FileText size={16} className="text-emerald-500" /> },
                    { label: 'Pesquisas Ativas', value: surveysData.stats?.activeCampaigns || 0, color: 'text-blue-500', icon: <Activity size={16} className="text-blue-500" /> },
                    { label: 'Total de Respostas', value: surveysData.stats?.totalResponses || 0, color: 'text-purple-500', icon: <MessageSquare size={16} className="text-purple-500" /> },
                    { label: 'Média de Perguntas', value: surveysData.stats?.avgQuestionsPerCampaign || 0, color: 'text-orange-500', icon: <Tag size={16} className="text-orange-500" /> },
                  ].map((kpi, i) => (
                    <div key={i} className={`${t.kpi} border rounded-xl p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs ${t.textMuted} font-medium`}>{kpi.label}</span>
                        {kpi.icon}
                      </div>
                      <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                    </div>
                  ))}
                </div>

                {/* Tipos de perguntas mais usados */}
                {surveysData.stats?.globalQuestionTypes?.length > 0 && (
                  <div className={cardCls}>
                    <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Tipos de Perguntas Mais Usados</h3>
                    <div className="flex flex-wrap gap-2">
                      {surveysData.stats.globalQuestionTypes.map((qt: any, i: number) => (
                        <div key={i} className={`${t.cardInner} border rounded-lg px-3 py-2 flex items-center gap-2`}>
                          <QuestionTypeBadge type={qt.type} />
                          <span className={`text-sm font-bold ${t.text}`}>{qt.count}</span>
                          <span className={`text-xs ${t.textMuted}`}>perguntas</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filtros */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                    <input
                      type="text"
                      placeholder="Buscar pesquisa..."
                      value={surveySearch}
                      onChange={e => setSurveySearch(e.target.value)}
                      className={`text-sm pl-8 pr-3 py-2 rounded-lg border ${t.input} w-52`}
                    />
                  </div>
                  <select
                    value={surveyTenantFilter}
                    onChange={e => setSurveyTenantFilter(e.target.value)}
                    className={`text-sm px-3 py-2 rounded-lg border ${t.input} w-52`}
                  >
                    <option value="">Todos os clientes</option>
                    {surveysData.stats?.topTenants?.map((ten: any) => (
                      <option key={ten.tenantId} value={ten.tenantId}>{ten.name} ({ten.count})</option>
                    ))}
                  </select>
                  <span className={`text-xs ${t.textMuted}`}>{filteredSurveys.length} pesquisas</span>
                </div>

                {/* Lista de pesquisas */}
                <div className="space-y-2">
                  {filteredSurveys.map((campaign: any) => {
                    const isExpanded = expandedSurvey === campaign.id;
                    return (
                      <div key={campaign.id} className={`${t.card} border rounded-xl overflow-hidden`}>
                        <div
                          className={`flex items-center gap-4 p-4 cursor-pointer ${t.tableRow} transition-colors`}
                          onClick={() => setExpandedSurvey(isExpanded ? null : campaign.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold ${t.text}`}>{campaign.name}</div>
                            <div className={`text-xs ${t.textMuted} mt-0.5 flex items-center gap-3 flex-wrap`}>
                              <span className="font-medium text-blue-500">{campaign.companyName}</span>
                              <span>{campaign.questionCount} perguntas</span>
                              <span>{campaign.responseCount} respostas</span>
                              {campaign.objective && <span className="italic">"{campaign.objective.substring(0, 50)}"</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${campaign.status === 'Ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {campaign.status}
                            </span>
                            <div className="flex gap-1 flex-wrap max-w-40">
                              {Object.entries(campaign.questionTypes || {}).map(([type, count]) => (
                                <QuestionTypeBadge key={type} type={type} />
                              ))}
                            </div>
                            {isExpanded ? <ChevronUp size={16} className={t.textMuted} /> : <ChevronDown size={16} className={t.textMuted} />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className={`border-t ${t.border} p-5 space-y-4`}>
                            {campaign.description && (
                              <p className={`text-sm ${t.textSub} italic`}>"{campaign.description}"</p>
                            )}
                            <div>
                              <div className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-3`}>Perguntas do Formulário</div>
                              <div className="space-y-2">
                                {campaign.questions.map((q: any, qi: number) => (
                                  <div key={qi} className={`${t.cardInner} border rounded-lg p-3`}>
                                    <div className="flex items-start gap-3">
                                      <span className={`text-xs font-bold ${t.textMuted} w-5 shrink-0 mt-0.5`}>{qi + 1}.</span>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <QuestionTypeBadge type={q.type} />
                                          {q.required && <span className="text-xs text-red-400">obrigatória</span>}
                                        </div>
                                        <p className={`text-sm ${t.text}`}>{q.text}</p>
                                        {q.options?.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {q.options.slice(0, 6).map((opt: any, oi: number) => (
                                              <span key={oi} className={`text-xs ${t.badge} px-2 py-0.5 rounded`}>
                                                {typeof opt === 'string' ? opt : opt.text || opt.label || JSON.stringify(opt)}
                                              </span>
                                            ))}
                                            {q.options.length > 6 && <span className={`text-xs ${t.textMuted}`}>+{q.options.length - 6} mais</span>}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className={`text-xs ${t.textMuted} flex items-center gap-4`}>
                              <span>Criado em {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}</span>
                              {campaign.tone && <span>Tom: {campaign.tone}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredSurveys.length === 0 && (
                    <div className={`text-center py-16 ${t.textMuted}`}>Nenhuma pesquisa encontrada.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`text-center py-20 ${t.textMuted}`}>Carregando pesquisas...</div>
            )}
          </div>
        )}

        {/* ── PRODUTOS & PREÇOS ── */}
        {activeSection === 'products' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className={`text-base font-semibold ${t.text}`}>Produtos & Serviços dos Clientes</h2>
              <div className="flex items-center gap-2">
                <button onClick={loadProducts} disabled={isLoadingProducts} className={`flex items-center gap-1.5 text-xs ${t.textSub} hover:${t.text} transition-colors`}>
                  {isLoadingProducts ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
                </button>
                <button
                  onClick={() => { if (!productsData) loadProducts(); else generateProductsAI(); }}
                  disabled={isLoadingProductsAI || isLoadingProducts}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  {isLoadingProductsAI ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                  {isLoadingProductsAI ? 'Analisando...' : 'Análise de Preços com IA'}
                </button>
              </div>
            </div>

            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>
            ) : productsData ? (
              <div className="space-y-5">
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total de Produtos', value: productsData.stats?.totalProducts || 0, color: 'text-emerald-500', sub: 'cadastrados' },
                    { label: 'Clientes com Produtos', value: productsData.stats?.tenantsWithProducts || 0, color: 'text-blue-500', sub: 'empresas' },
                    { label: 'Preço Médio Global', value: `R$ ${(productsData.stats?.globalAvgValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, color: 'text-purple-500', sub: 'média geral' },
                    { label: 'Preço Mediano', value: `R$ ${(productsData.stats?.globalMedianValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, color: 'text-orange-500', sub: 'mediana' },
                  ].map((kpi, i) => (
                    <div key={i} className={`${t.kpi} border rounded-xl p-4`}>
                      <div className={`text-xs ${t.textMuted} font-medium mb-2`}>{kpi.label}</div>
                      <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                      <div className={`text-xs ${t.textMuted} mt-0.5`}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Faixas de preço */}
                <div className={cardCls}>
                  <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Distribuição por Faixa de Preço</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Até R$ 100', count: productsData.stats?.priceRanges?.ate100 || 0, color: 'text-slate-500', bg: 'bg-slate-500/10' },
                      { label: 'R$ 100 – 500', count: productsData.stats?.priceRanges?.de100a500 || 0, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                      { label: 'R$ 500 – 2.000', count: productsData.stats?.priceRanges?.de500a2000 || 0, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                      { label: 'Acima de R$ 2.000', count: productsData.stats?.priceRanges?.acima2000 || 0, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                    ].map((range, i) => (
                      <div key={i} className={`${range.bg} rounded-lg p-3 text-center`}>
                        <div className={`text-2xl font-bold ${range.color}`}>{range.count}</div>
                        <div className={`text-xs ${t.textMuted} mt-1`}>{range.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Análise de IA */}
                {productsAI && (
                  <div className={`${cardCls} border-purple-500/30 bg-purple-500/5`}>
                    <div className="flex items-center gap-2 mb-5">
                      <Brain size={18} className="text-purple-400" />
                      <h3 className={`text-sm font-semibold ${t.text}`}>Análise de Preços por Inteligência Artificial</h3>
                    </div>

                    {productsAI.error ? (
                      <p className={`text-sm ${t.textSub}`}>{productsAI.raw || 'Erro ao gerar análise.'}</p>
                    ) : (
                      <div className="space-y-6">
                        {productsAI.resumo_executivo && (
                          <div className={`${t.cardInner} border rounded-lg p-4`}>
                            <p className={`text-sm ${t.text} leading-relaxed`}>{productsAI.resumo_executivo}</p>
                          </div>
                        )}

                        {/* Segmentos identificados */}
                        {productsAI.segmentos_identificados?.length > 0 && (
                          <div>
                            <h4 className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-3 flex items-center gap-1.5`}>
                              <ShoppingBag size={12} className="text-blue-400" /> Segmentos Identificados
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {productsAI.segmentos_identificados.map((seg: any, i: number) => (
                                <div key={i} className={`${t.cardInner} border rounded-lg p-4`}>
                                  <div className={`text-sm font-bold ${t.text} mb-2`}>{seg.segmento}</div>
                                  <div className="grid grid-cols-3 gap-1 text-center mb-3">
                                    <div>
                                      <div className="text-xs text-purple-400 font-bold">R$ {(seg.preco_medio || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                                      <div className={`text-xs ${t.textMuted}`}>média</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-emerald-400 font-bold">R$ {(seg.preco_minimo || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                                      <div className={`text-xs ${t.textMuted}`}>mín</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-orange-400 font-bold">R$ {(seg.preco_maximo || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                                      <div className={`text-xs ${t.textMuted}`}>máx</div>
                                    </div>
                                  </div>
                                  <p className={`text-xs ${t.textMuted} leading-relaxed`}>{seg.insight}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Produtos similares */}
                        {productsAI.produtos_similares?.length > 0 && (
                          <div>
                            <h4 className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-3 flex items-center gap-1.5`}>
                              <Tag size={12} className="text-teal-400" /> Produtos Similares — Comparação de Preços
                            </h4>
                            <div className="space-y-3">
                              {productsAI.produtos_similares.map((grupo: any, i: number) => (
                                <div key={i} className={`${t.cardInner} border rounded-lg p-4`}>
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                      <span className={`text-sm font-bold ${t.text}`}>{grupo.grupo}</span>
                                      <span className={`ml-2 text-xs ${t.textMuted}`}>Média: R$ {(grupo.preco_medio_grupo || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    {grupo.variacao_percentual > 0 && (
                                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full shrink-0">
                                        ±{grupo.variacao_percentual}% variação
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 mb-3">
                                    {grupo.produtos?.map((p: any, pi: number) => (
                                      <div key={pi} className={`${t.badge} rounded-lg px-2 py-1 text-xs`}>
                                        <span className="font-medium">{p.nome}</span>
                                        <span className={`ml-1 ${t.textMuted}`}>({p.empresa})</span>
                                        <span className="ml-1 text-purple-400 font-bold">R$ {(p.valor || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <p className={`text-xs ${t.textMuted} leading-relaxed`}>{grupo.insight}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Oportunidades */}
                        {productsAI.oportunidades_precificacao?.length > 0 && (
                          <div>
                            <h4 className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-3 flex items-center gap-1.5`}>
                              <Lightbulb size={12} className="text-yellow-400" /> Oportunidades de Precificação
                            </h4>
                            <div className="space-y-2">
                              {productsAI.oportunidades_precificacao.map((op: any, i: number) => (
                                <div key={i} className={`${t.cardInner} border rounded-lg p-3 flex items-start gap-3`}>
                                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${op.impacto === 'alto' ? 'bg-emerald-500/20 text-emerald-400' : op.impacto === 'médio' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                    {op.impacto}
                                  </span>
                                  <p className={`text-sm ${t.textSub}`}>{op.observacao}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {productsAI.benchmark_mercado && (
                          <div className={`${t.cardInner} border rounded-lg p-4`}>
                            <div className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-2`}>Benchmark de Mercado</div>
                            <p className={`text-sm ${t.textSub} leading-relaxed`}>{productsAI.benchmark_mercado}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Filtros e tabela de produtos */}
                <div className={cardCls}>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h3 className={`text-sm font-semibold ${t.text}`}>Todos os Produtos ({productsData.allProducts?.length || 0})</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                        <input
                          type="text"
                          placeholder="Buscar produto..."
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          className={`text-sm pl-8 pr-3 py-2 rounded-lg border ${t.input} w-48`}
                        />
                      </div>
                      <select
                        value={productTenantFilter}
                        onChange={e => setProductTenantFilter(e.target.value)}
                        className={`text-sm px-3 py-2 rounded-lg border ${t.input} w-48`}
                      >
                        <option value="">Todas as empresas</option>
                        {productsData.tenants?.map((ten: any) => (
                          <option key={ten.tenantId} value={ten.companyName}>{ten.companyName} ({ten.stats.count})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`text-xs ${t.textMuted} border-b ${t.border}`}>
                          <th className="text-left py-2 pr-4 cursor-pointer select-none group hover:text-emerald-500 transition-colors" onClick={() => { if (productSortField === 'name') setProductSortDir((d: string) => d === 'asc' ? 'desc' : 'asc'); else { setProductSortField('name'); setProductSortDir('asc'); } }}>
                            <span className="inline-flex items-center gap-1">Produto / Serviço {productSortField === 'name' ? (productSortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronDown size={11} className="opacity-25 group-hover:opacity-60" />}</span>
                          </th>
                          <th className="text-left py-2 px-3 cursor-pointer select-none group hover:text-emerald-500 transition-colors" onClick={() => { if (productSortField === 'tenant') setProductSortDir((d: string) => d === 'asc' ? 'desc' : 'asc'); else { setProductSortField('tenant'); setProductSortDir('asc'); } }}>
                            <span className="inline-flex items-center gap-1">Empresa {productSortField === 'tenant' ? (productSortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronDown size={11} className="opacity-25 group-hover:opacity-60" />}</span>
                          </th>
                          <th className="text-right py-2 px-3 cursor-pointer select-none group hover:text-emerald-500 transition-colors" onClick={() => { if (productSortField === 'value') setProductSortDir((d: string) => d === 'asc' ? 'desc' : 'asc'); else { setProductSortField('value'); setProductSortDir('desc'); } }}>
                            <span className="inline-flex items-center gap-1 justify-end">Valor {productSortField === 'value' ? (productSortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronDown size={11} className="opacity-25 group-hover:opacity-60" />}</span>
                          </th>
                          <th className="text-left py-2 pl-3">Descrição</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${t.border}`}>
                        {[...filteredProducts].sort((a: any, b: any) => {
                          if (productSortField === 'value') return productSortDir === 'asc' ? (a.value || 0) - (b.value || 0) : (b.value || 0) - (a.value || 0);
                          if (productSortField === 'tenant') return productSortDir === 'asc' ? (a.tenant || '').localeCompare(b.tenant || '') : (b.tenant || '').localeCompare(a.tenant || '');
                          return productSortDir === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '');
                        }).slice(0, 50).map((p: any, i: number) => (
                          <tr key={i} className={`${t.tableRow} transition-colors`}>
                            <td className={`py-2.5 pr-4 font-medium ${t.text}`}>{p.name}</td>
                            <td className={`py-2.5 px-3 text-blue-500 text-xs font-medium`}>{p.tenant}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-purple-500">
                              R$ {(p.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </td>
                            <td className={`py-2.5 pl-3 text-xs ${t.textMuted} max-w-xs truncate`}>
                              {p.description ? p.description.substring(0, 80) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredProducts.length > 50 && (
                      <div className={`text-center text-xs ${t.textMuted} mt-3`}>Exibindo 50 de {filteredProducts.length} produtos</div>
                    )}
                  </div>
                </div>

                {/* Por cliente */}
                <div className={cardCls}>
                  <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Resumo por Cliente</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`text-xs ${t.textMuted} border-b ${t.border}`}>
                          <th className="text-left py-2 pr-4">Empresa</th>
                          <th className="text-center py-2 px-3">Produtos</th>
                          <th className="text-right py-2 px-3">Preço Médio</th>
                          <th className="text-right py-2 px-3">Mínimo</th>
                          <th className="text-right py-2 px-3">Máximo</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${t.border}`}>
                        {productsData.tenants?.map((ten: any, i: number) => (
                          <tr key={i} className={`${t.tableRow} transition-colors`}>
                            <td className={`py-2.5 pr-4 font-semibold ${t.text}`}>{ten.companyName}</td>
                            <td className={`py-2.5 px-3 text-center ${t.textSub}`}>{ten.stats.count}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-purple-500">
                              R$ {(ten.stats.avgValue || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-500">
                              R$ {(ten.stats.minValue || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2.5 px-3 text-right text-orange-500">
                              R$ {(ten.stats.maxValue || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-center py-20 ${t.textMuted}`}>Carregando produtos...</div>
            )}
          </div>
        )}

        {/* ── ANÁLISE POR CLIENTE ── */}
        {activeSection === 'clients' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className={`text-base font-semibold ${t.text}`}>Análise Individual por Cliente <span className={`text-xs font-normal ${t.textMuted} ml-1`}>{filteredTenants.length} clientes</span></h2>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Buscar empresa..."
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  className={`text-sm px-3 py-2 rounded-lg border ${t.input} w-44`}
                />
                <select
                  value={clientPlanFilter}
                  onChange={e => setClientPlanFilter(e.target.value)}
                  className={`text-sm px-3 py-2 rounded-lg border ${t.input} cursor-pointer`}
                >
                  <option value="all">Todos os Planos</option>
                  <option value="hello_growth">Growth</option>
                  <option value="hello_rating">Rating</option>
                  <option value="hello_client">Client</option>
                  <option value="trial">Trial</option>
                  <option value="growth_lifetime">Lifetime</option>
                </select>
                <select
                  value={`${clientSortField}_${clientSortDir}`}
                  onChange={e => {
                    const [field, dir] = e.target.value.split('_') as any;
                    setClientSortField(field);
                    setClientSortDir(dir);
                  }}
                  className={`text-sm px-3 py-2 rounded-lg border ${t.input} cursor-pointer`}
                >
                  <option value="healthScore_desc">Health Score ↓</option>
                  <option value="healthScore_asc">Health Score ↑</option>
                  <option value="nps_desc">NPS ↓</option>
                  <option value="nps_asc">NPS ↑</option>
                  <option value="leads_desc">Leads ↓</option>
                  <option value="leads_asc">Leads ↑</option>
                  <option value="pipeline_desc">Pipeline ↓</option>
                  <option value="companyName_asc">Nome A→Z</option>
                  <option value="companyName_desc">Nome Z→A</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredTenants.map((tenant) => {
                const tid = tenant.tenantId;
                const isExpanded = expandedTenant === tid;
                const ai = tenantAI[tid];
                const isLoadingThis = isLoadingTenantAI === tid;

                return (
                  <div key={tid} className={`${t.card} border rounded-xl overflow-hidden`}>
                    <div
                      className={`flex items-center gap-4 p-4 cursor-pointer ${t.tableRow} transition-colors`}
                      onClick={() => setExpandedTenant(isExpanded ? null : tid)}
                    >
                      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                        style={{ background: tenant.healthScore >= 70 ? '#10b981' : tenant.healthScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                        {tenant.healthScore || 0}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold ${t.text}`}>{tenant.companyName}</div>
                        <div className={`text-xs ${t.textMuted} flex items-center gap-3 mt-0.5 flex-wrap`}>
                          <span className="flex items-center gap-1"><MessageSquare size={10} /> {tenant.nps?.totalResponses || 0} respostas NPS</span>
                          <span className="flex items-center gap-1"><Target size={10} /> {tenant.leads?.total || 0} leads</span>
                          {tenant.daysAsClient !== null && <span className="flex items-center gap-1"><Calendar size={10} /> {tenant.daysAsClient}d como cliente</span>}
                          {tenant.campaignCount > 0 && <span className="flex items-center gap-1"><Activity size={10} /> {tenant.campaignCount} campanhas</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-center">
                          <NpsGauge score={tenant.nps?.score} size="sm" />
                          <div className={`text-xs ${t.textMuted}`}>NPS</div>
                        </div>
                        <PlanBadge plan={tenant.plan} />
                        <div className="text-center">
                          <span className="text-sm font-semibold text-purple-400">
                            {tenant.leads?.pipelineValue > 0 ? `R$ ${(tenant.leads.pipelineValue / 1000).toFixed(1)}k` : '—'}
                          </span>
                          <div className={`text-xs ${t.textMuted}`}>pipeline</div>
                        </div>
                        <TrendIcon trend={tenant.nps?.trend} />
                        {isExpanded ? <ChevronUp size={16} className={t.textMuted} /> : <ChevronDown size={16} className={t.textMuted} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={`border-t ${t.border} p-5 space-y-5`}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                          {[
                            { label: 'Promotores', value: tenant.nps?.promotores || 0, color: 'text-emerald-500', sub: `${tenant.nps?.totalResponses > 0 ? Math.round((tenant.nps.promotores / tenant.nps.totalResponses) * 100) : 0}%` },
                            { label: 'Passivos', value: tenant.nps?.passivos || 0, color: 'text-yellow-500', sub: `${tenant.nps?.totalResponses > 0 ? Math.round((tenant.nps.passivos / tenant.nps.totalResponses) * 100) : 0}%` },
                            { label: 'Detratores', value: tenant.nps?.detratores || 0, color: 'text-red-400', sub: `${tenant.nps?.totalResponses > 0 ? Math.round((tenant.nps.detratores / tenant.nps.totalResponses) * 100) : 0}%` },
                            { label: 'Leads Vendidos', value: tenant.leads?.vendido || 0, color: 'text-blue-500', sub: `de ${tenant.leads?.total || 0}` },
                            { label: 'Diagnósticos MPD', value: tenant.diagnosticCount || 0, color: 'text-orange-500', sub: 'realizados' },
                            { label: 'Campanhas NPS', value: tenant.campaignCount || 0, color: 'text-teal-500', sub: 'criadas' },
                          ].map((item, i) => (
                            <div key={i} className={`${t.cardInner} border rounded-lg p-3 text-center`}>
                              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                              <div className={`text-xs ${t.textMuted} mt-0.5`}>{item.label}</div>
                              <div className={`text-xs ${item.color} font-medium`}>{item.sub}</div>
                            </div>
                          ))}
                        </div>

                        {tenant.leads?.total > 0 && (
                          <div>
                            <div className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-2`}>Pipeline de Leads</div>
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { label: 'Novo', value: tenant.leads.novo, color: 'bg-gray-500/20 text-gray-400' },
                                { label: 'Em Contato', value: tenant.leads.emContato, color: 'bg-blue-500/20 text-blue-400' },
                                { label: 'Negociação', value: tenant.leads.negociacao, color: 'bg-yellow-500/20 text-yellow-400' },
                                { label: 'Vendido', value: tenant.leads.vendido, color: 'bg-emerald-500/20 text-emerald-400' },
                                { label: 'Perdido', value: tenant.leads.perdido, color: 'bg-red-500/20 text-red-400' },
                              ].filter(s => s.value > 0).map((s, i) => (
                                <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>{s.label}: {s.value}</span>
                              ))}
                              {tenant.leads.pipelineValue > 0 && (
                                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-500/20 text-purple-400">
                                  Total: R$ {tenant.leads.pipelineValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {tenant.lastDiagnostic && (
                          <div className={`${t.cardInner} border rounded-lg p-4`}>
                            <div className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-2 flex items-center gap-1.5`}>
                              <Activity size={12} className="text-orange-500" /> Último Diagnóstico MPD
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-3xl font-bold ${tenant.lastDiagnostic.score >= 70 ? 'text-emerald-500' : tenant.lastDiagnostic.score >= 40 ? 'text-yellow-500' : 'text-red-400'}`}>
                                {tenant.lastDiagnostic.score}<span className="text-sm font-normal text-gray-500">/100</span>
                              </span>
                              <span className={`text-xs ${t.textMuted}`}>{new Date(tenant.lastDiagnostic.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          {!ai ? (
                            <button
                              onClick={() => generateTenantAI(tenant)}
                              disabled={isLoadingThis}
                              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {isLoadingThis ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                              {isLoadingThis ? 'Analisando com IA...' : 'Gerar Análise com IA'}
                            </button>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className={`text-xs font-semibold ${t.label} uppercase tracking-wider flex items-center gap-1.5`}>
                                  <Brain size={12} className="text-purple-400" /> Análise de IA
                                </div>
                                <button onClick={() => generateTenantAI(tenant)} disabled={isLoadingThis} className={`text-xs ${t.textMuted} flex items-center gap-1`}>
                                  <RefreshCw size={10} /> Regenerar
                                </button>
                              </div>
                              {ai.error ? (
                                <p className={`text-sm ${t.textSub}`}>{ai.raw}</p>
                              ) : (
                                <div className="space-y-4">
                                  <div className={`${t.cardInner} border rounded-lg p-4`}>
                                    {ai.saude_geral && (
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs ${t.textMuted}`}>Saúde geral:</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ai.saude_geral === 'ótima' ? 'bg-emerald-500/20 text-emerald-400' : ai.saude_geral === 'boa' ? 'bg-blue-500/20 text-blue-400' : ai.saude_geral === 'regular' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                          {ai.saude_geral.charAt(0).toUpperCase() + ai.saude_geral.slice(1)}
                                        </span>
                                      </div>
                                    )}
                                    {ai.resumo && <p className={`text-sm ${t.textSub} leading-relaxed`}>{ai.resumo}</p>}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {ai.o_que_clientes_elogiam?.length > 0 && (
                                      <div>
                                        <div className={`text-xs font-semibold ${t.label} mb-2 flex items-center gap-1`}><ThumbsUp size={10} className="text-emerald-500" /> O que elogiam</div>
                                        <ul className="space-y-1.5">{ai.o_que_clientes_elogiam.slice(0, 4).map((e: string, i: number) => (
                                          <li key={i} className={`text-xs ${t.textSub} flex items-start gap-1.5`}><span className="text-emerald-500 mt-0.5 shrink-0">•</span>{e}</li>
                                        ))}</ul>
                                      </div>
                                    )}
                                    {ai.o_que_clientes_reclamam?.length > 0 && (
                                      <div>
                                        <div className={`text-xs font-semibold ${t.label} mb-2 flex items-center gap-1`}><ThumbsDown size={10} className="text-red-400" /> O que reclamam</div>
                                        <ul className="space-y-1.5">{ai.o_que_clientes_reclamam.slice(0, 4).map((r: string, i: number) => (
                                          <li key={i} className={`text-xs ${t.textSub} flex items-start gap-1.5`}><span className="text-red-400 mt-0.5 shrink-0">•</span>{r}</li>
                                        ))}</ul>
                                      </div>
                                    )}
                                  </div>
                                  {ai.oportunidades_para_cliente?.length > 0 && (
                                    <div>
                                      <div className={`text-xs font-semibold ${t.label} mb-2 flex items-center gap-1`}><Target size={10} className="text-teal-400" /> Oportunidades</div>
                                      <div className="space-y-2">{ai.oportunidades_para_cliente.slice(0, 3).map((op: any, i: number) => (
                                        <div key={i} className={`${t.cardInner} border rounded-lg p-3`}>
                                          <p className={`text-xs font-medium ${t.text}`}>{op.acao}</p>
                                          <p className={`text-xs ${t.textMuted} mt-0.5`}>{op.motivo}</p>
                                          {op.resultado_esperado && <p className="text-xs text-teal-400 mt-0.5">→ {op.resultado_esperado}</p>}
                                        </div>
                                      ))}</div>
                                    </div>
                                  )}
                                  {ai.script_abordagem && (
                                    <div className={`${isDark ? 'bg-purple-900/20 border-purple-700/30' : 'bg-purple-50 border-purple-200'} border rounded-lg p-4`}>
                                      <div className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-purple-300' : 'text-purple-700'} flex items-center gap-1.5`}>
                                        <MessageSquare size={10} /> Script de Abordagem CS
                                      </div>
                                      <p className={`text-xs ${isDark ? 'text-purple-200' : 'text-purple-800'} leading-relaxed italic`}>"{ai.script_abordagem}"</p>
                                    </div>
                                  )}

                                  {/* Botão de baixar relatório PDF */}
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch('/api/admin/generate-report', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            clientName: tenant.companyName,
                                            healthScore: tenant.healthScore,
                                            tenantData: tenant,
                                            aiAnalysis: ai,
                                          }),
                                        });
                                        const htmlText = await res.text();
                                        
                                        // Criar container oculto para renderizar o HTML
                                        const container = document.createElement('div');
                                        container.innerHTML = htmlText;
                                        container.style.position = 'fixed';
                                        container.style.left = '-9999px';
                                        container.style.top = '0';
                                        container.style.width = '800px';
                                        document.body.appendChild(container);
                                        
                                        // Importar html2pdf dinamicamente
                                        const html2pdf = (await import('html2pdf.js')).default;
                                        
                                        const fileName = `relatorio-${(tenant.companyName || 'cliente').replace(/\s+/g, '-').toLowerCase()}.pdf`;
                                        
                                        await html2pdf().set({
                                          margin: 0,
                                          filename: fileName,
                                          image: { type: 'jpeg', quality: 0.98 },
                                          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                                          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                                          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                                        }).from(container.querySelector('.page') || container).save();
                                        
                                        document.body.removeChild(container);
                                      } catch (err) {
                                        console.error('Erro ao gerar relatório PDF:', err);
                                        alert('Erro ao gerar PDF. Tente novamente.');
                                      }
                                    }}
                                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mt-3"
                                  >
                                    <Download size={12} /> Baixar Relatório PDF
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredTenants.length === 0 && (
                <div className={`text-center py-16 ${t.textMuted}`}>
                  {clientSearch ? `Nenhuma empresa encontrada para "${clientSearch}"` : 'Nenhum cliente com dados disponíveis.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CUSTOS DE IA ── */}
        {activeSection === 'ai_costs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-base font-semibold ${t.text}`}>Monitoramento de Custos de IA</h2>
              <div className="flex items-center gap-2">
                <select
                  value={aiUsagePeriod}
                  onChange={e => setAiUsagePeriod(e.target.value)}
                  className={`text-sm rounded-lg px-3 py-1.5 border ${t.input}`}
                >
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                  <option value="90">Últimos 90 dias</option>
                </select>
                <button
                  onClick={async () => {
                    setIsLoadingAiUsage(true);
                    try {
                      const res = await fetch(`/api/admin/ai-usage?period=${aiUsagePeriod}`);
                      const data = await res.json();
                      setAiUsageData(data);
                    } catch (e) { console.error(e); }
                    setIsLoadingAiUsage(false);
                  }}
                  className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  {isLoadingAiUsage ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Carregar
                </button>
              </div>
            </div>

            {!aiUsageData && !isLoadingAiUsage && (
              <div className={`text-center py-16 ${t.textMuted}`}>
                Clique em "Carregar" para visualizar os dados de uso da IA.
              </div>
            )}

            {isLoadingAiUsage && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
              </div>
            )}

            {aiUsageData && !isLoadingAiUsage && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Total de Chamadas', value: aiUsageData.summary?.totalCalls?.toLocaleString('pt-BR') || '0', icon: <Zap size={16} className="text-blue-500" />, sub: 'requisições' },
                    { label: 'Tokens Consumidos', value: aiUsageData.summary?.totalTokens?.toLocaleString('pt-BR') || '0', icon: <Activity size={16} className="text-violet-500" />, sub: 'tokens totais' },
                    { label: 'Custo Estimado (USD)', value: `$${aiUsageData.summary?.totalCostUSD || '0.00'}`, icon: <DollarSign size={16} className="text-emerald-500" />, sub: 'dólares' },
                    { label: 'Custo Estimado (BRL)', value: `R$ ${aiUsageData.summary?.totalCostBRL || '0,00'}`, icon: <DollarSign size={16} className="text-green-500" />, sub: 'reais' },
                    { label: 'Taxa de Sucesso', value: `${aiUsageData.summary?.successRate || '100'}%`, icon: <CheckCircle size={16} className="text-emerald-500" />, sub: `${aiUsageData.summary?.errorCount || 0} erros` },
                    { label: 'Média por Chamada', value: `${aiUsageData.summary?.avgTokensPerCall?.toLocaleString('pt-BR') || '0'} tokens`, icon: <Brain size={16} className="text-orange-500" />, sub: `$${aiUsageData.summary?.avgCostPerCall || '0'}` },
                  ].map((kpi, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${t.kpi}`}>
                      <div className="flex items-center gap-2 mb-1">{kpi.icon}<span className={`text-xs ${t.label}`}>{kpi.label}</span></div>
                      <div className={`text-lg font-bold ${t.text}`}>{kpi.value}</div>
                      <div className={`text-xs ${t.textMuted}`}>{kpi.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Uso por Endpoint */}
                <div className={`rounded-xl border ${t.card} p-5`}>
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <h3 className={`text-sm font-semibold ${t.text}`}>Uso por Funcionalidade</h3>
                    <div className="relative">
                      <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                      <input type="text" placeholder="Buscar endpoint..." value={aiEndpointSearch} onChange={e => setAiEndpointSearch(e.target.value)} className={`text-sm pl-8 pr-3 py-1.5 rounded-lg border ${t.input} w-44`} />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b ${t.border}`}>
                          {([
                            { label: 'Endpoint', field: 'endpoint', align: 'left' },
                            { label: 'Chamadas', field: 'calls', align: 'center' },
                            { label: 'Tokens', field: 'tokens', align: 'center' },
                            { label: 'Custo (USD)', field: 'cost', align: 'center' },
                            { label: 'Erros', field: 'errors', align: 'center' },
                          ] as { label: string; field: string; align: string }[]).map((col, ci) => (
                            <th key={ci} onClick={() => aiEndpointSortField === col.field ? setAiEndpointSortDir((d: string) => d === 'asc' ? 'desc' : 'asc') : (setAiEndpointSortField(col.field), setAiEndpointSortDir('desc'))}
                              className={`py-2.5 px-3 font-semibold cursor-pointer select-none group hover:text-emerald-500 transition-colors whitespace-nowrap ${col.align === 'left' ? 'text-left' : 'text-center'} ${aiEndpointSortField === col.field ? 'text-emerald-500' : t.label}`}>
                              <span className={`inline-flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : ''}`}>
                                {col.label}
                                {aiEndpointSortField === col.field ? (aiEndpointSortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronDown size={11} className="opacity-25 group-hover:opacity-60" />}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...(aiUsageData.endpointBreakdown || [])].filter((ep: any) => !aiEndpointSearch || ep.endpoint?.toLowerCase().includes(aiEndpointSearch.toLowerCase())).sort((a: any, b: any) => {
                          const va = a[aiEndpointSortField] ?? 0, vb = b[aiEndpointSortField] ?? 0;
                          if (typeof va === 'string') return aiEndpointSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
                          return aiEndpointSortDir === 'asc' ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
                        }).map((ep: any, i: number) => (
                          <tr key={i} className={`border-b ${t.border} ${t.tableRow}`}>
                            <td className={`py-2.5 px-3 font-medium ${t.text}`}>{ep.endpoint}</td>
                            <td className={`text-center py-2.5 px-3 ${t.textSub}`}>{ep.calls}</td>
                            <td className={`text-center py-2.5 px-3 ${t.textSub}`}>{ep.tokens?.toLocaleString('pt-BR')}</td>
                            <td className={`text-center py-2.5 px-3 ${t.textSub}`}>${ep.cost?.toFixed(4)}</td>
                            <td className={`text-center py-2.5 px-3 ${ep.errors > 0 ? 'text-red-400' : t.textSub}`}>{ep.errors}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Uso por Cliente */}
                <div className={`rounded-xl border ${t.card} p-5`}>
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <h3 className={`text-sm font-semibold ${t.text}`}>Uso por Cliente</h3>
                    <div className="relative">
                      <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                      <input type="text" placeholder="Buscar cliente..." value={aiClientSearch} onChange={e => setAiClientSearch(e.target.value)} className={`text-sm pl-8 pr-3 py-1.5 rounded-lg border ${t.input} w-44`} />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b ${t.border}`}>
                          {([
                            { label: 'Cliente', field: 'name', align: 'left' },
                            { label: 'Chamadas', field: 'calls', align: 'center' },
                            { label: 'Tokens', field: 'tokens', align: 'center' },
                            { label: 'Custo (USD)', field: 'cost', align: 'center' },
                          ] as { label: string; field: string; align: string }[]).map((col, ci) => (
                            <th key={ci} onClick={() => aiClientSortField === col.field ? setAiClientSortDir((d: string) => d === 'asc' ? 'desc' : 'asc') : (setAiClientSortField(col.field), setAiClientSortDir('desc'))}
                              className={`py-2.5 px-3 font-semibold cursor-pointer select-none group hover:text-emerald-500 transition-colors whitespace-nowrap ${col.align === 'left' ? 'text-left' : 'text-center'} ${aiClientSortField === col.field ? 'text-emerald-500' : t.label}`}>
                              <span className={`inline-flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : ''}`}>
                                {col.label}
                                {aiClientSortField === col.field ? (aiClientSortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronDown size={11} className="opacity-25 group-hover:opacity-60" />}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...(aiUsageData.tenantBreakdown || [])].filter((tb: any) => !aiClientSearch || (tb.name || tb.tenantId || '').toLowerCase().includes(aiClientSearch.toLowerCase())).sort((a: any, b: any) => {
                          const va = a[aiClientSortField] ?? 0, vb = b[aiClientSortField] ?? 0;
                          if (typeof va === 'string') return aiClientSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
                          return aiClientSortDir === 'asc' ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
                        }).map((tb: any, i: number) => (
                          <tr key={i} className={`border-b ${t.border} ${t.tableRow}`}>
                            <td className={`py-2.5 px-3 font-medium ${t.text}`}>{tb.name || tb.tenantId?.substring(0, 8) || 'Sistema'}</td>
                            <td className={`text-center py-2.5 px-3 ${t.textSub}`}>{tb.calls}</td>
                            <td className={`text-center py-2.5 px-3 ${t.textSub}`}>{tb.tokens?.toLocaleString('pt-BR')}</td>
                            <td className={`text-center py-2.5 px-3 ${t.textSub}`}>${tb.cost?.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tendência Diária */}
                {aiUsageData.dailyTrend?.length > 0 && (
                  <div className={`rounded-xl border ${t.card} p-5`}>
                    <h3 className={`text-sm font-semibold mb-3 ${t.text}`}>Tendência Diária</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={`border-b ${t.border}`}>
                            <th className={`text-left py-2.5 px-3 ${t.label}`}>Data</th>
                            <th className={`text-center py-2.5 px-3 ${t.label}`}>Chamadas</th>
                            <th className={`text-center py-2.5 px-3 ${t.label}`}>Tokens</th>
                            <th className={`text-center py-2.5 px-3 ${t.label}`}>Custo (USD)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiUsageData.dailyTrend.map((day: any, i: number) => (
                            <tr key={i} className={`border-b ${t.border} ${t.tableRow}`}>
                              <td className={`py-2.5 px-3 font-medium ${t.text}`}>{new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                              <td className={`text-center py-2.5 px-3 ${t.textSub}`}>{day.calls}</td>
                              <td className={`text-center py-2.5 px-3 ${t.textSub}`}>{day.tokens?.toLocaleString('pt-BR')}</td>
                              <td className={`text-center py-2.5 px-3 ${t.textSub}`}>${day.cost?.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Logs Recentes */}
                <div className={`rounded-xl border ${t.card} p-5`}>
                  <h3 className={`text-sm font-semibold mb-3 ${t.text}`}>Últimas 50 Chamadas</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={`border-b ${t.border}`}>
                          <th className={`text-left py-2 px-2 ${t.label}`}>Data/Hora</th>
                          <th className={`text-left py-2 px-2 ${t.label}`}>Endpoint</th>
                          <th className={`text-center py-2 px-2 ${t.label}`}>Tokens</th>
                          <th className={`text-center py-2 px-2 ${t.label}`}>Custo</th>
                          <th className={`text-center py-2 px-2 ${t.label}`}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiUsageData.recentLogs?.map((log: any, i: number) => (
                          <tr key={i} className={`border-b ${t.border} ${t.tableRow}`}>
                            <td className={`py-2 px-2 ${t.textSub}`}>{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                            <td className={`py-2 px-2 ${t.text}`}>{log.endpoint}</td>
                            <td className={`text-center py-2 px-2 ${t.textSub}`}>{log.total_tokens?.toLocaleString('pt-BR')}</td>
                            <td className={`text-center py-2 px-2 ${t.textSub}`}>${parseFloat(log.estimated_cost_usd || 0).toFixed(6)}</td>
                            <td className="text-center py-2 px-2">
                              {log.status === 'success' 
                                ? <span className="text-emerald-500 font-medium">OK</span>
                                : <span className="text-red-400 font-medium" title={log.error_message}>Erro</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {/* ── INTELIGÊNCIA DE MERCADO ── */}
        {activeSection === 'mercado' && (
          <AdminMarketIntelligence isDark={isDark} />
        )}
      </div>
    </div>
  );
}
