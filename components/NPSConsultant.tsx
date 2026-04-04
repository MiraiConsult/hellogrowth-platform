'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { 
  X, 
  Sparkles,
  Target,
  CheckCircle,
  Loader2,
  Wand2,
  Edit3,
  Plus,
  Trash2,
  GripVertical, ArrowUp, ArrowDown,
  Send,
  Bot,
  User,
  Star,
  Palette,
  MessageSquare
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';

interface QuestionOption {
  id: string;
  text: string;
  followUpLabel?: string;
}

interface GeneratedQuestion {
  id: string;
  text: string;
  type: 'nps' | 'single_choice' | 'multiple_choice' | 'text';
  options: QuestionOption[];
  insight: string;
  conditional?: 'promoter' | 'passive' | 'detractor';
}

interface NPSConsultantProps {
  supabase: SupabaseClient | null;
  userId: string;
  onClose: () => void;
  onSaveCampaign: (campaignData: any) => void;
  existingCampaign?: any;
  initialBusinessProfile?: any;
  startInManualMode?: boolean;
}

type ConsultantStep = 
  | 'welcome' 
  | 'objective' 
  | 'tone'
  | 'evaluation_points'
  | 'initial_fields'
  | 'google_redirect'
  | 'google_place_id'
  | 'prize_config'
  | 'messages'
  | 'generation' 
  | 'review' 
  | 'complete';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  options?: { label: string; value: string; icon?: any }[];
}

