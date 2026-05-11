import React, { useState, useEffect, useRef } from 'react';
import { encodeWhatsAppMessage } from '@/lib/utils/whatsapp';
import { useTenantId } from '@/hooks/useTenantId';
import { Lead, Form } from '@/types';
import { MoreVertical, DollarSign, Calendar, Filter, Plus, X, User, Mail, FileText, Sparkles, Loader2, Briefcase, ArrowRight, CheckCircle, Phone, Save, History, BarChart3, TrendingUp, PieChart, Trash2, Eye, RefreshCw, Zap, ChevronDown, ChevronUp, Send, MessageSquare, Edit2, Package, StickyNote, PlusCircle, MinusCircle, Settings, GripVertical, AlertTriangle, Bot, Check, AlertCircle, Search, ShieldCheck, PenLine } from 'lucide-react';
import { callGeminiAPI } from '@/lib/gemini-client';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Pie, Cell, PieChart as RechartsPieChart } from 'recharts';
import MessageSuggestionsPanel from './MessageSuggestionsPanel';

interface KanbanStage {
  id: string;
  name: string;
  color: string;
  emoji: string;
  position: number;
  board_id: string;
}

interface CatalogProduct {
  id: string;
  name: string;
  value: number;
}

interface KanbanProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  forms?: Form[];
  catalogProducts?: CatalogProduct[];
  onLeadCreate?: (lead: Omit<Lead, 'id' | 'date'>) => void;
  onLeadStatusUpdate?: (id: string, status: string) => void;
  onLeadNoteUpdate?: (id: string, note: string) => Promise<void>;
  currentUser?: any;
  isAnalyzingAll?: boolean;
  analysisProgress?: { current: number; total: number };
  pendingAnalysisCount?: number;
  onAnalyzeAllLeads?: () => void;
}

