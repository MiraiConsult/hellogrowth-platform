'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone, CheckCircle, AlertCircle, Loader2,
  MessageSquare, Shield, Zap, RefreshCw, Info,
  Star, Lock, Save, Bot, Target,
  ShoppingCart, Meh, ThumbsDown, AlertTriangle,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight
} from 'lucide-react';

interface Props {
  isDark: boolean;
  tenantId: string;
  companyName: string;
}

interface WhatsAppConnection {
  id: string;
  display_name: string;
  phone_number: string;
  quality_rating: string;
  status: string;
  ai_persona_name: string;
  ai_persona_tone: string;
  connected_at: string;
}

interface AIPersona {
  name: string;
  role: string;
  tone: string;
  personality: string;
  custom_instructions: string;
}

interface FlowPlaybook {
  operation_mode: 'auto' | 'hybrid' | 'inputs_only' | 'manual';
  objective: string;
  escalate_on_unknown: boolean;
  escalate_after_turns: number;
  escalate_on_human_request: boolean;
  custom_objective_prompt: string;
}

interface Playbooks {
  pre_sale: FlowPlaybook;
  promoter: FlowPlaybook;
  passive: FlowPlaybook;
  detractor: FlowPlaybook;
}

const TONE_OPTIONS = [
  { value: 'friendly_professional', label: 'Amigável e profissional', desc: 'Equilibra proximidade com seriedade. Ideal para clínicas e consultórios.' },
  { value: 'warm_empathetic', label: 'Empático e acolhedor', desc: 'Tom carinhoso e compreensivo. Ideal para saúde, bem-estar e estética.' },
  { value: 'casual_close', label: 'Descontraído e próximo', desc: 'Informal e divertido. Ideal para negócios jovens e criativos.' },
  { value: 'formal_respectful', label: 'Formal e respeitoso', desc: 'Linguagem polida e distante. Ideal para advocacia e finanças.' },
  { value: 'direct_objective', label: 'Direto e objetivo', desc: 'Mensagens curtas e práticas. Ideal para serviços técnicos.' },
];

const PERSONALITY_OPTIONS = [
  { value: 'consultive', label: 'Consultiva', desc: 'Faz perguntas, entende necessidades, sugere soluções personalizadas' },
  { value: 'proactive', label: 'Proativa', desc: 'Toma iniciativa, sugere horários, antecipa dúvidas do cliente' },
  { value: 'supportive', label: 'Acolhedora', desc: 'Ouve com atenção, valida sentimentos, oferece suporte emocional' },
  { value: 'persuasive', label: 'Persuasiva', desc: 'Destaca benefícios, cria urgência sutil, guia para a conversão' },
  { value: 'informative', label: 'Informativa', desc: 'Explica procedimentos, tira dúvidas técnicas, educa o cliente' },
];

const OPERATION_MODES = [
  { value: 'auto', label: '100% Automático', desc: 'IA responde sem aprovação', icon: '⚡' },
  { value: 'hybrid', label: 'Híbrido', desc: 'IA gera, humano aprova antes de enviar', icon: '🤝' },
  { value: 'inputs_only', label: 'Só sugestões', desc: 'IA sugere, humano digita e envia', icon: '💡' },
  { value: 'manual', label: 'Manual', desc: 'IA desativada, só atendimento humano', icon: '👤' },
];

