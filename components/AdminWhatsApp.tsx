'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Wifi, WifiOff, RefreshCw, Send, CheckCircle, AlertTriangle,
  Smartphone, MessageSquare, Bell, FileText, Zap, Info, Copy, Check
} from 'lucide-react';

interface Props {
  isDark: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  state: string;
  phone: string | null;
  instanceName: string;
  apiUrl: string;
  error?: string;
}

export default function AdminWhatsApp({ isDark }: Props) {
  const t = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    input: isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400',
    label: isDark ? 'text-slate-300' : 'text-slate-600',
    divider: isDark ? 'border-slate-700' : 'border-slate-200',
    badge: isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600',
  };

  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp-status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, state: 'error', phone: null, instanceName: '', apiUrl: '', error: 'Erro ao verificar conexão' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const sendTest = async () => {
    if (!testPhone.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/whatsapp-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone })
      });
      const data = await res.json();
      setTestResult({
        ok: data.ok,
        message: data.ok ? 'Mensagem de teste enviada com sucesso!' : (data.error || 'Erro ao enviar mensagem')
      });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || 'Erro interno' });
    } finally {
      setTestLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stateLabel: Record<string, string> = {
    open: 'Conectado',
    close: 'Desconectado',
    connecting: 'Conectando...',
    unknown: 'Desconhecido',
    error: 'Erro'
  };

  return (
    <main className="w-full px-6 py-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-bold ${t.text}`}>WhatsApp — Evolution API</h2>
          <p className={`text-sm mt-0.5 ${t.textMuted}`}>Gerencie a conexão e envio de alertas e relatórios via WhatsApp</p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Status Card */}
      <div className={`rounded-xl border p-5 ${t.card}`}>
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare size={18} className="text-emerald-500" />
          <h3 className={`font-semibold ${t.text}`}>Status da Conexão</h3>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-4">
            <RefreshCw size={16} className="animate-spin text-emerald-500" />
            <span className={`text-sm ${t.textMuted}`}>Verificando conexão...</span>
          </div>
        ) : status ? (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                status.connected
                  ? 'bg-emerald-100 text-emerald-700'
                  : status.state === 'connecting'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {status.connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                {stateLabel[status.state] || status.state}
              </div>
              {status.phone && (
                <span className={`text-sm ${t.textMuted}`}>
                  <Smartphone size={13} className="inline mr-1" />
                  {status.phone}
                </span>
              )}
            </div>

            {/* Instance Details */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <div>
                <p className={`text-xs font-medium mb-1 ${t.textMuted}`}>Instância</p>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-mono ${t.text}`}>{status.instanceName || '—'}</p>
                </div>
              </div>
              <div>
                <p className={`text-xs font-medium mb-1 ${t.textMuted}`}>URL da API</p>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-mono truncate ${t.text}`}>{status.apiUrl || '—'}</p>
                  <button
                    onClick={() => copyToClipboard(status.apiUrl)}
                    className={`shrink-0 p-1 rounded hover:bg-slate-200 transition-colors ${t.textMuted}`}
                    title="Copiar URL"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {status.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{status.error}</p>
              </div>
            )}

            {!status.connected && !status.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <Info size={14} className="text-yellow-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Instância desconectada</p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    Acesse o painel da Evolution API e reconecte a instância escaneando o QR code.
                  </p>
                  <a
                    href="https://miraisaleshg-evolution-api.cixapq.easypanel.host/manager"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-yellow-700 hover:text-yellow-900 underline"
                  >
                    Abrir painel Evolution API →
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className={`text-sm ${t.textMuted}`}>Não foi possível obter o status.</p>
        )}
      </div>

      {/* Test Message */}
      <div className={`rounded-xl border p-5 ${t.card}`}>
        <div className="flex items-center gap-3 mb-4">
          <Send size={18} className="text-blue-500" />
          <h3 className={`font-semibold ${t.text}`}>Enviar Mensagem de Teste</h3>
        </div>
        <p className={`text-sm mb-4 ${t.textMuted}`}>
          Envie uma mensagem de teste para confirmar que a integração está funcionando corretamente.
        </p>
        <div className="flex gap-3">
          <input
            type="tel"
            value={testPhone}
            onChange={e => setTestPhone(e.target.value)}
            placeholder="Ex: 47999999999"
            className={`flex-1 px-3 py-2 rounded-lg border text-sm ${t.input}`}
          />
          <button
            onClick={sendTest}
            disabled={testLoading || !testPhone.trim() || !status?.connected}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {testLoading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            Enviar Teste
          </button>
        </div>
        {!status?.connected && (
          <p className={`text-xs mt-2 ${t.textMuted}`}>⚠️ Conecte a instância antes de enviar mensagens.</p>
        )}
        {testResult && (
          <div className={`flex items-center gap-2 mt-3 p-3 rounded-lg text-sm ${
            testResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {testResult.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Alertas e Relatórios */}
      <div className={`rounded-xl border p-5 ${t.card}`}>
        <div className="flex items-center gap-3 mb-4">
          <Bell size={18} className="text-orange-500" />
          <h3 className={`font-semibold ${t.text}`}>O que é enviado via WhatsApp?</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: <Bell size={15} className="text-orange-500" />, title: 'Alertas em tempo real', desc: 'Novo lead, lead de alto valor, venda fechada, detrator identificado, trial expirando' },
            { icon: <FileText size={15} className="text-blue-500" />, title: 'Relatórios automáticos', desc: 'Relatórios diários, semanais e mensais de KPIs enviados automaticamente para cada cliente' },
            { icon: <Zap size={15} className="text-purple-500" />, title: 'Disparo em massa', desc: 'Mensagens personalizadas enviadas para múltiplos contatos via módulo de Conteúdo' },
            { icon: <MessageSquare size={15} className="text-emerald-500" />, title: 'Relatório de cliente', desc: 'Relatório individual gerado e enviado manualmente pelo painel de Clientes' },
          ].map((item, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <div className="mt-0.5 shrink-0">{item.icon}</div>
              <div>
                <p className={`text-sm font-medium ${t.text}`}>{item.title}</p>
                <p className={`text-xs mt-0.5 ${t.textMuted}`}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuração Vercel */}
      <div className={`rounded-xl border p-5 ${t.card}`}>
        <div className="flex items-center gap-3 mb-4">
          <Info size={18} className="text-slate-400" />
          <h3 className={`font-semibold ${t.text}`}>Variáveis de Ambiente (Vercel)</h3>
        </div>
        <p className={`text-sm mb-4 ${t.textMuted}`}>
          Para que o envio funcione em produção, configure estas variáveis no painel do Vercel em <strong>Settings → Environment Variables</strong>:
        </p>
        <div className="space-y-2">
          {[
            { key: 'EVOLUTION_API_URL', value: 'https://miraisaleshg-evolution-api.cixapq.easypanel.host' },
            { key: 'EVOLUTION_API_KEY', value: '6168141684A1-4F9A-B8E6-35CFD24A3045' },
            { key: 'EVOLUTION_INSTANCE', value: 'Mirai Sales HG' },
          ].map(({ key, value }) => (
            <div key={key} className={`flex items-center justify-between gap-3 p-3 rounded-lg font-mono text-xs ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className={`font-semibold shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{key}</span>
                <span className={`truncate ${t.textMuted}`}>=</span>
                <span className={`truncate ${t.text}`}>{key === 'EVOLUTION_API_KEY' ? '••••••••••••••••' : value}</span>
              </div>
              <button
                onClick={() => copyToClipboard(value)}
                className={`shrink-0 p-1.5 rounded hover:bg-slate-200 transition-colors ${t.textMuted}`}
                title="Copiar valor"
              >
                <Copy size={12} />
              </button>
            </div>
          ))}
        </div>
        <p className={`text-xs mt-3 ${t.textMuted}`}>
          Após adicionar as variáveis, faça um novo deploy no Vercel para que as mudanças entrem em vigor.
        </p>
      </div>
    </main>
  );
}
