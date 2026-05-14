"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Database, MessageSquare, Zap, Globe, Clock, Server,
  TrendingUp, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";

interface Props {
  isDark: boolean;
  tenantId: string;
}

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down" | "unknown";
  latency?: number;
  lastChecked: string;
  details?: string;
  uptime?: number;
}

interface SystemStats {
  totalConversations: number;
  activeConversations: number;
  pendingDispatches: number;
  messagesLast24h: number;
  failedMessages: number;
  optOutsTotal: number;
  lastCronRun?: string;
  lastWebhookReceived?: string;
}

const STATUS_CONFIG = {
  operational: {
    label: "Operacional",
    icon: CheckCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    darkBg: "bg-emerald-900/20",
    darkBorder: "border-emerald-800",
  },
  degraded: {
    label: "Degradado",
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    darkBg: "bg-amber-900/20",
    darkBorder: "border-amber-800",
  },
  down: {
    label: "Fora do Ar",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
    darkBg: "bg-red-900/20",
    darkBorder: "border-red-800",
  },
  unknown: {
    label: "Desconhecido",
    icon: Minus,
    color: "text-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
    dot: "bg-slate-400",
    darkBg: "bg-slate-700",
    darkBorder: "border-slate-600",
  },
};

const SERVICE_ICONS: Record<string, any> = {
  Supabase: Database,
  WhatsApp: MessageSquare,
  Inngest: Zap,
  "API Next.js": Server,
  Resend: Globe,
};

