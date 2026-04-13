'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Save, CheckCircle, AlertTriangle, Loader2, Send, Info, Eye, EyeOff
} from 'lucide-react';

interface Props {
  isDark: boolean;
}

export default function AdminEmail({ isDark }: Props) {
  const t = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    input: isDark
      ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400'
      : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400',
    label: isDark ? 'text-slate-300' : 'text-slate-600',
    divider: isDark ? 'border-slate-700' : 'border-slate-200',
  };

  const [fromEmail, setFromEmail] = useState('analise@hellogrowth.com.br');
  const [fromName, setFromName] = useState('HelloGrowth — Análise de Lead');
  const [testEmail, setTestEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carregar configurações salvas (via env vars exibidas como readonly)
  useEffect(() => {
    // Os valores reais vêm das variáveis de ambiente ANALYSIS_EMAIL_FROM e ANALYSIS_EMAIL_FROM_NAME
    // Aqui mostramos os defaults para referência
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // As variáveis de ambiente precisam ser configuradas no Vercel
      // Este botão serve como guia para o administrador
      await new Promise(r => setTimeout(r, 800));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) {
      setTestResult({ ok: false, message: 'Informe um e-mail para teste.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/send-analysis-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [testEmail.trim()],
          leadName: 'João Silva (Teste)',
          leadEmail: 'joao@exemplo.com',
          leadPhone: '(47) 99999-8888',
          formName: 'Anamnese Inicial',
          companyName: 'Clínica Exemplo',
          answers: {
            q1: { value: 'Implante dentário' },
            q2: { value: 'Sim, tenho urgência' },
            q3: { value: 'Até R$ 5.000' },
          },
          questions: [
            { id: 'q1', text: 'Qual tratamento você busca?' },
            { id: 'q2', text: 'Tem urgência no atendimento?' },
            { id: 'q3', text: 'Qual seu orçamento disponível?' },
          ],
          aiAnalysis: {
            reasoning: 'Cliente demonstra interesse claro em implante dentário com orçamento definido e urgência. Alta probabilidade de conversão.',
            client_insights: [
              'Interesse específico em implante dentário',
              'Orçamento de até R$ 5.000 — compatível com implante unitário',
              'Demonstra urgência — contato imediato recomendado',
            ],
            recommended_products: [
              { name: 'Implante Dentário Unitário', reason: 'Atende diretamente à necessidade do cliente dentro do orçamento informado' },
              { name: 'Consulta de Avaliação', reason: 'Primeiro passo para qualificar e fechar o tratamento' },
            ],
            sales_script: 'Olá João! Vi que você tem interesse em implante dentário e orçamento disponível. Temos uma promoção especial este mês para implante unitário que se encaixa perfeitamente no seu orçamento. Podemos agendar uma avaliação gratuita esta semana?',
            next_steps: [
              'Ligar em até 2 horas — cliente demonstrou urgência',
              'Oferecer avaliação gratuita como primeiro passo',
              'Apresentar opções de parcelamento se necessário',
            ],
            classification: 'opportunity',
            confidence: 0.88,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.sent) {
        setTestResult({ ok: false, message: data.error || 'Erro ao enviar e-mail de teste.' });
      } else {
        setTestResult({ ok: true, message: `E-mail de teste enviado com sucesso para ${testEmail}!` });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || 'Erro interno.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="w-full px-6 py-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 rounded-xl">
          <Mail className="text-blue-600" size={22} />
        </div>
        <div>
          <h2 className={`text-xl font-bold ${t.text}`}>E-mail — Análise de Leads</h2>
          <p className={`text-sm mt-0.5 ${t.textMuted}`}>Configure o remetente dos e-mails de análise de IA enviados automaticamente</p>
        </div>
      </div>

      {/* Como funciona */}
      <div className={`border rounded-xl p-5 ${isDark ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`text-sm font-semibold ${isDark ? 'text-blue-300' : 'text-blue-800'} mb-1`}>Como funciona</p>
            <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              Quando um cliente preenche um formulário e a IA gera a análise, um e-mail é enviado automaticamente
              para os destinatários configurados em cada formulário. O e-mail contém as respostas, produtos sugeridos
              e o script de vendas gerado pela IA.
            </p>
          </div>
        </div>
      </div>

      {/* Configuração do Remetente */}
      <div className={`border rounded-xl p-6 ${t.card} space-y-5`}>
        <h3 className={`text-sm font-semibold ${t.text} uppercase tracking-wide`}>Configuração do Remetente</h3>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${t.label} mb-1.5`}>
              E-mail Remetente
            </label>
            <input
              type="email"
              value={fromEmail}
              onChange={e => setFromEmail(e.target.value)}
              placeholder="analise@hellogrowth.com.br"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${t.input}`}
            />
            <p className={`text-xs mt-1 ${t.textMuted}`}>
              Configure a variável <code className="bg-gray-100 text-gray-700 px-1 rounded">ANALYSIS_EMAIL_FROM</code> no Vercel com este valor.
            </p>
          </div>

          <div>
            <label className={`block text-sm font-medium ${t.label} mb-1.5`}>
              Nome do Remetente
            </label>
            <input
              type="text"
              value={fromName}
              onChange={e => setFromName(e.target.value)}
              placeholder="HelloGrowth — Análise de Lead"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${t.input}`}
            />
            <p className={`text-xs mt-1 ${t.textMuted}`}>
              Configure a variável <code className="bg-gray-100 text-gray-700 px-1 rounded">ANALYSIS_EMAIL_FROM_NAME</code> no Vercel com este valor.
            </p>
          </div>
        </div>

        {/* Instruções Vercel */}
        <div className={`rounded-lg p-4 border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs font-semibold ${t.text} mb-2`}>📋 Como configurar no Vercel</p>
          <ol className={`text-xs ${t.textMuted} space-y-1 list-decimal list-inside`}>
            <li>Acesse o painel do Vercel → seu projeto → <strong>Settings → Environment Variables</strong></li>
            <li>Adicione <code className="bg-gray-200 text-gray-700 px-1 rounded">ANALYSIS_EMAIL_FROM</code> com o e-mail remetente</li>
            <li>Adicione <code className="bg-gray-200 text-gray-700 px-1 rounded">ANALYSIS_EMAIL_FROM_NAME</code> com o nome do remetente</li>
            <li>Certifique-se que <code className="bg-gray-200 text-gray-700 px-1 rounded">RESEND_API_KEY</code> já está configurada</li>
            <li>Faça um novo deploy para aplicar as variáveis</li>
          </ol>
        </div>
      </div>

      {/* Teste de Envio */}
      <div className={`border rounded-xl p-6 ${t.card} space-y-4`}>
        <h3 className={`text-sm font-semibold ${t.text} uppercase tracking-wide`}>Testar Envio</h3>
        <p className={`text-sm ${t.textMuted}`}>
          Envie um e-mail de exemplo com dados fictícios para verificar se o envio está funcionando corretamente.
        </p>

        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleTest(); }}
            placeholder="seu@email.com"
            className={`flex-1 border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${t.input}`}
          />
          <button
            onClick={handleTest}
            disabled={testing || !testEmail.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {testing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {testing ? 'Enviando...' : 'Enviar Teste'}
          </button>
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 rounded-lg p-3 ${testResult.ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            {testResult.ok
              ? <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
              : <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />}
            <p className={`text-sm ${testResult.ok ? 'text-emerald-700' : 'text-red-700'}`}>{testResult.message}</p>
          </div>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </main>
  );
}
