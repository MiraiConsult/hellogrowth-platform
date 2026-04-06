'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  X, User, Mail, Phone, Building2, Calendar, Clock, Heart,
  FileText, Plus, Trash2, Edit2, Save, XCircle, Tag,
  TrendingUp, CheckCircle, AlertTriangle, AlertCircle,
  CreditCard, Star, Activity, MessageSquare, ChevronRight,
  Loader2, ExternalLink, Copy, Check
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  plan: string;
  subscription_status: string;
  trial_model?: string | null;
  trial_end_at?: string | null;
  daysRemaining?: number | null;
  paymentLinkUrl?: string | null;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: string;
  companyName?: string;
  createdAt: string;
  lastLogin?: string | null;
  settings?: Record<string, any>;
  companies: Company[];
  primaryCompany: Company | null;
  consolidatedStatus: string;
  consolidatedTrialModel: string | null;
  consolidatedDaysRemaining: number | null;
  tenantId?: string | null;
  sdrName?: string | null;
  csName?: string | null;
  internalNotes?: string | null;
}

interface Note {
  id: string;
  user_id: string;
  admin_id: string;
  admin_name: string;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface ClientProfileProps {
  client: Client | null;
  isDark: boolean;
  onClose: () => void;
  adminName?: string;
}

const NOTE_TYPES = [
  { value: 'note', label: 'Anotação', color: 'bg-blue-500', icon: '📝' },
  { value: 'call', label: 'Ligação', color: 'bg-green-500', icon: '📞' },
  { value: 'meeting', label: 'Reunião', color: 'bg-purple-500', icon: '🤝' },
  { value: 'warning', label: 'Alerta', color: 'bg-red-500', icon: '⚠️' },
  { value: 'task', label: 'Tarefa', color: 'bg-yellow-500', icon: '✅' },
];

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  return formatDate(dateStr);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active': return { label: 'Ativo', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', icon: <CheckCircle size={12} /> };
    case 'trialing': return { label: 'Trial', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', icon: <Clock size={12} /> };
    case 'trial_expired': return { label: 'Trial Expirado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', icon: <AlertTriangle size={12} /> };
    case 'past_due': return { label: 'Inadimplente', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400', icon: <AlertCircle size={12} /> };
    case 'canceled': return { label: 'Cancelado', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: <XCircle size={12} /> };
    default: return { label: status, cls: 'bg-gray-100 text-gray-600', icon: null };
  }
}

