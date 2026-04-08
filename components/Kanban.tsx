'use client';
import React, { useState, useEffect, useRef } from 'react';
import { encodeWhatsAppMessage } from '@/lib/utils/whatsapp';
import { useTenantId } from '@/hooks/useTenantId';
import { Lead, Form } from '@/types';
import {
  MoreVertical, DollarSign, Calendar, Filter, Plus, X, User, Mail, FileText,
  Sparkles, Loader2, Briefcase, ArrowRight, CheckCircle, Phone, Save, History,
  BarChart3, TrendingUp, PieChart, Trash2, Eye, RefreshCw, Zap, ChevronDown,
  ChevronUp, Send, MessageSquare, Settings, GripVertical, Pencil, Check, Layers
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Pie, Cell, PieChart as RechartsPieChart
} from 'recharts';
import MessageSuggestionsPanel from './MessageSuggestionsPanel';

interface KanbanStage {
  id: string;
  board_id: string;
  tenant_id: string;
  name: string;
  color: string;
  emoji: string;
  position: number;
}

interface KanbanBoard {
  id: string;
  tenant_id: string;
  name: string;
  is_default: boolean;
  position: number;
  stages: KanbanStage[];
}

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

const Kanban: React.FC<KanbanProps> = ({
  leads, setLeads, forms, onLeadCreate, onLeadStatusUpdate, onLeadNoteUpdate,
  currentUser, isAnalyzingAll = false, analysisProgress = { current: 0, total: 0 },
  pendingAnalysisCount = 0, onAnalyzeAllLeads
}) => {
  const tenantId = useTenantId();

  // Board / Stage State
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [showBoardManager, setShowBoardManager] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [isSavingBoard, setIsSavingBoard] = useState(false);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardName, setEditingBoardName] = useState('');
  const [showStageManager, setShowStageManager] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');
  const [newStageEmoji, setNewStageEmoji] = useState('📋');
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [editingStageColor, setEditingStageColor] = useState('');
  const [editingStageEmoji, setEditingStageEmoji] = useState('');
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null);
  const [deletingStage, setDeletingStage] = useState<KanbanStage | null>(null);
  const [moveLeadsToStageId, setMoveLeadsToStageId] = useState('');

  // Lead State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ name: '', minValue: '', source: '' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadValue, setNewLeadValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailSection, setDetailSection] = useState<'suggestions' | 'answers' | 'ai' | null>(null);

  // Derived
  const activeBoard = boards.find(b => b.id === activeBoardId) || null;
  const stages: KanbanStage[] = activeBoard
    ? [...activeBoard.stages].sort((a, b) => a.position - b.position)
    : [];
  const boardLeads = activeBoardId
    ? leads.filter(l => (l as any).board_id === activeBoardId || (!(l as any).board_id && activeBoard?.is_default))
    : leads;
  const filteredLeads = boardLeads.filter(lead => {
    if (filters.name && !lead.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.minValue && lead.value < parseFloat(filters.minValue)) return false;
    if (filters.source && lead.formSource !== filters.source) return false;
    return true;
  });
  const sources = Array.from(new Set(leads.map(l => l.formSource)));

  // Load Boards
  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      setLoadingBoards(true);
      try {
        const res = await fetch(`/api/kanban-boards?tenant_id=${tenantId}`);
        const data = await res.json();
        if (data.boards) {
          setBoards(data.boards);
          const def = data.boards.find((b: KanbanBoard) => b.is_default) || data.boards[0];
          if (def) setActiveBoardId(def.id);
        }
      } catch (e) {
        console.error('Erro ao carregar boards:', e);
      } finally {
        setLoadingBoards(false);
      }
    };
    load();
  }, [tenantId]);

  // Realtime leads
  useEffect(() => {
    if (!supabase || !tenantId) return;
    const channel = supabase
      .channel('leads-kanban-realtime')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'leads',
        filter: `tenant_id=eq.${tenantId}`
      }, (payload) => {
        const u = payload.new as any;
        setLeads(prev => prev.map(l => l.id === u.id
          ? { ...l, value: u.value, answers: u.answers, status: u.status, notes: u.notes }
          : l
        ));
        if (selectedLead?.id === u.id) {
          setSelectedLead(prev => prev
            ? { ...prev, value: u.value, answers: u.answers, status: u.status, notes: u.notes }
            : null
          );
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, selectedLead]);

  useEffect(() => {
    if (selectedLead && notesEndRef.current) {
      notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedLead?.notes, selectedLead]);

  // ── Board CRUD ──────────────────────────────────────────────
  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !tenantId) return;
    setIsSavingBoard(true);
    try {
      const res = await fetch('/api/kanban-boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'board', tenant_id: tenantId, name: newBoardName.trim() })
      });
      const data = await res.json();
      if (data.board) {
        setBoards(prev => [...prev, data.board]);
        setActiveBoardId(data.board.id);
        setNewBoardName('');
      }
    } finally {
      setIsSavingBoard(false);
    }
  };

  const handleRenameBoard = async (boardId: string) => {
    if (!editingBoardName.trim()) return;
    const res = await fetch('/api/kanban-boards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'board', id: boardId, name: editingBoardName.trim() })
    });
    const data = await res.json();
    if (data.board) setBoards(prev => prev.map(b => b.id === boardId ? { ...b, name: data.board.name } : b));
    setEditingBoardId(null);
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este fluxo? Os leads serão mantidos.')) return;
    const res = await fetch(`/api/kanban-boards?type=board&id=${boardId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    const remaining = boards.filter(b => b.id !== boardId);
    setBoards(remaining);
    if (activeBoardId === boardId) setActiveBoardId(remaining[0]?.id || null);
  };

  // ── Stage CRUD ──────────────────────────────────────────────
  const handleCreateStage = async () => {
    if (!newStageName.trim() || !activeBoardId || !tenantId) return;
    setIsSavingStage(true);
    try {
      const res = await fetch('/api/kanban-boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'stage', board_id: activeBoardId, tenant_id: tenantId,
          name: newStageName.trim(), color: newStageColor, emoji: newStageEmoji
        })
      });
      const data = await res.json();
      if (data.stage) {
        setBoards(prev => prev.map(b => b.id === activeBoardId
          ? { ...b, stages: [...b.stages, data.stage] }
          : b
        ));
        setNewStageName('');
        setNewStageColor('#6366f1');
        setNewStageEmoji('📋');
      }
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleUpdateStage = async (stageId: string) => {
    if (!editingStageName.trim()) return;
    const res = await fetch('/api/kanban-boards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'stage', id: stageId,
        name: editingStageName.trim(), color: editingStageColor, emoji: editingStageEmoji
      })
    });
    const data = await res.json();
    if (data.stage) {
      setBoards(prev => prev.map(b => ({
        ...b,
        stages: b.stages.map(s => s.id === stageId
          ? { ...s, name: data.stage.name, color: data.stage.color, emoji: data.stage.emoji }
          : s
        )
      })));
    }
    setEditingStageId(null);
  };

  const handleDeleteStage = async () => {
    if (!deletingStage) return;
    const url = `/api/kanban-boards?type=stage&id=${deletingStage.id}${moveLeadsToStageId ? `&move_to=${moveLeadsToStageId}` : ''}`;
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    if (moveLeadsToStageId) {
      const targetStage = stages.find(s => s.id === moveLeadsToStageId);
      if (targetStage) {
        setLeads(prev => prev.map(l => l.status === deletingStage.name ? { ...l, status: targetStage.name } : l));
      }
    }
    setBoards(prev => prev.map(b => ({ ...b, stages: b.stages.filter(s => s.id !== deletingStage.id) })));
    setDeletingStage(null);
    setMoveLeadsToStageId('');
  };

  const handleStageDragStart = (e: React.DragEvent, stageId: string) => {
    setDraggedStageId(stageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStageDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (!draggedStageId || draggedStageId === targetStageId || !activeBoardId) return;
    const currentStages = [...stages];
    const fromIdx = currentStages.findIndex(s => s.id === draggedStageId);
    const toIdx = currentStages.findIndex(s => s.id === targetStageId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...currentStages];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withPositions = reordered.map((s, i) => ({ ...s, position: i }));
    setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, stages: withPositions } : b));
    setDraggedStageId(null);
    await fetch('/api/kanban-boards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'reorder_stages', stages: withPositions.map(s => ({ id: s.id, position: s.position })) })
    });
  };

  // ── Lead Handlers ───────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedLeadId) {
      if (onLeadStatusUpdate) onLeadStatusUpdate(draggedLeadId, status);
      else setLeads(prev => prev.map(lead => lead.id === draggedLeadId ? { ...lead, status } : lead));
      setDraggedLeadId(null);
    }
  };

  const handleAddLead = async () => {
    if (!newLeadName || !newLeadValue) return;
    const firstStage = stages[0]?.name || 'Novo';
    if (onLeadCreate) {
      setIsSaving(true);
      await onLeadCreate({
        name: newLeadName, email: '', status: firstStage,
        value: parseFloat(newLeadValue), formSource: 'Manual',
        board_id: activeBoardId
      } as any);
      setIsSaving(false);
    } else {
      const newLead: Lead = {
        id: Date.now().toString(), name: newLeadName, email: 'novo@cliente.com',
        status: firstStage, value: parseFloat(newLeadValue),
        date: new Date().toISOString(), formSource: 'Manual'
      };
      setLeads([...leads, newLead]);
    }
    setNewLeadName(''); setNewLeadValue(''); setIsCreateModalOpen(false);
  };

  const handleOpenDetails = (lead: Lead) => {
    setSelectedLead(lead); setNewNoteText(''); setAiAdvice(null); setDetailSection(null);
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNoteText.trim()) return;
    setIsSavingNote(true);
    try {
      const timestamp = new Date().toLocaleString('pt-BR');
      const noteEntry = `[${timestamp}] ${newNoteText.trim()}`;
      const updatedNotes = selectedLead.notes ? `${selectedLead.notes}\n\n${noteEntry}` : noteEntry;
      if (onLeadNoteUpdate) await onLeadNoteUpdate(selectedLead.id, updatedNotes);
      else {
        if (supabase) {
          const { error } = await supabase.from('leads').update({ notes: updatedNotes }).eq('id', selectedLead.id);
          if (error) throw error;
        }
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: updatedNotes } : l));
      }
      setSelectedLead(prev => prev ? { ...prev, notes: updatedNotes } : null);
      setNewNoteText('');
    } catch (e) {
      console.error('Failed to save note', e);
      alert('Erro ao salvar anotação.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    const leadToDelete = leads.find(l => l.id === leadId);
    if (!leadToDelete) return;
    if (!window.confirm(`Tem certeza que deseja excluir a oportunidade de "${leadToDelete.name}"?\n\nEsta ação não pode ser desfeita.`)) return;
    setIsDeleting(true);
    try {
      if (supabase) {
        const { error } = await supabase.from('leads').delete().eq('id', leadId);
        if (error) throw error;
      }
      setLeads(prev => prev.filter(l => l.id !== leadId));
      if (selectedLead?.id === leadId) setSelectedLead(null);
      setMenuOpenId(null);
    } catch (error) {
      console.error('Erro ao excluir oportunidade:', error);
      alert('Erro ao excluir oportunidade. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getQuestionText = (lead: Lead, questionId: string) => {
    if (!forms) return `Pergunta: ${questionId}`;
    for (const form of forms) {
      const question = form.questions.find(q => q.id === questionId);
      if (question) return question.text;
    }
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
        const notesContext = selectedLead.notes ? `\n\nOBSERVAÇÕES INTERNAS:\n${selectedLead.notes}` : '';
        let formAnswersContext = '';
        if (selectedLead.answers) {
          formAnswersContext = '\nRESPOSTAS DO FORMULÁRIO:\n';
          Object.entries(selectedLead.answers).forEach(([qId, data]: [string, any]) => {
            const question = getQuestionText(selectedLead, qId);
            const answer = (typeof data === 'object' && data !== null) ? (data.value || JSON.stringify(data)) : data;
            formAnswersContext += `- "${question}": "${answer}"\n`;
          });
        }
        const prompt = `Atue como Copywriter de Vendas Sênior.\nEscreva uma mensagem de WhatsApp CURTA (3-4 frases) para o lead:\nNome: ${selectedLead.name}\nOrigem: ${selectedLead.formSource}\nValor: R$ ${selectedLead.value}\n${formAnswersContext}${notesContext}\nDiretrizes: Comece com "Olá ${firstName}, tudo bem?", mencione algo específico das respostas, termine com pergunta fácil. Retorne APENAS o texto.`;
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        setAiAdvice(result.response.text() || 'Sem sugestão gerada.');
      } else {
        await new Promise(r => setTimeout(r, 1500));
        setAiAdvice(`Olá ${firstName}, tudo bem?\nVi seu interesse em ${selectedLead.formSource}. Podemos conversar rapidinho?`);
      }
    } catch (error) {
      setAiAdvice('Erro ao conectar com IA.');
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────
  if (loadingBoards) {
    return (
      <div className="p-8 h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 size={32} className="animate-spin text-primary-500" />
          <p className="text-sm font-medium">Carregando fluxos de Kanban...</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="p-8 h-screen flex flex-col bg-gray-50 overflow-hidden relative">

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quadro de Oportunidades</h1>
            <p className="text-gray-500 mt-0.5 text-sm">Gerencie seu funil de vendas (HelloClient)</p>
          </div>
          <div className="flex gap-2 relative items-center flex-wrap">
            <button onClick={() => setShowDashboard(!showDashboard)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm ${showDashboard ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <BarChart3 size={16} /> Dashboard
            </button>
            <button onClick={() => setShowStageManager(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <Settings size={16} /> Etapas
            </button>
            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm ${isFilterOpen ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Filter size={16} /> Filtros
            </button>
            {isFilterOpen && (
              <div className="absolute top-12 right-36 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-20">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-gray-700 text-sm">Filtrar Leads</h4>
                  <button onClick={() => setFilters({ name: '', minValue: '', source: '' })} className="text-xs text-primary-600 hover:underline">Limpar</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Cliente</label>
                    <input type="text" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} className="w-full text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="Buscar por nome..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Origem</label>
                    <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} className="w-full text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
                      <option value="">Todas</option>
                      {sources.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Valor Mínimo (R$)</label>
                    <input type="number" value={filters.minValue} onChange={(e) => setFilters({ ...filters, minValue: e.target.value })} className="w-full text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500" placeholder="0,00" />
                  </div>
                </div>
              </div>
            )}
            <button onClick={onAnalyzeAllLeads} disabled={isAnalyzingAll || pendingAnalysisCount === 0} className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all text-sm ${isAnalyzingAll ? 'bg-amber-50 border-amber-300 text-amber-700 cursor-wait' : pendingAnalysisCount > 0 ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 hover:shadow-lg shadow-sm' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {isAnalyzingAll
                ? <><Loader2 size={16} className="animate-spin" />Analisando {analysisProgress.current}/{analysisProgress.total}...</>
                : <><Zap size={16} />Analisar com IA {pendingAnalysisCount > 0 && <span className="bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{pendingAnalysisCount}</span>}</>
              }
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 shadow-sm transition-colors flex items-center gap-2 text-sm">
              <Plus size={16} /> Nova Oportunidade
            </button>
          </div>
        </div>

        {/* Board Tabs */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
          {boards.map(board => (
            <button key={board.id} onClick={() => setActiveBoardId(board.id)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeBoardId === board.id ? 'bg-primary-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Layers size={14} />
              {board.name}
              {board.is_default && <span className="text-[10px] opacity-60">(padrão)</span>}
            </button>
          ))}
          <button onClick={() => setShowBoardManager(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-gray-400 border border-dashed border-gray-300 hover:border-primary-400 hover:text-primary-500 transition-colors whitespace-nowrap">
            <Plus size={12} /> Novo Fluxo
          </button>
        </div>
      </div>

      {/* ── Dashboard View ── */}
      {showDashboard ? (
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2"><span className="text-gray-500 text-sm font-medium">Total de Leads</span><User className="text-gray-400" size={20} /></div>
                <p className="text-3xl font-bold text-gray-900">{boardLeads.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2"><span className="text-gray-500 text-sm font-medium">Valor em Aberto</span><TrendingUp className="text-blue-500" size={20} /></div>
                <p className="text-3xl font-bold text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(boardLeads.filter(l => l.status !== 'Vendido' && l.status !== 'Perdido').reduce((acc, l) => acc + l.value, 0))}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2"><span className="text-gray-500 text-sm font-medium">Valor Ganho</span><CheckCircle className="text-green-500" size={20} /></div>
                <p className="text-3xl font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(boardLeads.filter(l => l.status === 'Vendido').reduce((acc, l) => acc + l.value, 0))}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2"><span className="text-gray-500 text-sm font-medium">Valor Perdido</span><X className="text-red-500" size={20} /></div>
                <p className="text-3xl font-bold text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(boardLeads.filter(l => l.status === 'Perdido').reduce((acc, l) => acc + l.value, 0))}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><PieChart size={20} className="text-purple-600" />Distribuição por Etapa</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie data={stages.map(s => ({ name: s.name, value: boardLeads.filter(l => l.status === s.name).length })).filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(entry) => `${entry.name}: ${entry.value}`}>
                      {stages.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-blue-600" />Valor por Etapa</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stages.map(s => ({ name: s.name, value: boardLeads.filter(l => l.status === s.name).reduce((acc, l) => acc + l.value, 0) }))}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis />
                    <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)} />
                    <Bar dataKey="value" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Kanban Board ── */
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-6 h-full min-w-max">
            {stages.map((stage) => {
              const columnLeads = filteredLeads.filter(l => l.status === stage.name);
              const columnTotal = columnLeads.reduce((acc, l) => acc + l.value, 0);
              return (
                <div key={stage.id} className="w-80 flex flex-col" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.name)}>
                  <div className="mb-4">
                    <div className="flex justify-between items-center px-3 py-2 rounded-lg mb-1" style={{ backgroundColor: stage.color + '22', color: stage.color }}>
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <span>{stage.emoji}</span>
                        {stage.name}
                        <span className="bg-white/60 text-xs px-2 py-0.5 rounded-full" style={{ color: stage.color }}>{columnLeads.length}</span>
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
                          onClick={() => !isAnalyzing && handleOpenDetails(lead)}
                          className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all relative ${isAnalyzing ? 'opacity-60 cursor-wait' : 'hover:shadow-md cursor-move group active:scale-95'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{lead.name}</h4>
                            <div className="relative">
                              <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === lead.id ? null : lead.id); }}
                                className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 p-1 rounded transition-all"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {menuOpenId === lead.id && (
                                <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-40">
                                  <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); handleOpenDetails(lead); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Eye size={14} /> Ver Detalhes</button>
                                  <div className="h-px bg-gray-100 my-1"></div>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }} disabled={isDeleting} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50">{isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir</button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">{lead.formSource}</p>
                          {isAnalyzing && (
                            <div className="mb-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              <Loader2 size={12} className="animate-spin" />Analisando com IA...
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                            <div className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                              <DollarSign size={14} />{new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(lead.value)}
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                              <Calendar size={12} />{new Date(lead.date || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {columnLeads.length === 0 && (
                      <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm">Solte aqui</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── New Opportunity Modal ── */}
      {isCreateModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
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

      {/* ── Stage Manager Modal ── */}
      {showStageManager && activeBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Gerenciar Etapas</h2>
                <p className="text-sm text-gray-500 mt-0.5">Fluxo: <span className="font-medium text-primary-600">{activeBoard.name}</span></p>
              </div>
              <button onClick={() => setShowStageManager(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1"><GripVertical size={12} />Arraste para reordenar</p>
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  draggable
                  onDragStart={(e) => handleStageDragStart(e, stage.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleStageDrop(e, stage.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${draggedStageId === stage.id ? 'opacity-50 border-dashed border-primary-300' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <GripVertical size={16} className="text-gray-300 cursor-grab flex-shrink-0" />
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }}></div>
                  {editingStageId === stage.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input type="text" value={editingStageName} onChange={(e) => setEditingStageName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdateStage(stage.id)} className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1" autoFocus />
                      <input type="text" value={editingStageEmoji} onChange={(e) => setEditingStageEmoji(e.target.value)} className="w-12 text-sm border border-gray-300 rounded-lg px-2 py-1 text-center" placeholder="🎯" />
                      <input type="color" value={editingStageColor} onChange={(e) => setEditingStageColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                      <button onClick={() => handleUpdateStage(stage.id)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"><Check size={14} /></button>
                      <button onClick={() => setEditingStageId(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm mr-1">{stage.emoji}</span>
                      <span className="flex-1 text-sm font-medium text-gray-800">{stage.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingStageId(stage.id); setEditingStageName(stage.name); setEditingStageColor(stage.color); setEditingStageEmoji(stage.emoji); }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => { setDeletingStage(stage); setMoveLeadsToStageId(stages.find(s => s.id !== stage.id)?.id || ''); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Nova Etapa</p>
              <div className="flex items-center gap-2">
                <input type="text" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateStage()} className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2" placeholder="Nome da etapa..." />
                <input type="text" value={newStageEmoji} onChange={(e) => setNewStageEmoji(e.target.value)} className="w-12 text-sm border border-gray-300 rounded-lg px-2 py-2 text-center" placeholder="📋" />
                <input type="color" value={newStageColor} onChange={(e) => setNewStageColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-gray-300" />
                <button onClick={handleCreateStage} disabled={!newStageName.trim() || isSavingStage} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-1 text-sm">
                  {isSavingStage ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Board Manager Modal ── */}
      {showBoardManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Gerenciar Fluxos</h2>
              <button onClick={() => setShowBoardManager(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {boards.map(board => (
                <div key={board.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all">
                  <Layers size={16} className="text-primary-500 flex-shrink-0" />
                  {editingBoardId === board.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input type="text" value={editingBoardName} onChange={(e) => setEditingBoardName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRenameBoard(board.id)} className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1" autoFocus />
                      <button onClick={() => handleRenameBoard(board.id)} className="p-1.5 bg-green-500 text-white rounded-lg"><Check size={14} /></button>
                      <button onClick={() => setEditingBoardId(null)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-gray-800">
                        {board.name}
                        {board.is_default && <span className="ml-2 text-xs text-gray-400">(padrão)</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingBoardId(board.id); setEditingBoardName(board.name); }} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Pencil size={14} /></button>
                        {!board.is_default && (
                          <button onClick={() => handleDeleteBoard(board.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Novo Fluxo</p>
              <div className="flex items-center gap-2">
                <input type="text" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()} className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2" placeholder="Ex: Funil de Reativação..." />
                <button onClick={handleCreateBoard} disabled={!newBoardName.trim() || isSavingBoard} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-1 text-sm">
                  {isSavingBoard ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Stage Confirmation ── */}
      {deletingStage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm m-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir etapa "{deletingStage.name}"</h3>
            <p className="text-sm text-gray-500 mb-4">Os leads nesta etapa serão movidos para:</p>
            <select value={moveLeadsToStageId} onChange={(e) => setMoveLeadsToStageId(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mb-4">
              {stages.filter(s => s.id !== deletingStage.id).map(s => (
                <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setDeletingStage(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancelar</button>
              <button onClick={handleDeleteStage} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">Excluir Etapa</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lead Details Panel ── */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full h-full bg-white shadow-2xl flex flex-col">
            {/* Detail Header */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{selectedLead.name}</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-100 text-blue-700 border-blue-200">{selectedLead.status}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600"><Phone size={14} className="text-gray-400" /><span>{selectedLead.phone || 'Sem telefone'}</span></div>
                <div className="flex items-center gap-1 text-sm text-gray-600"><Mail size={14} className="text-gray-400" /><span>{selectedLead.email || 'Sem email'}</span></div>
                <div className="flex items-center gap-1 text-sm text-gray-600"><Calendar size={14} className="text-gray-400" /><span>{new Date(selectedLead.date).toLocaleDateString('pt-BR')}</span></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDeleteLead(selectedLead.id)} disabled={isDeleting} className="px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1 disabled:opacity-50">
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
                </button>
                <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1.5 hover:bg-gray-200 transition-colors"><X size={18} /></button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel */}
              <div className="w-[380px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col p-4 gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-700 font-semibold uppercase">Valor Identificado</span>
                    <span className="text-lg font-bold text-green-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.value)}</span>
                  </div>
                  {selectedLead.answers?._ai_analysis?.recommended_products && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <span className="text-xs text-amber-700 font-semibold">Procedimentos recomendados:</span>
                      <div className="mt-1 space-y-1">
                        {selectedLead.answers._ai_analysis.recommended_products.map((p: any, i: number) => (
                          <div key={i} className="text-xs text-gray-700 flex justify-between">
                            <span>{p.name}</span><span className="font-medium text-green-700">R$ {p.value?.toLocaleString('pt-BR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => setDetailSection(prev => prev === 'suggestions' ? null : 'suggestions')} className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${detailSection === 'suggestions' ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'}`}>
                  <div className="flex items-center gap-2"><Sparkles size={16} className={detailSection === 'suggestions' ? 'text-purple-600' : 'text-gray-400'} /><span className="text-xs font-bold uppercase">Sugestões de Mensagem IA</span></div>
                  <ArrowRight size={16} className="text-gray-400" />
                </button>

                {selectedLead.answers && Object.keys(selectedLead.answers).filter(k => !k.startsWith('_')).length > 0 && (
                  <button onClick={() => setDetailSection(prev => prev === 'answers' ? null : 'answers')} className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${detailSection === 'answers' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'}`}>
                    <div className="flex items-center gap-2"><FileText size={16} className={detailSection === 'answers' ? 'text-blue-600' : 'text-gray-400'} /><span className="text-xs font-bold uppercase">Perguntas e Respostas</span></div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </button>
                )}

                {selectedLead.answers?._ai_analysis && (
                  <button onClick={() => setDetailSection(prev => prev === 'ai' ? null : 'ai')} className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${detailSection === 'ai' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'}`}>
                    <div className="flex items-center gap-2"><Zap size={16} className={detailSection === 'ai' ? 'text-amber-600' : 'text-gray-400'} /><span className="text-xs font-bold uppercase">Análise da IA</span></div>
                    <ArrowRight size={16} className="text-gray-400" />
                  </button>
                )}

                {/* Notes */}
                <div className="flex-1 flex flex-col min-h-0 mt-2">
                  <div className="flex items-center gap-2 mb-2"><History size={14} className="text-gray-400" /><span className="text-xs font-bold text-gray-500 uppercase">Anotações Internas</span></div>
                  <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-2 min-h-[80px] max-h-[200px]">
                    {selectedLead.notes
                      ? selectedLead.notes.split('\n\n').map((note, i) => (
                          <div key={i} className="bg-white rounded p-2 border border-gray-100 leading-relaxed">{note}</div>
                        ))
                      : <p className="text-gray-400 italic text-center py-4">Nenhuma anotação ainda</p>
                    }
                    <div ref={notesEndRef} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input type="text" value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} placeholder="Adicionar anotação..." className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-primary-500 focus:border-primary-500" />
                    <button onClick={handleAddNote} disabled={!newNoteText.trim() || isSavingNote} className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50">
                      {isSavingNote ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
                {detailSection === 'suggestions' && (
                  <div className="h-full">
                    <MessageSuggestionsPanel
                      client={{
                        id: selectedLead.id, name: selectedLead.name, email: selectedLead.email,
                        phone: selectedLead.phone, type: 'lead', leadStatus: selectedLead.status,
                        value: selectedLead.value,
                        daysSinceLastContact: Math.floor((Date.now() - new Date(selectedLead.date).getTime()) / (1000 * 60 * 60 * 24)),
                        answers: selectedLead.answers
                      }}
                      insightType={selectedLead.status === 'Vendido' ? 'opportunity' : selectedLead.status === 'Perdido' ? 'recovery' : 'sales'}
                      showSendButtons={true}
                    />
                  </div>
                )}
                {detailSection === 'answers' && selectedLead.answers && (
                  <div>
                    <div className="flex items-center gap-2 mb-4"><FileText size={18} className="text-blue-600" /><h3 className="font-bold text-gray-900">Respostas do Formulário</h3></div>
                    <div className="space-y-3">
                      {Object.entries(selectedLead.answers).filter(([k]) => !k.startsWith('_')).map(([questionId, answerData]: [string, any]) => (
                        <div key={questionId} className="bg-white rounded-lg border border-gray-200 p-4">
                          <p className="text-xs text-gray-500 font-semibold mb-1">{getQuestionText(selectedLead, questionId)}</p>
                          <div className="flex justify-between items-start">
                            <p className="text-sm text-gray-900 font-medium">{Array.isArray(answerData.value) ? answerData.value.join(', ') : answerData.value}</p>
                            {answerData.optionSelected?.value > 0 && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">+ R$ {answerData.optionSelected.value}</span>}
                          </div>
                          {answerData.followUps && Object.values(answerData.followUps).some((text: any) => text) && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              {Object.entries(answerData.followUps).map(([optId, text]) => text ? (
                                <div key={optId}>
                                  <p className="text-xs text-gray-500 font-medium italic">Informação adicional:</p>
                                  <p className="text-sm text-gray-800 font-medium pl-2 border-l-2 border-gray-200 mt-1">{text as string}</p>
                                </div>
                              ) : null)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detailSection === 'ai' && selectedLead.answers?._ai_analysis && (
                  <div>
                    <div className="flex items-center gap-2 mb-4"><Zap size={18} className="text-amber-600" /><h3 className="font-bold text-gray-900">Análise da IA</h3></div>
                    <div className="space-y-4">
                      {selectedLead.answers._ai_analysis.reasoning && <div className="bg-white rounded-lg border border-gray-200 p-4"><span className="text-xs text-gray-500 font-semibold uppercase">Raciocínio</span><p className="text-sm text-gray-700 mt-1 leading-relaxed">{selectedLead.answers._ai_analysis.reasoning}</p></div>}
                      {selectedLead.answers._ai_analysis.client_insights && <div className="bg-white rounded-lg border border-gray-200 p-4"><span className="text-xs text-gray-500 font-semibold uppercase">Insights do Cliente</span><ul className="mt-2 space-y-1">{selectedLead.answers._ai_analysis.client_insights.map((insight: string, i: number) => <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-purple-500 mt-0.5">•</span>{insight}</li>)}</ul></div>}
                      {selectedLead.answers._ai_analysis.next_steps && <div className="bg-white rounded-lg border border-gray-200 p-4"><span className="text-xs text-gray-500 font-semibold uppercase">Próximos Passos</span><ul className="mt-2 space-y-1">{selectedLead.answers._ai_analysis.next_steps.map((step: string, i: number) => <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><span className="text-green-500 mt-0.5">{i + 1}.</span>{step}</li>)}</ul></div>}
                      {selectedLead.answers._ai_analysis.sales_script && <div className="bg-white rounded-lg border border-gray-200 p-4"><span className="text-xs text-gray-500 font-semibold uppercase">Script de Vendas</span><p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">{selectedLead.answers._ai_analysis.sales_script}</p></div>}
                    </div>
                  </div>
                )}
                {!detailSection && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <MessageSquare size={48} className="mb-3 opacity-30" />
                    <p className="text-sm font-medium">Selecione uma opção ao lado</p>
                    <p className="text-xs mt-1">Escolha entre Sugestões IA, Perguntas ou Análise</p>
                    {selectedLead.answers && Object.keys(selectedLead.answers).filter(k => !k.startsWith('_')).length > 0 && (
                      <div className="mt-6 w-full max-w-lg">
                        <div className="flex items-center gap-2 mb-3"><FileText size={16} className="text-gray-400" /><h4 className="text-sm font-semibold text-gray-600">Resumo das Respostas</h4></div>
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