const FLOW_OBJECTIVES: Record<string, Array<{ value: string; label: string; desc: string }>> = {
  pre_sale: [
    { value: 'aggressive_sales', label: 'Agressiva comercialmente', desc: 'Cria urgência, empurra para fechamento, não aceita "vou pensar"' },
    { value: 'consultive', label: 'Consultiva e paciente', desc: 'Faz perguntas, entende necessidade, constrói confiança antes de vender' },
    { value: 'empathetic', label: 'Empática', desc: 'Valida sentimentos, demonstra compreensão antes de apresentar soluções' },
    { value: 'balanced', label: 'Meio-termo', desc: 'Equilibrada, apresenta opções e deixa o cliente decidir no ritmo dele' },
    { value: 'non_insistent', label: 'Não insistente', desc: 'Apresenta uma vez, respeita o espaço do cliente, não força' },
  ],
  promoter: [
    { value: 'request_referral_reward', label: 'Solicitar indicação + prêmio', desc: 'Pede indicações oferecendo premiação cadastrada' },
    { value: 'request_referral_only', label: 'Só solicitar indicação', desc: 'Pede indicações sem oferecer prêmio' },
    { value: 'invite_return', label: 'Convidar para retornar', desc: 'Convida o cliente para uma nova visita' },
    { value: 'google_review', label: 'Pedir avaliação no Google', desc: 'Solicita avaliação 5 estrelas no Google' },
  ],
  passive: [
    { value: 'understand_and_reconquer', label: 'Entender e reconquistar', desc: 'Pergunta o que pode melhorar e tenta reconquistar' },
    { value: 'invite_back', label: 'Convidar de volta', desc: 'Convida o cliente para retornar com oferta especial' },
    { value: 'apologize', label: 'Pedir desculpas', desc: 'Reconhece possível falha e pede desculpas genuinamente' },
  ],
  detractor: [
    { value: 'understand_problem', label: 'Entender o problema', desc: 'Ouve com empatia, registra o problema sem defender a empresa' },
    { value: 'escalate_to_human', label: 'Assumir como humano', desc: 'Transfere imediatamente para atendimento humano' },
    { value: 'apologize_and_solve', label: 'Pedir desculpas + solução', desc: 'Reconhece o problema, pede desculpas e propõe compensação' },
  ],
};

const FLOW_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  pre_sale: { label: 'Pré-Venda', icon: ShoppingCart, color: 'purple', desc: 'Leads que preencheram o formulário de interesse' },
  promoter: { label: 'Promotores (NPS 9-10)', icon: Star, color: 'green', desc: 'Clientes satisfeitos que podem indicar' },
  passive: { label: 'Neutros (NPS 7-8)', icon: Meh, color: 'yellow', desc: 'Clientes neutros que podem ser reconquistados' },
  detractor: { label: 'Detratores (NPS 0-6)', icon: ThumbsDown, color: 'red', desc: 'Clientes insatisfeitos que precisam de atenção' },
};

const DEFAULT_PLAYBOOKS: Playbooks = {
  pre_sale: { operation_mode: 'auto', objective: 'consultive', escalate_on_unknown: true, escalate_after_turns: 10, escalate_on_human_request: true, custom_objective_prompt: '' },
  promoter: { operation_mode: 'auto', objective: 'request_referral_reward', escalate_on_unknown: true, escalate_after_turns: 5, escalate_on_human_request: true, custom_objective_prompt: '' },
  passive: { operation_mode: 'auto', objective: 'understand_and_reconquer', escalate_on_unknown: true, escalate_after_turns: 5, escalate_on_human_request: true, custom_objective_prompt: '' },
  detractor: { operation_mode: 'hybrid', objective: 'understand_problem', escalate_on_unknown: true, escalate_after_turns: 3, escalate_on_human_request: true, custom_objective_prompt: '' },
};

