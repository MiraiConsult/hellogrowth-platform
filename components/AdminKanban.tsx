import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, X, GripVertical, ChevronDown,
  ChevronUp, Pencil, Check, AlertCircle, Loader2, Search,
  Kanban, SlidersHorizontal, LayoutDashboard,
  Phone, MessageCircle, Video, Mail, Calendar, Clock,
  ArrowRightCircle, Bell, HeartHandshake, ChevronRight,
  Building2, User, Activity, Copy, ExternalLink,
  LayoutList, LayoutGrid, AlarmClock, MapPin, Users2, Stethoscope, Users, Send,
} from 'lucide-react';

interface Board {
  id: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  is_default: boolean;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  emoji: string;
  position: number;
  responsible: string;
  description: string;
  board_id?: string;
}

interface Card {
  id: string;
  stage_id: string;
  board_id?: string;
  user_id?: string;
  client_name: string;
  company_name?: string;
  client_email?: string;
  client_phone?: string;
  cs_name?: string;
  sdr_name?: string;
  notes?: string;
  position: number;
  next_contact_date?: string;
  contact_frequency?: string;
  health_status?: string;
  fup_date?: string | null;
  created_at: string;
  updated_at: string;
}

interface CSContact {
  id: string;
  card_id: string;
  contact_date: string;
  contact_type: string;
  responsible?: string;
  notes?: string;
  next_contact_date?: string;
  created_at: string;
}

interface Colaborador {
  id: string;
  name: string;
  role: string;
  phone?: string;
}

interface AdminKanbanProps {
  isDark: boolean;
}

