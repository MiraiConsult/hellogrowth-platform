"use client";

import { useState, useEffect } from "react";
import {
  Bell, BellOff, Mail, MessageSquare, Save, CheckCircle,
  AlertTriangle, Zap, BarChart3, UserX, Phone, Clock,
  RefreshCw, Eye, EyeOff, Info
} from "lucide-react";

interface Props {
  isDark: boolean;
  tenantId: string;
}

interface NotificationConfig {
  // Escalada
  escalation_enabled: boolean;
  escalation_whatsapp_phone: string;
  escalation_email: string;

  // Relatório semanal
  weekly_report_enabled: boolean;
  weekly_report_email: string;
  weekly_report_day: number;
  weekly_report_hour: number;

  // Opt-out
  optout_notify_enabled: boolean;
  optout_notify_email: string;

  // Nova conversa
  new_conversation_notify: boolean;
  new_conversation_email: string;

  // Geral
  business_name: string;
  timezone: string;
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Bahia",
  "America/Cuiaba",
  "America/Porto_Velho",
  "America/Rio_Branco",
];

const defaultConfig: NotificationConfig = {
  escalation_enabled: true,
  escalation_whatsapp_phone: "",
  escalation_email: "",
  weekly_report_enabled: false,
  weekly_report_email: "",
  weekly_report_day: 1,
  weekly_report_hour: 8,
  optout_notify_enabled: false,
  optout_notify_email: "",
  new_conversation_notify: false,
  new_conversation_email: "",
  business_name: "",
  timezone: "America/Sao_Paulo",
};

