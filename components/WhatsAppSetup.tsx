'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone, CheckCircle, AlertCircle, Loader2, Wifi, WifiOff,
  MessageSquare, Shield, Zap, RefreshCw, ExternalLink, Info,
  Star, TrendingUp, Users, ChevronRight, Lock, User, Sparkles, Save
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
  messaging_tier: string;
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

interface TemplateStatus {
  template_name: string;
  template_category: string;
  status: string;
  submitted_at: string;
  approved_at?: string;
  rejected_reason?: string;
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

export default function WhatsAppSetup({ isDark, tenantId, companyName }: Props) {
  const t = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    input: isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400',
    label: isDark ? 'text-slate-300' : 'text-slate-600',
    divider: isDark ? 'border-slate-700' : 'border-slate-200',
    badge: isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600',
    highlight: isDark ? 'bg-slate-700' : 'bg-slate-50',
  };

  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [templates, setTemplates] = useState<TemplateStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingStep, setConnectingStep] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submittingTemplates, setSubmittingTemplates] = useState(false);
  const [savingPersona, setSavingPersona] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(false);

  // Persona fields
  const [persona, setPersona] = useState<AIPersona>({
    name: 'Maria',
    role: 'Consultora de Atendimento',
    tone: 'friendly_professional',
    personality: 'consultive',
    custom_instructions: '',
  });

  const fetchConnection = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/connection?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setConnection(data.connection);
        if (data.persona) {
          setPersona(data.persona);
        }
      }
    } catch (err) {
      console.error('Error fetching connection:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/templates/submit?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchConnection();
    fetchTemplates();
  }, [fetchConnection, fetchTemplates]);

  // Embedded Signup: abre o popup da Meta
  const handleEmbeddedSignup = () => {
    setConnectingStep('loading');

    const partnerId = process.env.NEXT_PUBLIC_DIALOG360_PARTNER_ID;

    if (!partnerId) {
      alert('Configuração do 360dialog não encontrada. Entre em contato com o suporte.');
      setConnectingStep('error');
      return;
    }

    const width = 600;
    const height = 700;
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

            if (res.ok) {
              setConnectingStep('success');
              await fetchConnection();
              await handleSubmitTemplates();
            } else {
              setConnectingStep('error');
            }
          } catch {
            setConnectingStep('error');
          }
        } else {
          setConnectingStep('error');
        }
      }
    };

    window.addEventListener('message', messageHandler);

    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        if (connectingStep === 'loading') {
          setConnectingStep('idle');
        }
      }
    }, 1000);
  };

  const handleSubmitTemplates = async () => {
    setSubmittingTemplates(true);
    try {
      const res = await fetch('/api/whatsapp/templates/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        await fetchTemplates();
      }
    } catch (err) {
      console.error('Error submitting templates:', err);
    } finally {
      setSubmittingTemplates(false);
    }
  };

  const handleSavePersona = async () => {
    setSavingPersona(true);
    setPersonaSaved(false);
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

  const getQualityColor = (rating: string) => {
    if (rating === 'GREEN') return 'text-emerald-500';
    if (rating === 'YELLOW') return 'text-amber-500';
    return 'text-red-500';
  };

  const getTemplateStatusBadge = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
    if (status === 'PENDING') return 'bg-amber-100 text-amber-700';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  };

  const templateNames: Record<string, string> = {
    hg_detractor_recovery: 'Recuperação de Detratores',
    hg_promoter_referral: 'Pedido de Indicação',
    hg_passive_feedback: 'Feedback de Neutros',
    hg_pre_sale_followup: 'Follow-up Pré-Venda',
    hg_resume_conversation: 'Retomada de Conversa',
    hg_google_review_request: 'Solicitar Avaliação Google',
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${t.bg}`}>
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.bg} p-6`}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className={`text-2xl font-bold ${t.text}`}>Ações Autônomas por WhatsApp</h1>
          <p className={`mt-1 ${t.textMuted}`}>
            Conecte o WhatsApp da sua empresa para que a IA entre em contato com seus clientes automaticamente.
          </p>
        </div>

        {/* Status da Conexão */}
        <div className={`rounded-xl border p-6 ${t.card}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${t.text}`}>Conexão WhatsApp</h2>
            {connection && (
              <button onClick={fetchConnection} className={`p-2 rounded-lg hover:bg-slate-100 ${t.textMuted}`}>
                <RefreshCw size={16} />
              </button>
            )}
          </div>

          {!connection ? (
            <div className="space-y-4">
              {/* Benefícios */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Zap, label: 'Automático', desc: 'IA responde 24/7' },
                  { icon: Shield, label: 'Seguro', desc: 'API oficial da Meta' },
                  { icon: MessageSquare, label: 'Personalizado', desc: 'Tom da sua marca' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className={`rounded-lg p-3 text-center ${t.highlight}`}>
                    <Icon size={20} className="text-purple-500 mx-auto mb-1" />
                    <p className={`text-sm font-medium ${t.text}`}>{label}</p>
                    <p className={`text-xs ${t.textMuted}`}>{desc}</p>
                  </div>
                ))}
              </div>

              {/* Botão de conexão */}
              <button
                onClick={handleEmbeddedSignup}
                disabled={connectingStep === 'loading'}
                className="w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors"
              >
                {connectingStep === 'loading' ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Smartphone size={20} />
                )}
                {connectingStep === 'loading' ? 'Conectando...' : 'Conectar WhatsApp Business'}
              </button>

              {connectingStep === 'error' && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle size={14} />
                  <span>Erro ao conectar. Tente novamente ou entre em contato com o suporte.</span>
                </div>
              )}

              <div className={`flex items-start gap-2 text-xs ${t.textMuted}`}>
                <Lock size={12} className="mt-0.5 flex-shrink-0" />
                <span>Usamos a API oficial do WhatsApp Business (Meta). Seus dados são protegidos e o número nunca será banido por uso indevido.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Conexão ativa */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Wifi size={24} className="text-green-600" />
                </div>
                <div>
                  <p className={`font-semibold ${t.text}`}>{connection.display_name}</p>
                  <p className={`text-sm ${t.textMuted}`}>{connection.phone_number}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className={`text-sm font-medium ${getQualityColor(connection.quality_rating)}`}>
                    ● {connection.quality_rating === 'GREEN' ? 'Qualidade Alta' : connection.quality_rating === 'YELLOW' ? 'Qualidade Média' : 'Qualidade Baixa'}
                  </span>
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-3 p-3 rounded-lg ${t.highlight}`}>
                <div>
                  <p className={`text-xs ${t.textMuted}`}>Limite de mensagens</p>
                  <p className={`text-sm font-medium ${t.text}`}>
                    {connection.messaging_tier === 'TIER_1K' ? '1.000/dia' :
                     connection.messaging_tier === 'TIER_10K' ? '10.000/dia' :
                     connection.messaging_tier === 'TIER_100K' ? '100.000/dia' : connection.messaging_tier}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${t.textMuted}`}>Conectado em</p>
                  <p className={`text-sm font-medium ${t.text}`}>
                    {new Date(connection.connected_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            PERSONA DA IA (sempre visível, independente da conexão)
        ============================================================ */}
        <div className={`rounded-xl border p-6 ${t.card}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${t.text}`}>Identidade da Atendente</h2>
              <p className={`text-sm ${t.textMuted}`}>
                Configure quem a IA vai ser nas conversas. Seus clientes não saberão que é uma IA.
              </p>
            </div>
          </div>

          <div className="space-y-5 mt-5">
            {/* Nome e Cargo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${t.label} mb-1.5`}>
                  Nome da atendente
                </label>
                <input
                  type="text"
                  value={persona.name}
                  onChange={(e) => setPersona({ ...persona, name: e.target.value })}
                  placeholder="Ex: Maria, Ana, Sofia..."
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm ${t.input}`}
                />
                <p className={`text-xs ${t.textMuted} mt-1`}>Como ela vai se apresentar</p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${t.label} mb-1.5`}>
                  Cargo / Função
                </label>
                <input
                  type="text"
                  value={persona.role}
                  onChange={(e) => setPersona({ ...persona, role: e.target.value })}
                  placeholder="Ex: Consultora, Recepcionista..."
                  className={`w-full px-3 py-2.5 rounded-lg border text-sm ${t.input}`}
                />
                <p className={`text-xs ${t.textMuted} mt-1`}>Cargo que aparece na conversa</p>
              </div>
            </div>

            {/* Tom de Voz */}
            <div>
              <label className={`block text-sm font-medium ${t.label} mb-2`}>
                Tom de voz
              </label>
              <div className="grid grid-cols-1 gap-2">
                {TONE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      persona.tone === option.value
                        ? isDark ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50'
                        : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tone"
                      value={option.value}
                      checked={persona.tone === option.value}
                      onChange={(e) => setPersona({ ...persona, tone: e.target.value })}
                      className="mt-0.5 accent-purple-600"
                    />
                    <div>
                      <p className={`text-sm font-medium ${t.text}`}>{option.label}</p>
                      <p className={`text-xs ${t.textMuted}`}>{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Personalidade */}
            <div>
              <label className={`block text-sm font-medium ${t.label} mb-2`}>
                Personalidade / Estilo de abordagem
              </label>
              <div className="grid grid-cols-1 gap-2">
                {PERSONALITY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      persona.personality === option.value
                        ? isDark ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50'
                        : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="personality"
                      value={option.value}
                      checked={persona.personality === option.value}
                      onChange={(e) => setPersona({ ...persona, personality: e.target.value })}
                      className="mt-0.5 accent-purple-600"
                    />
                    <div>
                      <p className={`text-sm font-medium ${t.text}`}>{option.label}</p>
                      <p className={`text-xs ${t.textMuted}`}>{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Instruções customizadas */}
            <div>
              <label className={`block text-sm font-medium ${t.label} mb-1.5`}>
                Instruções adicionais <span className={`font-normal ${t.textMuted}`}>(opcional)</span>
              </label>
              <textarea
                value={persona.custom_instructions}
                onChange={(e) => setPersona({ ...persona, custom_instructions: e.target.value })}
                rows={3}
                placeholder="Ex: Sempre mencionar que temos estacionamento gratuito. Nunca falar de preços exatos, apenas faixas..."
                className={`w-full px-3 py-2.5 rounded-lg border text-sm resize-none ${t.input}`}
              />
              <p className={`text-xs ${t.textMuted} mt-1`}>Regras específicas que a atendente deve seguir</p>
            </div>

            {/* Botão salvar */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSavePersona}
                disabled={savingPersona}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                {savingPersona ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : personaSaved ? (
                  <CheckCircle size={14} />
                ) : (
                  <Save size={14} />
                )}
                {savingPersona ? 'Salvando...' : personaSaved ? 'Salvo!' : 'Salvar Identidade'}
              </button>
              {personaSaved && (
                <span className="text-sm text-emerald-500 font-medium">Configurações salvas com sucesso</span>
              )}
            </div>

            {/* Preview */}
            <div className={`rounded-lg p-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'} border ${t.divider}`}>
              <p className={`text-xs font-medium ${t.textMuted} mb-2`}>Pré-visualização de como ela se apresenta:</p>
              <div className={`rounded-lg px-3 py-2 text-sm ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'} shadow-sm`}>
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
          </div>
        </div>

        {/* Status dos Templates */}
        {connection && (
          <div className={`rounded-xl border p-6 ${t.card}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-lg font-semibold ${t.text}`}>Templates de Mensagem</h2>
                <p className={`text-sm ${t.textMuted}`}>
                  Mensagens pré-aprovadas pela Meta para iniciar conversas
                </p>
              </div>
              <button
                onClick={handleSubmitTemplates}
                disabled={submittingTemplates}
                className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                {submittingTemplates ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {submittingTemplates ? 'Enviando...' : 'Reenviar'}
              </button>
            </div>

            {templates.length === 0 ? (
              <div className={`text-center py-6 ${t.textMuted}`}>
                <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Templates ainda não submetidos</p>
                <button
                  onClick={handleSubmitTemplates}
                  disabled={submittingTemplates}
                  className="mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Submeter agora
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((tmpl) => (
                  <div key={tmpl.template_name} className={`flex items-center justify-between p-3 rounded-lg ${t.highlight}`}>
                    <div>
                      <p className={`text-sm font-medium ${t.text}`}>
                        {templateNames[tmpl.template_name] || tmpl.template_name}
                      </p>
                      <p className={`text-xs ${t.textMuted}`}>
                        {tmpl.template_category === 'UTILITY' ? 'Utilitário (gratuito)' : 'Marketing (R$0,35/envio)'}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTemplateStatusBadge(tmpl.status)}`}>
                      {tmpl.status === 'APPROVED' ? 'Aprovado' :
                       tmpl.status === 'PENDING' ? 'Em análise' :
                       tmpl.status === 'REJECTED' ? 'Rejeitado' : tmpl.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className={`mt-4 flex items-start gap-2 text-xs ${t.textMuted}`}>
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              <span>Templates de Utilitário (recuperação de detratores, neutros) são gratuitos. Templates de Marketing (indicação, pré-venda) custam R$0,35 por envio.</span>
            </div>
          </div>
        )}

        {/* Próximos passos */}
        {!connection && (
          <div className={`rounded-xl border p-6 ${t.card}`}>
            <h2 className={`text-lg font-semibold ${t.text} mb-4`}>Como funciona</h2>
            <div className="space-y-3">
              {[
                { step: '1', label: 'Conecte seu WhatsApp Business', desc: 'Clique no botão acima e siga as instruções da Meta' },
                { step: '2', label: 'Configure a identidade da atendente', desc: 'Defina nome, cargo, tom e personalidade' },
                { step: '3', label: 'Templates são aprovados', desc: 'A Meta aprova as mensagens em até 24h' },
                { step: '4', label: 'IA começa a agir', desc: 'Automaticamente após NPS respondido ou manualmente para leads' },
              ].map(({ step, label, desc }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
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
    </div>
  );
}
