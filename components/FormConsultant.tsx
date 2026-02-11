// FormConsultant.tsx - Consultor Inteligente de Formulários com Edição Completa
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
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
  Heart,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  name: string;
  value: number;
  ai_description: string | null;
}

interface QuestionOption {
  id: string;
  text: string;
}

interface GeneratedQuestion {
  id: string;
  text: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'scale';
  options: QuestionOption[];
  insight: string;
  linkedProducts?: string[];
}

interface IdentificationField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone';
  enabled: boolean;
  required: boolean;
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
  | 'custom_objective'
  | 'custom_objective_detail'
  | 'tone'
  | 'identification'
  | 'identification_custom'
  | 'products' 
  | 'manual_mode'
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
  formObjective: 'qualify' | 'diagnose' | 'segment' | 'custom';
  customObjective: string;
  qualificationCriteria: string; // Novo campo: critérios de qualificação
  productSelection: 'manual' | 'auto';
  selectedProducts: string[];
  formTone: 'formal' | 'informal' | 'direct' | 'friendly';
  identificationFields: IdentificationField[];
}

const FormConsultant: React.FC<FormConsultantProps> = ({ 
  supabase, 
  userId, 
  onClose, 
  onSaveForm,
  existingForm 
}) => {
  const tenantId = useTenantId();

    const [currentStep, setCurrentStep] = useState<ConsultantStep>('welcome');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [formName, setFormName] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState<GeneratedQuestion>({
    id: '',
    text: '',
    type: 'single_choice',
    options: [{ id: 'opt_1', text: '' }],
    insight: ''
  });
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [isEditingTone, setIsEditingTone] = useState(false); // Modo de edição de tom (reescrever perguntas existentes)
  
  // Estabilizar existingForm para evitar re-renders
  const stableExistingForm = useMemo(() => existingForm, [existingForm?.id]);
  
  // Carregar perguntas existentes quando em modo de edição
  useEffect(() => {
    if (stableExistingForm && stableExistingForm.questions) {
      console.log('Carregando perguntas existentes:', JSON.stringify(stableExistingForm.questions, null, 2));
      
      // Mapear tipos do banco para tipos do componente
      const typeMap: Record<string, GeneratedQuestion['type']> = {
        'single': 'single_choice',
        'single_choice': 'single_choice',
        'multiple': 'multiple_choice',
        'multiple_choice': 'multiple_choice',
        'text': 'text',
        'scale': 'scale'
      };
      
      const loadedQuestions: GeneratedQuestion[] = stableExistingForm.questions.map((q: any, qIdx: number) => {
        // Processar opções - pode vir como array de strings ou array de objetos
        let processedOptions: QuestionOption[] = [];
        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          processedOptions = q.options.map((opt: any, idx: number) => {
            // Se opt é string, converter para objeto
            if (typeof opt === 'string') {
              return { id: `opt_${qIdx}_${idx}`, text: opt };
            }
            // Se opt é objeto, extrair texto - PRIORIZAR label (formato do banco)
            const optText = typeof opt.label === 'string' && opt.label.trim() 
              ? opt.label 
              : (typeof opt.text === 'string' && opt.text.trim() ? opt.text : '');
            return {
              id: opt.id ? String(opt.id) : `opt_${qIdx}_${idx}`,
              text: optText
            };
          }).filter((opt: QuestionOption) => opt.text.trim() !== ''); // Remover opções vazias
        }
        
        // Mapear tipo do banco para tipo do componente
        const mappedType = typeMap[q.type] || 'single_choice';
        
        console.log(`Pergunta ${qIdx + 1}: tipo=${q.type} -> ${mappedType}, opções=`, processedOptions);
        
        return {
          id: q.id ? String(q.id) : `q_${Date.now()}_${qIdx}`,
          text: q.text || q.question || '',
          type: mappedType,
          options: processedOptions,
          insight: q.insight || q.ai_insight || 'Pergunta do formulário',
          linkedProducts: q.linkedProducts || q.linked_products || []
        };
      });
      
      console.log('Perguntas carregadas:', loadedQuestions);
      setGeneratedQuestions(loadedQuestions);
      setFormName(stableExistingForm.name || '');
      
      // Carregar contexto se existir
      if (stableExistingForm.ai_context?.businessContext) {
        setBusinessContext(prev => ({
          ...prev,
          ...stableExistingForm.ai_context.businessContext
        }));
      }
    }
  }, [stableExistingForm]);

  const [businessContext, setBusinessContext] = useState<BusinessContext>({
    businessType: '',
    businessDescription: '',
    targetAudience: '',
    audienceCharacteristics: '',
    mainPainPoints: [],
    desiredOutcome: '',
    formObjective: 'qualify',
    customObjective: '',
    qualificationCriteria: '', // Novo campo inicializado
    productSelection: 'auto',
    selectedProducts: [],
    formTone: 'friendly',
    identificationFields: [
      { id: 'name', label: 'Nome', type: 'text', enabled: true, required: true },
      { id: 'email', label: 'E-mail', type: 'email', enabled: true, required: true },
      { id: 'phone', label: 'Telefone', type: 'phone', enabled: true, required: false },
    ]
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping]);

  // Fetch products and business profile on mount
  useEffect(() => {
    if (supabase && userId && tenantId) {
      fetchProducts();
      fetchBusinessProfile();
    }
  }, [supabase, userId, tenantId]);

  const fetchBusinessProfile = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('business_profile')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (!error && data) {
        setBusinessProfile(data);
        // Preencher o contexto automaticamente se o perfil existir
        setBusinessContext(prev => ({
          ...prev,
          businessType: data.business_type || '',
          businessDescription: data.business_description || '',
          targetAudience: data.target_audience || '',
          formTone: data.brand_tone || 'friendly'
        }));
      }
      setProfileLoaded(true);
    } catch (error) {
      console.log('Perfil do negócio não encontrado');
      setProfileLoaded(true);
    }
  };

    // Initial welcome message - personalizado se tiver perfil ou modo de edição
  useEffect(() => {
    if (chatMessages.length === 0 && profileLoaded && !initialMessageSent) {
      setInitialMessageSent(true);
      if (stableExistingForm) {
        // Modo de edição
        addAssistantMessage(
          `Olá! 👋 Você está editando o formulário **${stableExistingForm.name || 'Sem título'}**.

` +
          `O que você gostaria de fazer?`,
          [
            { label: "🎨 Alterar o tom das perguntas", value: "edit_tone" },
            { label: "✏️ Alterar perguntas e alternativas manualmente", value: "edit_questions" }
          ]
        );
      } else if (businessProfile?.company_name) {
        addAssistantMessage(
          `Olá! 👋 Sou seu consultor de crescimento da **${businessProfile.company_name}**.

` +
          `Como já conheço seu negócio, vou criar perguntas estratégicas baseadas no seu perfil.

` +
          `Vamos criar um formulário inteligente que transforma visitantes em oportunidades reais de venda?`,
          [
            { label: "Usar meu perfil e começar!", value: "start_with_profile", icon: Sparkles },
            { label: "Quero informar novos dados", value: "start", icon: Edit3 }
          ]
        );
      } else {
        addAssistantMessage(
          "Olá! 👋 Sou seu consultor de crescimento HelloGrowth.\n\n" +
          "Vou te guiar na criação de um formulário inteligente que transforma visitantes em oportunidades reais de venda.\n\n" +
          "Para criar perguntas que realmente convertem, preciso entender melhor o seu negócio. Vamos começar?",
          [{ label: "Vamos começar!", value: "start", icon: Sparkles }]
        );
      }
    }
  }, [profileLoaded, businessProfile, stableExistingForm, chatMessages.length, initialMessageSent]);

  const fetchProducts = async () => {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      console.log('[FormConsultant] Buscando produtos com tenant_id:', tenantId);
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('tenant_id', tenantId);
      
      console.log('[FormConsultant] Produtos retornados:', data, 'Erro:', error);

      if (!error && data) {
        setProducts(data);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const addAssistantMessage = (content: string, options?: { label: string; value: string; icon?: any }[]) => {
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
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
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }]);
  };

  const handleOptionClick = (value: string, label: string) => {
    addUserMessage(label);
    
    switch (value) {
      case 'start':
        setCurrentStep('business_type');
        setTimeout(() => {
          addAssistantMessage(
            "Excelente! Para começar, me conta: **qual é o tipo do seu negócio?**\n\n" +
            "Pode ser uma clínica, loja, consultoria, agência, restaurante... Descreva brevemente o que você faz."
          );
        }, 500);
        break;

      case 'start_with_profile':
        // Primeiro pedir o objetivo específico deste formulário
        setCurrentStep('custom_objective');
        setTimeout(() => {
          const profileSummary = businessProfile ? 
            `\n\n📊 **Seu perfil:**\n` +
            `• Negócio: ${businessProfile.business_type || 'Não informado'}\n` +
            `• Público: ${businessProfile.target_audience?.substring(0, 100) || 'Não informado'}...\n` +
            `• Tom: ${businessProfile.brand_tone || 'amigável'}` : '';
          
          addAssistantMessage(
            `Perfeito! Vou usar as informações do seu perfil para criar perguntas estratégicas.${profileSummary}\n\n` +
            "**Antes de começar, me conte: qual é o objetivo ESPECÍFICO deste formulário?**\n\n" +
            "Por exemplo: 'Qualificar leads para harmonização facial', 'Captar interessados em consultoria empresarial', etc.\n\n" +
            "💡 Quanto mais específico, melhor serão as perguntas!"
          );
        }, 500);
        break;

      case 'custom_objective_input':
        setBusinessContext(prev => ({ ...prev, customObjective: userInput, formObjective: 'qualify' }));
        setCurrentStep('custom_objective_detail');
        setTimeout(() => {
          addAssistantMessage(
            `Então você deseja: "${userInput}". \n\n` +
            "**Seria isso ou quer adicionar mais alguma coisa?**",
            [
              { label: "✅ Sim, é isso mesmo!", value: "confirm_objective" },
              { label: "📝 Quero adicionar mais informações", value: "add_more_objective" }
            ]
          );
        }, 500);
        break;

      case 'confirm_objective':
        setCurrentStep('tone');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Agora vamos definir o tom das perguntas.\n\n" +
            "**Qual tom você prefere para o formulário?**",
            [
              { label: "🎯 Direto - Objetivo e sem rodeios", value: "tone_direct" },
              { label: "😊 Informal - Descontraído e amigável", value: "tone_informal" },
              { label: "👔 Formal - Profissional e corporativo", value: "tone_formal" },
              { label: "💚 Amigável - Acolhedor e empático", value: "tone_friendly" }
            ]
          );
        }, 500);
        break;

      case 'add_more_objective':
        setCurrentStep('custom_objective_detail');
        setTimeout(() => {
          addAssistantMessage(
            "Claro! Me conte o que mais você gostaria de adicionar ao objetivo do formulário:"
          );
        }, 500);
        break;

      case 'custom_objective_detail_input':
        // Agora salva em qualificationCriteria ao invés de concatenar no objetivo
        setBusinessContext(prev => ({ 
          ...prev, 
          qualificationCriteria: userInput
        }));
        setCurrentStep('analysis');
        setTimeout(() => {
          addAssistantMessage(
            "🚀 **Perfeito! Agora vou criar perguntas estratégicas que capturam exatamente essas informações.**\n\n" +
            "⏳ Isso pode levar alguns segundos enquanto analiso a melhor abordagem..."
          );
          runAIAnalysis();
        }, 500);
        break;

      case 'qualify':
        setBusinessContext(prev => ({ ...prev, formObjective: 'qualify' }));
        setCurrentStep('tone');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Agora vamos definir o tom das perguntas.\n\n" +
            "**Qual tom você prefere para o formulário?**",
            [
              { label: "🎯 Direto - Objetivo e sem rodeios", value: "tone_direct" },
              { label: "😊 Informal - Descontraído e amigável", value: "tone_informal" },
              { label: "👔 Formal - Profissional e corporativo", value: "tone_formal" },
              { label: "💚 Amigável - Acolhedor e empático", value: "tone_friendly" }
            ]
          );
        }, 500);
        break;

      case 'collect_info':
        setBusinessContext(prev => ({ ...prev, formObjective: 'collect_info' }));
        setCurrentStep('tone');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Vamos criar perguntas que identificam quem está pronto para comprar.\n\n" +
            "**Qual tom você prefere para as perguntas?**",
            [
              { label: "🎯 Direto - Objetivo e sem rodeios", value: "tone_direct" },
              { label: "😊 Informal - Descontraído e amigável", value: "tone_informal" },
              { label: "👔 Formal - Profissional e corporativo", value: "tone_formal" },
              { label: "💚 Amigável - Acolhedor e empático", value: "tone_friendly" }
            ]
          );
        }, 500);
        break;

      case 'custom':
        setBusinessContext(prev => ({ ...prev, formObjective: 'custom' }));
        setCurrentStep('tone');
        setTimeout(() => {
          addAssistantMessage(
            "Entendi! Me conta mais sobre o objetivo específico que você tem em mente.\n\n" +
            "**Qual tom você prefere para as perguntas?**",
            [
              { label: "🎯 Direto - Objetivo e sem rodeios", value: "tone_direct" },
              { label: "😊 Informal - Descontraído e amigável", value: "tone_informal" },
              { label: "👔 Formal - Profissional e corporativo", value: "tone_formal" },
              { label: "💚 Amigável - Acolhedor e empático", value: "tone_friendly" }
            ]
          );
        }, 500);
        break;

      case 'tone_direct':
      case 'tone_informal':
      case 'tone_formal':
      case 'tone_friendly':
        const toneMap: Record<string, 'formal' | 'informal' | 'direct' | 'friendly'> = {
          'tone_direct': 'direct',
          'tone_informal': 'informal',
          'tone_formal': 'formal',
          'tone_friendly': 'friendly'
        };
        setBusinessContext(prev => ({ ...prev, formTone: toneMap[value] }));
        // Recarregar produtos antes de verificar para garantir dados atualizados
        (async () => {
          await fetchProducts();
          // Aguardar um momento para o estado atualizar
          setTimeout(() => {
            console.log('[FormConsultant] Produtos disponíveis após reload:', products.length, products);
            if (products.length > 0) {
              setCurrentStep('products');
              setTimeout(() => {
                addAssistantMessage(
                  "📦 **Perfeito! Agora vamos focar nos produtos/serviços.**\n\n" +
                  "Você quer que o formulário seja focado em **produtos específicos** ou deixo a IA escolher automaticamente?\n\n" +
                  "💡 **Dica:** Se você tem uma clínica com fisioterapia E odontologia, mas quer um formulário só para fisioterapia, selecione manualmente!",
                  [
                    { label: "🎯 Selecionar Produtos Manualmente", value: "products_manual" },
                    { label: "✨ Deixar a IA Escolher Automaticamente", value: "products_auto" }
                  ]
                );
              }, 500);
            } else {
              setCurrentStep('custom_objective_detail');
              setTimeout(() => {
                addAssistantMessage(
                  "🎯 **Agora a parte mais importante para criar um formulário realmente inteligente!**\n\n" +
                  "Para que este formulário seja perfeito, quais informações são **indispensáveis** para você decidir se este é um bom cliente?\n\n" +
                  "💡 **Exemplos:**\n" +
                  "• Poder aquisitório (quanto pode gastar)\n" +
                  "• Urgência (quando precisa do serviço)\n" +
                  "• Problema específico que quer resolver\n" +
                  "• Experiência anterior com produtos similares\n" +
                  "• Expectativas de resultado\n\n" +
                  "Quanto mais específico você for, mais assertivas serão as perguntas! 🚀"
                );
              }, 500);
            }
          }, 200);
        })();
        break;



      case 'products_manual':
        setBusinessContext(prev => ({ ...prev, productSelection: 'manual' }));
        // Manter o step como 'products' para mostrar a interface de seleção
        setTimeout(() => {
          addAssistantMessage(
            "👇 **Ótimo! Selecione abaixo os produtos/serviços que este formulário deve focar:**\n\n" +
            "Você pode selecionar quantos quiser. Clique nos produtos para marcar/desmarcar."
          );
        }, 500);
        break;

      case 'products_auto':
        setBusinessContext(prev => ({ ...prev, productSelection: 'auto', selectedProducts: [] }));
        setCurrentStep('custom_objective_detail');
        setTimeout(() => {
          addAssistantMessage(
            "🎯 **Agora a parte mais importante para criar um formulário realmente inteligente!**\n\n" +
            "Para que este formulário seja perfeito, quais informações são **indispensáveis** para você decidir se este é um bom cliente?\n\n" +
            "💡 **Exemplos:**\n" +
            "• Poder aquisitório (quanto pode gastar)\n" +
            "• Urgência (quando precisa do serviço)\n" +
            "• Problema específico que quer resolver\n" +
            "• Experiência anterior com produtos similares\n" +
            "• Expectativas de resultado\n\n" +
            "Quanto mais específico você for, mais assertivas serão as perguntas! 🚀"
          );
        }, 500);
        break;

      case 'confirm_products':
        setCurrentStep('custom_objective_detail');
        setTimeout(() => {
          addAssistantMessage(
            "🎯 **Agora a parte mais importante para criar um formulário realmente inteligente!**\n\n" +
            "Para que este formulário seja perfeito, quais informações são **indispensáveis** para você decidir se este é um bom cliente?\n\n" +
            "💡 **Exemplos:**\n" +
            "• Poder aquisitório (quanto pode gastar)\n" +
            "• Urgência (quando precisa do serviço)\n" +
            "• Problema específico que quer resolver\n" +
            "• Experiência anterior com produtos similares\n" +
            "• Expectativas de resultado\n\n" +
            "Quanto mais específico você for, mais assertivas serão as perguntas! 🚀"
          );
        }, 500);
        break;

      case 'edit_tone':
        setIsEditingTone(true); // Ativar modo de edição de tom
        setCurrentStep('tone');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Vou **reescrever as perguntas existentes** com o novo tom que você escolher.\n\n" +
            "As perguntas e alternativas continuarão as mesmas, apenas a forma de perguntar vai mudar.\n\n" +
            "**Qual tom você prefere?**",
            [
              { label: "🎯 Direto - Objetivo e sem rodeios", value: "rewrite_tone_direct" },
              { label: "😊 Informal - Descontraído e amigável", value: "rewrite_tone_informal" },
              { label: "👔 Formal - Profissional e corporativo", value: "rewrite_tone_formal" },
              { label: "💚 Amigável - Acolhedor e empático", value: "rewrite_tone_friendly" }
            ]
          );
        }, 500);
        break;

      case 'edit_questions':
        setCurrentStep('review');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Vou te levar para a tela de revisão onde você pode editar manualmente cada pergunta e alternativa.\n\n" +
            "✅ Clique no botão 'Próximo' abaixo para ir para a tela de edição."
          );
        }, 500);
        break;

      case 'rewrite_tone_direct':
      case 'rewrite_tone_informal':
      case 'rewrite_tone_formal':
      case 'rewrite_tone_friendly':
        const rewriteToneMap: Record<string, 'formal' | 'informal' | 'direct' | 'friendly'> = {
          'rewrite_tone_direct': 'direct',
          'rewrite_tone_informal': 'informal',
          'rewrite_tone_formal': 'formal',
          'rewrite_tone_friendly': 'friendly'
        };
        const newTone = rewriteToneMap[value];
        setBusinessContext(prev => ({ ...prev, formTone: newTone }));
        setCurrentStep('analysis');
        setTimeout(() => {
          addAssistantMessage(
            `✅ Vou reescrever suas ${generatedQuestions.length} perguntas com tom **${newTone === 'direct' ? 'direto' : newTone === 'informal' ? 'informal' : newTone === 'formal' ? 'formal' : 'amigável'}**.\n\n` +
            "⏳ Isso pode levar alguns segundos..."
          );
          rewriteQuestionsWithTone(newTone);
        }, 500);
        break;

      case 'edit_full':
        // Resetar contexto e começar do zero
        setBusinessContext({
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
          formTone: 'friendly',
          identificationFields: [
            { id: 'name', label: 'Nome', type: 'text', enabled: true, required: true },
            { id: 'email', label: 'E-mail', type: 'email', enabled: true, required: true },
            { id: 'phone', label: 'Telefone', type: 'phone', enabled: true, required: false },
          ]
        });
        setGeneratedQuestions([]);
        setCurrentStep('business_type');
        setTimeout(() => {
          addAssistantMessage(
            "Ok! Vamos começar do zero.\n\n" +
            "**Qual é o tipo do seu negócio?**\n\n" +
            "Pode ser uma clínica, loja, consultoria, agência, restaurante... Descreva brevemente o que você faz."
          );
        }, 500);
        break;

      case 'retry':
        handleRetry();
        break;
    }
  };

  const handleUserInput = () => {
    if (!userInput.trim()) return;
    
    const input = userInput.trim();
    setUserInput('');

    // Processar objetivo customizado - não adiciona mensagem aqui pois handleOptionClick já faz isso
    if (currentStep === 'custom_objective') {
      handleOptionClick('custom_objective_input', input);
      return;
    }

    if (currentStep === 'custom_objective_detail') {
      handleOptionClick('custom_objective_detail_input', input);
      return;
    }

    // Para outros casos, adiciona a mensagem do usuário
    addUserMessage(input);

    switch (currentStep) {
      case 'business_type':
        setBusinessContext(prev => ({ 
          ...prev, 
          businessType: input,
          businessDescription: input 
        }));
        setCurrentStep('target_audience');
        setTimeout(() => {
          addAssistantMessage(
            `Entendi! Você trabalha com **${input}**.\n\n` +
            "Agora me conta: **quem é o seu cliente ideal?**\n\n" +
            "Descreva o perfil do seu público-alvo (idade, gênero, comportamento, o que buscam...)."
          );
        }, 500);
        break;

      case 'target_audience':
        setBusinessContext(prev => ({ 
          ...prev, 
          targetAudience: input,
          audienceCharacteristics: input 
        }));
        setCurrentStep('pain_points');
        setTimeout(() => {
          addAssistantMessage(
            "Ótimo! Agora a parte mais importante:\n\n" +
            "**Quais são as principais dores ou desejos do seu cliente?**\n\n" +
            "O que eles querem resolver? O que os motiva a procurar você?"
          );
        }, 500);
        break;

      case 'pain_points':
        setBusinessContext(prev => ({ 
          ...prev, 
          mainPainPoints: [input],
          desiredOutcome: input 
        }));
        setCurrentStep('objective');
        setTimeout(() => {
          addAssistantMessage(
            "Excelente! Agora eu já tenho uma visão clara do seu negócio.\n\n" +
            "**Qual é o objetivo principal deste formulário?**",
            [
              { label: "🎯 Qualificar Leads - Identificar quem está pronto para comprar", value: "qualify", icon: Target },
              { label: "✨ Outro Objetivo - Tenho algo específico em mente", value: "custom", icon: Sparkles }
            ]
          );
        }, 500);
        break;
    }
  };

  // Função para reescrever perguntas existentes com novo tom
  const rewriteQuestionsWithTone = async (tone: 'formal' | 'informal' | 'direct' | 'friendly') => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentStep('generation');

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
      const toneDescriptions: Record<string, string> = {
        'direct': 'direto e objetivo, sem rodeios',
        'informal': 'descontraído e amigável, como uma conversa casual',
        'formal': 'profissional e corporativo, com linguagem técnica',
        'friendly': 'acolhedor e empático, focado em criar conexão'
      };

      const questionsToRewrite = generatedQuestions.map(q => ({
        text: q.text,
        options: q.options.map(o => o.text)
      }));

      const prompt = `Você é um especialista em copywriting. Reescreva as perguntas abaixo mantendo o MESMO SIGNIFICADO e AS MESMAS OPÇÕES, apenas mudando o tom para: ${toneDescriptions[tone]}.

PERGUNTAS ORIGINAIS:
${JSON.stringify(questionsToRewrite, null, 2)}

IMPORTANTE:
- Mantenha EXATAMENTE as mesmas opções de resposta, apenas reescreva o texto
- Não adicione nem remova opções
- Não mude o significado das perguntas
- Apenas ajuste o tom da linguagem

Responda APENAS com um JSON válido no formato:
{
  "questions": [
    {
      "text": "Pergunta reescrita",
      "options": ["Opção 1 reescrita", "Opção 2 reescrita", ...]
    }
  ]
}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      if (!response.ok) throw new Error('Erro na API');

      const data = await response.json();
      let parsed;
      try {
        const cleanedResponse = data.response.replace(/```json\n?|```\n?/g, '').trim();
        parsed = JSON.parse(cleanedResponse);
      } catch {
        throw new Error('Erro ao processar resposta');
      }

      // Atualizar perguntas mantendo IDs e insights originais
      const rewrittenQuestions = generatedQuestions.map((q, idx) => {
        const rewritten = parsed.questions[idx];
        if (!rewritten) return q;
        
        return {
          ...q,
          text: rewritten.text || q.text,
          options: q.options.map((opt, optIdx) => ({
            ...opt,
            text: rewritten.options?.[optIdx] || opt.text
          }))
        };
      });

      setGeneratedQuestions(rewrittenQuestions);
      setGenerationProgress(100);
      setIsEditingTone(false);
      
      setTimeout(() => {
        setCurrentStep('review');
        setIsGenerating(false);
        addAssistantMessage(
          "🎉 **Pronto!** Reescrevi todas as perguntas com o novo tom.\n\n" +
          "Você pode revisar e ajustar o que quiser antes de salvar."
        );
      }, 500);

    } catch (error) {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setIsEditingTone(false);
      setCurrentStep('review');
      addAssistantMessage(
        "❌ Houve um erro ao reescrever as perguntas. As perguntas originais foram mantidas.\n\n" +
        "Você pode editar manualmente na tela de revisão."
      );
    }
  };

  const runAIAnalysis = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentStep('generation');

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
      // Preparar informações detalhadas dos produtos selecionados
      const selectedProductsInfo = products
        .filter(p => businessContext.selectedProducts.includes(p.id))
        .map(p => ({
          name: p.name,
          value: p.value,
          description: p.ai_description || 'Sem descrição'
        }));

      const toneDescriptions: Record<string, string> = {
        'direct': 'direto e objetivo, sem rodeios',
        'informal': 'descontraído e amigável, como uma conversa casual',
        'formal': 'profissional e corporativo, com linguagem técnica',
        'friendly': 'acolhedor e empático, focado em criar conexão'
      };

      // Construir seção de produtos de forma mais inteligente
      let productsSection = '';
      if (selectedProductsInfo.length > 0) {
        productsSection = `\n\n📦 PRODUTOS/SERVIÇOS EM FOCO (PRIORIDADE ALTA):\n`;
        selectedProductsInfo.forEach(p => {
          productsSection += `\n**${p.name}** (R$ ${p.value.toFixed(2)})\n`;
          productsSection += `Descrição: ${p.description}\n`;
        });
        productsSection += `\n🎯 IMPORTANTE: Crie perguntas que identifiquem se o cliente tem necessidades/problemas que ESTES produtos resolvem. Use as descrições acima para entender o que cada produto oferece.`;
      }

      const prompt = `Você é um especialista em criação de formulários de qualificação de leads. Crie 5 perguntas estratégicas para um formulário.

