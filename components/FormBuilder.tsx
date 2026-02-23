import React, { useState, useMemo, useEffect } from 'react';
import { Plus, GripVertical, Trash2, ArrowLeft, Eye, CheckSquare, Edit3, DollarSign, Package, MessageSquare, Share2, Check, Sparkles, Loader2, Wand2, BarChart3, MoreVertical, Pause, Play, Edit, TrendingUp, Users, QrCode, X, Download, ArrowUp, ArrowDown, Bot, Zap, Gift } from 'lucide-react';
import FormConsultant from '@/components/FormConsultant';
import { supabase } from '@/lib/supabase';
import { Form, FormQuestion, FormOption, Lead, InitialField } from '@/types';
import { getFormLink } from '@/lib/utils/getBaseUrl';
import { GoogleGenerativeAI } from "@google/generative-ai";
import InitialFieldsConfig from '@/components/InitialFieldsConfig';

interface FormBuilderProps {
  forms: Form[];
  leads?: Lead[];
  onSaveForm: (form: Form) => void;
  onDeleteForm: (id: string) => void;
  onPreview?: (id: string) => void;
  onViewReport?: (id: string) => void;
  setForms?: any;
  userId?: string;
  activeCompany?: { id: string; name: string };
  isAnalyzingAll?: boolean;
  analysisProgress?: { current: number; total: number };
  pendingAnalysisCount?: number;
  onAnalyzeAllLeads?: () => void;
}


// Helper function to convert question types from FormConsultant format to FormBuilder/PublicForm format
const normalizeQuestionType = (type: string): 'text' | 'single' | 'multiple' => {
  const typeMap: Record<string, 'text' | 'single' | 'multiple'> = {
    'single_choice': 'single',
    'multiple_choice': 'multiple',
    'text': 'text',
    'scale': 'single',
    'single': 'single',
    'multiple': 'multiple'
  };
  return typeMap[type] || 'text';
};

