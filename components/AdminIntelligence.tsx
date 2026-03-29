'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Brain, BarChart2, MessageSquare,
  Loader2, RefreshCw, ChevronDown, ChevronUp, Zap, AlertTriangle,
  CheckCircle, Star, Target, Lightbulb, Globe, ArrowUp, ArrowDown,
  ThumbsUp, ThumbsDown, Activity, Users, DollarSign, Award
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
  borderInner: 'border-gray-700',
  text: 'text-white',
  textSub: 'text-gray-400',
  textMuted: 'text-gray-500',
  label: 'text-gray-400',
  input: 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500',
  kpi: 'bg-gray-900 border-gray-800',
  card: 'bg-gray-900 border-gray-800',
  cardInner: 'bg-gray-800/50 border-gray-700',
  badge: 'bg-gray-800 text-gray-300',
};

const LIGHT = {
  bg: 'bg-slate-50',
  surface: 'bg-white',
  border: 'border-slate-200',
  borderInner: 'border-slate-200',
  text: 'text-slate-900',
  textSub: 'text-slate-500',
  textMuted: 'text-slate-400',
  label: 'text-slate-500',
  input: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400',
  kpi: 'bg-white border-slate-200',
  card: 'bg-white border-slate-200',
  cardInner: 'bg-slate-50 border-slate-200',
  badge: 'bg-slate-100 text-slate-600',
};

