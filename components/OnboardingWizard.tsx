'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Building2, Star, Package, FileText, MessageSquare, Bell,
  ChevronRight, ChevronLeft, Check, Sparkles, X, Bot, Send,
  Loader2, CheckCircle2, Zap, Plus, Trash2, Phone, Globe,
  Instagram, Facebook, MapPin, AlertCircle, ArrowRight,
  SkipForward, RefreshCw, Info
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

// ─── Configuração das etapas ─────────────────────────────────────────────────
const getSteps = (plan: string) => {
  const allSteps = [
    {
      id: 'profile',
      key: 'step_profile_done',
      title: 'Perfil do Negócio',
      subtitle: 'Conte-nos sobre sua empresa',
      icon: Building2,
      color: 'emerald',
      plans: ['trial', 'client', 'rating', 'growth', 'growth_lifetime'],
      skippable: false,
      aiIntro: `Olá! Eu sou a Giulia, sua assistente de configuração do HelloGrowth! 🌱

Vamos começar pelo mais importante: o **Perfil do seu Negócio**.

Quanto mais você preencher aqui, mais inteligente o sistema fica. A IA vai usar essas informações para sugerir perguntas melhores, gerar textos mais certeiros e entender o contexto do seu negócio.

O campo mais importante é o **Place ID do Google** — é o código único do seu negócio no Google Maps. Com ele, clientes satisfeitos são redirecionados automaticamente para avaliar você no Google!

Preencha os campos abaixo e clique em **Salvar Perfil** quando terminar. 👇`,
    },
    {
      id: 'nps',
      key: 'step_nps_done',
      title: 'Pesquisa de NPS',
      subtitle: 'Crie sua primeira pesquisa de satisfação',
      icon: Star,
      color: 'yellow',
      plans: ['trial', 'client', 'rating', 'growth', 'growth_lifetime'],
      skippable: false,
      aiIntro: `Agora vamos criar sua **primeira pesquisa de NPS**! ⭐

O NPS é a pergunta mais poderosa: *"De 0 a 10, quanto você nos recomendaria?"*

Com ela você identifica promotores (9-10), neutros (7-8) e detratores (0-6) — e redireciona automaticamente os satisfeitos para o Google.

Crie uma pesquisa de **pós-venda** para enviar logo após o atendimento. É o momento em que o cliente está mais propenso a responder!

Preencha o nome e clique em **Criar Pesquisa de NPS**. 👇`,
    },
    {
      id: 'products',
      key: 'step_products_done',
      title: 'Produtos e Serviços',
      subtitle: 'Cadastre o que você vende',
      icon: Package,
      color: 'blue',
      plans: ['growth', 'growth_lifetime', 'client', 'trial'],
      skippable: false,
      aiIntro: `Ótimo progresso! Agora vamos cadastrar seus **produtos ou serviços**! 📦

Isso é fundamental para que o sistema calcule o **valor de pipeline** dos seus leads e a IA sugira o produto certo na hora certa.

**Não precisa cadastrar tudo agora!** Comece com os 3 ou 4 principais. Você pode adicionar mais depois.

Clique em **+ Adicionar Produto** para começar. 👇`,
    },
    {
      id: 'form',
      key: 'step_form_done',
      title: 'Formulário de Pré-venda',
      subtitle: 'Crie seu formulário de captação de leads',
      icon: FileText,
      color: 'purple',
      plans: ['growth', 'growth_lifetime', 'client', 'trial'],
      skippable: false,
      aiIntro: `Quase lá! Vamos criar seu **formulário de pré-venda**! 📋

O formulário é o que você compartilha para captar novos clientes. Quando alguém preenche, você recebe uma notificação e o lead entra direto no CRM.

É como ter um vendedor digital trabalhando 24/7 qualificando leads para você!

Dê um nome ao formulário e clique em **Criar Formulário**. Depois você pode personalizar as perguntas na tela de Formulários. 👇`,
    },
    {
      id: 'mbd',
      key: 'step_mbd_done',
      title: 'WhatsApp (MBD)',
      subtitle: 'Automatize o envio pelo WhatsApp',
      icon: MessageSquare,
      color: 'green',
      plans: ['growth', 'growth_lifetime'],
      skippable: true,
      aiIntro: `Agora vamos conectar o **WhatsApp** para automatizar o envio das suas pesquisas! 📱

Com o MBD conectado, o sistema envia pesquisas de NPS automaticamente após atendimentos e notifica sua equipe quando uma avaliação negativa chegar.

Para conectar: vá em **Configurações → Integrações** e escaneie o QR Code com seu WhatsApp.

Se ainda não contratou o MBD, pode pular essa etapa por enquanto!`,
    },
    {
      id: 'alerts',
      key: 'step_alerts_done',
      title: 'Alertas e Relatórios',
      subtitle: 'Configure quem recebe os alertas',
      icon: Bell,
      color: 'orange',
      plans: ['trial', 'client', 'rating', 'growth', 'growth_lifetime'],
      skippable: false,
      aiIntro: `Último passo! Vamos configurar os **alertas**! 🔔

Assim você e sua equipe são notificados quando um cliente deixar uma avaliação negativa, um novo lead preencher o formulário, ou um lead de alto valor chegar.

Adicione o(s) número(s) de WhatsApp que devem receber as notificações e clique em **Salvar Alertas**. 👇`,
    },
  ];
  return allSteps.filter(s => s.plans.includes(plan));
};

