'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, TrendingUp, TrendingDown, MessageCircle, CheckCircle,
  Clock, Users, Star, ThumbsDown, Minus, Zap, RefreshCw, Loader2,
  Calendar, ChevronDown, ArrowUpRight, ArrowDownRight, Target,
  Activity, Award, AlertCircle
} from 'lucide-react';

interface Props {
  isDark: boolean;
  tenantId: string;
}

interface MetricsData {
  overview: {
    total_conversations: number;
    total_messages_sent: number;
    response_rate: number;
    conversion_rate: number;
    avg_response_time_hours: number;
    avg_messages_per_conversation: number;
  };
  by_flow: {
    flow_type: string;
    count: number;
    completed: number;
    replied: number;
    conversion_rate: number;
  }[];
  by_day: {
    date: string;
    count: number;
    completed: number;
  }[];
  top_performers: {
    flow_type: string;
    conversion_rate: number;
    total: number;
  }[];
  period_comparison: {
    current: number;
    previous: number;
    change_pct: number;
  };
}

const FLOW_LABELS: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  detractor: { label: 'Detratores', color: 'text-red-500', bg: 'bg-red-100', icon: ThumbsDown },
  promoter: { label: 'Promotores', color: 'text-emerald-500', bg: 'bg-emerald-100', icon: Star },
  passive: { label: 'Neutros', color: 'text-amber-500', bg: 'bg-amber-100', icon: Minus },
  pre_sale: { label: 'Pré-Venda', color: 'text-purple-500', bg: 'bg-purple-100', icon: TrendingUp },
};

const PERIOD_OPTIONS = [
  { label: 'Últimos 7 dias', value: '7d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Últimos 90 dias', value: '90d' },
  { label: 'Este mês', value: 'month' },
];

