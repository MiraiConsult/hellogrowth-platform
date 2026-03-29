'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Brain, BarChart2, MessageSquare,
  Loader2, RefreshCw, ChevronDown, ChevronUp, Zap, AlertTriangle,
  CheckCircle, Star, Target, Lightbulb, Globe, ArrowUp, ArrowDown,
  ThumbsUp, ThumbsDown, Activity, Users, DollarSign, Award, Minus,
  Calendar, Package
} from 'lucide-react';

interface AdminIntelligenceProps {
  isDark: boolean;
  tenants: any[];
  globalStats: any;
}

const DARK = {
  bg: 'bg-gray-950',
  surface: 'bg-gray-900',
  border: 'border-gray-800',
  text: 'text-white',
  textSub: 'text-gray-400',
  textMuted: 'text-gray-500',
  label: 'text-gray-400',
  kpi: 'bg-gray-900 border-gray-800',
  card: 'bg-gray-900 border-gray-800',
  cardInner: 'bg-gray-800/50 border-gray-700',
  badge: 'bg-gray-800 text-gray-300',
  tableRow: 'hover:bg-gray-800/30',
  divider: 'divide-gray-800',
};

const LIGHT = {
  bg: 'bg-slate-50',
  surface: 'bg-white',
  border: 'border-slate-200',
  text: 'text-slate-900',
  textSub: 'text-slate-500',
  textMuted: 'text-slate-400',
  label: 'text-slate-500',
  kpi: 'bg-white border-slate-200',
  card: 'bg-white border-slate-200',
  cardInner: 'bg-slate-50 border-slate-200',
  badge: 'bg-slate-100 text-slate-600',
  tableRow: 'hover:bg-slate-50',
  divider: 'divide-slate-100',
};

