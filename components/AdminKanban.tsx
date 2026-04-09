import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, X, GripVertical, ChevronDown,
  ChevronUp, Pencil, Check, AlertCircle, Loader2, Search,
  Kanban, SlidersHorizontal, LayoutDashboard,
  Phone, MessageCircle, Video, Mail, Calendar, Clock,
  ArrowRightCircle, Bell, HeartHandshake, ChevronRight,
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
  client_email?: string;
  client_phone?: string;
  cs_name?: string;
  sdr_name?: string;
  notes?: string;
  position: number;
  next_contact_date?: string;
  contact_frequency?: string;
  health_status?: string;
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
  const [cardForm, setCardForm] = useState({ client_name: '', client_email: '', cs_name: '', sdr_name: '', notes: '' });
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
  const [infoForm, setInfoForm] = useState({ cs_name: '', sdr_name: '', client_phone: '', notes: '' });
  const [savingInfo, setSavingInfo] = useState(false);

  // Client search for add card
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);

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
    setCardForm({ client_name: '', client_email: '', cs_name: '', sdr_name: '', notes: '' });
    setClientSearch('');
    setClientSuggestions([]);
  };

  const openEditCard = (card: Card) => {
    setEditingCard(card);
    setAddCardStage(card.stage_id);
    setCardForm({
      client_name: card.client_name,
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
        const res = await fetch('/api/admin/kanban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'card', stage_id: addCardStage, board_id: activeBoardId, ...cardForm }),
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
    setDetailTab('cs');
    const freq = card.contact_frequency || 'weekly';
    // If no next_contact_date set yet, auto-calculate based on frequency
    const nextDate = card.next_contact_date || calcNextContactDate(freq);
    setCsConfig({
      next_contact_date: nextDate,
      contact_frequency: freq,
    });
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
    });
    setLoadingContacts(true);
    setDetailContacts([]);
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
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Erro desconhecido');
      const updated: Card = { ...detailCard, cs_name: infoForm.cs_name || undefined, sdr_name: infoForm.sdr_name || undefined, client_phone: infoForm.client_phone || undefined, notes: infoForm.notes || undefined, ...(json.data || {}) };
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

  const stageCards = (stageId: string) =>
    cards.filter(c => c.stage_id === stageId).sort((a, b) => a.position - b.position);

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
    <main className={`w-full min-w-0 min-h-screen ${t.bg} px-6 py-6`}>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow">
            <Kanban size={18} className="text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${t.text}`}>Kanban CS</h1>
            <p className={`text-xs ${t.textMuted}`}>{stages.length} etapas · {cards.length} clientes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(alerts.overdue.length > 0 || alerts.dueToday.length > 0) && (
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${showAlerts ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-300 text-amber-600 hover:bg-amber-50'}`}
            >
              <Bell size={15} />
              Alertas
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                {alerts.overdue.length + alerts.dueToday.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setView(view === 'boards' ? 'board' : 'boards')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${view === 'boards' ? 'bg-indigo-600 text-white border-indigo-600' : `${t.border} ${t.textSub} hover:text-indigo-600`}`}
          >
            <LayoutDashboard size={15} />
            Fluxos ({boards.length})
          </button>
          <button
            onClick={() => setView(view === 'settings' ? 'board' : 'settings')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${view === 'settings' ? 'bg-violet-600 text-white border-violet-600' : `${t.border} ${t.textSub} hover:text-violet-600`}`}
          >
            <SlidersHorizontal size={15} />
            {view === 'settings' ? 'Ver Board' : 'Etapas'}
          </button>
        </div>
      </div>

      {/* Alerts Panel */}
      {showAlerts && view === 'board' && (
        <div className={`mb-4 ${t.surface} rounded-2xl border border-amber-200 p-4`}>
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
                      {card.client_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium ${t.text} truncate block`}>{card.client_name}</span>
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
                      {card.client_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium ${t.text} truncate block`}>{card.client_name}</span>
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

      {/* Board tabs */}
      {view === 'board' && boards.length > 1 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {boards.map(board => (
            <button
              key={board.id}
              onClick={() => switchBoard(board.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${activeBoardId === board.id
                ? 'text-white border-transparent shadow-md'
                : `${t.border} ${t.textSub} hover:border-violet-400`
              }`}
              style={activeBoardId === board.id ? { backgroundColor: board.color } : {}}
            >
              {board.name}
              {board.is_default && <span className="text-xs opacity-70">(padrão)</span>}
            </button>
          ))}
        </div>
      )}

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

      {/* ── BOARD VIEW ── */}
      {view === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
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
                      className={`group relative rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all duration-150 ${t.cardBg} ${t.border} shadow-sm hover:shadow-md ${draggingCard?.id === card.id ? 'opacity-40 scale-95' : ''} ${dragOverCard === card.id ? 'border-t-2' : ''}`}
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
                              {card.client_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-sm font-semibold ${t.text} truncate`}>{card.client_name}</div>
                              {card.client_email && <div className={`text-xs ${t.textMuted} truncate`}>{card.client_email}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openCardDetail(card)} className={`p-1 rounded ${t.surfaceHover} ${t.textSub} hover:text-emerald-600`} title="Acompanhamento CS"><HeartHandshake size={11} /></button>
                            <button onClick={() => openEditCard(card)} className={`p-1 rounded ${t.surfaceHover} ${t.textSub} hover:text-violet-600`}><Pencil size={11} /></button>
                            {stages[stages.length - 1]?.id === stage.id && boards.length > 1 && (
                              <button onClick={() => openMoveCard(card)} className={`p-1 rounded ${t.surfaceHover} ${t.textSub} hover:text-indigo-600`} title="Mover para outro fluxo"><ArrowRightCircle size={11} /></button>
                            )}
                            <button onClick={() => deleteCard(card.id)} className={`p-1 rounded ${t.surfaceHover} ${t.textSub} hover:text-red-500`}><Trash2 size={11} /></button>
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

                        {/* Health indicator */}
                        {card.next_contact_date && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${healthColors[getHealthStatus(card)]}`} />
                            <span className={`text-xs ${t.textMuted}`}>
                              {healthLabels[getHealthStatus(card)]} · {new Date(card.next_contact_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}

                        {/* Quick move to Acompanhamento - only in Onboarding board */}
                        {activeBoardId !== ACOMPANHAMENTO_BOARD_ID && (
                          <button
                            onClick={e => { e.stopPropagation(); moveToAcompanhamento(card); }}
                            className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isDark
                                ? 'bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 border border-emerald-800/50'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                            title="Mover para Acompanhamento CS">
                            <HeartHandshake size={11} />
                            Ir para Acompanhamento
                          </button>
                        )}
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
                          setCardForm(p => ({ ...p, client_name: c.name || c.company_name || '', client_email: c.email || '' }));
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
      {/* ── CARD DETAIL / CS MODAL ── */}
      {detailCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`w-full max-w-2xl ${t.surface} rounded-2xl border ${t.border} shadow-2xl flex flex-col`} style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: isDark ? '#1f2937' : '#e2e8f0' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: stages.find(s => s.id === detailCard.stage_id)?.color || '#6366f1' }}>
                  {detailCard.client_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className={`font-bold ${t.text}`}>{detailCard.client_name}</h3>
                  <p className={`text-xs ${t.textMuted}`}>{detailCard.client_email || 'Sem email'} · {stages.find(s => s.id === detailCard.stage_id)?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Only show if we're in Onboarding board */}
                {activeBoardId !== ACOMPANHAMENTO_BOARD_ID && (
                  <button
                    onClick={moveToAcompanhamento}
                    disabled={savingCard}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                    title="Mover para Acompanhamento CS">
                    {savingCard ? <Loader2 size={12} className="animate-spin" /> : <HeartHandshake size={12} />}
                    Ir para Acompanhamento
                  </button>
                )}
                <button onClick={() => { setDetailCard(null); setDetailContacts([]); }} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub}`}><X size={16} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: isDark ? '#1f2937' : '#e2e8f0' }}>
              {(['cs', 'info'] as const).map(tab => (
                <button key={tab} onClick={() => setDetailTab(tab)}
                  className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    detailTab === tab ? 'border-emerald-500 text-emerald-600' : `border-transparent ${t.textSub} hover:${t.text}`
                  }`}>
                  {tab === 'cs' ? '💚 Acompanhamento CS' : '📋 Informações'}
                </button>
              ))}
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
                                  {contact.responsible_name && ` · ${contact.responsible_name}`}
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
                <div className="space-y-4">
                  {/* Email (read-only) */}
                  <div className={`p-4 rounded-xl border ${t.border}`}>
                    <p className={`text-xs font-medium ${t.textSub} mb-1`}>Email</p>
                    <p className={`text-sm ${t.text}`}>{detailCard.client_email || '—'}</p>
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Telefone / WhatsApp</label>
                    <input value={infoForm.client_phone}
                      onChange={e => setInfoForm(p => ({ ...p, client_phone: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      placeholder="(47) 99999-9999" />
                  </div>

                  {/* CS Responsável */}
                  <div>
                    <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>CS Responsável</label>
                    <select value={infoForm.cs_name}
                      onChange={e => setInfoForm(p => ({ ...p, cs_name: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-indigo-500`}>
                      <option value="">Selecionar CS...</option>
                      {colaboradores.filter(c => c.role === 'cs' || c.role === 'gerente').map(col => (
                        <option key={col.id} value={col.name}>{col.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* SDR */}
                  <div>
                    <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>SDR</label>
                    <select value={infoForm.sdr_name}
                      onChange={e => setInfoForm(p => ({ ...p, sdr_name: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-indigo-500`}>
                      <option value="">Selecionar SDR...</option>
                      {colaboradores.filter(c => c.role === 'sdr' || c.role === 'gerente').map(col => (
                        <option key={col.id} value={col.name}>{col.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>Observações</label>
                    <textarea value={infoForm.notes}
                      onChange={e => setInfoForm(p => ({ ...p, notes: e.target.value }))}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none`}
                      placeholder="Notas sobre este cliente..." />
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