export default function WhatsAppSetup({ isDark, tenantId, companyName }: Props) {
  const t = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    input: isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400',
    label: isDark ? 'text-slate-300' : 'text-slate-600',
    divider: isDark ? 'border-slate-700' : 'border-slate-200',
    highlight: isDark ? 'bg-slate-700' : 'bg-slate-50',
  };

  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectingStep, setConnectingStep] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [savingPersona, setSavingPersona] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(false);
  const [savingPlaybooks, setSavingPlaybooks] = useState(false);
  const [playbooksSaved, setPlaybooksSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'persona' | 'playbooks' | 'connection'>('persona');
  const [expandedFlow, setExpandedFlow] = useState<string | null>('pre_sale');

  const [persona, setPersona] = useState<AIPersona>({
    name: 'Maria',
    role: 'Consultora de Atendimento',
    tone: 'friendly_professional',
    personality: 'consultive',
    custom_instructions: '',
  });

  const [playbooks, setPlaybooks] = useState<Playbooks>(DEFAULT_PLAYBOOKS);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [connRes, playbooksRes] = await Promise.all([
        fetch(`/api/whatsapp/connection?tenantId=${tenantId}`),
        fetch(`/api/whatsapp/playbooks?tenantId=${tenantId}`),
      ]);
      if (connRes.ok) {
        const data = await connRes.json();
        setConnection(data.connection);
        if (data.persona) setPersona(data.persona);
      }
      if (playbooksRes.ok) {
        const data = await playbooksRes.json();
        if (data.playbooks) {
          setPlaybooks({
            pre_sale: { ...DEFAULT_PLAYBOOKS.pre_sale, ...data.playbooks.pre_sale },
            promoter: { ...DEFAULT_PLAYBOOKS.promoter, ...data.playbooks.promoter },
            passive: { ...DEFAULT_PLAYBOOKS.passive, ...data.playbooks.passive },
            detractor: { ...DEFAULT_PLAYBOOKS.detractor, ...data.playbooks.detractor },
          });
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSavePersona = async () => {
    setSavingPersona(true);
    try {
      const res = await fetch('/api/whatsapp/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...persona }),
      });
      if (res.ok) {
        setPersonaSaved(true);
        setTimeout(() => setPersonaSaved(false), 3000);
      }
    } catch (err) {
      console.error('Error saving persona:', err);
    } finally {
      setSavingPersona(false);
    }
  };

  const handleSavePlaybooks = async () => {
    setSavingPlaybooks(true);
    try {
      const res = await fetch('/api/whatsapp/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, playbooks }),
      });
      if (res.ok) {
        setPlaybooksSaved(true);
        setTimeout(() => setPlaybooksSaved(false), 3000);
      }
    } catch (err) {
      console.error('Error saving playbooks:', err);
    } finally {
      setSavingPlaybooks(false);
    }
  };

  const updatePlaybook = (flowType: keyof Playbooks, field: keyof FlowPlaybook, value: unknown) => {
    setPlaybooks(prev => ({
      ...prev,
      [flowType]: { ...prev[flowType], [field]: value },
    }));
  };

  const handleEmbeddedSignup = () => {
    setConnectingStep('loading');
    const partnerId = process.env.NEXT_PUBLIC_DIALOG360_PARTNER_ID;
    if (!partnerId) {
      alert('Configuração do 360dialog não encontrada. Entre em contato com o suporte.');
      setConnectingStep('error');
      return;
    }
    const width = 600; const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const redirectUrl = encodeURIComponent(`${window.location.origin}/api/whatsapp-connection/callback`);
    const popup = window.open(
      `https://hub.360dialog.com/dashboard/app/${partnerId}/permissions?redirect_url=${redirectUrl}`,
      '360dialog-connect',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );
    const messageHandler = async (event: MessageEvent) => {
      if (event.data?.type === '360dialog-connect') {
        window.removeEventListener('message', messageHandler);
        popup?.close();
        const { client, channels } = event.data;
        if (channels && channels.length > 0) {
          try {
            const res = await fetch('/api/whatsapp-connection/onboarding', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tenantId, clientId: client, channelId: channels[0] }),
            });
            if (res.ok) { setConnectingStep('success'); await fetchData(); }
            else setConnectingStep('error');
          } catch { setConnectingStep('error'); }
        } else setConnectingStep('error');
      }
    };
    window.addEventListener('message', messageHandler);
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        if (connectingStep === 'loading') setConnectingStep('idle');
      }
    }, 1000);
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'auto': return 'text-green-600 bg-green-50 border-green-200';
      case 'hybrid': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'inputs_only': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'manual': return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getFlowColors = (color: string) => {
    switch (color) {
      case 'purple': return { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500', iconBg: 'bg-purple-100' };
      case 'green': return { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500', iconBg: 'bg-green-100' };
      case 'yellow': return { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500', iconBg: 'bg-yellow-100' };
      case 'red': return { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-500', iconBg: 'bg-red-100' };
      default: return { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-700', icon: 'text-slate-500', iconBg: 'bg-slate-100' };
    }
  };

  if (loading) {
    return (
      <div className={`flex-1 ${t.bg} flex items-center justify-center`}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          <span className={t.textMuted}>Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 ${t.bg} overflow-y-auto`}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className={`text-2xl font-bold ${t.text}`}>Ações Autônomas por WhatsApp</h1>
          <p className={`mt-1 text-sm ${t.textMuted}`}>Configure a identidade da IA, os playbooks de comportamento e a conexão WhatsApp.</p>
        </div>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl border ${t.card}`}>
          {[
            { id: 'persona', label: 'Identidade da IA', icon: Bot },
            { id: 'playbooks', label: 'Playbooks por Fluxo', icon: Target },
            { id: 'connection', label: 'Conexão WhatsApp', icon: Smartphone },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'persona' | 'playbooks' | 'connection')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : `${t.textMuted} hover:${t.text}`
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* TAB: IDENTIDADE DA IA */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'persona' && (
          <div className={`rounded-2xl border ${t.card} p-6 space-y-6`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className={`font-semibold ${t.text}`}>Identidade da Atendente</h2>
                <p className={`text-xs ${t.textMuted}`}>A IA vai se apresentar com este nome e cargo. Nunca revelará que é uma IA.</p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-amber-900/20 border-amber-700/30' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  <strong>Importante:</strong> Escolha um nome real. A IA nunca vai revelar que é uma inteligência artificial — ela vai se comportar como uma funcionária real da sua empresa.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${t.label} mb-1.5`}>Nome da atendente *</label>
                <input
                  type="text"
                  value={persona.name}
                  onChange={e => setPersona(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Maria, Ana, Juliana, Carlos..."
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${t.label} mb-1.5`}>Cargo / função *</label>
                <input
                  type="text"
                  value={persona.role}
                  onChange={e => setPersona(p => ({ ...p, role: e.target.value }))}
                  placeholder="Ex: Consultora, Recepcionista, Atendente..."
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${t.label} mb-2`}>Tom de voz</label>
              <div className="grid grid-cols-1 gap-2">
                {TONE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPersona(p => ({ ...p, tone: opt.value }))}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      persona.tone === opt.value
                        ? 'border-purple-500 bg-purple-50'
                        : `${t.card} hover:border-purple-300`
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                      persona.tone === opt.value ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                    }`} />
                    <div>
                      <p className={`text-sm font-medium ${persona.tone === opt.value ? 'text-purple-700' : t.text}`}>{opt.label}</p>
                      <p className={`text-xs ${t.textMuted}`}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${t.label} mb-2`}>Personalidade</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PERSONALITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPersona(p => ({ ...p, personality: opt.value }))}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      persona.personality === opt.value
                        ? 'border-purple-500 bg-purple-50'
                        : `${t.card} hover:border-purple-300`
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                      persona.personality === opt.value ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                    }`} />
                    <div>
                      <p className={`text-sm font-medium ${persona.personality === opt.value ? 'text-purple-700' : t.text}`}>{opt.label}</p>
                      <p className={`text-xs ${t.textMuted}`}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${t.label} mb-1.5`}>Instruções especiais (opcional)</label>
              <textarea
                value={persona.custom_instructions}
                onChange={e => setPersona(p => ({ ...p, custom_instructions: e.target.value }))}
                placeholder="Ex: Sempre mencione que temos estacionamento gratuito. Não fale sobre preços antes de agendar. Se o cliente perguntar sobre desconto, diga que pode verificar com a gerência..."
                rows={3}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none`}
              />
            </div>

            {/* Preview */}
            <div className={`rounded-xl p-4 border ${t.highlight} ${t.divider}`}>
              <p className={`text-xs font-medium ${t.textMuted} mb-2`}>Pré-visualização de como ela se apresenta:</p>
              <div className={`rounded-lg px-3 py-2 text-sm shadow-sm ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>
                <p className="leading-relaxed">
                  &quot;Oi! Aqui é a <strong>{persona.name || 'Maria'}</strong>, {persona.role || 'consultora'} da {companyName || 'empresa'}.
                  {persona.personality === 'consultive' && ' Vi que você demonstrou interesse nos nossos serviços. Posso te ajudar com alguma dúvida?'}
                  {persona.personality === 'proactive' && ' Vi seu cadastro e já separei algumas opções que combinam com o que você procura!'}
                  {persona.personality === 'supportive' && ' Fico feliz que tenha entrado em contato. Estou aqui pra te ajudar no que precisar.'}
                  {persona.personality === 'persuasive' && ' Temos uma condição especial essa semana que acho que vai te interessar!'}
                  {persona.personality === 'informative' && ' Posso te explicar como funciona nosso processo e tirar qualquer dúvida.'}
                  &quot;
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className={`text-xs ${t.textMuted}`}>
                Preview: <span className="font-medium">&quot;{persona.name}, {persona.role} da {companyName}&quot;</span>
              </span>
              <button
                onClick={handleSavePersona}
                disabled={savingPersona}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-all"
              >
                {savingPersona ? <Loader2 className="w-4 h-4 animate-spin" /> : personaSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {personaSaved ? 'Salvo!' : 'Salvar identidade'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* TAB: PLAYBOOKS POR FLUXO */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'playbooks' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  Configure como a IA deve se comportar em cada situação. O <strong>modo de operação</strong> pode ser alterado a qualquer momento em qualquer conversa. Se um humano enviar uma mensagem diretamente pelo sistema, a IA para automaticamente e só volta quando você ativar novamente.
                </p>
              </div>
            </div>

            {(Object.entries(FLOW_CONFIG) as Array<[keyof Playbooks, typeof FLOW_CONFIG.pre_sale]>).map(([flowKey, flowCfg]) => {
              const Icon = flowCfg.icon;
              const colors = getFlowColors(flowCfg.color);
              const pb = playbooks[flowKey];
              const isExpanded = expandedFlow === flowKey;
              const currentMode = OPERATION_MODES.find(m => m.value === pb.operation_mode);
              const currentObjective = FLOW_OBJECTIVES[flowKey]?.find(o => o.value === pb.objective);

              return (
                <div key={flowKey} className={`rounded-2xl border ${t.card} overflow-hidden`}>
                  <button
                    onClick={() => setExpandedFlow(isExpanded ? null : flowKey)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${colors.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold text-sm ${t.text}`}>{flowCfg.label}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getModeColor(pb.operation_mode)}`}>
                          {currentMode?.icon} {currentMode?.label}
                        </span>
                      </div>
                      <p className={`text-xs ${t.textMuted} truncate`}>
                        {flowCfg.desc} · Objetivo: {currentObjective?.label || pb.objective}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className={`w-4 h-4 ${t.textMuted} flex-shrink-0`} /> : <ChevronDown className={`w-4 h-4 ${t.textMuted} flex-shrink-0`} />}
                  </button>

                  {isExpanded && (
                    <div className={`border-t ${t.divider} p-5 space-y-5`}>
                      {/* Modo de operação */}
                      <div>
                        <label className={`block text-sm font-semibold ${t.text} mb-2`}>Modo de operação</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {OPERATION_MODES.map(mode => (
                            <button
                              key={mode.value}
                              onClick={() => updatePlaybook(flowKey, 'operation_mode', mode.value)}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                                pb.operation_mode === mode.value
                                  ? 'border-purple-500 bg-purple-50'
                                  : `${t.card} hover:border-purple-300`
                              }`}
                            >
                              <span className="text-xl">{mode.icon}</span>
                              <span className={`text-xs font-medium ${pb.operation_mode === mode.value ? 'text-purple-700' : t.text}`}>{mode.label}</span>
                              <span className={`text-xs ${t.textMuted} leading-tight`}>{mode.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Objetivo */}
                      <div>
                        <label className={`block text-sm font-semibold ${t.text} mb-2`}>Objetivo da IA neste fluxo</label>
                        <div className="space-y-2">
                          {FLOW_OBJECTIVES[flowKey]?.map(obj => (
                            <button
                              key={obj.value}
                              onClick={() => updatePlaybook(flowKey, 'objective', obj.value)}
                              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                                pb.objective === obj.value
                                  ? `border-purple-500 ${colors.bg}`
                                  : `${t.card} hover:border-purple-300`
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                                pb.objective === obj.value ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                              }`} />
                              <div>
                                <p className={`text-sm font-medium ${pb.objective === obj.value ? 'text-purple-700' : t.text}`}>{obj.label}</p>
                                <p className={`text-xs ${t.textMuted}`}>{obj.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Regras de escalada */}
                      <div>
                        <label className={`block text-sm font-semibold ${t.text} mb-2`}>Regras de escalada para humano</label>
                        <div className="space-y-2">
                          {[
                            { field: 'escalate_on_human_request' as keyof FlowPlaybook, label: 'Escalar se cliente pedir falar com humano', desc: 'IA para imediatamente se cliente pedir atendimento humano' },
                            { field: 'escalate_on_unknown' as keyof FlowPlaybook, label: 'Escalar se IA não souber responder', desc: 'IA para e notifica se não tiver conhecimento para responder' },
                          ].map(rule => (
                            <div key={rule.field} className={`flex items-center justify-between p-3 rounded-xl border ${t.card}`}>
                              <div>
                                <p className={`text-sm font-medium ${t.text}`}>{rule.label}</p>
                                <p className={`text-xs ${t.textMuted}`}>{rule.desc}</p>
                              </div>
                              <button
                                onClick={() => updatePlaybook(flowKey, rule.field, !(pb[rule.field] as boolean))}
                                className={`flex-shrink-0 ml-3 ${pb[rule.field] ? 'text-purple-600' : t.textMuted}`}
                              >
                                {pb[rule.field] ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                              </button>
                            </div>
                          ))}
                          <div className={`flex items-center justify-between p-3 rounded-xl border ${t.card}`}>
                            <div>
                              <p className={`text-sm font-medium ${t.text}`}>Escalar após muitas mensagens sem conversão</p>
                              <p className={`text-xs ${t.textMuted}`}>Número de turnos antes de escalar para humano</p>
                            </div>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={pb.escalate_after_turns}
                              onChange={e => updatePlaybook(flowKey, 'escalate_after_turns', parseInt(e.target.value) || 10)}
                              className={`w-16 px-2 py-1.5 rounded-lg border text-sm text-center ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Prompt customizado */}
                      <div>
                        <label className={`block text-sm font-semibold ${t.text} mb-1.5`}>
                          Instruções específicas para este fluxo (opcional)
                        </label>
                        <textarea
                          value={pb.custom_objective_prompt}
                          onChange={e => updatePlaybook(flowKey, 'custom_objective_prompt', e.target.value)}
                          placeholder="Ex: Sempre mencione o programa de fidelidade. Ofereça desconto de 10% para agendamento na semana..."
                          rows={2}
                          className={`w-full px-3 py-2.5 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSavePlaybooks}
                disabled={savingPlaybooks}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-all"
              >
                {savingPlaybooks ? <Loader2 className="w-4 h-4 animate-spin" /> : playbooksSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {playbooksSaved ? 'Playbooks salvos!' : 'Salvar todos os playbooks'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* TAB: CONEXÃO WHATSAPP */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'connection' && (
          <div className={`rounded-2xl border ${t.card} p-6 space-y-6`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className={`font-semibold ${t.text}`}>Conexão WhatsApp Business</h2>
                <p className={`text-xs ${t.textMuted}`}>Conecte o número da sua empresa para envio automático.</p>
              </div>
            </div>

            {connection ? (
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-green-900/20 border-green-700/30' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className={`font-medium text-sm ${isDark ? 'text-green-300' : 'text-green-800'}`}>WhatsApp conectado</p>
                    <p className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>{connection.phone_number} · {connection.display_name}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Zap, label: 'Automático', desc: 'IA responde 24/7' },
                    { icon: Shield, label: 'Seguro', desc: 'API oficial da Meta' },
                    { icon: MessageSquare, label: 'Personalizado', desc: 'Tom da sua marca' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className={`p-4 rounded-xl border ${t.card} text-center`}>
                        <Icon className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <p className={`text-sm font-medium ${t.text}`}>{item.label}</p>
                        <p className={`text-xs ${t.textMuted}`}>{item.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleEmbeddedSignup}
                  disabled={connectingStep === 'loading'}
                  className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#25D366] text-white rounded-xl font-semibold hover:bg-[#20BD5C] disabled:opacity-50 transition-all"
                >
                  {connectingStep === 'loading' ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Conectando...</>
                  ) : (
                    <><Smartphone className="w-5 h-5" /> Conectar WhatsApp Business</>
                  )}
                </button>

                {connectingStep === 'error' && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Erro ao conectar. Tente novamente ou entre em contato com o suporte.
                  </div>
                )}

                <p className={`text-xs ${t.textMuted} text-center`}>
                  <Lock className="w-3 h-3 inline mr-1" />
                  Usamos a API oficial do WhatsApp Business (Meta). Seus dados são protegidos e o número nunca será banido por uso indevido.
                </p>
              </div>
            )}

            {/* Como funciona */}
            {!connection && (
              <div className={`rounded-xl border p-4 ${t.highlight} ${t.divider}`}>
                <h3 className={`text-sm font-semibold ${t.text} mb-3`}>Como funciona</h3>
                <div className="space-y-3">
                  {[
                    { step: '1', label: 'Conecte seu WhatsApp Business', desc: 'Clique no botão acima e siga as instruções da Meta' },
                    { step: '2', label: 'Configure a identidade e playbooks', desc: 'Defina nome, cargo, tom e comportamento por fluxo' },
                    { step: '3', label: 'Templates são aprovados', desc: 'A Meta aprova as mensagens em até 24h' },
                    { step: '4', label: 'IA começa a agir', desc: 'Automaticamente após NPS respondido ou para novos leads' },
                  ].map(({ step, label, desc }) => (
                    <div key={step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {step}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${t.text}`}>{label}</p>
                        <p className={`text-xs ${t.textMuted}`}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