export default function NPSConsultant({
  supabase,
  userId,
  onClose,
  onSaveCampaign,
  existingCampaign,
  initialBusinessProfile,
  startInManualMode = false
}: NPSConsultantProps) {
  const tenantId = useTenantId();
  
  const [currentStep, setCurrentStep] = useState<ConsultantStep>('welcome');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [businessProfile, setBusinessProfile] = useState<any>(initialBusinessProfile || null);
  const [profileLoaded, setProfileLoaded] = useState(!!initialBusinessProfile);
  const [objective, setObjective] = useState('');
  const [tone, setTone] = useState('');
  const [evaluationPoints, setEvaluationPoints] = useState<string[]>([]);
  const [initialFields, setInitialFields] = useState<any[]>([
    { field: 'name', label: 'Nome', placeholder: 'Digite seu nome', required: true, enabled: true },
    { field: 'email', label: 'E-mail', placeholder: 'Digite seu e-mail', required: true, enabled: true },
    { field: 'phone', label: 'Telefone', placeholder: 'Digite seu telefone', required: false, enabled: true }
  ]);
  const [googleRedirect, setGoogleRedirect] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [offerPrize, setOfferPrize] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [beforeGoogleMessage, setBeforeGoogleMessage] = useState('');
  const [afterGameMessage, setAfterGameMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Estados para o Chat de Ajuste na tela de revisão
  const [reviewChatMessages, setReviewChatMessages] = useState<ChatMessage[]>([]);
  const [reviewChatInput, setReviewChatInput] = useState('');
  const [isReviewChatProcessing, setIsReviewChatProcessing] = useState(false);
  const [showReviewChat, setShowReviewChat] = useState(true);
  const strategyExplanationGenerated = useRef(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (supabase && tenantId) {
      loadAvailableGames();
      // Só busca o perfil se não foi passado como prop
      if (!initialBusinessProfile) {
        loadBusinessProfile();
      }
    }
  }, [supabase, tenantId]);
  // Sincronizar businessProfile quando initialBusinessProfile muda
  useEffect(() => {
    if (initialBusinessProfile) {
      setBusinessProfile(initialBusinessProfile);
      setProfileLoaded(true);
    }
  }, [initialBusinessProfile]);

  // Mensagem inicial do chat de ajuste quando entra na tela de revisão
  useEffect(() => {
    if (currentStep === 'review' && !strategyExplanationGenerated.current && generatedQuestions.length > 0) {
      console.log('[NPSReviewChat] Gerando explicação estratégica...');
      strategyExplanationGenerated.current = true;
      generateStrategyExplanation();
    }
  }, [currentStep, generatedQuestions.length]);

  const loadAvailableGames = async () => {
    try {
      const response = await fetch('/api/games', {
        headers: { 'x-tenant-id': tenantId || '' }
      });
      if (response.ok) {
        const games = await response.json();
        setAvailableGames(games.filter((g: any) => g.status === 'active'));
      }
    } catch (error) {
      console.error('Erro ao carregar games:', error);
    }
  };

  const loadBusinessProfile = async () => {
    if (!supabase || !tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('business_profile')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
      
      if (data && !error) {
        setBusinessProfile(data);
      }
      setProfileLoaded(true);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      setProfileLoaded(true);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

   // Carregar campanha existente para edição
  useEffect(() => {
    if (existingCampaign && existingCampaign.questions) {
      console.log('Carregando campanha existente:', existingCampaign);
      
      // Mapear perguntas existentes
      const loadedQuestions = existingCampaign.questions.map((q: any, idx: number) => {
        let processedOptions: { id: string; text: string }[] = [];
        
        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          processedOptions = q.options.map((opt: any, optIdx: number) => {
            if (typeof opt === 'string') {
              return { id: `opt_${idx}_${optIdx}`, text: opt };
            }
            return {
              id: opt.id || `opt_${idx}_${optIdx}`,
              text: opt.text || opt.label || ''
            };
          }).filter((opt: any) => opt.text.trim() !== '');
        }
        
        return {
          id: q.id || `q_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
          text: q.text || '',
          type: q.type || 'text',
          options: processedOptions,
          insight: q.insight || '',
          conditional: q.conditional
        };
      });
      
      setGeneratedQuestions(loadedQuestions);
      setObjective(existingCampaign.objective || 'satisfacao_geral');
      setTone(existingCampaign.tone || 'friendly');
      setGoogleRedirect(existingCampaign.google_redirect || existingCampaign.enableRedirection || false);
      setGooglePlaceId(existingCampaign.google_place_id || '');
      setOfferPrize(existingCampaign.offer_prize || false);
      setSelectedGameId((existingCampaign as any).game_id || '');
      setShowLogo((existingCampaign as any).show_logo || false);
      setBeforeGoogleMessage(existingCampaign.before_google_message || '');
      setAfterGameMessage(existingCampaign.after_game_message || '');
      setCampaignName(existingCampaign.name || '');
      if (existingCampaign.initial_fields || existingCampaign.initialFields) {
        setInitialFields(existingCampaign.initial_fields || existingCampaign.initialFields);
      }
    }
  }, [existingCampaign]);

  useEffect(() => {
    if (currentStep !== 'welcome' || hasInitialized.current) return;

    if (existingCampaign) {
      // Modo de edição - pode disparar imediatamente
      hasInitialized.current = true;
      setTimeout(() => {
        addAssistantMessage(
          `Olá! 👋 Você está editando a campanha **${existingCampaign.name || 'Sem título'}**.

O que você gostaria de fazer?`,
          [
            { label: '🎨 Mudar tom das perguntas', value: 'edit_tone', icon: Palette },
            { label: '✏️ Editar perguntas', value: 'edit_questions', icon: Edit3 }
          ]
        );
      }, 300);
    } else if (profileLoaded) {
      // Modo de criação - só dispara após o perfil ter sido carregado (ou falhar)
      hasInitialized.current = true;
      
      if (startInManualMode) {
        // Modo manual: vai direto para a tela de revisão com campanha em branco
        setTimeout(() => {
          setGeneratedQuestions([
            {
              id: `nps_${Date.now()}`,
              text: 'De 0 a 10, qual a probabilidade de você nos recomendar a um amigo ou familiar?',
              type: 'nps',
              options: [],
              insight: 'Pergunta NPS padrão'
            }
          ]);
          setCurrentStep('review');
        }, 100);
      } else {
        setTimeout(() => {
          addAssistantMessage(
            businessProfile 
              ? `Olá! 👋 Sou seu consultor de crescimento da **${businessProfile.company_name || 'sua empresa'}**.

Como já conheço seu negócio, vou criar perguntas estratégicas baseadas no seu perfil.

Vamos criar uma pesquisa NPS que transforma feedback em crescimento?`
              : `Olá! 👋 Vou te ajudar a criar uma pesquisa NPS personalizada.

Vamos começar?`,
            [
              { label: '✨ Usar meu perfil e começar!', value: 'start', icon: Sparkles }
            ]
          );
        }, 300);
      }
    }
  }, [currentStep, businessProfile, existingCampaign, profileLoaded]);

  const addAssistantMessage = (content: string, options?: { label: string; value: string; icon?: any }[]) => {
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        role: 'assistant',
        content,
        timestamp: new Date(),
        options
      }]);
      setIsTyping(false);
    }, 500);
  };

  const addUserMessage = (content: string) => {
    setChatMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }]);
  };

  const handleOptionClick = (value: string, label: string) => {
    addUserMessage(label);

    if (value === 'edit_tone') {
      // Modo de edição: alterar tom das perguntas
      setCurrentStep('tone');
      addAssistantMessage(
        'Qual novo tom você prefere para as perguntas?',
        [
          { label: '🎯 Direto e objetivo', value: 'direto' },
          { label: '😊 Amigável e acolhedor', value: 'amigavel' },
          { label: '💼 Profissional', value: 'profissional' },
          { label: '🤝 Informal e descontraído', value: 'informal' }
        ]
      );
    } else if (value === 'edit_questions') {
      // Modo de edição: editar perguntas manualmente
      setCurrentStep('review');
      addAssistantMessage(
        `✅ **Perfeito!** Aqui estão as perguntas da sua campanha.\n\nVocê pode **editar** o texto das perguntas, **modificar** as opções de resposta, **mudar o tipo**, **adicionar** novas perguntas ou **remover** as que não quiser.\n\nQuando estiver satisfeito, clique em Salvar!`
      );
    } else if (value === 'start') {
      setCurrentStep('objective');
      addAssistantMessage(
        'Qual é o objetivo principal desta pesquisa NPS?',
        [
          { label: '📊 Medir satisfação geral', value: 'satisfacao_geral', icon: Target },
          { label: '🎯 Avaliar serviço específico', value: 'servico_especifico', icon: Star },
          { label: '📦 Pesquisa pós-venda', value: 'pos_venda', icon: CheckCircle },
          { label: '🎉 Avaliar experiência em evento', value: 'evento', icon: Sparkles },
          { label: '✍️ Outro objetivo', value: 'outro', icon: Edit3 }
        ]
      );
    } else if (currentStep === 'objective') {
      handleObjectiveSelection(value, label);
    } else if (currentStep === 'tone') {
      handleToneSelection(value, label);
    } else if (currentStep === 'evaluation_points' && value === 'ai_suggestions') {
      handleAISuggestions();
    } else if (currentStep === 'initial_fields') {
      handleInitialFieldsSelection(value);
    } else if (currentStep === 'google_redirect') {
      handleGoogleRedirectSelection(value);
    } else if (currentStep === 'prize_config') {
      handlePrizeSelection(value);
    }
  };

  const handleObjectiveSelection = (value: string, label: string) => {
    const objectiveTexts: Record<string, string> = {
      'satisfacao_geral': 'Medir satisfação geral dos clientes',
      'servico_especifico': 'Avaliar um serviço específico',
      'pos_venda': 'Pesquisa pós-venda',
      'evento': 'Avaliar experiência em um evento'
    };
    
    if (value === 'outro') {
      addAssistantMessage('Por favor, descreva o objetivo da sua pesquisa NPS:');
    } else {
      const selectedText = objectiveTexts[value];
      setObjective(selectedText);
      setCurrentStep('tone');
      addAssistantMessage(
        'Qual tom você prefere para as perguntas?',
        [
          { label: '🎯 Direto e objetivo', value: 'direto' },
          { label: '😊 Amigável e acolhedor', value: 'amigavel' },
          { label: '💼 Profissional', value: 'profissional' },
          { label: '🤝 Informal e descontraído', value: 'informal' }
        ]
      );
    }
  };

  const handleToneSelection = (value: string, label: string) => {
    const toneTexts: Record<string, string> = {
      'direto': 'Direto e objetivo',
      'amigavel': 'Amigável e acolhedor',
      'profissional': 'Profissional',
      'informal': 'Informal e descontraído'
    };
    
    const selectedText = toneTexts[value];
    setTone(selectedText);
    
    // Se está em modo de edição (tem perguntas existentes), regenerar com novo tom
    if (existingCampaign && generatedQuestions.length > 0) {
      addAssistantMessage(
        `✅ Tom alterado para **${selectedText}**!

Vou regenerar as perguntas com o novo tom. Um momento...`
      );
      
      // Regenerar perguntas com novo tom
      setTimeout(() => {
        startGeneration();
      }, 1000);
    } else {
      // Modo de criação normal
      setCurrentStep('evaluation_points');
      addAssistantMessage(
        'Quais pontos você quer avaliar na pesquisa?\n\n(Digite separados por vírgula ou use as sugestões da IA)',
        [
          { label: '✨ Usar sugestões da IA', value: 'ai_suggestions', icon: Sparkles }
        ]
      );
    }
  };

  const handleAISuggestions = () => {
    const suggestions = ['Atendimento', 'Qualidade do serviço', 'Tempo de resposta', 'Custo-benefício'];
    setEvaluationPoints(suggestions);
    setCurrentStep('initial_fields');
    addAssistantMessage(
      `Perfeito! Vou focar nestes pontos:\n• ${suggestions.join('\n• ')}\n\n📋 Agora, quais informações você quer coletar dos clientes no início da pesquisa?`,
      [
        { label: '👤 Nome + E-mail + Telefone', value: 'all' },
        { label: '👤 Nome + E-mail', value: 'name_email' },
        { label: '👤 Nome + Telefone', value: 'name_phone' },
        { label: '👤 Apenas Nome', value: 'name_only' },
        { label: '⚙️ Configurar manualmente', value: 'custom' }
      ]
    );
  };

  const handleInitialFieldsSelection = (value: string) => {
    if (value === 'all') {
      setInitialFields([
        { field: 'name', label: 'Nome', placeholder: 'Digite seu nome', required: true, enabled: true },
        { field: 'email', label: 'E-mail', placeholder: 'Digite seu e-mail', required: true, enabled: true },
        { field: 'phone', label: 'Telefone', placeholder: 'Digite seu telefone', required: true, enabled: true }
      ]);
    } else if (value === 'name_email') {
      setInitialFields([
        { field: 'name', label: 'Nome', placeholder: 'Digite seu nome', required: true, enabled: true },
        { field: 'email', label: 'E-mail', placeholder: 'Digite seu e-mail', required: true, enabled: true },
        { field: 'phone', label: 'Telefone', placeholder: 'Digite seu telefone', required: false, enabled: false }
      ]);
    } else if (value === 'name_phone') {
      setInitialFields([
        { field: 'name', label: 'Nome', placeholder: 'Digite seu nome', required: true, enabled: true },
        { field: 'email', label: 'E-mail', placeholder: 'Digite seu e-mail', required: false, enabled: false },
        { field: 'phone', label: 'Telefone', placeholder: 'Digite seu telefone', required: true, enabled: true }
      ]);
    } else if (value === 'name_only') {
      setInitialFields([
        { field: 'name', label: 'Nome', placeholder: 'Digite seu nome', required: true, enabled: true },
        { field: 'email', label: 'E-mail', placeholder: 'Digite seu e-mail', required: false, enabled: false },
        { field: 'phone', label: 'Telefone', placeholder: 'Digite seu telefone', required: false, enabled: false }
      ]);
    } else if (value === 'custom') {
      // TODO: Implementar tela de configuração customizada
      addAssistantMessage('✏️ Você poderá personalizar os campos de identificação diretamente na tela de edição da pesquisa, na etapa de Revisão.');
      setInitialFields([
        { field: 'name', label: 'Nome', placeholder: 'Digite seu nome', required: true, enabled: true },
        { field: 'email', label: 'E-mail', placeholder: 'Digite seu e-mail', required: true, enabled: true },
        { field: 'phone', label: 'Telefone', placeholder: 'Digite seu telefone', required: false, enabled: false }
      ]);
    }
    
    setCurrentStep('google_redirect');
    addAssistantMessage(
      '✅ Campos configurados!\n\nQuer redirecionar os clientes para avaliarem no Google após a pesquisa?',
      [
        { label: '✅ Sim', value: 'yes', icon: CheckCircle },
        { label: '❌ Não', value: 'no', icon: X }
      ]
    );
  };

  const handleGoogleRedirectSelection = (value: string) => {
    if (value === 'yes') {
      setGoogleRedirect(true);
      
      // Verificar se já tem Place ID no business_profile
      if (businessProfile?.google_place_id) {
        setGooglePlaceId(businessProfile.google_place_id);
        setCurrentStep('prize_config');
        addAssistantMessage(
          `✅ Usando Place ID cadastrado: **${businessProfile.google_place_id}**\n\nQuer oferecer um prêmio (Roleta da Sorte) para incentivar a avaliação?`,
          [
            { label: '🎁 Sim, com prêmio', value: 'yes' },
            { label: '📝 Não, sem prêmio', value: 'no' }
          ]
        );
      } else {
        addAssistantMessage('⚠️ **Place ID não cadastrado** no perfil do negócio.\n\nPor favor, cadastre o Place ID nas configurações do perfil antes de criar a pesquisa NPS com redirecionamento para o Google.');
        setGoogleRedirect(false);
        setCurrentStep('generation');
        startGeneration();
      }
    } else {
      setGoogleRedirect(false);
      setCurrentStep('generation');
      startGeneration();
    }
  };

  const handlePrizeSelection = (value: string) => {
    if (value === 'yes') {
      setOfferPrize(true);
      
      // Mostrar lista de games disponíveis
      if (availableGames.length > 0) {
        const gameOptions = availableGames.map(game => ({
          label: `🎰 ${game.name}`,
          value: game.id
        }));
        
        addAssistantMessage(
          'Selecione qual Roleta da Sorte você quer usar:',
          [...gameOptions, { label: '➕ Criar nova roleta', value: 'create_new' }]
        );
      } else {
        addAssistantMessage(
          '⚠️ Você ainda não tem nenhuma Roleta da Sorte configurada.\n\nPor favor, acesse **HelloRating > Roleta da Sorte** para criar uma roleta antes de continuar.',
          [{ label: '🔙 Voltar e continuar sem prêmio', value: 'no' }]
        );
      }
    } else if (value === 'no') {
      setOfferPrize(false);
      addAssistantMessage('Escreva a mensagem que aparecerá **antes de redirecionar** para o Google:\n\n💡 Exemplo: "Obrigado! Agora nos avalie no Google para ajudar outros clientes."\n\n_(Deixe em branco para usar mensagem padrão)_');
    } else if (value === 'create_new') {
      addAssistantMessage(
        '⚠️ Para criar uma nova roleta, acesse **HelloRating > Roleta da Sorte** no menu.\n\nPor enquanto, vou continuar sem prêmio.',
        [{ label: '✅ Continuar', value: 'no' }]
      );
    } else {
      // value é o game_id selecionado
      setSelectedGameId(value);
      const selectedGame = availableGames.find(g => g.id === value);
      addAssistantMessage(`✅ Roleta selecionada: **${selectedGame?.name}**\n\nAgora escreva a mensagem que aparecerá **DEPOIS do jogo**, antes de redirecionar para o Google:\n\n💡 Exemplo: "Parabéns! Para liberar seu prêmio, nos avalie no Google na próxima tela."\n\n_(Deixe em branco para usar mensagem padrão)_`);
    }
  };

  const handleUserInput = () => {
    if (!userInput.trim()) return;
    
    const message = userInput.trim();
    addUserMessage(message);
    setUserInput('');

    if (currentStep === 'objective' && objective === '') {
      setObjective(message);
      setCurrentStep('tone');
      addAssistantMessage(
        'Qual tom você prefere para as perguntas?',
        [
          { label: '🎯 Direto e objetivo', value: 'direto' },
          { label: '😊 Amigável e acolhedor', value: 'amigavel' },
          { label: '💼 Profissional', value: 'profissional' },
          { label: '🤝 Informal e descontraído', value: 'informal' }
        ]
      );
    } else if (currentStep === 'evaluation_points') {
      const points = message.split(',').map(p => p.trim()).filter(p => p);
      setEvaluationPoints(points);
      setCurrentStep('initial_fields');
      addAssistantMessage(
        `Perfeito! Vou focar nestes pontos:\n• ${points.join('\n• ')}\n\n📋 Agora, quais informações você quer coletar dos clientes no início da pesquisa?`,
        [
          { label: '👤 Nome + E-mail + Telefone', value: 'all' },
          { label: '👤 Nome + E-mail', value: 'name_email' },
          { label: '👤 Nome + Telefone', value: 'name_phone' },
          { label: '👤 Apenas Nome', value: 'name_only' },
          { label: '⚙️ Configurar manualmente', value: 'custom' }
        ]
      );
    } else if (currentStep === 'google_place_id') {
      setGooglePlaceId(message);
      setCurrentStep('prize_config');
      addAssistantMessage(
        'Quer oferecer um prêmio (Roleta da Sorte) para incentivar a avaliação?',
        [
          { label: '🎁 Sim, com prêmio', value: 'yes' },
          { label: '📝 Não, sem prêmio', value: 'no' }
        ]
      );
    } else if (currentStep === 'prize_config' && offerPrize && !afterGameMessage) {
      const finalMessage = message || 'Parabéns pelo seu prêmio! Para liberá-lo, nos avalie no Google na próxima tela.';
      setAfterGameMessage(finalMessage);
      setCurrentStep('generation');
      startGeneration();
    } else if (currentStep === 'prize_config' && !offerPrize && !beforeGoogleMessage) {
      const finalMessage = message || 'Obrigado pelo seu feedback! Agora nos avalie no Google para ajudar outros clientes.';
      setBeforeGoogleMessage(finalMessage);
      setCurrentStep('generation');
      startGeneration();
    }
  };

  const startGeneration = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const prompt = `Você é um especialista em Customer Experience (CX) e Retenção de Clientes.
Sua missão é criar uma pesquisa NPS que não apenas meça uma nota, mas identifique os "Drivers de Lealdade" do negócio.

CONTEXTO:
- Negócio: ${businessProfile?.company_name || 'Empresa'}
- Descrição: ${businessProfile?.description || 'Não informado'}
- Objetivo da Pesquisa: ${objective}
- Tom de Voz: ${tone}
- Pontos que o dono quer avaliar: ${evaluationPoints.join(', ')}

SUA ESTRATÉGIA:
1. Identifique os 3 pilares críticos para o sucesso deste tipo de negócio (ex: se for restaurante, é sabor/atendimento/ambiente).
2. A primeira pergunta DEVE ser do tipo "nps" (0-10). O texto dela será substituído automaticamente pelo padrão fixo, então escreva qualquer texto genérico para ela.
3. Crie 3 perguntas complementares que investiguem esses pilares críticos de forma geral, sem segmentar por tipo de respondente.

REGRAS:
- Use o tom ${tone}.
- O campo 'insight' deve explicar qual pilar de retenção está sendo medido.
- NÃO use o campo 'conditional' — todas as perguntas são exibidas para todos os respondentes.
- Retorne APENAS JSON válido com este formato:
{
  "questions": [
    {
      "text": "texto da pergunta",
      "type": "nps" | "single_choice" | "multiple_choice" | "text",
      "options": ["opção 1", "opção 2"],
      "insight": "Pilar de Retenção: Por que isso é vital para manter o cliente?"
    }
  ]
}`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', errorData);
        throw new Error('Erro na API');
      }

      const data = await response.json();
      
      console.log('API Response:', data);
      
      // A API retorna o campo 'response' em vez de 'text'
      const responseText = data.response || data.text;
      
      // Validar se responseText existe
      if (!data || !responseText) {
        console.error('Invalid API response:', data);
        throw new Error('Resposta da API inválida');
      }
      
      // Tentar extrair JSON do texto se vier com markdown
      let jsonText = responseText;
      if (typeof jsonText === 'string' && jsonText.includes('```json')) {
        jsonText = jsonText.split('```json')[1].split('```')[0].trim();
      } else if (typeof jsonText === 'string' && jsonText.includes('```')) {
        jsonText = jsonText.split('```')[1].split('```')[0].trim();
      }
      
      console.log('JSON Text to parse:', jsonText);
      
      const parsed = JSON.parse(jsonText);
      
      // Validar estrutura do JSON
      if (!parsed || !parsed.questions || !Array.isArray(parsed.questions)) {
        console.error('Invalid JSON structure:', parsed);
        throw new Error('Estrutura JSON inválida');
      }
      
      const questions: GeneratedQuestion[] = parsed.questions.map((q: any, index: number) => ({
        id: `q_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 5)}`,
        text: q.text,
        type: q.type,
        options: q.options ? q.options.map((opt: string, i: number) => ({
          id: `opt_${Date.now()}_${index}_${i}_${Math.random().toString(36).slice(2, 5)}`,
          text: opt
        })) : [],
        insight: q.insight,
        conditional: q.conditional
      }));

      // Garantir que a pergunta NPS seja sempre a primeira
      const npsQuestion = questions.find(q => q.type === 'nps');
      const otherQuestions = questions.filter(q => q.type !== 'nps');
      const orderedQuestions = npsQuestion ? [npsQuestion, ...otherQuestions] : questions;
      // Sempre usar o texto padrão fixo para a pergunta NPS, independente do tom
      const companyName = businessProfile?.company_name || 'nossa empresa';
      const npsFixedText = `Em uma escala de 0 a 10, o quanto você recomendaria a ${companyName} para amigos ou familiares?`;
      const finalQuestions = orderedQuestions.map(q => {
        if (q.type === 'nps') {
          return { ...q, text: npsFixedText };
        }
        return q;
      });
      setGeneratedQuestions(finalQuestions);
      setCurrentStep('review');
      setCampaignName(`Pesquisa NPS - ${objective}`);
    } catch (error) {
      console.error('Erro ao gerar perguntas:', error);
      addAssistantMessage('❌ Erro ao gerar perguntas. Tente novamente.');
      setCurrentStep('evaluation_points');
    } finally {
      setIsGenerating(false);
    }
  };

  // Função para gerar explicação estratégica inicial no chat de revisão
  const generateStrategyExplanation = async () => {
    setIsReviewChatProcessing(true);
    try {
      const prompt = `Você é o Consultor IA da HelloGrowth, especialista em NPS e satisfação de clientes.

Contexto da pesquisa criada:
- Objetivo: ${objective}
- Tom: ${tone}
- Pontos de avaliação: ${evaluationPoints.join(', ')}
- Total de perguntas geradas: ${generatedQuestions.length}
- Perguntas: ${generatedQuestions.map((q, i) => `${i+1}. ${q.text}`).join(' | ')}

Retorne APENAS este JSON (sem markdown, sem texto fora do JSON):
{
  "action": "reply",
  "message": "[Saudação curta e animada (1-2 frases). Diga que criou ${generatedQuestions.length} perguntas estratégicas baseadas nos pontos de avaliação. Convide para pedir ajustes ou tirar dúvidas. Máximo 3 frases. Tom descontraído e profissional.]"
}`;

      console.log('[NPSReviewChat DEBUG] Preparando chamada para /api/gemini...');
      
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      
      console.log('[NPSReviewChat DEBUG] Resposta recebida. Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        let rawText = (data.response || data.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        let welcomeText = '';
        try {
          const parsed = JSON.parse(rawText);
          welcomeText = parsed.message || '';
        } catch (e) {
          welcomeText = rawText;
        }
        const welcomeMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: welcomeText || `Olá! 👋 Criei ${generatedQuestions.length} perguntas estratégicas para sua pesquisa NPS. Pode pedir qualquer ajuste — alterar texto, adicionar/remover perguntas ou opções, mudar o tom, etc.`,
          timestamp: new Date()
        };
        setReviewChatMessages([welcomeMessage]);
      } else {
        setReviewChatMessages([{
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `Olá! 👋 Criei ${generatedQuestions.length} perguntas para sua pesquisa NPS. Pode pedir qualquer ajuste diretamente aqui!`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setReviewChatMessages([{
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `Olá! 👋 Criei ${generatedQuestions.length} perguntas para sua pesquisa NPS. Pode pedir qualquer ajuste diretamente aqui!`,
        timestamp: new Date()
      }]);
    } finally {
      setIsReviewChatProcessing(false);
    }
  };

  // Função para processar mensagens do Chat de Ajuste
  const handleReviewChatMessage = async (message: string) => {
    if (!message.trim()) return;

    // Adiciona mensagem do usuário
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setReviewChatMessages(prev => [...prev, userMessage]);
    setReviewChatInput('');
    setIsReviewChatProcessing(true);

    try {
      // Prompt unificado e inteligente — a IA decide sozinha se deve ou não modificar as perguntas
      const questionsJson = JSON.stringify(generatedQuestions.map((q, idx) => ({
        index: idx + 1,
        text: q.text,
        type: q.type,
        options: q.options.map(opt => opt.text),
        insight: q.insight,
        conditional: q.conditional
      })), null, 2);

      const prompt = `Você é o Consultor IA da HelloGrowth, especialista em pesquisas NPS e satisfação de clientes. Você é PROATIVO e EXECUTA mudanças diretamente quando solicitado.

CONTEXTO DA PESQUISA:
- Objetivo: ${objective}
- Tom: ${tone}
- Pontos de avaliação: ${evaluationPoints.join(', ')}
- Total de perguntas: ${generatedQuestions.length}

PERGUNTAS ATUAIS:
${questionsJson}

MENSAGEM DO USUÁRIO: "${message}"

INSTRUÇÕES:
Analise a mensagem e decida:

(A) Se o usuário está PEDINDO UMA MUDANÇA (alterar texto, adicionar/remover pergunta, adicionar/remover opção, mudar tipo, reescrever, traduzir, deixar mais formal/informal, etc.) → retorne JSON com as mudanças aplicadas:
{
  "action": "update",
  "message": "[Confirmação curta do que foi feito, 1 frase]",
  "updated_questions": [
    {"text": "...", "type": "single_choice|multiple_choice|text|nps", "options": ["op1", "op2"], "insight": "...", "conditional": null},
    ... TODAS as ${generatedQuestions.length} perguntas, com as modificações aplicadas
  ]
}

(B) Se o usuário está FAZENDO UMA PERGUNTA sobre as perguntas, pedindo explicação, ou conversando → retorne JSON de resposta:
{
  "action": "reply",
  "message": "[Resposta clara e útil, máximo 3 frases]"
}

REGRAS CRÍTICAS:
- SEMPRE retorne JSON válido. NUNCA retorne texto puro.
- Para mudanças: o array updated_questions DEVE conter TODAS as ${generatedQuestions.length} perguntas
- Para mudanças de remoção: updated_questions terá menos itens (isso é correto)
- Para adição de pergunta: updated_questions terá mais itens
- NÃO use blocos de código markdown
- NÃO escreva nada fora do JSON
- Interprete intenções vagas: "deixa mais simples" = simplifique o texto; "coloca mais opções" = adicione alternativas; "tira essa" = remova a pergunta mencionada
- Se o usuário mencionar número ("pergunta 3"), use o índice correto (index 3 = posição 2 no array)

Retorne APENAS o JSON:`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Erro na resposta da IA');
      }

      const data = await response.json();
      let rawText = data.response || '';
      
      // Limpar blocos de código markdown se a IA retornar
      rawText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      let displayMessage = '';
      let updatedQuestions = null;
      
      // Parsear JSON (o novo prompt sempre retorna JSON)
      try {
        const parsed = JSON.parse(rawText);
        displayMessage = parsed.message || '';
        
        if (parsed.action === 'update' && parsed.updated_questions && Array.isArray(parsed.updated_questions)) {
          updatedQuestions = parsed.updated_questions;
        }
      } catch (e) {
        // Fallback: a IA retornou texto puro (não deveria acontecer com o novo prompt)
        displayMessage = rawText;
      }
      
      // Aplicar perguntas atualizadas
      if (updatedQuestions && Array.isArray(updatedQuestions) && updatedQuestions.length > 0) {
        const mapped = updatedQuestions.map((q: any, idx: number) => {
          let processedOptions: QuestionOption[] = [];
          if (q.options && Array.isArray(q.options)) {
            processedOptions = q.options.map((opt: any, optIdx: number) => {
              if (typeof opt === 'string') {
                return { id: `opt_${Date.now()}_${idx}_${optIdx}_${Math.random().toString(36).slice(2,5)}`, text: opt };
              } else if (opt && opt.text) {
                return { id: opt.id || `opt_${Date.now()}_${idx}_${optIdx}_${Math.random().toString(36).slice(2,5)}`, text: opt.text };
              }
              return { id: `opt_${Date.now()}_${idx}_${optIdx}_${Math.random().toString(36).slice(2,5)}`, text: String(opt) };
            });
          }
          
          // Preservar o ID original se existir (para perguntas que não foram modificadas)
          const originalQuestion = generatedQuestions[idx];
          return {
            id: originalQuestion?.id || `q_${Date.now()}_${idx}`,
            text: q.text || '',
            type: q.type || 'single_choice',
            options: processedOptions,
            insight: q.insight || originalQuestion?.insight || 'Atualizado via IA',
            conditional: q.conditional || undefined
          };
        });
        
        setGeneratedQuestions(mapped);
        displayMessage = (displayMessage || 'Pronto!') + ' ✅';
      }

      // Adicionar resposta da IA
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: displayMessage || 'Pode me perguntar qualquer coisa sobre as perguntas!',
        timestamp: new Date()
      };
      console.log('[NPSReviewChat] Resposta da IA:', assistantMessage.content);
      setReviewChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erro ao processar mensagem do chat:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date()
      };
      setReviewChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsReviewChatProcessing(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!tenantId) {
      alert('Erro: tenant_id não encontrado');
      return;
    }

    try {
      const campaignData: any = {
        tenant_id: tenantId,
        name: campaignName || existingCampaign?.name || `Pesquisa NPS - ${objective}`,
        description: existingCampaign?.description || `Pesquisa NPS - ${objective}`,
        objective,
        tone,
        evaluation_points: evaluationPoints,
        initial_fields: initialFields,
        google_redirect: googleRedirect,
        google_place_id: googlePlaceId,
        offer_prize: offerPrize,
        show_logo: showLogo,
        game_id: selectedGameId || null,
        before_google_message: beforeGoogleMessage,
        after_game_message: afterGameMessage,
        questions: generatedQuestions,
        status: existingCampaign?.status || 'Ativa',
        enableRedirection: googleRedirect,
        initialFields: initialFields
      };

      // Se está editando, preservar ID e dados que não devem mudar
      if (existingCampaign?.id) {
        campaignData.id = existingCampaign.id;
      } else {
        campaignData.created_at = new Date().toISOString();
      }

      onSaveCampaign(campaignData);
      setCurrentStep('complete');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar pesquisa');
    }
  };

  const handleAddQuestion = () => {
    const newQuestion: GeneratedQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: 'Nova pergunta',
      type: 'single_choice',
      options: [
        { id: `opt_${Date.now()}_1`, text: 'Opção 1' },
        { id: `opt_${Date.now()}_2`, text: 'Opção 2' },
      ],
      insight: 'Pergunta customizada'
    };
    setGeneratedQuestions(prev => [...prev, newQuestion]);
    setEditingQuestionId(newQuestion.id);
  };

  const handleDeleteQuestion = (id: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== id));
    setEditingQuestionId(prev => prev === id ? null : prev);
  };

  const handleEditQuestion = (id: string, updates: Partial<GeneratedQuestion>) => {
    setGeneratedQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    setGeneratedQuestions(prev => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      // Não permitir mover a pergunta NPS (sempre deve ser a primeira)
      if (prev[index]?.type === 'nps') return prev;
      // Não permitir mover para a posição 0 se a primeira pergunta for NPS
      if (direction === 'up' && index === 1 && prev[0]?.type === 'nps') return prev;
      const newQuestions = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
      return newQuestions;
    });
  };

  const handleMoveOption = (questionId: string, optionIndex: number, direction: 'up' | 'down') => {
    setGeneratedQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      const opts = [...q.options];
      const targetIndex = direction === 'up' ? optionIndex - 1 : optionIndex + 1;
      if (targetIndex < 0 || targetIndex >= opts.length) return q;
      [opts[optionIndex], opts[targetIndex]] = [opts[targetIndex], opts[optionIndex]];
      return { ...q, options: opts };
    }));
  };

  const renderProgressBar = () => {
    const steps = [
      { id: 'context', label: 'Contexto' },
      { id: 'generation', label: 'Geração' },
      { id: 'review', label: 'Revisão' },
      { id: 'complete', label: 'Concluído' }
    ];

    const getStepIndex = () => {
      if (['welcome', 'objective', 'tone', 'evaluation_points', 'initial_fields', 'google_redirect', 'google_place_id', 'prize_config', 'messages'].includes(currentStep)) return 0;
      if (currentStep === 'generation') return 1;
      if (currentStep === 'review') return 2;
      if (currentStep === 'complete') return 3;
      return 0;
    };

    const currentIndex = getStepIndex();

    return (
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-2 ${index <= currentIndex ? 'text-emerald-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                index < currentIndex 
                  ? 'bg-emerald-500 text-white' 
                  : index === currentIndex 
                    ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500' 
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {index + 1}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 ${index < currentIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderMessage = (message: ChatMessage) => {
    const isAssistant = message.role === 'assistant';
    
    return (
      <div key={message.id} className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAssistant 
            ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' 
            : 'bg-slate-200 text-slate-600'
        }`}>
          {isAssistant ? <Bot size={20} /> : <User size={20} />}
        </div>
        <div className={`flex-1 max-w-[80%] ${isAssistant ? '' : 'text-right'}`}>
          <div className={`inline-block p-4 rounded-2xl ${
            isAssistant 
              ? 'bg-white border border-slate-200 text-slate-700' 
              : 'bg-emerald-500 text-white'
          }`}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </div>
          
          {isAssistant && message.options && message.options.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(option.value, option.label)}
                  className="px-4 py-2 bg-white border-2 border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 hover:border-emerald-400 transition-all text-sm font-medium flex items-center gap-2"
                >
                  {option.icon && <option.icon size={16} />}
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGenerationScreen = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
          <Sparkles className="text-white" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {generationProgress < 50 ? 'Analisando seu negócio...' : 'Criando suas perguntas NPS...'}
        </h2>
        <p className="text-slate-500 mb-6">
          Estou usando inteligência artificial para criar perguntas estratégicas
        </p>
        <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${generationProgress}%` }}
          />
        </div>
        <p className="text-sm text-slate-400">{Math.round(generationProgress)}%</p>
      </div>
    </div>
  );

  const renderReviewScreen = () => (
    <div className="flex-1 overflow-hidden flex">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Revise suas perguntas</h2>
          <p className="text-slate-500 mb-6">Edite, adicione ou remova perguntas conforme necessário</p>

          {generatedQuestions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-xl p-5 border border-slate-200 mb-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-500">Pergunta {index + 1}</span>
                  {question.type === 'nps' && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-xs rounded-full font-medium">
                      NPS
                    </span>
                  )}

                </div>
                {question.type !== 'nps' && (
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => handleMoveQuestion(index, 'up')}
                      disabled={index === 0 || (index === 1 && generatedQuestions[0]?.type === 'nps')}
                      className="p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleMoveQuestion(index, 'down')}
                      disabled={index === generatedQuestions.length - 1}
                      className="p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => setEditingQuestionId(editingQuestionId === question.id ? null : question.id)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="p-1 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
              
              {editingQuestionId === question.id ? (
                <div className="space-y-3">
                  {/* Texto da pergunta */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Texto da pergunta</label>
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => handleEditQuestion(question.id, { text: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  {/* Tipo de resposta (não permitir mudar se for NPS) */}
                  {question.type !== 'nps' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de resposta</label>
                      <select
                        value={question.type}
                        onChange={(e) => {
                          const newType = e.target.value as 'single_choice' | 'multiple_choice' | 'text' | 'nps';
                          handleEditQuestion(question.id, { 
                            type: newType,
                            options: ['single_choice', 'multiple_choice'].includes(newType) 
                              ? (question.options.length > 0 ? question.options : [
                                  { id: 'opt1', text: 'Opção 1' },
                                  { id: 'opt2', text: 'Opção 2' }
                                ])
                              : []
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="single_choice">Escolha única</option>
                        <option value="multiple_choice">Múltipla escolha</option>
                        <option value="text">Texto livre</option>
                        <option value="rating">Avaliação (1-5)</option>
                      </select>
                    </div>
                  )}

                  {/* Alternativas (se for single_choice ou multiple_choice) */}
                  {['single_choice', 'multiple_choice'].includes(question.type) && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">Alternativas</label>
                      <div className="space-y-2">
                        {question.options.map((opt, optIndex) => (
                          <div key={opt.id} className="flex gap-2 items-start">
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleMoveOption(question.id, optIndex, 'up')}
                                disabled={optIndex === 0}
                                className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed"
                                title="Mover para cima"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveOption(question.id, optIndex, 'down')}
                                disabled={optIndex === question.options.length - 1}
                                className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed"
                                title="Mover para baixo"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => {
                                    const newOptions = [...question.options];
                                    newOptions[optIndex] = { ...opt, text: e.target.value };
                                    handleEditQuestion(question.id, { options: newOptions });
                                  }}
                                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                  placeholder={`Opção ${optIndex + 1}`}
                                />
                                <button
                                  onClick={() => {
                                    const newOptions = question.options.filter((_, i) => i !== optIndex);
                                    handleEditQuestion(question.id, { options: newOptions });
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              {/* Checkbox de campo de seguimento */}
                              <div className="pl-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`followup-nps-${opt.id}`}
                                    checked={opt.followUpLabel !== undefined}
                                    onChange={(e) => {
                                      const newOptions = [...question.options];
                                      newOptions[optIndex] = { 
                                        ...opt, 
                                        followUpLabel: e.target.checked ? '' : undefined 
                                      };
                                      handleEditQuestion(question.id, { options: newOptions });
                                    }}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <label htmlFor={`followup-nps-${opt.id}`} className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                                    <MessageSquare size={11} /> Campo de texto de seguimento (Opcional)
                                  </label>
                                </div>
                                {opt.followUpLabel !== undefined && (
                                  <input
                                    type="text"
                                    value={opt.followUpLabel || ''}
                                    onChange={(e) => {
                                      const newOptions = [...question.options];
                                      newOptions[optIndex] = { ...opt, followUpLabel: e.target.value };
                                      handleEditQuestion(question.id, { options: newOptions });
                                    }}
                                    placeholder="Ex: Se sim, qual?"
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                    autoFocus
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newOption = {
                              id: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                              text: `Opção ${question.options.length + 1}`
                            };
                            handleEditQuestion(question.id, { 
                              options: [...question.options, newOption] 
                            });
                          }}
                          className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all text-sm flex items-center justify-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar alternativa
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Insight */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Insight (opcional)</label>
                    <input
                      type="text"
                      value={question.insight || ''}
                      onChange={(e) => handleEditQuestion(question.id, { insight: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                      placeholder="Por que essa pergunta é importante?"
                    />
                  </div>


                </div>
              ) : (
                <>
                  <p className="text-slate-900 font-medium">{question.text}</p>
                  
                  {question.options.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {question.options.map((opt) => (
                        <div key={opt.id} className="text-sm text-slate-600 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {opt.text}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {question.insight && (
                    <p className="text-xs text-slate-500 mt-3 italic bg-slate-50 p-2 rounded">
                      💡 {question.insight}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}

          <button
            onClick={handleAddQuestion}
            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Adicionar pergunta
          </button>

          {/* Editor de Campos Iniciais */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Campos de Identificação</h3>
            <p className="text-sm text-slate-500 mb-4">Configure quais dados serão solicitados ao cliente antes da pesquisa</p>
            <div className="space-y-3">
              {initialFields.map((field, index) => (
                <div key={`${field.field}-${index}`} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={(e) => {
                            const newFields = [...initialFields];
                            newFields[index] = { ...field, enabled: e.target.checked };
                            setInitialFields(newFields);
                          }}
                          className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                        />
                        <span className="font-medium text-slate-700">Ativo</span>
                      </label>
                      <label className="flex items-center gap-1 text-sm text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          disabled={!field.enabled}
                          onChange={(e) => {
                            const newFields = [...initialFields];
                            newFields[index] = { ...field, required: e.target.checked };
                            setInitialFields(newFields);
                          }}
                          className="w-3 h-3 text-emerald-500 rounded focus:ring-emerald-500"
                        />
                        Obrigatório
                      </label>
                    </div>
                    {!['name', 'email', 'phone'].includes(field.field) && (
                      <button
                        onClick={() => {
                          const newFields = initialFields.filter((_, i) => i !== index);
                          setInitialFields(newFields);
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remover campo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Título do campo</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const newFields = [...initialFields];
                          newFields[index] = { ...field, label: e.target.value };
                          setInitialFields(newFields);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        placeholder="Ex: Nome Completo"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Placeholder (exemplo)</label>
                      <input
                        type="text"
                        value={field.placeholder}
                        onChange={(e) => {
                          const newFields = [...initialFields];
                          newFields[index] = { ...field, placeholder: e.target.value };
                          setInitialFields(newFields);
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        placeholder="Ex: Digite seu nome"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const newField = {
                  field: `custom_${Date.now()}`,
                  label: 'Novo Campo',
                  placeholder: 'Digite aqui...',
                  required: false,
                  enabled: true
                };
                setInitialFields([...initialFields, newField]);
              }}
              className="w-full mt-3 py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all text-sm flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Adicionar campo
            </button>
          </div>

          {/* Logo da Empresa */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Logo da Empresa</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {businessProfile?.logo_url
                    ? 'Exibir sua logo no topo da pesquisa'
                    : 'Cadastre uma logo em Configurações → Perfil do Negócio para ativar'}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLogo && !!businessProfile?.logo_url}
                  onChange={(e) => businessProfile?.logo_url && setShowLogo(e.target.checked)}
                  disabled={!businessProfile?.logo_url}
                  className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 disabled:opacity-50"
                />
                <span className={`font-medium text-slate-700 ${!businessProfile?.logo_url ? 'opacity-50' : ''}`}>Ativar</span>
              </label>
            </div>
            {showLogo && businessProfile?.logo_url && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <img src={businessProfile.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
                <p className="text-xs text-emerald-700">Esta logo aparecerá no topo da pesquisa pública</p>
              </div>
            )}
          </div>

          {/* Configuração de Roleta da Sorte (Game) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-slate-800">🎰 Roleta da Sorte</h3>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); /* TODO: Navigate to GameConfig */ }} 
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                Gerenciar Roletas
              </a>
            </div>
            <p className="text-sm text-slate-500 mb-4">Ofereça prêmios para incentivar avaliações no Google</p>
            
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={offerPrize}
                onChange={(e) => {
                  setOfferPrize(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedGameId('');
                  }
                }}
                className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
              />
              <span className="font-medium text-slate-700">Ativar Roleta da Sorte</span>
            </label>

            {offerPrize && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Selecione a Roleta</label>
                  {availableGames.length > 0 ? (
                    <select
                      value={selectedGameId || ''}
                      onChange={(e) => setSelectedGameId(e.target.value || '')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    >
                      <option value="">Selecione uma roleta...</option>
                      {availableGames.map(game => (
                        <option key={game.id} value={game.id}>
                          {game.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">⚠️ Você ainda não tem nenhuma Roleta da Sorte configurada.</p>
                      <p className="text-xs text-yellow-700 mt-1">Acesse <strong>HelloRating → Roleta da Sorte</strong> para criar uma.</p>
                    </div>
                  )}
                </div>

                {selectedGameId && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-sm text-emerald-800 font-medium">✅ Roleta selecionada: {availableGames.find(g => g.id === selectedGameId)?.name}</p>
                  </div>
                )}


              </div>
            )}
          </div>

          {/* Configurações de Redirecionamento Google */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Redirecionamento Google</h3>
            <p className="text-sm text-slate-500 mb-4">Redirecionar clientes para avaliação no Google após a pesquisa</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={googleRedirect}
                onChange={(e) => setGoogleRedirect(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
              />
              <span className="font-medium text-slate-700">Ativar redirecionamento para Google</span>
            </label>
            {googleRedirect && googlePlaceId && (
              <p className="mt-2 text-sm text-slate-500">Place ID: {googlePlaceId}</p>
            )}
          </div>



          <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
            <label className="block text-sm font-medium text-slate-600 mb-2">Nome da Campanha</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Ex: Pesquisa NPS - Satisfação Geral"
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleSaveCampaign}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-emerald-500/30 transition-all mt-6"
          >
            <CheckCircle size={24} />
            Salvar Pesquisa NPS
          </button>
        </div>
      </div>

      {/* Chat de Ajuste - Sidebar */}
      {showReviewChat && (
        <div className="w-96 border-l border-slate-200 bg-slate-50 flex flex-col">
          {/* Cabeçalho do Chat */}
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Consultor IA</h3>
                <p className="text-[10px] text-slate-500">Ajuste suas perguntas</p>
              </div>
            </div>
            <button
              onClick={() => setShowReviewChat(false)}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          {/* Mensagens do Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {reviewChatMessages.length === 0 ? (
              <div className="text-center py-8">
                <Bot size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">Carregando consultor...</p>
              </div>
            ) : (
              reviewChatMessages.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {isReviewChatProcessing && (
              <div className="flex gap-2 justify-start">
                <div className="bg-slate-100 p-3 rounded-lg shadow-sm">
                  <Loader2 size={16} className="animate-spin text-emerald-500" />
                </div>
              </div>
            )}
          </div>

          {/* Ações Rápidas */}
          {!isReviewChatProcessing && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {[
                'Deixa mais simples',
                'Adiciona uma pergunta sobre preço',
                'Reescreve no tom mais informal',
                'Remove a última pergunta',
                'Explica a pergunta 1',
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleReviewChatMessage(chip)}
                  className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input do Chat */}
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={reviewChatInput}
                onChange={(e) => setReviewChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && reviewChatInput.trim()) {
                    e.preventDefault();
                    handleReviewChatMessage(reviewChatInput);
                  }
                }}
                placeholder="Ex: Muda a pergunta 2 para tom mais amigável..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={isReviewChatProcessing}
              />
              <button
                onClick={() => handleReviewChatMessage(reviewChatInput)}
                disabled={!reviewChatInput.trim() || isReviewChatProcessing}
                className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão para reabrir chat se fechado */}
      {!showReviewChat && (
        <button
          onClick={() => setShowReviewChat(true)}
          className="fixed bottom-6 right-6 p-4 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-all hover:scale-110"
          title="Abrir Consultor IA"
        >
          <Bot size={24} />
        </button>
      )}
    </div>
  );

  const renderCompleteScreen = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
          <CheckCircle className="text-white" size={48} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-4">Pesquisa NPS Criada!</h2>
        <p className="text-slate-500 mb-8">
          Sua pesquisa de satisfação está pronta para coletar feedback valioso dos seus clientes.
        </p>
        <button
          onClick={onClose}
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all"
        >
          Voltar para Campanhas NPS
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
              <Wand2 className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">Assistente NPS</h1>
              <p className="text-xs text-emerald-600">Criando sua pesquisa de satisfação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <div className="max-w-5xl mx-auto">
          {renderProgressBar()}
        </div>
      </div>

      {/* Main Content */}
      {isGenerating && currentStep === 'generation' ? (
        renderGenerationScreen()
      ) : currentStep === 'review' ? (
        renderReviewScreen()
      ) : currentStep === 'complete' ? (
        renderCompleteScreen()
      ) : (
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full overflow-hidden">
          {/* Chat Messages */}
          <div 
            ref={chatContainerRef} 
            className="flex-1 overflow-y-auto p-6"
            style={{ maxHeight: 'calc(100vh - 280px)' }}
          >
            <div className="space-y-6">
              {chatMessages.map(renderMessage)}
              
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="text-white" size={20} />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Area */}
          {['objective', 'evaluation_points', 'initial_fields', 'google_place_id', 'prize_config', 'messages'].includes(currentStep) && (
            <div className="p-6 bg-white border-t border-slate-200">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUserInput()}
                  placeholder="Digite sua resposta..."
                  className="flex-1 p-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all"
                />
                <button
                  onClick={handleUserInput}
                  disabled={!userInput.trim()}
                  className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