function NpsGauge({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' | 'lg' }) {
  if (score === null) return <span className="text-gray-500 text-sm">—</span>;
  const color = score >= 70 ? 'text-emerald-500' : score >= 30 ? 'text-yellow-500' : 'text-red-500';
  const sizes = { sm: 'text-lg font-bold', md: 'text-2xl font-bold', lg: 'text-4xl font-bold' };
  return <span className={`${color} ${sizes[size]}`}>{score}</span>;
}

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'stable' | null }) {
  if (!trend || trend === 'stable') return <span className="text-gray-400 text-xs flex items-center gap-1"><Minus size={10} /> Estável</span>;
  if (trend === 'up') return <span className="text-emerald-500 text-xs flex items-center gap-1"><ArrowUp size={10} /> Subindo</span>;
  return <span className="text-red-400 text-xs flex items-center gap-1"><ArrowDown size={10} /> Caindo</span>;
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700/30 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold ${score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-yellow-500' : 'text-red-400'}`}>{score}</span>
    </div>
  );
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
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [tenantAI, setTenantAI] = useState<Record<string, any>>({});
  const [isLoadingTenantAI, setIsLoadingTenantAI] = useState<string | null>(null);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  // Carregar tendências
  const loadTrends = useCallback(async () => {
    setIsLoadingTrends(true);
    try {
      const res = await fetch('/api/admin/analytics?type=trends');
      const data = await res.json();
      setTrendsData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTrends(false);
    }
  }, []);

  // Carregar insights de mercado
  const loadInsights = useCallback(async () => {
    setIsLoadingInsights(true);
    try {
      const res = await fetch('/api/admin/analytics?type=insights');
      const data = await res.json();
      setInsightsData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingInsights(false);
    }
  }, []);

  // Gerar análise de IA do mercado
  const generateMarketAI = useCallback(async () => {
    if (!trendsData || !insightsData) return;
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAI(false);
    }
  }, [trendsData, insightsData, globalStats]);

  // Gerar análise de IA de um tenant
  const generateTenantAI = useCallback(async (tenant: any, companyName: string) => {
    const tid = tenant.tenantId;
    setIsLoadingTenantAI(tid);
    try {
      // Buscar detalhes do tenant
      const detailRes = await fetch(`/api/admin/analytics?type=tenant&tenantId=${tid}`);
      const detail = await detailRes.json();

      const res = await fetch('/api/admin/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'tenant-analysis',
          tenantId: tid,
          data: {
            companyName,
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTenantAI(null);
    }
  }, []);

  useEffect(() => {
    loadTrends();
    loadInsights();
  }, [loadTrends, loadInsights]);

  // Ordenar tenants por health score
  const sortedTenants = [...tenants].sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0));

  const cardCls = `${t.card} border rounded-xl p-5`;
  const sectionBtnCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active
      ? 'bg-emerald-600 text-white'
      : `${t.badge} hover:opacity-80`}`;

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* Navegação de seções */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setActiveSection('overview')} className={sectionBtnCls(activeSection === 'overview')}>
            <span className="flex items-center gap-1.5"><BarChart2 size={14} /> Visão Geral</span>
          </button>
          <button onClick={() => setActiveSection('trends')} className={sectionBtnCls(activeSection === 'trends')}>
            <span className="flex items-center gap-1.5"><TrendingUp size={14} /> Tendências</span>
          </button>
          <button onClick={() => { setActiveSection('market'); if (!insightsData) loadInsights(); }} className={sectionBtnCls(activeSection === 'market')}>
            <span className="flex items-center gap-1.5"><Globe size={14} /> Inteligência de Mercado</span>
          </button>
          <button onClick={() => setActiveSection('clients')} className={sectionBtnCls(activeSection === 'clients')}>
            <span className="flex items-center gap-1.5"><Users size={14} /> Análise por Cliente</span>
          </button>
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
                { label: 'Tendência NPS', value: trendsData ? <span className="text-2xl font-bold text-teal-500">{trendsData.trend?.slice(-1)[0]?.nps ?? '—'}</span> : <Loader2 size={16} className="animate-spin text-gray-500" />, sub: 'último mês', icon: <TrendingUp size={16} className="text-teal-500" /> },
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

            {/* Distribuição de health scores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={cardCls}>
                <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
                  <Award size={16} className="text-emerald-500" /> Health Score dos Clientes
                </h3>
                <div className="space-y-3">
                  {sortedTenants.slice(0, 8).map((tenant) => {
                    const tid = tenant.tenantId;
                    const shortId = tid?.substring(0, 8) || '—';
                    return (
                      <div key={tid} className="flex items-center gap-3">
                        <span className={`text-xs ${t.textMuted} w-20 truncate font-mono`}>{shortId}…</span>
                        <div className="flex-1">
                          <HealthBar score={tenant.healthScore || 0} />
                        </div>
                        <div className="text-right w-16">
                          <NpsGauge score={tenant.nps?.score} size="sm" />
                          <div className={`text-xs ${t.textMuted}`}>{tenant.nps?.totalResponses || 0} resp.</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={cardCls}>
                <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
                  <MessageSquare size={16} className="text-blue-500" /> Distribuição NPS Global
                </h3>
                {(() => {
                  const total = tenants.reduce((sum, t) => sum + (t.nps?.totalResponses || 0), 0);
                  const promo = tenants.reduce((sum, t) => sum + (t.nps?.promotores || 0), 0);
                  const detr = tenants.reduce((sum, t) => sum + (t.nps?.detratores || 0), 0);
                  const pass = tenants.reduce((sum, t) => sum + (t.nps?.passivos || 0), 0);
                  const pPromo = total > 0 ? Math.round((promo / total) * 100) : 0;
                  const pDetr = total > 0 ? Math.round((detr / total) * 100) : 0;
                  const pPass = total > 0 ? Math.round((pass / total) * 100) : 0;
                  return (
                    <div className="space-y-4">
                      <div className="flex h-8 rounded-lg overflow-hidden gap-0.5">
                        <div className="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold transition-all" style={{ width: `${pPromo}%` }}>{pPromo > 8 ? `${pPromo}%` : ''}</div>
                        <div className="bg-yellow-500 flex items-center justify-center text-white text-xs font-bold transition-all" style={{ width: `${pPass}%` }}>{pPass > 8 ? `${pPass}%` : ''}</div>
                        <div className="bg-red-500 flex items-center justify-center text-white text-xs font-bold transition-all" style={{ width: `${pDetr}%` }}>{pDetr > 8 ? `${pDetr}%` : ''}</div>
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
                {/* Gráfico de barras de NPS mensal */}
                <div className={cardCls}>
                  <h3 className={`text-sm font-semibold ${t.text} mb-5`}>NPS Mensal da Base</h3>
                  <div className="flex items-end gap-2 h-40">
                    {trendsData.trend?.slice(-8).map((m: any, i: number) => {
                      const height = Math.max(4, ((m.nps + 100) / 200) * 100);
                      const color = m.nps >= 70 ? 'bg-emerald-500' : m.nps >= 30 ? 'bg-yellow-500' : 'bg-red-500';
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className={`text-xs font-bold ${m.nps >= 70 ? 'text-emerald-500' : m.nps >= 30 ? 'text-yellow-500' : 'text-red-400'}`}>{m.nps}</span>
                          <div className={`w-full ${color} rounded-t-sm opacity-80 hover:opacity-100 transition-opacity`} style={{ height: `${height}%` }} title={`${m.count} respostas`} />
                          <span className={`text-xs ${t.textMuted} text-center`}>{m.month?.substring(5)}</span>
                          <span className={`text-xs ${t.textMuted}`}>{m.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tabela de tendências mensais */}
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
                          <th className="text-left py-2 pl-3">Top Temas</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${t.border}`}>
                        {trendsData.trend?.slice(-8).reverse().map((m: any, i: number) => (
                          <tr key={i} className={`${t.textSub} hover:${isDark ? 'bg-gray-800/30' : 'bg-slate-50'} transition-colors`}>
                            <td className={`py-2.5 pr-4 font-medium ${t.text}`}>{m.month}</td>
                            <td className="py-2.5 px-3 text-center"><NpsGauge score={m.nps} size="sm" /></td>
                            <td className={`py-2.5 px-3 text-center ${t.textSub}`}>{m.avg}</td>
                            <td className={`py-2.5 px-3 text-center ${t.textSub}`}>{m.count}</td>
                            <td className="py-2.5 px-3 text-center text-emerald-500 font-medium">{m.promotores}</td>
                            <td className="py-2.5 px-3 text-center text-yellow-500 font-medium">{m.passivos}</td>
                            <td className="py-2.5 px-3 text-center text-red-400 font-medium">{m.detratores}</td>
                            <td className={`py-2.5 pl-3 text-xs ${t.textMuted}`}>
                              {m.topChoices?.slice(0, 3).map(([theme, count]: [string, number]) => (
                                <span key={theme} className={`inline-block ${t.badge} rounded px-1.5 py-0.5 mr-1 mb-0.5`}>{theme} ({count})</span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top temas globais */}
                {trendsData.topThemes?.length > 0 && (
                  <div className={cardCls}>
                    <h3 className={`text-sm font-semibold ${t.text} mb-4`}>Temas Mais Mencionados (Múltipla Escolha)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {trendsData.topThemes.slice(0, 16).map((item: any, i: number) => (
                        <div key={i} className={`${t.cardInner} border rounded-lg p-3`}>
                          <div className={`text-sm font-semibold ${t.text} mb-1`}>{item.theme}</div>
                          <div className={`text-xs ${t.textMuted}`}>{item.count}x mencionado</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-center py-20 ${t.textMuted}`}>Sem dados de tendências disponíveis.</div>
            )}
          </div>
        )}

        {/* ── INTELIGÊNCIA DE MERCADO ── */}
        {activeSection === 'market' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className={`text-base font-semibold ${t.text}`}>Inteligência de Mercado — O que os clientes finais estão dizendo</h2>
              <button
                onClick={generateMarketAI}
                disabled={isLoadingAI || !trendsData}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {isLoadingAI ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                {isLoadingAI ? 'Analisando com IA...' : 'Gerar Análise com IA'}
              </button>
            </div>

            {isLoadingInsights ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : insightsData ? (
              <div className="space-y-5">
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
                        {/* Resumo executivo */}
                        {aiAnalysis.resumo_executivo && (
                          <div className={`${t.cardInner} border rounded-lg p-4`}>
                            <p className={`text-sm ${t.text} leading-relaxed`}>{aiAnalysis.resumo_executivo}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          {/* Forças */}
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

                          {/* Riscos */}
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

                        {/* Oportunidades de mercado */}
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
                                  {op.segmentos_afetados?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {op.segmentos_afetados.map((s: string, j: number) => (
                                        <span key={j} className={`text-xs ${t.badge} rounded px-1.5 py-0.5`}>{s}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Temas emergentes */}
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

                        {/* Recomendações */}
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
                                    {rec.impacto_esperado && (
                                      <p className="text-xs text-emerald-400 mt-1">→ {rec.impacto_esperado}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Alertas */}
                        {aiAnalysis.alertas?.filter((a: string) => a).length > 0 && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <AlertTriangle size={12} /> Alertas
                            </h4>
                            <ul className="space-y-1">
                              {aiAnalysis.alertas.filter((a: string) => a).map((alerta: string, i: number) => (
                                <li key={i} className="text-sm text-red-300">{alerta}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Temas por sentimento */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className={cardCls}>
                    <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
                      <ThumbsUp size={16} className="text-emerald-500" /> O que os clientes elogiam
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {insightsData.promoterTexts?.filter((text: string) => text.length > 15).slice(0, 20).map((text: string, i: number) => (
                        <div key={i} className={`${t.cardInner} border rounded-lg px-3 py-2 text-sm ${t.textSub}`}>
                          "{text}"
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={cardCls}>
                    <h3 className={`text-sm font-semibold ${t.text} mb-4 flex items-center gap-2`}>
                      <ThumbsDown size={16} className="text-red-400" /> O que os clientes criticam
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {insightsData.detractorTexts?.filter((text: string) => text.length > 15).slice(0, 20).map((text: string, i: number) => (
                        <div key={i} className={`${t.cardInner} border rounded-lg px-3 py-2 text-sm ${t.textSub} border-red-500/20`}>
                          "{text}"
                        </div>
                      ))}
                      {(!insightsData.detractorTexts || insightsData.detractorTexts.filter((t: string) => t.length > 15).length === 0) && (
                        <div className={`text-center py-8 ${t.textMuted} text-sm`}>
                          <ThumbsUp size={24} className="text-emerald-500 mx-auto mb-2" />
                          Poucos comentários negativos na base — ótimo sinal!
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Temas por frequência e sentimento */}
                {insightsData.themes?.length > 0 && (
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
                          {insightsData.themes.slice(0, 20).map((theme: any, i: number) => (
                            <tr key={i} className={`${t.textSub} hover:${isDark ? 'bg-gray-800/30' : 'bg-slate-50'}`}>
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
            ) : (
              <div className={`text-center py-20 ${t.textMuted}`}>Carregando dados de mercado...</div>
            )}
          </div>
        )}

        {/* ── ANÁLISE POR CLIENTE ── */}
        {activeSection === 'clients' && (
          <div className="space-y-4">
            <h2 className={`text-base font-semibold ${t.text}`}>Análise Individual por Cliente</h2>
            <div className="space-y-3">
              {sortedTenants.map((tenant) => {
                const tid = tenant.tenantId;
                const isExpanded = expandedTenant === tid;
                const ai = tenantAI[tid];
                const isLoadingThis = isLoadingTenantAI === tid;

                return (
                  <div key={tid} className={`${t.card} border rounded-xl overflow-hidden`}>
                    {/* Header do tenant */}
                    <div
                      className={`flex items-center gap-4 p-4 cursor-pointer hover:${isDark ? 'bg-gray-800/30' : 'bg-slate-50'} transition-colors`}
                      onClick={() => setExpandedTenant(isExpanded ? null : tid)}
                    >
                      {/* Health score */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                        style={{ background: tenant.healthScore >= 70 ? '#10b981' : tenant.healthScore >= 40 ? '#f59e0b' : '#ef4444' }}>
                        {tenant.healthScore || 0}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold ${t.text} font-mono`}>{tid?.substring(0, 16)}…</div>
                        <div className={`text-xs ${t.textMuted} flex items-center gap-3 mt-0.5`}>
                          <span>{tenant.nps?.totalResponses || 0} respostas NPS</span>
                          <span>{tenant.leads?.total || 0} leads</span>
                          {tenant.lastActivity && <span>Ativo: {new Date(tenant.lastActivity).toLocaleDateString('pt-BR')}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-center">
                          <NpsGauge score={tenant.nps?.score} size="sm" />
                          <div className={`text-xs ${t.textMuted}`}>NPS</div>
                        </div>
                        <div className="text-center">
                          <TrendBadge trend={tenant.nps?.trend} />
                        </div>
                        <div className="text-center">
                          <span className="text-sm font-semibold text-purple-400">R$ {((tenant.leads?.pipelineValue || 0) / 1000).toFixed(1)}k</span>
                          <div className={`text-xs ${t.textMuted}`}>pipeline</div>
                        </div>
                        {isExpanded ? <ChevronUp size={16} className={t.textMuted} /> : <ChevronDown size={16} className={t.textMuted} />}
                      </div>
                    </div>

                    {/* Detalhes expandidos */}
                    {isExpanded && (
                      <div className={`border-t ${t.border} p-4 space-y-4`}>
                        {/* Métricas detalhadas */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'Promotores', value: tenant.nps?.promotores || 0, color: 'text-emerald-500' },
                            { label: 'Detratores', value: tenant.nps?.detratores || 0, color: 'text-red-400' },
                            { label: 'Leads Vendidos', value: tenant.leads?.vendido || 0, color: 'text-blue-500' },
                            { label: 'Diagnósticos MPD', value: tenant.diagnosticCount || 0, color: 'text-orange-500' },
                          ].map((item, i) => (
                            <div key={i} className={`${t.cardInner} border rounded-lg p-3 text-center`}>
                              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                              <div className={`text-xs ${t.textMuted}`}>{item.label}</div>
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
                            </div>
                          </div>
                        )}

                        {/* Último diagnóstico MPD */}
                        {tenant.lastDiagnostic && (
                          <div className={`${t.cardInner} border rounded-lg p-3`}>
                            <div className={`text-xs font-semibold ${t.label} uppercase tracking-wider mb-1`}>Último Diagnóstico MPD</div>
                            <div className="flex items-center gap-3">
                              <span className={`text-2xl font-bold ${tenant.lastDiagnostic.score >= 70 ? 'text-emerald-500' : tenant.lastDiagnostic.score >= 40 ? 'text-yellow-500' : 'text-red-400'}`}>
                                {tenant.lastDiagnostic.score}/100
                              </span>
                              <span className={`text-xs ${t.textMuted}`}>{new Date(tenant.lastDiagnostic.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                        )}

                        {/* Análise de IA do tenant */}
                        <div>
                          {!ai ? (
                            <button
                              onClick={() => generateTenantAI(tenant, tid)}
                              disabled={isLoadingThis}
                              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {isLoadingThis ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                              {isLoadingThis ? 'Analisando...' : 'Gerar Análise com IA'}
                            </button>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className={`text-xs font-semibold ${t.label} uppercase tracking-wider flex items-center gap-1.5`}>
                                  <Brain size={12} className="text-purple-400" /> Análise de IA
                                </div>
                                <button
                                  onClick={() => generateTenantAI(tenant, tid)}
                                  disabled={isLoadingThis}
                                  className={`text-xs ${t.textMuted} hover:${t.text} flex items-center gap-1`}
                                >
                                  <RefreshCw size={10} /> Regenerar
                                </button>
                              </div>

                              {ai.error ? (
                                <p className={`text-sm ${t.textSub}`}>{ai.raw}</p>
                              ) : (
                                <div className="space-y-3">
                                  {/* Saúde geral */}
                                  {ai.saude_geral && (
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs ${t.textMuted}`}>Saúde:</span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ai.saude_geral === 'ótima' ? 'bg-emerald-500/20 text-emerald-400' : ai.saude_geral === 'boa' ? 'bg-blue-500/20 text-blue-400' : ai.saude_geral === 'regular' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {ai.saude_geral.charAt(0).toUpperCase() + ai.saude_geral.slice(1)}
                                      </span>
                                    </div>
                                  )}

                                  {ai.resumo && (
                                    <p className={`text-sm ${t.textSub} leading-relaxed`}>{ai.resumo}</p>
                                  )}

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {ai.o_que_clientes_elogiam?.length > 0 && (
                                      <div>
                                        <div className={`text-xs font-semibold ${t.label} mb-1.5 flex items-center gap-1`}><ThumbsUp size={10} className="text-emerald-500" /> Elogios</div>
                                        <ul className="space-y-1">
                                          {ai.o_que_clientes_elogiam.slice(0, 3).map((e: string, i: number) => (
                                            <li key={i} className={`text-xs ${t.textSub} flex items-start gap-1.5`}><span className="text-emerald-500 mt-0.5">•</span>{e}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {ai.o_que_clientes_reclamam?.length > 0 && (
                                      <div>
                                        <div className={`text-xs font-semibold ${t.label} mb-1.5 flex items-center gap-1`}><ThumbsDown size={10} className="text-red-400" /> Críticas</div>
                                        <ul className="space-y-1">
                                          {ai.o_que_clientes_reclamam.slice(0, 3).map((r: string, i: number) => (
                                            <li key={i} className={`text-xs ${t.textSub} flex items-start gap-1.5`}><span className="text-red-400 mt-0.5">•</span>{r}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  {ai.oportunidades_para_cliente?.length > 0 && (
                                    <div>
                                      <div className={`text-xs font-semibold ${t.label} mb-2 flex items-center gap-1`}><Target size={10} className="text-teal-400" /> Oportunidades</div>
                                      <div className="space-y-2">
                                        {ai.oportunidades_para_cliente.slice(0, 2).map((op: any, i: number) => (
                                          <div key={i} className={`${t.cardInner} border rounded-lg p-3`}>
                                            <p className={`text-xs font-medium ${t.text}`}>{op.acao}</p>
                                            <p className={`text-xs ${t.textMuted} mt-0.5`}>{op.motivo}</p>
                                            {op.resultado_esperado && <p className="text-xs text-teal-400 mt-0.5">→ {op.resultado_esperado}</p>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {ai.script_abordagem && (
                                    <div className={`${isDark ? 'bg-purple-900/20 border-purple-700/30' : 'bg-purple-50 border-purple-200'} border rounded-lg p-3`}>
                                      <div className={`text-xs font-semibold mb-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>💬 Script de Abordagem CS</div>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
