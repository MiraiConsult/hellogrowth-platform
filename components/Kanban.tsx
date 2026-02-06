
import React, { useState, useEffect, useRef } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { Lead, Form } from '@/types';
import { MoreVertical, DollarSign, Calendar, Filter, Plus, X, User, Mail, FileText, Sparkles, Loader2, Briefcase, ArrowRight, CheckCircle, Phone, Save, History, BarChart3, TrendingUp, PieChart } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import React
import { useTenantId } from '@/hooks/useTenantId'Markdown from 'react-markdown';
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
}

const Kanban: React.FC<KanbanProps> = ({ leads, setLeads, forms, onLeadCreate, onLeadStatusUpdate, onLeadNoteUpdate, currentUser }) => {
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

  // Scroll to bottom of notes when selected lead changes or notes update
  useEffect(() => {
    if (selectedLead && notesEndRef.current) {
        notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedLead?.notes, selectedLead]);

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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quadro de Oportunidades</h1>
          <p className="text-gray-500">Gerencie seu funil de vendas (HelloClient)</p>
        </div>
        <div className="flex gap-3 relative">
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

          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 shadow-sm transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Nova Oportunidade
          </button>
        </div>
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
                  {columnLeads.map((lead) => (
                    <div 
                      key={lead.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => handleOpenDetails(lead)} // Make card clickable
                      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-move group active:scale-95 relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{lead.name}</h4>
                        <button 
                          onMouseDown={(e) => e.stopPropagation()} // Prevent drag
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            handleOpenDetails(lead);
                          }}
                          className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 p-1 rounded transition-all"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{lead.formSource}</p>
                      
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
                  ))}
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
          {/* Full Screen Panel */}
          <div className="w-full h-full bg-white shadow-2xl flex flex-col animate-in fade-in duration-300">
            <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50 sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedLead.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    selectedLead.status === 'Vendido' ? 'bg-green-100 text-green-700 border-green-200' :
                    selectedLead.status === 'Perdido' ? 'bg-red-100 text-red-700 border-red-200' :
                    'bg-blue-100 text-blue-700 border-blue-200'
                  }`}>
                    {selectedLead.status}
                  </span>
                  <span className="text-sm text-gray-500">• ID: {selectedLead.id.slice(-6)}</span>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Email and Value Section */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-gray-500"><Mail size={18} /></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Email</p>
                    <p className="text-sm text-gray-800">{selectedLead.email || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-green-600"><DollarSign size={18} /></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Valor</p>
                    <p className="text-sm font-bold text-green-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.value)}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Message Suggestions with Send Buttons */}
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

              {/* Form Answers Section */}
              {selectedLead.answers && Object.keys(selectedLead.answers).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} className="text-gray-400" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase">Respostas do Formulário</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(selectedLead.answers).map(([questionId, answerData]: [string, any]) => (
                      <div key={questionId} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <p className="text-xs text-gray-500 font-semibold mb-1.5">{getQuestionText(selectedLead, questionId)}</p>
                        <div className="flex justify-between items-start">
                          <p className="text-gray-900 font-medium text-base">{Array.isArray(answerData.value) ? answerData.value.join(', ') : answerData.value}</p>
                          {answerData.optionSelected?.value > 0 && (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                              + R$ {answerData.optionSelected.value}
                            </span>
                          )}
                        </div>
                        {answerData.followUps && Object.values(answerData.followUps).some(text => text) && (
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

              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right flex-shrink-0">
              <button 
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