export default function ActionMetrics({ isDark, tenantId }: Props) {
  const t = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    input: isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-800',
    divider: isDark ? 'border-slate-700' : 'border-slate-200',
    highlight: isDark ? 'bg-slate-700' : 'bg-slate-100',
    hover: isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50',
  };

  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/action-metrics?tenantId=${tenantId}&period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, period]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const formatPct = (v: number) => `${Math.round(v)}%`;
  const formatNum = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

  const renderTrend = (change: number) => {
    if (change === 0) return null;
    const isPositive = change > 0;
    return (
      <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(change)}%
      </span>
    );
  };

  // Calcular max para barras
  const maxByDay = metrics?.by_day ? Math.max(...metrics.by_day.map((d) => d.count), 1) : 1;

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${t.bg}`}>
        <Loader2 className="animate-spin text-purple-500" size={28} />
      </div>
    );
  }

  const ov = metrics?.overview;

  return (
    <div className={`${t.bg} min-h-screen p-6`}>
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
            <BarChart2 size={20} className="text-purple-500" />
            Métricas de IA Comercial
          </h1>
          <p className={`text-sm ${t.textMuted} mt-0.5`}>
            Desempenho dos fluxos de conversa automatizados
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de período */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodMenu(!showPeriodMenu)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${t.card} ${t.text}`}
            >
              <Calendar size={14} className="text-purple-500" />
              {PERIOD_OPTIONS.find((p) => p.value === period)?.label}
              <ChevronDown size={13} className={t.textMuted} />
            </button>
            {showPeriodMenu && (
              <div className={`absolute right-0 top-full mt-1 rounded-xl border shadow-lg z-10 py-1 min-w-40 ${t.card}`}>
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setPeriod(opt.value); setShowPeriodMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm ${t.hover} ${
                      period === opt.value ? 'text-purple-500 font-medium' : t.text
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={fetchMetrics}
            className={`p-2 rounded-xl border ${t.card} ${t.textMuted}`}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ---- KPIs principais ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
          {
            label: 'Conversas',
            value: formatNum(ov?.total_conversations || 0),
            icon: MessageCircle,
            color: 'text-blue-500',
            bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50',
            change: metrics?.period_comparison?.change_pct || 0,
          },
          {
            label: 'Mensagens Enviadas',
            value: formatNum(ov?.total_messages_sent || 0),
            icon: Zap,
            color: 'text-purple-500',
            bg: isDark ? 'bg-purple-900/20' : 'bg-purple-50',
            change: 0,
          },
          {
            label: 'Taxa de Resposta',
            value: formatPct(ov?.response_rate || 0),
            icon: Activity,
            color: 'text-emerald-500',
            bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50',
            change: 0,
          },
          {
            label: 'Taxa de Conversão',
            value: formatPct(ov?.conversion_rate || 0),
            icon: Target,
            color: 'text-amber-500',
            bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50',
            change: 0,
          },
          {
            label: 'Tempo Médio de Resposta',
            value: `${(ov?.avg_response_time_hours || 0).toFixed(1)}h`,
            icon: Clock,
            color: 'text-rose-500',
            bg: isDark ? 'bg-rose-900/20' : 'bg-rose-50',
            change: 0,
          },
          {
            label: 'Msgs por Conversa',
            value: (ov?.avg_messages_per_conversation || 0).toFixed(1),
            icon: Users,
            color: 'text-indigo-500',
            bg: isDark ? 'bg-indigo-900/20' : 'bg-indigo-50',
            change: 0,
          },
        ].map(({ label, value, icon: Icon, color, bg, change }) => (
          <div key={label} className={`rounded-2xl border p-4 ${t.card}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
              <Icon size={16} className={color} />
            </div>
            <div className="flex items-end justify-between">
              <p className={`text-2xl font-bold ${t.text}`}>{value}</p>
              {renderTrend(change)}
            </div>
            <p className={`text-xs ${t.textMuted} mt-1 leading-tight`}>{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* ---- Desempenho por fluxo ---- */}
        <div className={`rounded-2xl border p-5 ${t.card}`}>
          <h2 className={`text-sm font-bold ${t.text} mb-4 flex items-center gap-2`}>
            <Award size={15} className="text-purple-500" />
            Desempenho por Fluxo
          </h2>

          {!metrics?.by_flow || metrics.by_flow.length === 0 ? (
            <div className={`text-center py-8 ${t.textMuted}`}>
              <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sem dados para o período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.by_flow.map((flow) => {
                const cfg = FLOW_LABELS[flow.flow_type] || FLOW_LABELS.passive;
                const Icon = cfg.icon;
                const convRate = flow.count > 0 ? Math.round((flow.completed / flow.count) * 100) : 0;
                const replyRate = flow.count > 0 ? Math.round((flow.replied / flow.count) * 100) : 0;

                return (
                  <div key={flow.flow_type} className={`rounded-xl p-3 ${t.highlight}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-600' : cfg.bg}`}>
                          <Icon size={13} className={cfg.color} />
                        </div>
                        <span className={`text-sm font-semibold ${t.text}`}>{cfg.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${t.text}`}>{flow.count}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className={`text-xs ${t.textMuted}`}>Responderam</span>
                          <span className={`text-xs font-medium ${t.text}`}>{replyRate}%</span>
                        </div>
                        <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                          <div
                            className="h-1.5 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${replyRate}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className={`text-xs ${t.textMuted}`}>Concluídos</span>
                          <span className={`text-xs font-medium ${t.text}`}>{convRate}%</span>
                        </div>
                        <div className={`h-1.5 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                          <div
                            className="h-1.5 rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${convRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---- Volume diário ---- */}
        <div className={`rounded-2xl border p-5 ${t.card}`}>
          <h2 className={`text-sm font-bold ${t.text} mb-4 flex items-center gap-2`}>
            <Activity size={15} className="text-purple-500" />
            Volume de Conversas
          </h2>

          {!metrics?.by_day || metrics.by_day.length === 0 ? (
            <div className={`text-center py-8 ${t.textMuted}`}>
              <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sem dados para o período</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Barras horizontais */}
              <div className="flex items-end gap-1 h-40">
                {metrics.by_day.slice(-30).map((day, i) => {
                  const heightPct = maxByDay > 0 ? (day.count / maxByDay) * 100 : 0;
                  const completedPct = day.count > 0 ? (day.completed / day.count) * 100 : 0;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative"
                      title={`${new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}: ${day.count} conversas, ${day.completed} concluídas`}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                      >
                        <div
                          className="w-full rounded-t-sm bg-purple-500 transition-all"
                          style={{ height: `${completedPct}%` }}
                        />
                      </div>
                      {/* Tooltip */}
                      <div className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-white'}`}>
                        {new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}: {day.count}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
                  <span className={`text-xs ${t.textMuted}`}>Total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-purple-500" />
                  <span className={`text-xs ${t.textMuted}`}>Concluídas</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- Insights automáticos ---- */}
      {metrics && ov && (
        <div className={`rounded-2xl border p-5 ${t.card}`}>
          <h2 className={`text-sm font-bold ${t.text} mb-4 flex items-center gap-2`}>
            <Zap size={15} className="text-amber-500" />
            Insights Automáticos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Insight 1: Taxa de resposta */}
            <div className={`rounded-xl p-3 ${
              ov.response_rate >= 50
                ? isDark ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'
                : isDark ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-start gap-2">
                {ov.response_rate >= 50
                  ? <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  : <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                }
                <div>
                  <p className={`text-xs font-semibold mb-0.5 ${ov.response_rate >= 50 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Taxa de resposta: {formatPct(ov.response_rate)}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {ov.response_rate >= 50
                      ? 'Boa taxa de engajamento. Continue monitorando.'
                      : 'Abaixo do ideal (50%). Revise os prompts dos fluxos com menor resposta.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Insight 2: Fluxo mais ativo */}
            {metrics.by_flow.length > 0 && (() => {
              const top = [...metrics.by_flow].sort((a, b) => b.count - a.count)[0];
              const cfg = FLOW_LABELS[top.flow_type] || FLOW_LABELS.passive;
              return (
                <div className={`rounded-xl p-3 ${isDark ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-start gap-2">
                    <Activity size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-blue-700 mb-0.5">
                        Fluxo mais ativo: {cfg.label}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {top.count} conversas iniciadas no período. Representa {Math.round((top.count / ov.total_conversations) * 100)}% do total.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Insight 3: Tempo de resposta */}
            <div className={`rounded-xl p-3 ${
              ov.avg_response_time_hours <= 2
                ? isDark ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-emerald-50 border border-emerald-200'
                : isDark ? 'bg-rose-900/20 border border-rose-800/30' : 'bg-rose-50 border border-rose-200'
            }`}>
              <div className="flex items-start gap-2">
                <Clock size={14} className={`mt-0.5 flex-shrink-0 ${ov.avg_response_time_hours <= 2 ? 'text-emerald-500' : 'text-rose-500'}`} />
                <div>
                  <p className={`text-xs font-semibold mb-0.5 ${ov.avg_response_time_hours <= 2 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Tempo médio: {ov.avg_response_time_hours.toFixed(1)}h
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {ov.avg_response_time_hours <= 2
                      ? 'Excelente! Respostas rápidas aumentam a taxa de engajamento.'
                      : 'Acima de 2h. Considere ativar o modo Autopiloto para respostas imediatas.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