CONTEXTO DO NEGÓCIO:
- Tipo: ${businessContext.businessType}
- Público-alvo: ${businessContext.targetAudience}
- Dores/Desejos: ${businessContext.mainPainPoints.join(', ')}
- Objetivo: ${businessContext.formObjective === 'qualify' ? 'Qualificar leads para venda' : businessContext.customObjective}
- Tom: ${toneDescriptions[businessContext.formTone]}${productsSection}

🎯 CRITÉRIOS DE QUALIFICAÇÃO (PRIORIDADE MÁXIMA):
${businessContext.qualificationCriteria ? businessContext.qualificationCriteria : 'Não especificado'}

REGRAS:
1. **OBRIGATÓRIO**: Crie perguntas que capturem TODAS as informações dos CRITÉRIOS DE QUALIFICAÇÃO acima
2. ${selectedProductsInfo.length > 0 ? '**OBRIGATÓRIO**: Crie perguntas que identifiquem se o cliente precisa dos PRODUTOS EM FOCO listados acima' : 'As perguntas devem qualificar o lead para os produtos/serviços do negócio'}
3. As perguntas devem ser INDIRETAS e naturais, não pareçam um interrogatório de vendas
4. Cada pergunta deve revelar algo sobre a intenção de compra e qualificação do cliente
5. Use o tom especificado (${businessContext.formTone})
6. Varie os tipos: single_choice (escolha única), multiple_choice (múltipla escolha), text (texto livre)
7. Para perguntas de escolha, forneça 3-5 opções relevantes
8. Se os critérios mencionam "poder aquisitório" ou "quanto pode gastar", CRIE uma pergunta de faixa de preço
9. Se os critérios mencionam "urgência" ou "prazo", CRIE uma pergunta sobre timeline

