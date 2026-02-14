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
  Star
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
  const [objective, setObjective] = useState('');
  const [tone, setTone] = useState('');
  const [evaluationPoints, setEvaluationPoints] = useState<string[]>([]);
  const [googleRedirect, setGoogleRedirect] = useState(false);
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [offerPrize, setOfferPrize] = useState(false);
  const [beforeGoogleMessage, setBeforeGoogleMessage] = useState('');
  const [afterGameMessage, setAfterGameMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (supabase && tenantId) {
      loadBusinessProfile();
    }
  }, [supabase, tenantId]);

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
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (currentStep === 'welcome' && chatMessages.length === 0) {
      setTimeout(() => {
        addAssistantMessage(
          businessProfile 
            ? `Olá! 👋 Sou seu consultor de crescimento da **${businessProfile.business_name || 'sua empresa'}**.\n\nComo já conheço seu negócio, vou criar perguntas estratégicas baseadas no seu perfil.\n\nVamos criar uma pesquisa NPS que transforma feedback em crescimento?`
            : 'Olá! 👋 Vou te ajudar a criar uma pesquisa NPS personalizada.\n\nVamos começar?',
          [
            { label: '✨ Usar meu perfil e começar!', value: 'start', icon: Sparkles }
          ]
        );
      }, 300);
    }
  }, [currentStep, businessProfile, chatMessages.length]);

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

    if (value === 'start') {
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
    setCurrentStep('evaluation_points');
    addAssistantMessage(
      'Quais pontos você quer avaliar na pesquisa?\n\n(Digite separados por vírgula ou use as sugestões da IA)',
      [
        { label: '✨ Usar sugestões da IA', value: 'ai_suggestions', icon: Sparkles }
      ]
    );
  };

  const handleAISuggestions = () => {
    const suggestions = ['Atendimento', 'Qualidade do serviço', 'Tempo de resposta', 'Custo-benefício'];
    setEvaluationPoints(suggestions);
    setCurrentStep('google_redirect');
    addAssistantMessage(
      `Perfeito! Vou focar nestes pontos:\n• ${suggestions.join('\n• ')}\n\nQuer redirecionar os clientes para avaliarem no Google após a pesquisa?`,
      [
        { label: '✅ Sim', value: 'yes', icon: CheckCircle },
        { label: '❌ Não', value: 'no', icon: X }
      ]
    );
  };

  const handleGoogleRedirectSelection = (value: string) => {
    if (value === 'yes') {
      setGoogleRedirect(true);
      setCurrentStep('google_place_id');
      addAssistantMessage('Cole aqui o **Place ID** da sua empresa no Google:\n\n💡 Você pode encontrar no perfil do negócio ou em configurações.');
    } else {
      setGoogleRedirect(false);
      setCurrentStep('generation');
      startGeneration();
    }
  };

  const handlePrizeSelection = (value: string) => {
    if (value === 'yes') {
      setOfferPrize(true);
      addAssistantMessage('Ótimo! Agora escreva a mensagem que aparecerá **DEPOIS do jogo**, antes de redirecionar para o Google:\n\n💡 Exemplo: "Parabéns! Para liberar seu prêmio, nos avalie no Google na próxima tela."');
    } else {
      setOfferPrize(false);
      addAssistantMessage('Escreva a mensagem que aparecerá **antes de redirecionar** para o Google:\n\n💡 Exemplo: "Obrigado! Agora nos avalie no Google para ajudar outros clientes."');
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
      setCurrentStep('google_redirect');
      addAssistantMessage(
        `Perfeito! Vou focar nestes pontos:\n• ${points.join('\n• ')}\n\nQuer redirecionar os clientes para avaliarem no Google após a pesquisa?`,
        [
          { label: '✅ Sim', value: 'yes', icon: CheckCircle },
          { label: '❌ Não', value: 'no', icon: X }
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
      setAfterGameMessage(message);
      setCurrentStep('generation');
      startGeneration();
    } else if (currentStep === 'prize_config' && !offerPrize && !beforeGoogleMessage) {
      setBeforeGoogleMessage(message);
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

      if (!response.ok) throw new Error('Erro na API');

      const data = await response.json();
      const parsed = JSON.parse(data.text);
      
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
      const campaignData = {
        tenant_id: tenantId,
        name: campaignName,
        objective,
        tone,
        evaluation_points: evaluationPoints,
        google_redirect: googleRedirect,
        google_place_id: googlePlaceId,
        offer_prize: offerPrize,
        before_google_message: beforeGoogleMessage,
        after_game_message: afterGameMessage,
        questions: generatedQuestions,
        status: 'active',
        created_at: new Date().toISOString()
      };

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
      if (['welcome', 'objective', 'tone', 'evaluation_points', 'google_redirect', 'google_place_id', 'prize_config', 'messages'].includes(currentStep)) return 0;
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
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingQuestionId(editingQuestionId === question.id ? null : question.id)}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Edit3 className="w-4 h-4 text-slate-600" />
                  </button>
                  {question.type !== 'nps' && (
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="p-1 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
              
              {editingQuestionId === question.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={question.text}
                    onChange={(e) => handleEditQuestion(question.id, { text: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              ) : (
                <p className="text-slate-900 font-medium">{question.text}</p>
              )}
              
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
              
              <p className="text-xs text-slate-500 mt-3 italic bg-slate-50 p-2 rounded">
                💡 {question.insight}
              </p>
            </div>
          ))}

          <button
            onClick={handleAddQuestion}
            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Adicionar pergunta
          </button>

          <div className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
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
          {['objective', 'evaluation_points', 'google_place_id', 'prize_config', 'messages'].includes(currentStep) && (
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
