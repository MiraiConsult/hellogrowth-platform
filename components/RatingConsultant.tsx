'use client';

import { useState, useEffect, useRef } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
import {
  X,
  Sparkles,
  Send,
  Star,
  MessageSquare,
  Target,
  Users,
  CheckCircle2,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  ArrowRight,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Meh,
  AlertTriangle
} from 'lucide-react';

interface Message {
  id: string;
  type: 'assistant' | 'user';
  content: string;
  options?: { label: string; value: string; icon?: string }[];
  isTyping?: boolean;
}

interface NPSQuestion {
  id: string;
  question: string;
  type: 'nps' | 'text' | 'single' | 'multiple';
  options?: string[];
  showWhen?: 'promoter' | 'passive' | 'detractor' | 'always';
  insight?: string;
}

interface BusinessProfile {
  company_name: string;
  business_type: string;
  business_description: string;
  target_audience: string;
  brand_tone: string;
  differentials: string;
  main_pain_points: string;
}

interface RatingConsultantProps {
  userId: string;
  onClose: () => void;
  onSave: (surveyData: any) => void;
}

export default function RatingConsultant({ userId, onClose, onSave }: RatingConsultantProps) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const tenantId = useTenantId();

    const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  
  // Dados coletados
  const [surveyContext, setSurveyContext] = useState({
    surveyName: '',
    surveyType: '', // 'transactional' | 'relational' | 'product'
    focusArea: '',
    brandTone: 'amigavel',
    additionalContext: ''
  });
  
  const [generatedQuestions, setGeneratedQuestions] = useState<NPSQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

  const steps = [
    { id: 1, title: 'Contexto', icon: Target },
    { id: 2, title: 'Análise', icon: Sparkles },
    { id: 3, title: 'Geração', icon: MessageSquare },
    { id: 4, title: 'Revisão', icon: Edit3 },
    { id: 5, title: 'Concluído', icon: CheckCircle2 }
  ];

  // Scroll automático
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Carregar perfil do negócio
  useEffect(() => {
    const loadBusinessProfile = async () => {
      try {
        const { data } = await supabase
          .from('business_profile')
          .select('*')
          .eq('tenant_id', tenantId)
          .single();

        if (data) {
          setBusinessProfile(data);
        }
      } catch (error) {
        console.log('Perfil não encontrado');
      }
    };

    loadBusinessProfile();
  }, [userId, supabase]);

  // Iniciar conversa
  useEffect(() => {
    const greeting = businessProfile?.company_name
      ? `Olá! 👋 Sou seu consultor de experiência do cliente da **${businessProfile.company_name}**.\n\nVou te ajudar a criar uma pesquisa NPS inteligente que vai além da nota - ela vai revelar o **porquê** por trás de cada avaliação.\n\nVamos começar?`
      : `Olá! 👋 Sou seu consultor de experiência do cliente.\n\nVou te ajudar a criar uma pesquisa NPS inteligente que vai além da nota - ela vai revelar o **porquê** por trás de cada avaliação.\n\nVamos começar?`;

    setMessages([
      {
        id: '1',
        type: 'assistant',
        content: greeting,
        options: [
          { label: 'Vamos começar!', value: 'start', icon: '🚀' }
        ]
      }
    ]);
  }, [businessProfile]);

  const addMessage = (message: Omit<Message, 'id'>) => {
    const newMessage = { ...message, id: Date.now().toString() };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleOptionSelect = async (value: string, label: string) => {
    // Adicionar resposta do usuário
    addMessage({ type: 'user', content: label });

    setIsLoading(true);

    // Processar resposta baseado no step atual
    switch (currentStep) {
      case 0: // Início
        if (value === 'start') {
          setCurrentStep(1);
          setTimeout(() => {
            addMessage({
              type: 'assistant',
              content: `Excelente! Para criar perguntas que realmente revelam insights, me conta:\n\n**Qual é o objetivo principal desta pesquisa NPS?**`,
              options: [
                { label: '📦 Avaliar um produto/serviço específico', value: 'product' },
                { label: '🤝 Medir satisfação geral com a empresa', value: 'relational' },
                { label: '✅ Avaliar uma transação/atendimento recente', value: 'transactional' }
              ]
            });
            setIsLoading(false);
          }, 800);
        }
        break;

      case 1: // Tipo de pesquisa
        setSurveyContext(prev => ({ ...prev, surveyType: value }));
        setTimeout(() => {
          let followUp = '';
          if (value === 'product') {
            followUp = 'Qual produto ou serviço você quer avaliar? Me descreva brevemente.';
          } else if (value === 'relational') {
            followUp = 'Há algum aspecto específico da experiência que você quer focar? (Ex: atendimento, qualidade, preço)';
          } else {
            followUp = 'Qual tipo de transação ou atendimento você quer avaliar? (Ex: compra online, visita à loja, suporte)';
          }
          
          addMessage({
            type: 'assistant',
            content: followUp
          });
          setIsLoading(false);
        }, 800);
        break;

      default:
        setIsLoading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!userInput.trim()) return;

    const input = userInput.trim();
    setUserInput('');
    addMessage({ type: 'user', content: input });
    setIsLoading(true);

    // Processar baseado no step
    if (currentStep === 1) {
      setSurveyContext(prev => ({ ...prev, focusArea: input }));
      setCurrentStep(2);
      
      setTimeout(() => {
        addMessage({
          type: 'assistant',
          content: `Perfeito! Agora vou analisar o contexto...\n\n**Qual tom de voz você prefere para as perguntas?**`,
          options: [
            { label: '💼 Profissional', value: 'profissional' },
            { label: '😊 Amigável', value: 'amigavel' },
            { label: '🎉 Informal', value: 'informal' },
            { label: '🎯 Direto', value: 'direto' }
          ]
        });
        setIsLoading(false);
      }, 1000);
    } else if (currentStep === 2) {
      setSurveyContext(prev => ({ ...prev, brandTone: input }));
      await generateNPSQuestions();
    }
  };

  const handleToneSelect = async (value: string, label: string) => {
    addMessage({ type: 'user', content: label });
    setSurveyContext(prev => ({ ...prev, brandTone: value }));
    setIsLoading(true);
    
    setTimeout(() => {
      addMessage({
        type: 'assistant',
        content: `Excelente escolha! 🎯\n\nAgora vou criar perguntas NPS inteligentes que:\n\n• Identificam **Promotores** (nota 9-10)\n• Detectam **Passivos** (nota 7-8)\n• Revelam **Detratores** (nota 0-6)\n\nE o mais importante: perguntas de acompanhamento personalizadas para cada grupo!\n\nIsso pode levar alguns segundos...`
      });
      
      setTimeout(() => {
        generateNPSQuestions();
      }, 1500);
    }, 800);
  };

  const generateNPSQuestions = async () => {
    setIsLoading(true);
    setCurrentStep(3);

    try {
      const prompt = `Você é um especialista em pesquisas NPS e experiência do cliente.

CONTEXTO DO NEGÓCIO:
${businessProfile ? `
- Empresa: ${businessProfile.company_name}
- Tipo: ${businessProfile.business_type}
- Descrição: ${businessProfile.business_description}
- Público-alvo: ${businessProfile.target_audience}
- Diferenciais: ${businessProfile.differentials}
- Dores que resolve: ${businessProfile.main_pain_points}
` : 'Não informado'}

CONTEXTO DA PESQUISA:
- Tipo: ${surveyContext.surveyType === 'product' ? 'Avaliação de produto/serviço' : surveyContext.surveyType === 'relational' ? 'Satisfação geral' : 'Avaliação de transação'}
- Foco: ${surveyContext.focusArea}
- Tom de voz: ${surveyContext.brandTone}

TAREFA:
Crie uma pesquisa NPS inteligente com:
1. A pergunta NPS principal (nota 0-10)
2. 2-3 perguntas de acompanhamento para PROMOTORES (nota 9-10) - foco em entender o que encantou
3. 2-3 perguntas de acompanhamento para PASSIVOS (nota 7-8) - foco em entender o que faltou
4. 2-3 perguntas de acompanhamento para DETRATORES (nota 0-6) - foco em entender a insatisfação

Retorne APENAS um JSON válido no formato:
{
  "questions": [
    {
      "question": "texto da pergunta",
      "type": "nps|text|single|multiple",
      "options": ["opção1", "opção2"] (apenas para single/multiple),
      "showWhen": "always|promoter|passive|detractor",
      "insight": "o que esta resposta revela sobre o cliente"
    }
  ]
}`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) throw new Error('Erro na API');

      const data = await response.json();
      let questions: NPSQuestion[] = [];

      try {
        const jsonMatch = data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          questions = parsed.questions.map((q: any, index: number) => ({
            ...q,
            id: `q-${index}`
          }));
        }
      } catch (e) {
        // Fallback com perguntas padrão
        questions = getDefaultNPSQuestions();
      }

      setGeneratedQuestions(questions);
      setCurrentStep(4);

      addMessage({
        type: 'assistant',
        content: `Pronto! 🎉 Criei uma pesquisa NPS completa com **${questions.length} perguntas** inteligentes.\n\nRevise as perguntas abaixo. Você pode editar, adicionar ou remover conforme necessário.`
      });

    } catch (error) {
      console.error('Erro ao gerar perguntas:', error);
      const defaultQuestions = getDefaultNPSQuestions();
      setGeneratedQuestions(defaultQuestions);
      setCurrentStep(4);

      addMessage({
        type: 'assistant',
        content: `Criei uma pesquisa NPS com perguntas padrão. Você pode personalizar conforme necessário.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultNPSQuestions = (): NPSQuestion[] => {
    return [
      {
        id: 'q-0',
        question: 'Em uma escala de 0 a 10, qual a probabilidade de você recomendar nossa empresa para um amigo ou colega?',
        type: 'nps',
        showWhen: 'always',
        insight: 'Métrica principal de lealdade do cliente'
      },
      {
        id: 'q-1',
        question: 'O que mais te encantou na sua experiência conosco?',
        type: 'text',
        showWhen: 'promoter',
        insight: 'Identifica os pontos fortes que geram promotores'
      },
      {
        id: 'q-2',
        question: 'O que poderíamos fazer para tornar sua experiência ainda melhor?',
        type: 'text',
        showWhen: 'passive',
        insight: 'Revela oportunidades de melhoria para converter passivos em promotores'
      },
      {
        id: 'q-3',
        question: 'Sentimos muito que sua experiência não foi ideal. Pode nos contar o que aconteceu?',
        type: 'text',
        showWhen: 'detractor',
        insight: 'Identifica problemas críticos que geram detratores'
      },
      {
        id: 'q-4',
        question: 'Qual aspecto da nossa empresa você mais valoriza?',
        type: 'single',
        options: ['Qualidade do produto/serviço', 'Atendimento', 'Preço', 'Agilidade', 'Outro'],
        showWhen: 'always',
        insight: 'Mapeia os principais drivers de valor percebido'
      }
    ];
  };

  const handleSaveSurvey = () => {
    const surveyData = {
      name: surveyContext.surveyName || `Pesquisa NPS - ${new Date().toLocaleDateString()}`,
      type: 'nps',
      context: surveyContext,
      questions: generatedQuestions,
      created_at: new Date().toISOString()
    };

    onSave(surveyData);
    setCurrentStep(5);
    
    addMessage({
      type: 'assistant',
      content: `🎉 **Pesquisa NPS criada com sucesso!**\n\nSua pesquisa está pronta para ser enviada aos clientes. Você pode acessá-la na lista de pesquisas NPS.`
    });
  };

  const updateQuestion = (id: string, updates: Partial<NPSQuestion>) => {
    setGeneratedQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, ...updates } : q)
    );
  };

  const deleteQuestion = (id: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== id));
  };

  const addNewQuestion = () => {
    const newQuestion: NPSQuestion = {
      id: `q-${Date.now()}`,
      question: 'Nova pergunta',
      type: 'text',
      showWhen: 'always',
      insight: ''
    };
    setGeneratedQuestions(prev => [...prev, newQuestion]);
    setEditingQuestion(newQuestion.id);
  };

  const getShowWhenLabel = (showWhen: string) => {
    switch (showWhen) {
      case 'promoter': return { label: 'Promotores (9-10)', color: 'bg-emerald-100 text-emerald-700', icon: ThumbsUp };
      case 'passive': return { label: 'Passivos (7-8)', color: 'bg-amber-100 text-amber-700', icon: Meh };
      case 'detractor': return { label: 'Detratores (0-6)', color: 'bg-red-100 text-red-700', icon: ThumbsDown };
      default: return { label: 'Todos', color: 'bg-slate-100 text-slate-700', icon: Users };
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Star size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Consultor de Pesquisa NPS</h1>
              <p className="text-amber-100 text-sm">Criação Inteligente de Pesquisas de Satisfação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > index;
            const isCurrent = currentStep === index;

            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isCompleted ? 'bg-emerald-100 text-emerald-700' :
                  isCurrent ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Icon size={16} />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Chat Section */}
        <div className={`flex-1 flex flex-col ${currentStep === 4 ? 'w-1/2' : 'w-full'}`}>
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            <div className="max-w-2xl mx-auto space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'assistant' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                      <Star className="text-amber-600" size={20} />
                    </div>
                  )}
                  
                  <div className={`max-w-md ${message.type === 'user' ? 'order-1' : ''}`}>
                    <div className={`p-4 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-amber-500 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}>
                      <p className="whitespace-pre-line">{message.content}</p>
                    </div>

                    {message.options && (
                      <div className="mt-3 space-y-2">
                        {message.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (currentStep === 2 && option.value !== 'start') {
                                handleToneSelect(option.value, option.label);
                              } else {
                                handleOptionSelect(option.value, option.label);
                              }
                            }}
                            disabled={isLoading}
                            className="w-full text-left px-4 py-3 bg-white border-2 border-amber-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all disabled:opacity-50"
                          >
                            {option.icon && <span className="mr-2">{option.icon}</span>}
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.type === 'user' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center ml-3">
                      <Users className="text-white" size={20} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                    <Star className="text-amber-600" size={20} />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-bl-md p-4">
                    <Loader2 className="animate-spin text-amber-500" size={24} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Area */}
          {(currentStep === 1 || currentStep === 2) && !messages[messages.length - 1]?.options && (
            <div className="border-t border-slate-200 p-4 bg-white">
              <div className="max-w-2xl mx-auto flex gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
                  placeholder="Digite sua resposta..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  disabled={isLoading}
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={isLoading || !userInput.trim()}
                  className="px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Questions Review Section */}
        {currentStep === 4 && (
          <div className="w-1/2 border-l border-slate-200 bg-slate-50 overflow-y-auto p-6">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-800">
                  Perguntas da Pesquisa ({generatedQuestions.length})
                </h2>
                <button
                  onClick={addNewQuestion}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Adicionar
                </button>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((question, index) => {
                  const showWhenInfo = getShowWhenLabel(question.showWhen || 'always');
                  const ShowWhenIcon = showWhenInfo.icon;

                  return (
                    <div
                      key={question.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${showWhenInfo.color}`}>
                            <ShowWhenIcon size={12} />
                            {showWhenInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingQuestion(editingQuestion === question.id ? null : question.id)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit3 size={16} className="text-slate-500" />
                          </button>
                          <button
                            onClick={() => deleteQuestion(question.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>

                      {editingQuestion === question.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={question.question}
                            onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <select
                              value={question.type}
                              onChange={(e) => updateQuestion(question.id, { type: e.target.value as any })}
                              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            >
                              <option value="nps">NPS (0-10)</option>
                              <option value="text">Texto Livre</option>
                              <option value="single">Única Escolha</option>
                              <option value="multiple">Múltipla Escolha</option>
                            </select>
                            <select
                              value={question.showWhen}
                              onChange={(e) => updateQuestion(question.id, { showWhen: e.target.value as any })}
                              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            >
                              <option value="always">Todos</option>
                              <option value="promoter">Promotores (9-10)</option>
                              <option value="passive">Passivos (7-8)</option>
                              <option value="detractor">Detratores (0-6)</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-800 font-medium">{question.question}</p>
                      )}

                      {question.type === 'nps' && (
                        <div className="mt-3 flex items-center gap-1">
                          {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                            <div
                              key={n}
                              className={`w-6 h-6 rounded text-xs flex items-center justify-center font-medium ${
                                n <= 6 ? 'bg-red-100 text-red-700' :
                                n <= 8 ? 'bg-amber-100 text-amber-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {n}
                            </div>
                          ))}
                        </div>
                      )}

                      {question.options && question.options.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {question.options.map((opt: any, idx: number) => {
                            const label = typeof opt === 'string' ? opt : (opt?.label || opt?.text || '');
                            return <span key={idx} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{label}</span>;
                          })}
                        </div>
                      )}

                      {question.insight && (
                        <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
                          <p className="text-xs text-amber-700">
                            <strong>💡 Insight:</strong> {question.insight}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Save Button */}
              <div className="mt-6 sticky bottom-0 bg-slate-50 pt-4">
                <button
                  onClick={handleSaveSurvey}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                >
                  <CheckCircle2 size={20} />
                  Salvar Pesquisa NPS
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