function getPlanLabel(plan: string) {
  switch (plan) {
    case 'growth': return { label: 'Growth', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' };
    case 'rating': return { label: 'Rating', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
    case 'growth_lifetime': return { label: 'Growth Lifetime', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
    case 'trial': return { label: 'Trial', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
    default: return { label: plan, cls: 'bg-gray-100 text-gray-600' };
  }
}

function getHealthColor(score: number | null | undefined) {
  if (score == null) return 'text-gray-400';
  if (score >= 70) return 'text-emerald-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

export default function ClientProfile({ client, isDark, onClose, adminName = 'Admin' }: ClientProfileProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newNoteType, setNewNoteType] = useState('note');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'companies'>('info');

  const t = isDark ? {
    bg: 'bg-gray-900',
    surface: 'bg-gray-800',
    surfaceHover: 'hover:bg-gray-700/50',
    border: 'border-gray-700',
    text: 'text-white',
    muted: 'text-gray-400',
    input: 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:ring-emerald-500',
    tab: 'text-gray-400 hover:text-white',
    tabActive: 'text-white border-b-2 border-emerald-500',
    noteCard: 'bg-gray-800 border-gray-700',
  } : {
    bg: 'bg-white',
    surface: 'bg-gray-50',
    surfaceHover: 'hover:bg-gray-100',
    border: 'border-gray-200',
    text: 'text-gray-900',
    muted: 'text-gray-500',
    input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-emerald-500',
    tab: 'text-gray-500 hover:text-gray-900',
    tabActive: 'text-gray-900 border-b-2 border-emerald-500',
    noteCard: 'bg-white border-gray-200',
  };

  const fetchNotes = useCallback(async () => {
    if (!client) return;
    setLoadingNotes(true);
    try {
      const res = await fetch(`/api/admin/client-notes?userId=${client.id}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotes(false);
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      fetchNotes();
      setActiveTab('info');
      setNewNote('');
    }
  }, [client, fetchNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !client) return;
    setSavingNote(true);
    try {
      const res = await fetch('/api/admin/client-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: client.id,
          adminId: 'admin',
          adminName,
          content: newNote.trim(),
          type: newNoteType,
        }),
      });
      const data = await res.json();
      if (data.note) {
        setNotes(prev => [data.note, ...prev]);
        setNewNote('');
        setNewNoteType('note');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    await fetch(`/api/admin/client-notes?id=${id}`, { method: 'DELETE' });
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleEditNote = async (id: string) => {
    if (!editContent.trim()) return;
    const res = await fetch('/api/admin/client-notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content: editContent }),
    });
    const data = await res.json();
    if (data.note) {
      setNotes(prev => prev.map(n => n.id === id ? data.note : n));
      setEditingNoteId(null);
    }
  };

  const copyEmail = () => {
    if (client?.email) {
      navigator.clipboard.writeText(client.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!client) return null;

  const statusBadge = getStatusBadge(client.consolidatedStatus);
  const planBadge = getPlanLabel(client.plan);
  const healthScore = client.settings?.health_score ?? null;
  const initials = client.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-xl z-50 shadow-2xl flex flex-col ${t.bg} border-l ${t.border}`}>

        {/* Header */}
        <div className={`flex items-start justify-between px-6 py-5 border-b ${t.border}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
              {initials}
            </div>
            <div>
              <h2 className={`text-lg font-bold ${t.text}`}>{client.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge.cls}`}>
                  {statusBadge.icon}{statusBadge.label}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${planBadge.cls}`}>
                  {planBadge.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl ${t.surfaceHover} ${t.muted} transition-colors`}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${t.border} px-6`}>
          {[
            { id: 'info', label: 'Informações', icon: <User size={14} /> },
            { id: 'notes', label: `Anotações${notes.length > 0 ? ` (${notes.length})` : ''}`, icon: <MessageSquare size={14} /> },
            { id: 'companies', label: `Empresas${client.companies.length > 0 ? ` (${client.companies.length})` : ''}`, icon: <Building2 size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? t.tabActive : t.tab}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── INFO TAB ── */}
          {activeTab === 'info' && (
            <div className="p-6 space-y-5">

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`${t.surface} rounded-xl p-3 border ${t.border}`}>
                  <div className={`text-xs ${t.muted} mb-1`}>Health Score</div>
                  <div className={`text-2xl font-bold ${getHealthColor(healthScore)}`}>
                    {healthScore ?? '—'}
                  </div>
                </div>
                <div className={`${t.surface} rounded-xl p-3 border ${t.border}`}>
                  <div className={`text-xs ${t.muted} mb-1`}>Empresas</div>
                  <div className={`text-2xl font-bold ${t.text}`}>{client.companies.length}</div>
                </div>
                <div className={`${t.surface} rounded-xl p-3 border ${t.border}`}>
                  <div className={`text-xs ${t.muted} mb-1`}>Anotações</div>
                  <div className={`text-2xl font-bold ${t.text}`}>{notes.length}</div>
                </div>
              </div>

              {/* Contato */}
              <div className={`${t.surface} rounded-xl p-4 border ${t.border} space-y-3`}>
                <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
                  <User size={14} className="text-emerald-500" /> Contato
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-emerald-500" />
                      <span className={`text-sm ${t.text}`}>{client.email}</span>
                    </div>
                    <button onClick={copyEmail} className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.muted} transition-colors`}>
                      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-emerald-500" />
                      <span className={`text-sm ${t.text}`}>{client.phone}</span>
                    </div>
                  )}
                  {client.companyName && (
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-emerald-500" />
                      <span className={`text-sm ${t.text}`}>{client.companyName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Datas */}
              <div className={`${t.surface} rounded-xl p-4 border ${t.border} space-y-3`}>
                <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
                  <Calendar size={14} className="text-emerald-500" /> Histórico
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${t.muted}`}>Cadastro</span>
                    <span className={`text-sm ${t.text}`}>{formatDate(client.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${t.muted}`}>Último acesso</span>
                    <span className={`text-sm ${t.text}`}>{formatDateTime(client.lastLogin)}</span>
                  </div>
                  {client.consolidatedDaysRemaining != null && (
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${t.muted}`}>Dias restantes (trial)</span>
                      <span className={`text-sm font-medium ${client.consolidatedDaysRemaining <= 3 ? 'text-red-500' : 'text-yellow-500'}`}>
                        {client.consolidatedDaysRemaining} dias
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Equipe */}
              {(client.sdrName || client.csName) && (
                <div className={`${t.surface} rounded-xl p-4 border ${t.border} space-y-3`}>
                  <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
                    <Activity size={14} className="text-emerald-500" /> Equipe Responsável
                  </h3>
                  <div className="space-y-2">
                    {client.sdrName && (
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${t.muted}`}>SDR (Captação)</span>
                        <span className={`text-sm font-medium ${t.text}`}>{client.sdrName}</span>
                      </div>
                    )}
                    {client.csName && (
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${t.muted}`}>CS (Sucesso)</span>
                        <span className={`text-sm font-medium ${t.text}`}>{client.csName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notas internas */}
              {client.internalNotes && (
                <div className={`${t.surface} rounded-xl p-4 border ${t.border}`}>
                  <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2 mb-2`}>
                    <FileText size={14} className="text-emerald-500" /> Notas Internas
                  </h3>
                  <p className={`text-sm ${t.muted}`}>{client.internalNotes}</p>
                </div>
              )}

              {/* Botão rápido para anotações */}
              <button
                onClick={() => setActiveTab('notes')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare size={15} /> Adicionar anotação
                </span>
                <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {activeTab === 'notes' && (
            <div className="p-6 space-y-4">

              {/* Add note form */}
              <div className={`${t.surface} rounded-xl p-4 border ${t.border} space-y-3`}>
                <h3 className={`text-sm font-semibold ${t.text}`}>Nova anotação</h3>

                {/* Type selector */}
                <div className="flex gap-2 flex-wrap">
                  {NOTE_TYPES.map(nt => (
                    <button
                      key={nt.value}
                      onClick={() => setNewNoteType(nt.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        newNoteType === nt.value
                          ? 'border-emerald-500 bg-emerald-600 text-white'
                          : `${t.border} ${t.muted} ${t.surfaceHover}`
                      }`}
                    >
                      {nt.icon} {nt.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Escreva sua anotação aqui..."
                  rows={3}
                  className={`w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 ${t.input}`}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddNote(); }}
                />

                <div className="flex items-center justify-between">
                  <span className={`text-xs ${t.muted}`}>Ctrl+Enter para salvar</span>
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || savingNote}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Salvar
                  </button>
                </div>
              </div>

              {/* Notes list */}
              {loadingNotes ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-emerald-500" />
                </div>
              ) : notes.length === 0 ? (
                <div className={`text-center py-10 ${t.muted}`}>
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma anotação ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => {
                    const noteType = NOTE_TYPES.find(nt => nt.value === note.type) || NOTE_TYPES[0];
                    return (
                      <div key={note.id} className={`${t.noteCard} border rounded-xl p-4 space-y-2`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base">{noteType.icon}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${noteType.color} text-white`}>
                              {noteType.label}
                            </span>
                            <span className={`text-xs ${t.muted}`}>{note.admin_name}</span>
                            <span className={`text-xs ${t.muted}`}>·</span>
                            <span className={`text-xs ${t.muted}`}>{timeAgo(note.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => { setEditingNoteId(note.id); setEditContent(note.content); }}
                              className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.muted} transition-colors`}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              rows={3}
                              className={`w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 ${t.input}`}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditNote(note.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                              >
                                <Save size={12} /> Salvar
                              </button>
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${t.surfaceHover} ${t.muted} text-xs`}
                              >
                                <XCircle size={12} /> Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className={`text-sm ${t.text} whitespace-pre-wrap`}>{note.content}</p>
                        )}

                        {note.updated_at !== note.created_at && (
                          <p className={`text-xs ${t.muted}`}>Editado {timeAgo(note.updated_at)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── COMPANIES TAB ── */}
          {activeTab === 'companies' && (
            <div className="p-6 space-y-3">
              {client.companies.length === 0 ? (
                <div className={`text-center py-10 ${t.muted}`}>
                  <Building2 size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma empresa vinculada</p>
                </div>
              ) : (
                client.companies.map(company => {
                  const cStatus = getStatusBadge(company.subscription_status);
                  const cPlan = getPlanLabel(company.plan);
                  return (
                    <div key={company.id} className={`${t.surface} border ${t.border} rounded-xl p-4 space-y-3`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className={`text-sm font-semibold ${t.text}`}>{company.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cPlan.cls}`}>{cPlan.label}</span>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cStatus.cls}`}>
                              {cStatus.icon}{cStatus.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {company.trial_model && (
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${t.muted}`}>Modelo trial</span>
                            <span className={`text-xs font-medium ${t.text}`}>{company.trial_model}</span>
                          </div>
                        )}
                        {company.daysRemaining != null && (
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${t.muted}`}>Dias restantes</span>
                            <span className={`text-xs font-medium ${company.daysRemaining <= 3 ? 'text-red-500' : 'text-yellow-500'}`}>
                              {company.daysRemaining} dias
                            </span>
                          </div>
                        )}
                        {company.paymentLinkUrl && (
                          <a
                            href={company.paymentLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                          >
                            <ExternalLink size={12} /> Ver link de pagamento
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
