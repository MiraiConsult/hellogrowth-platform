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
  RefreshCw
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

type ConsultantStep = 'welcome' | 'objective' | 'products' | 'generation' | 'review' | 'customize' | 'complete';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
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
  
  // Form Configuration
  const [formObjective, setFormObjective] = useState<'qualify' | 'feedback' | 'custom'>('qualify');
  const [customObjective, setCustomObjective] = useState('');
  const [productSelection, setProductSelection] = useState<'manual' | 'auto'>('auto');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [formName, setFormName] = useState('');
  const [formTone, setFormTone] = useState<'formal' | 'friendly' | 'professional'>('professional');
  
  // Generated Content
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Chat Interface
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedQuestions, setImportedQuestions] = useState<any[]>([]);
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
    if (currentStep === 'welcome') {
      addAssistantMessage(
        "Olá! 👋 Sou seu consultor de crescimento. Vou te ajudar a criar um formulário inteligente que vai transformar visitantes em oportunidades de venda.\n\nVamos começar?"
      );
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

  const addAssistantMessage = (content: string) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date()
    }]);
  };

  const addUserMessage = (content: string) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }]);
  };

  const handleStepTransition = (nextStep: ConsultantStep) => {
    setCurrentStep(nextStep);
    
    // Add contextual messages based on step
    switch (nextStep) {
      case 'objective':
        addAssistantMessage(
          "Perfeito! Primeiro, me conta: qual é o objetivo principal deste formulário?\n\n" +
          "🎯 **Qualificar Leads** - Identificar quem está pronto para comprar\n" +
          "💬 **Coletar Feedback** - Entender a satisfação dos clientes\n" +
          "✨ **Outro Objetivo** - Me conte o que você precisa"
        );
        break;
      case 'products':
        addAssistantMessage(
          "Ótima escolha! Agora vamos definir como vincular seus produtos às perguntas.\n\n" +
          "Você prefere:\n" +
          "🤖 **Deixar a IA decidir** - Eu analiso as respostas e sugiro o melhor produto\n" +
          "📦 **Escolher manualmente** - Você seleciona quais produtos quer destacar"
        );
        break;
      case 'generation':
        addAssistantMessage(
          "Excelente! Agora vou criar perguntas estratégicas baseadas no seu objetivo e produtos.\n\n" +
          "⏳ Isso pode levar alguns segundos enquanto analiso a melhor abordagem..."
        );
        generateQuestions();
        break;
      case 'review':
        addAssistantMessage(
          "Pronto! 🎉 Criei as perguntas do seu formulário.\n\n" +
          "Cada pergunta foi pensada para extrair informações valiosas sem parecer um interrogatório. " +
          "Você pode editar, reordenar ou remover qualquer uma delas."
        );
        break;
      case 'customize':
        addAssistantMessage(
          "Agora vamos dar os toques finais! Defina o nome do formulário e o tom de voz que combina com sua marca."
        );
        break;
      case 'complete':
        addAssistantMessage(
          "🚀 Seu formulário está pronto!\n\n" +
          "Ele já está configurado para capturar leads qualificados e alimentar seu Centro de Inteligência Estratégica automaticamente."
        );
        break;
    }
  };

  const generateQuestions = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const selectedProductsData = productSelection === 'manual' 
        ? products.filter(p => selectedProducts.includes(p.id))
        : products;

      const productContext = selectedProductsData.map(p => 
        `- ${p.name} (R$ ${p.value}): ${p.ai_description || 'Sem descrição'}`
      ).join('\n');

      const objectiveText = formObjective === 'qualify' 
        ? 'qualificar leads e identificar quem está pronto para comprar'
        : formObjective === 'feedback'
        ? 'coletar feedback e entender a satisfação dos clientes'
        : customObjective;

      const prompt = `Você é um especialista em vendas consultivas e formulários de conversão. 
Crie um formulário inteligente com perguntas INDIRETAS para ${objectiveText}.

PRODUTOS/SERVIÇOS DISPONÍVEIS:
${productContext || 'Nenhum produto cadastrado - crie perguntas genéricas de qualificação'}

REGRAS IMPORTANTES:
1. Crie entre 5 e 7 perguntas
2. As perguntas devem ser INDIRETAS - não pergunte diretamente sobre compra
3. Cada pergunta deve ter um INSIGHT estratégico que explica o que a resposta revela
4. Use linguagem ${formTone === 'formal' ? 'formal e profissional' : formTone === 'friendly' ? 'amigável e descontraída' : 'profissional mas acessível'}
5. Misture tipos: múltipla escolha, escala e texto livre

Responda APENAS com um JSON válido neste formato (sem markdown):
{
  "questions": [
    {
      "text": "Texto da pergunta",
      "type": "multiple_choice",
      "options": ["Opção 1", "Opção 2", "Opção 3"],
      "insight": "O que esta resposta revela sobre o cliente"
    }
  ]
}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      clearInterval(progressInterval);

      if (!response.ok) throw new Error('Erro na API');

      const data = await response.json();
      let parsed;
      
      try {
        const cleanResponse = data.response.replace(/```json\n?|\n?```/g, '').trim();
        parsed = JSON.parse(cleanResponse);
      } catch {
        throw new Error('Resposta da IA inválida');
      }

      const questions: GeneratedQuestion[] = parsed.questions.map((q: any, index: number) => ({
        id: `q_${Date.now()}_${index}`,
        text: q.text,
        type: q.type || 'multiple_choice',
        options: q.options,
        insight: q.insight,
        linkedProducts: selectedProducts
      }));

      setGeneratedQuestions(questions);
      setGenerationProgress(100);
      
      setTimeout(() => {
        handleStepTransition('review');
      }, 500);

    } catch (error) {
      console.error('Erro ao gerar perguntas:', error);
      addAssistantMessage(
        "😅 Ops! Tive um problema ao gerar as perguntas. Vamos tentar novamente?"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const questions = jsonData.map((row: any, index: number) => ({
          id: `imported_${Date.now()}_${index}`,
          text: row.pergunta || row.Pergunta || row.question || row.Question || '',
          type: 'multiple_choice' as const,
          options: (row.opcoes || row.Opcoes || row.options || row.Options || '')
            .split(';')
            .map((o: string) => o.trim())
            .filter((o: string) => o),
          insight: row.insight || row.Insight || 'Insight a ser definido'
        })).filter((q: any) => q.text);

        setImportedQuestions(questions);
        setShowImportModal(true);
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        addAssistantMessage("Não consegui ler o arquivo. Verifique se é um Excel válido com as colunas corretas.");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    setGeneratedQuestions(prev => [...prev, ...importedQuestions]);
    setShowImportModal(false);
    setImportedQuestions([]);
    addAssistantMessage(`Adicionei ${importedQuestions.length} perguntas do seu arquivo! 📄`);
  };

  const handleRemoveQuestion = (questionId: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleEditQuestion = (questionId: string, newText: string) => {
    setGeneratedQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, text: newText } : q
    ));
  };

  const handleSaveForm = () => {
    const formData = {
      name: formName || 'Novo Formulário',
      questions: generatedQuestions.map(q => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        required: true
      })),
      objective: formObjective,
      linkedProducts: selectedProducts,
      tone: formTone,
      active: true,
      initial_fields: ['name', 'email', 'phone']
    };

    onSaveForm(formData);
    handleStepTransition('complete');
  };

  // Progress Bar Component
  const ProgressBar = () => {
    const steps: ConsultantStep[] = ['welcome', 'objective', 'products', 'generation', 'review', 'customize', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  // Render Step Content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30">
              <Wand2 className="text-white" size={48} />
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              Vamos criar seu formulário inteligente
            </h1>
            <p className="text-xl text-slate-500 mb-12 max-w-2xl">
              Em poucos minutos, você terá um formulário que qualifica leads automaticamente 
              e alimenta seu Centro de Inteligência Estratégica.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleStepTransition('objective')}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-emerald-500/30 transition-all flex items-center gap-3"
              >
                <Sparkles size={24} />
                Começar com IA
              </button>
              <label className="px-8 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-semibold text-lg hover:bg-slate-50 transition-all flex items-center gap-3 cursor-pointer">
                <Upload size={24} />
                Importar Planilha
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        );

      case 'objective':
        return (
          <div className="max-w-2xl mx-auto py-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">
              Qual é o objetivo do formulário?
            </h2>
            <div className="space-y-4">
              {[
                { id: 'qualify', icon: Target, title: 'Qualificar Leads', desc: 'Identificar quem está pronto para comprar' },
                { id: 'feedback', icon: MessageSquare, title: 'Coletar Feedback', desc: 'Entender a satisfação dos clientes' },
                { id: 'custom', icon: Lightbulb, title: 'Outro Objetivo', desc: 'Defina um objetivo personalizado' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setFormObjective(option.id as any);
                    if (option.id !== 'custom') {
                      addUserMessage(option.title);
                      handleStepTransition('products');
                    }
                  }}
                  className={`w-full p-6 rounded-2xl border-2 transition-all flex items-center gap-4 text-left ${
                    formObjective === option.id 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    formObjective === option.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <option.icon size={28} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">{option.title}</h3>
                    <p className="text-slate-500">{option.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            
            {formObjective === 'custom' && (
              <div className="mt-6">
                <textarea
                  value={customObjective}
                  onChange={(e) => setCustomObjective(e.target.value)}
                  placeholder="Descreva o objetivo do seu formulário..."
                  className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 resize-none h-32"
                />
                <button
                  onClick={() => {
                    addUserMessage(customObjective);
                    handleStepTransition('products');
                  }}
                  disabled={!customObjective.trim()}
                  className="mt-4 w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold disabled:opacity-50 transition-all"
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        );

      case 'products':
        return (
          <div className="max-w-3xl mx-auto py-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">
              Como vincular produtos às perguntas?
            </h2>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => {
                  setProductSelection('auto');
                  addUserMessage('Deixar a IA decidir');
                  handleStepTransition('generation');
                }}
                className={`p-6 rounded-2xl border-2 transition-all text-center ${
                  productSelection === 'auto' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <Bot className="mx-auto mb-4 text-emerald-500" size={40} />
                <h3 className="font-semibold text-lg text-slate-800 mb-2">IA Decide</h3>
                <p className="text-sm text-slate-500">A IA analisa as respostas e sugere o melhor produto</p>
              </button>
              
              <button
                onClick={() => setProductSelection('manual')}
                className={`p-6 rounded-2xl border-2 transition-all text-center ${
                  productSelection === 'manual' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <Package className="mx-auto mb-4 text-blue-500" size={40} />
                <h3 className="font-semibold text-lg text-slate-800 mb-2">Escolher Produtos</h3>
                <p className="text-sm text-slate-500">Selecione quais produtos quer destacar</p>
              </button>
            </div>

            {productSelection === 'manual' && (
              <div className="bg-slate-50 rounded-2xl p-6">
                <h3 className="font-semibold text-slate-800 mb-4">Selecione os produtos:</h3>
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-emerald-500" size={32} />
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    Nenhum produto cadastrado. Cadastre seus produtos primeiro na aba "Produtos/Serviços".
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {products.map((product) => (
                      <label
                        key={product.id}
                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                          selectedProducts.includes(product.id) 
                            ? 'bg-emerald-100 border-2 border-emerald-500' 
                            : 'bg-white border-2 border-transparent hover:bg-emerald-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts(prev => [...prev, product.id]);
                            } else {
                              setSelectedProducts(prev => prev.filter(id => id !== product.id));
                            }
                          }}
                          className="w-5 h-5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{product.name}</p>
                          <p className="text-sm text-emerald-600">R$ {product.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                
                <button
                  onClick={() => {
                    addUserMessage(`Selecionei ${selectedProducts.length} produtos`);
                    handleStepTransition('generation');
                  }}
                  disabled={selectedProducts.length === 0}
                  className="mt-6 w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold disabled:opacity-50 transition-all"
                >
                  Gerar Perguntas
                </button>
              </div>
            )}
          </div>
        );

      case 'generation':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-32 h-32 relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full animate-pulse opacity-30"></div>
              <div className="absolute inset-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <Sparkles className="text-white animate-bounce" size={40} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Criando suas perguntas estratégicas...
            </h2>
            <p className="text-slate-500 mb-8">
              Estou analisando seus produtos e criando perguntas que convertem
            </p>
            <div className="w-full max-w-md">
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
              <p className="text-sm text-slate-400 mt-2">{generationProgress}% concluído</p>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="max-w-4xl mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-800">
                Revise suas perguntas
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => generateQuestions()}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-all"
                >
                  <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
                  Regenerar
                </button>
                <label className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all cursor-pointer">
                  <Upload size={18} />
                  Importar
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {generatedQuestions.map((question, index) => (
                <div 
                  key={question.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={question.text}
                        onChange={(e) => handleEditQuestion(question.id, e.target.value)}
                        className="w-full text-lg font-medium text-slate-800 bg-transparent border-0 focus:ring-0 p-0"
                      />
                      
                      {question.options && question.options.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {question.options.map((option, optIndex) => (
                            <span 
                              key={optIndex}
                              className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm"
                            >
                              {option}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="mt-4 p-3 bg-purple-50 rounded-xl">
                        <div className="flex items-center gap-2 text-purple-600 text-xs font-medium mb-1">
                          <Lightbulb size={14} />
                          Insight Estratégico
                        </div>
                        <p className="text-sm text-slate-600">{question.insight}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveQuestion(question.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleStepTransition('customize')}
              disabled={generatedQuestions.length === 0}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
            >
              Continuar
              <ArrowRight size={20} />
            </button>
          </div>
        );

      case 'customize':
        return (
          <div className="max-w-2xl mx-auto py-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">
              Personalize seu formulário
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome do Formulário
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Diagnóstico de Necessidades"
                  className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Tom de Voz
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'formal', label: 'Formal', desc: 'Profissional e direto' },
                    { id: 'professional', label: 'Profissional', desc: 'Equilibrado' },
                    { id: 'friendly', label: 'Amigável', desc: 'Descontraído' }
                  ].map((tone) => (
                    <button
                      key={tone.id}
                      onClick={() => setFormTone(tone.id as any)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        formTone === tone.id 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <p className="font-semibold text-slate-800">{tone.label}</p>
                      <p className="text-xs text-slate-500">{tone.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveForm}
              className="mt-12 w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-3"
            >
              <CheckCircle size={24} />
              Criar Formulário
            </button>
          </div>
        );

      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30">
              <CheckCircle className="text-white" size={48} />
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              Formulário Criado! 🎉
            </h1>
            <p className="text-xl text-slate-500 mb-12 max-w-2xl">
              Seu formulário "{formName || 'Novo Formulário'}" está pronto para capturar leads qualificados.
            </p>
            <button
              onClick={onClose}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-emerald-500/30 transition-all"
            >
              Voltar para Formulários
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex">
      <ProgressBar />
      
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all z-10"
      >
        <X size={24} />
      </button>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {renderStepContent()}
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-96 bg-slate-50 border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
              <Bot className="text-white" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Consultor HelloGrowth</h3>
              <p className="text-xs text-emerald-500">Online</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-emerald-500 text-white rounded-br-md'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="text-blue-600" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Confirmar Importação</h2>
                  <p className="text-sm text-slate-500">{importedQuestions.length} perguntas encontradas</p>
                </div>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportedQuestions([]); }} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto mb-6 space-y-3">
              {importedQuestions.map((q, index) => (
                <div key={q.id} className="p-4 bg-slate-50 rounded-xl">
                  <p className="font-medium text-slate-800">{index + 1}. {q.text}</p>
                  {q.options && q.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.options.map((opt: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-white text-slate-500 rounded text-xs">{opt}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowImportModal(false); setImportedQuestions([]); }}
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                Confirmar Importação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormConsultant;