Responda APENAS com JSON válido neste formato:
{
  "questions": [
    {
      "text": "Texto da pergunta",
      "type": "single_choice",
      "options": ["Opção 1", "Opção 2", "Opção 3"],
      "insight": "O que essa resposta revela sobre o cliente"
    }
  ]
}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      if (!response.ok) throw new Error("Erro na API");

      const data = await response.json();
      let parsed;

      try {
        const cleanResponse = data.response
          .replace(/```json\n?|\n?```/g, "")
          .trim();
        parsed = JSON.parse(cleanResponse);
      } catch {
        throw new Error("Resposta da IA inválida");
      }

      const questions: GeneratedQuestion[] = parsed.questions.map((q: any, idx: number) => ({
        id: `q_${Date.now()}_${idx}`,
        text: q.text,
        type: q.type || 'single_choice',
        options: (q.options || []).map((opt: string, optIdx: number) => ({
          id: `opt_${idx}_${optIdx}`,
          text: opt
        })),
        insight: q.insight || ''
      }));

      setGeneratedQuestions(questions);
      setGenerationProgress(100);
      
      setTimeout(() => {
        setCurrentStep('review');
        setIsGenerating(false);
        addAssistantMessage(
          "🎉 **Pronto!** Criei as perguntas estratégicas para o seu formulário.\n\n" +
          "Você pode **editar** o texto das perguntas, **modificar** as opções de resposta, **mudar o tipo** (única, múltipla ou texto), **adicionar** novas perguntas ou **remover** as que não quiser.\n\n" +
          "Quando estiver satisfeito, clique em Salvar!"
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
      ...(stableExistingForm?.id && { id: stableExistingForm.id }), // Mantém ID se for edição
      name: formName || `Formulário ${new Date().toLocaleDateString('pt-BR')}`,
      description: businessContext.businessDescription,
      identification_fields: businessContext.identificationFields.filter(f => f.enabled),
      questions: generatedQuestions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options.map((opt, idx) => ({
          id: opt.id || `opt_${idx}`,
          label: opt.text,
          value: 0
        })),
        required: true
      })),
      ai_context: {
        products: products,
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

  // Question editing functions
  const handleRemoveQuestion = (id: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleEditQuestion = (id: string, field: keyof GeneratedQuestion, value: any) => {
    setGeneratedQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const handleAddOption = (questionId: string) => {
    setGeneratedQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: [...q.options, { id: `opt_${Date.now()}`, text: '' }]
        };
      }
      return q;
    }));
  };

  const handleRemoveOption = (questionId: string, optionId: string) => {
    setGeneratedQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.filter(opt => opt.id !== optionId)
        };
      }
      return q;
    }));
  };

  const handleEditOption = (questionId: string, optionId: string, newText: string) => {
    setGeneratedQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(opt => 
            opt.id === optionId ? { ...opt, text: newText } : opt
          )
        };
      }
      return q;
    }));
  };

  const handleAddNewQuestion = () => {
    const newQ: GeneratedQuestion = {
      id: `q_${Date.now()}`,
      text: newQuestion.text,
      type: newQuestion.type,
      options: newQuestion.type === 'text' ? [] : newQuestion.options.filter(o => o.text.trim()),
      insight: newQuestion.insight || 'Pergunta personalizada'
    };
    setGeneratedQuestions(prev => [...prev, newQ]);
    setShowAddQuestion(false);
    setNewQuestion({
      id: '',
      text: '',
      type: 'single_choice',
      options: [{ id: 'opt_1', text: '' }],
      insight: ''
    });
  };

  const handleChangeQuestionType = (questionId: string, newType: GeneratedQuestion['type']) => {
    setGeneratedQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        if (newType === 'text') {
          return { ...q, type: newType, options: [] };
        } else if (q.options.length === 0) {
          return { 
            ...q, 
            type: newType, 
            options: [
              { id: `opt_${Date.now()}_1`, text: 'Opção 1' },
              { id: `opt_${Date.now()}_2`, text: 'Opção 2' }
            ] 
          };
        }
        return { ...q, type: newType };
      }
      return q;
    }));
  };

  const handleToggleIdentificationField = (fieldId: string) => {
    setBusinessContext(prev => ({
      ...prev,
      identificationFields: prev.identificationFields.map(f =>
        f.id === fieldId ? { ...f, enabled: !f.enabled } : f
      )
    }));
  };

  const handleToggleFieldRequired = (fieldId: string) => {
    setBusinessContext(prev => ({
      ...prev,
      identificationFields: prev.identificationFields.map(f =>
        f.id === fieldId ? { ...f, required: !f.required } : f
      )
    }));
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
      if (['welcome', 'business_type', 'target_audience', 'pain_points', 'objective', 'tone', 'identification', 'products'].includes(currentStep)) return 0;
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
        <p className="text-sm text-slate-400">{Math.round(generationProgress)}% concluído</p>
      </div>
    </div>
  );

  // Render Review Screen with full editing capabilities
  const renderReviewScreen = () => (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Revise e edite suas perguntas</h2>
        <p className="text-slate-500 mb-6">Você pode editar textos, modificar opções, mudar tipos e adicionar novas perguntas</p>
        
        {/* Identification Fields Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={20} className="text-emerald-500" />
            Campos de Identificação
          </h3>
          <p className="text-sm text-slate-500 mb-4">Defina quais informações coletar do cliente no início do formulário</p>
          <div className="space-y-3">
            {businessContext.identificationFields.map(field => (
              <div key={field.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    onChange={() => handleToggleIdentificationField(field.id)}
                    className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className={field.enabled ? 'text-slate-800' : 'text-slate-400'}>{field.label}</span>
                </div>
                {field.enabled && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={() => handleToggleFieldRequired(field.id)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-slate-600">Obrigatório</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4 mb-6">
          {generatedQuestions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-4">
                  {/* Question Text */}
                  <textarea
                    value={question.text}
                    onChange={(e) => handleEditQuestion(question.id, 'text', e.target.value)}
                    className="w-full text-lg font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    rows={2}
                  />
                  
                  {/* Question Type Selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">Tipo:</span>
                    <select
                      value={question.type}
                      onChange={(e) => handleChangeQuestionType(question.id, e.target.value as GeneratedQuestion['type'])}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="single_choice">Escolha Única</option>
                      <option value="single">Escolha Única</option>
                      <option value="multiple_choice">Múltipla Escolha</option>
                      <option value="multiple">Múltipla Escolha</option>
                      <option value="text">Texto Livre</option>
                      <option value="scale">Escala 1-10</option>
                    </select>
                  </div>
                  
                  {/* Options (for choice types) */}
                  {(question.type === 'single_choice' || question.type === 'multiple_choice' || question.type === 'single' || question.type === 'multiple') && question.options && question.options.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm text-slate-500">Opções de resposta:</span>
                      {question.options.map((opt, optIdx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <span className="text-slate-400 text-sm w-6">{optIdx + 1}.</span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleEditOption(question.id, opt.id, e.target.value)}
                            placeholder="Digite a opção..."
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                          {question.options.length > 1 && (
                            <button
                              onClick={() => handleRemoveOption(question.id, opt.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddOption(question.id)}
                        className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 mt-2"
                      >
                        <Plus size={16} />
                        Adicionar opção
                      </button>
                    </div>
                  )}
                  
                  {/* Insight */}
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
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

        {/* Add New Question Button */}
        {!showAddQuestion ? (
          <button
            onClick={() => setShowAddQuestion(true)}
            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Adicionar Nova Pergunta
          </button>
        ) : (
          <div className="bg-white rounded-xl border border-emerald-200 p-5 mb-6">
            <h4 className="font-semibold text-slate-800 mb-4">Nova Pergunta</h4>
            <div className="space-y-4">
              <textarea
                value={newQuestion.text}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Digite o texto da pergunta..."
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                rows={2}
              />
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Tipo:</span>
                <select
                  value={newQuestion.type}
                  onChange={(e) => {
                    const type = e.target.value as GeneratedQuestion['type'];
                    setNewQuestion(prev => ({
                      ...prev,
                      type,
                      options: type === 'text' ? [] : [{ id: 'opt_1', text: '' }]
                    }));
                  }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="single_choice">Escolha Única</option>
                  <option value="multiple_choice">Múltipla Escolha</option>
                  <option value="text">Texto Livre</option>
                  <option value="scale">Escala 1-10</option>
                </select>
              </div>
              
              {(newQuestion.type === 'single_choice' || newQuestion.type === 'multiple_choice') && (
                <div className="space-y-2">
                  <span className="text-sm text-slate-500">Opções:</span>
                  {newQuestion.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOptions = [...newQuestion.options];
                          newOptions[idx] = { ...newOptions[idx], text: e.target.value };
                          setNewQuestion(prev => ({ ...prev, options: newOptions }));
                        }}
                        placeholder={`Opção ${idx + 1}`}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      {newQuestion.options.length > 1 && (
                        <button
                          onClick={() => {
                            setNewQuestion(prev => ({
                              ...prev,
                              options: prev.options.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="p-2 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setNewQuestion(prev => ({
                        ...prev,
                        options: [...prev.options, { id: `opt_${Date.now()}`, text: '' }]
                      }));
                    }}
                    className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    <Plus size={16} />
                    Adicionar opção
                  </button>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddQuestion(false)}
                  className="flex-1 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddNewQuestion}
                  disabled={!newQuestion.text.trim()}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Name Input */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 mt-6">
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
          {['business_type', 'target_audience', 'pain_points', 'custom_objective', 'custom_objective_detail'].includes(currentStep) && (
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
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="font-medium text-slate-800">{product.name}</p>
                    <p className="text-sm text-emerald-600">R$ {product.value.toLocaleString('pt-BR')}</p>
                  </button>
                ))}
              </div>
              {businessContext.selectedProducts.length > 0 && (
                <button
                  onClick={() => handleOptionClick('confirm_products', `${businessContext.selectedProducts.length} produtos selecionados`)}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  Confirmar Seleção ({businessContext.selectedProducts.length} produtos)
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormConsultant;