const colorMap: Record<string, { bg: string; text: string; border: string; light: string; btn: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-400', light: 'bg-emerald-50', btn: 'bg-emerald-500 hover:bg-emerald-600', ring: 'ring-emerald-300' },
  yellow:  { bg: 'bg-yellow-500',  text: 'text-yellow-600',  border: 'border-yellow-400',  light: 'bg-yellow-50',  btn: 'bg-yellow-500 hover:bg-yellow-600',  ring: 'ring-yellow-300'  },
  blue:    { bg: 'bg-blue-500',    text: 'text-blue-600',    border: 'border-blue-400',    light: 'bg-blue-50',    btn: 'bg-blue-500 hover:bg-blue-600',    ring: 'ring-blue-300'    },
  purple:  { bg: 'bg-purple-500',  text: 'text-purple-600',  border: 'border-purple-400',  light: 'bg-purple-50',  btn: 'bg-purple-500 hover:bg-purple-600',  ring: 'ring-purple-300'  },
  green:   { bg: 'bg-green-500',   text: 'text-green-600',   border: 'border-green-400',   light: 'bg-green-50',   btn: 'bg-green-500 hover:bg-green-600',   ring: 'ring-green-300'   },
  orange:  { bg: 'bg-orange-500',  text: 'text-orange-600',  border: 'border-orange-400',  light: 'bg-orange-50',  btn: 'bg-orange-500 hover:bg-orange-600',  ring: 'ring-orange-300'  },
};

