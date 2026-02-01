// FormConsultant.tsx - Interface de Consultoria Full Screen para Criação de Formulários
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Target,
  Package,
  MessageSquare,
  CheckCircle,
  Loader2,
  Upload,
  FileSpreadsheet,
  Wand2,
  Lightbulb,
  Eye,
  Edit3,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Palette,
  Send,
  Bot,
  User,
  RefreshCw,
  Building2,
  Users,
  Zap,
  Heart
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  name: string;
  value: number;
  ai_description: string | null;
  ai_persona: string | null;
  ai_strategy: string | null;
}

interface GeneratedQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'text' | 'scale';
  options?: string[];
  insight: string;
  linkedProducts?: string[];
}

interface FormConsultantProps {
  supabase: SupabaseClient | null;
  userId: string;
  onClose: () => void;
  onSaveForm: (formData: any) => void;
  existingForm?: any;
}

type ConsultantStep = 
  | 'welcome' 
  | 'business_type' 
  | 'target_audience' 
  | 'pain_points' 
  | 'objective' 
  | 'products' 
  | 'analysis' 
  | 'generation' 
  | 'review' 
  | 'customize' 
  | 'complete';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  options?: { label: string; value: string; icon?: any }[];
}

interface BusinessContext {
  businessType: string;
  businessDescription: string;
  targetAudience: string;
  audienceCharacteristics: string;
  mainPainPoints: string[];
  desiredOutcome: string;
  formObjective: 'qualify' | 'feedback' | 'custom';
  customObjective: string;
  productSelection: 'manual' | 'auto';
  selectedProducts: string[];
  formTone: 'formal' | 'friendly' | 'professional';
}

