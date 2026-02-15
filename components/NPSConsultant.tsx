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
  GripVertical,
  Send,
  Bot,
  User,
  Star,
  Palette
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';

interface QuestionOption {
  id: string;
  text: string;
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
  existingCampaign
}: NPSConsultantProps) {
  const tenantId = useTenantId();
  
  const [currentStep, setCurrentStep] = useState<ConsultantStep>('welcome');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
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
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [beforeGoogleMessage, setBeforeGoogleMessage] = useState('');
  const [afterGameMessage, setAfterGameMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (supabase && tenantId) {
      loadBusinessProfile();
      loadAvailableGames();
    }
  }, [supabase, tenantId]);

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
          id: q.id || `q_${idx}`,
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
      setTimeout(() => {
        addAssistantMessage(
          businessProfile 
            ? `Olá! 👋 Sou seu consultor de crescimento da **${businessProfile.business_name || 'sua empresa'}**.

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
    } else if (value === 'name_only') {
      setInitialFields([
        { field: 'name', label: 'Nome', placeholder: 'Digite seu nome', required: true, enabled: true },
        { field: 'email', label: 'E-mail', placeholder: 'Digite seu e-mail', required: false, enabled: false },
        { field: 'phone', label: 'Telefone', placeholder: 'Digite seu telefone', required: false, enabled: false }
      ]);
    } else if (value === 'custom') {
      // TODO: Implementar tela de configuração customizada
      addAssistantMessage('⚠️ Configuração customizada ainda não implementada. Usando padrão: Nome + E-mail');
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
      const prompt = `Você é um especialista em pesquisas NPS (Net Promoter Score).

Crie uma pesquisa NPS com as seguintes características:

**Objetivo:** ${objective}
**Tom:** ${tone}
**Pontos a avaliar:** ${evaluationPoints.join(', ')}
**Negócio:** ${businessProfile?.business_name || 'Empresa'}
**Descrição do negócio:** ${businessProfile?.description || 'Não informado'}

**Regras importantes:**
1. A PRIMEIRA pergunta SEMPRE deve ser a pergunta NPS padrão: "Em uma escala de 0 a 10, o quanto você recomendaria [empresa/serviço] para um amigo ou colega?"
2. Crie 2-4 perguntas complementares que ajudem a entender melhor a experiência do cliente
3. Inclua perguntas condicionais para promotores (9-10), passivos (7-8) e detratores (0-6)
4. Use o tom ${tone}
5. Foque nos pontos: ${evaluationPoints.join(', ')}

Retorne APENAS um JSON válido com este formato:
{
  "questions": [
    {
      "text": "texto da pergunta",
      "type": "nps" | "single_choice" | "multiple_choice" | "text",
      "options": ["opção 1", "opção 2"],
      "insight": "por que essa pergunta é importante",
      "conditional": "promoter" | "passive" | "detractor" (opcional)
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
        id: `q${index + 1}`,
        text: q.text,
        type: q.type,
        options: q.options ? q.options.map((opt: string, i: number) => ({
          id: `opt${i + 1}`,
          text: opt
        })) : [],
        insight: q.insight,
        conditional: q.conditional
      }));

      setGeneratedQuestions(questions);
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
        game_id: selectedGameId || null,
        before_google_message: beforeGoogleMessage,
        after_game_message: afterGameMessage,
        questions: generatedQuestions,
        status: existingCampaign?.status || 'active',
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
      id: `q${generatedQuestions.length + 1}`,
      text: 'Nova pergunta',
      type: 'text',
      options: [],
      insight: 'Pergunta customizada'
    };
    setGeneratedQuestions([...generatedQuestions, newQuestion]);
    setEditingQuestionId(newQuestion.id);
  };

  const handleDeleteQuestion = (id: string) => {
    setGeneratedQuestions(generatedQuestions.filter(q => q.id !== id));
  };

  const handleEditQuestion = (id: string, updates: Partial<GeneratedQuestion>) => {
    setGeneratedQuestions(generatedQuestions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
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
                  {question.conditional && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full font-medium">
                      {question.conditional === 'promoter' ? 'Promotores' : 
                       question.conditional === 'passive' ? 'Passivos' : 'Detratores'}
                    </span>
                  )}
                </div>
                {question.type !== 'nps' && (
                  <div className="flex gap-2">
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
                          const newType = e.target.value as 'single_choice' | 'multiple_choice' | 'text' | 'rating';
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
                          <div key={opt.id} className="flex gap-2">
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
                        ))}
                        <button
                          onClick={() => {
                            const newOption = {
                              id: `opt${question.options.length + 1}`,
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

          {/* Mensagem de Finalização */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Mensagens Personalizadas</h3>
            <p className="text-sm text-slate-500 mb-4">Mensagens exibidas ao cliente durante e após a pesquisa</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mensagem antes do Google (para promotores)</label>
                <input
                  type="text"
                  value={beforeGoogleMessage}
                  onChange={(e) => setBeforeGoogleMessage(e.target.value)}
                  placeholder="Ex: Obrigado! Que tal nos avaliar no Google?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mensagem de finalização</label>
                <input
                  type="text"
                  value={afterGameMessage}
                  onChange={(e) => setAfterGameMessage(e.target.value)}
                  placeholder="Ex: Obrigado por participar da nossa pesquisa!"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>
            </div>
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