export default function SystemHealth({ isDark, tenantId }: Props) {
  const t = {
    card: isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
    text: isDark ? "text-slate-100" : "text-slate-800",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
    divider: isDark ? "border-slate-700" : "border-slate-200",
    highlight: isDark ? "bg-slate-700/50" : "bg-slate-50",
  };

  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/system-health?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
        setStats(data.stats || null);
        setLastRefresh(new Date());
      }
    } catch {}
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) fetchHealth();
  }, [tenantId, fetchHealth]);

  // Auto-refresh a cada 60 segundos
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  const overallStatus = services.length === 0
    ? "unknown"
    : services.some((s) => s.status === "down")
    ? "down"
    : services.some((s) => s.status === "degraded")
    ? "degraded"
    : "operational";

  const overallConfig = STATUS_CONFIG[overallStatus];
  const OverallIcon = overallConfig.icon;

  const formatTime = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatLatency = (ms?: number) => {
    if (ms === undefined) return "—";
    if (ms < 200) return <span className="text-emerald-500">{ms}ms</span>;
    if (ms < 800) return <span className="text-amber-500">{ms}ms</span>;
    return <span className="text-red-500">{ms}ms</span>;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
            <Activity size={20} className="text-purple-500" />
            Saúde do Sistema
          </h1>
          <p className={`text-sm ${t.textMuted} mt-0.5`}>
            Monitoramento em tempo real dos serviços integrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              autoRefresh
                ? "bg-purple-50 border-purple-200 text-purple-600"
                : `${t.card} ${t.textMuted}`
            }`}
          >
            <Clock size={11} />
            {autoRefresh ? "Auto (60s)" : "Manual"}
          </button>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border ${t.card} ${t.textMuted} hover:text-purple-500 transition-colors`}
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Status geral */}
      <div className={`rounded-xl border-2 p-5 flex items-center gap-4 ${
        isDark ? `${overallConfig.darkBg} ${overallConfig.darkBorder}` : `${overallConfig.bg} ${overallConfig.border}`
      }`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isDark ? overallConfig.darkBg : overallConfig.bg
        }`}>
          <OverallIcon size={24} className={overallConfig.color} />
        </div>
        <div className="flex-1">
          <p className={`text-lg font-bold ${t.text}`}>
            {overallStatus === "operational"
              ? "Todos os sistemas operacionais"
              : overallStatus === "degraded"
              ? "Alguns sistemas com degradação"
              : overallStatus === "down"
              ? "Serviço(s) fora do ar"
              : "Status desconhecido"}
          </p>
          <p className={`text-sm ${t.textMuted}`}>
            Última verificação: {formatTime(lastRefresh.toISOString())}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${overallConfig.dot} ${
            overallStatus === "operational" ? "animate-pulse" : ""
          }`} />
          <span className={`text-sm font-semibold ${overallConfig.color}`}>
            {overallConfig.label}
          </span>
        </div>
      </div>

      {/* Grid de serviços */}
      <div className="grid grid-cols-2 gap-4">
        {services.map((service) => {
          const sc = STATUS_CONFIG[service.status];
          const StatusIcon = sc.icon;
          const ServiceIcon = SERVICE_ICONS[service.name] || Server;

          return (
            <div
              key={service.name}
              className={`rounded-xl border ${t.card} p-4`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isDark ? "bg-slate-700" : "bg-slate-100"
                  }`}>
                    <ServiceIcon size={16} className={t.textMuted} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${t.text}`}>{service.name}</p>
                    {service.latency !== undefined && (
                      <p className="text-xs">{formatLatency(service.latency)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
                  <StatusIcon size={13} className={sc.color} />
                  <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
                </div>
              </div>

              {service.details && (
                <p className={`text-xs ${t.textMuted} mb-2`}>{service.details}</p>
              )}

              <div className="flex items-center justify-between">
                {service.uptime !== undefined && (
                  <div className="flex-1 mr-3">
                    <div className={`h-1 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"} overflow-hidden`}>
                      <div
                        className={`h-full rounded-full ${
                          service.uptime >= 99 ? "bg-emerald-500" :
                          service.uptime >= 95 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${service.uptime}%` }}
                      />
                    </div>
                    <p className={`text-xs ${t.textMuted} mt-0.5`}>
                      {service.uptime.toFixed(1)}% uptime
                    </p>
                  </div>
                )}
                <p className={`text-xs ${t.textMuted} text-right`}>
                  {formatTime(service.lastChecked)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estatísticas do sistema */}
      {stats && (
        <div className={`rounded-xl border ${t.card} overflow-hidden`}>
          <div className={`px-5 py-3 border-b ${t.divider} ${t.highlight}`}>
            <h2 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
              <TrendingUp size={14} className="text-purple-500" />
              Estatísticas Operacionais
            </h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-y md:divide-y-0" style={{ borderColor: isDark ? "#334155" : "#e2e8f0" }}>
            {[
              { label: "Conversas Ativas", value: stats.activeConversations, sub: `${stats.totalConversations} total`, icon: MessageSquare, color: "text-purple-500" },
              { label: "Disparos Pendentes", value: stats.pendingDispatches, sub: "aguardando cron", icon: Clock, color: "text-amber-500" },
              { label: "Msgs (24h)", value: stats.messagesLast24h, sub: `${stats.failedMessages} falhas`, icon: ArrowUpRight, color: "text-blue-500" },
              { label: "Opt-Outs Total", value: stats.optOutsTotal, sub: "na lista", icon: ArrowDownRight, color: "text-red-500" },
              { label: "Último Cron", value: formatTime(stats.lastCronRun), sub: "dispatch-cron", icon: Zap, color: "text-emerald-500" },
              { label: "Último Webhook", value: formatTime(stats.lastWebhookReceived), sub: "WhatsApp inbound", icon: Globe, color: "text-slate-500" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className={item.color} />
                    <p className={`text-xs ${t.textMuted}`}>{item.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${t.text}`}>{item.value}</p>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>{item.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className={`rounded-xl border ${t.card} p-4`}>
        <p className={`text-xs font-semibold ${t.textMuted} mb-3`}>Legenda de Status</p>
        <div className="flex flex-wrap gap-4">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <Icon size={12} className={cfg.color} />
                <span className={`text-xs ${t.textMuted}`}>{cfg.label}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 ml-auto">
            <Clock size={11} className={t.textMuted} />
            <span className={`text-xs ${t.textMuted}`}>
              Atualizado: {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