const FormBuilder: React.FC<FormBuilderProps> = ({ forms, leads = [], onSaveForm, onDeleteForm, onPreview, onViewReport, userId, activeCompany, isAnalyzingAll = false, analysisProgress = { current: 0, total: 0 }, pendingAnalysisCount = 0, onAnalyzeAllLeads }) => {
  const [view, setView] = useState<'list' | 'editor' | 'consultant'>('list');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [showConsultant, setShowConsultant] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // QR Code State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [currentQrUrl, setCurrentQrUrl] = useState('');
  const [currentQrName, setCurrentQrName] = useState('');
  
  // AI Analysis: uses global state from MainApp via props
  
  // Editor State
  const [currentQuestions, setCurrentQuestions] = useState<FormQuestion[]>([]);
  const [currentFormName, setCurrentFormName] = useState('');
  const [currentFormDescription, setCurrentFormDescription] = useState('');
  const [currentInitialFields, setCurrentInitialFields] = useState<InitialField[]>([]);
  const [currentGameEnabled, setCurrentGameEnabled] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingScriptId, setGeneratingScriptId] = useState<string | null>(null); 

  // Stats for Mini Dashboard
  const activeFormsCount = forms.filter(f => f.active).length;


  
  const totalResponses = useMemo(() => {
    if (leads && leads.length > 0) {
       // Filter leads that are NOT manual (i.e. likely from a form)
       return leads.filter(l => {
         const source = (l as any).form_source || l.formSource;
         return source !== 'Manual';
       }).length;
    }
    // Fallback to sum of form.responses if leads not provided or empty
    return forms.reduce((acc, curr) => acc + (curr.responses || 0), 0);
  }, [leads, forms]);

  // Helper for per-form count
  const getResponseCount = (form: Form) => {
      if (leads && leads.length > 0) {
          const filtered = leads.filter(l => {
              // Handle both snake_case (form_id) and camelCase (formId)
              const leadFormId = (l as any).form_id || l.formId;
              const leadFormSource = (l as any).form_source || l.formSource;
              return leadFormId === form.id || leadFormSource === form.name;
          });
          return filtered.length;
      }
      return form.responses || 0;
  };

  // Fetch available games when view changes to editor
  useEffect(() => {
    if (view === 'editor' && activeCompany?.id) {
      const fetchGames = async () => {
        const { data, error } = await supabase
          .from('nps_games')
          .select('id, name')
          .eq('tenant_id', activeCompany.id)
          .order('name');
        if (data && !error) {
          setAvailableGames(data);
        }
      };
      fetchGames();
    }
  }, [view, activeCompany]);

  // Handlers
  const handleCreateNew = () => {
    setEditingFormId(null);
    setCurrentFormName('Novo Formulário');
    setCurrentFormDescription('');
    setCurrentQuestions([{ id: Date.now().toString(), text: '', type: 'text', options: [] }]);
    setCurrentInitialFields([]);
    setCurrentGameEnabled(false);
    setCurrentGameId(null);
    setView('editor');
  };

  const handleEdit = (form: Form) => {
    setEditingFormId(form.id);
    setCurrentFormName(form.name);
    setCurrentFormDescription(form.description || '');
    setCurrentQuestions(form.questions.map(q => ({ ...q, type: normalizeQuestionType(q.type), options: q.options?.map(opt => ({ ...opt, label: typeof opt.label === "object" && opt.label?.text ? opt.label.text : (opt.label || opt.text || "") })) || [] })));
    setCurrentInitialFields(form.initialFields || []);
    setCurrentGameEnabled(form.game_enabled || false);
    setCurrentGameId(form.game_id || null);
    setView('editor');
    setMenuOpenId(null);
  };

  const handleToggleStatus = (form: Form) => {
    onSaveForm({ ...form, active: !form.active });
    setMenuOpenId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este formulário? Todos os leads e respostas capturados por ele também serão permanentemente excluídos. Esta ação não pode ser desfeita.')) {
      onDeleteForm(id);
    }
    setMenuOpenId(null);
  };

  const handleCopyLink = (id: string) => {
    const link = getFormLink(id);
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenQr = (id: string, name: string) => {
    const link = getFormLink(id);
    setCurrentQrUrl(link);
    setCurrentQrName(name);
    setQrModalOpen(true);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentQuestions.length - 1) return;

    const newQuestions = [...currentQuestions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap elements
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    
    setCurrentQuestions(newQuestions);
  };

  // Generate a single script for a specific option
  const handleGenerateScript = async (questionId: string, optionId: string, questionText: string, optionLabel: string) => {
    if (!questionText || !optionLabel) return;
    
    setGeneratingScriptId(optionId);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `Crie uma ÚNICA frase curta (máximo 15 palavras) para um vendedor usar com um cliente que respondeu "${optionLabel}" à pergunta "${questionText}". Retorne APENAS a frase, sem aspas, numeração ou qualquer outro texto.`;
        const result = await model.generateContent(prompt);
        const response = result.response;
        
        let script = result.response.text()?.trim() || '';
        // Remove potential markdown, quotes, and numbering
        script = script.replace(/\*|"/g, '').replace(/^\d+\.\s*/, '').trim();

        if (script) updateOption(questionId, optionId, 'script', script);
      } else {
        throw new Error("No API Key");
      }
    } catch (error) {
      setTimeout(() => {
          const fallbackScripts = [
              "Reforce a urgência e ofereça um horário hoje.",
              "Mostre o portfólio de resultados similares.",
              "Foque no custo-benefício a longo prazo.",
              "Ofereça uma avaliação gratuita inicial."
          ];
          updateOption(questionId, optionId, 'script', fallbackScripts[Math.floor(Math.random() * fallbackScripts.length)]);
      }, 1000);
    } finally {
      setGeneratingScriptId(null);
    }
  };

  const handleAiSuggest = async () => {
    if (!currentFormName) return;
    
    setIsGenerating(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `
          Atue como um especialista em Vendas. Gere 4 perguntas estratégicas para qualificação de leads.
          CONTEXTO: "${currentFormName}". DESCRIÇÃO: "${currentFormDescription}".
          
          REGRAS CRÍTICAS:
          1. TODAS as perguntas devem ser do tipo "single" (Única Escolha) ou "multiple" (Múltipla Escolha).
          2. JAMAIS gere perguntas de texto livre ("text").
          3. Para cada pergunta, gere opções de resposta relevantes que ajudem a qualificar o lead (ex: orçamento, prazo, interesse).
          
          Retorne APENAS um JSON válido com esta estrutura: 
          [{ "text": "...", "type": "single|multiple", "options": [{"label": "...", "value": 100, "script": "..."}] }]
        `;
        const result = await model.generateContent(prompt);

        if (result.response.text()) {
          const generated = JSON.parse(result.response.text());
          const mapped = generated.map((q: any) => ({
            id: Date.now().toString() + Math.random(),
            text: q.text,
            type: q.type,
            options: q.options?.map((opt: any) => ({
                id: Date.now().toString() + Math.random(),
                label: opt.label,
                value: opt.value || 0,
                linkedProduct: '',
                script: opt.script || ''
            })) || []
          }));
          
          // Remove empty questions (like the default Question 1) before adding AI suggestions
          setCurrentQuestions(prev => {
             const nonEmpty = prev.filter(q => q.text.trim() !== '');
             return [...nonEmpty, ...mapped];
          });
          return;
        }
      }
      throw new Error("AI Failed");

    } catch (error) {
      // ROBUST FALLBACK (Prioritizing Choice Questions)
      const suggestions: FormQuestion[] = [];
      const ctx = (currentFormName + ' ' + currentFormDescription).toLowerCase();
      
      // 1. Urgency (Single Choice)
      suggestions.push({ 
          id: Date.now() + '1', 
          text: 'Qual o seu nível de urgência para iniciar?', 
          type: 'single', 
          options: [
              {id: 'o1', label: 'Imediato (Alta)', value: 100, script: 'Priorizar atendimento agora.'}, 
              {id: 'o2', label: 'Próximos 30 dias', value: 50, script: 'Agendar reunião.'},
              {id: 'o3', label: 'Apenas pesquisando', value: 0, script: 'Nutrir com conteúdo.'}
          ] 
      });

      // 2. Budget (Single Choice)
      suggestions.push({ 
          id: Date.now() + '2', 
          text: 'Qual seu orçamento estimado para o projeto?', 
          type: 'single', 
          options: [
              {id: 'o4', label: 'Até R$ 1.000', value: 10, script: 'Oferecer pacote de entrada.'}, 
              {id: 'o5', label: 'R$ 1.000 a R$ 5.000', value: 50, script: 'Oferecer plano padrão.'},
              {id: 'o6', label: 'Acima de R$ 5.000', value: 200, script: 'Oferecer consultoria VIP.'}
          ] 
      });

      // 3. Needs (Multiple Choice) - Context Aware
      if (ctx.includes('site') || ctx.includes('web') || ctx.includes('marketing')) {
          suggestions.push({
              id: Date.now() + '3',
              text: 'Quais serviços você precisa?',
              type: 'multiple',
              options: [
                  {id: 'o7', label: 'Criação de Site', value: 100, script: ''},
                  {id: 'o8', label: 'Gestão de Redes Sociais', value: 50, script: ''},
                  {id: 'o9', label: 'Tráfego Pago', value: 80, script: ''}
              ]
          });
      } else if (ctx.includes('saúde') || ctx.includes('clinica') || ctx.includes('estética')) {
           suggestions.push({
              id: Date.now() + '3',
              text: 'Quais procedimentos você tem interesse?',
              type: 'multiple',
              options: [
                  {id: 'o10', label: 'Avaliação Geral', value: 0, script: ''},
                  {id: 'o11', label: 'Tratamento Específico', value: 100, script: ''},
                  {id: 'o12', label: 'Estética', value: 150, script: ''}
              ]
          });
      } else {
           suggestions.push({
              id: Date.now() + '3',
              text: 'Como conheceu nossa empresa?',
              type: 'single',
              options: [
                  {id: 'o13', label: 'Google', value: 0, script: ''},
                  {id: 'o14', label: 'Indicação', value: 20, script: ''},
                  {id: 'o15', label: 'Instagram', value: 0, script: ''}
              ]
          });
      }

      // Remove empty questions in fallback too
      setCurrentQuestions(prev => {
         const nonEmpty = prev.filter(q => q.text.trim() !== '');
         return [...nonEmpty, ...suggestions];
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const addQuestion = () => {
    setCurrentQuestions([...currentQuestions, { id: Date.now().toString(), text: '', type: 'text', options: [] }]);
  };

  const removeQuestion = (id: string) => {
    setCurrentQuestions(currentQuestions.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof FormQuestion, value: any) => {
    setCurrentQuestions(currentQuestions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const addOption = (questionId: string) => {
    setCurrentQuestions(currentQuestions.map(q => {
        if (q.id === questionId) {
            const newOption: FormOption = { 
                id: Date.now().toString() + Math.random().toString().slice(2,5), 
                label: '', 
                value: 0, 
                script: undefined, // Default to undefined
                linkedProduct: ''
            };
            return { 
                ...q, 
                options: [...(q.options || []), newOption] 
            };
        }
        return q;
    }));
  };

  const updateOption = (qId: string, oId: string, field: keyof FormOption, value: any) => {
    setCurrentQuestions(currentQuestions.map(q => q.id === qId ? { ...q, options: q.options?.map(o => o.id === oId ? { ...o, [field]: value } : o) } : q));
  };

  const removeOption = (qId: string, oId: string) => {
     setCurrentQuestions(currentQuestions.map(q => q.id === qId ? { ...q, options: q.options?.filter(o => o.id !== oId) } : q));
  };

  const handleSave = () => {
    // Find existing form to preserve its data
    const existingForm = editingFormId ? forms.find(f => f.id === editingFormId) : null;
    
    // Prepare the form object
    const formToSave: Form = {
        id: editingFormId || Date.now().toString(),
        name: currentFormName,
        description: currentFormDescription,
        questions: currentQuestions,
        // Preserve existing responses count and createdAt when editing
        responses: existingForm?.responses || 0,
        active: existingForm?.active ?? true,
        createdAt: existingForm?.createdAt || new Date().toISOString(),
        initialFields: currentInitialFields.length > 0 ? currentInitialFields : undefined,
        game_enabled: currentGameEnabled,
        game_id: currentGameId
    };

    // Trigger Parent Handler for DB Save
    onSaveForm(formToSave);
    setView('list');
  };

  const handleHeaderPreview = () => {
      if (editingFormId && onPreview) {
          onPreview(editingFormId);
      } else {
          alert("Salve o formulário antes de visualizar.");
      }
  };

  const renderList = () => (
      <div className="p-8 min-h-screen bg-gray-50" onClick={() => setMenuOpenId(null)} style={{ colorScheme: 'light' }}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Formulários de Anamnese</h1>
            <p className="text-gray-500">Gerencie seus questionários de pré-venda</p>
          </div>
          <div className="flex gap-3">
            {/* Botão Analisar com IA */}
            <button 
              onClick={onAnalyzeAllLeads}
              disabled={isAnalyzingAll || pendingAnalysisCount === 0}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all ${
                isAnalyzingAll 
                  ? 'bg-amber-50 border-amber-300 text-amber-700 cursor-wait'
                  : pendingAnalysisCount > 0 
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 hover:shadow-lg hover:shadow-amber-500/30 shadow-sm'
                    : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isAnalyzingAll ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analisando {analysisProgress.current}/{analysisProgress.total}...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Analisar com IA {pendingAnalysisCount > 0 && <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{pendingAnalysisCount}</span>}
                </>
              )}
            </button>
            <button 
              onClick={() => setShowConsultant(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 shadow-sm flex items-center gap-2 transition-all"
            >
              <Plus size={18} /> Novo Formulário
            </button>
          </div>
        </div>

        {/* Mini Dashboard */}
        <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><CheckSquare size={24}/></div>
                 <div>
                     <p className="text-sm text-gray-500 font-medium">Formulários Ativos</p>
                     <h3 className="text-2xl font-bold text-gray-800">{activeFormsCount}</h3>
                 </div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                 <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Users size={24}/></div>
                 <div>
                     <p className="text-sm text-gray-500 font-medium">Total de Respostas (Leads)</p>
                     <h3 className="text-2xl font-bold text-gray-800">{totalResponses}</h3>
                 </div>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map(form => (
            <div key={form.id} className={`bg-white p-6 rounded-xl border shadow-sm transition-all relative ${form.active ? 'border-gray-200' : 'border-gray-200 opacity-75 bg-gray-50'}`}>
               <div className="flex justify-between items-start mb-4">
                 <div className={`p-3 rounded-lg ${form.active ? 'bg-primary-50 text-primary-600' : 'bg-gray-200 text-gray-500'}`}>
                   <CheckSquare size={24} />
                 </div>
                 <div className="relative">
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       setMenuOpenId(menuOpenId === form.id ? null : form.id);
                     }} 
                     className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                   >
                     <MoreVertical size={18} />
                   </button>
                   
                   {menuOpenId === form.id && (
                      <div className="absolute right-0 top-10 bg-white rounded-lg shadow-xl border border-gray-100 w-48 z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                        <button onClick={() => {
                          setEditingFormId(form.id);
                          setShowConsultant(true);
                          setMenuOpenId(null);
                        }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Edit3 size={14} /> Editar
                        </button>
                        <button onClick={() => handleToggleStatus(form)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          {form.active ? <Pause size={14} /> : <Play size={14} />} 
                          {form.active ? 'Pausar' : 'Ativar'}
                        </button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button onClick={() => handleDelete(form.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                   )}
                 </div>
               </div>
               <h3 className="text-lg font-bold text-gray-900 mb-1">{form.name}</h3>
               <p className="text-sm text-gray-500 mb-4 line-clamp-2">{form.description || 'Sem descrição definida.'}</p>
               
               <div className="flex items-center gap-2 mb-4">
                 <span className={`text-xs px-2 py-0.5 rounded-full border ${form.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {form.active ? 'Ativo' : 'Pausado'}
                 </span>
                 {form.game_enabled && (
                   <span className="text-xs px-2 py-0.5 rounded-full border border-purple-100 text-purple-600 bg-purple-50 flex items-center gap-1">
                     <Gift size={10} /> Game Ativo
                   </span>
                 )}
                 <span className="text-xs text-gray-400">{form.questions.length} perguntas • {getResponseCount(form)} respostas</span>
               </div>
               
               <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                 <button 
                    onClick={() => handleCopyLink(form.id)}
                    className={`text-sm font-medium flex items-center gap-1 transition-colors ${copiedId === form.id ? 'text-green-600' : 'text-gray-500 hover:text-primary-600'}`}
                 >
                   {copiedId === form.id ? <Check size={16} /> : <Share2 size={16} />}
                   {copiedId === form.id ? 'Copiado' : 'Link'}
                 </button>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => handleOpenQr(form.id, form.name)} 
                     className="text-sm text-gray-500 hover:text-primary-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50"
                     title="QR Code"
                   >
                     <QrCode size={16} />
                   </button>
                   {onPreview && (
                     <button 
                       onClick={() => onPreview(form.id)} 
                       className="text-sm text-gray-500 hover:text-primary-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50"
                       title="Visualizar"
                     >
                       <Eye size={16} />
                     </button>
                   )}
                   {onViewReport && (
                     <button 
                       onClick={() => onViewReport(form.id)} 
                       className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-primary-50"
                       title="Relatório"
                     >
                       <BarChart3 size={16} />
                     </button>
                   )}
                 </div>
               </div>
            </div>
          ))}
          <button onClick={() => setShowConsultant(true)} className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 hover:bg-primary-50 transition-all min-h-[200px]">
             <Plus size={32} className="mb-2" />
             <span className="font-medium">Criar novo formulário</span>
          </button>
        </div>

        {/* QR Code Modal */}
        {qrModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center relative animate-in zoom-in-95">
                    <button 
                        onClick={() => setQrModalOpen(false)} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
                    >
                        <X size={20}/>
                    </button>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">QR Code do Formulário</h3>
                    <p className="text-sm text-gray-500 mb-6 truncate px-4">{currentQrName}</p>
                    
                    <div className="bg-white p-2 border border-gray-200 rounded-xl inline-block mb-6 shadow-sm">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentQrUrl)}`} 
                            alt="QR Code" 
                            className="w-48 h-48"
                        />
                    </div>
                    
                    <div className="flex justify-center">
                        <a 
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentQrUrl)}`} 
                            download="qrcode.png" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-colors"
                        >
                            <Download size={18}/> Baixar Imagem
                        </a>
                    </div>
                </div>
            </div>
        )}
      </div>
    );

  const renderEditor = () => (
    <div className="p-8 min-h-screen bg-gray-50" style={{ colorScheme: 'light' }}>
       <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
               <h1 className="text-2xl font-bold text-gray-900">
                 {editingFormId ? 'Editar Formulário' : 'Novo Formulário'}
               </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleHeaderPreview}
              className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye size={18} /> Visualizar
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 shadow-sm font-medium"
            >
              Salvar Formulário
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <InitialFieldsConfig 
              initialFields={currentInitialFields}
              onChange={setCurrentInitialFields}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Formulário</label>
                <input 
                  type="text" 
                  value={currentFormName}
                  onChange={(e) => setCurrentFormName(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900" 
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                  placeholder="Ex: Anamnese Inicial"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Contexto para IA)</label>
                <textarea 
                  value={currentFormDescription}
                  onChange={(e) => setCurrentFormDescription(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900" 
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                  placeholder="Ex: Formulário para qualificar clientes de alto padrão interessados em implantes..."
                  rows={3}
                />
             </div>
          </div>
          
          {/* Game Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Ativar Game (Roleta da Sorte)</h3>
                <p className="text-xs text-gray-500 mt-1">Após o envio do formulário, o cliente poderá girar a roleta e ganhar prêmios</p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentGameEnabled(!currentGameEnabled)}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                  currentGameEnabled ? 'bg-pink-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    currentGameEnabled ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {currentGameEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Roleta</label>
                <select
                  value={currentGameId || ''}
                  onChange={(e) => setCurrentGameId(e.target.value || null)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900"
                >
                  <option value="">Selecione uma roleta...</option>
                  {availableGames.map(game => (
                    <option key={game.id} value={game.id}>{game.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Initial Fields Configuration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Campos de Identificação</h3>
            <p className="text-xs text-gray-500 mb-4">Configure quais dados serão solicitados ao cliente antes das perguntas</p>
            <InitialFieldsConfig
              initialFields={currentInitialFields}
              onChange={setCurrentInitialFields}
            />
          </div>

          <div className="flex justify-between items-center">
             <h2 className="text-lg font-bold text-gray-800">Perguntas</h2>>
             <button 
                onClick={handleAiSuggest}
                disabled={!currentFormName || isGenerating}
                className="text-xs bg-purple-100 text-purple-700 px-3 py-2 rounded-full flex items-center gap-2 font-bold hover:bg-purple-200 transition-colors disabled:opacity-50"
            >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isGenerating ? 'Gerando Perguntas...' : 'Sugerir Perguntas com IA'}
            </button>
          </div>

          {currentQuestions.map((q, index) => (
             <div 
               key={q.id} 
               className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all"
             >
                <div className="p-6">
                   <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-primary-600 uppercase bg-primary-50 px-2 py-1 rounded">
                           PERGUNTA {index + 1} {q.text && `- ${q.text}`}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleMoveQuestion(index, 'up')}
                                disabled={index === 0}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Mover para cima"
                            >
                                <ArrowUp size={18} />
                            </button>
                            <button
                                onClick={() => handleMoveQuestion(index, 'down')}
                                disabled={index === currentQuestions.length - 1}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Mover para baixo"
                            >
                                <ArrowDown size={18} />
                            </button>
                            <div className="h-5 w-px bg-gray-200 mx-1"></div>
                            <button 
                                onClick={() => removeQuestion(q.id)} 
                                className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 rounded-full transition-colors"
                                title="Excluir pergunta"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                   </div>
                   
                   <div className="space-y-4 mb-4">
                      <div>
                        <input 
                          type="text" 
                          value={q.text} 
                          onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                          placeholder="Digite a pergunta aqui..."
                          className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all" 
                          style={{ backgroundColor: '#ffffff', color: '#111827' }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Resposta</label>
                        <select 
                          value={q.type}
                          onChange={(e) => updateQuestion(q.id, 'type', e.target.value as FormQuestion['type'])}
                          className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 focus:ring-2 focus:ring-primary-500"
                          style={{ backgroundColor: '#ffffff', color: '#111827' }}
                        >
                          <option value="text">Texto Livre</option>
                          <option value="single">Única Escolha</option>
                          <option value="multiple">Múltipla Escolha</option>
                        </select>
                      </div>
                   </div>

                   {(q.type === 'single' || q.type === 'multiple') && (
                     <div className="pl-4 border-l-2 border-gray-100 mt-4 space-y-4">
                       <p className="text-sm font-semibold text-gray-700">Alternativas e Automações</p>
                       
                       {q.options?.map((opt) => (
                         <div key={opt.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative group">
                           <button 
                             onClick={() => removeOption(q.id, opt.id)}
                             className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <Trash2 size={14} />
                           </button>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                             <div>
                               <label className="block text-xs font-medium text-gray-500 mb-1">Rótulo da Opção</label>
                               <input 
                                  type="text" 
                                  value={opt.label}
                                  onChange={(e) => updateOption(q.id, opt.id, 'label', e.target.value)}
                                  placeholder="Ex: Sim, tenho dor"
                                  className="w-full rounded border-gray-300 p-2 text-sm bg-white text-gray-900"
                                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                               />
                             </div>
                             <div>
                               <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                 <DollarSign size={12} /> Valor de Oportunidade (R$)
                               </label>
                               <input 
                                  type="number" 
                                  value={opt.value}
                                  onChange={(e) => updateOption(q.id, opt.id, 'value', parseFloat(e.target.value))}
                                  placeholder="0.00"
                                  className="w-full rounded border-gray-300 p-2 text-sm text-green-700 font-medium bg-white"
                                  style={{ backgroundColor: '#ffffff' }}
                               />
                             </div>
                           </div>
                           
                           <div className="space-y-4">
                             <div>
                               <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                 <Package size={12} /> Produto/Serviço Sugerido
                               </label>
                               <input 
                                  type="text" 
                                  value={opt.linkedProduct || ''}
                                  onChange={(e) => updateOption(q.id, opt.id, 'linkedProduct', e.target.value)}
                                  placeholder="Ex: Limpeza Dental"
                                  className="w-full rounded border-gray-300 p-2 text-sm bg-white text-gray-900"
                                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                               />
                             </div>
                             <div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`script-check-${opt.id}`}
                                    checked={opt.script !== undefined}
                                    onChange={(e) => {
                                      const newValue = e.target.checked ? '' : undefined;
                                      updateOption(q.id, opt.id, 'script', newValue);
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <label htmlFor={`script-check-${opt.id}`} className="flex items-center gap-1 text-xs font-medium text-gray-500 cursor-pointer">
                                    <MessageSquare size={12} /> Script de Vendas (IA)
                                  </label>
                                </div>
                                
                                {opt.script !== undefined && (
                                  <div className="mt-2">
                                    <div className="relative">
                                      <input 
                                         type="text" 
                                         value={opt.script || ''}
                                         onChange={(e) => updateOption(q.id, opt.id, 'script', e.target.value)}
                                         placeholder="O que o vendedor deve falar..."
                                         className="w-full rounded border-gray-300 p-2 text-sm italic text-gray-600 pr-8 bg-white"
                                         style={{ backgroundColor: '#ffffff' }}
                                         autoFocus
                                      />
                                      <button 
                                         onClick={() => handleGenerateScript(q.id, opt.id, q.text, opt.label)}
                                         disabled={generatingScriptId === opt.id || !q.text || !opt.label}
                                         className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-700 disabled:opacity-50"
                                         title="Gerar script com IA"
                                      >
                                         {generatingScriptId === opt.id ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                      </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 pl-1">Dica curta para o vendedor. Aparecerá no Kanban.</p>
                                  </div>
                                )}
                             </div>
                           </div>

                           <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`followup-check-${opt.id}`}
                                    checked={opt.followUpLabel !== undefined}
                                    onChange={(e) => {
                                      const newValue = e.target.checked ? '' : undefined;
                                      updateOption(q.id, opt.id, 'followUpLabel', newValue);
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  <label htmlFor={`followup-check-${opt.id}`} className="flex items-center gap-1 text-xs font-medium text-gray-500 cursor-pointer">
                                    <MessageSquare size={12} /> Campo de texto de seguimento (Opcional)
                                  </label>
                                </div>
                                {opt.followUpLabel !== undefined && (
                                  <div className="pl-6">
                                    <input
                                      type="text"
                                      value={opt.followUpLabel || ''}
                                      onChange={(e) => updateOption(q.id, opt.id, 'followUpLabel', e.target.value)}
                                      placeholder="Ex: Se sim, qual?"
                                      className="w-full rounded border-gray-300 p-2 text-sm bg-white text-gray-900 placeholder-gray-400"
                                      style={{ backgroundColor: '#ffffff', color: '#111827' }}
                                      autoFocus
                                    />
                                  </div>
                                )}
                           </div>
                         </div>
                       ))}
                       
                       <button 
                         onClick={() => addOption(q.id)}
                         className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-primary-50 w-fit"
                       >
                         <Plus size={14} /> Adicionar Alternativa
                       </button>
                     </div>
                   )}
                </div>
             </div>
          ))}

          <button 
            onClick={addQuestion}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Adicionar Nova Pergunta
          </button>
        </div>
       </div>
    </div>
  );

  // Handler para salvar formulário da consultoria
  // CORREÇÃO: Processa corretamente os campos iniciais e opções
  const handleConsultantSave = (formData: any) => {
    // Converter identification_fields para o formato correto de initialFields
    let initialFieldsFormatted: any[] = [];
    
    if (formData.identification_fields && Array.isArray(formData.identification_fields)) {
      initialFieldsFormatted = formData.identification_fields.map((f: any) => {
        // Se já é um objeto com a estrutura correta
        if (typeof f === 'object' && f.id) {
          return {
            field: f.id,
            label: f.label || f.id,
            placeholder: f.placeholder || '',
            required: f.required !== false,
            enabled: f.enabled !== false
          };
        }
        // Se é uma string simples
        if (typeof f === 'string') {
          const fieldMap: Record<string, any> = {
            'name': { field: 'name', label: 'Nome Completo', placeholder: 'Seu nome', required: true, enabled: true },
            'email': { field: 'email', label: 'Email', placeholder: 'seu@email.com', required: true, enabled: true },
            'phone': { field: 'phone', label: 'Telefone / WhatsApp', placeholder: '(00) 00000-0000', required: false, enabled: true }
          };
          return fieldMap[f] || { field: f, label: f, placeholder: '', required: false, enabled: true };
        }
        return f;
      });
    } else {
      // Padrão se não houver campos
      initialFieldsFormatted = [
        { field: 'name', label: 'Nome Completo', placeholder: 'Seu nome', required: true, enabled: true },
        { field: 'email', label: 'Email', placeholder: 'seu@email.com', required: true, enabled: true },
        { field: 'phone', label: 'Telefone / WhatsApp', placeholder: '(00) 00000-0000', required: false, enabled: true }
      ];
    }

    // Find existing form to preserve its data when editing
    const existingForm = editingFormId ? forms.find(f => f.id === editingFormId) : null;
    
    const newForm: Form = {
      id: existingForm?.id || Date.now().toString(),
      name: formData.name,
      description: formData.description || (formData.objective === 'qualify' ? 'Formulário de qualificação de leads' : formData.objective === 'feedback' ? 'Formulário de feedback' : 'Formulário personalizado'),
      questions: formData.questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: normalizeQuestionType(q.type || 'single'),
        options: q.options?.map((opt: any, i: number) => ({
          id: opt.id || `opt_${Date.now()}_${i}`,
          // CORREÇÃO: Extrai o texto corretamente de qualquer formato
          label: typeof opt === 'string' 
            ? opt 
            : (typeof opt.text === 'string' 
              ? opt.text 
              : (typeof opt.label === 'string' 
                ? opt.label 
                : (opt.label?.text || opt.text?.text || 'Opção'))),
          value: opt.value || 0,
          linkedProduct: opt.linkedProduct || '',
          script: opt.script || ''
        })) || []
      })),
      active: existingForm?.active ?? true,
      responses: existingForm?.responses || 0,
      createdAt: existingForm?.createdAt || new Date().toISOString(),
      // CORREÇÃO: Usa o formato correto de initialFields
      initialFields: initialFieldsFormatted,
      game_enabled: formData.game_enabled || false
    };
    onSaveForm(newForm);
  };

  return (
    <>
      {view === 'list' && renderList()}
      {view === 'editor' && renderEditor()}
      {showConsultant && (
        <FormConsultant
          supabase={supabase}
          userId={userId || ''}
          onClose={() => {
            setShowConsultant(false);
            setEditingFormId(null);
          }}
          onSaveForm={handleConsultantSave}
          existingForm={editingFormId ? forms.find(f => f.id === editingFormId) : undefined}
        />
      )}
    </>
  );
};

export default FormBuilder;