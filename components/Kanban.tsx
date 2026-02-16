import React, { useState, useEffect, useRef } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { Lead, Form } from '@/types';
import { MoreVertical, DollarSign, Calendar, Filter, Plus, X, User, Mail, FileText, Sparkles, Loader2, Briefcase, ArrowRight, CheckCircle, Phone, Save, History, BarChart3, TrendingUp, PieChart, Trash2, Eye, RefreshCw, Zap, ChevronDown, ChevronUp, Send, MessageSquare } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Markdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Pie, Cell, PieChart as RechartsPieChart } from 'recharts';
import MessageSuggestionsPanel from './MessageSuggestionsPanel';

interface KanbanProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  forms?: Form[];
  onLeadCreate?: (lead: Omit<Lead, 'id' | 'date'>) => void;
  onLeadStatusUpdate?: (id: string, status: string) => void;
  onLeadNoteUpdate?: (id: string, note: string) => Promise<void>;
  currentUser?: any;
  isAnalyzingAll?: boolean;
  analysisProgress?: { current: number; total: number };
  pendingAnalysisCount?: number;
  onAnalyzeAllLeads?: () => void;
}

const Kanban: React.FC<KanbanProps> = ({ leads, setLeads, forms, onLeadCreate, onLeadStatusUpdate, onLeadNoteUpdate, currentUser, isAnalyzingAll = false, analysisProgress = { current: 0, total: 0 }, pendingAnalysisCount = 0, onAnalyzeAllLeads }) => {
  const tenantId = useTenantId()

  const columns = ['Novo', 'Em Contato', 'Negociação', 'Vendido', 'Perdido'] as const;
  
  // Define column colors
  const columnColors: Record<string, string> = {
    'Novo': 'bg-gray-200 text-gray-700',
    'Em Contato': 'bg-blue-100 text-blue-800',
    'Negociação': 'bg-purple-100 text-purple-800',
    'Vendido': 'bg-green-100 text-green-800',
    'Perdido': 'bg-red-100 text-red-800'
  };

  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  
  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    minValue: '',
    source: ''
  });

  // Create Lead State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadValue, setNewLeadValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Detail/AI Modal State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  
  // Dashboard State
  const [showDashboard, setShowDashboard] = useState(false);
  
  // Notes State
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);
  
  // Menu Dropdown State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Delete State
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Lead Detail Panel State
  const [detailSection, setDetailSection] = useState<'suggestions' | 'answers' | 'ai' | null>(null);
  const [detailContent, setDetailContent] = useState<{ type: 'whatsapp' | 'email'; message?: any } | null>(null);

  // AI Analysis: uses global state from MainApp via props

  // Scroll to bottom of notes when selected lead changes or notes update
  useEffect(() => {
    if (selectedLead && notesEndRef.current) {
        notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedLead?.notes, selectedLead]);

  // Supabase Realtime: Listen for lead updates (AI analysis completion)
  useEffect(() => {
    if (!supabase || !tenantId) return;

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          console.log('Lead atualizado via Realtime:', payload);
          const updatedLead = payload.new as any;
          
          // Atualizar lead no estado local
          setLeads((prev) =>
            prev.map((lead) =>
              lead.id === updatedLead.id
                ? {
                    ...lead,
                    value: updatedLead.value,
                    answers: updatedLead.answers,
                    status: updatedLead.status,
                    notes: updatedLead.notes
                  }
                : lead
            )
          );
          
          // Se o lead atualizado está selecionado, atualizar também
          if (selectedLead && selectedLead.id === updatedLead.id) {
            setSelectedLead((prev) => prev ? {
              ...prev,
              value: updatedLead.value,
              answers: updatedLead.answers,
              status: updatedLead.status,
              notes: updatedLead.notes
            } : null);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, selectedLead]);

  // Derived filtered leads
  const filteredLeads = leads.filter(lead => {
    if (filters.name && !lead.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.minValue && lead.value < parseFloat(filters.minValue)) return false;
    if (filters.source && lead.formSource !== filters.source) return false;
    return true;
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: Lead['status']) => {
    e.preventDefault();
    if (draggedLeadId) {
      if (onLeadStatusUpdate) {
        onLeadStatusUpdate(draggedLeadId, status);
      } else {
        // Fallback local update
        setLeads((prev) =>
          prev.map((lead) => (lead.id === draggedLeadId ? { ...lead, status } : lead))
        );
      }
      setDraggedLeadId(null);
    }
  };

  const handleAddLead = async () => {
    if (!newLeadName || !newLeadValue) return;
    
    if (onLeadCreate) {
        setIsSaving(true);
        await onLeadCreate({
            name: newLeadName,
            email: '',
            status: 'Novo',
            value: parseFloat(newLeadValue),
            formSource: 'Manual'
        });
        setIsSaving(false);
    } else {
        const newLead: Lead = {
          id: Date.now().toString(),
          name: newLeadName,
          email: 'novo@cliente.com',
          status: 'Novo',
          value: parseFloat(newLeadValue),
          date: new Date().toISOString(),
          formSource: 'Manual',
        };
        setLeads([...leads, newLead]);
    }

    setNewLeadName('');
    setNewLeadValue('');
    setIsCreateModalOpen(false);
  };

  // Open Lead Details
  const handleOpenDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setNewNoteText('');
    setAiAdvice(null); 
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNoteText.trim()) return;
    setIsSavingNote(true);
    
    try {
        const timestamp = new Date().toLocaleString('pt-BR');
        const noteEntry = `[${timestamp}] ${newNoteText.trim()}`;
        
        // Append to existing notes
        const updatedNotes = selectedLead.notes 
            ? `${selectedLead.notes}\n\n${noteEntry}`
            : noteEntry;

        if (onLeadNoteUpdate) {
            await onLeadNoteUpdate(selectedLead.id, updatedNotes);
        } else {
            // Fallback Update
            if (supabase) {
                const { error } = await supabase.from('leads').update({ notes: updatedNotes }).eq('id', selectedLead.id);
                if (error) throw error;
            }
            // Local Update
            setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: updatedNotes } : l));
        }

        // Update selected lead reference
        setSelectedLead(prev => prev ? { ...prev, notes: updatedNotes } : null);
        setNewNoteText('');
        
    } catch (e) {
        console.error("Failed to save note", e);
        alert("Erro ao salvar anotação.");
    } finally {
        setIsSavingNote(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    const leadToDelete = leads.find(l => l.id === leadId);
    if (!leadToDelete) return;
    
    const confirmMessage = `Tem certeza que deseja excluir a oportunidade de "${leadToDelete.name}"?\n\nEsta ação não pode ser desfeita.`;
    if (!window.confirm(confirmMessage)) return;
    
    setIsDeleting(true);
    try {
      // Excluir do banco de dados
      if (supabase) {
        const { error } = await supabase
          .from('leads')
          .delete()
          .eq('id', leadId);
        
        if (error) throw error;
      }
      
      // Atualizar estado local
      setLeads(prev => prev.filter(l => l.id !== leadId));
      
      // Fechar modal se estiver aberto
      if (selectedLead?.id === leadId) {
        setSelectedLead(null);
      }
      
      // Fechar menu dropdown
      setMenuOpenId(null);
      
    } catch (error) {
      console.error('Erro ao excluir oportunidade:', error);
      alert('Erro ao excluir oportunidade. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to get question text
  const getQuestionText = (lead: Lead, questionId: string) => {
    if (!forms) return `Pergunta: ${questionId}`;

    // 1. Global Search: Since question IDs are unique (timestamp+random), 
    // search across ALL forms to find the matching question text.
    for (const form of forms) {
        const question = form.questions.find(q => q.id === questionId);
        if (question) return question.text;
    }

    // 2. Fallback: If not found globally, try to infer from formSource matching (Legacy)
    const sourceForm = forms.find(f => f.name === lead.formSource);
    if (sourceForm) {
        const q = sourceForm.questions.find(q => q.id === questionId);
        if (q) return q.text;
    }

    return `Pergunta: ${questionId}`;
  };

  const handleGenerateAdvice = async () => {
    if (!selectedLead) return;
    setIsGeneratingAdvice(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const firstName = (selectedLead.name || '').split(' ')[0];
      
      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        
        // Include notes in context
        const notesContext = selectedLead.notes ? `\n\nOBSERVAÇÕES INTERNAS (Use apenas para contexto): \n${selectedLead.notes}` : '';
        
        // Extract Form Answers
        let formAnswersContext = '';
        if (selectedLead.answers) {
            formAnswersContext = '\nRESPOSTAS DO FORMULÁRIO DE QUALIFICAÇÃO:\n';
            Object.entries(selectedLead.answers).forEach(([qId, data]: [string, any]) => {
                const question = getQuestionText(selectedLead, qId);
                // Handle different answer structures (simple value or object with metadata)
                const answer = (typeof data === 'object' && data !== null) 
                    ? (data.value || JSON.stringify(data)) 
                    : data;
                formAnswersContext += `- Pergunta: "${question}" | Resposta: "${answer}"\n`;
            });
        }

        const prompt = `
          Atue como um Copywriter de Vendas Sênior e Especialista em Pré-Venda.
          
          TAREFA:
          Escreva uma mensagem de abordagem comercial para ser enviada via WhatsApp para este lead.
          A mensagem deve ser CURTA, DIRETA e HUMANIZADA.
          
          DADOS DO LEAD:
          Nome: ${selectedLead.name}
          Origem: ${selectedLead.formSource}
          Valor Estimado: R$ ${selectedLead.value}
          ${formAnswersContext}
          ${notesContext}
          
          DIRETRIZES RÍGIDAS:
          1. MÁXIMO de 3 a 4 frases curtas.
          2. Comece com "Olá ${firstName}, tudo bem?".
          3. Mencione UM ponto específico das respostas para criar conexão.
          4. Termine com uma pergunta fácil de responder (Sim/Não ou Horário).
          5. NADA de textos longos ou formais demais. Pareça uma pessoa real digitando.
          6. Retorne APENAS o texto da mensagem.
        `;
        
        // FIX: Updated model from deprecated 'gemini-2.5-flash' to 'gemini-3-flash-preview' for basic text task.
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt );
        const response = { text: result.response.text() };
        setAiAdvice(response.text || "Sem sugestão gerada.");
      } else {
        await new Promise(r => setTimeout(r, 1500));
        setAiAdvice(`Olá ${firstName}, tudo bem? 👋\nVi seu interesse em ${selectedLead.formSource}. Podemos conversar rapidinho sobre o que você precisa?`);
      }
    } catch (error) {
      setAiAdvice("Erro ao conectar com IA.");
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  const handleContactClick = () => {
    if (selectedLead && selectedLead.phone) {
        // Remove non-numeric characters
        const cleanNumber = selectedLead.phone.replace(/[^0-9]/g, '');
        if (cleanNumber) {
            let url = `https://wa.me/55${cleanNumber}`;
            
            // Auto-fill message if generated
            if (aiAdvice && !aiAdvice.includes("Erro") && !aiAdvice.includes("Sem sugestão") && !isGeneratingAdvice) {
                url += `?text=${encodeURIComponent(aiAdvice)}`;
            }
            
            window.open(url, '_blank');
        } else {
            alert("Número de telefone inválido.");
        }
    } else {
        alert("Este lead não possui telefone cadastrado.");
    }
  };

  // Get unique sources for filter
  const sources = Array.from(new Set(leads.map(l => l.formSource)));

  return (
    <div className="p-8 h-screen flex flex-col bg-gray-50 overflow-hidden relative">
      <div className="mb-8">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Quadro de Oportunidades</h1>
          <div className="flex gap-3 relative items-center flex-wrap">
          <button 
            onClick={() => setShowDashboard(!showDashboard)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showDashboard ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <BarChart3 size={18} /> Dashboard
          </button>
          
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${isFilterOpen ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={18} /> Filtros
          </button>

          {/* Filter Dropdown */}
          {isFilterOpen && (
            <div className="absolute top-12 right-0 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-20 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-gray-700 text-sm">Filtrar Leads</h4>
                    <button onClick={() => setFilters({ name: '', minValue: '', source: '' })} className="text-xs text-primary-600 hover:underline">Limpar</button>
                </div>
                
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Cliente</label>
                        <input 
                            type="text" 
                            value={filters.name}
                            onChange={(e) => setFilters({...filters, name: e.target.value})}
                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Buscar por nome..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Origem</label>
                        <select 
                            value={filters.source}
                            onChange={(e) => setFilters({...filters, source: e.target.value})}
                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">Todas</option>
                            {sources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Valor Mínimo (R$)</label>
                        <input 
                            type="number" 
                            value={filters.minValue}
                            onChange={(e) => setFilters({...filters, minValue: e.target.value})}
                            className="w-full text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0,00"
                        />
                    </div>
                </div>
            </div>
          )}

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
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 shadow-sm transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Nova Oportunidade
          </button>
        </div>
        </div>
        <p className="text-gray-500 mt-1">Gerencie seu funil de vendas (HelloClient)</p>
      </div>

      {/* Dashboard View */}
      {showDashboard ? (
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm font-medium">Total de Leads</span>
                  <User className="text-gray-400" size={20} />
                </div>
                <p className="text-3xl font-bold text-gray-900">{leads.length}</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm font-medium">Volume Total</span>
                  <DollarSign className="text-green-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(leads.reduce((acc, curr) => acc + curr.value, 0))}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm font-medium">Taxa de Conversão</span>
                  <TrendingUp className="text-blue-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {leads.length > 0 ? ((leads.filter(l => l.status === 'Vendido').length / leads.length) * 100).toFixed(1) : 0}%
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-500 text-sm font-medium">Valor Perdido</span>
                  <X className="text-red-500" size={20} />
                </div>
                <p className="text-3xl font-bold text-red-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(leads.filter(l => l.status === 'Perdido').reduce((acc, curr) => acc + curr.value, 0))}
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution Pie Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart size={20} className="text-purple-600" />
                  Distribuição por Status
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Novo', value: leads.filter(l => l.status === 'Novo').length, fill: '#E5E7EB' },
                        { name: 'Em Contato', value: leads.filter(l => l.status === 'Em Contato').length, fill: '#DBEAFE' },
                        { name: 'Negociação', value: leads.filter(l => l.status === 'Negociação').length, fill: '#F3E8FF' },
                        { name: 'Vendido', value: leads.filter(l => l.status === 'Vendido').length, fill: '#DCFCE7' },
                        { name: 'Perdido', value: leads.filter(l => l.status === 'Perdido').length, fill: '#FEE2E2' },
                      ].filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                    >
                      {[
                        { name: 'Novo', value: leads.filter(l => l.status === 'Novo').length, fill: '#9CA3AF' },
                        { name: 'Em Contato', value: leads.filter(l => l.status === 'Em Contato').length, fill: '#3B82F6' },
                        { name: 'Negociação', value: leads.filter(l => l.status === 'Negociação').length, fill: '#A855F7' },
                        { name: 'Vendido', value: leads.filter(l => l.status === 'Vendido').length, fill: '#22C55E' },
                        { name: 'Perdido', value: leads.filter(l => l.status === 'Perdido').length, fill: '#EF4444' },
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              {/* Value by Status Bar Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-600" />
                  Valor por Status
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Novo', value: leads.filter(l => l.status === 'Novo').reduce((acc, l) => acc + l.value, 0) },
                    { name: 'Em Contato', value: leads.filter(l => l.status === 'Em Contato').reduce((acc, l) => acc + l.value, 0) },
                    { name: 'Negociação', value: leads.filter(l => l.status === 'Negociação').reduce((acc, l) => acc + l.value, 0) },
                    { name: 'Vendido', value: leads.filter(l => l.status === 'Vendido').reduce((acc, l) => acc + l.value, 0) },
                    { name: 'Perdido', value: leads.filter(l => l.status === 'Perdido').reduce((acc, l) => acc + l.value, 0) },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)} />
                    <Bar dataKey="value" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-6 h-full min-w-max">
            {columns.map((col) => {
            const columnLeads = filteredLeads.filter((l) => l.status === col);
            const columnTotal = columnLeads.reduce((acc, l) => acc + l.value, 0);
            
            return (
              <div 
                key={col} 
                className="w-80 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
              >
                <div className="mb-4">
                  <div className={`flex justify-between items-center px-3 py-2 rounded-lg mb-1 ${columnColors[col]}`}>
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        {col} 
                        <span className="bg-white/50 text-xs px-2 py-0.5 rounded-full">{columnLeads.length}</span>
                      </h3>
                  </div>
                  <p className="text-xs font-medium text-gray-500 px-2 text-right">
                    Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(columnTotal)}
                  </p>
                </div>
                
                <div className={`bg-gray-100 rounded-xl p-3 flex-1 overflow-y-auto space-y-3 transition-colors ${draggedLeadId ? 'border-2 border-dashed border-gray-300' : ''}`}>
                  {columnLeads.map((lead) => {
                    const isAnalyzing = lead.answers?._analyzing === true;
                    return (
                    <div 
                      key={lead.id} 
                      draggable={!isAnalyzing}
                      onDragStart={(e) => !isAnalyzing && handleDragStart(e, lead.id)}
                      onClick={() => !isAnalyzing && handleOpenDetails(lead)} // Make card clickable
                      className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all relative ${
                        isAnalyzing 
                          ? 'opacity-60 cursor-wait' 
                          : 'hover:shadow-md cursor-move group active:scale-95'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{lead.name}</h4>
                        <div className="relative">
                          <button 
                            onMouseDown={(e) => e.stopPropagation()} // Prevent drag
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              setMenuOpenId(menuOpenId === lead.id ? null : lead.id);
                            }}
                            className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 p-1 rounded transition-all"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuOpenId === lead.id && (
                            <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-40">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenId(null);
                                  handleOpenDetails(lead);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye size={14} /> Ver Detalhes
                              </button>
                              <div className="h-px bg-gray-100 my-1"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLead(lead.id);
                                }}
                                disabled={isDeleting}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50"
                              >
                                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{lead.formSource}</p>
                      
                      {isAnalyzing && (
                        <div className="mb-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          <Loader2 size={12} className="animate-spin" />
                          Analisando com IA...
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                          <DollarSign size={14} />
                          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(lead.value)}
                        </div>
                         <div className="flex items-center gap-1 text-gray-400 text-xs">
                          <Calendar size={12} />
                          {/* Safe Date Parsing */}
                          {new Date(lead.date || Date.now()).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                        </div>
                      </div>
                    </div>
                  );
                  })}
                  {columnLeads.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      Solte aqui
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* New Opportunity Modal */}
      {isCreateModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
             {/* ... New Lead Form ... */}
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-gray-900">Nova Oportunidade</h3>
               <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
             </div>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                 <input type="text" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm p-2 border" placeholder="Ex: Maria Silva" autoFocus />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Valor Estimado (R$)</label>
                 <input type="number" value={newLeadValue} onChange={(e) => setNewLeadValue(e.target.value)} className="w-full rounded-lg border-gray-300 shadow-sm p-2 border" placeholder="0,00" />
               </div>
               <div className="flex gap-3 mt-6">
                 <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                 <button onClick={handleAddLead} disabled={!newLeadName || !newLeadValue || isSaving} className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex justify-center items-center">
                     {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Criar'}
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Lead Details Panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full h-full bg-white shadow-2xl flex flex-col animate-in fade-in duration-300">
            {/* HEADER - Nome, Telefone, Email, Data, Status */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{selectedLead.name}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    selectedLead.status === 'Vendido' ? 'bg-green-100 text-green-700 border-green-200' :
                    selectedLead.status === 'Perdido' ? 'bg-red-100 text-red-700 border-red-200' :
                    'bg-blue-100 text-blue-700 border-blue-200'
                  }`}>
                    {selectedLead.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  <span>{selectedLead.phone || 'Sem telefone'}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400" />
                  <span>{selectedLead.email || 'Sem email'}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Calendar size={14} className="text-gray-400" />
                  <span>{new Date(selectedLead.date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Excluir
                </button>
                <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1.5 hover:bg-gray-200 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* CORPO - Duas colunas */}
            <div className="flex-1 flex overflow-hidden">
              {/* COLUNA ESQUERDA - Controles (apenas botões seletores) */}
              <div className="w-[380px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col p-4 gap-3">
                
                {/* Valor e Procedimentos */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-700 font-semibold uppercase">Valor Identificado</span>
                    <span className="text-lg font-bold text-green-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.value)}
                    </span>
                  </div>
                  {selectedLead.answers?._ai_analysis?.recommended_products && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <span className="text-xs text-amber-700 font-semibold">Procedimentos recomendados:</span>
                      <div className="mt-1 space-y-1">
                        {selectedLead.answers._ai_analysis.recommended_products.map((p: any, i: number) => (
                          <div key={i} className="text-xs text-gray-700 flex justify-between">
                            <span>{p.name}</span>
                            <span className="font-medium text-green-700">R$ {p.value?.toLocaleString('pt-BR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sugestões de Mensagem IA - Botão seletor */}
                <button
                  onClick={() => setDetailSection(prev => prev === 'suggestions' ? null : 'suggestions')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    detailSection === 'suggestions' 
                      ? 'border-purple-300 bg-purple-50 text-purple-700' 
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className={detailSection === 'suggestions' ? 'text-purple-600' : 'text-gray-400'} />
                    <span className="text-xs font-bold uppercase">Sugestões de Mensagem IA</span>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </button>

                {/* Perguntas e Respostas - Botão seletor */}
                {selectedLead.answers && Object.keys(selectedLead.answers).filter(k => !k.startsWith('_')).length > 0 && (
                  <button
                    onClick={() => setDetailSection(prev => prev === 'answers' ? null : 'answers')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      detailSection === 'answers' 
                        ? 'border-blue-300 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className={detailSection === 'answers' ? 'text-blue-600' : 'text-gray-400'} />
                      <span className="text-xs font-bold uppercase">Perguntas e Respostas</span>
                      <span className="text-xs text-gray-400">
                        ({Object.keys(selectedLead.answers).filter(k => !k.startsWith('_')).length})
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </button>
                )}

                {/* Análise da IA - Botão seletor */}
                {selectedLead.answers?._ai_analysis && (
                  <button
                    onClick={() => setDetailSection(prev => prev === 'ai' ? null : 'ai')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      detailSection === 'ai' 
                        ? 'border-amber-300 bg-amber-50 text-amber-700' 
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={16} className={detailSection === 'ai' ? 'text-amber-600' : 'text-gray-400'} />
                      <span className="text-xs font-bold uppercase">Análise da IA</span>
                    </div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </button>
                )}

              </div>

              {/* COLUNA DIREITA - Área de conteúdo dinâmico */}
              <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
                
                {/* Conteúdo: Sugestões de Mensagem IA */}
                {detailSection === 'suggestions' && (
                  <div className="h-full">
                    <MessageSuggestionsPanel
                      client={{
                        id: selectedLead.id,
                        name: selectedLead.name,
                        email: selectedLead.email,
                        phone: selectedLead.phone,
                        type: 'lead',
                        leadStatus: selectedLead.status,
                        value: selectedLead.value,
                        daysSinceLastContact: Math.floor((Date.now() - new Date(selectedLead.date).getTime()) / (1000 * 60 * 60 * 24)),
                        answers: selectedLead.answers
                      }}
                      insightType={selectedLead.status === 'Vendido' ? 'opportunity' : selectedLead.status === 'Perdido' ? 'recovery' : 'sales'}
                      showSendButtons={true}
                    />
                  </div>
                )}

                {/* Conteúdo: Perguntas e Respostas */}
                {detailSection === 'answers' && selectedLead.answers && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText size={18} className="text-blue-600" />
                      <h3 className="font-bold text-gray-900">Perguntas e Respostas</h3>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(selectedLead.answers).filter(([k]) => !k.startsWith('_')).map(([questionId, answerData]: [string, any]) => (
                        <div key={questionId} className="bg-white rounded-lg border border-gray-200 p-4">
                          <p className="text-xs text-gray-500 font-semibold mb-1">{getQuestionText(selectedLead, questionId)}</p>
                          <div className="flex justify-between items-start">
                            <p className="text-sm text-gray-900 font-medium">{Array.isArray(answerData.value) ? answerData.value.join(', ') : answerData.value}</p>
                            {answerData.optionSelected?.value > 0 && (
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                + R$ {answerData.optionSelected.value}
                              </span>
                            )}
                          </div>
                          {answerData.followUps && Object.values(answerData.followUps).some((text: any) => text) && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              {Object.entries(answerData.followUps).map(([optId, text]) => 
                                text ? (
                                  <div key={optId}>
                                    <p className="text-xs text-gray-500 font-medium italic">Informação adicional:</p>
                                    <p className="text-sm text-gray-800 font-medium pl-2 border-l-2 border-gray-200 mt-1">{text as string}</p>
                                  </div>
                                ) : null
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conteúdo: Análise da IA */}
                {detailSection === 'ai' && selectedLead.answers?._ai_analysis && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Zap size={18} className="text-amber-600" />
                      <h3 className="font-bold text-gray-900">Análise da IA</h3>
                    </div>
                    <div className="space-y-4">
                      {selectedLead.answers._ai_analysis.reasoning && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <span className="text-xs text-gray-500 font-semibold uppercase">Raciocínio</span>
                          <p className="text-sm text-gray-700 mt-1 leading-relaxed">{selectedLead.answers._ai_analysis.reasoning}</p>
                        </div>
                      )}
                      {selectedLead.answers._ai_analysis.client_insights && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <span className="text-xs text-gray-500 font-semibold uppercase">Insights do Cliente</span>
                          <ul className="mt-2 space-y-1">
                            {selectedLead.answers._ai_analysis.client_insights.map((insight: string, i: number) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-purple-500 mt-0.5">•</span> {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedLead.answers._ai_analysis.next_steps && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <span className="text-xs text-gray-500 font-semibold uppercase">Próximos Passos</span>
                          <ul className="mt-2 space-y-1">
                            {selectedLead.answers._ai_analysis.next_steps.map((step: string, i: number) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">{i + 1}.</span> {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedLead.answers._ai_analysis.sales_script && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <span className="text-xs text-gray-500 font-semibold uppercase">Script de Vendas</span>
                          <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">{selectedLead.answers._ai_analysis.sales_script}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Estado padrão - nenhuma seção selecionada */}
                {!detailSection && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <MessageSquare size={48} className="mb-3 opacity-30" />
                    <p className="text-sm font-medium">Selecione uma opção ao lado</p>
                    <p className="text-xs mt-1">Escolha entre Sugestões IA, Perguntas ou Análise</p>
                    
                    {/* Resumo das respostas como conteúdo padrão */}
                    {selectedLead.answers && Object.keys(selectedLead.answers).filter(k => !k.startsWith('_')).length > 0 && (
                      <div className="mt-6 w-full max-w-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText size={16} className="text-gray-400" />
                          <h4 className="text-sm font-semibold text-gray-600">Resumo das Respostas</h4>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(selectedLead.answers).filter(([k]) => !k.startsWith('_')).map(([questionId, answerData]: [string, any]) => (
                            <div key={questionId} className="bg-white rounded-lg border border-gray-200 p-3">
                              <p className="text-[10px] text-gray-500 font-semibold">{getQuestionText(selectedLead, questionId)}</p>
                              <p className="text-sm text-gray-800 font-medium mt-0.5">{Array.isArray(answerData.value) ? answerData.value.join(', ') : answerData.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