// ─── Componente principal ─────────────────────────────────────────────────────
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Dados de cada etapa ──
  // Etapa 1: Perfil
  const [profile, setProfile] = useState({
    company_name: companyName || '',
    business_type: '',
    business_description: '',
    target_audience: '',
    differentials: '',
    google_place_id: '',
    website_url: '',
    instagram_handle: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Etapa 2: NPS
  const [npsName, setNpsName] = useState('Pesquisa de Satisfação Pós-Venda');
  const [npsDescription, setNpsDescription] = useState('Pesquisa enviada após o atendimento para medir a satisfação do cliente.');
  const [npsCreated, setNpsCreated] = useState(false);

  // Etapa 3: Produtos
  const [products, setProducts] = useState<Array<{ name: string; value: string; description: string }>>([
    { name: '', value: '', description: '' }
  ]);
  const [productsSaved, setProductsSaved] = useState(false);

  // Etapa 4: Formulário
  const [formName, setFormName] = useState('Formulário de Interesse');
  const [formDescription, setFormDescription] = useState('Formulário para captar informações de clientes interessados nos nossos serviços.');
  const [formCreated, setFormCreated] = useState(false);

  // Etapa 5: MBD
  const [mbdNumber, setMbdNumber] = useState('');

  // Etapa 6: Alertas
  const [alertNumbers, setAlertNumbers] = useState<string[]>(['']);
  const [alertNewLead, setAlertNewLead] = useState(true);
  const [alertDetractor, setAlertDetractor] = useState(true);
  const [alertHighValue, setAlertHighValue] = useState(true);
  const [alertsSaved, setAlertsSaved] = useState(false);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? (completedSteps.size / totalSteps) * 100 : 0;

  // ── Carregar progresso e dados existentes ──
  useEffect(() => { loadProgress(); }, [tenantId]);

  useEffect(() => {
    if (currentStep) {
      setAiMessages([{ role: 'assistant', content: currentStep.aiIntro }]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [currentStepIndex]);

  const loadProgress = async () => {
    try {
      // Carregar progresso
      const { data: prog } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (prog) {
        const done = new Set<string>();
        if (prog.step_profile_done) done.add('profile');
        if (prog.step_nps_done) done.add('nps');
        if (prog.step_products_done) done.add('products');
        if (prog.step_form_done) done.add('form');
        if (prog.step_mbd_done) done.add('mbd');
        if (prog.step_alerts_done) done.add('alerts');
        setCompletedSteps(done);
        const firstIncomplete = steps.findIndex(s => !done.has(s.id));
        if (firstIncomplete >= 0) setCurrentStepIndex(firstIncomplete);
        else if (prog.is_complete) { onComplete(); return; }
      } else {
        await supabase.from('onboarding_progress').insert({ tenant_id: tenantId, user_id: userId, current_step: 1 });
      }

      // Carregar dados existentes do perfil
      const { data: bp } = await supabase
        .from('business_profile')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (bp) {
        setProfile({
          company_name: bp.company_name || companyName || '',
          business_type: bp.business_type || '',
          business_description: bp.business_description || '',
          target_audience: bp.target_audience || '',
          differentials: bp.differentials || '',
          google_place_id: bp.google_place_id || '',
          website_url: bp.website_url || '',
          instagram_handle: bp.instagram_handle || '',
        });
      }

      // Carregar alertas existentes
      const { data: alerts } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('company_id', tenantId)
        .maybeSingle();
      if (alerts) {
        const nums = alerts.whatsapp_numbers?.length ? alerts.whatsapp_numbers : (alerts.whatsapp_number ? [alerts.whatsapp_number] : ['']);
        setAlertNumbers(nums);
        setAlertNewLead(alerts.alert_new_lead ?? true);
        setAlertDetractor(alerts.alert_detractor ?? true);
        setAlertHighValue(alerts.alert_high_value_lead ?? true);
      }
    } catch (e) {
      console.error('Erro ao carregar progresso:', e);
    }
  };

  const saveStepProgress = async (stepId: string) => {
    const fieldMap: Record<string, string> = {
      profile: 'step_profile_done', nps: 'step_nps_done',
      products: 'step_products_done', form: 'step_form_done',
      mbd: 'step_mbd_done', alerts: 'step_alerts_done',
    };
    const newCompleted = new Set(completedSteps);
    newCompleted.add(stepId);
    setCompletedSteps(newCompleted);
    const isAllDone = steps.every(s => newCompleted.has(s.id));
    await supabase.from('onboarding_progress').update({
      [fieldMap[stepId]]: true,
      current_step: currentStepIndex + 2,
      is_complete: isAllDone,
      completed_at: isAllDone ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('tenant_id', tenantId);
    if (isAllDone) setShowCompletionModal(true);
  };

  const goNext = () => {
    const next = steps.findIndex((s, i) => i > currentStepIndex && !completedSteps.has(s.id));
    if (next >= 0) setCurrentStepIndex(next);
    else {
      const anyIncomplete = steps.findIndex(s => !completedSteps.has(s.id));
      if (anyIncomplete >= 0) setCurrentStepIndex(anyIncomplete);
    }
  };

  // ── Ações de cada etapa ──

  const handleSaveProfile = async () => {
    if (!profile.company_name.trim()) return;
    setProfileLoading(true);
    try {
      const data = { ...profile, user_id: userId, tenant_id: tenantId, updated_at: new Date().toISOString() };
      const { data: existing } = await supabase.from('business_profile').select('id').eq('tenant_id', tenantId).maybeSingle();
      if (existing) {
        await supabase.from('business_profile').update(data).eq('tenant_id', tenantId);
      } else {
        await supabase.from('business_profile').insert(data);
      }
      setAiMessages(prev => [...prev, { role: 'assistant', content: `Perfeito! O perfil de **${profile.company_name}** foi salvo! 🎉 Agora o sistema já conhece seu negócio e vai trabalhar muito melhor para você.` }]);
      await saveStepProgress('profile');
      setTimeout(goNext, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCreateNPS = async () => {
    if (!npsName.trim()) return;
    setIsSaving(true);
    try {
      await supabase.from('campaigns').insert({
        name: npsName,
        description: npsDescription,
        status: 'active',
        questions: [],
        initial_fields: [{ id: 'name', label: 'Nome', type: 'text', required: true }, { id: 'phone', label: 'WhatsApp', type: 'tel', required: false }],
        google_redirect: !!profile.google_place_id,
        google_place_id: profile.google_place_id || '',
        enable_redirection: !!profile.google_place_id,
        user_id: userId,
        tenant_id: tenantId,
      });
      setNpsCreated(true);
      setAiMessages(prev => [...prev, { role: 'assistant', content: `Sua pesquisa de NPS **"${npsName}"** foi criada! 🌟 Agora você já pode começar a coletar avaliações. Você pode personalizar as perguntas depois na tela de Pesquisas.` }]);
      await saveStepProgress('nps');
      setTimeout(goNext, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProducts = async () => {
    const valid = products.filter(p => p.name.trim());
    if (valid.length === 0) return;
    setIsSaving(true);
    try {
      await supabase.from('products_services').insert(
        valid.map(p => ({
          name: p.name.trim(),
          value: parseFloat(p.value) || 0,
          ai_description: p.description.trim(),
          user_id: userId,
          tenant_id: tenantId,
          active: true,
        }))
      );
      setProductsSaved(true);
      setAiMessages(prev => [...prev, { role: 'assistant', content: `${valid.length} produto(s) cadastrado(s) com sucesso! 💼 Agora o sistema consegue calcular o potencial de receita dos seus leads.` }]);
      await saveStepProgress('products');
      setTimeout(goNext, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateForm = async () => {
    if (!formName.trim()) return;
    setIsSaving(true);
    try {
      await supabase.from('forms').insert({
        name: formName,
        description: formDescription,
        questions: [],
        initial_fields: [
          { id: 'name', label: 'Nome completo', type: 'text', required: true },
          { id: 'phone', label: 'WhatsApp', type: 'tel', required: true },
          { id: 'email', label: 'E-mail', type: 'email', required: false },
        ],
        active: true,
        user_id: userId,
        tenant_id: tenantId,
      });
      setFormCreated(true);
      setAiMessages(prev => [...prev, { role: 'assistant', content: `Formulário **"${formName}"** criado! 🎯 Agora você já pode começar a captar leads qualificados. Personalize as perguntas depois na tela de Formulários.` }]);
      await saveStepProgress('form');
      setTimeout(goNext, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipMBD = async () => {
    setAiMessages(prev => [...prev, { role: 'assistant', content: `Tudo bem! Você pode conectar o WhatsApp depois em **Configurações → Integrações**. Vamos continuar! 👉` }]);
    await saveStepProgress('mbd');
    setTimeout(goNext, 1000);
  };

  const handleSaveAlerts = async () => {
    const validNumbers = alertNumbers.filter(n => n.trim());
    setIsSaving(true);
    try {
      const alertData = {
        company_id: tenantId,
        whatsapp_number: validNumbers[0] || null,
        whatsapp_numbers: validNumbers,
        alert_new_lead: alertNewLead,
        alert_detractor: alertDetractor,
        alert_high_value_lead: alertHighValue,
        alert_promoter: false,
        alert_lead_won: true,
        alert_lead_lost: false,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase.from('alert_settings').select('id').eq('company_id', tenantId).maybeSingle();
      if (existing) {
        await supabase.from('alert_settings').update(alertData).eq('company_id', tenantId);
      } else {
        await supabase.from('alert_settings').insert(alertData);
      }
      setAlertsSaved(true);
      setAiMessages(prev => [...prev, { role: 'assistant', content: `Alertas configurados! 🎊 Agora você vai ficar sempre informado sobre o que está acontecendo com seus clientes.` }]);
      await saveStepProgress('alerts');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Chat com a Giulia ──
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
          messages: [...aiMessages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: msg }],
          stepTitle: currentStep.title,
          companyName,
        })
      });
      const data = await response.json();
      setAiMessages(prev => [...prev, { role: 'assistant', content: data.message || 'Desculpe, não consegui responder agora. Tente novamente!' }]);
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Ops! Tive um problema técnico. Mas pode continuar! 😊' }]);
    } finally {
      setIsAiTyping(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // ── Renderização do conteúdo de cada etapa ──
  const renderStepContent = () => {
    const colors = colorMap[currentStep?.color || 'emerald'];
    switch (currentStep?.id) {

      // ── ETAPA 1: Perfil ──────────────────────────────────────────────────
      case 'profile':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome da Empresa *</label>
                <input
                  type="text"
                  value={profile.company_name}
                  onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))}
                  placeholder="Ex: Clínica Bella Forma"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Negócio</label>
                <select
                  value={profile.business_type}
                  onChange={e => setProfile(p => ({ ...p, business_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                >
                  <option value="">Selecione...</option>
                  {['Clínica de Estética','Consultório Médico','Salão de Beleza','Academia','Restaurante','Loja de Roupas','Imobiliária','Agência de Marketing','Escritório de Advocacia','Consultoria','E-commerce','Outro'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição do Negócio</label>
              <textarea
                value={profile.business_description}
                onChange={e => setProfile(p => ({ ...p, business_description: e.target.value }))}
                placeholder="O que sua empresa faz? Quais problemas resolve? (a IA usa isso para gerar textos personalizados)"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Público-alvo</label>
                <input
                  type="text"
                  value={profile.target_audience}
                  onChange={e => setProfile(p => ({ ...p, target_audience: e.target.value }))}
                  placeholder="Ex: Mulheres 25-45 anos"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Diferenciais</label>
                <input
                  type="text"
                  value={profile.differentials}
                  onChange={e => setProfile(p => ({ ...p, differentials: e.target.value }))}
                  placeholder="Ex: Atendimento personalizado"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                <MapPin size={12} className="text-emerald-500" />
                Place ID do Google
                <span className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full ml-1">Importante!</span>
              </label>
              <input
                type="text"
                value={profile.google_place_id}
                onChange={e => setProfile(p => ({ ...p, google_place_id: e.target.value }))}
                placeholder="Ex: ChIJN1t_tDeuEmsRUsoyG83frY4"
                className="w-full border border-emerald-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <p className="text-xs text-gray-400 mt-1">
                Encontre em: <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">Google Place ID Finder</a> — busque seu negócio e copie o ID.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1"><Globe size={11}/> Site</label>
                <input type="text" value={profile.website_url} onChange={e => setProfile(p => ({ ...p, website_url: e.target.value }))} placeholder="https://..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1"><Instagram size={11}/> Instagram</label>
                <input type="text" value={profile.instagram_handle} onChange={e => setProfile(p => ({ ...p, instagram_handle: e.target.value }))} placeholder="@suaempresa" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={!profile.company_name.trim() || profileLoading}
              className={`w-full ${colors.btn} disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2`}
            >
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Salvar Perfil e Continuar
            </button>
          </div>
        );

      // ── ETAPA 2: NPS ─────────────────────────────────────────────────────
      case 'nps':
        return (
          <div className="space-y-4">
            {npsCreated ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">Pesquisa de NPS criada com sucesso! Avançando...</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome da Pesquisa *</label>
                  <input
                    type="text"
                    value={npsName}
                    onChange={e => setNpsName(e.target.value)}
                    placeholder="Ex: Pesquisa de Satisfação Pós-Venda"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição (opcional)</label>
                  <textarea
                    value={npsDescription}
                    onChange={e => setNpsDescription(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2">
                  <Info size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">
                    A pesquisa será criada com campos básicos (nome e WhatsApp). Você pode adicionar perguntas personalizadas depois na tela de <strong>Pesquisas de NPS</strong>.
                    {profile.google_place_id && <span className="block mt-1">✅ O redirecionamento para o Google já será ativado automaticamente com seu Place ID!</span>}
                  </p>
                </div>

                <button
                  onClick={handleCreateNPS}
                  disabled={!npsName.trim() || isSaving}
                  className={`w-full ${colors.btn} disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2`}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                  Criar Pesquisa de NPS
                </button>
              </>
            )}
          </div>
        );

      // ── ETAPA 3: Produtos ─────────────────────────────────────────────────
      case 'products':
        return (
          <div className="space-y-3">
            {productsSaved ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">Produtos salvos com sucesso! Avançando...</p>
              </div>
            ) : (
              <>
                {products.map((prod, idx) => (
                  <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">Produto {idx + 1}</span>
                      {products.length > 1 && (
                        <button onClick={() => setProducts(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={prod.name}
                        onChange={e => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))}
                        placeholder="Nome do produto/serviço *"
                        className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <input
                        type="number"
                        value={prod.value}
                        onChange={e => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, value: e.target.value } : p))}
                        placeholder="Preço (R$)"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      <input
                        type="text"
                        value={prod.description}
                        onChange={e => setProducts(prev => prev.map((p, i) => i === idx ? { ...p, description: e.target.value } : p))}
                        placeholder="Descrição breve"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setProducts(prev => [...prev, { name: '', value: '', description: '' }])}
                  className="w-full border-2 border-dashed border-blue-200 text-blue-500 hover:border-blue-400 hover:bg-blue-50 rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Adicionar outro produto
                </button>

                <button
                  onClick={handleSaveProducts}
                  disabled={!products.some(p => p.name.trim()) || isSaving}
                  className={`w-full ${colors.btn} disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2`}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                  Salvar Produtos e Continuar
                </button>
              </>
            )}
          </div>
        );

      // ── ETAPA 4: Formulário ───────────────────────────────────────────────
      case 'form':
        return (
          <div className="space-y-4">
            {formCreated ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">Formulário criado com sucesso! Avançando...</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do Formulário *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Ex: Formulário de Interesse"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição (opcional)</label>
                  <textarea
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                  />
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
                  <Info size={14} className="text-purple-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-700">
                    O formulário será criado com campos básicos (nome, WhatsApp e e-mail). Você pode adicionar perguntas personalizadas depois na tela de <strong>Formulários</strong>.
                  </p>
                </div>

                <button
                  onClick={handleCreateForm}
                  disabled={!formName.trim() || isSaving}
                  className={`w-full ${colors.btn} disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2`}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  Criar Formulário e Continuar
                </button>
              </>
            )}
          </div>
        );

      // ── ETAPA 5: MBD ─────────────────────────────────────────────────────
      case 'mbd':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-green-800 text-sm flex items-center gap-2">
                <MessageSquare size={16} /> Como conectar o WhatsApp (MBD)
              </h4>
              <ol className="space-y-2 text-sm text-green-700">
                <li className="flex gap-2"><span className="font-bold flex-shrink-0">1.</span> Vá em <strong>Configurações → Integrações</strong> no menu lateral</li>
                <li className="flex gap-2"><span className="font-bold flex-shrink-0">2.</span> Clique em <strong>"Conectar MBD"</strong></li>
                <li className="flex gap-2"><span className="font-bold flex-shrink-0">3.</span> Escaneie o QR Code com o WhatsApp do número do negócio</li>
                <li className="flex gap-2"><span className="font-bold flex-shrink-0">4.</span> Aguarde a confirmação de conexão</li>
              </ol>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Use um número de WhatsApp <strong>dedicado ao negócio</strong>, não o pessoal. Pesquisas enviadas por WhatsApp têm até 3x mais respostas que por e-mail!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { onNavigate('settings'); }}
                className={`${colors.btn} text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm`}
              >
                <ArrowRight size={16} /> Ir para Configurações
              </button>
              <button
                onClick={handleSkipMBD}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <SkipForward size={16} /> Pular por enquanto
              </button>
            </div>
          </div>
        );

      // ── ETAPA 6: Alertas ──────────────────────────────────────────────────
      case 'alerts':
        return (
          <div className="space-y-4">
            {alertsSaved ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">Alertas configurados com sucesso!</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Números de WhatsApp para receber alertas
                  </label>
                  <div className="space-y-2">
                    {alertNumbers.map((num, idx) => (
                      <div key={idx} className="flex gap-2">
                        <div className="flex-1 flex items-center border border-gray-200 rounded-xl overflow-hidden">
                          <span className="px-3 py-2.5 bg-gray-50 text-gray-400 text-sm border-r border-gray-200">
                            <Phone size={14} />
                          </span>
                          <input
                            type="tel"
                            value={num}
                            onChange={e => setAlertNumbers(prev => prev.map((n, i) => i === idx ? e.target.value : n))}
                            placeholder="(11) 99999-9999"
                            className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                          />
                        </div>
                        {alertNumbers.length > 1 && (
                          <button onClick={() => setAlertNumbers(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 transition-colors px-2">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setAlertNumbers(prev => [...prev, ''])}
                      className="text-orange-500 hover:text-orange-600 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Plus size={12} /> Adicionar outro número
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Quais alertas ativar?</label>
                  <div className="space-y-2">
                    {[
                      { key: 'newLead', label: 'Novo lead (formulário preenchido)', value: alertNewLead, set: setAlertNewLead },
                      { key: 'detractor', label: 'Detrator (nota baixa no NPS)', value: alertDetractor, set: setAlertDetractor },
                      { key: 'highValue', label: 'Lead de alto valor', value: alertHighValue, set: setAlertHighValue },
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                        <div
                          onClick={() => item.set(!item.value)}
                          className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${item.value ? 'bg-orange-500' : 'bg-gray-200'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSaveAlerts}
                  disabled={isSaving}
                  className={`w-full ${colors.btn} disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2`}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                  Salvar Alertas e Concluir
                </button>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ── Modal de conclusão ────────────────────────────────────────────────────
  if (showCompletionModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuração Concluída! 🎉</h2>
          <p className="text-gray-500 mb-2">
            Parabéns, <strong>{companyName}</strong>! Você configurou tudo que precisa para começar a usar o HelloGrowth.
          </p>
          <p className="text-gray-400 text-sm mb-8">
            Agora é só começar a coletar avaliações, captar leads e acompanhar os resultados!
          </p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {steps.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2 bg-emerald-50 rounded-xl p-2.5">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-700 truncate">{s.title}</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={onComplete}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Zap size={18} /> Ir para o Dashboard
          </button>
        </div>
      </div>
    );
  }

  const colors = colorMap[currentStep?.color || 'emerald'];
  const StepIcon = currentStep?.icon || Building2;

  // ── Layout principal do modal ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
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
          <div className="flex-1 mx-8 max-w-xs hidden sm:block">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Progresso</span>
              <span className="text-xs font-semibold text-emerald-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button
            onClick={() => { if (confirm('Sair da configuração? Você pode retomar depois em Ajuda → Configuração Inicial.')) onComplete(); }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar de steps */}
          <div className="w-52 bg-gray-50 border-r border-gray-100 flex-shrink-0 overflow-y-auto py-4 px-3 hidden sm:block">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = completedSteps.has(step.id);
              const isCurrent = idx === currentStepIndex;
              const c = colorMap[step.color];
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 transition-all text-left ${
                    isCurrent ? `bg-white shadow-sm ${c.border} border` : isDone ? 'hover:bg-white' : 'hover:bg-white'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-emerald-500' : isCurrent ? c.bg : 'bg-gray-200'}`}>
                    {isDone ? <Check size={13} className="text-white" /> : <Icon size={13} className={isCurrent ? 'text-white' : 'text-gray-400'} />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${isCurrent ? c.text : isDone ? 'text-emerald-600' : 'text-gray-500'}`}>{step.title}</p>
                    <p className="text-xs text-gray-400 truncate">{isDone ? 'Concluído ✓' : isCurrent ? 'Em andamento' : 'Pendente'}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Conteúdo central */}
          <div className="flex-1 flex overflow-hidden">

            {/* Formulário da etapa */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Header da etapa */}
              <div className={`${colors.light} rounded-xl p-4 mb-5 flex items-center gap-3`}>
                <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <StepIcon size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Etapa {currentStepIndex + 1} de {totalSteps}</p>
                  <h2 className="font-bold text-gray-900">{currentStep?.title}</h2>
                  <p className="text-xs text-gray-500">{currentStep?.subtitle}</p>
                </div>
                {completedSteps.has(currentStep?.id) && (
                  <div className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                    <Check size={11} /> Concluído
                  </div>
                )}
              </div>

              {/* Conteúdo da etapa */}
              {renderStepContent()}

              {/* Navegação entre etapas */}
              <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100">
                {currentStepIndex > 0 && (
                  <button onClick={() => setCurrentStepIndex(i => i - 1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    <ChevronLeft size={16} /> Anterior
                  </button>
                )}
                {currentStepIndex < totalSteps - 1 && (
                  <button onClick={() => setCurrentStepIndex(i => i + 1)} className="ml-auto flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    Próxima <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Chat com a Giulia */}
            <div className="w-72 bg-white border-l border-gray-100 flex flex-col flex-shrink-0 hidden lg:flex">
              <div className="p-3 border-b border-gray-100 flex items-center gap-2.5 flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Giulia</p>
                  <p className="text-xs text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" /> Assistente de configuração
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {aiMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 mr-1.5 mt-1">
                        <Bot size={10} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-emerald-500 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                      {msg.content.split('\n').map((line, i) => {
                        const bold = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        return <p key={i} className={i > 0 ? 'mt-1' : ''} dangerouslySetInnerHTML={{ __html: bold }} />;
                      })}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 mr-1.5 mt-1">
                      <Bot size={10} className="text-white" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2.5">
                      <div className="flex gap-1">
                        {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-2.5 border-t border-gray-100 flex-shrink-0">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAiChat()}
                    placeholder="Pergunte algo..."
                    className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-300 placeholder-gray-400"
                  />
                  <button
                    onClick={handleAiChat}
                    disabled={!userInput.trim() || isAiTyping}
                    className="w-8 h-8 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
