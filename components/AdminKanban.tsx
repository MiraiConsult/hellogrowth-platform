'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Settings, Trash2, X, GripVertical, User, ChevronDown,
  ChevronUp, Pencil, Check, AlertCircle, Loader2, Search,
  Kanban, SlidersHorizontal, ArrowLeft,
} from 'lucide-react';

interface Stage {
  id: string;
  name: string;
  color: string;
  emoji: string;
  position: number;
  responsible: string;
  description: string;
}

interface Card {
  id: string;
  stage_id: string;
  user_id?: string;
  client_name: string;
  client_email?: string;
  cs_name?: string;
  sdr_name?: string;
  notes?: string;
  position: number;
  created_at: string;
  updated_at: string;
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

  const [stages, setStages] = useState<Stage[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'board' | 'settings'>('board');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Drag state
  const [draggingCard, setDraggingCard] = useState<Card | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [dragOverCard, setDragOverCard] = useState<string | null>(null);

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

  // Client search for add card
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kanban?action=all');
      const data = await res.json();
      setStages(data.stages || []);
      setCards(data.cards || []);
    } catch {
      showToast('error', 'Erro ao carregar Kanban');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  // ── DRAG & DROP ──────────────────────────────────────────────────────────────
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

    // Optimistic update
    const updatedCards = cards.map(c => {
      if (c.id === draggingCard.id) return { ...c, stage_id: targetStageId, position: newPosition };
      return c;
    });
    setCards(updatedCards);
    setDraggingCard(null);

    // Persist
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
          body: JSON.stringify({ type: 'card', stage_id: addCardStage, ...cardForm }),
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
    } catch { showToast('error', 'Erro ao remover card'); fetchData(); }
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
          body: JSON.stringify({ type: 'stage', ...stageForm, position: stages.length }),
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

  const deleteStage = async (id: string) => {
    if (!confirm('Remover esta etapa? Os cards serão desvinculados.')) return;
    setStages(prev => prev.filter(s => s.id !== id));
    try {
      await fetch(`/api/admin/kanban?type=stage&id=${id}`, { method: 'DELETE' });
      showToast('success', 'Etapa removida');
    } catch { showToast('error', 'Erro ao remover etapa'); fetchData(); }
  };

  const stageCards = (stageId: string) =>
    cards.filter(c => c.stage_id === stageId).sort((a, b) => a.position - b.position);

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
      <div className="flex items-center justify-between mb-6">
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
          <button
            onClick={() => setView(view === 'board' ? 'settings' : 'board')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${view === 'settings' ? 'bg-violet-600 text-white border-violet-600' : `${t.border} ${t.textSub} hover:text-violet-600`}`}
          >
            <SlidersHorizontal size={15} />
            {view === 'settings' ? 'Ver Board' : 'Configurar Etapas'}
          </button>
        </div>
      </div>

      {/* ── SETTINGS VIEW ── */}
      {view === 'settings' && (
        <div className={`${t.surface} rounded-2xl border ${t.border} p-6`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className={`text-base font-bold ${t.text}`}>Etapas do Kanban</h2>
            <button
              onClick={() => { setShowAddStage(true); setEditingStage(null); setStageForm({ name: '', color: '#6366f1', emoji: '📋', responsible: 'nos', description: '' }); }}
              className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={14} /> Nova Etapa
            </button>
          </div>

          <div className="space-y-3">
            {stages.map((stage, idx) => (
              <div key={stage.id} className={`flex items-center gap-4 p-4 rounded-xl border ${t.border} ${t.surface}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: stage.color + '22' }}>
                  {stage.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${t.text}`}>Etapa {idx + 1} — {stage.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RESPONSIBLE_COLORS[stage.responsible] || 'bg-slate-100 text-slate-600'}`}>
                      {RESPONSIBLE_LABELS[stage.responsible] || stage.responsible}
                    </span>
                  </div>
                  {stage.description && <p className={`text-xs ${t.textMuted} mt-0.5`}>{stage.description}</p>}
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: stage.color }} />
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditStage(stage)} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub} hover:text-violet-600 transition-colors`}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteStage(stage.id)} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textSub} hover:text-red-500 transition-colors`}>
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
        </div>
      )}

      {/* ── BOARD VIEW ── */}
      {view === 'board' && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 160px)' }}>
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
                <div className="flex-1 px-3 pb-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
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
                      {/* Drag handle */}
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
                            <button onClick={() => openEditCard(card)} className={`p-1 rounded ${t.surfaceHover} ${t.textSub} hover:text-violet-600`}><Pencil size={11} /></button>
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
                      </div>
                    </div>
                  ))}

                  {/* Drop zone when empty */}
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
                    placeholder="Buscar ou digitar nome do cliente..."
                  />
                  {searchingClients && <Loader2 size={13} className={`absolute right-3 top-1/2 -translate-y-1/2 animate-spin ${t.textMuted}`} />}
                </div>
                {clientSuggestions.length > 0 && !editingCard && (
                  <div className={`absolute z-10 w-full mt-1 rounded-xl border shadow-xl overflow-hidden ${t.surface} ${t.border}`}>
                    {clientSuggestions.map((c: any) => (
                      <button key={c.id} onClick={() => {
                        setCardForm(p => ({
                          ...p,
                          client_name: c.name || c.email,
                          client_email: c.email || '',
                          cs_name: c.csName || '',
                          sdr_name: c.sdrName || '',
                        }));
                        setClientSearch('');
                        setClientSuggestions([]);
                      }}
                        className={`w-full text-left px-4 py-2.5 text-sm ${t.surfaceHover} transition-colors`}>
                        <div className={`font-medium ${t.text}`}>{c.name || c.email}</div>
                        {c.email && <div className={`text-xs ${t.textMuted}`}>{c.email}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>E-mail</label>
                <input value={cardForm.client_email} onChange={e => setCardForm(p => ({ ...p, client_email: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                  placeholder="email@cliente.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${t.textSub} mb-1 block`}>CS Responsável</label>
                  <input value={cardForm.cs_name} onChange={e => setCardForm(p => ({ ...p, cs_name: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    placeholder="Nome do CS" />
                </div>
                <div>
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
                  className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${t.input} focus:outline-none focus:ring-2 focus:ring-violet-500`}
                  placeholder="Notas internas sobre este cliente..." />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => { setAddCardStage(null); setEditingCard(null); }}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium ${t.border} ${t.textSub}`}>Cancelar</button>
              <button onClick={saveCard} disabled={savingCard}
                className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
                {savingCard ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingCard ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
