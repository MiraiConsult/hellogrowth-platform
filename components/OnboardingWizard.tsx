'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Building2, Star, Package, FileText, MessageSquare, Bell,
  ChevronRight, ChevronLeft, Check, Sparkles, ArrowRight,
  MapPin, Loader2, X, SkipForward, Bot, Send, RefreshCw,
  Phone, Mail, Globe, Instagram, Facebook, Zap, CheckCircle2,
  AlertCircle
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface OnboardingWizardProps {
  userId: string;
  tenantId: string;
  userPlan: string;
  companyName: string;
  onComplete: () => void;
  onNavigate: (view: string) => void;
}

interface AIMessage {
  role: 'assistant' | 'user';
  content: string;
}

// Configuração de cada etapa por plano
const getSteps = (plan: string) => {
  const allSteps = [
    {
      id: 'profile',
      key: 'step_profile_done',
      title: 'Perfil do Negócio',
      subtitle: 'Vamos conhecer sua empresa',
      icon: Building2,
      color: 'emerald',
      plans: ['trial', 'client', 'rating', 'growth', 'growth_lifetime'],
      view: 'business-profile',
      aiIntro: `Olá! Eu sou a Giulia, sua assistente de configuração do HelloGrowth! 🌱

Estou aqui para te guiar em cada passo e garantir que você aproveite ao máximo a plataforma.

**Vamos começar pelo mais importante: o Perfil do seu Negócio!**

Pensa comigo: quanto mais eu souber sobre a sua empresa, mais inteligente o sistema fica. A IA vai usar essas informações para sugerir perguntas melhores, gerar textos mais certeiros e entender o contexto do seu negócio.

👉 **O que você vai preencher:**
- Nome e tipo do negócio
- Descrição do que você faz
- Público-alvo e diferenciais
- **Place ID do Google** (super importante para conectar com o Google Meu Negócio!)

Não se preocupe, vou te explicar cada campo. Pode começar!`,
      aiTip: 'O Place ID do Google é o código único do seu negócio no Google Maps. Você vai precisar dele para redirecionar clientes satisfeitos para deixar avaliações no Google. Clique em "Como encontrar meu Place ID?" na tela de perfil para ver o passo a passo!',
      completionMessage: 'Perfeito! Seu perfil está configurado! 🎉 Agora o sistema já conhece seu negócio e vai trabalhar muito melhor para você.',
    },
    {
      id: 'nps',
      key: 'step_nps_done',
      title: 'Pesquisa de NPS',
      subtitle: 'Crie sua primeira pesquisa de satisfação',
      icon: Star,
      color: 'yellow',
      plans: ['trial', 'client', 'rating', 'growth', 'growth_lifetime'],
      view: 'nps',
      aiIntro: `Excelente! Agora vamos criar sua **primeira pesquisa de satisfação (NPS)**! ⭐

O NPS (Net Promoter Score) é a pergunta mais poderosa que você pode fazer para um cliente: *"De 0 a 10, quanto você nos recomendaria?"*

Com ela você vai:
✅ Identificar quem são seus clientes promotores (nota 9-10)
✅ Descobrir quem está insatisfeito antes que vá embora
✅ Redirecionar automaticamente os satisfeitos para o Google

**Minha dica:** Use um dos nossos templates prontos! Eles foram criados com base em pesquisas reais de empresas do seu segmento e já têm as perguntas certas. É só selecionar e personalizar!

Clique em **"Nova Pesquisa"** e depois em **"Usar Template"** para começar.`,
      aiTip: 'Dica de ouro: crie uma pesquisa de pós-venda para enviar logo após o atendimento. Esse é o momento em que o cliente está mais propenso a responder e a nota tende a ser mais alta!',
      completionMessage: 'Sua pesquisa de NPS está pronta! 🌟 Agora você já pode começar a coletar avaliações dos seus clientes.',
    },
    {
      id: 'products',
      key: 'step_products_done',
      title: 'Cadastro de Produtos',
      subtitle: 'Adicione seus produtos ou serviços',
      icon: Package,
      color: 'blue',
      plans: ['growth', 'growth_lifetime', 'client'],
      view: 'products',
      aiIntro: `Ótimo progresso! Agora vamos cadastrar seus **produtos ou serviços**! 📦

Isso é fundamental para que o sistema consiga:
- Calcular o **valor de pipeline** gerado pelos seus formulários
- Sugerir produtos na hora certa para cada lead
- Gerar relatórios de conversão por produto

**Não precisa cadastrar tudo agora!** Comece com os 3 ou 4 principais serviços ou produtos que você mais vende. Você pode adicionar mais depois.

Clique em **"Adicionar Produto"** ou use a **geração automática com IA** — é só descrever o que você vende e a IA cria o catálogo para você!`,
      aiTip: 'Use a geração com IA! Clique no botão roxo "Gerar com IA" e descreva seus serviços em linguagem natural. A IA vai criar os produtos com nome, descrição e preço sugerido. Você só precisa revisar e confirmar!',
      completionMessage: 'Produtos cadastrados! 💼 Agora o sistema consegue calcular o potencial de receita dos seus leads.',
    },
    {
      id: 'form',
      key: 'step_form_done',
      title: 'Formulário de Pré-venda',
      subtitle: 'Crie seu formulário de captação de leads',
      icon: FileText,
      color: 'purple',
      plans: ['growth', 'growth_lifetime', 'client'],
      view: 'forms',
      aiIntro: `Quase lá! Agora vamos criar seu **formulário de pré-venda**! 📋

O formulário de pré-venda é o que você vai compartilhar para captar novos clientes interessados. Quando alguém preenche, você recebe uma notificação e o lead entra direto no seu CRM.

Pensa assim: é como ter um vendedor digital trabalhando 24 horas por dia, 7 dias por semana, qualificando leads para você!

**Minha sugestão:** Use um dos nossos templates de pré-venda. Eles já têm as perguntas certas para qualificar um lead no seu segmento. Clique em **"Novo Formulário"** e depois em **"Usar Template"**!`,
      aiTip: 'Coloque o link do formulário no seu Instagram (bio), WhatsApp Business e Google Meu Negócio. Assim você começa a receber leads de todos os canais automaticamente!',
      completionMessage: 'Formulário criado! 🎯 Agora você já pode começar a captar leads qualificados.',
    },
    {
      id: 'mbd',
      key: 'step_mbd_done',
      title: 'Conectar WhatsApp (MBD)',
      subtitle: 'Automatize o envio de pesquisas pelo WhatsApp',
      icon: MessageSquare,
      color: 'green',
      plans: ['growth', 'growth_lifetime'],
      view: 'settings',
      aiIntro: `Agora vamos conectar o **WhatsApp** para automatizar o envio das suas pesquisas! 📱

Com o MBD conectado, o sistema vai:
- Enviar pesquisas de NPS automaticamente após o atendimento
- Disparar formulários de pré-venda para novos leads
- Notificar sua equipe quando uma avaliação negativa chegar

**Como conectar:**
1. Vá em Configurações → Integrações
2. Clique em "Conectar MBD"
3. Escaneie o QR Code com seu WhatsApp

Se você ainda não contratou o MBD, pode pular essa etapa por enquanto e fazer depois!`,
      aiTip: 'O MBD é o canal com maior taxa de resposta — pesquisas enviadas pelo WhatsApp têm até 3x mais respostas do que por e-mail. Vale muito a pena configurar!',
      completionMessage: 'WhatsApp conectado! 📲 Agora suas pesquisas serão enviadas automaticamente.',
      skippable: true,
    },
    {
      id: 'alerts',
      key: 'step_alerts_done',
      title: 'Alertas e Relatórios',
      subtitle: 'Configure quem recebe os alertas',
      icon: Bell,
      color: 'orange',
      plans: ['trial', 'client', 'rating', 'growth', 'growth_lifetime'],
      view: 'settings',
      aiIntro: `Último passo! Vamos configurar os **alertas e relatórios**! 🔔

Isso garante que você e sua equipe sejam notificados quando:
- Um cliente deixar uma avaliação negativa (detrator)
- Um novo lead preencher o formulário
- For hora de enviar o relatório semanal/mensal

**O que você vai configurar:**
- Número(s) de WhatsApp para receber os alertas
- E-mail para relatórios periódicos
- Frequência dos relatórios (diário, semanal, mensal)

Clique em **"Configurações"** → **"Alertas e Relatórios"** para definir.`,
      aiTip: 'Coloque o número do responsável pelo atendimento para receber alertas de detratores em tempo real. Assim você pode entrar em contato rapidamente e reverter uma experiência negativa!',
      completionMessage: 'Alertas configurados! 🎊 Agora você vai ficar sempre informado sobre o que está acontecendo com seus clientes.',
    },
  ];

  return allSteps.filter(s => s.plans.includes(plan));
};

