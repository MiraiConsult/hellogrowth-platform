'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, User, Mail, Phone, Building2, Calendar, Clock, Heart,
  FileText, Plus, Trash2, Edit2, Save, XCircle, Tag,
  TrendingUp, CheckCircle, AlertTriangle, AlertCircle,
  CreditCard, Star, Activity, MessageSquare, ChevronRight,
  Loader2, ExternalLink, Copy, Check, MapPin, Users as UsersIcon, BarChart3, Briefcase
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
  city?: string | null;
  state?: string | null;
  niche?: string | null;
  nicheData?: Record<string, any> | null;
}

interface Niche {
  id: string;
  name: string;
  slug: string;
  has_clinic_fields: boolean;
}

interface ClientContact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_primary: boolean;
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
  onClientUpdate?: (patch: Partial<Client>) => void;
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

export default function ClientProfile({ client, isDark, onClose, adminName = 'Admin', onClientUpdate }: ClientProfileProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newNoteType, setNewNoteType] = useState('note');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'companies'>('info');
  const [profileExtras, setProfileExtras] = useState<{ kanbanCard: any; nps: any } | null>(null);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // Niche catalog + cadastro fields
  const [niches, setNiches] = useState<Niche[]>([]);
  const [editingCadastro, setEditingCadastro] = useState(false);
  const [savingCadastro, setSavingCadastro] = useState(false);
  const [cadastroForm, setCadastroForm] = useState({
    city: '',
    state: '',
    niche: '',
    chairs: '' as string | number,
    dentists: '' as string | number,
    has_secretary: false,
  });
  const [showNewNiche, setShowNewNiche] = useState(false);
  const [newNicheName, setNewNicheName] = useState('');
  const [newNicheClinic, setNewNicheClinic] = useState(false);

  // Multiple contacts
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [contactForm, setContactForm] = useState({ id: '', name: '', email: '', phone: '', notes: '', is_primary: false });

  // Pipeline + NPS metrics aggregated by tenant
  const [metrics, setMetrics] = useState<{ pipeline: { value: number; count: number }; nps: { score: number | null; count: number } } | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

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

  const fetchNiches = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/niches');
      const data = await res.json();
      setNiches(data.niches || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    if (!client) return;
    setLoadingContacts(true);
    try {
      const res = await fetch(`/api/admin/client-contacts?userId=${client.id}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContacts(false);
    }
  }, [client]);

  const fetchMetrics = useCallback(async () => {
    if (!client) return;
    setLoadingMetrics(true);
    try {
      const params = new URLSearchParams({ userId: client.id });
      if (client.tenantId) params.set('tenantId', client.tenantId);
      const res = await fetch(`/api/admin/client-metrics?${params.toString()}`);
      if (res.ok) setMetrics(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMetrics(false);
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      fetchNotes();
      fetchNiches();
      fetchContacts();
      fetchMetrics();
      setActiveTab('info');
      setNewNote('');
      setEditingCadastro(false);
      setShowAddContact(false);
      setCadastroForm({
        city: client.city || '',
        state: client.state || '',
        niche: client.niche || '',
        chairs: client.nicheData?.chairs ?? '',
        dentists: client.nicheData?.dentists ?? '',
        has_secretary: Boolean(client.nicheData?.has_secretary),
      });
    }
  }, [client, fetchNotes, fetchNiches, fetchContacts, fetchMetrics]);

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

  const selectedNiche = niches.find(n => n.slug === cadastroForm.niche);
  const isClinicNiche = Boolean(selectedNiche?.has_clinic_fields);

  const handleSaveCadastro = async () => {
    if (!client) return;
    setSavingCadastro(true);
    try {
      const nicheData: Record<string, any> = {};
      if (isClinicNiche) {
        if (cadastroForm.chairs !== '') nicheData.chairs = Number(cadastroForm.chairs) || 0;
        if (cadastroForm.dentists !== '') nicheData.dentists = Number(cadastroForm.dentists) || 0;
        nicheData.has_secretary = cadastroForm.has_secretary;
      }
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: client.id,
          userData: {
            city: cadastroForm.city.trim() || null,
            state: cadastroForm.state.trim() || null,
            niche: cadastroForm.niche || null,
            nicheData,
          },
        }),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      onClientUpdate?.({
        city: cadastroForm.city.trim() || null,
        state: cadastroForm.state.trim() || null,
        niche: cadastroForm.niche || null,
        nicheData,
      });
      setEditingCadastro(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCadastro(false);
    }
  };

  const handleCreateNiche = async () => {
    const name = newNicheName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/admin/niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, has_clinic_fields: newNicheClinic }),
      });
      const data = await res.json();
      if (data.niche) {
        setNiches(prev => [...prev.filter(n => n.id !== data.niche.id), data.niche].sort((a, b) => a.name.localeCompare(b.name)));
        setCadastroForm(f => ({ ...f, niche: data.niche.slug }));
        setShowNewNiche(false);
        setNewNicheName('');
        setNewNicheClinic(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveContact = async () => {
    if (!client || !contactForm.name.trim()) return;
    setSavingContact(true);
    try {
      const isEdit = Boolean(contactForm.id);
      const res = await fetch('/api/admin/client-contacts', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: contactForm.id } : {}),
          userId: client.id,
          name: contactForm.name,
          email: contactForm.email,
          phone: contactForm.phone,
          notes: contactForm.notes,
          isPrimary: contactForm.is_primary,
        }),
      });
      const data = await res.json();
      if (data.contact) {
        await fetchContacts();
        setShowAddContact(false);
        setContactForm({ id: '', name: '', email: '', phone: '', notes: '', is_primary: false });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Remover este contato?')) return;
    await fetch(`/api/admin/client-contacts?id=${id}`, { method: 'DELETE' });
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const startEditContact = (c: ClientContact) => {
    setContactForm({
      id: c.id,
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      notes: c.notes || '',
      is_primary: c.is_primary,
    });
    setShowAddContact(true);
  };

  if (!client) return null;

  const statusBadge = getStatusBadge(client.consolidatedStatus);
  const planBadge = getPlanLabel(client.plan);
  const healthScore = client.settings?.health_score ?? null;
  const initials = client.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-xl z-[9999] shadow-2xl flex flex-col ${t.bg} border-l ${t.border}`}>

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

              {/* KPIs: Pipeline + NPS + Health */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`${t.surface} rounded-xl p-3 border ${t.border}`}>
                  <div className={`text-xs ${t.muted} mb-1 flex items-center gap-1`}>
                    <BarChart3 size={11} /> Pipeline
                  </div>
                  <div className={`text-lg font-bold ${t.text}`}>
                    {loadingMetrics ? '—' : metrics ? `R$ ${metrics.pipeline.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—'}
                  </div>
                  <div className={`text-xs ${t.muted} mt-0.5`}>
                    {metrics ? `${metrics.pipeline.count} resp.` : ''}
                  </div>
                </div>
                <div className={`${t.surface} rounded-xl p-3 border ${t.border}`}>
                  <div className={`text-xs ${t.muted} mb-1 flex items-center gap-1`}>
                    <Star size={11} /> NPS Geral
                  </div>
                  <div className={`text-lg font-bold ${t.text}`}>
                    {loadingMetrics ? '—' : metrics?.nps.score != null ? metrics.nps.score : '—'}
                  </div>
                  <div className={`text-xs ${t.muted} mt-0.5`}>
                    {metrics ? `${metrics.nps.count} resp.` : ''}
                  </div>
                </div>
                <div className={`${t.surface} rounded-xl p-3 border ${t.border}`}>
                  <div className={`text-xs ${t.muted} mb-1 flex items-center gap-1`}>
                    <Heart size={11} /> Health
                  </div>
                  <div className={`text-lg font-bold ${getHealthColor(healthScore)}`}>
                    {healthScore ?? '—'}
                  </div>
                  <div className={`text-xs ${t.muted} mt-0.5`}>
                    {client.companies.length} empresa{client.companies.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              {/* Contato Principal */}
              <div className={`${t.surface} rounded-xl p-4 border ${t.border} space-y-3`}>
                <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
                  <User size={14} className="text-emerald-500" /> Contato Principal
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

              {/* Outros contatos */}
              <div className={`${t.surface} rounded-xl p-4 border ${t.border} space-y-3`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
                    <UsersIcon size={14} className="text-emerald-500" /> Outros Contatos
                    {contacts.length > 0 && <span className={`text-xs ${t.muted}`}>({contacts.length})</span>}
                  </h3>
                  <button
                    onClick={() => { setContactForm({ id: '', name: '', email: '', phone: '', notes: '', is_primary: false }); setShowAddContact(true); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                  >
                    <Plus size={12} /> Adicionar
                  </button>
                </div>

                {showAddContact && (
                  <div className={`${t.bg} border ${t.border} rounded-lg p-3 space-y-2`}>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nome *"
                      className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input}`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="E-mail"
                        className={`border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input}`}
                      />
                      <input
                        type="tel"
                        value={contactForm.phone}
                        onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="Telefone"
                        className={`border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input}`}
                      />
                    </div>
                    <textarea
                      value={contactForm.notes}
                      onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Observações (cargo, função, etc.)"
                      rows={2}
                      className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input} resize-none`}
                    />
                    <label className={`flex items-center gap-2 text-xs ${t.muted}`}>
                      <input
                        type="checkbox"
                        checked={contactForm.is_primary}
                        onChange={e => setContactForm(f => ({ ...f, is_primary: e.target.checked }))}
                        className="accent-emerald-500"
                      />
                      Marcar como principal
                    </label>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setShowAddContact(false); setContactForm({ id: '', name: '', email: '', phone: '', notes: '', is_primary: false }); }}
                        className={`px-3 py-1.5 rounded-lg text-xs ${t.surfaceHover} ${t.muted}`}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveContact}
                        disabled={!contactForm.name.trim() || savingContact}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1"
                      >
                        {savingContact ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                        {contactForm.id ? 'Atualizar' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                )}

                {loadingContacts ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 size={16} className="animate-spin text-emerald-500" />
                  </div>
                ) : contacts.length === 0 && !showAddContact ? (
                  <p className={`text-xs ${t.muted} italic`}>Nenhum contato adicional cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {contacts.map(c => (
                      <div key={c.id} className={`${t.bg} border ${t.border} rounded-lg p-2.5`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${t.text}`}>{c.name}</span>
                              {c.is_primary && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                  Principal
                                </span>
                              )}
                            </div>
                            <div className={`text-xs ${t.muted} mt-0.5 space-y-0.5`}>
                              {c.email && <div className="flex items-center gap-1"><Mail size={10} /> {c.email}</div>}
                              {c.phone && <div className="flex items-center gap-1"><Phone size={10} /> {c.phone}</div>}
                              {c.notes && <div className="italic">{c.notes}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => startEditContact(c)} className={`p-1 rounded ${t.surfaceHover} ${t.muted}`}>
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => handleDeleteContact(c.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Negócio: cidade, estado, nicho */}
              <div className={`${t.surface} rounded-xl p-4 border ${t.border} space-y-3`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
                    <Briefcase size={14} className="text-emerald-500" /> Negócio
                  </h3>
                  {!editingCadastro ? (
                    <button
                      onClick={() => setEditingCadastro(true)}
                      className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.muted}`}
                    >
                      <Edit2 size={13} />
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingCadastro(false); setShowNewNiche(false); }}
                        className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.muted}`}
                      >
                        <XCircle size={13} />
                      </button>
                      <button
                        onClick={handleSaveCadastro}
                        disabled={savingCadastro}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                      >
                        {savingCadastro ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      </button>
                    </div>
                  )}
                </div>

                {!editingCadastro ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-emerald-500" />
                      <span className={`text-sm ${t.text}`}>
                        {client.city || client.state ? `${client.city || '—'}${client.state ? ` / ${client.state}` : ''}` : <span className={t.muted}>Cidade e estado não informados</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-emerald-500" />
                      <span className={`text-sm ${t.text}`}>
                        {client.niche
                          ? niches.find(n => n.slug === client.niche)?.name || client.niche
                          : <span className={t.muted}>Nicho não informado</span>}
                      </span>
                    </div>
                    {isClinicNiche && client.nicheData && (
                      <div className={`pl-6 text-xs ${t.muted} space-y-0.5`}>
                        {client.nicheData.chairs != null && <div>Cadeiras: <span className={t.text}>{client.nicheData.chairs}</span></div>}
                        {client.nicheData.dentists != null && <div>Dentistas: <span className={t.text}>{client.nicheData.dentists}</span></div>}
                        <div>Secretária: <span className={t.text}>{client.nicheData.has_secretary ? 'Sim' : 'Não'}</span></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={cadastroForm.city}
                        onChange={e => setCadastroForm(f => ({ ...f, city: e.target.value }))}
                        placeholder="Cidade"
                        className={`col-span-2 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input}`}
                      />
                      <input
                        type="text"
                        value={cadastroForm.state}
                        onChange={e => setCadastroForm(f => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))}
                        placeholder="UF"
                        maxLength={2}
                        className={`border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input}`}
                      />
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={cadastroForm.niche}
                        onChange={e => setCadastroForm(f => ({ ...f, niche: e.target.value }))}
                        className={`flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input}`}
                      >
                        <option value="">— Selecione um nicho —</option>
                        {niches.map(n => (
                          <option key={n.id} value={n.slug}>{n.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewNiche(v => !v)}
                        className={`px-2 rounded-lg ${t.surfaceHover} ${t.muted} border ${t.border} text-xs`}
                        title="Cadastrar novo nicho"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {showNewNiche && (
                      <div className={`${t.bg} border ${t.border} rounded-lg p-2 space-y-2`}>
                        <input
                          type="text"
                          value={newNicheName}
                          onChange={e => setNewNicheName(e.target.value)}
                          placeholder="Nome do nicho"
                          className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input}`}
                        />
                        <label className={`flex items-center gap-2 text-xs ${t.muted}`}>
                          <input
                            type="checkbox"
                            checked={newNicheClinic}
                            onChange={e => setNewNicheClinic(e.target.checked)}
                            className="accent-emerald-500"
                          />
                          Coletar dados de clínica (cadeiras, dentistas, secretária)
                        </label>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setShowNewNiche(false); setNewNicheName(''); setNewNicheClinic(false); }}
                            className={`px-2 py-1 rounded-lg text-xs ${t.surfaceHover} ${t.muted}`}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleCreateNiche}
                            disabled={!newNicheName.trim()}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs"
                          >
                            Criar
                          </button>
                        </div>
                      </div>
                    )}

                    {isClinicNiche && (
                      <div className={`${t.bg} border ${t.border} rounded-lg p-2 space-y-2`}>
                        <p className={`text-xs ${t.muted}`}>Dados da clínica:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min={0}
                            value={cadastroForm.chairs}
                            onChange={e => setCadastroForm(f => ({ ...f, chairs: e.target.value }))}
                            placeholder="Cadeiras"
                            className={`border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input}`}
                          />
                          <input
                            type="number"
                            min={0}
                            value={cadastroForm.dentists}
                            onChange={e => setCadastroForm(f => ({ ...f, dentists: e.target.value }))}
                            placeholder="Dentistas"
                            className={`border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input}`}
                          />
                        </div>
                        <label className={`flex items-center gap-2 text-xs ${t.muted}`}>
                          <input
                            type="checkbox"
                            checked={cadastroForm.has_secretary}
                            onChange={e => setCadastroForm(f => ({ ...f, has_secretary: e.target.checked }))}
                            className="accent-emerald-500"
                          />
                          Possui secretária
                        </label>
                      </div>
                    )}
                  </div>
                )}
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

              {/* Pipeline (Kanban) */}
              {loadingExtras ? (
                <div className={`${t.surface} rounded-xl p-4 border ${t.border} flex items-center gap-2`}>
                  <Loader2 size={14} className="animate-spin text-violet-500" />
                  <span className={`text-sm ${t.muted}`}>Carregando pipeline...</span>
                </div>
              ) : profileExtras?.kanbanCard ? (
                <div className={`${t.surface} rounded-xl p-4 border ${t.border} space-y-3`}>
                  <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
                    <Kanban size={14} className="text-violet-500" /> Pipeline CS
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${t.muted}`}>Fluxo</span>
                      <span className={`text-sm font-medium ${t.text}`}>{profileExtras.kanbanCard.boardName || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${t.muted}`}>Etapa atual</span>
                      <span className={`text-sm font-medium ${t.text}`}>{profileExtras.kanbanCard.stageName || '—'}</span>
                    </div>
                    {profileExtras.kanbanCard.cs_name && (
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${t.muted}`}>CS Responsável</span>
                        <span className={`text-sm font-medium ${t.text}`}>{profileExtras.kanbanCard.cs_name}</span>
                      </div>
                    )}
                    {profileExtras.kanbanCard.fup_date && (
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${t.muted} flex items-center gap-1`}><AlarmClock size={11} /> FUP</span>
                        <span className={`text-sm font-medium ${t.text}`}>
                          {new Date(profileExtras.kanbanCard.fup_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                    {profileExtras.kanbanCard.next_contact_date && (
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${t.muted}`}>Próx. contato</span>
                        <span className={`text-sm font-medium ${t.text}`}>
                          {new Date(profileExtras.kanbanCard.next_contact_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* NPS dos pacientes */}
              {profileExtras?.nps && profileExtras.nps.total > 0 ? (
                <div className={`${t.surface} rounded-xl p-4 border ${t.border} space-y-3`}>
                  <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
                    <BarChart2 size={14} className="text-blue-500" /> NPS dos Pacientes
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        profileExtras.nps.avg >= 8 ? 'text-emerald-500' :
                        profileExtras.nps.avg >= 6 ? 'text-yellow-500' : 'text-red-500'
                      }`}>{profileExtras.nps.avg ?? '—'}</div>
                      <div className={`text-xs ${t.muted}`}>Média</div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-500">Promotores</span>
                        <span className={`text-sm font-semibold ${t.text}`}>{profileExtras.nps.promoters}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-yellow-500">Neutros</span>
                        <span className={`text-sm font-semibold ${t.text}`}>{profileExtras.nps.neutrals}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-red-500">Detratores</span>
                        <span className={`text-sm font-semibold ${t.text}`}>{profileExtras.nps.detractors}</span>
                      </div>
                      <div className={`flex items-center justify-between border-t ${t.border} pt-1`}>
                        <span className={`text-xs ${t.muted}`}>Total respostas</span>
                        <span className={`text-sm font-semibold ${t.text}`}>{profileExtras.nps.total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

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

              <div className={`${t.surface} rounded-xl p-4 border ${t.border} space-y-3`}>
                <h3 className={`text-sm font-semibold ${t.text}`}>Nova anotação</h3>

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

  if (typeof window === 'undefined') return null;
  return createPortal(content, document.body);
}