export default function NotificationSettings({ isDark, tenantId }: Props) {
  const t = {
    card: isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200",
    text: isDark ? "text-slate-100" : "text-slate-800",
    textMuted: isDark ? "text-slate-400" : "text-slate-500",
    input: isDark
      ? "bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400"
      : "bg-white border-slate-300 text-slate-800 placeholder-slate-400",
    divider: isDark ? "border-slate-700" : "border-slate-200",
    highlight: isDark ? "bg-slate-700" : "bg-slate-50",
    label: isDark ? "text-slate-300" : "text-slate-600",
  };

  const [config, setConfig] = useState<NotificationConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingEscalation, setTestingEscalation] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/notification-settings?tenantId=${tenantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setConfig({ ...defaultConfig, ...data });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/notification-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...config }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {}
    setSaving(false);
  };

  const handleTestEscalation = async () => {
    setTestingEscalation(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/escalation-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          conversationId: "test",
          contactName: "Contato de Teste",
          contactPhone: "+5511999999999",
          flowType: "detractor",
          lastMessage: "Esta é uma mensagem de teste do sistema de notificações.",
          isTest: true,
        }),
      });
      const data = await res.json();
      setTestResult({
        ok: res.ok,
        message: res.ok
          ? "Notificação de teste enviada com sucesso!"
          : data.error || "Erro ao enviar notificação de teste.",
      });
    } catch {
      setTestResult({ ok: false, message: "Erro de conexão ao testar notificação." });
    }
    setTestingEscalation(false);
    setTimeout(() => setTestResult(null), 5000);
  };

  const update = (key: keyof NotificationConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin text-purple-500" />
        <span className={`ml-2 text-sm ${t.textMuted}`}>Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
            <Bell size={20} className="text-purple-500" />
            Configurações de Notificações
          </h1>
          <p className={`text-sm ${t.textMuted} mt-0.5`}>
            Configure alertas e relatórios automáticos para o seu negócio
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            saved
              ? "bg-emerald-500 text-white"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          {saved ? (
            <><CheckCircle size={14} /> Salvo!</>
          ) : saving ? (
            <><RefreshCw size={14} className="animate-spin" /> Salvando...</>
          ) : (
            <><Save size={14} /> Salvar</>
          )}
        </button>
      </div>

      {/* Informações gerais */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.divider} flex items-center gap-2`}>
          <Info size={14} className="text-slate-400" />
          <h2 className={`text-sm font-semibold ${t.text}`}>Informações Gerais</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className={`text-xs font-medium ${t.label} block mb-1`}>Nome do Negócio</label>
            <input
              type="text"
              value={config.business_name}
              onChange={(e) => update("business_name", e.target.value)}
              placeholder="Ex: Clínica Saúde Total"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
          </div>
          <div>
            <label className={`text-xs font-medium ${t.label} block mb-1`}>Fuso Horário</label>
            <select
              value={config.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500`}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace("America/", "")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notificações de Escalada */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.divider} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            <h2 className={`text-sm font-semibold ${t.text}`}>Alertas de Escalada</h2>
            <span className={`text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full`}>
              Recomendado
            </span>
          </div>
          <button
            onClick={() => update("escalation_enabled", !config.escalation_enabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              config.escalation_enabled ? "bg-red-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                config.escalation_enabled ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {config.escalation_enabled && (
          <div className="p-5 space-y-4">
            <p className={`text-xs ${t.textMuted}`}>
              Receba uma notificação imediata quando um cliente pedir para falar com um humano ou a IA não conseguir resolver.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-medium ${t.label} block mb-1 flex items-center gap-1`}>
                  <MessageSquare size={11} /> WhatsApp para Alertas
                </label>
                <input
                  type="tel"
                  value={config.escalation_whatsapp_phone}
                  onChange={(e) => update("escalation_whatsapp_phone", e.target.value)}
                  placeholder="+5511999999999"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-red-400`}
                />
              </div>
              <div>
                <label className={`text-xs font-medium ${t.label} block mb-1 flex items-center gap-1`}>
                  <Mail size={11} /> Email para Alertas
                </label>
                <input
                  type="email"
                  value={config.escalation_email}
                  onChange={(e) => update("escalation_email", e.target.value)}
                  placeholder="responsavel@empresa.com"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-red-400`}
                />
              </div>
            </div>

            {/* Botão de teste */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestEscalation}
                disabled={testingEscalation || (!config.escalation_whatsapp_phone && !config.escalation_email)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  testingEscalation
                    ? "opacity-50 cursor-not-allowed"
                    : "border-red-300 text-red-600 hover:bg-red-50"
                }`}
              >
                {testingEscalation ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Zap size={11} />
                )}
                Enviar notificação de teste
              </button>
              {testResult && (
                <span className={`text-xs font-medium ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>
                  {testResult.ok ? "✓" : "✗"} {testResult.message}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Relatório Semanal */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.divider} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-blue-500" />
            <h2 className={`text-sm font-semibold ${t.text}`}>Relatório Semanal Automático</h2>
          </div>
          <button
            onClick={() => update("weekly_report_enabled", !config.weekly_report_enabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              config.weekly_report_enabled ? "bg-blue-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                config.weekly_report_enabled ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {config.weekly_report_enabled && (
          <div className="p-5 space-y-4">
            <p className={`text-xs ${t.textMuted}`}>
              Receba um resumo semanal com métricas de conversas, taxa de resposta, conversões e opt-outs.
            </p>
            <div>
              <label className={`text-xs font-medium ${t.label} block mb-1 flex items-center gap-1`}>
                <Mail size={11} /> Email para Relatório
              </label>
              <input
                type="email"
                value={config.weekly_report_email}
                onChange={(e) => update("weekly_report_email", e.target.value)}
                placeholder="gestor@empresa.com"
                className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-400`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-medium ${t.label} block mb-1 flex items-center gap-1`}>
                  <Clock size={11} /> Dia de Envio
                </label>
                <select
                  value={config.weekly_report_day}
                  onChange={(e) => update("weekly_report_day", parseInt(e.target.value))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-400`}
                >
                  {DAYS.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`text-xs font-medium ${t.label} block mb-1 flex items-center gap-1`}>
                  <Clock size={11} /> Horário de Envio
                </label>
                <select
                  value={config.weekly_report_hour}
                  onChange={(e) => update("weekly_report_hour", parseInt(e.target.value))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-400`}
                >
                  {HOURS.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={`flex items-start gap-2 p-3 rounded-lg ${t.highlight} border ${t.divider}`}>
              <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className={`text-xs ${t.textMuted}`}>
                O relatório será enviado toda{" "}
                <strong>{DAYS[config.weekly_report_day]}</strong> às{" "}
                <strong>{HOURS[config.weekly_report_hour]}</strong> no fuso{" "}
                <strong>{config.timezone.replace("America/", "")}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notificações de Opt-Out */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.divider} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <UserX size={14} className="text-amber-500" />
            <h2 className={`text-sm font-semibold ${t.text}`}>Alertas de Opt-Out</h2>
          </div>
          <button
            onClick={() => update("optout_notify_enabled", !config.optout_notify_enabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              config.optout_notify_enabled ? "bg-amber-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                config.optout_notify_enabled ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {config.optout_notify_enabled && (
          <div className="p-5">
            <p className={`text-xs ${t.textMuted} mb-3`}>
              Receba um email quando um cliente solicitar opt-out (descadastro das mensagens automáticas).
            </p>
            <div>
              <label className={`text-xs font-medium ${t.label} block mb-1 flex items-center gap-1`}>
                <Mail size={11} /> Email para Alertas de Opt-Out
              </label>
              <input
                type="email"
                value={config.optout_notify_email}
                onChange={(e) => update("optout_notify_email", e.target.value)}
                placeholder="lgpd@empresa.com"
                className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-amber-400`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Novas Conversas */}
      <div className={`rounded-xl border ${t.card} overflow-hidden`}>
        <div className={`px-5 py-3 border-b ${t.divider} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-emerald-500" />
            <h2 className={`text-sm font-semibold ${t.text}`}>Alertas de Nova Conversa</h2>
          </div>
          <button
            onClick={() => update("new_conversation_notify", !config.new_conversation_notify)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              config.new_conversation_notify ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                config.new_conversation_notify ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {config.new_conversation_notify && (
          <div className="p-5">
            <p className={`text-xs ${t.textMuted} mb-3`}>
              Receba um email quando a IA iniciar uma nova conversa com um cliente.
            </p>
            <div>
              <label className={`text-xs font-medium ${t.label} block mb-1 flex items-center gap-1`}>
                <Mail size={11} /> Email para Novas Conversas
              </label>
              <input
                type="email"
                value={config.new_conversation_email}
                onChange={(e) => update("new_conversation_email", e.target.value)}
                placeholder="equipe@empresa.com"
                className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-emerald-400`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Botão salvar final */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            saved
              ? "bg-emerald-500 text-white"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          {saved ? (
            <><CheckCircle size={15} /> Configurações salvas!</>
          ) : saving ? (
            <><RefreshCw size={15} className="animate-spin" /> Salvando...</>
          ) : (
            <><Save size={15} /> Salvar Configurações</>
          )}
        </button>
      </div>
    </div>
  );
}