const Kanban: React.FC<KanbanProps> = ({ leads, setLeads, forms, catalogProducts = [], onLeadCreate, onLeadStatusUpdate, onLeadNoteUpdate, currentUser, isAnalyzingAll = false, analysisProgress = { current: 0, total: 0 }, pendingAnalysisCount = 0, onAnalyzeAllLeads }) => {
  const tenantId = useTenantId()

  // ---- Etapas dinâmicas ----
  const DEFAULT_STAGES: KanbanStage[] = [
    { id: 'default-0', name: 'Novo', color: '#9CA3AF', emoji: '🆕', position: 0, board_id: '' },
    { id: 'default-1', name: 'Em Contato', color: '#3B82F6', emoji: '📞', position: 1, board_id: '' },
    { id: 'default-2', name: 'Negociação', color: '#A855F7', emoji: '🤝', position: 2, board_id: '' },
    { id: 'default-3', name: 'Vendido', color: '#22C55E', emoji: '✅', position: 3, board_id: '' },
    { id: 'default-4', name: 'Perdido', color: '#EF4444', emoji: '❌', position: 4, board_id: '' },
  ];
  const [stages, setStages] = useState<KanbanStage[]>(DEFAULT_STAGES);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isLoadingStages, setIsLoadingStages] = useState(true);
  // Modal de gerenciamento de etapas
  const [showStagesModal, setShowStagesModal] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Cor de coluna baseada na cor hex da etapa
  const getColumnStyle = (color: string) => ({
    backgroundColor: color + '22',
    color: color,
    borderColor: color + '44',
  });

  // Compatibilidade: columns como array de nomes para o restante do código
  const columns = stages.map(s => s.name);

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
  const [detailSection, setDetailSection] = useState<'suggestions' | 'answers' | 'ai' | 'negotiation' | 'signature' | null>(null);
  const [isSendingSignatureEmail, setIsSendingSignatureEmail] = useState(false);
  const [signatureEmailResult, setSignatureEmailResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [detailContent, setDetailContent] = useState<{ type: 'whatsapp' | 'email'; message?: any } | null>(null);

  // Reenvio de e-mail de análise
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendEmailResult, setResendEmailResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [resendCustomEmail, setResendCustomEmail] = useState('');

  // Negotiation Notes State
  const [negotiationNoteText, setNegotiationNoteText] = useState('');
  const [isSavingNegotiationNote, setIsSavingNegotiationNote] = useState(false);

  // Edit Value & Products State
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editValueText, setEditValueText] = useState('');
  const [editProducts, setEditProducts] = useState<Array<{ name: string; value: number }>>([]);
  const [isSavingProducts, setIsSavingProducts] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productPickerSearch, setProductPickerSearch] = useState('');

  // AI Analysis: uses global state from MainApp via props

  // Scroll to bottom of notes when selected lead changes or notes update
  useEffect(() => {
    if (selectedLead && notesEndRef.current) {
        notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedLead?.notes, selectedLead]);

  // ---- Carregar etapas do banco ----
  useEffect(() => {
    if (!tenantId) return;
    setIsLoadingStages(true);
    fetch(`/api/kanban-boards?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(data => {
        if (data.boards && data.boards.length > 0) {
          const board = data.boards[0];
          setBoardId(board.id);
          if (board.stages && board.stages.length > 0) {
            setStages(board.stages.sort((a: KanbanStage, b: KanbanStage) => a.position - b.position));
          }
        }
      })
      .catch(err => console.error('Erro ao carregar etapas:', err))
      .finally(() => setIsLoadingStages(false));
  }, [tenantId]);

  // ---- Funções de gerenciamento de etapas ----
  const handleRenameStage = async (stageId: string, newName: string) => {
    if (!newName.trim()) return;
    setIsSavingStage(true);
    setStageError(null);
    try {
      const res = await fetch('/api/kanban-boards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stage', id: stageId, name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao renomear');
      const oldName = stages.find(s => s.id === stageId)?.name || '';
      setStages(prev => prev.map(s => s.id === stageId ? { ...s, name: newName.trim() } : s));
      // Atualizar leads com o status antigo para o novo nome
      setLeads(prev => prev.map(l => l.status === oldName ? { ...l, status: newName.trim() as any } : l));
      setEditingStageId(null);
    } catch (err: any) {
      setStageError(err.message);
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleCreateStage = async () => {
    if (!newStageName.trim() || !boardId) return;
    setIsSavingStage(true);
    setStageError(null);
    const colors = ['#F59E0B', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#8B5CF6'];
    const randomColor = colors[stages.length % colors.length];
    try {
      const res = await fetch('/api/kanban-boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'stage', board_id: boardId, tenant_id: tenantId, name: newStageName.trim(), color: randomColor, emoji: '📌' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar etapa');
      setStages(prev => [...prev, data.stage].sort((a, b) => a.position - b.position));
      setNewStageName('');
    } catch (err: any) {
      setStageError(err.message);
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (stages.length <= 1) { setStageError('Não é possível excluir a única etapa.'); return; }
    setDeletingStageId(stageId);
    setStageError(null);
    // Move leads para a primeira etapa diferente
    const otherStage = stages.find(s => s.id !== stageId);
    const moveToId = otherStage?.id;
    try {
      const res = await fetch(`/api/kanban-boards?type=stage&id=${stageId}${moveToId ? `&move_to=${moveToId}` : ''}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');
      const deletedStage = stages.find(s => s.id === stageId);
      setStages(prev => prev.filter(s => s.id !== stageId));
      // Atualizar leads
      if (deletedStage && otherStage) {
        setLeads(prev => prev.map(l => l.status === deletedStage.name ? { ...l, status: otherStage.name as any } : l));
      }
    } catch (err: any) {
      setStageError(err.message);
    } finally {
      setDeletingStageId(null);
    }
  };

  const handleStageDragStart = (e: React.DragEvent, stageId: string) => {
    setDraggedStageId(stageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStageDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleStageDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (!draggedStageId || draggedStageId === targetStageId) {
      setDraggedStageId(null);
      setDragOverStageId(null);
      return;
    }
    const draggedIdx = stages.findIndex(s => s.id === draggedStageId);
    const targetIdx = stages.findIndex(s => s.id === targetStageId);
    const newStages = [...stages];
    const [removed] = newStages.splice(draggedIdx, 1);
    newStages.splice(targetIdx, 0, removed);
    const reordered = newStages.map((s, i) => ({ ...s, position: i }));
    setStages(reordered);
    setDraggedStageId(null);
    setDragOverStageId(null);
    // Persistir nova ordem
    try {
      await fetch('/api/kanban-boards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reorder_stages', stages: reordered.map(s => ({ id: s.id, position: s.position })) }),
      });
    } catch (err) {
      console.error('Erro ao reordenar etapas:', err);
    }
  };

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
    setNegotiationNoteText('');
    setAiAdvice(null);
    setIsEditingValue(false);
    setEditValueText(String(lead.value || 0));
    // Inicializar produtos: usar suggested_products se existir, senao usar os da IA
    const aiProducts = lead.answers?._ai_analysis?.recommended_products || [];
    setEditProducts(lead.suggested_products || aiProducts.map((p: any) => ({ name: p.name, value: p.value || 0 })));
    setDetailSection(null);
    setResendEmailResult(null);
    setResendCustomEmail('');
    setSignatureEmailResult(null);
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

  // Salvar anotação de negociação
  const handleAddNegotiationNote = async () => {
    if (!selectedLead || !negotiationNoteText.trim()) return;
    setIsSavingNegotiationNote(true);
    try {
      const timestamp = new Date().toLocaleString('pt-BR');
      const noteEntry = `[${timestamp}] ${negotiationNoteText.trim()}`;
      const updatedNotes = selectedLead.negotiation_notes
        ? `${selectedLead.negotiation_notes}\n\n${noteEntry}`
        : noteEntry;
      if (supabase) {
        const { error } = await supabase.from('leads').update({ negotiation_notes: updatedNotes }).eq('id', selectedLead.id);
        if (error) throw error;
      }
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, negotiation_notes: updatedNotes } : l));
      setSelectedLead(prev => prev ? { ...prev, negotiation_notes: updatedNotes } : null);
      setNegotiationNoteText('');
    } catch (e) {
      console.error('Erro ao salvar anotação de negociação', e);
      alert('Erro ao salvar anotação.');
    } finally {
      setIsSavingNegotiationNote(false);
    }
  };

  // Salvar produtos sugeridos e valor
  const handleSaveProductsAndValue = async () => {
    if (!selectedLead) return;
    setIsSavingProducts(true);
    try {
      const newValue = parseFloat(editValueText.replace(',', '.')) || 0;
      const totalFromProducts = editProducts.reduce((sum, p) => sum + (p.value || 0), 0);
      const finalValue = editProducts.length > 0 ? totalFromProducts : newValue;
      if (supabase) {
        const { error } = await supabase.from('leads').update({
          value: finalValue,
          suggested_products: editProducts.length > 0 ? editProducts : null
        }).eq('id', selectedLead.id);
        if (error) throw error;
      }
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? ({ ...l, value: finalValue, suggested_products: editProducts.length > 0 ? editProducts : undefined }) as Lead : l));
      setSelectedLead(prev => prev ? ({ ...prev, value: finalValue, suggested_products: editProducts.length > 0 ? editProducts : undefined }) as Lead : null);
      setIsEditingValue(false);
    } catch (e) {
      console.error('Erro ao salvar produtos/valor', e);
      alert('Erro ao salvar.');
    } finally {
      setIsSavingProducts(false);
    }
  };

  // Reenvio de e-mail de análise da IA
  const handleSendSignatureEmail = async () => {
    if (!selectedLead || !tenantId) return;
    setIsSendingSignatureEmail(true);
    setSignatureEmailResult(null);
    try {
      const res = await fetch('/api/health/send-signature-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLead.id, tenantId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSignatureEmailResult({ ok: false, message: data.error || 'Erro ao enviar email.' });
      } else {
        setSignatureEmailResult({ ok: true, message: `Comprovante enviado para: ${data.sentTo}` });
      }
    } catch (e: any) {
      setSignatureEmailResult({ ok: false, message: e.message || 'Erro inesperado.' });
    } finally {
      setIsSendingSignatureEmail(false);
    }
  };

  const handleResendAnalysisEmail = async (customEmail?: string) => {
    if (!selectedLead) return;
    setIsResendingEmail(true);
    setResendEmailResult(null);
    try {
      const customRecipients = customEmail?.trim()
        ? customEmail.split(',').map(e => e.trim()).filter(Boolean)
        : [];
      const res = await fetch('/api/admin/resend-analysis-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLead.id, customRecipients }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.noRecipients) {
          setResendEmailResult({ ok: false, message: 'Nenhum destinatário configurado no formulário. Informe um e-mail abaixo.' });
        } else {
          setResendEmailResult({ ok: false, message: data.error || 'Erro ao enviar e-mail.' });
        }
      } else {
        setResendEmailResult({ ok: true, message: `E-mail enviado para: ${data.recipients.join(', ')}` });
        setResendCustomEmail('');
      }
    } catch (e: any) {
      setResendEmailResult({ ok: false, message: e.message || 'Erro inesperado.' });
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    const leadToDelete = leads.find(l => l.id === leadId);
    if (!leadToDelete) return;
    
    const confirmMessage = `Tem certeza que deseja excluir a oportunidade de "${leadToDelete.name}"?\n\nEsta ação não pode ser desfeita.`;
    if (!window.confirm(confirmMessage)) return;
    
    setIsDeleting(true);
    try {
      // Soft delete: marcar lead como deletado
      if (supabase) {
        const { error } = await supabase
          .from('leads')
          .update({ deleted_at: new Date().toISOString() })
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
      const firstName = (selectedLead.name || '').split(' ')[0];
        
        // Include notes in context
        const notesContext = selectedLead.notes ? `\n\nOBSERVACOES INTERNAS DA EQUIPE (use para contexto, NAO mencione ao cliente):\n${selectedLead.notes}` : '';
        
        // Extract Form Answers
        let formAnswersContext = '';
        if (selectedLead.answers) {
            formAnswersContext = '\nRESPOSTAS DO FORMULARIO (ANALISE CADA UMA COM ATENCAO - revelam necessidades reais):\n';
            Object.entries(selectedLead.answers).forEach(([qId, data]: [string, any]) => {
                if (qId.startsWith('_')) return; // Skip internal fields
                const question = getQuestionText(selectedLead, qId);
                const answer = (typeof data === 'object' && data !== null) 
                    ? (data.value || JSON.stringify(data)) 
                    : data;
                formAnswersContext += `- ${question}: ${answer}\n`;
            });
        }

        // Carregar contexto da empresa
        let businessContext = '';
        let productsContext = '';
        if (supabase && tenantId) {
          try {
            const [profileRes, productsRes, companyRes] = await Promise.all([
              supabase.from('business_profile').select('business_type, business_description, target_audience, differentials, brand_tone').eq('tenant_id', tenantId).single(),
              supabase.from('products').select('name, price, description').eq('tenant_id', tenantId).limit(10),
              supabase.from('companies').select('name').eq('id', tenantId).single(),
            ]);
            if (companyRes.data?.name || profileRes.data) {
              const bp = profileRes.data || {} as any;
              businessContext = `\nSOBRE A EMPRESA QUE ENVIA A MENSAGEM:\n- Nome: ${companyRes.data?.name || 'Nao informado'}\n- Tipo: ${bp.business_type || 'Nao informado'}\n- Descricao: ${bp.business_description || 'Nao informado'}\n- Publico-alvo: ${bp.target_audience || 'Nao informado'}\n- Diferenciais: ${bp.differentials || 'Nao informado'}\n- Tom da marca: ${bp.brand_tone || 'profissional e amigavel'}`;
            }
            if (productsRes.data && productsRes.data.length > 0) {
              productsContext = `\nPRODUTOS/SERVICOS DISPONIVEIS (mencione o mais relevante se fizer sentido):\n${productsRes.data.map((p: any) => `- ${p.name}${p.price ? ` (R$ ${p.price})` : ''}${p.description ? `: ${p.description}` : ''}`).join('\n')}`;
            }
          } catch (e) { /* silently continue */ }
        }

        // AI analysis context
        const aiAnalysis = selectedLead.answers?._ai_analysis;
        let aiContext = '';
        if (aiAnalysis) {
          aiContext = `\nANALISE PREVIA DA IA SOBRE ESTE LEAD:\n- Classificacao: ${aiAnalysis.classification || 'N/A'}\n- Produto recomendado: ${aiAnalysis.suggested_product || 'N/A'}\n- Raciocinio: ${aiAnalysis.reasoning || 'N/A'}`;
        }

        const prompt = `Voce e um especialista em vendas consultivas e copywriting para WhatsApp. Sua missao e escrever UMA mensagem de abordagem que gere resposta.

REGRAS FUNDAMENTAIS:
1. A mensagem DEVE parecer escrita por um HUMANO REAL, nunca por IA
2. ANALISE as respostas do formulario e identifique a NECESSIDADE PRINCIPAL do lead
3. Mencione algo ESPECIFICO das respostas (mostra que leu e se importa)
4. Adapte o tom ao tipo de negocio da empresa
5. NAO use emojis (problemas de encoding no wa.me)
6. MAXIMO 3-4 frases curtas
7. Termine com UMA pergunta facil de responder (sim/nao ou horario)
8. Retorne APENAS o texto da mensagem, sem aspas, sem explicacoes
${businessContext}
${productsContext}

DADOS DO LEAD:
- Nome: ${selectedLead.name} (primeiro nome: ${firstName})
- Origem: ${selectedLead.formSource || 'Formulario online'}
- Valor estimado: R$ ${selectedLead.value || 0}
- Status no funil: ${selectedLead.status || 'Novo'}
${formAnswersContext}${notesContext}${aiContext}

EXEMPLO DE MENSAGEM BOA (clinica odontologica, lead quer clareamento):
"Ola Camila, tudo bem? Vi que voce tem interesse em clareamento e mencionou sensibilidade nos dentes. A gente tem tecnicas especificas pra quem tem essa questao. Posso te explicar como funciona em uma conversa rapida?"

EXEMPLO DE MENSAGEM RUIM:
"Ola Camila! Obrigado pelo interesse em nossos servicos. Temos diversas opcoes de tratamento. Quando podemos agendar uma consulta?"

Agora escreva a mensagem para ${firstName}:`;
        
        const text = await callGeminiAPI(prompt);
        setAiAdvice(text || "Sem sugestao gerada.");
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
                url += `?text=${encodeWhatsAppMessage(aiAdvice)}`;
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
          {/* Barra de busca rápida por nome */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.name}
              onChange={(e) => setFilters({...filters, name: e.target.value})}
              placeholder="Buscar cliente..."
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-primary-500 focus:border-primary-500 w-48"
            />
            {filters.name && (
              <button onClick={() => setFilters({...filters, name: ''})} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
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

          {/* Botão Gerenciar Etapas */}
          <button
            onClick={() => { setShowStagesModal(true); setStageError(null); }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings size={18} /> Etapas
          </button>

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

      {/* Modal de Gerenciamento de Etapas */}
      {showStagesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Settings size={20} className="text-primary-500" /> Gerenciar Etapas</h3>
              <button onClick={() => { setShowStagesModal(false); setEditingStageId(null); setStageError(null); }} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
            </div>
            <div className="p-6">
              {stageError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertTriangle size={16} /> {stageError}
                </div>
              )}
              <p className="text-xs text-gray-500 mb-4 flex items-center gap-1"><GripVertical size={14} /> Arraste para reordenar</p>
              <div className="space-y-2 mb-6">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={(e) => handleStageDragStart(e, stage.id)}
                    onDragOver={(e) => handleStageDragOver(e, stage.id)}
                    onDrop={(e) => handleStageDrop(e, stage.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      dragOverStageId === stage.id && draggedStageId !== stage.id
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-gray-200 bg-gray-50 hover:bg-white'
                    }`}
                  >
                    <GripVertical size={16} className="text-gray-400 cursor-grab flex-shrink-0" />
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                    {editingStageId === stage.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={editingStageName}
                          onChange={(e) => setEditingStageName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameStage(stage.id, editingStageName);
                            if (e.key === 'Escape') setEditingStageId(null);
                          }}
                          className="flex-1 text-sm border border-primary-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleRenameStage(stage.id, editingStageName)}
                          disabled={isSavingStage}
                          className="text-green-600 hover:text-green-700 p-1"
                        >
                          {isSavingStage ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        </button>
                        <button onClick={() => setEditingStageId(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={16} /></button>
                      </div>
                    ) : (
                      <span className="flex-1 text-sm font-medium text-gray-800">{stage.name}</span>
                    )}
                    {editingStageId !== stage.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingStageId(stage.id); setEditingStageName(stage.name); setStageError(null); }}
                          className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors"
                          title="Renomear"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          disabled={deletingStageId === stage.id || stages.length <= 1}
                          className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors disabled:opacity-30"
                          title="Excluir"
                        >
                          {deletingStageId === stage.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Criar nova etapa */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Nova Etapa</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateStage()}
                    placeholder="Nome da etapa..."
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                  <button
                    onClick={handleCreateStage}
                    disabled={isSavingStage || !newStageName.trim() || !boardId}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-1 text-sm font-medium"
                  >
                    {isSavingStage ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Criar
                  </button>
                </div>
                {!boardId && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle size={12} /> Carregando configurações do quadro...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
            {stages.map((stage) => {
            const col = stage.name;
            const columnLeads = filteredLeads.filter((l) => l.status === col);
            const columnTotal = columnLeads.reduce((acc, l) => acc + l.value, 0);
            const colStyle = getColumnStyle(stage.color);
            
            return (
              <div 
                key={stage.id} 
                className="w-80 flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
              >
                <div className="mb-4">
                  <div
                    className="flex justify-between items-center px-3 py-2 rounded-lg mb-1 border"
                    style={colStyle}
                  >
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <span>{stage.emoji}</span>
                        {col} 
                        <span className="bg-white/40 text-xs px-2 py-0.5 rounded-full">{columnLeads.length}</span>
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
                  onClick={async () => {
                    if (!selectedLead?.phone) {
                      alert('Lead não tem telefone cadastrado');
                      return;
                    }
                    try {
                      const res = await fetch('/api/triggers/presale-action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tenantId, leadId: selectedLead.id }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        alert('IA Comercial acionada! Acompanhe na Fila de Ações.');
                      } else {
                        alert(data.error || 'Erro ao acionar IA');
                      }
                    } catch (e) {
                      alert('Erro de conexão');
                    }
                  }}
                  className="px-3 py-1.5 text-xs border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 flex items-center gap-1"
                  title="Iniciar IA Comercial para este lead"
                >
                  <Bot size={14} />
                  IA Comercial
                </button>
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
                
                {/* Valor e Procedimentos — Editável */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-amber-700 font-semibold uppercase">Valor da Negociação</span>
                    <button
                      onClick={() => setIsEditingValue(v => !v)}
                      className="text-amber-600 hover:text-amber-800 p-0.5 rounded"
                      title="Editar valor e produtos"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>

                  {!isEditingValue ? (
                    <>
                      <div className="text-lg font-bold text-green-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.value)}
                      </div>
                      {/* Mostrar produtos: editados ou da IA */}
                      {(selectedLead.suggested_products || selectedLead.answers?._ai_analysis?.recommended_products) && (
                        <div className="mt-2 pt-2 border-t border-amber-200">
                          <span className="text-xs text-amber-700 font-semibold">Procedimentos:</span>
                          <div className="mt-1 space-y-1">
                            {(selectedLead.suggested_products || selectedLead.answers?._ai_analysis?.recommended_products || []).map((p: any, i: number) => (                             <div key={i} className="text-xs text-gray-700 flex justify-between">
                                <span>{p.name}</span>
                                <span className="font-medium text-green-700">R$ {(p.value || 0).toLocaleString('pt-BR')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2 mt-1">
                      {/* Lista de produtos editáveis */}
                      <div className="space-y-1">
                        {editProducts.map((p, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <input
                              className="flex-1 text-xs border border-amber-300 rounded px-2 py-1 bg-white"
                              value={p.name}
                              onChange={e => setEditProducts(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                              placeholder="Nome do produto"
                            />
                            <input
                              className="w-20 text-xs border border-amber-300 rounded px-2 py-1 bg-white text-right"
                              type="number"
                              value={p.value}
                              onChange={e => setEditProducts(prev => prev.map((x, j) => j === i ? { ...x, value: parseFloat(e.target.value) || 0 } : x))}
                              placeholder="Valor"
                            />
                            <button onClick={() => setEditProducts(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                              <MinusCircle size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Seletor de produtos do catálogo */}
                      <div className="relative">
                        <button
                          onClick={() => { setShowProductPicker(v => !v); setProductPickerSearch(''); }}
                          className="text-xs text-amber-700 flex items-center gap-1 hover:text-amber-900"
                        >
                          <PlusCircle size={13} /> Adicionar produto
                        </button>
                        {showProductPicker && (
                          <div className="absolute left-0 top-6 z-50 w-72 bg-white border border-amber-200 rounded-lg shadow-lg">
                            <div className="p-2 border-b border-amber-100">
                              <input
                                autoFocus
                                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                placeholder="Buscar produto..."
                                value={productPickerSearch}
                                onChange={e => setProductPickerSearch(e.target.value)}
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {catalogProducts
                                .filter(p => p.name.toLowerCase().includes(productPickerSearch.toLowerCase()))
                                .map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      setEditProducts(prev => [...prev, { name: p.name, value: p.value }]);
                                      setShowProductPicker(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                                  >
                                    <span className="font-medium text-gray-800">{p.name}</span>
                                    <span className="text-green-700 font-semibold ml-2 flex-shrink-0">R$ {p.value.toLocaleString('pt-BR')}</span>
                                  </button>
                                ))
                              }
                              {catalogProducts.filter(p => p.name.toLowerCase().includes(productPickerSearch.toLowerCase())).length === 0 && (
                                <div className="px-3 py-3 text-xs text-gray-400 text-center">Nenhum produto encontrado</div>
                              )}
                              {/* Opção de adicionar manualmente */}
                              <button
                                onClick={() => {
                                  setEditProducts(prev => [...prev, { name: productPickerSearch || '', value: 0 }]);
                                  setShowProductPicker(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-1 border-t border-amber-100"
                              >
                                <PlusCircle size={12} /> Adicionar manualmente
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Valor manual (quando sem produtos) */}
                      {editProducts.length === 0 && (
                        <div>
                          <span className="text-xs text-amber-700">Valor total (R$):</span>
                          <input
                            className="w-full text-sm border border-amber-300 rounded px-2 py-1 bg-white mt-1"
                            type="number"
                            value={editValueText}
                            onChange={e => setEditValueText(e.target.value)}
                          />
                        </div>
                      )}
                      {editProducts.length > 0 && (
                        <div className="text-xs text-green-700 font-semibold">
                          Total: R$ {editProducts.reduce((s, p) => s + (p.value || 0), 0).toLocaleString('pt-BR')}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveProductsAndValue}
                          disabled={isSavingProducts}
                          className="flex-1 text-xs bg-amber-600 text-white rounded px-2 py-1.5 hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {isSavingProducts ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Salvar
                        </button>
                        <button
                          onClick={() => setIsEditingValue(false)}
                          className="text-xs border border-gray-300 text-gray-600 rounded px-2 py-1.5 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
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

                {/* Anotações de Negociação - Botão seletor */}
                <button
                  onClick={() => setDetailSection(prev => prev === 'negotiation' ? null : 'negotiation')}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    detailSection === 'negotiation'
                      ? 'border-green-300 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <StickyNote size={16} className={detailSection === 'negotiation' ? 'text-green-600' : 'text-gray-400'} />
                    <span className="text-xs font-bold uppercase">Anotações da Negociação</span>
                    {selectedLead.negotiation_notes && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                        {selectedLead.negotiation_notes.split('\n\n').filter(Boolean).length}
                      </span>
                    )}
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </button>

                {/* Assinatura Eletrônica - Botão seletor */}
                {forms?.some(f => (f as any).signature_enabled && f.id === selectedLead.form_id) && (
                  <button
                    onClick={() => setDetailSection(prev => prev === 'signature' ? null : 'signature')}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      detailSection === 'signature'
                        ? 'border-violet-300 bg-violet-50 text-violet-700'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className={detailSection === 'signature' ? 'text-violet-600' : 'text-gray-400'} />
                      <span className="text-xs font-bold uppercase">Assinatura Eletrônica</span>
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

                    {/* Bloco de reenvio de e-mail */}
                    <div className="mt-6 border-t border-gray-200 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Mail size={15} className="text-blue-500" />
                        <span className="text-sm font-semibold text-gray-700">Reenviar análise por e-mail</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Envia o e-mail com a análise da IA para os destinatários configurados no formulário, ou informe um e-mail alternativo.
                      </p>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={resendCustomEmail}
                          onChange={e => setResendCustomEmail(e.target.value)}
                          placeholder="E-mail alternativo (opcional)"
                          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                          onClick={() => handleResendAnalysisEmail(resendCustomEmail || undefined)}
                          disabled={isResendingEmail}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          {isResendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          {isResendingEmail ? 'Enviando...' : 'Enviar'}
                        </button>
                      </div>
                      {resendEmailResult && (
                        <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 mt-1 ${
                          resendEmailResult.ok
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {resendEmailResult.ok
                            ? <Check size={13} className="mt-0.5 flex-shrink-0" />
                            : <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />}
                          <span>{resendEmailResult.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Conteúdo: Anotações de Negociação */}
                {detailSection === 'negotiation' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4">
                      <StickyNote size={18} className="text-green-600" />
                      <h3 className="font-bold text-gray-900">Anotações da Negociação</h3>
                    </div>

                    {/* Histórico de anotações */}
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                      {selectedLead.negotiation_notes ? (
                        selectedLead.negotiation_notes.split('\n\n').filter(Boolean).map((note, i) => {
                          const match = note.match(/^\[(.+?)\] (.+)$/s);
                          const timestamp = match ? match[1] : '';
                          const text = match ? match[2] : note;
                          return (
                            <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
                              {timestamp && (
                                <p className="text-[10px] text-gray-400 font-medium mb-1">{timestamp}</p>
                              )}
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{text}</p>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          <StickyNote size={32} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Nenhuma anotação ainda</p>
                          <p className="text-xs mt-1">Registre atualizações da negociação abaixo</p>
                        </div>
                      )}
                    </div>

                    {/* Campo para nova anotação */}
                    <div className="border-t border-gray-200 pt-3">
                      <textarea
                        value={negotiationNoteText}
                        onChange={e => setNegotiationNoteText(e.target.value)}
                        placeholder="Ex: Cliente pediu desconto de 10%, retornar na sexta..."
                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                        rows={3}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNegotiationNote(); }}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-400">Ctrl+Enter para salvar</span>
                        <button
                          onClick={handleAddNegotiationNote}
                          disabled={isSavingNegotiationNote || !negotiationNoteText.trim()}
                          className="px-4 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {isSavingNegotiationNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conteúdo: Assinatura Eletrônica */}
                {detailSection === 'signature' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <ShieldCheck size={18} className="text-violet-600" />
                      <h3 className="font-bold text-gray-900">Assinatura Eletrônica</h3>
                    </div>
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                      <p className="text-xs text-violet-700 leading-relaxed">
                        <strong>Comprovante de assinatura eletrônica simples</strong> — válida pela Lei 14.063/2020.
                        O comprovante inclui a imagem da assinatura, nome, email, IP e data/hora do envio.
                      </p>
                    </div>
                    {selectedLead.email ? (
                      <div className="space-y-3">
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <p className="text-xs text-gray-500">Email do paciente</p>
                          <p className="text-sm font-medium text-gray-800">{selectedLead.email}</p>
                        </div>
                        <button
                          onClick={handleSendSignatureEmail}
                          disabled={isSendingSignatureEmail}
                          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
                        >
                          {isSendingSignatureEmail ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
                          {isSendingSignatureEmail ? 'Enviando...' : 'Enviar Comprovante por Email'}
                        </button>
                        {signatureEmailResult && (
                          <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                            signatureEmailResult.ok
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {signatureEmailResult.ok
                              ? <Check size={13} className="mt-0.5 flex-shrink-0" />
                              : <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />}
                            <span>{signatureEmailResult.message}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-6">
                        <Mail size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Este lead não possui email cadastrado</p>
                        <p className="text-xs mt-1">O email é necessário para enviar o comprovante</p>
                      </div>
                    )}
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