function NpsGauge({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' | 'lg' }) {
  if (score === null || score === undefined) return <span className="text-gray-400 text-sm font-medium">—</span>;
  const color = score >= 70 ? 'text-emerald-500' : score >= 30 ? 'text-yellow-500' : 'text-red-500';
  const sizes = { sm: 'text-base font-bold', md: 'text-2xl font-bold', lg: 'text-4xl font-bold' };
  return <span className={`${color} ${sizes[size]}`}>{score}</span>;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' | null }) {
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
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(100, score)}%` }} />
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

export default function AdminIntelligence({ isDark, tenants, globalStats }: AdminIntelligenceProps) {
  const t = isDark ? DARK : LIGHT;

  const [activeSection, setActiveSection] = useState<'overview' | 'trends' | 'market' | 'clients'>('overview');
  const [trendsData, setTrendsData] = useState<any>(null);
  const [insightsData, setInsightsData] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [tenantAI, setTenantAI] = useState<Record<string, any>>({});
  const [isLoadingTenantAI, setIsLoadingTenantAI] = useState<string | null>(null);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  const loadTrends = useCallback(async () => {
    setIsLoadingTrends(true);
    try {
      const res = await fetch('/api/admin/analytics?type=trends');
      setTrendsData(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoadingTrends(false); }
  }, []);

  const loadInsights = useCallback(async () => {
    setIsLoadingInsights(true);
    try {
      const res = await fetch('/api/admin/analytics?type=insights');
      setInsightsData(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsLoadingInsights(false); }
  }, []);

  const generateMarketAI = useCallback(async () => {
    if (!trendsData) return;
    setIsLoadingAI(true);
    try {
      const res = await fetch('/api/admin/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'market-overview',
          data: {
            globalNps: globalStats?.npsScore,
            totalResponses: globalStats?.totalNpsResponses,
            topThemes: insightsData?.themes?.slice(0, 15),
            promoterTexts: insightsData?.promoterTexts?.slice(0, 15),
            detractorTexts: insightsData?.detractorTexts?.slice(0, 10),
            trendData: trendsData?.trend?.slice(-6),
          }
        })
      });
      const data = await res.json();
      setAiAnalysis(data.analysis);
    } catch (e) { console.error(e); }
    finally { setIsLoadingAI(false); }
  }, [trendsData, insightsData, globalStats]);

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
    } catch (e) { console.error(e); }
    finally { setIsLoadingTenantAI(null); }
  }, []);

  useEffect(() => {
    if (activeSection === 'trends' && !trendsData) loadTrends();
    if (activeSection === 'market' && !insightsData) loadInsights();
  }, [activeSection, trendsData, insightsData, loadTrends, loadInsights]);

  // Filtrar e ordenar tenants por health score
  const filteredTenants = tenants
    .filter(ten => !clientSearch || ten.companyName?.toLowerCase().includes(clientSearch.toLowerCase()))
    .sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0));

  const cardCls = `${t.card} border rounded-xl p-5`;
  const sectionBtnCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active
      ? 'bg-emerald-600 text-white'
      : `${t.badge} hover:opacity-80`}`;

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* Navegação */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'overview', label: 'Visão Geral', icon: <BarChart2 size={14} /> },
            { id: 'trends', label: 'Tendências', icon: <TrendingUp size={14} /> },
            { id: 'market', label: 'Inteligência de Mercado', icon: <Globe size={14} /> },
            { id: 'clients', label: 'Análise por Cliente', icon: <Users size={14} /> },
          ].map(sec => (
            <button key={sec.id} onClick={() => setActiveSection(sec.id as any)} className={sectionBtnCls(activeSection === sec.id)}>
              <span className="flex items-center gap-1.5">{sec.icon} {sec.label}</span>
            </button>
          ))}
        </div>

        {/* ── VISÃO GERAL ── */}
        {activeSection === 'overview' && (
          <div className="space-y-5">
            {/* KPIs globais */}
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

            {/* Tabela de clientes com health score */}
            <div className={cardCls}>
              <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
                <Award size={16} className="text-emerald-500" /> Ranking de Clientes por Health Score
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-xs ${t.textMuted} border-b ${t.border}`}>
                      <th className="text-left py-2 pr-4">Empresa</th>
                      <th className="text-center py-2 px-3">Plano</th>
                      <th className="text-center py-2 px-3">NPS</th>
                      <th className="text-center py-2 px-3">Respostas</th>
                      <th className="text-center py-2 px-3">Leads</th>
                      <th className="text-center py-2 px-3">Pipeline</th>
                      <th className="text-center py-2 px-3">Tendência</th>
                      <th className="text-left py-2 pl-3 w-40">Health Score</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${t.border}`}>
                    {filteredTenants.map((tenant) => (
                      <tr key={tenant.tenantId} className={`${t.tableRow} transition-colors`}>
                        <td className={`py-3 pr-4 font-semibold ${t.text}`}>{tenant.companyName}</td>
                        <td className="py-3 px-3 text-center"><PlanBadge plan={tenant.plan} /></td>
                        <td className="py-3 px-3 text-center"><NpsGauge score={tenant.nps?.score} size="sm" /></td>
                        <td className={`py-3 px-3 text-center ${t.textSub}`}>{tenant.nps?.totalResponses || 0}</td>
                        <td className={`py-3 px-3 text-center ${t.textSub}`}>{tenant.leads?.total || 0}</td>
                        <td className={`py-3 px-3 text-center text-purple-500 font-medium`}>
                          {tenant.leads?.pipelineValue > 0 ? `R$ ${(tenant.leads.pipelineValue / 1000).toFixed(1)}k` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex justify-center"><TrendIcon trend={tenant.nps?.trend} /></div>
                        </td>
                        <td className="py-3 pl-3 w-40"><HealthBar score={tenant.healthScore || 0} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Distribuição NPS global */}
            <div className={cardCls}>
              <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
                <MessageSquare size={16} className="text-blue-500" /> Distribuição NPS Global
              </h3>
              {(() => {
                const total = tenants.reduce((sum, ten) => sum + (ten.nps?.totalResponses || 0), 0);
                const promo = tenants.reduce((sum, ten) => sum + (ten.nps?.promotores || 0), 0);
                const detr = tenants.reduce((sum, ten) => sum + (ten.nps?.detratores || 0), 0);
                const pass = tenants.reduce((sum, ten) => sum + (ten.nps?.passivos || 0), 0);
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

        {/* ── TENDÊNCIAS ── */}
        {activeSection === 'trends' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className={`text-base font-semibold ${t.text}`}>Evolução do NPS — Base Completa</h2>
              <button onClick={loadTrends} disabled={isLoadingTrends} className={`flex items-center gap-1.5 text-xs ${t.textSub} hover:${t.text} transition-colors`}>
                {isLoadingTrends ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
              </button>
            </div>

            {isLoadingTrends ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : trendsData ? (
              <div className="space-y-5">
                {/* Gráfico de barras */}
                <div className={cardCls}>
                  <h3 className={`text-sm font-semibold ${t.text} mb-5`}>NPS Mensal da Base</h3>
                  <div className="flex items-end gap-2 h-40">
                    {trendsData.trend?.slice(-8).map((m: any, i: number) => {
                      const height = Math.max(4, ((m.nps + 100) / 200) * 100);
                      const color = m.nps >= 70 ? 'bg-emerald-500' : m.nps >= 30 ? 'bg-yellow-500' : 'bg-red-500';
                      const textColor = m.nps >= 70 ? 'text-emerald-500' : m.nps >= 30 ? 'text-yellow-500' : 'text-red-400';
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${textColor}`}>{m.nps}</span>
                          <div className={`w-full ${color} rounded-t-sm opacity-80 hover:opacity-100 transition-opacity`} style={{ height: `${height}%` }} />
                          <span className={`text-xs ${t.textMuted} text-center`}>{m.month?.substring(5)}</span>
                          <span className={`text-xs ${t.textMuted}`}>{m.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tabela mensal */}
                <div className={cardCls}>
                  <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Detalhamento Mensal</h3>
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
                        {trendsData.trend?.slice(-8).reverse().map((m: any, i: number) => (
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

        {/* ── INTELIGÊNCIA DE MERCADO ── */}
        {activeSection === 'market' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className={`text-base font-semibold ${t.text}`}>O que os clientes finais estão dizendo</h2>
              <button
                onClick={() => { if (!insightsData) loadInsights(); generateMarketAI(); }}
                disabled={isLoadingAI}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {isLoadingAI ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                {isLoadingAI ? 'Analisando com IA...' : 'Gerar Análise com IA'}
              </button>
            </div>

            {/* Análise de IA */}
            {aiAnalysis && (
              <div className={`${cardCls} border-purple-500/30 bg-purple-500/5`}>
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={18} className="text-purple-400" />
                  <h3 className={`text-sm font-semibold ${t.text}`}>Análise de Inteligência Artificial</h3>
                </div>

                {aiAnalysis.error ? (
                  <p className={`text-sm ${t.textSub}`}>{aiAnalysis.raw || 'Erro ao gerar análise.'}</p>
                ) : (
                  <div className="space-y-5">
                    {aiAnalysis.resumo_executivo && (
                      <div className={`${t.cardInner} border rounded-lg p-4`}>
                        <p className={`text-sm ${t.text} leading-relaxed`}>{aiAnalysis.resumo_executivo}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {aiAnalysis.principais_forcas?.length > 0 && (
                        <div>
                          <h4 className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-2 flex items-center gap-1.5`}>
                            <ThumbsUp size={12} className="text-emerald-500" /> Principais Forças
                          </h4>
                          <ul className="space-y-1.5">
                            {aiAnalysis.principais_forcas.map((f: string, i: number) => (
                              <li key={i} className={`flex items-start gap-2 text-sm ${t.textSub}`}>
                                <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" /> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiAnalysis.principais_riscos?.length > 0 && (
                        <div>
                          <h4 className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-2 flex items-center gap-1.5`}>
                            <AlertTriangle size={12} className="text-red-400" /> Riscos Identificados
                          </h4>
                          <ul className="space-y-1.5">
                            {aiAnalysis.principais_riscos.map((r: string, i: number) => (
                              <li key={i} className={`flex items-start gap-2 text-sm ${t.textSub}`}>
                                <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" /> {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {aiAnalysis.oportunidades_mercado?.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-3 flex items-center gap-1.5`}>
                          <Lightbulb size={12} className="text-yellow-500" /> Oportunidades de Mercado
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {aiAnalysis.oportunidades_mercado.map((op: any, i: number) => (
                            <div key={i} className={`${t.cardInner} border rounded-lg p-4`}>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <span className={`text-sm font-semibold ${t.text}`}>{op.titulo}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${op.potencial === 'alto' ? 'bg-emerald-500/20 text-emerald-400' : op.potencial === 'médio' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                  {op.potencial}
                                </span>
                              </div>
                              <p className={`text-xs ${t.textSub} leading-relaxed`}>{op.descricao}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiAnalysis.temas_emergentes?.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-3 flex items-center gap-1.5`}>
                          <TrendingUp size={12} className="text-blue-400" /> Temas Emergentes
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {aiAnalysis.temas_emergentes.map((tema: any, i: number) => (
                            <div key={i} className={`${t.cardInner} border rounded-lg p-3`}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-sm font-semibold ${t.text}`}>{tema.tema}</span>
                                <span className={`text-xs ${tema.sentimento === 'positivo' ? 'text-emerald-400' : tema.sentimento === 'negativo' ? 'text-red-400' : 'text-yellow-400'}`}>
                                  {tema.sentimento === 'positivo' ? '↑' : tema.sentimento === 'negativo' ? '↓' : '→'}
                                </span>
                              </div>
                              <p className={`text-xs ${t.textMuted} leading-relaxed`}>{tema.insight}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiAnalysis.recomendacoes_para_clientes?.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-3 flex items-center gap-1.5`}>
                          <Target size={12} className="text-teal-400" /> Recomendações para seus Clientes
                        </h4>
                        <div className="space-y-2">
                          {aiAnalysis.recomendacoes_para_clientes.map((rec: any, i: number) => (
                            <div key={i} className={`${t.cardInner} border rounded-lg p-4 flex gap-3`}>
                              <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-teal-400">{i + 1}</span>
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${t.text}`}>{rec.recomendacao}</p>
                                <p className={`text-xs ${t.textMuted} mt-0.5`}>{rec.justificativa}</p>
                                {rec.impacto_esperado && <p className="text-xs text-emerald-400 mt-1">→ {rec.impacto_esperado}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Enquanto carrega insights */}
            {isLoadingInsights && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
              </div>
            )}

            {/* Temas por sentimento (apenas comentários reais, sem múltipla escolha) */}
            {insightsData && !isLoadingInsights && (
              <div className={cardCls}>
                <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Temas por Frequência e Sentimento</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`text-xs ${t.textMuted} border-b ${t.border}`}>
                        <th className="text-left py-2 pr-4">Tema</th>
                        <th className="text-center py-2 px-3">Menções</th>
                        <th className="text-center py-2 px-3">% Promotores</th>
                        <th className="text-center py-2 px-3">% Detratores</th>
                        <th className="text-center py-2 px-3">Sentimento</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${t.border}`}>
                      {insightsData.themes?.slice(0, 15).map((theme: any, i: number) => (
                        <tr key={i} className={`${t.tableRow} transition-colors`}>
                          <td className={`py-2.5 pr-4 font-medium ${t.text}`}>{theme.theme}</td>
                          <td className={`py-2.5 px-3 text-center ${t.textSub}`}>{theme.count}</td>
                          <td className="py-2.5 px-3 text-center text-emerald-500">{theme.promoterRate}%</td>
                          <td className="py-2.5 px-3 text-center text-red-400">{theme.detractorRate}%</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${theme.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : theme.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                              {theme.sentiment === 'positive' ? 'Positivo' : theme.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ANÁLISE POR CLIENTE ── */}
        {activeSection === 'clients' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className={`text-base font-semibold ${t.text}`}>Análise Individual por Cliente</h2>
              <input
                type="text"
                placeholder="Buscar empresa..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className={`text-sm px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} w-56`}
              />
            </div>

            <div className="space-y-3">
              {filteredTenants.map((tenant) => {
                const tid = tenant.tenantId;
                const isExpanded = expandedTenant === tid;
                const ai = tenantAI[tid];
                const isLoadingThis = isLoadingTenantAI === tid;

                return (
                  <div key={tid} className={`${t.card} border rounded-xl overflow-hidden`}>
                    {/* Header */}
                    <div
                      className={`flex items-center gap-4 p-4 cursor-pointer ${t.tableRow} transition-colors`}
                      onClick={() => setExpandedTenant(isExpanded ? null : tid)}
                    >
                      {/* Health score circle */}
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
                        <div className="text-center">
                          <PlanBadge plan={tenant.plan} />
                        </div>
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

                    {/* Detalhes expandidos */}
                    {isExpanded && (
                      <div className={`border-t ${t.border} p-5 space-y-5`}>
                        {/* Métricas detalhadas */}
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

                        {/* Pipeline por status */}
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
                                <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>
                                  {s.label}: {s.value}
                                </span>
                              ))}
                              {tenant.leads.pipelineValue > 0 && (
                                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-500/20 text-purple-400">
                                  Total: R$ {tenant.leads.pipelineValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Último diagnóstico MPD */}
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
                              {tenant.diagnosticCount > 1 && <span className={`text-xs ${t.textMuted}`}>({tenant.diagnosticCount} diagnósticos no total)</span>}
                            </div>
                          </div>
                        )}

                        {/* Análise de IA */}
                        <div>
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
                                <button onClick={() => generateTenantAI(tenant)} disabled={isLoadingThis} className={`text-xs ${t.textMuted} hover:${t.text} flex items-center gap-1`}>
                                  <RefreshCw size={10} /> Regenerar
                                </button>
                              </div>

                              {ai.error ? (
                                <p className={`text-sm ${t.textSub}`}>{ai.raw}</p>
                              ) : (
                                <div className="space-y-4">
                                  {/* Saúde + Resumo */}
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

                                  {/* Elogios e críticas */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {ai.o_que_clientes_elogiam?.length > 0 && (
                                      <div>
                                        <div className={`text-xs font-semibold ${t.label} mb-2 flex items-center gap-1`}><ThumbsUp size={10} className="text-emerald-500" /> O que os clientes elogiam</div>
                                        <ul className="space-y-1.5">
                                          {ai.o_que_clientes_elogiam.slice(0, 4).map((e: string, i: number) => (
                                            <li key={i} className={`text-xs ${t.textSub} flex items-start gap-1.5`}><span className="text-emerald-500 mt-0.5 shrink-0">•</span>{e}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {ai.o_que_clientes_reclamam?.length > 0 && (
                                      <div>
                                        <div className={`text-xs font-semibold ${t.label} mb-2 flex items-center gap-1`}><ThumbsDown size={10} className="text-red-400" /> O que os clientes reclamam</div>
                                        <ul className="space-y-1.5">
                                          {ai.o_que_clientes_reclamam.slice(0, 4).map((r: string, i: number) => (
                                            <li key={i} className={`text-xs ${t.textSub} flex items-start gap-1.5`}><span className="text-red-400 mt-0.5 shrink-0">•</span>{r}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  {/* Oportunidades */}
                                  {ai.oportunidades_para_cliente?.length > 0 && (
                                    <div>
                                      <div className={`text-xs font-semibold ${t.label} mb-2 flex items-center gap-1`}><Target size={10} className="text-teal-400" /> Oportunidades para este cliente</div>
                                      <div className="space-y-2">
                                        {ai.oportunidades_para_cliente.slice(0, 3).map((op: any, i: number) => (
                                          <div key={i} className={`${t.cardInner} border rounded-lg p-3`}>
                                            <p className={`text-xs font-medium ${t.text}`}>{op.acao}</p>
                                            <p className={`text-xs ${t.textMuted} mt-0.5`}>{op.motivo}</p>
                                            {op.resultado_esperado && <p className="text-xs text-teal-400 mt-0.5">→ {op.resultado_esperado}</p>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Script CS */}
                                  {ai.script_abordagem && (
                                    <div className={`${isDark ? 'bg-purple-900/20 border-purple-700/30' : 'bg-purple-50 border-purple-200'} border rounded-lg p-4`}>
                                      <div className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-purple-300' : 'text-purple-700'} flex items-center gap-1.5`}>
                                        <MessageSquare size={10} /> Script de Abordagem CS
                                      </div>
                                      <p className={`text-xs ${isDark ? 'text-purple-200' : 'text-purple-800'} leading-relaxed italic`}>"{ai.script_abordagem}"</p>
                                    </div>
                                  )}
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
      </div>
    </div>
  );
}