const FormConsultant: React.FC<FormConsultantProps> = ({ 
  supabase, 
  userId, 
  onClose, 
  onSaveForm,
  existingForm 
}) => {
  // State Management
  const [currentStep, setCurrentStep] = useState<ConsultantStep>('welcome');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Business Context - Coletado durante a consultoria
  const [businessContext, setBusinessContext] = useState<BusinessContext>({
    businessType: '',
    businessDescription: '',
    targetAudience: '',
    audienceCharacteristics: '',
    mainPainPoints: [],
    desiredOutcome: '',
    formObjective: 'qualify',
    customObjective: '',
    productSelection: 'auto',
    selectedProducts: [],
    formTone: 'professional'
  });
  
  // Form Configuration
  const [formName, setFormName] = useState('');
  
  // Generated Content
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  
  // Chat Interface
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Import
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Products on Mount
  useEffect(() => {
    fetchProducts();
  }, [supabase, userId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Initialize chat with welcome message
  useEffect(() => {
    if (currentStep === 'welcome' && chatMessages.length === 0) {
      setTimeout(() => {
        addAssistantMessage(
          "Olá! 👋 Sou seu consultor de crescimento HelloGrowth.\n\n" +
          "Vou te guiar na criação de um formulário inteligente que transforma visitantes em oportunidades reais de venda.\n\n" +
          "Para criar perguntas que realmente convertem, preciso entender melhor o seu negócio. Vamos começar?",
          [
            { label: "Vamos começar!", value: "start", icon: Sparkles }
          ]
        );
      }, 500);
    }
  }, []);

  const fetchProducts = async () => {
    if (!supabase) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const addAssistantMessage = (content: string, options?: { label: string; value: string; icon?: any }[]) => {
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
        options
      }]);
      setIsTyping(false);
    }, 800);
  };

  const addUserMessage = (content: string) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }]);
  };

  const handleOptionClick = (value: string, label: string) => {
    addUserMessage(label);
    
    switch (currentStep) {
      case 'welcome':
        if (value === 'start') {
          setCurrentStep('business_type');
          setTimeout(() => {
            addAssistantMessage(
              "Excelente! Para começar, me conta: **qual é o tipo do seu negócio?**\n\n" +
              "Pode ser uma clínica, loja, consultoria, agência, restaurante... Descreva brevemente o que você faz."
            );
          }, 300);
        }
        break;
        
      case 'objective':
        setBusinessContext(prev => ({ ...prev, formObjective: value as any }));
        setCurrentStep('products');
        setTimeout(() => {
          addAssistantMessage(
            "Ótima escolha! Agora vamos definir como vincular seus produtos às perguntas.\n\n" +
            "Você prefere:",
            [
              { label: "🤖 Deixar a IA decidir - Eu analiso e sugiro o melhor produto", value: "auto" },
              { label: "📦 Escolher manualmente - Seleciono os produtos", value: "manual" }
            ]
          );
        }, 300);
        break;
        
      case 'products':
        setBusinessContext(prev => ({ ...prev, productSelection: value as any }));
        if (value === 'manual' && products.length > 0) {
          setTimeout(() => {
            addAssistantMessage(
              "Perfeito! Selecione os produtos que você quer destacar neste formulário:"
            );
          }, 300);
        } else {
          setCurrentStep('analysis');
          runAIAnalysis();
        }
        break;
    }
  };

  const handleUserInput = () => {
    if (!userInput.trim()) return;
    
    const input = userInput.trim();
    addUserMessage(input);
    setUserInput('');
    
    switch (currentStep) {
      case 'business_type':
        setBusinessContext(prev => ({ ...prev, businessType: input, businessDescription: input }));
        setCurrentStep('target_audience');
        setTimeout(() => {
          addAssistantMessage(
            `Entendi! Você trabalha com **${input}**.\n\n` +
            "Agora me conta: **quem é o seu cliente ideal?**\n\n" +
            "Descreva o perfil de quem você quer atrair (idade, gênero, interesses, comportamento, poder aquisitivo...)."
          );
        }, 300);
        break;
        
      case 'target_audience':
        setBusinessContext(prev => ({ ...prev, targetAudience: input, audienceCharacteristics: input }));
        setCurrentStep('pain_points');
        setTimeout(() => {
          addAssistantMessage(
            `Perfeito! Seu público-alvo é: **${input}**.\n\n` +
            "Agora a pergunta mais importante: **quais são as principais dores, medos ou desejos desse público?**\n\n" +
            "Liste os problemas que eles querem resolver ou os resultados que buscam. Quanto mais detalhes, melhor!"
          );
        }, 300);
        break;
        
      case 'pain_points':
        setBusinessContext(prev => ({ ...prev, mainPainPoints: [input], desiredOutcome: input }));
        setCurrentStep('objective');
        setTimeout(() => {
          addAssistantMessage(
            "Excelente! Agora eu já tenho uma visão clara do seu negócio.\n\n" +
            "**Qual é o objetivo principal deste formulário?**",
            [
              { label: "🎯 Qualificar Leads - Identificar quem está pronto para comprar", value: "qualify" },
              { label: "💬 Coletar Feedback - Entender a satisfação dos clientes", value: "feedback" },
              { label: "✨ Outro Objetivo - Tenho algo específico em mente", value: "custom" }
            ]
          );
        }, 300);
        break;
        
      default:
        break;
    }
  };

  const runAIAnalysis = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 40) {
          clearInterval(progressInterval);
          return 40;
        }
        return prev + 5;
      });
    }, 200);

    try {
      const analysisPrompt = `Você é um consultor de vendas especialista em perguntas indiretas.

CONTEXTO DO NEGÓCIO:
- Tipo de Negócio: ${businessContext.businessType}
- Descrição: ${businessContext.businessDescription}
- Público-Alvo: ${businessContext.targetAudience}
- Características do Público: ${businessContext.audienceCharacteristics}
- Dores e Desejos: ${businessContext.mainPainPoints.join(', ')}
- Objetivo do Formulário: ${businessContext.formObjective === 'qualify' ? 'Qualificar leads' : businessContext.formObjective === 'feedback' ? 'Coletar feedback' : businessContext.customObjective}

PRODUTOS/SERVIÇOS DISPONÍVEIS:
${products.map(p => `- ${p.name} (R$ ${p.value}): ${p.ai_persona || 'Sem perfil definido'}`).join('\n') || 'Nenhum produto cadastrado'}

Faça uma análise estratégica em 3 partes:
1. DESEJO CENTRAL: Qual é o desejo mais profundo desse público?
2. DORES RECORRENTES: Quais são os medos e frustrações mais comuns?
3. ESTRATÉGIA DE PERGUNTAS: Como vamos usar perguntas indiretas para identificar oportunidades?

Responda de forma clara e direta, em português brasileiro.`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: analysisPrompt })
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Erro na API');
      }

      const data = await response.json();
      setAiAnalysis(data.response);
      setGenerationProgress(50);
      
      setTimeout(() => {
        addAssistantMessage(
          "📊 **Análise Estratégica Concluída!**\n\n" +
          "Baseado no que você me contou, identifiquei:\n\n" +
          data.response.substring(0, 500) + "...\n\n" +
          "Agora vou criar as perguntas indiretas perfeitas para o seu formulário!"
        );
        
        setTimeout(() => {
          setCurrentStep('generation');
          generateQuestions();
        }, 2000);
      }, 500);

    } catch (error) {
      clearInterval(progressInterval);
      console.error('Erro na análise:', error);
      setIsGenerating(false);
      addAssistantMessage(
        "😅 Ops! Tive um problema na análise. Vou tentar gerar as perguntas diretamente...",
        [{ label: "Tentar novamente", value: "retry" }]
      );
    }
  };

  const generateQuestions = async () => {
    setIsGenerating(true);
    setGenerationProgress(60);

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 300);

    try {
      const selectedProductsData = businessContext.productSelection === 'manual' 
        ? products.filter(p => businessContext.selectedProducts.includes(p.id))
        : products;

      const productContext = selectedProductsData.map(p => 
        `- ${p.name} (R$ ${p.value}): ${p.ai_description || 'Sem descrição'} | Perfil: ${p.ai_persona || 'Não definido'}`
      ).join('\n');

      const prompt = `Você é um especialista em vendas consultivas e formulários de conversão de alta performance.

CONTEXTO COMPLETO DO NEGÓCIO:
- Tipo: ${businessContext.businessType}
- Público-Alvo: ${businessContext.targetAudience} - ${businessContext.audienceCharacteristics}
- Dores e Desejos: ${businessContext.mainPainPoints.join(', ')}
- Objetivo: ${businessContext.formObjective === 'qualify' ? 'Qualificar leads e identificar quem está pronto para comprar' : businessContext.formObjective === 'feedback' ? 'Coletar feedback e entender satisfação' : businessContext.customObjective}

PRODUTOS/SERVIÇOS:
${productContext || 'Nenhum produto cadastrado - crie perguntas genéricas de qualificação'}

ANÁLISE PRÉVIA:
${aiAnalysis || 'Não disponível'}

REGRAS OBRIGATÓRIAS:
1. Crie EXATAMENTE 6 perguntas
2. As perguntas devem ser INDIRETAS - NUNCA pergunte diretamente sobre compra ou preço
3. Cada pergunta deve parecer uma conversa natural, não um interrogatório
4. Use linguagem ${businessContext.formTone === 'formal' ? 'formal e profissional' : businessContext.formTone === 'friendly' ? 'amigável e descontraída' : 'profissional mas acessível'}
5. Cada pergunta deve ter um INSIGHT estratégico explicando o que a resposta revela sobre o cliente
6. Misture tipos: 4 múltipla escolha, 1 escala (1-10), 1 texto livre
7. As opções de múltipla escolha devem ter 3-4 alternativas

Responda APENAS com um JSON válido neste formato (sem markdown, sem crases):
{
  "questions": [
    {
      "text": "Texto da pergunta",
      "type": "multiple_choice",
      "options": ["Opção 1", "Opção 2", "Opção 3"],
      "insight": "O que esta resposta revela sobre o cliente"
    },
    {
      "text": "De 1 a 10, como você avalia...",
      "type": "scale",
      "insight": "O que o número revela"
    },
    {
      "text": "Pergunta aberta...",
      "type": "text",
      "insight": "O que a resposta livre revela"
    }
  ]
}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      if (!response.ok) throw new Error('Erro na API');

      const data = await response.json();
      let parsed;
      
      try {
        const cleanResponse = data.response
          .replace(/```json\n?/g, '')
          .replace(/\n?```/g, '')
          .trim();
        parsed = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError);
        throw new Error('Resposta da IA inválida');
      }

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Formato de resposta inválido');
      }

      const questions: GeneratedQuestion[] = parsed.questions.map((q: any, index: number) => ({
        id: `q_${Date.now()}_${index}`,
        text: q.text,
        type: q.type || 'multiple_choice',
        options: q.options,
        insight: q.insight,
        linkedProducts: businessContext.selectedProducts
      }));

      setGeneratedQuestions(questions);
      setGenerationProgress(100);
      
      setTimeout(() => {
        setCurrentStep('review');
        setIsGenerating(false);
        addAssistantMessage(
          "🎉 **Pronto!** Criei 6 perguntas estratégicas para o seu formulário.\n\n" +
          "Cada pergunta foi pensada para extrair informações valiosas sem parecer um interrogatório de vendas.\n\n" +
          "Você pode editar, reordenar ou remover qualquer uma delas. Quando estiver satisfeito, vamos para a personalização final!"
        );
      }, 500);

    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('Erro ao gerar perguntas:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
      
      if (error.name === 'AbortError') {
        addAssistantMessage(
          "⏱️ A geração demorou mais que o esperado. Vamos tentar novamente?",
          [{ label: "Tentar novamente", value: "retry" }]
        );
      } else {
        addAssistantMessage(
          "😅 Ops! Tive um problema ao gerar as perguntas. Vamos tentar novamente?",
          [{ label: "Tentar novamente", value: "retry" }]
        );
      }
    }
  };

  const handleRetry = () => {
    if (currentStep === 'analysis' || currentStep === 'generation') {
      setCurrentStep('analysis');
      runAIAnalysis();
    }
  };

  const handleSaveForm = async () => {
    const formData = {
      name: formName || `Formulário ${new Date().toLocaleDateString('pt-BR')}`,
      questions: generatedQuestions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options?.map((opt, idx) => ({
          id: `opt_${idx}`,
          text: opt,
          value: 0
        })),
        required: true
      })),
      settings: {
        tone: businessContext.formTone,
        objective: businessContext.formObjective,
        businessContext: businessContext
      },
      status: 'active'
    };

    onSaveForm(formData);
    setCurrentStep('complete');
    addAssistantMessage(
      "🚀 **Seu formulário foi salvo com sucesso!**\n\n" +
      "Ele já está ativo e pronto para capturar leads qualificados. " +
      "Todas as respostas serão analisadas pela IA e aparecerão no seu Centro de Inteligência Estratégica."
    );
  };

  const handleRemoveQuestion = (id: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleEditQuestion = (id: string, newText: string) => {
    setGeneratedQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, text: newText } : q
    ));
  };

  // Render Progress Bar
  const renderProgressBar = () => {
    const steps = [
      { id: 'context', label: 'Contexto' },
      { id: 'analysis', label: 'Análise' },
      { id: 'generation', label: 'Geração' },
      { id: 'review', label: 'Revisão' },
      { id: 'complete', label: 'Concluído' }
    ];

    const getStepIndex = () => {
      if (['welcome', 'business_type', 'target_audience', 'pain_points', 'objective', 'products'].includes(currentStep)) return 0;
      if (currentStep === 'analysis') return 1;
      if (currentStep === 'generation') return 2;
      if (['review', 'customize'].includes(currentStep)) return 3;
      if (currentStep === 'complete') return 4;
      return 0;
    };

    const currentIndex = getStepIndex();

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
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
                {index < currentIndex ? <CheckCircle size={16} /> : index + 1}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${index < currentIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Render Chat Message
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
          
          {/* Options Buttons */}
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

  // Render Generation Screen
  const renderGenerationScreen = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
          <Sparkles className="text-white" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {generationProgress < 50 ? 'Analisando seu negócio...' : 'Criando suas perguntas estratégicas...'}
        </h2>
        <p className="text-slate-500 mb-6">
          {generationProgress < 50 
            ? 'Estou identificando as melhores estratégias para o seu público' 
            : 'Estou criando perguntas indiretas que convertem'}
        </p>
        <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${generationProgress}%` }}
          />
        </div>
        <p className="text-sm text-slate-400">{generationProgress}% concluído</p>
      </div>
    </div>
  );

  // Render Review Screen
  const renderReviewScreen = () => (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Revise suas perguntas</h2>
        <p className="text-slate-500 mb-6">Edite, reordene ou remova as perguntas conforme necessário</p>
        
        <div className="space-y-4 mb-8">
          {generatedQuestions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={question.text}
                    onChange={(e) => handleEditQuestion(question.id, e.target.value)}
                    className="w-full text-lg font-medium text-slate-800 bg-transparent border-none focus:outline-none focus:ring-0"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      question.type === 'multiple_choice' ? 'bg-blue-100 text-blue-600' :
                      question.type === 'scale' ? 'bg-purple-100 text-purple-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {question.type === 'multiple_choice' ? 'Múltipla Escolha' :
                       question.type === 'scale' ? 'Escala 1-10' : 'Texto Livre'}
                    </span>
                  </div>
                  {question.options && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {question.options.map((opt, idx) => (
                        <span key={idx} className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-lg">
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700">
                      <strong>💡 Insight:</strong> {question.insight}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveQuestion(question.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Form Name Input */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <label className="block text-sm font-medium text-slate-600 mb-2">Nome do Formulário</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Ex: Diagnóstico de Beleza, Qualificação de Leads..."
            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveForm}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
        >
          <CheckCircle size={24} />
          Salvar Formulário
        </button>
      </div>
    </div>
  );

  // Render Complete Screen
  const renderCompleteScreen = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
          <CheckCircle className="text-white" size={48} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-4">Formulário Criado!</h2>
        <p className="text-slate-500 mb-8">
          Seu formulário inteligente está pronto para capturar leads qualificados e alimentar seu Centro de Inteligência Estratégica.
        </p>
        <button
          onClick={onClose}
          className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all"
        >
          Voltar para Formulários
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
              <h1 className="font-bold text-slate-800">Consultor HelloGrowth</h1>
              <p className="text-xs text-emerald-600">Criação Inteligente de Formulários</p>
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
      {isGenerating && (currentStep === 'analysis' || currentStep === 'generation') ? (
        renderGenerationScreen()
      ) : currentStep === 'review' || currentStep === 'customize' ? (
        renderReviewScreen()
      ) : currentStep === 'complete' ? (
        renderCompleteScreen()
      ) : (
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {chatMessages.map(renderMessage)}
            
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
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

          {/* Input Area */}
          {['business_type', 'target_audience', 'pain_points'].includes(currentStep) && (
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

          {/* Product Selection */}
          {currentStep === 'products' && businessContext.productSelection === 'manual' && products.length > 0 && (
            <div className="p-6 bg-white border-t border-slate-200">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      const newSelected = businessContext.selectedProducts.includes(product.id)
                        ? businessContext.selectedProducts.filter(id => id !== product.id)
                        : [...businessContext.selectedProducts, product.id];
                      setBusinessContext(prev => ({ ...prev, selectedProducts: newSelected }));
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      businessContext.selectedProducts.includes(product.id)
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <p className="font-medium text-slate-800">{product.name}</p>
                    <p className="text-sm text-emerald-600">R$ {product.value.toLocaleString('pt-BR')}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setCurrentStep('analysis');
                  runAIAnalysis();
                }}
                disabled={businessContext.selectedProducts.length === 0}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold disabled:opacity-50 transition-all"
              >
                Continuar com {businessContext.selectedProducts.length} produto(s) selecionado(s)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormConsultant;