export default function OnboardingWizard({
  userId, tenantId, userPlan, companyName, onComplete, onNavigate
}: OnboardingWizardProps) {
  const steps = getSteps(userPlan);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progress = (completedSteps.size / totalSteps) * 100;

  // Carregar progresso salvo
  useEffect(() => {
    loadProgress();
  }, [tenantId]);

  // Iniciar mensagem da IA ao mudar de step
  useEffect(() => {
    if (currentStep) {
      setAiMessages([{ role: 'assistant', content: currentStep.aiIntro }]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [currentStepIndex]);

  const loadProgress = async () => {
    try {
      const { data } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (data) {
        const done = new Set<string>();
        if (data.step_profile_done) done.add('profile');
        if (data.step_nps_done) done.add('nps');
        if (data.step_products_done) done.add('products');
        if (data.step_form_done) done.add('form');
        if (data.step_mbd_done) done.add('mbd');
        if (data.step_alerts_done) done.add('alerts');
        setCompletedSteps(done);

        // Ir para o primeiro step não completo
        const firstIncomplete = steps.findIndex(s => !done.has(s.id));
        if (firstIncomplete >= 0) setCurrentStepIndex(firstIncomplete);
        else if (data.is_complete) onComplete();
      } else {
        // Criar registro inicial
        await supabase.from('onboarding_progress').insert({
          tenant_id: tenantId,
          user_id: userId,
          current_step: 1,
        });
      }
    } catch (e) {
      console.error('Erro ao carregar progresso:', e);
    }
  };

  const saveStepProgress = async (stepId: string) => {
    setIsSaving(true);
    try {
      const fieldMap: Record<string, string> = {
        profile: 'step_profile_done',
        nps: 'step_nps_done',
        products: 'step_products_done',
        form: 'step_form_done',
        mbd: 'step_mbd_done',
        alerts: 'step_alerts_done',
      };

      const newCompleted = new Set(completedSteps);
      newCompleted.add(stepId);
      setCompletedSteps(newCompleted);

      const isAllDone = steps.every(s => newCompleted.has(s.id));

      await supabase
        .from('onboarding_progress')
        .update({
          [fieldMap[stepId]]: true,
          current_step: currentStepIndex + 2,
          is_complete: isAllDone,
          completed_at: isAllDone ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      if (isAllDone) {
        setShowCompletionModal(true);
      }
    } catch (e) {
      console.error('Erro ao salvar progresso:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkDone = async () => {
    const step = currentStep;
    // Mostrar mensagem de conclusão da IA
    setAiMessages(prev => [
      ...prev,
      { role: 'assistant', content: step.completionMessage }
    ]);
    await saveStepProgress(step.id);

    // Avançar para o próximo step após 1.5s
    setTimeout(() => {
      const nextIncomplete = steps.findIndex((s, i) => i > currentStepIndex && !completedSteps.has(s.id));
      if (nextIncomplete >= 0) {
        setCurrentStepIndex(nextIncomplete);
      }
    }, 1500);
  };

  const handleSkip = async () => {
    const step = currentStep;
    setAiMessages(prev => [
      ...prev,
      { role: 'assistant', content: `Tudo bem! Você pode configurar o **${step.title}** depois, nas configurações do sistema. Vamos continuar! 👉` }
    ]);
    await saveStepProgress(step.id);
    setTimeout(() => {
      const nextIncomplete = steps.findIndex((s, i) => i > currentStepIndex && !completedSteps.has(s.id));
      if (nextIncomplete >= 0) setCurrentStepIndex(nextIncomplete);
    }, 1000);
  };

  const handleGoToModule = () => {
    onNavigate(currentStep.view);
  };

  const handleAiChat = async () => {
    if (!userInput.trim()) return;
    const msg = userInput.trim();
    setUserInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsAiTyping(true);

    try {
      const response = await fetch('/api/onboarding/giulia-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...aiMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: msg }
          ],
          stepTitle: currentStep.title,
          companyName,
        })
      });
      const data = await response.json();
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.message || 'Desculpe, não consegui responder agora. Tente novamente!' }]);
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Ops! Tive um problema técnico. Mas pode continuar — clique em "Ir para o módulo" para começar a configurar!' }]);
    } finally {
      setIsAiTyping(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const colorMap: Record<string, { bg: string; text: string; border: string; light: string; btn: string }> = {
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500', light: 'bg-emerald-50', btn: 'bg-emerald-500 hover:bg-emerald-600' },
    yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500', light: 'bg-yellow-50', btn: 'bg-yellow-500 hover:bg-yellow-600' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500', light: 'bg-blue-50', btn: 'bg-blue-500 hover:bg-blue-600' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500', light: 'bg-purple-50', btn: 'bg-purple-500 hover:bg-purple-600' },
    green: { bg: 'bg-green-500', text: 'text-green-600', border: 'border-green-500', light: 'bg-green-50', btn: 'bg-green-500 hover:bg-green-600' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500', light: 'bg-orange-50', btn: 'bg-orange-500 hover:bg-orange-600' },
  };

  const colors = colorMap[currentStep?.color || 'emerald'];
  const StepIcon = currentStep?.icon || Building2;

  // Modal de conclusão
  if (showCompletionModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuração Concluída! 🎉</h2>
          <p className="text-gray-500 mb-2">
            Parabéns, <strong>{companyName}</strong>! Você configurou tudo que precisa para começar a usar o HelloGrowth.
          </p>
          <p className="text-gray-400 text-sm mb-8">
            Agora é só começar a coletar avaliações, captar leads e acompanhar os resultados. Estou aqui sempre que precisar!
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {steps.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2 bg-emerald-50 rounded-xl p-3">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-700">{s.title}</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={onComplete}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Zap size={18} />
            Ir para o Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Configuração Inicial — HelloGrowth</h1>
            <p className="text-xs text-gray-400">{companyName} · {completedSteps.size}/{totalSteps} etapas concluídas</p>
          </div>
        </div>
        {/* Barra de progresso */}
        <div className="flex-1 mx-8 max-w-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Progresso</span>
            <span className="text-xs font-semibold text-emerald-600">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm('Tem certeza que quer sair da configuração? Você pode retomar depois.')) {
              onComplete();
            }
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors text-xs flex items-center gap-1"
        >
          <X size={14} />
          Fazer depois
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar de steps */}
        <div className="w-64 bg-white border-r border-gray-100 flex-shrink-0 overflow-y-auto py-6 px-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">Etapas</p>
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isDone = completedSteps.has(step.id);
            const isCurrent = idx === currentStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all text-left ${
                  isCurrent
                    ? `${colorMap[step.color].light} ${colorMap[step.color].border} border`
                    : isDone
                    ? 'bg-emerald-50 hover:bg-emerald-100'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isDone ? 'bg-emerald-500' : isCurrent ? colorMap[step.color].bg : 'bg-gray-100'
                }`}>
                  {isDone
                    ? <Check size={14} className="text-white" />
                    : <Icon size={14} className={isCurrent ? 'text-white' : 'text-gray-400'} />
                  }
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isCurrent ? colorMap[step.color].text : isDone ? 'text-emerald-600' : 'text-gray-600'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{isDone ? 'Concluído ✓' : isCurrent ? 'Em andamento' : 'Pendente'}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 flex overflow-hidden">
          {/* Área central — ação */}
          <div className="flex-1 flex flex-col overflow-hidden p-6">
            {/* Header da etapa */}
            <div className={`${colors.light} rounded-2xl p-6 mb-6 flex items-start gap-4 flex-shrink-0`}>
              <div className={`w-14 h-14 ${colors.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                <StepIcon size={28} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Etapa {currentStepIndex + 1} de {totalSteps}
                  </span>
                  {completedSteps.has(currentStep.id) && (
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={10} /> Concluído
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{currentStep.title}</h2>
                <p className="text-sm text-gray-500">{currentStep.subtitle}</p>
              </div>
            </div>

            {/* Dica rápida */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 flex-shrink-0">
              <Sparkles size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{currentStep.aiTip}</p>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col gap-3 flex-shrink-0">
              <button
                onClick={handleGoToModule}
                className={`${colors.btn} text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-base`}
              >
                <ArrowRight size={20} />
                Ir para: {currentStep.title}
              </button>

              {!completedSteps.has(currentStep.id) && (
                <button
                  onClick={handleMarkDone}
                  disabled={isSaving}
                  className="bg-white border-2 border-emerald-500 text-emerald-600 font-semibold py-3 px-6 rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Já configurei, marcar como concluído
                </button>
              )}

              {currentStep.skippable && !completedSteps.has(currentStep.id) && (
                <button
                  onClick={handleSkip}
                  className="text-gray-400 hover:text-gray-600 text-sm flex items-center justify-center gap-1 py-2 transition-colors"
                >
                  <SkipForward size={14} />
                  Pular por enquanto
                </button>
              )}

              {/* Navegação entre steps */}
              <div className="flex gap-2 mt-2">
                {currentStepIndex > 0 && (
                  <button
                    onClick={() => setCurrentStepIndex(i => i - 1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-1 text-sm"
                  >
                    <ChevronLeft size={16} /> Anterior
                  </button>
                )}
                {currentStepIndex < totalSteps - 1 && (
                  <button
                    onClick={() => setCurrentStepIndex(i => i + 1)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 rounded-xl transition-colors flex items-center justify-center gap-1 text-sm"
                  >
                    Próxima <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Chat com IA — Giulia */}
          <div className="w-80 bg-white border-l border-gray-100 flex flex-col flex-shrink-0">
            {/* Header do chat */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Giulia</p>
                <p className="text-xs text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                  Assistente de configuração
                </p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                      <Bot size={12} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-500 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}>
                    {msg.content.split('\n').map((line, i) => {
                      // Renderizar markdown básico
                      const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                      return (
                        <p key={i} className={i > 0 ? 'mt-1' : ''} dangerouslySetInnerHTML={{ __html: bold }} />
                      );
                    })}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input do chat */}
            <div className="p-3 border-t border-gray-100 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiChat()}
                  placeholder="Pergunte algo para a Giulia..."
                  className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300 placeholder-gray-400"
                />
                <button
                  onClick={handleAiChat}
                  disabled={!userInput.trim() || isAiTyping}
                  className="w-9 h-9 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