// ── STATUS DE ENGAJAMENTO ──────────────────────────────────────────────────────────────────────────────────
const ENGAGEMENT_STATUS = [
  { value: 'sem_resposta', label: 'Sem resposta', color: 'bg-red-500',    dot: 'bg-red-500',    badge: 'bg-red-500/15 text-red-500 border-red-500/30' },
  { value: 'lento',        label: 'Lento',        color: 'bg-amber-500',  dot: 'bg-amber-500',  badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  { value: 'no_ritmo',     label: 'No ritmo',     color: 'bg-blue-500',   dot: 'bg-blue-500',   badge: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  { value: 'engajado',     label: 'Engajado',     color: 'bg-emerald-500',dot: 'bg-emerald-500',badge: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
] as const;

type EngagementValue = typeof ENGAGEMENT_STATUS[number]['value'] | '';

const getEngagement = (val?: string) => ENGAGEMENT_STATUS.find(e => e.value === val) ?? null;

const RESPONSIBLE_LABELS: Record<string, string> = {
  nos: 'Nós fazemos',
  cliente: 'Cliente faz',
};

const RESPONSIBLE_COLORS: Record<string, string> = {
  nos: 'bg-blue-100 text-blue-700',
  cliente: 'bg-amber-100 text-amber-700',
};

export default function AdminKanban({ isDark }: AdminKanbanProps) {
  const t = {
    bg: isDark ? 'bg-gray-950' : 'bg-slate-50',
    surface: isDark ? 'bg-gray-900' : 'bg-white',
    surfaceHover: isDark ? 'hover:bg-gray-800' : 'hover:bg-slate-50',
    border: isDark ? 'border-gray-800' : 'border-slate-200',
    text: isDark ? 'text-white' : 'text-slate-900',
    textSub: isDark ? 'text-gray-400' : 'text-slate-500',
    textMuted: isDark ? 'text-gray-500' : 'text-slate-400',
    input: isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400',
    colBg: isDark ? 'bg-gray-900/60' : 'bg-slate-100/80',
    cardBg: isDark ? 'bg-gray-800' : 'bg-white',
    cardHover: isDark ? 'hover:bg-gray-750' : 'hover:bg-slate-50',
    divider: isDark ? 'divide-gray-800' : 'divide-slate-100',
    thead: isDark ? 'text-gray-400' : 'text-slate-500',
  };

  const [boards, setBoards] = useState<Board[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'board' | 'settings' | 'boards'>('board');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  // Drag state for cards
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [dragOverCard, setDragOverCard] = useState<string | null>(null);

  // Drag state for stages (reorder)
  const [draggingStage, setDraggingStage] = useState<Stage | null>(null);
  const [dragOverStageItem, setDragOverStageItem] = useState<string | null>(null);

  // Add card modal
  const [addCardStage, setAddCardStage] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState({ client_name: '', company_name: '', client_email: '', cs_name: '', sdr_name: '', notes: '' });
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [savingCard, setSavingCard] = useState(false);

  // Stage settings
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [stageForm, setStageForm] = useState({ name: '', color: '#6366f1', emoji: '📋', responsible: 'nos', description: '' });
  const [savingStage, setSavingStage] = useState(false);
  const [showAddStage, setShowAddStage] = useState(false);

  // Delete stage with move
  const [deletingStage, setDeletingStage] = useState<Stage | null>(null);
  const [moveCardsTo, setMoveCardsTo] = useState<string>('');

  // Board management
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [boardForm, setBoardForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [savingBoard, setSavingBoard] = useState(false);

  // CS Acompanhamento
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardContacts, setCardContacts] = useState<CSContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactForm, setContactForm] = useState({
    contact_date: new Date().toISOString().split('T')[0],
    contact_type: 'whatsapp',
    responsible: '',
    notes: '',
    next_contact_date: '',
  });
  const [savingContact, setSavingContact] = useState(false);
  const [cardTab, setCardTab] = useState<'info' | 'cs'>('info');

  // Move to another board
  const [movingCard, setMovingCard] = useState<Card | null>(null);
  const [moveTargetBoardId, setMoveTargetBoardId] = useState('');
  const [moveTargetStageId, setMoveTargetStageId] = useState('');
  const [moveTargetStages, setMoveTargetStages] = useState<Stage[]>([]);
  const [loadingMoveStages, setLoadingMoveStages] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState<{ overdue: Card[]; dueToday: Card[] }>({ overdue: [], dueToday: [] });
  const [showAlerts, setShowAlerts] = useState(false);

  // Card Detail / CS Modal (unified)
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [detailContacts, setDetailContacts] = useState<CSContact[]>([]);
  const [detailTab, setDetailTab] = useState<'cs' | 'info'>('cs');
  const [csConfig, setCsConfig] = useState({ next_contact_date: '', contact_frequency: 'weekly' });
  const [savingCs, setSavingCs] = useState(false);

  // Colaboradores
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  // Info form (aba Informações do modal CS)
  const [infoForm, setInfoForm] = useState({ cs_name: '', sdr_name: '', client_phone: '', notes: '', health_status: '' as EngagementValue, fup_date: '' });
  const [savingInfo, setSavingInfo] = useState(false);

  // Client search for add card
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);

  // ── FILTROS ──────────────────────────────────────────────────────────────────
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterCS, setFilterCS] = useState('');
  const [filterSDR, setFilterSDR] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── VIEW MODE ─────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [fupFilter, setFupFilter] = useState<'all' | 'overdue' | 'today' | 'week' | 'month'>('all');
  const [listSortCol, setListSortCol] = useState<'client' | 'stage' | 'cs' | 'health' | 'fup' | 'next_contact' | null>(null);
  const [listSortDir, setListSortDir] = useState<'asc' | 'desc'>('asc');
  // Unassigned clients (sem card no kanban)
  const [unassignedUsers, setUnassignedUsers] = useState<any[]>([]);
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [assigningUser, setAssigningUser] = useState<any | null>(null);
  const [assignStageId, setAssignStageId] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  const activeFilterCount = [filterStage, filterCS, filterSDR, filterPlan].filter(Boolean).length;

  const filteredCards = (stageId: string) => {
    return cards
      .filter(c => c.stage_id === stageId)
      .filter(c => {
        if (filterSearch) {
          const q = filterSearch.toLowerCase();
          const matchName = (c.company_name || c.client_name || '').toLowerCase().includes(q);
          const matchEmail = (c.client_email || '').toLowerCase().includes(q);
          if (!matchName && !matchEmail) return false;
        }
        if (filterStage && c.stage_id !== filterStage) return false;
        if (filterCS && (c.cs_name || '').toLowerCase() !== filterCS.toLowerCase()) return false;
        if (filterSDR && (c.sdr_name || '').toLowerCase() !== filterSDR.toLowerCase()) return false;
        return true;
      })
      .sort((a, b) => a.position - b.position);
  };

  const clearFilters = () => {
    setFilterSearch('');
    setFilterStage('');
    setFilterCS('');
    setFilterSDR('');
    setFilterPlan('');
  };

  // Derivar listas únicas de CS e SDR dos cards carregados
  const uniqueCSNames = Array.from(new Set(cards.map(c => c.cs_name).filter(Boolean))) as string[];
  const uniqueSDRNames = Array.from(new Set(cards.map(c => c.sdr_name).filter(Boolean))) as string[];

  // Dados reais do cliente (buscados ao abrir o modal)
  const [clientData, setClientData] = useState<any>(null);
  const [loadingClientData, setLoadingClientData] = useState(false);
  const [clientExtraContacts, setClientExtraContacts] = useState<any[]>([]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async (boardId?: string) => {
    setLoading(true);
    try {
      const url = boardId
        ? `/api/admin/kanban?action=all&board_id=${boardId}`
        : '/api/admin/kanban?action=all';
      const res = await fetch(url);
      const data = await res.json();
      if (data.boards) setBoards(data.boards);
      setStages(data.stages || []);
      setCards(data.cards || []);
      // Set active board to first board if not set
      if (!boardId && data.boards && data.boards.length > 0) {
        const defaultBoard = data.boards.find((b: Board) => b.is_default) || data.boards[0];
        setActiveBoardId(defaultBoard.id);
        // Re-fetch with board_id
        const res2 = await fetch(`/api/admin/kanban?action=all&board_id=${defaultBoard.id}`);
        const data2 = await res2.json();
        setStages(data2.stages || []);
        setCards(data2.cards || []);
      }
    } catch {
      showToast('error', 'Erro ao carregar Kanban');
    } finally {
      setLoading(false);
    }
  }, []);

   useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch unassigned users (clientes sem card no kanban)
  const fetchUnassigned = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/kanban?action=unassigned');
      const data = await res.json();
      setUnassignedUsers(data.users || []);
    } catch { /* silencioso */ }
  }, []);
  useEffect(() => { fetchUnassigned(); }, [fetchUnassigned]);

  // Refetch unassigned quando cards mudam (alguém foi adicionado)
  useEffect(() => { fetchUnassigned(); }, [cards.length, fetchUnassigned]);

  // Fetch colaboradores once on mount
  useEffect(() => {
    const fetchColaboradores = async () => {
      try {
        const res = await fetch('/api/admin/kanban?action=colaboradores');
        const data = await res.json();
        setColaboradores(data.data || []);
      } catch { /* silent */ }
    };
    fetchColaboradores();
  }, []);

  // Calculate alerts whenever cards change
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = cards.filter(c => {
      if (!c.next_contact_date) return false;
      const d = new Date(c.next_contact_date + 'T00:00:00');
      return d < today;
    });
    const dueToday = cards.filter(c => {
      if (!c.next_contact_date) return false;
      const d = new Date(c.next_contact_date + 'T00:00:00');
      return d.getTime() === today.getTime();
    });
    setAlerts({ overdue, dueToday });
  }, [cards]);

  const switchBoard = async (boardId: string) => {
    setActiveBoardId(boardId);
    setFilterStage(''); // Limpar filtro de etapa ao trocar de board
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/kanban?action=all&board_id=${boardId}`);
      const data = await res.json();
      setStages(data.stages || []);
      setCards(data.cards || []);
    } catch {
      showToast('error', 'Erro ao carregar fluxo');
    } finally {
      setLoading(false);
    }
  };

  // Search clients from admin API
  const searchClients = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setClientSuggestions([]); return; }
    setSearchingClients(true);
    try {
      const res = await fetch(`/api/admin/clients?search=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setClientSuggestions(data.users || []);
    } catch { setClientSuggestions([]); }
    finally { setSearchingClients(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchClients(clientSearch), 300);
    return () => clearTimeout(timer);
  }, [clientSearch, searchClients]);

  // ── DRAG & DROP CARDS ─────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, card: Card) => {
    setDraggingCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string, cardId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
    if (cardId) setDragOverCard(cardId);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string, targetCardId?: string) => {
    e.preventDefault();
    if (!draggingCard) return;
    setDragOverStage(null);
    setDragOverCard(null);

    const stageCards = cards.filter(c => c.stage_id === targetStageId && c.id !== draggingCard.id);
    let newPosition = stageCards.length;

    if (targetCardId) {
      const targetIdx = stageCards.findIndex(c => c.id === targetCardId);
      newPosition = targetIdx >= 0 ? targetIdx : stageCards.length;
    }

    const updatedCards = cards.map(c => {
      if (c.id === draggingCard.id) return { ...c, stage_id: targetStageId, position: newPosition };
      return c;
    });
    setCards(updatedCards);
    setDraggingCard(null);

    try {
      await fetch('/api/admin/kanban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'card', id: draggingCard.id, stage_id: targetStageId, position: newPosition }),
      });
    } catch { showToast('error', 'Erro ao mover card'); }
  };

  const handleDragEnd = () => {
    setDraggingCard(null);
    setDragOverStage(null);
    setDragOverCard(null);
  };

  // ── DRAG & DROP STAGES (reorder) ──────────────────────────────────────────────
  const handleStageDragStart = (e: React.DragEvent, stage: Stage) => {
    e.stopPropagation();
    setDraggingStage(stage);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleStageDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverStageItem(stageId);
  };

  const handleStageDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingStage || draggingStage.id === targetStageId) {
      setDraggingStage(null);
      setDragOverStageItem(null);
      return;
    }

    const currentStages = [...stages];
    const fromIdx = currentStages.findIndex(s => s.id === draggingStage.id);
    const toIdx = currentStages.findIndex(s => s.id === targetStageId);

    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...currentStages];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const withPositions = reordered.map((s, i) => ({ ...s, position: i }));
    setStages(withPositions);
    setDraggingStage(null);
    setDragOverStageItem(null);

    try {
      await fetch('/api/admin/kanban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'reorder_stages',
          stages: withPositions.map(s => ({ id: s.id, position: s.position })),
        }),
      });
      showToast('success', 'Ordem das etapas salva!');
    } catch { showToast('error', 'Erro ao reordenar etapas'); fetchData(activeBoardId || undefined); }
  };

  const handleStageDragEnd = () => {
    setDraggingStage(null);
    setDragOverStageItem(null);
  };

  // ── CARDS CRUD ───────────────────────────────────────────────────────────────
  const openAddCard = (stageId: string) => {
    setAddCardStage(stageId);
    setEditingCard(null);
    setCardForm({ client_name: '', company_name: '', client_email: '', cs_name: '', sdr_name: '', notes: '' });
    setClientSearch('');
    setClientSuggestions([]);
  };

  const openEditCard = (card: Card) => {
    setEditingCard(card);
    setAddCardStage(card.stage_id);
    setCardForm({
      client_name: card.client_name,
      company_name: card.company_name || '',
      client_email: card.client_email || '',
      cs_name: card.cs_name || '',
      sdr_name: card.sdr_name || '',
      notes: card.notes || '',
    });
  };

  const saveCard = async () => {
    if (!cardForm.client_name.trim()) { showToast('error', 'Nome do cliente é obrigatório'); return; }
    setSavingCard(true);
    try {
      if (editingCard) {
        const res = await fetch('/api/admin/kanban', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'card', id: editingCard.id, ...cardForm }),
        });
        const data = await res.json();
        setCards(prev => prev.map(c => c.id === editingCard.id ? { ...c, ...data.data } : c));
        showToast('success', 'Card atualizado!');
      } else {
        // Verificar se já existe card com o mesmo company_name ou client_email
        const companyName = cardForm.company_name || cardForm.client_name;
        const duplicate = cards.find(c =>
          (companyName && c.company_name && c.company_name.toLowerCase() === companyName.toLowerCase()) ||
          (cardForm.client_email && c.client_email && c.client_email.toLowerCase() === cardForm.client_email.toLowerCase())
        );
        if (duplicate) {
          showToast('error', `Já existe um card para "${duplicate.company_name || duplicate.client_name}". Verifique a lixeira ou edite o card existente.`);
          setSavingCard(false);
          return;
        }
        const res = await fetch('/api/admin/kanban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'card', stage_id: addCardStage, board_id: activeBoardId, ...cardForm, company_name: companyName }),
        });
        const data = await res.json();
        setCards(prev => [...prev, data.data]);
        showToast('success', 'Card adicionado!');
      }
      setAddCardStage(null);
      setEditingCard(null);
    } catch { showToast('error', 'Erro ao salvar card'); }
    finally { setSavingCard(false); }
  };

  const deleteCard = async (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    try {
      await fetch(`/api/admin/kanban?type=card&id=${id}`, { method: 'DELETE' });
      showToast('success', 'Card removido');
    } catch { showToast('error', 'Erro ao remover card'); fetchData(activeBoardId || undefined); }
  };

  // ── CS ACOMPANHAMENTO ──────────────────────────────────────────────────────
  // Calculate next contact date based on frequency
  const calcNextContactDate = (frequency: string): string => {
    const today = new Date();
    const days = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 15 : frequency === 'monthly' ? 30 : frequency === 'quarterly' ? 90 : 7;
    today.setDate(today.getDate() + days);
    return today.toISOString().split('T')[0];
  };

  const openCardDetail = async (card: Card) => {
    setDetailCard(card);
    setDetailTab('info'); // Abrir direto na aba de informações
    setClientData(null);
    setClientExtraContacts([]);
    const freq = card.contact_frequency || 'weekly';
    const nextDate = card.next_contact_date || calcNextContactDate(freq);
    setCsConfig({ next_contact_date: nextDate, contact_frequency: freq });
    setContactForm({
      contact_date: new Date().toISOString().split('T')[0],
      contact_type: 'whatsapp',
      responsible: card.cs_name || '',
      notes: '',
      next_contact_date: '',
    });
    setInfoForm({
      cs_name: card.cs_name || '',
      sdr_name: card.sdr_name || '',
      client_phone: card.client_phone || '',
      notes: card.notes || '',
      health_status: (card.health_status || '') as EngagementValue,
      fup_date: card.fup_date || '',
    });
    setLoadingContacts(true);
    setDetailContacts([]);
    // Buscar dados reais do cliente pelo email (ou nome/empresa como fallback)
    const searchTerm = card.client_email || card.company_name || card.client_name;
    if (searchTerm) {
      setLoadingClientData(true);
      try {
        const res = await fetch(`/api/admin/clients?search=${encodeURIComponent(searchTerm)}`);
        const data = await res.json();
        const clientList = data.clients || data.users || [];
        // Tentar match exato por email primeiro, depois por nome
        let found = card.client_email
          ? clientList.find((u: any) => u.email?.toLowerCase() === card.client_email?.toLowerCase())
          : null;
        // Fallback: match por nome da empresa ou nome do cliente
        if (!found && clientList.length > 0) {
          const companyLower = (card.company_name || card.client_name || '').toLowerCase();
          found = clientList.find((u: any) =>
            (u.companyName || '').toLowerCase() === companyLower ||
            (u.name || '').toLowerCase() === companyLower
          );
        }
        if (found) {
          setClientData(found);
          setInfoForm(prev => ({
            ...prev,
            cs_name: card.cs_name || found.csName || '',
            sdr_name: card.sdr_name || found.sdrName || '',
            client_phone: card.client_phone || found.phone || '',
          }));
          // Buscar contatos extras do cliente
          try {
            const cr = await fetch(`/api/admin/clients?action=contacts&userId=${found.id}`);
            const cd = await cr.json();
            setClientExtraContacts(cd.contacts || []);
          } catch { setClientExtraContacts([]); }
        }
      } catch { /* silent */ }
      finally { setLoadingClientData(false); }
    }
    try {
      const res = await fetch(`/api/admin/kanban?action=contacts&card_id=${card.id}`);
      const data = await res.json();
      setDetailContacts(data.data || []);
    } catch { setDetailContacts([]); }
    finally { setLoadingContacts(false); }
  };

  const saveCsConfig = async () => {
    if (!detailCard) return;
    setSavingCs(true);
    try {
      const res = await fetch('/api/admin/kanban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'card',
          id: detailCard.id,
          next_contact_date: csConfig.next_contact_date || null,
          contact_frequency: csConfig.contact_frequency,
        }),
      });
      const data = await res.json();
      const updated = { ...detailCard, ...data.data };
      setDetailCard(updated);
      setCards(prev => prev.map(c => c.id === detailCard.id ? updated : c));
      showToast('success', 'Configuração de contato salva!');
    } catch { showToast('error', 'Erro ao salvar configuração'); }
    finally { setSavingCs(false); }
  };

  const saveContact = async () => {
    if (!detailCard) return;
    setSavingContact(true);
    try {
      const res = await fetch('/api/admin/kanban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'contact', card_id: detailCard.id, ...contactForm }),
      });
      const data = await res.json();
      setDetailContacts(prev => [data.data, ...prev]);
      setContactForm(p => ({ ...p, notes: '' }));
      showToast('success', 'Contato registrado!');
    } catch { showToast('error', 'Erro ao registrar contato'); }
    finally { setSavingContact(false); }
  };

  const saveInfoForm = async () => {
    if (!detailCard) return;
    setSavingInfo(true);
    try {
      const res = await fetch('/api/admin/kanban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'card',
          id: detailCard.id,
          cs_name: infoForm.cs_name || null,
          sdr_name: infoForm.sdr_name || null,
          client_phone: infoForm.client_phone || null,
          notes: infoForm.notes || null,
          health_status: infoForm.health_status || null,
          fup_date: infoForm.fup_date || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Erro desconhecido');
      const updated: Card = { ...detailCard, cs_name: infoForm.cs_name || undefined, sdr_name: infoForm.sdr_name || undefined, client_phone: infoForm.client_phone || undefined, notes: infoForm.notes || undefined, health_status: infoForm.health_status || undefined, fup_date: infoForm.fup_date || null, ...(json.data || {}) };
      setDetailCard(updated);
      setCards(prev => prev.map(c => c.id === detailCard.id ? updated : c));
      showToast('success', 'Informações salvas!');
    } catch (e: any) { showToast('error', e.message || 'Erro ao salvar informações'); }
    finally { setSavingInfo(false); }
  };

  // Move card directly to Acompanhamento board (first stage)
  const ACOMPANHAMENTO_BOARD_ID = '39efc567-096b-4f86-8024-bca164714e5b';
  const ACOMPANHAMENTO_FIRST_STAGE_ID = 'a062fbf9-4cb1-4771-aa47-6054eacf76b4'; // Saudável

  const moveToAcompanhamento = async (targetCard?: Card) => {
    const cardToMove = targetCard || detailCard;
    if (!cardToMove) return;
    setSavingCard(true);
    try {
      await fetch('/api/admin/kanban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'card',
          id: cardToMove.id,
          stage_id: ACOMPANHAMENTO_FIRST_STAGE_ID,
          board_id: ACOMPANHAMENTO_BOARD_ID,
        }),
      });
      setCards(prev => prev.filter(c => c.id !== cardToMove.id));
      setDetailCard(null);
      setDetailContacts([]);
      showToast('success', `${cardToMove.client_name} movido para Acompanhamento CS!`);
    } catch { showToast('error', 'Erro ao mover cliente'); }
    finally { setSavingCard(false); }
  };

  const deleteContact = async (contactId: string) => {
    setDetailContacts(prev => prev.filter(c => c.id !== contactId));
    try {
      await fetch(`/api/admin/kanban?type=contact&id=${contactId}`, { method: 'DELETE' });
    } catch { showToast('error', 'Erro ao remover contato'); }
  };

  const getHealthStatus = (card: Card): 'green' | 'yellow' | 'red' | 'none' => {
    if (!card.next_contact_date) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(card.next_contact_date + 'T00:00:00');
    const diffDays = Math.floor((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return 'green';
    if (diffDays >= -7) return 'yellow';
    return 'red';
  };

  const healthColors = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-400',
    red: 'bg-red-500',
    none: 'bg-slate-300',
  };

  const healthLabels = {
    green: 'Em dia',
    yellow: 'Atenção',
    red: 'Atrasado',
    none: 'Sem agendamento',
  };

  // ── MOVE TO ANOTHER BOARD ────────────────────────────────────────────────────
  const openMoveCard = async (card: Card) => {
    setMovingCard(card);
    setMoveTargetBoardId('');
    setMoveTargetStageId('');
    setMoveTargetStages([]);
  };

  const loadMoveTargetStages = async (boardId: string) => {
    setMoveTargetBoardId(boardId);
    setMoveTargetStageId('');
    setLoadingMoveStages(true);
    try {
      const res = await fetch(`/api/admin/kanban?action=stages&board_id=${boardId}`);
      const data = await res.json();
      setMoveTargetStages(data.data || []);
    } catch { setMoveTargetStages([]); }
    finally { setLoadingMoveStages(false); }
  };

  const confirmMoveCard = async () => {
    if (!movingCard || !moveTargetBoardId) return;
    setSavingCard(true);
    try {
      // Get first stage of target board
      const res = await fetch(`/api/admin/kanban?action=stages&board_id=${moveTargetBoardId}`);
      const data = await res.json();
      const targetStages: Stage[] = data.data || [];
      const firstStage = targetStages[0];
      if (!firstStage) { showToast('error', 'O fluxo de destino não tem etapas'); setSavingCard(false); return; }
      await fetch('/api/admin/kanban', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'card', id: movingCard.id, stage_id: firstStage.id, board_id: moveTargetBoardId }),
      });
      setCards(prev => prev.filter(c => c.id !== movingCard.id));
      setMovingCard(null);
      setDetailCard(null);
      showToast('success', `Cliente movido para "${boards.find(b => b.id === moveTargetBoardId)?.name || 'outro fluxo'}"`!);
    } catch { showToast('error', 'Erro ao mover cliente'); }
    finally { setSavingCard(false); }
  };

  // ── STAGES CRUD ──────────────────────────────────────────────────────────────
  const openEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setStageForm({ name: stage.name, color: stage.color, emoji: stage.emoji, responsible: stage.responsible, description: stage.description || '' });
  };

  const saveStage = async () => {
    if (!stageForm.name.trim()) { showToast('error', 'Nome da etapa é obrigatório'); return; }
    setSavingStage(true);
    try {
      if (editingStage) {
        const res = await fetch('/api/admin/kanban', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'stage', id: editingStage.id, ...stageForm }),
        });
        const data = await res.json();
        setStages(prev => prev.map(s => s.id === editingStage.id ? { ...s, ...data.data } : s));
        showToast('success', 'Etapa atualizada!');
      } else {
        const res = await fetch('/api/admin/kanban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'stage', board_id: activeBoardId, ...stageForm, position: stages.length }),
        });
        const data = await res.json();
        setStages(prev => [...prev, data.data]);
        showToast('success', 'Etapa criada!');
      }
      setEditingStage(null);
      setShowAddStage(false);
    } catch { showToast('error', 'Erro ao salvar etapa'); }
    finally { setSavingStage(false); }
  };

  const openDeleteStage = (stage: Stage) => {
    setDeletingStage(stage);
    const otherStages = stages.filter(s => s.id !== stage.id);
    setMoveCardsTo(otherStages.length > 0 ? otherStages[0].id : '');
  };

  const confirmDeleteStage = async () => {
    if (!deletingStage) return;
    const stageCardsCount = cards.filter(c => c.stage_id === deletingStage.id).length;
    const url = stageCardsCount > 0 && moveCardsTo
      ? `/api/admin/kanban?type=stage&id=${deletingStage.id}&move_to=${moveCardsTo}`
      : `/api/admin/kanban?type=stage&id=${deletingStage.id}`;

    setStages(prev => prev.filter(s => s.id !== deletingStage.id));
    if (stageCardsCount > 0 && moveCardsTo) {
      setCards(prev => prev.map(c => c.stage_id === deletingStage.id ? { ...c, stage_id: moveCardsTo } : c));
    } else {
      setCards(prev => prev.filter(c => c.stage_id !== deletingStage.id));
    }
    setDeletingStage(null);

    try {
      await fetch(url, { method: 'DELETE' });
      showToast('success', 'Etapa removida');
    } catch { showToast('error', 'Erro ao remover etapa'); fetchData(activeBoardId || undefined); }
  };

  // ── BOARDS CRUD ──────────────────────────────────────────────────────────────
  const openEditBoard = (board: Board) => {
    setEditingBoard(board);
    setBoardForm({ name: board.name, description: board.description || '', color: board.color });
  };

  const saveBoard = async () => {
    if (!boardForm.name.trim()) { showToast('error', 'Nome do fluxo é obrigatório'); return; }
    setSavingBoard(true);
    try {
      if (editingBoard) {
        const res = await fetch('/api/admin/kanban', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'board', id: editingBoard.id, ...boardForm }),
        });
        const data = await res.json();
        setBoards(prev => prev.map(b => b.id === editingBoard.id ? { ...b, ...data.data } : b));
        showToast('success', 'Fluxo atualizado!');
      } else {
        const res = await fetch('/api/admin/kanban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'board', ...boardForm }),
        });
        const data = await res.json();
        setBoards(prev => [...prev, data.data]);
        showToast('success', 'Fluxo criado!');
      }
      setEditingBoard(null);
      setShowAddBoard(false);
    } catch { showToast('error', 'Erro ao salvar fluxo'); }
    finally { setSavingBoard(false); }
  };

  const deleteBoard = async (board: Board) => {
    if (board.is_default) { showToast('error', 'Não é possível excluir o fluxo padrão'); return; }
    if (!confirm(`Excluir o fluxo "${board.name}"? Todas as etapas e cards serão removidos.`)) return;
    setBoards(prev => prev.filter(b => b.id !== board.id));
    if (activeBoardId === board.id) {
      const remaining = boards.filter(b => b.id !== board.id);
      if (remaining.length > 0) switchBoard(remaining[0].id);
    }
    try {
      await fetch(`/api/admin/kanban?type=board&id=${board.id}`, { method: 'DELETE' });
      showToast('success', 'Fluxo removido');
    } catch { showToast('error', 'Erro ao remover fluxo'); fetchData(); }
  };

  const stageCards = (stageId: string) => filteredCards(stageId);

  const activeBoard = boards.find(b => b.id === activeBoardId);

  // ── RENDER ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <main className={`w-full min-w-0 flex flex-col h-screen overflow-hidden ${t.bg}`}>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.text}
        </div>
      )}

      {/* ── ZONA FIXA: header + filtros + alertas + board tabs ── */}
      <div className="flex-shrink-0 pt-4 pb-0 space-y-2">

      {/* Header compacto — tudo em uma linha */}
      <div className={`flex items-center gap-2 ${t.surface} rounded-2xl border ${t.border} px-3 py-2 mx-4 min-w-0 overflow-hidden`}>
        {/* Logo + título */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow">
            <Kanban size={14} className="text-white" />
          </div>
          <span className={`text-sm font-bold ${t.text} hidden sm:block`}>Kanban CS</span>
          <span className={`text-xs ${t.textMuted} hidden md:block`}>· {cards.length} clientes</span>
        </div>

        <div className={`w-px h-5 ${isDark ? 'bg-gray-700' : 'bg-slate-200'} flex-shrink-0`} />

        {/* Busca — flex-1 */}
        {view === 'board' && (
          <div className="relative flex-1 min-w-0">
            <Search size={13} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
            <input
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Buscar empresa ou email..."
              className={`w-full pl-7 pr-7 py-1.5 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
            />
            {filterSearch && (
              <button onClick={() => setFilterSearch('')} className={`absolute right-2 top-1/2 -translate-y-1/2 ${t.textMuted} hover:text-red-500`}>
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Botões de ação — compactos */}
        <div className="flex items-center gap-1 flex-shrink-0 overflow-x-auto max-w-full">
          {/* Filtros avançados (só no board view) */}
          {view === 'board' && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              title="Filtros avançados"
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-violet-600 text-white border-violet-600'
                  : `${t.border} ${t.textSub} hover:text-violet-600`
              }`}
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Limpar filtros */}
          {view === 'board' && (filterSearch || activeFilterCount > 0) && (
            <button onClick={clearFilters} title="Limpar filtros"
              className={`p-1.5 rounded-lg border text-xs ${t.border} text-red-500 hover:bg-red-50 transition-colors`}>
              <X size={13} />
            </button>
          )}

          {/* Alertas */}
          {(alerts.overdue.length > 0 || alerts.dueToday.length > 0) && (
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              title="Alertas de contato"
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${showAlerts ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-300 text-amber-600 hover:bg-amber-50'}`}
            >
              <Bell size={13} />
              <span className="hidden sm:inline">Alertas</span>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center leading-none">
                {alerts.overdue.length + alerts.dueToday.length}
              </span>
            </button>
          )}

          {/* Sem Funil */}
          {view === 'board' && (
            <button
              onClick={() => setShowUnassigned(v => !v)}
              title="Clientes sem funil"
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${showUnassigned ? 'bg-amber-500 text-white border-amber-500' : `${t.border} ${t.textSub} hover:text-amber-500`}`}
            >
              <Users size={13} />
              <span className="hidden sm:inline">Sem Funil</span>
              {unassignedUsers.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center leading-none px-0.5">
                  {unassignedUsers.length}
                </span>
              )}
            </button>
          )}
          {/* Fluxos */}
          <button
            onClick={() => setView(view === 'boards' ? 'board' : 'boards')}
            title="Gerenciar Fluxos"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${view === 'boards' ? 'bg-indigo-600 text-white border-indigo-600' : `${t.border} ${t.textSub} hover:text-indigo-600`}`}
          >
            <LayoutDashboard size={13} />
            <span className="hidden sm:inline">Fluxos</span>
          </button>

          {/* Etapas */}
          <button
            onClick={() => setView(view === 'settings' ? 'board' : 'settings')}
            title="Gerenciar Etapas"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${view === 'settings' ? 'bg-violet-600 text-white border-violet-600' : `${t.border} ${t.textSub} hover:text-violet-600`}`}
          >
            <SlidersHorizontal size={13} />
            <span className="hidden sm:inline">Etapas</span>
          </button>

          {/* Visualização Kanban / Lista */}
          {view === 'board' && (
            <div className={`flex items-center rounded-lg border ${t.border} overflow-hidden`}>
              <button
                onClick={() => setViewMode('kanban')}
                title="Visualização Kanban"
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-violet-600 text-white' : `${t.textSub} hover:text-violet-600`}`}
              >
                <LayoutGrid size={13} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Visualização Lista"
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-violet-600 text-white' : `${t.textSub} hover:text-violet-600`}`}
              >
                <LayoutList size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Panel */}
      {showAlerts && view === 'board' && (
        <div className={`mb-4 ${t.surface} rounded-2xl border border-amber-200 p-4 mx-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-bold ${t.text} flex items-center gap-2`}>
              <Bell size={14} className="text-amber-500" />
              Alertas de Contato
            </h3>
            <button onClick={() => setShowAlerts(false)} className={`p-1 rounded ${t.surfaceHover} ${t.textMuted}`}><X size={14} /></button>
          </div>
          {alerts.overdue.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-red-600 mb-2">🔴 Contato atrasado ({alerts.overdue.length})</p>
              <div className="space-y-1">
                {alerts.overdue.map(card => (
                  <button key={card.id} onClick={() => openCardDetail(card)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${t.surfaceHover} border ${t.border} transition-colors`}>
                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(card.company_name || card.client_name).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium ${t.text} truncate block`}>{card.company_name || card.client_name}</span>
                      <span className="text-xs text-red-500">Próximo contato: {card.next_contact_date ? new Date(card.next_contact_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                    </div>
                    <ChevronRight size={14} className={t.textMuted} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {alerts.dueToday.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 mb-2">🟡 Contato hoje ({alerts.dueToday.length})</p>
              <div className="space-y-1">
                {alerts.dueToday.map(card => (
                  <button key={card.id} onClick={() => openCardDetail(card)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${t.surfaceHover} border ${t.border} transition-colors`}>
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(card.company_name || card.client_name).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium ${t.text} truncate block`}>{card.company_name || card.client_name}</span>
                      <span className="text-xs text-amber-500">Contato agendado para hoje</span>
                    </div>
                    <ChevronRight size={14} className={t.textMuted} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PAINEL SEM FUNIL ── */}
      {view === 'board' && showUnassigned && (
        <div className={`mb-4 ${t.surface} rounded-2xl border border-amber-300 p-4 mx-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-bold ${t.text} flex items-center gap-2`}>
              <Users size={14} className="text-amber-500" />
              Clientes sem funil
              <span className="text-xs font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                {unassignedUsers.filter(u => !unassignedSearch || (u.name + ' ' + (u.company_name || '') + ' ' + u.email).toLowerCase().includes(unassignedSearch.toLowerCase())).length} clientes
              </span>
            </h3>
            <button onClick={() => setShowUnassigned(false)} className={`p-1 rounded ${t.surfaceHover} ${t.textMuted}`}><X size={14} /></button>
          </div>
          {/* Busca */}
          <div className="relative mb-3">
            <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
            <input
              type="text"
              value={unassignedSearch}
              onChange={e => setUnassignedSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className={`w-full pl-8 pr-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-amber-400`}
            />
          </div>
          {/* Lista de clientes */}
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {unassignedUsers
              .filter(u => !unassignedSearch || (u.name + ' ' + (u.company_name || '') + ' ' + u.email).toLowerCase().includes(unassignedSearch.toLowerCase()))
              .map(user => (
                <div key={user.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${t.border} ${t.surface} hover:border-amber-300 transition-colors`}>
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {(user.company_name || user.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${t.text} truncate`}>{user.company_name || user.name}</p>
                    <p className={`text-xs ${t.textMuted} truncate`}>{user.email} {user.plan ? `· ${user.plan}` : ''}</p>
                  </div>
                  <button
                    onClick={() => { setAssigningUser(user); setAssignStageId(stages.length > 0 ? stages[0].id : ''); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors flex-shrink-0"
                  >
                    <Plus size={12} />
                    Adicionar ao funil
                  </button>
                </div>
              ))
            }
            {unassignedUsers.filter(u => !unassignedSearch || (u.name + ' ' + (u.company_name || '') + ' ' + u.email).toLowerCase().includes(unassignedSearch.toLowerCase())).length === 0 && (
              <p className={`text-sm text-center py-4 ${t.textMuted}`}>Nenhum cliente encontrado</p>
            )}
          </div>
        </div>
      )}

      {/* Modal: Adicionar ao funil */}
      {assigningUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`${t.surface} rounded-2xl border ${t.border} p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-base font-bold ${t.text}`}>Adicionar ao funil</h3>
              <button onClick={() => { setAssigningUser(null); setAssignStageId(''); }} className={`p-1 rounded ${t.surfaceHover} ${t.textMuted}`}><X size={16} /></button>
            </div>
            <div className="mb-4">
              <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-amber-50'} border border-amber-200`}>
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-base font-bold">
                  {(assigningUser.company_name || assigningUser.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className={`font-semibold ${t.text}`}>{assigningUser.company_name || assigningUser.name}</p>
                  <p className={`text-xs ${t.textMuted}`}>{assigningUser.email}</p>
                </div>
              </div>
            </div>
            {/* Seletor de fluxo */}
            {boards.length > 1 && (
              <div className="mb-3">
                <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Fluxo</label>
                <select
                  value={activeBoardId || ''}
                  onChange={e => {
                    const bid = e.target.value;
                    setActiveBoardId(bid);
                    const firstStage = stages.find(s => s.board_id === bid);
                    setAssignStageId(firstStage?.id || '');
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-amber-400`}
                >
                  {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            {/* Seletor de etapa */}
            <div className="mb-5">
              <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Etapa</label>
              <select
                value={assignStageId}
                onChange={e => setAssignStageId(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-amber-400`}
              >
                <option value="">Selecione uma etapa...</option>
                {stages.filter(s => !activeBoardId || s.board_id === activeBoardId).map(s => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setAssigningUser(null); setAssignStageId(''); }}
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium ${t.border} ${t.textSub} hover:${t.surfaceHover} transition-colors`}
              >
                Cancelar
              </button>
              <button
                disabled={!assignStageId || savingAssign}
                onClick={async () => {
                  if (!assignStageId || !assigningUser) return;
                  setSavingAssign(true);
                  try {
                    const res = await fetch('/api/admin/kanban', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'card',
                        stage_id: assignStageId,
                        board_id: activeBoardId,
                        client_name: assigningUser.name,
                        company_name: assigningUser.company_name || assigningUser.name,
                        client_email: assigningUser.email,
                        client_phone: assigningUser.phone || '',
                        user_id: assigningUser.id,
                        notes: assigningUser.plan ? `Plano: ${assigningUser.plan}` : '',
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Erro ao criar card');
                    setCards(prev => [...prev, data.data]);
                    setAssigningUser(null);
                    setAssignStageId('');
                    showToast('success', `${assigningUser.company_name || assigningUser.name} adicionado ao funil!`);
                  } catch (e: any) {
                    showToast('error', e.message || 'Erro ao adicionar ao funil');
                  } finally {
                    setSavingAssign(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {savingAssign ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {savingAssign ? 'Adicionando...' : 'Adicionar ao funil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painel de filtros avançados — expansível abaixo do header */}
      {view === 'board' && showFilters && (
        <div className={`${t.surface} rounded-2xl border ${t.border} p-3 mx-4`}>
          <div className={`grid grid-cols-2 gap-3`}>
            {/* CS Responsável */}
            <div>
              <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>CS Responsável</label>
              <select value={filterCS} onChange={e => setFilterCS(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}>
                <option value="">Todos os CS</option>
                {uniqueCSNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            {/* SDR */}
            <div>
              <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>SDR</label>
              <select value={filterSDR} onChange={e => setFilterSDR(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}>
                <option value="">Todos os SDR</option>
                {uniqueSDRNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Board tabs — dentro da zona fixa */}
      {view === 'board' && boards.length > 1 && (
        <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto flex-shrink-0">
          {boards.map(board => (
            <div key={board.id} className="flex-shrink-0 flex items-center gap-0.5">
              <button
                onClick={() => switchBoard(board.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${activeBoardId === board.id
                  ? 'text-white border-transparent shadow-md'
                  : `${t.border} ${t.textSub} hover:border-violet-400`
                } ${!board.is_default ? 'rounded-r-none border-r-0' : ''}`}
                style={activeBoardId === board.id ? { backgroundColor: board.color } : {}}
              >
                {board.name}
                {board.is_default && <span className="text-xs opacity-70">(padrão)</span>}
              </button>
              {!board.is_default && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteBoard(board); }}
                  title="Excluir fluxo"
                  className={`flex items-center justify-center w-7 h-[38px] rounded-r-xl border ${t.border} ${t.surfaceHover} text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors`}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      </div> {/* fim da zona fixa */}

      {/* ── ZONA SCROLLÁVEL: board view + outras views ── */}
      <div className="flex-1 overflow-auto px-4 pb-4">

      {/* ── BOARDS MANAGEMENT VIEW ── */}
      {view === 'boards' && (
        <div className={`${t.surface} rounded-2xl border ${t.border} p-6`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={`text-base font-bold ${t.text}`}>Fluxos de Kanban</h2>
            <button
              onClick={() => { setShowAddBoard(true); setEditingBoard(null); setBoardForm({ name: '', description: '', color: '#6366f1' }); }}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={14} /> Novo Fluxo
            </button>
          </div>

          <div className="space-y-3">
            {boards.map(board => (
              <div key={board.id} className={`flex items-center gap-4 p-4 rounded-xl border ${t.border} ${t.surface}`}>
                <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: board.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${t.text}`}>{board.name}</span>
                    {board.is_default && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">Padrão</span>
                    )}
                  </div>
                  {board.description && <p className={`text-xs ${t.textMuted} mt-0.5 truncate`}>{board.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { switchBoard(board.id); setView('board'); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${t.surfaceHover} ${t.textSub} hover:text-violet-600 border ${t.border} transition-colors`}
                  >
                    Abrir
                  </button>
                  <button onClick={() => openEditBoard(board)} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub} hover:text-violet-600 transition-colors`}>
                    <Pencil size={14} />
                  </button>
                  {!board.is_default && (
                    <button onClick={() => deleteBoard(board)} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub} hover:text-red-500 transition-colors`}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Board Form Modal */}
          {(editingBoard || showAddBoard) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className={`w-full max-w-md ${t.surface} rounded-2xl border ${t.border} shadow-2xl p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className={`font-bold ${t.text}`}>{editingBoard ? 'Editar Fluxo' : 'Novo Fluxo'}</h3>
                  <button onClick={() => { setEditingBoard(null); setShowAddBoard(false); }} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub}`}><X size={16} /></button>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Nome do Fluxo</label>
                      <input value={boardForm.name} onChange={e => setBoardForm(p => ({ ...p, name: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        placeholder="Ex: Funil de Vendas" />
                    </div>
                    <div className="w-24">
                      <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Cor</label>
                      <input type="color" value={boardForm.color} onChange={e => setBoardForm(p => ({ ...p, color: e.target.value }))}
                        className="w-full h-10 rounded-lg border cursor-pointer" style={{ borderColor: isDark ? '#374151' : '#e2e8f0' }} />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Descrição (opcional)</label>
                    <input value={boardForm.description} onChange={e => setBoardForm(p => ({ ...p, description: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      placeholder="Descreva o objetivo deste fluxo" />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => { setEditingBoard(null); setShowAddBoard(false); }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium ${t.border} ${t.textSub}`}>Cancelar</button>
                  {editingBoard && !editingBoard.is_default && (
                    <button
                      onClick={() => { setEditingBoard(null); setShowAddBoard(false); deleteBoard(editingBoard); }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                      title="Excluir este fluxo"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  )}
                  <button onClick={saveBoard} disabled={savingBoard}
                    className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                    {savingBoard ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS VIEW ── */}
      {view === 'settings' && (
        <div className={`${t.surface} rounded-2xl border ${t.border} p-6`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className={`text-base font-bold ${t.text}`}>Etapas do Kanban</h2>
              {activeBoard && <p className={`text-xs ${t.textMuted} mt-0.5`}>Fluxo: {activeBoard.name} · Arraste para reordenar</p>}
            </div>
            <button
              onClick={() => { setShowAddStage(true); setEditingStage(null); setStageForm({ name: '', color: '#6366f1', emoji: '📋', responsible: 'nos', description: '' }); }}
              className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={14} /> Nova Etapa
            </button>
          </div>

          <div className="space-y-2">
            {stages.map((stage, idx) => (
              <div
                key={stage.id}
                draggable
                onDragStart={e => handleStageDragStart(e, stage)}
                onDragOver={e => handleStageDragOver(e, stage.id)}
                onDrop={e => handleStageDrop(e, stage.id)}
                onDragEnd={handleStageDragEnd}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${draggingStage?.id === stage.id ? 'opacity-40 scale-95' : ''} ${dragOverStageItem === stage.id && draggingStage?.id !== stage.id ? 'border-violet-400 bg-violet-50/10' : `${t.border} ${t.surface}`}`}
              >
                <div className={`cursor-grab active:cursor-grabbing ${t.textMuted} flex-shrink-0`}>
                  <GripVertical size={16} />
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: stage.color + '22' }}>
                  {stage.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${t.text}`}>Etapa {idx + 1} — {stage.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RESPONSIBLE_COLORS[stage.responsible] || 'bg-slate-100 text-slate-600'}`}>
                      {RESPONSIBLE_LABELS[stage.responsible] || stage.responsible}
                    </span>
                  </div>
                  {stage.description && <p className={`text-xs ${t.textMuted} mt-0.5`}>{stage.description}</p>}
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-white shadow flex-shrink-0" style={{ backgroundColor: stage.color }} />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEditStage(stage)} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub} hover:text-violet-600 transition-colors`}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => openDeleteStage(stage)} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub} hover:text-red-500 transition-colors`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Stage Form Modal */}
          {(editingStage || showAddStage) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className={`w-full max-w-md ${t.surface} rounded-2xl border ${t.border} shadow-2xl p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className={`font-bold ${t.text}`}>{editingStage ? 'Editar Etapa' : 'Nova Etapa'}</h3>
                  <button onClick={() => { setEditingStage(null); setShowAddStage(false); }} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub}`}><X size={16} /></button>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Nome da Etapa</label>
                      <input value={stageForm.name} onChange={e => setStageForm(p => ({ ...p, name: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                        placeholder="Ex: Onboarding" />
                    </div>
                    <div className="w-20">
                      <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Emoji</label>
                      <input value={stageForm.emoji} onChange={e => setStageForm(p => ({ ...p, emoji: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border text-sm text-center ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                        placeholder="📋" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Responsável</label>
                      <select value={stageForm.responsible} onChange={e => setStageForm(p => ({ ...p, responsible: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}>
                        <option value="nos">Nós fazemos</option>
                        <option value="cliente">Cliente faz</option>
                      </select>
                    </div>
                    <div className="w-24">
                      <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Cor</label>
                      <input type="color" value={stageForm.color} onChange={e => setStageForm(p => ({ ...p, color: e.target.value }))}
                        className="w-full h-10 rounded-lg border cursor-pointer" style={{ borderColor: isDark ? '#374151' : '#e2e8f0' }} />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Descrição (opcional)</label>
                    <input value={stageForm.description} onChange={e => setStageForm(p => ({ ...p, description: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                      placeholder="Descreva o que acontece nesta etapa" />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={() => { setEditingStage(null); setShowAddStage(false); }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium ${t.border} ${t.textSub}`}>Cancelar</button>
                  <button onClick={saveStage} disabled={savingStage}
                    className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                    {savingStage ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Stage Modal */}
          {deletingStage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className={`w-full max-w-md ${t.surface} rounded-2xl border ${t.border} shadow-2xl p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Trash2 size={18} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${t.text}`}>Excluir Etapa</h3>
                    <p className={`text-xs ${t.textMuted}`}>"{deletingStage.name}"</p>
                  </div>
                </div>

                {(() => {
                  const count = cards.filter(c => c.stage_id === deletingStage.id).length;
                  const otherStages = stages.filter(s => s.id !== deletingStage.id);
                  return count > 0 ? (
                    <div className="space-y-3">
                      <p className={`text-sm ${t.textSub}`}>
                        Esta etapa tem <strong>{count} card{count > 1 ? 's' : ''}</strong>. Para onde deseja mover?
                      </p>
                      {otherStages.length > 0 ? (
                        <select
                          value={moveCardsTo}
                          onChange={e => setMoveCardsTo(e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-red-500`}
                        >
                          {otherStages.map(s => (
                            <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                          ))}
                        </select>
                      ) : (
                        <p className={`text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2`}>
                          Não há outras etapas. Os cards serão excluídos junto.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className={`text-sm ${t.textSub}`}>Esta etapa está vazia. Confirma a exclusão?</p>
                  );
                })()}

                <div className="flex gap-2 mt-5">
                  <button onClick={() => setDeletingStage(null)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium ${t.border} ${t.textSub}`}>Cancelar</button>
                  <button onClick={confirmDeleteStage}
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center justify-center gap-2">
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BOARD VIEW — KANBAN ── */}
      {view === 'board' && viewMode === 'kanban' && (
        <div className="flex gap-4 pb-4 overflow-x-auto" style={{ minHeight: 0 }}>
          {stages.map(stage => {
            const sc = stageCards(stage.id);
            const isOver = dragOverStage === stage.id;
            return (
              <div
                key={stage.id}
                className={`flex-shrink-0 w-72 flex flex-col rounded-2xl border transition-all duration-150 ${isOver ? 'ring-2 ring-offset-1' : ''}`}
                style={{
                  backgroundColor: isDark ? '#111827' : '#f8fafc',
                  borderColor: isOver ? stage.color : (isDark ? '#1f2937' : '#e2e8f0'),
                }}
                onDragOver={e => handleDragOver(e, stage.id)}
                onDrop={e => handleDrop(e, stage.id)}
              >
                {/* Column Header */}
                <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{stage.emoji}</span>
                    <div className="min-w-0">
                      <div className={`text-sm font-bold ${t.text} truncate`}>{stage.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${RESPONSIBLE_COLORS[stage.responsible] || 'bg-slate-100 text-slate-600'}`}>
                          {RESPONSIBLE_LABELS[stage.responsible] || stage.responsible}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full`} style={{ backgroundColor: stage.color + '22', color: stage.color }}>
                      {sc.length}
                    </span>
                    <button onClick={() => openAddCard(stage.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                      style={{ backgroundColor: stage.color + '22', color: stage.color }}>
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {/* Color bar */}
                <div className="mx-4 h-0.5 rounded-full mb-3" style={{ backgroundColor: stage.color }} />

                {/* Cards */}
                <div className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                  {sc.map(card => (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={e => handleDragStart(e, card)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => handleDragOver(e, stage.id, card.id)}
                        onClick={() => openCardDetail(card)}
                        className={`group relative rounded-xl border p-3 cursor-pointer transition-all duration-150 ${t.cardBg} ${t.border} shadow-sm hover:shadow-md ${draggingCard?.id === card.id ? 'opacity-40 scale-95' : ''} ${dragOverCard === card.id ? 'border-t-2' : ''}`}
                        style={{ borderTopColor: dragOverCard === card.id ? stage.color : undefined }}
                      >
                      <div className={`absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity ${t.textMuted}`}>
                        <GripVertical size={12} />
                      </div>

                      <div className="pl-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: stage.color }}>
                              {(card.company_name || card.client_name).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-sm font-semibold ${t.text} truncate`}>{card.company_name || card.client_name}</div>
                              {card.client_email && <div className={`text-xs ${t.textMuted} truncate`}>{card.client_email}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); openEditCard(card); }} className={`p-1 rounded ${t.surfaceHover} ${t.textSub} hover:text-violet-600`} title="Editar card"><Pencil size={11} /></button>
                            {boards.length > 1 && (
                              <button onClick={e => { e.stopPropagation(); openMoveCard(card); }} className={`p-1 rounded ${t.surfaceHover} ${t.textSub} hover:text-indigo-600`} title="Mover para outro fluxo"><ArrowRightCircle size={11} /></button>
                            )}
                            <button onClick={e => { e.stopPropagation(); deleteCard(card.id); }} className={`p-1 rounded ${t.surfaceHover} ${t.textSub} hover:text-red-500`} title="Excluir"><Trash2 size={11} /></button>
                          </div>
                        </div>

                        {(card.cs_name || card.sdr_name) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {card.cs_name && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                                CS: {card.cs_name}
                              </span>
                            )}
                            {card.sdr_name && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
                                SDR: {card.sdr_name}
                              </span>
                            )}
                          </div>
                        )}

                        {card.notes && (
                          <p className={`text-xs ${t.textMuted} mt-2 line-clamp-2 italic`}>{card.notes}</p>
                        )}

                        {/* Engagement status badge */}
                        {card.health_status && getEngagement(card.health_status) && (() => {
                          const eng = getEngagement(card.health_status)!;
                          return (
                            <div className="mt-2">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${eng.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${eng.dot}`} />
                                {eng.label}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Health indicator (próximo contato) */}
                        {card.next_contact_date && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${healthColors[getHealthStatus(card)]}`} />
                            <span className={`text-xs ${t.textMuted}`}>
                              {healthLabels[getHealthStatus(card)]} · {new Date(card.next_contact_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}

                        {/* FUP indicator */}
                        {card.fup_date && (() => {
                          const today = new Date(); today.setHours(0,0,0,0);
                          const fup = new Date(card.fup_date + 'T00:00:00');
                          const diff = Math.floor((fup.getTime() - today.getTime()) / (1000*60*60*24));
                          const isOverdue = diff < 0;
                          const isToday = diff === 0;
                          return (
                            <div className={`flex items-center gap-1.5 mt-1.5 px-1.5 py-0.5 rounded-md ${
                              isOverdue ? 'bg-red-500/10' : isToday ? 'bg-amber-500/10' : 'bg-slate-100/0'
                            }`}>
                              <AlarmClock size={10} className={isOverdue ? 'text-red-500' : isToday ? 'text-amber-500' : t.textMuted} />
                              <span className={`text-xs font-medium ${
                                isOverdue ? 'text-red-500' : isToday ? 'text-amber-600' : t.textMuted
                              }`}>
                                FUP: {isOverdue ? `Atrasado ${Math.abs(diff)}d` : isToday ? 'Hoje' : new Date(card.fup_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          );
                        })()}


                      </div>
                    </div>
                  ))}

                  {sc.length === 0 && (
                    <div className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${isOver ? 'border-current opacity-60' : `${isDark ? 'border-gray-800' : 'border-slate-200'} opacity-40`}`}
                      style={{ borderColor: isOver ? stage.color : undefined }}>
                      <p className={`text-xs ${t.textMuted}`}>Arraste um card aqui</p>
                    </div>
                  )}
                </div>

                {/* Add card button */}
                <button onClick={() => openAddCard(stage.id)}
                  className={`mx-3 mb-3 flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed text-xs font-medium transition-colors ${isDark ? 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500'}`}>
                  <Plus size={13} /> Adicionar cliente
                </button>
              </div>
            );
          })}

          {/* Add stage shortcut */}
          <div
            onClick={() => { setView('settings'); setShowAddStage(true); setEditingStage(null); setStageForm({ name: '', color: '#6366f1', emoji: '📋', responsible: 'nos', description: '' }); }}
            className={`flex-shrink-0 w-64 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${isDark ? 'border-gray-800 hover:border-gray-600' : 'border-slate-200 hover:border-slate-300'}`}
            style={{ minHeight: 200 }}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-slate-100'}`}>
              <Plus size={20} className={t.textMuted} />
            </div>
            <p className={`text-sm font-medium ${t.textMuted}`}>Nova Etapa</p>
          </div>
        </div>
      )}

      {/* ── BOARD VIEW — LISTA ── */}
      {view === 'board' && viewMode === 'list' && (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const getFupStatus = (fup?: string | null): 'overdue' | 'today' | 'week' | 'month' | 'future' | 'none' => {
          if (!fup) return 'none';
          const d = new Date(fup + 'T00:00:00');
          if (d < today) return 'overdue';
          if (d.getTime() === today.getTime()) return 'today';
          if (d >= startOfWeek && d <= endOfWeek) return 'week';
          if (d >= startOfMonth && d <= endOfMonth) return 'month';
          return 'future';
        };

        // Todos os cards filtrados (respeitando filtros de busca/CS/SDR)
        const allFilteredCards = cards.filter(c => {
          if (filterSearch) {
            const q = filterSearch.toLowerCase();
            if (!(c.company_name || c.client_name || '').toLowerCase().includes(q) &&
                !(c.client_email || '').toLowerCase().includes(q)) return false;
          }
          if (filterCS && (c.cs_name || '').toLowerCase() !== filterCS.toLowerCase()) return false;
          if (filterSDR && (c.sdr_name || '').toLowerCase() !== filterSDR.toLowerCase()) return false;
          return true;
        });

        // Filtrar por FUP
        const fupFilteredCards = allFilteredCards.filter(c => {
          if (fupFilter === 'all') return true;
          const status = getFupStatus(c.fup_date);
          if (fupFilter === 'overdue') return status === 'overdue';
          if (fupFilter === 'today') return status === 'today';
          if (fupFilter === 'week') return status === 'week' || status === 'today' || status === 'overdue';
          if (fupFilter === 'month') return status === 'month' || status === 'week' || status === 'today' || status === 'overdue';
          return true;
        });

        // Ordenação da lista
        const toggleSort = (col: typeof listSortCol) => {
          if (listSortCol === col) setListSortDir(d => d === 'asc' ? 'desc' : 'asc');
          else { setListSortCol(col); setListSortDir('asc'); }
        };
        const SortIcon = ({ col }: { col: typeof listSortCol }) => {
          if (listSortCol !== col) return <span className="opacity-30">↕</span>;
          return <span>{listSortDir === 'asc' ? '↑' : '↓'}</span>;
        };
        const sortedCards = [...fupFilteredCards].sort((a, b) => {
          const dir = listSortDir === 'asc' ? 1 : -1;
          if (listSortCol === 'client') {
            return dir * (a.company_name || a.client_name || '').localeCompare(b.company_name || b.client_name || '');
          }
          if (listSortCol === 'stage') {
            const sa = stages.find(s => s.id === a.stage_id)?.name || '';
            const sb = stages.find(s => s.id === b.stage_id)?.name || '';
            return dir * sa.localeCompare(sb);
          }
          if (listSortCol === 'cs') {
            return dir * (a.cs_name || '').localeCompare(b.cs_name || '');
          }
          if (listSortCol === 'health') {
            const hOrder: Record<string, number> = { engajado: 0, no_ritmo: 1, lento: 2, sem_resposta: 3, '': 4 };
            return dir * ((hOrder[a.health_status || ''] ?? 4) - (hOrder[b.health_status || ''] ?? 4));
          }
          if (listSortCol === 'fup') {
            if (!a.fup_date && !b.fup_date) return 0;
            if (!a.fup_date) return dir;
            if (!b.fup_date) return -dir;
            return dir * a.fup_date.localeCompare(b.fup_date);
          }
          if (listSortCol === 'next_contact') {
            if (!a.next_contact_date && !b.next_contact_date) return 0;
            if (!a.next_contact_date) return dir;
            if (!b.next_contact_date) return -dir;
            return dir * a.next_contact_date.localeCompare(b.next_contact_date);
          }
          // default: FUP overdue first
          const sa2 = getFupStatus(a.fup_date);
          const sb2 = getFupStatus(b.fup_date);
          const order = { overdue: 0, today: 1, week: 2, month: 3, future: 4, none: 5 };
          if (order[sa2] !== order[sb2]) return order[sa2] - order[sb2];
          if (a.fup_date && b.fup_date) return a.fup_date.localeCompare(b.fup_date);
          return 0;
        });

        return (
          <div className="flex-1 overflow-auto px-4 pb-4">
            {/* Filtro FUP */}
            <div className={`flex items-center gap-2 mb-3 flex-wrap`}>
              <AlarmClock size={14} className={t.textSub} />
              <span className={`text-xs font-medium ${t.textSub}`}>FUP:</span>
              {(['all', 'overdue', 'today', 'week', 'month'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFupFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    fupFilter === f
                      ? f === 'overdue' ? 'bg-red-500 text-white border-red-500'
                        : f === 'today' ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-violet-600 text-white border-violet-600'
                      : `${t.border} ${t.textSub} hover:text-violet-600`
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'overdue' ? 'Atrasado' : f === 'today' ? 'Hoje' : f === 'week' ? 'Esta semana' : 'Este mês'}
                </button>
              ))}
              <span className={`ml-auto text-xs ${t.textMuted}`}>{sortedCards.length} cliente{sortedCards.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Tabela */}
            <div className={`${t.surface} rounded-2xl border ${t.border} overflow-hidden`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${t.border}`}>
                    {[
                      { col: 'client' as const, label: 'Cliente', cls: '' },
                      { col: 'stage' as const, label: 'Etapa', cls: 'hidden md:table-cell' },
                      { col: 'cs' as const, label: 'CS / SDR', cls: 'hidden lg:table-cell' },
                      { col: 'health' as const, label: 'Saúde', cls: 'hidden sm:table-cell' },
                      { col: 'fup' as const, label: 'FUP', cls: '' },
                      { col: 'next_contact' as const, label: 'Próx. Contato', cls: 'hidden xl:table-cell' },
                    ].map(({ col, label, cls }) => (
                      <th
                        key={col}
                        onClick={() => toggleSort(col)}
                        className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors ${cls} ${
                          listSortCol === col ? 'text-violet-500' : t.textSub
                        } hover:text-violet-500`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label} <SortIcon col={col} />
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.divider}`}>
                  {sortedCards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`text-center py-12 text-sm ${t.textMuted}`}>
                        Nenhum cliente encontrado
                      </td>
                    </tr>
                  ) : sortedCards.map(card => {
                    const stage = stages.find(s => s.id === card.stage_id);
                    const fupStatus = getFupStatus(card.fup_date);
                    const eng = getEngagement(card.health_status);
                    return (
                      <tr
                        key={card.id}
                        onClick={() => openCardDetail(card)}
                        className={`cursor-pointer transition-colors ${isDark ? 'hover:bg-gray-800/60' : 'hover:bg-slate-50'}`}
                      >
                        {/* Cliente */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: stage?.color || '#6366f1' }}
                            >
                              {(card.company_name || card.client_name).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className={`font-semibold ${t.text} truncate`}>{card.company_name || card.client_name}</div>
                              {card.client_email && <div className={`text-xs ${t.textMuted} truncate`}>{card.client_email}</div>}
                            </div>
                          </div>
                        </td>
                        {/* Etapa */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          {stage ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: stage.color + '22', color: stage.color }}>
                              <span>{stage.emoji}</span>
                              <span>{stage.name}</span>
                            </span>
                          ) : <span className={`text-xs ${t.textMuted}`}>-</span>}
                        </td>
                        {/* CS / SDR */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-col gap-0.5">
                            {card.cs_name && <span className={`text-xs px-1.5 py-0.5 rounded-full w-fit ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>CS: {card.cs_name}</span>}
                            {card.sdr_name && <span className={`text-xs px-1.5 py-0.5 rounded-full w-fit ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>SDR: {card.sdr_name}</span>}
                            {!card.cs_name && !card.sdr_name && <span className={`text-xs ${t.textMuted}`}>-</span>}
                          </div>
                        </td>
                        {/* Saúde (engajamento) */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {eng ? (
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${eng.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${eng.dot}`} />
                              {eng.label}
                            </span>
                          ) : <span className={`text-xs ${t.textMuted}`}>-</span>}
                        </td>
                        {/* FUP */}
                        <td className="px-4 py-3">
                          {card.fup_date ? (
                            <div className="flex items-center gap-1.5">
                              {fupStatus === 'overdue' && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                              {fupStatus === 'today' && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
                              {(fupStatus === 'week' || fupStatus === 'month' || fupStatus === 'future') && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                              <span className={`text-xs font-medium ${
                                fupStatus === 'overdue' ? 'text-red-500' :
                                fupStatus === 'today' ? 'text-amber-600' :
                                t.textSub
                              }`}>
                                {new Date(card.fup_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                              {fupStatus === 'overdue' && <span className="text-xs text-red-500 font-semibold">Atrasado</span>}
                              {fupStatus === 'today' && <span className="text-xs text-amber-600 font-semibold">Hoje</span>}
                            </div>
                          ) : <span className={`text-xs ${t.textMuted}`}>-</span>}
                        </td>
                        {/* Próx. Contato */}
                        <td className="px-4 py-3 hidden xl:table-cell">
                          {card.next_contact_date ? (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${healthColors[getHealthStatus(card)]}`} />
                              <span className={`text-xs ${t.textSub}`}>
                                {new Date(card.next_contact_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          ) : <span className={`text-xs ${t.textMuted}`}>-</span>}
                        </td>
                        {/* Ações */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={e => { e.stopPropagation(); openEditCard(card); }}
                              className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub} hover:text-violet-600`}
                              title="Editar"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); deleteCard(card.id); }}
                              className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub} hover:text-red-500`}
                              title="Excluir"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── ADD/EDIT CARD MODAL ── */}
      {addCardStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md ${t.surface} rounded-2xl border ${t.border} shadow-2xl p-6`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`font-bold ${t.text}`}>{editingCard ? 'Editar Card' : 'Adicionar Cliente'}</h3>
              <button onClick={() => { setAddCardStage(null); setEditingCard(null); }} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub}`}><X size={16} /></button>
            </div>

            <div className="space-y-3">
              {/* Client name with search */}
              <div className="relative">
                <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Nome do Cliente *</label>
                <div className="relative">
                  <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                  <input
                    value={editingCard ? cardForm.client_name : clientSearch || cardForm.client_name}
                    onChange={e => {
                      const v = e.target.value;
                      if (!editingCard) { setClientSearch(v); setCardForm(p => ({ ...p, client_name: v })); }
                      else setCardForm(p => ({ ...p, client_name: v }));
                    }}
                    className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Buscar ou digitar nome..."
                  />
                </div>
                {!editingCard && clientSuggestions.length > 0 && (
                  <div className={`absolute z-10 w-full mt-1 ${t.surface} border ${t.border} rounded-xl shadow-xl overflow-hidden`}>
                    {searchingClients && <div className={`px-3 py-2 text-xs ${t.textMuted}`}>Buscando...</div>}
                    {clientSuggestions.map((c: any) => (
                      <button key={c.id} type="button"
                        onClick={() => {
                          setCardForm(p => ({ ...p, client_name: c.name || c.companyName || '', company_name: c.companyName || c.name || '', client_email: c.email || '' }));
                          setClientSearch('');
                          setClientSuggestions([]);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm ${t.surfaceHover} ${t.text} flex items-center gap-2`}
                      >
                        <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {(c.name || c.company_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{c.name || c.company_name}</div>
                          {c.email && <div className={`text-xs ${t.textMuted} truncate`}>{c.email}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Email</label>
                <input value={cardForm.client_email} onChange={e => setCardForm(p => ({ ...p, client_email: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                  placeholder="email@cliente.com" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>CS Responsável</label>
                  <input value={cardForm.cs_name} onChange={e => setCardForm(p => ({ ...p, cs_name: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Nome do CS" />
                </div>
                <div className="flex-1">
                  <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>SDR</label>
                  <input value={cardForm.sdr_name} onChange={e => setCardForm(p => ({ ...p, sdr_name: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Nome do SDR" />
                </div>
              </div>

              <div>
                <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Observações</label>
                <textarea value={cardForm.notes} onChange={e => setCardForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none`}
                  placeholder="Notas sobre este cliente..." />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => { setAddCardStage(null); setEditingCard(null); }}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium ${t.border} ${t.textSub}`}>Cancelar</button>
              <button onClick={saveCard} disabled={savingCard}
                className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                {savingCard ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingCard ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div> {/* fim da zona scrollável */}

      {/* ── CARD DETAIL / CS SIDEBAR ── */}
      {detailCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setDetailCard(null); setDetailContacts([]); setClientData(null); setClientExtraContacts([]); }} />
          {/* Modal centralizado */}
          <div className={`relative w-full max-w-3xl ${t.surface} border ${t.border} shadow-2xl flex flex-col rounded-2xl overflow-hidden`} style={{ maxHeight: '90vh' }}>

            {/* Header — estilo colaboradores */}
            <div className="px-5 pt-5 pb-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                    style={{ backgroundColor: stages.find(s => s.id === detailCard.stage_id)?.color || '#6366f1' }}>
                    {(detailCard.company_name || detailCard.client_name).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-bold text-base ${t.text} truncate`}>{detailCard.company_name || detailCard.client_name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {/* Status badge */}
                      {clientData ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          clientData.consolidatedStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          clientData.consolidatedStatus === 'trialing' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          isDark ? 'bg-gray-700 text-gray-400 border border-gray-600' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {clientData.consolidatedStatus === 'active' ? '✓ Ativo' :
                           clientData.consolidatedStatus === 'trialing' ? 'Trial' :
                           clientData.consolidatedStatus || 'Inativo'}
                        </span>
                      ) : null}
                      {/* Plano badge */}
                      {clientData?.plan && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          clientData.plan === 'growth' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' :
                          clientData.plan === 'rating' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          isDark ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {clientData.plan.charAt(0).toUpperCase() + clientData.plan.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {boards.length > 1 && (
                    <button onClick={() => { openMoveCard(detailCard); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-colors border ${
                        isDark ? 'border-indigo-500/50 bg-indigo-900/30 text-indigo-400 hover:bg-indigo-800/50' : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}>
                      <ArrowRightCircle size={12} />
                      Mover Fluxo
                    </button>
                  )}
                  <button onClick={() => { setDetailCard(null); setDetailContacts([]); setClientData(null); setClientExtraContacts([]); }}
                    className={`p-1.5 rounded-xl ${t.surfaceHover} ${t.textSub}`}><X size={16} /></button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-5 flex-shrink-0" style={{ borderColor: isDark ? '#1f2937' : '#e2e8f0' }}>
              {(['info', 'cs'] as const).map(tab => (
                <button key={tab} onClick={() => setDetailTab(tab as any)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    detailTab === tab ? 'border-emerald-500 text-emerald-500' : `border-transparent ${t.textSub}`
                  }`}>
                  {tab === 'info' ? (
                    <span className="flex items-center gap-1.5"><User size={13} /> Informações</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><HeartHandshake size={13} /> Acompanhamento CS</span>
                  )}
                </button>
              ))}
            </div>

            {/* Etapa atual no fluxo */}
            <div className={`px-5 py-2 flex items-center gap-2 text-xs ${t.textMuted} border-b flex-shrink-0`} style={{ borderColor: isDark ? '#1f2937' : '#e2e8f0' }}>
              <span>Fluxo:</span>
              <span className={`font-medium ${t.text}`}>{activeBoard?.name || 'Kanban'}</span>
              <span>→</span>
              <span className="font-medium" style={{ color: stages.find(s => s.id === detailCard.stage_id)?.color }}>
                {stages.find(s => s.id === detailCard.stage_id)?.emoji} {stages.find(s => s.id === detailCard.stage_id)?.name || 'Etapa'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detailTab === 'cs' && (
                <div className="space-y-5">
                  {/* CS Config */}
                  <div className={`p-4 rounded-xl border ${t.border} space-y-3`}>
                    <h4 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Calendar size={14} className="text-emerald-500" /> Configuração de Contato</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Próximo Contato</label>
                        <input type="date" value={csConfig.next_contact_date}
                          onChange={e => setCsConfig(p => ({ ...p, next_contact_date: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-emerald-500`} />
                      </div>
                      <div>
                        <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Frequência</label>
                        <select value={csConfig.contact_frequency}
                          onChange={e => {
                            const newFreq = e.target.value;
                            setCsConfig(p => ({
                              ...p,
                              contact_frequency: newFreq,
                              // Auto-recalculate next date when frequency changes
                              next_contact_date: calcNextContactDate(newFreq),
                            }));
                          }}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-emerald-500`}>
                          <option value="weekly">Semanal (7 dias)</option>
                          <option value="biweekly">Quinzenal (15 dias)</option>
                          <option value="monthly">Mensal (30 dias)</option>
                          <option value="quarterly">Trimestral (90 dias)</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={saveCsConfig} disabled={savingCs}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                      {savingCs ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Salvar Configuração
                    </button>
                  </div>

                  {/* New Contact Log */}
                  <div className={`p-4 rounded-xl border ${t.border} space-y-3`}>
                    <h4 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Phone size={14} className="text-blue-500" /> Registrar Contato</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Data</label>
                        <input type="date" value={contactForm.contact_date}
                          onChange={e => setContactForm(p => ({ ...p, contact_date: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`} />
                      </div>
                      <div>
                        <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Tipo</label>
                        <select value={contactForm.contact_type}
                          onChange={e => setContactForm(p => ({ ...p, contact_type: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                          <option value="call">📞 Ligação</option>
                          <option value="whatsapp">💬 WhatsApp</option>
                          <option value="meeting">🎥 Reunião</option>
                          <option value="email">📧 Email</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Responsável</label>
                      <select value={contactForm.responsible}
                        onChange={e => setContactForm(p => ({ ...p, responsible: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500`}>
                        <option value="">Selecionar responsável...</option>
                        {colaboradores.map(col => (
                          <option key={col.id} value={col.name}>{col.name} ({col.role === 'cs' ? 'CS' : col.role === 'sdr' ? 'SDR' : col.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Observações</label>
                      <textarea value={contactForm.notes}
                        onChange={e => setContactForm(p => ({ ...p, notes: e.target.value }))}
                        rows={2}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
                        placeholder="O que foi discutido?" />
                    </div>
                    <button onClick={saveContact} disabled={savingContact}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                      {savingContact ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                      Registrar Contato
                    </button>
                  </div>

                  {/* Contact History */}
                  <div>
                    <h4 className={`text-sm font-semibold ${t.text} mb-3 flex items-center gap-2`}><Clock size={14} className="text-slate-400" /> Histórico de Contatos</h4>
                    {loadingContacts ? (
                      <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                    ) : detailContacts.length === 0 ? (
                      <div className={`text-center py-8 ${t.textMuted} text-sm`}>Nenhum contato registrado ainda.</div>
                    ) : (
                      <div className="space-y-2">
                        {detailContacts.map(contact => (
                          <div key={contact.id} className={`flex items-start gap-3 p-3 rounded-xl border ${t.border} ${t.surface}`}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6366f122' }}>
                              {contact.contact_type === 'call' && <Phone size={14} className="text-indigo-500" />}
                              {contact.contact_type === 'whatsapp' && <MessageCircle size={14} className="text-emerald-500" />}
                              {contact.contact_type === 'meeting' && <Video size={14} className="text-blue-500" />}
                              {contact.contact_type === 'email' && <Mail size={14} className="text-amber-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-sm font-medium ${t.text}`}>
                                  {contact.contact_type === 'call' ? 'Ligação' : contact.contact_type === 'whatsapp' ? 'WhatsApp' : contact.contact_type === 'meeting' ? 'Reunião' : 'Email'}
                                  {contact.responsible && ` · ${contact.responsible}`}
                                </span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className={`text-xs ${t.textMuted}`}>{new Date(contact.contact_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                  <button onClick={() => deleteContact(contact.id)} className={`p-1 rounded ${t.surfaceHover} ${t.textMuted} hover:text-red-500`}><Trash2 size={11} /></button>
                                </div>
                              </div>
                              {contact.notes && <p className={`text-xs ${t.textMuted} mt-0.5`}>{contact.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailTab === 'info' && (
                <div className="space-y-3">

                  {/* Loading */}
                  {loadingClientData && (
                    <div className={`flex items-center gap-2 py-2`}>
                      <Loader2 size={14} className="animate-spin text-violet-500" />
                      <span className={`text-xs ${t.textSub}`}>Buscando dados...</span>
                    </div>
                  )}

                  {/* Contato */}
                  <div className={`rounded-2xl border ${t.border} overflow-hidden`}>
                    <div className={`px-4 py-3 flex items-center gap-2 border-b ${t.border} ${isDark ? 'bg-gray-800/50' : 'bg-slate-50'}`}>
                      <User size={14} className="text-emerald-500" />
                      <span className={`text-xs font-semibold ${t.text}`}>Contato</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {/* Email */}
                      <div className="flex items-center gap-2">
                        <Mail size={13} className={t.textMuted} />
                        <span className={`text-sm ${t.text} flex-1`}>{detailCard.client_email || '—'}</span>
                        {detailCard.client_email && (
                          <button onClick={() => navigator.clipboard.writeText(detailCard.client_email || '')}
                            className={`p-1 rounded ${t.surfaceHover} ${t.textMuted} hover:text-violet-500`} title="Copiar">
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                      {/* Empresa */}
                      {(clientData?.companyName || detailCard.company_name) && (
                        <div className="flex items-center gap-2">
                          <Building2 size={13} className={t.textMuted} />
                          <span className={`text-sm ${t.text}`}>{clientData?.companyName || detailCard.company_name}</span>
                        </div>
                      )}
                      {/* Telefone editável */}
                      <div className="flex items-center gap-2">
                        <Phone size={13} className={t.textMuted} />
                        <input value={infoForm.client_phone}
                          onChange={e => setInfoForm(p => ({ ...p, client_phone: e.target.value }))}
                          className={`flex-1 px-2 py-1 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                          placeholder="(47) 99999-9999" />
                      </div>
                    </div>
                  </div>

                  {/* Métricas rápidas */}
                  {clientData && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`rounded-2xl border ${t.border} p-3`}>
                        <span className={`text-xs ${t.textMuted} block mb-1`}>Health Score</span>
                        <span className={`text-lg font-bold ${t.text}`}>{clientData.healthScore ?? '—'}</span>
                      </div>
                      <div className={`rounded-2xl border ${t.border} p-3`}>
                        <span className={`text-xs ${t.textMuted} block mb-1`}>Empresas</span>
                        <span className={`text-lg font-bold ${t.text}`}>{clientData.companyCount ?? 0}</span>
                      </div>
                      <div className={`rounded-2xl border ${t.border} p-3`}>
                        <span className={`text-xs ${t.textMuted} block mb-1`}>Anotações</span>
                        <span className={`text-lg font-bold ${t.text}`}>{clientData.notesCount ?? 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Histórico */}
                  <div className={`rounded-2xl border ${t.border} overflow-hidden`}>
                    <div className={`px-4 py-3 flex items-center gap-2 border-b ${t.border} ${isDark ? 'bg-gray-800/50' : 'bg-slate-50'}`}>
                      <Calendar size={14} className="text-blue-500" />
                      <span className={`text-xs font-semibold ${t.text}`}>Histórico</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${t.textSub}`}>Cadastro</span>
                        <span className={`text-sm font-medium ${t.text}`}>
                          {clientData?.createdAt ? new Date(clientData.createdAt).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${t.textSub}`}>Último acesso</span>
                        <span className={`text-sm font-medium ${t.text}`}>
                          {clientData?.lastLogin
                            ? new Date(clientData.lastLogin).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : 'Nunca'}
                        </span>
                      </div>
                      {clientData?.trialEnd && (
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${t.textSub}`}>Fim do trial</span>
                          <span className={`text-sm font-medium ${t.text}`}>
                            {new Date(clientData.trialEnd).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                      {clientData?.subscriptionStart && (
                        <div className="flex items-center justify-between">
                          <span className={`text-sm ${t.textSub}`}>Início assinatura</span>
                          <span className={`text-sm font-medium ${t.text}`}>
                            {new Date(clientData.subscriptionStart).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status de Engajamento */}
                  <div className={`rounded-2xl border ${t.border} overflow-hidden`}>
                    <div className={`px-4 py-3 flex items-center gap-2 border-b ${t.border} ${isDark ? 'bg-gray-800/50' : 'bg-slate-50'}`}>
                      <Activity size={14} className="text-violet-500" />
                      <span className={`text-xs font-semibold ${t.text}`}>Status de Engajamento</span>
                    </div>
                    <div className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Opção: sem status */}
                        <button
                          onClick={() => setInfoForm(p => ({ ...p, health_status: '' }))}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                            !infoForm.health_status
                              ? (isDark ? 'border-gray-500 bg-gray-700 text-white' : 'border-slate-400 bg-slate-100 text-slate-700')
                              : `${t.border} ${t.textSub} ${t.surfaceHover}`
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-gray-400" />
                          Sem status
                        </button>
                        {ENGAGEMENT_STATUS.map(eng => (
                          <button
                            key={eng.value}
                            onClick={() => setInfoForm(p => ({ ...p, health_status: eng.value as EngagementValue }))}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                              infoForm.health_status === eng.value
                                ? `${eng.badge} border-current`
                                : `${t.border} ${t.textSub} ${t.surfaceHover}`
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${eng.dot}`} />
                            {eng.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Equipe Responsável */}
                  <div className={`rounded-2xl border ${t.border} overflow-hidden`}>
                    <div className={`px-4 py-3 flex items-center gap-2 border-b ${t.border} ${isDark ? 'bg-gray-800/50' : 'bg-slate-50'}`}>
                      <Activity size={14} className="text-violet-500" />
                      <span className={`text-xs font-semibold ${t.text}`}>Equipe Responsável</span>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      {/* SDR */}
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-sm ${t.textSub} flex-shrink-0`}>SDR (Captação)</span>
                        <select value={infoForm.sdr_name}
                          onChange={e => setInfoForm(p => ({ ...p, sdr_name: e.target.value }))}
                          className={`flex-1 px-2 py-1 rounded-lg border text-sm font-medium ${t.input} focus:outline-none focus:ring-1 focus:ring-violet-500 text-right`}>
                          <option value="">Selecionar...</option>
                          {colaboradores.filter(c => c.role === 'sdr' || c.role === 'gerente').map(col => (
                            <option key={col.id} value={col.name}>{col.name}</option>
                          ))}
                        </select>
                      </div>
                      {/* CS */}
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-sm ${t.textSub} flex-shrink-0`}>CS (Sucesso)</span>
                        <select value={infoForm.cs_name}
                          onChange={e => setInfoForm(p => ({ ...p, cs_name: e.target.value }))}
                          className={`flex-1 px-2 py-1 rounded-lg border text-sm font-medium ${t.input} focus:outline-none focus:ring-1 focus:ring-violet-500 text-right`}>
                          <option value="">Selecionar...</option>
                          {colaboradores.filter(c => c.role === 'cs' || c.role === 'gerente').map(col => (
                            <option key={col.id} value={col.name}>{col.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Contatos Extras */}
                  {clientExtraContacts.length > 0 && (
                    <div className={`rounded-2xl border ${t.border} overflow-hidden`}>
                      <div className={`px-4 py-3 flex items-center gap-2 border-b ${t.border} ${isDark ? 'bg-gray-800/50' : 'bg-slate-50'}`}>
                        <Users2 size={14} className="text-indigo-500" />
                        <span className={`text-xs font-semibold ${t.text}`}>Contatos da Empresa</span>
                        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} font-medium`}>{clientExtraContacts.length}</span>
                      </div>
                      <div className="px-4 py-3 space-y-3">
                        {clientExtraContacts.map((c: any, idx: number) => (
                          <div key={idx} className={`rounded-xl border ${t.border} p-3 space-y-1.5`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-semibold ${t.text}`}>{c.name || 'Sem nome'}</span>
                              {c.role && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-slate-100 text-slate-600'}`}>{c.role}</span>}
                            </div>
                            {c.phone && (
                              <div className="flex items-center gap-2">
                                <Phone size={11} className={t.textMuted} />
                                <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-emerald-500 hover:underline">{c.phone}</a>
                              </div>
                            )}
                            {c.email && (
                              <div className="flex items-center gap-2">
                                <Mail size={11} className={t.textMuted} />
                                <span className={`text-xs ${t.textSub}`}>{c.email}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observações */}
                  <div>
                    <textarea value={infoForm.notes}
                      onChange={e => setInfoForm(p => ({ ...p, notes: e.target.value }))}
                      rows={6}
                      className={`w-full px-3 py-2 rounded-2xl border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none`}
                      placeholder="Observações sobre este cliente..." />
                  </div>

                </div>
              )}
            </div>

            {/* Sticky footer: save button for info tab */}
            {detailTab === 'info' && (
              <div className="px-6 py-4 border-t" style={{ borderColor: isDark ? '#1f2937' : '#e2e8f0' }}>
                <button onClick={saveInfoForm} disabled={savingInfo}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                  {savingInfo ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Salvar Informações
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MOVE TO BOARD MODAL ── */}
      {movingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md ${t.surface} rounded-2xl border ${t.border} shadow-2xl p-6`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`font-bold ${t.text}`}>Mover para outro Fluxo</h3>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>{movingCard.client_name}</p>
              </div>
              <button onClick={() => setMovingCard(null)} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub}`}><X size={16} /></button>
            </div>
            <div className="space-y-2 mb-5">
              {boards.filter(b => b.id !== activeBoardId).map(board => (
                <button key={board.id} onClick={() => setMoveTargetBoardId(board.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    moveTargetBoardId === board.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : `${t.border} ${t.surfaceHover}`
                  }`}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: board.color || '#6366f1' }} />
                  <span className={`text-sm font-medium ${t.text}`}>{board.name}</span>
                  {moveTargetBoardId === board.id && <Check size={14} className="ml-auto text-indigo-600" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMovingCard(null)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium ${t.border} ${t.textSub}`}>Cancelar</button>
              <button onClick={confirmMoveCard} disabled={!moveTargetBoardId || savingCard}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                {savingCard ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightCircle size={14} />}
                Mover
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
