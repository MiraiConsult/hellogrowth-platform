import React, { useState, useMemo } from 'react';
import { Plus, GripVertical, Trash2, ArrowLeft, Eye, CheckSquare, Edit3, DollarSign, Package, MessageSquare, Share2, Check, Sparkles, Loader2, Wand2, BarChart3, MoreVertical, Pause, Play, Edit, TrendingUp, Users, QrCode, X, Download, ArrowUp, ArrowDown, Bot } from 'lucide-react';
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
}

// Helper function to convert question types from FormConsultant format to FormBuilder/PublicForm format
const normalizeQuestionType = (type: string): 'text' | 'single' | 'multiple' => {
  const typeMap: Record<string, 'text' | 'single' | 'multiple'> = {
    'single_choice': 'single',
    'multiple_choice': 'multiple',
    'text': 'text',
    'scale': 'single', // Scale can be treated as single choice
    'single': 'single',
    'multiple': 'multiple'
  };
  return typeMap[type] || 'text';
};

const FormBuilder: React.FC<FormBuilderProps> = ({ forms, leads = [], onSaveForm, onDeleteForm, onPreview, onViewReport, userId }) => {
  const [view, setView] = useState<'list' | 'editor' | 'consultant'>('list');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [showConsultant, setShowConsultant] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // QR Code State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [currentQrUrl, setCurrentQrUrl] = useState('');
  const [currentQrName, setCurrentQrName] = useState('');
  
  // Editor State
  const [currentQuestions, setCurrentQuestions] = useState<FormQuestion[]>([]);
  const [currentFormName, setCurrentFormName] = useState('');
  const [currentFormDescription, setCurrentFormDescription] = useState('');
  const [currentInitialFields, setCurrentInitialFields] = useState<InitialField[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingScriptId, setGeneratingScriptId] = useState<string | null>(null); 

  // Stats for Mini Dashboard
  const activeFormsCount = forms.filter(f => f.active).length;
  
  const totalResponses = useMemo(() => {
    if (leads && leads.length > 0) {
       return leads.filter(l => l.formSource !== 'Manual').length;
    }
    return forms.reduce((acc, curr) => acc + (curr.responses || 0), 0);
  }, [leads, forms]);

  const getResponseCount = (form: Form) => {
      if (leads && leads.length > 0) {
          return leads.filter(l => l.formId === form.id || (l.formSource === form.name)).length;
      }
      return form.responses || 0;
  };

  // Handlers
  const handleCreateNew = () => {
    setEditingFormId(null);
    setCurrentFormName('Novo Formulário');
    setCurrentFormDescription('');
    setCurrentQuestions([{ id: Date.now().toString(), text: '', type: 'text', options: [] }]);
    setCurrentInitialFields([]);
    setView('editor');
  };

  const handleEdit = (form: Form) => {
    setEditingFormId(form.id);
    setCurrentFormName(form.name);
    setCurrentFormDescription(form.description || '');
    // Normalize question types when loading for editing
    setCurrentQuestions(form.questions.map(q => ({
      ...q,
      type: normalizeQuestionType(q.type)
    })));
    setCurrentInitialFields(form.initialFields || []);
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
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    setCurrentQuestions(newQuestions);
  };

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
        let script = result.response.text()?.trim() || '';
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
          
          setCurrentQuestions(prev => {
             const nonEmpty = prev.filter(q => q.text.trim() !== '');
             return [...nonEmpty, ...mapped];
          });
          return;
        }
      }
      throw new Error("AI Failed");

    } catch (error) {
      const suggestions: FormQuestion[] = [];
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
      setCurrentQuestions(prev => [...prev.filter(q => q.text.trim() !== ''), ...suggestions]);
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

  const addOption = (qId: string) => {
    setCurrentQuestions(currentQuestions.map(q => 
      q.id === qId 
        ? { ...q, options: [...(q.options || []), { id: Date.now().toString(), label: '', value: 0, linkedProduct: '', script: '' }] } 
        : q
    ));
  };

  const updateOption = (qId: string, oId: string, field: keyof FormOption, value: any) => {
    setCurrentQuestions(currentQuestions.map(q => 
      q.id === qId 
        ? { ...q, options: q.options?.map(o => o.id === oId ? { ...o, [field]: value } : o) } 
        : q
    ));
  };

  const removeOption = (qId: string, oId: string) => {
     setCurrentQuestions(currentQuestions.map(q => q.id === qId ? { ...q, options: q.options?.filter(o => o.id !== oId) } : q));
  };

  const handleSave = () => {
    const formToSave: Form = {
        id: editingFormId || Date.now().toString(),
        name: currentFormName,
        description: currentFormDescription,
        questions: currentQuestions,
        responses: 0, 
        active: true,
        createdAt: new Date().toISOString(),
        initialFields: currentInitialFields.length > 0 ? currentInitialFields : undefined
    };
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

  // Render List View
  const renderList = () => (
    <div className="p-8 min-h-screen bg-gray-50" style={{ colorScheme: 'light' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Formulários</h1>
            <p className="text-gray-500">Crie e gerencie seus formulários de captação de leads.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreateNew} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium">
              <Plus size={18} /> Criar Manualmente
            </button>
            <button onClick={() => setShowConsultant(true)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 flex items-center gap-2 font-medium shadow-md">
              <Bot size={18} /> Criar com IA
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg"><CheckSquare className="text-blue-600" size={24} /></div>
              <div>
                <p className="text-sm text-gray-500">Formulários Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{activeFormsCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg"><Users className="text-green-600" size={24} /></div>
              <div>
                <p className="text-sm text-gray-500">Total de Respostas</p>
                <p className="text-2xl font-bold text-gray-900">{totalResponses}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg"><TrendingUp className="text-purple-600" size={24} /></div>
              <div>
                <p className="text-sm text-gray-500">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-gray-900">{totalResponses > 0 ? `${((totalResponses / (forms.length || 1)) * 10).toFixed(0)}%` : '0%'}</p>
              </div>
            </div>
          </div>
        </div>

        {forms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum formulário criado</h3>
            <p className="text-gray-500 mb-6">Crie seu primeiro formulário para começar a capturar leads qualificados.</p>
            <button onClick={() => setShowConsultant(true)} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:opacity-90 flex items-center gap-2 font-medium mx-auto shadow-md">
              <Bot size={18} /> Criar com IA
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map(form => (
              <div key={form.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{form.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{form.questions.length} perguntas</p>
                    </div>
                    <div className="relative">
                      <button onClick={() => setMenuOpenId(menuOpenId === form.id ? null : form.id)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>
                      {menuOpenId === form.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button onClick={() => handleEdit(form)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Edit size={16} /> Editar
                          </button>
                          <button onClick={() => handleToggleStatus(form)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            {form.active ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> Ativar</>}
                          </button>
                          <button onClick={() => onPreview && onPreview(form.id)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Eye size={16} /> Visualizar
                          </button>
                          <button onClick={() => onViewReport && onViewReport(form.id)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <BarChart3 size={16} /> Ver Relatório
                          </button>
                          <hr className="my-1" />
                          <button onClick={() => handleDelete(form.id)} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 size={16} /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${form.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {form.active ? 'Ativo' : 'Pausado'}
                    </span>
                    <span className="text-xs text-gray-400">{getResponseCount(form)} respostas</span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleCopyLink(form.id)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all ${copiedId === form.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {copiedId === form.id ? <><Check size={16} /> Copiado!</> : <><Share2 size={16} /> Copiar Link</>}
                    </button>
                    <button onClick={() => handleOpenQr(form.id, form.name)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors" title="Gerar QR Code">
                      <QrCode size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {qrModalOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                    <button onClick={() => setQrModalOpen(false)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">QR Code do Formulário</h3>
                    <p className="text-sm text-gray-500 mb-4">{currentQrName}</p>
                    <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-center mb-4">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentQrUrl)}`} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <div className="flex justify-center">
                        <a href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentQrUrl)}`} download="qrcode.png" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-colors">
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
            <button onClick={handleHeaderPreview} className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Eye size={18} /> Visualizar
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 shadow-sm font-medium">
              Salvar Formulário
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <InitialFieldsConfig initialFields={currentInitialFields} onChange={setCurrentInitialFields} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Formulário</label>
                <input type="text" value={currentFormName} onChange={(e) => setCurrentFormName(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900" style={{ backgroundColor: '#ffffff', color: '#111827' }} placeholder="Ex: Anamnese Inicial" />
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (Contexto para IA)</label>
                <textarea value={currentFormDescription} onChange={(e) => setCurrentFormDescription(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2 border bg-white text-gray-900" style={{ backgroundColor: '#ffffff', color: '#111827' }} placeholder="Ex: Formulário para qualificar clientes de alto padrão interessados em implantes..." rows={3} />
             </div>
          </div>

          <div className="flex justify-between items-center">
             <h2 className="text-lg font-bold text-gray-800">Perguntas</h2>
             <button onClick={handleAiSuggest} disabled={!currentFormName || isGenerating} className="text-xs bg-purple-100 text-purple-700 px-3 py-2 rounded-full flex items-center gap-2 font-bold hover:bg-purple-200 transition-colors disabled:opacity-50">
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isGenerating ? 'Gerando Perguntas...' : 'Sugerir Perguntas com IA'}
            </button>
          </div>

          {currentQuestions.map((q, index) => (
             <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                <div className="p-6">
                   <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-primary-600 uppercase bg-primary-50 px-2 py-1 rounded">
                           PERGUNTA {index + 1} {q.text && `- ${q.text}`}
                        </span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => handleMoveQuestion(index, 'up')} disabled={index === 0} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-full disabled:opacity-30 disabled:cursor-not-allowed" title="Mover para cima">
                                <ArrowUp size={18} />
                            </button>
                            <button onClick={() => handleMoveQuestion(index, 'down')} disabled={index === currentQuestions.length - 1} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-full disabled:opacity-30 disabled:cursor-not-allowed" title="Mover para baixo">
                                <ArrowDown size={18} />
                            </button>
                            <div className="h-5 w-px bg-gray-200 mx-1"></div>
                            <button onClick={() => removeQuestion(q.id)} className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500 rounded-full transition-colors" title="Excluir pergunta">
                                <Trash2 size={18} />
                            </button>
                        </div>
                   </div>
                   
                   <div className="space-y-4 mb-4">
                      <div>
                        <input type="text" value={q.text} onChange={(e) => updateQuestion(q.id, 'text', e.target.value)} placeholder="Digite a pergunta aqui..." className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all" style={{ backgroundColor: '#ffffff', color: '#111827' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Resposta</label>
                        <select value={q.type} onChange={(e) => updateQuestion(q.id, 'type', e.target.value as FormQuestion['type'])} className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-700 focus:ring-2 focus:ring-primary-500" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
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
                           <button onClick={() => removeOption(q.id, opt.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Trash2 size={14} />
                           </button>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                             <div>
                               <label className="block text-xs font-medium text-gray-500 mb-1">Rótulo da Opção</label>
                               <input type="text" value={opt.label} onChange={(e) => updateOption(q.id, opt.id, 'label', e.target.value)} placeholder="Ex: Sim, tenho dor" className="w-full rounded border-gray-300 p-2 text-sm bg-white text-gray-900" style={{ backgroundColor: '#ffffff', color: '#111827' }} />
                             </div>
                             <div>
                               <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                 <DollarSign size={12} /> Valor de Oportunidade (R$)
                               </label>
                               <input type="number" value={opt.value} onChange={(e) => updateOption(q.id, opt.id, 'value', parseFloat(e.target.value))} placeholder="0.00" className="w-full rounded border-gray-300 p-2 text-sm text-green-700 font-medium bg-white" style={{ backgroundColor: '#ffffff' }} />
                             </div>
                           </div>
                           
                           <div className="space-y-4">
                             <div>
                               <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                 <Package size={12} /> Produto/Serviço Sugerido
                               </label>
                               <input type="text" value={opt.linkedProduct || ''} onChange={(e) => updateOption(q.id, opt.id, 'linkedProduct', e.target.value)} placeholder="Ex: Limpeza Dental" className="w-full rounded border-gray-300 p-2 text-sm bg-white text-gray-900" style={{ backgroundColor: '#ffffff', color: '#111827' }} />
                             </div>
                             <div>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" id={`script-check-${opt.id}`} checked={opt.script !== undefined} onChange={(e) => { const newValue = e.target.checked ? '' : undefined; updateOption(q.id, opt.id, 'script', newValue); }} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                  <label htmlFor={`script-check-${opt.id}`} className="flex items-center gap-1 text-xs font-medium text-gray-500 cursor-pointer">
                                    <MessageSquare size={12} /> Script de Vendas (IA)
                                  </label>
                                </div>
                                
                                {opt.script !== undefined && (
                                  <div className="mt-2">
                                    <div className="relative">
                                      <input type="text" value={opt.script || ''} onChange={(e) => updateOption(q.id, opt.id, 'script', e.target.value)} placeholder="O que o vendedor deve falar..." className="w-full rounded border-gray-300 p-2 text-sm italic text-gray-600 pr-8 bg-white" style={{ backgroundColor: '#ffffff' }} autoFocus />
                                      <button onClick={() => handleGenerateScript(q.id, opt.id, q.text, opt.label)} disabled={generatingScriptId === opt.id || !q.text || !opt.label} className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-700 disabled:opacity-50" title="Gerar script com IA">
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
                                  <input type="checkbox" id={`followup-check-${opt.id}`} checked={opt.followUpLabel !== undefined} onChange={(e) => { const newValue = e.target.checked ? '' : undefined; updateOption(q.id, opt.id, 'followUpLabel', newValue); }} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                  <label htmlFor={`followup-check-${opt.id}`} className="flex items-center gap-1 text-xs font-medium text-gray-500 cursor-pointer">
                                    <MessageSquare size={12} /> Campo de texto de seguimento (Opcional)
                                  </label>
                                </div>
                                {opt.followUpLabel !== undefined && (
                                  <div className="pl-6">
                                    <input type="text" value={opt.followUpLabel || ''} onChange={(e) => updateOption(q.id, opt.id, 'followUpLabel', e.target.value)} placeholder="Ex: Se sim, qual?" className="w-full rounded border-gray-300 p-2 text-sm bg-white text-gray-900 placeholder-gray-400" style={{ backgroundColor: '#ffffff', color: '#111827' }} autoFocus />
                                  </div>
                                )}
                           </div>
                         </div>
                       ))}
                       
                       <button onClick={() => addOption(q.id)} className="text-sm text-primary-600 font-medium hover:text-primary-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-primary-50 w-fit">
                         <Plus size={14} /> Adicionar Alternativa
                       </button>
                     </div>
                   )}
                </div>
             </div>
          ))}

          <button onClick={addQuestion} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-2">
            <Plus size={20} /> Adicionar Nova Pergunta
          </button>
        </div>
       </div>
    </div>
  );

  // Handler para salvar formulário da consultoria - CORRIGIDO
  const handleConsultantSave = (formData: any) => {
    const newForm: Form = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description || (formData.objective === 'qualify' ? 'Formulário de qualificação de leads' : formData.objective === 'feedback' ? 'Formulário de feedback' : 'Formulário personalizado'),
      questions: formData.questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        // CORREÇÃO: Converter tipos do FormConsultant para tipos do PublicForm
        type: normalizeQuestionType(q.type),
        options: q.options?.map((opt: any, i: number) => {
          // Se opt é string (formato antigo), converter para objeto
          if (typeof opt === 'string') {
            return {
              id: `opt_${Date.now()}_${i}`,
              label: opt,
              value: 0,
              linkedProduct: '',
              script: ''
            };
          }
          // Se opt já é objeto, manter estrutura
          return {
            id: opt.id || `opt_${Date.now()}_${i}`,
            label: opt.text || opt.label || '',
            value: opt.value || 0,
            linkedProduct: opt.linkedProduct || '',
            script: opt.script || ''
          };
        }) || []
      })),
      active: true,
      responses: 0,
      initialFields: formData.identification_fields?.map((f: any) => ({
        field: f.type === 'email' ? 'email' : f.type === 'phone' ? 'phone' : 'name',
        label: f.label,
        placeholder: '',
        required: f.required,
        enabled: f.enabled
      })) || undefined
    };
    onSaveForm(newForm);
    setShowConsultant(false);
  };

  return (
    <>
      {view === 'list' && renderList()}
      {view === 'editor' && renderEditor()}
      {showConsultant && (
        <FormConsultant
          supabase={supabase}
          userId={userId || ''}
          onClose={() => setShowConsultant(false)}
          onSaveForm={handleConsultantSave}
        />
      )}
    </>
  );
};

export default FormBuilder;
