'use client';
import React, { useState, useEffect } from 'react';
import {
  UserCog, Plus, Pencil, Trash2, X, Check, Users, TrendingUp,
  DollarSign, Star, BarChart2, Phone, Mail, Loader2, ChevronDown, ChevronUp,
  ArrowLeft, Activity, Target, Award, AlertTriangle, Clock, CheckCircle2,
  ExternalLink, Heart
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ClientProfile from '@/components/ClientProfile';

interface Colaborador {
  id: string;
  name: string;
  role: 'sdr' | 'cs' | 'gerente' | 'outro';
  email?: string;
  phone?: string;
  created_at: string;
}

interface ClienteDoColaborador {
  id: string;
  name: string;
  email: string;
  company: string;
  plan: string;
  status: string;
  sdr_name: string | null;
  cs_name: string | null;
  last_login: string | null;
  created_at: string;
  mrr?: number;
}

interface ColaboradorMetrics {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  clientsAsSDR: number;
  clientsAsCS: number;
  activeClients: number;
  trialingClients: number;
  expiredClients: number;
  mrrContribution: number;
  conversionRate: number; // % ativos / total SDR
  avgHealthScore: number;
}

interface Props {
  isDark?: boolean;
  hideFinancial?: boolean;
}

const DARK = {
  bg: 'bg-gray-950', surface: 'bg-gray-900', border: 'border-gray-800',
  text: 'text-white', textSub: 'text-gray-400', textMuted: 'text-gray-500',
  input: 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-emerald-500',
  table: 'bg-gray-900', thead: 'text-gray-400', divider: 'divide-gray-800',
  surfaceHover: 'hover:bg-gray-800/50', kpi: 'bg-gray-900',
  modalBg: 'bg-gray-900 border-gray-800',
  badge: 'bg-gray-800 text-gray-300',
  rowHover: 'hover:bg-gray-800/60',
};
const LIGHT = {
  bg: 'bg-slate-50', surface: 'bg-white', border: 'border-slate-200',
  text: 'text-slate-900', textSub: 'text-slate-500', textMuted: 'text-slate-400',
  input: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-emerald-500',
  table: 'bg-white', thead: 'text-slate-500', divider: 'divide-slate-100',
  surfaceHover: 'hover:bg-slate-50', kpi: 'bg-white',
  modalBg: 'bg-white border-slate-200',
  badge: 'bg-slate-100 text-slate-600',
  rowHover: 'hover:bg-slate-50 cursor-pointer',
};

const ROLE_LABELS: Record<string, string> = {
  sdr: 'SDR (Vendas)',
  cs: 'CS (Customer Success)',
  gerente: 'Gerente',
  outro: 'Outro',
};
const ROLE_COLORS: Record<string, string> = {
  sdr: 'bg-blue-100 text-blue-700',
  cs: 'bg-emerald-100 text-emerald-700',
  gerente: 'bg-purple-100 text-purple-700',
  outro: 'bg-slate-100 text-slate-600',
};

const PLAN_LABELS: Record<string, string> = {
  hello_growth: 'Growth', hello_rating: 'Rating', hello_client: 'Client',
  trial: 'Trial', lifetime: 'Lifetime', active: 'Ativo',
};
const PLAN_COLORS: Record<string, string> = {
  hello_growth: 'bg-purple-100 text-purple-700',
  hello_rating: 'bg-blue-100 text-blue-700',
  hello_client: 'bg-emerald-100 text-emerald-700',
  trial: 'bg-sky-100 text-sky-700',
  lifetime: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
};

function getHealthColor(score: number) {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-yellow-500';
  if (score >= 25) return 'text-orange-500';
  return 'text-red-500';
}

function getHealthBg(score: number) {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-yellow-400';
  if (score >= 25) return 'bg-orange-400';
  return 'bg-red-500';
}

function calcHealthScore(client: ClienteDoColaborador): number {
  let score = 0;
  if (client.last_login) {
    const daysSince = (Date.now() - new Date(client.last_login).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 7) score += 25;
  }
  // Base score for active clients
  if (client.plan !== 'trial' && client.plan !== 'expired') score += 25;
  return score;
}

export default function AdminColaboradores({ isDark = false, hideFinancial = false }: Props) {
  const t = isDark ? DARK : LIGHT;
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [metrics, setMetrics] = useState<ColaboradorMetrics[]>([]);
  const [allClients, setAllClients] = useState<ClienteDoColaborador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', role: 'sdr', email: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sortField, setSortField] = useState<keyof ColaboradorMetrics>('mrrContribution');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState<ColaboradorMetrics | null>(null);
  const [profileTab, setProfileTab] = useState<'sdr' | 'cs'>('sdr');
  const [profileClient, setProfileClient] = useState<ClienteDoColaborador | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchColaboradores = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code === '42P01') {
        setColaboradores([]);
        setIsLoading(false);
        return;
      }
      if (error) throw error;
      setColaboradores(data || []);

      // Fetch all clients via admin API (uses service role key, bypasses RLS)
      let users: ClienteDoColaborador[] = [];
      try {
        const res = await fetch('/api/admin/clients');
        if (res.ok) {
          const json = await res.json();
          const raw: any[] = json.clients || json.users || (Array.isArray(json) ? json : []);
          users = raw.map((u: any) => ({
            id: u.id,
            name: u.name || '',
            email: u.email || '',
            company: u.companyName || u.company_name || u.company || '',
            plan: u.plan || u.primaryCompany?.plan || '',
            status: u.consolidatedStatus || u.status || '',
            sdr_name: u.sdrName ?? u.sdr_name ?? null,
            cs_name: u.csName ?? u.cs_name ?? null,
            last_login: u.lastLogin ?? u.last_login ?? null,
            created_at: u.createdAt || u.created_at || '',
            mrr: 0,
          }));
        }
      } catch (e) {
        console.error('Error fetching clients for colaboradores:', e);
      }

      setAllClients(users);

      if (data && data.length > 0) {
        const metricsData: ColaboradorMetrics[] = data.map((col: Colaborador) => {
          const asSDR = users.filter((u: ClienteDoColaborador) => u.sdr_name === col.name);
          const asCS = users.filter((u: ClienteDoColaborador) => u.cs_name === col.name);

          // Usar consolidatedStatus (retornado pela API) para classificar clientes
          const isActiveStatus = (u: ClienteDoColaborador) =>
            u.status === 'active' || (!u.status && (u.plan === 'growth' || u.plan === 'rating' || u.plan === 'growth_lifetime' || u.plan === 'client'));
          const isTrialStatus = (u: ClienteDoColaborador) =>
            u.status === 'trialing' || (!u.status && u.plan === 'trial');
          const isExpiredStatus = (u: ClienteDoColaborador) =>
            u.status === 'trial_expired' || u.status === 'canceled' || u.status === 'past_due' ||
            (!u.status && (u.plan === 'expired' || u.plan === 'trial_expired'));

          const activeClients = asSDR.filter(isActiveStatus).length;
          const trialingClients = asSDR.filter(isTrialStatus).length;
          const expiredClients = asSDR.filter(isExpiredStatus).length;

          // MRR: plano growth = R$149,90 | rating = R$99,90 | client = R$99,90
          const planMrr = (u: ClienteDoColaborador) => {
            if (u.plan === 'growth' || u.plan === 'hello_growth') return 149.90;
            if (u.plan === 'rating' || u.plan === 'hello_rating') return 99.90;
            if (u.plan === 'client' || u.plan === 'hello_client') return 99.90;
            if (u.plan === 'growth_lifetime') return 149.90;
            return 0;
          };
          const mrrContribution = asSDR.filter(isActiveStatus).reduce((sum, u) => sum + planMrr(u), 0);
          const conversionRate = asSDR.length > 0 ? Math.round((activeClients / asSDR.length) * 100) : 0;

          // Avg health score for CS clients
          const csClients = asCS.filter(isActiveStatus);
          const avgHealthScore = csClients.length > 0
            ? Math.round(csClients.reduce((sum: number, u: any) => sum + calcHealthScore(u), 0) / csClients.length)
            : 0;

          return {
            id: col.id,
            name: col.name,
            role: col.role,
            email: col.email,
            phone: col.phone,
            clientsAsSDR: asSDR.length,
            clientsAsCS: asCS.length,
            activeClients,
            trialingClients,
            expiredClients,
            mrrContribution,
            conversionRate,
            avgHealthScore,
          };
        });
        setMetrics(metricsData);
      } else {
        setMetrics([]);
      }
    } catch (err: any) {
      console.error('Error fetching colaboradores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchColaboradores(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('error', 'Nome é obrigatório.'); return; }
    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('colaboradores')
          .update({ name: form.name, role: form.role, email: form.email, phone: form.phone })
          .eq('id', editingId);
        if (error) throw error;
        showToast('success', 'Colaborador atualizado!');
      } else {
        const { error } = await supabase
          .from('colaboradores')
          .insert([{ name: form.name, role: form.role, email: form.email || null, phone: form.phone || null }]);
        if (error) throw error;
        showToast('success', 'Colaborador adicionado!');
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', role: 'sdr', email: '', phone: '' });
      fetchColaboradores();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remover este colaborador?')) return;
    const { error } = await supabase.from('colaboradores').delete().eq('id', id);
    if (error) { showToast('error', 'Erro ao remover.'); return; }
    showToast('success', 'Colaborador removido.');
    if (selectedColaborador?.id === id) setSelectedColaborador(null);
    fetchColaboradores();
  };

  const handleSort = (field: keyof ColaboradorMetrics) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sortedMetrics = [...metrics]
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortField] as any;
      const vb = b[sortField] as any;
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const SortIcon = ({ field }: { field: keyof ColaboradorMetrics }) => (
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
      : <ChevronDown size={12} className="opacity-30" />
  );

  const totalMRR = metrics.reduce((s, m) => s + m.mrrContribution, 0);

  // Profile view
  if (selectedColaborador) {
    const col = colaboradores.find(c => c.id === selectedColaborador.id);
    // Classificação por status consolidado
    const isActiveStatus = (u: ClienteDoColaborador) =>
      u.status === 'active' || (!u.status && (u.plan === 'growth' || u.plan === 'rating' || u.plan === 'growth_lifetime' || u.plan === 'client'));
    const sdrClients = allClients.filter(u => u.sdr_name === selectedColaborador.name);
    const csClients = allClients.filter(u => u.cs_name === selectedColaborador.name);
    const displayClients = profileTab === 'sdr' ? sdrClients : csClients;

    return (
      <main className="w-full px-6 py-6 space-y-6">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.text}
          </div>
        )}

        {/* Back + Header */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => setSelectedColaborador(null)}
            className={`flex items-center gap-2 text-sm font-medium ${t.textSub} hover:text-emerald-600 transition-colors mt-1`}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {selectedColaborador.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className={`text-xl font-bold ${t.text}`}>{selectedColaborador.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[selectedColaborador.role] || 'bg-slate-100 text-slate-600'}`}>
                    {ROLE_LABELS[selectedColaborador.role] || selectedColaborador.role}
                  </span>
                  {col?.email && <span className={`text-xs ${t.textMuted} flex items-center gap-1`}><Mail size={11} />{col.email}</span>}
                  {col?.phone && <span className={`text-xs ${t.textMuted} flex items-center gap-1`}><Phone size={11} />{col.phone}</span>}
                </div>
              </div>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!col) return;
                    setForm({ name: col.name, role: col.role, email: col.email || '', phone: col.phone || '' });
                    setEditingId(col.id);
                    setShowForm(true);
                  }}
                  className={`flex items-center gap-2 border ${t.border} text-sm font-medium px-3 py-2 rounded-lg ${t.textSub} hover:text-sky-500 transition-colors`}
                >
                  <Pencil size={14} /> Editar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Clientes como SDR',
              value: selectedColaborador.clientsAsSDR,
              sub: `${selectedColaborador.activeClients} ativos`,
              icon: <TrendingUp size={16} />,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              label: 'Clientes como CS',
              value: selectedColaborador.clientsAsCS,
              sub: `${csClients.filter(isActiveStatus).length} ativos`,
              icon: <Users size={16} />,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
            {
              label: 'Taxa de Conversão',
              value: `${selectedColaborador.conversionRate}%`,
              sub: 'trial → ativo',
              icon: <Target size={16} />,
              color: 'text-purple-600',
              bg: 'bg-purple-50',
            },
            ...(!hideFinancial ? [{
              label: 'MRR Estimado',
              value: `R$ ${selectedColaborador.mrrContribution.toFixed(0)}`,
              sub: 'clientes ativos',
              icon: <DollarSign size={16} />,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            }] : []),
          ].map((kpi, i) => (
            <div key={i} className={`${t.kpi} border ${t.border} rounded-xl p-4 shadow-sm`}>
              <div className={`flex items-center gap-1.5 text-xs mb-2 ${kpi.color}`}>{kpi.icon}<span>{kpi.label}</span></div>
              <div className={`text-2xl font-bold ${t.text}`}>{kpi.value}</div>
              <div className={`text-xs ${t.textMuted} mt-0.5`}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Performance bars */}
        <div className={`${t.table} border ${t.border} rounded-xl p-5 shadow-sm`}>
          <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2 mb-4`}><Activity size={16} className="text-sky-500" /> Performance Geral</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Conversion */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${t.textSub}`}>Conversão SDR</span>
                <span className={`text-sm font-bold ${selectedColaborador.conversionRate >= 60 ? 'text-emerald-600' : selectedColaborador.conversionRate >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {selectedColaborador.conversionRate}%
                </span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-slate-100'}`}>
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${selectedColaborador.conversionRate >= 60 ? 'bg-emerald-500' : selectedColaborador.conversionRate >= 30 ? 'bg-yellow-400' : 'bg-red-500'}`}
                  style={{ width: `${selectedColaborador.conversionRate}%` }}
                />
              </div>
              <div className={`text-xs ${t.textMuted} mt-1`}>{selectedColaborador.activeClients} ativos de {selectedColaborador.clientsAsSDR} captados</div>
            </div>
            {/* Health Score médio */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${t.textSub}`}>Health Score Médio (CS)</span>
                <span className={`text-sm font-bold ${getHealthColor(selectedColaborador.avgHealthScore)}`}>
                  {selectedColaborador.avgHealthScore}/100
                </span>
              </div>
              <div className={`h-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-slate-100'}`}>
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${getHealthBg(selectedColaborador.avgHealthScore)}`}
                  style={{ width: `${selectedColaborador.avgHealthScore}%` }}
                />
              </div>
              <div className={`text-xs ${t.textMuted} mt-1`}>{csClients.filter(isActiveStatus).length} clientes ativos em CS</div>
            </div>
            {/* Trial/Expirados */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${t.textSub}`}>Em Trial / Expirados</span>
                <span className={`text-sm font-bold ${t.text}`}>{selectedColaborador.trialingClients} / {selectedColaborador.expiredClients}</span>
              </div>
              <div className="flex gap-1 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span className={`text-xs ${t.textMuted}`}>{selectedColaborador.trialingClients} em trial</span>
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className={`text-xs ${t.textMuted}`}>{selectedColaborador.expiredClients} expirados</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Client list */}
        <div className={`${t.table} border ${t.border} rounded-xl overflow-hidden shadow-sm`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
            <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><Users size={16} className="text-emerald-500" /> Clientes</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setProfileTab('sdr')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${profileTab === 'sdr' ? 'bg-blue-600 text-white' : `border ${t.border} ${t.textSub}`}`}
              >
                SDR ({sdrClients.length})
              </button>
              <button
                onClick={() => setProfileTab('cs')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${profileTab === 'cs' ? 'bg-emerald-600 text-white' : `border ${t.border} ${t.textSub}`}`}
              >
                CS ({csClients.length})
              </button>
            </div>
          </div>

          {displayClients.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-12 ${t.textMuted}`}>
              <Users size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Nenhum cliente {profileTab === 'sdr' ? 'captado como SDR' : 'gerenciado como CS'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className={`border-b ${t.border}`}>
                    {['Cliente', 'Plano', 'Status', 'Último Acesso', 'Health', 'Função'].map((h, i) => (
                      <th key={i} className={`text-left text-xs font-semibold ${t.thead} uppercase tracking-wider px-4 py-3`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.divider}`}>
                  {displayClients.map(client => {
                    const health = calcHealthScore(client);
                    const isActive = isActiveStatus(client);
                    const lastLogin = client.last_login ? new Date(client.last_login).toLocaleDateString('pt-BR') : '—';
                    return (
                      <tr key={client.id} className={`${t.surfaceHover} transition-colors cursor-pointer`} onClick={() => setProfileClient(client)}>
                        <td className="px-4 py-3.5">
                          <div className={`font-semibold text-sm ${t.text}`}>{client.name || client.email}</div>
                          <div className={`text-xs ${t.textMuted}`}>{client.company || client.email}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[client.plan] || 'bg-slate-100 text-slate-600'}`}>
                            {PLAN_LABELS[client.plan] || client.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isActive
                            ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 size={12} /> Ativo</span>
                            : client.plan === 'trial'
                              ? <span className="flex items-center gap-1 text-xs text-sky-600 font-medium"><Clock size={12} /> Trial</span>
                              : <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><AlertTriangle size={12} /> Expirado</span>
                          }
                        </td>
                        <td className={`px-4 py-3.5 text-sm ${t.textSub}`}>{lastLogin}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-16 h-1.5 rounded-full ${isDark ? 'bg-gray-800' : 'bg-slate-100'}`}>
                              <div className={`h-1.5 rounded-full ${getHealthBg(health)}`} style={{ width: `${health}%` }} />
                            </div>
                            <span className={`text-xs font-semibold ${getHealthColor(health)}`}>{health}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            {client.sdr_name && <span className={`text-xs ${t.textMuted}`}>SDR: {client.sdr_name}</span>}
                            {client.cs_name && <span className={`text-xs ${t.textMuted}`}>CS: {client.cs_name}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className={`${t.modalBg} border rounded-2xl shadow-2xl w-full max-w-md`}>
              <div className={`flex items-center justify-between p-5 border-b ${t.border}`}>
                <h2 className={`text-base font-bold ${t.text}`}>{editingId ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
                <button onClick={() => setShowForm(false)} className={`p-1.5 rounded-lg ${t.surfaceHover}`}><X size={16} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Nome *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${t.input}`} placeholder="Nome completo" />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Função</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${t.input}`}>
                    <option value="sdr">SDR (Vendas)</option>
                    <option value="cs">CS (Customer Success)</option>
                    <option value="gerente">Gerente</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${t.input}`} placeholder="email@empresa.com" />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>WhatsApp / Telefone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${t.input}`} placeholder="5551999999999" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
                  </button>
                  <button onClick={() => setShowForm(false)} className={`flex items-center justify-center gap-2 border ${t.border} text-sm font-medium px-4 py-2.5 rounded-lg transition-colors ${t.textSub}`}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Profile Slide-over (perfil individual do colaborador) */}
        {profileClient && (
          <ClientProfile
            client={{
              id: profileClient.id,
              name: profileClient.name,
              email: profileClient.email,
              phone: undefined,
              plan: profileClient.plan,
              companyName: profileClient.company,
              createdAt: profileClient.created_at,
              lastLogin: profileClient.last_login,
              companies: [],
              primaryCompany: null,
              consolidatedStatus: profileClient.status,
              consolidatedTrialModel: null,
              consolidatedDaysRemaining: null,
              sdrName: profileClient.sdr_name,
              csName: profileClient.cs_name,
            }}
            isDark={isDark}
            onClose={() => setProfileClient(null)}
            adminName="Admin"
          />
        )}
      </main>
    );
  }

  // List view
  return (
    <main className="w-full min-w-0 px-6 py-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold ${t.text}`}>Colaboradores</h1>
          <p className={`text-sm ${t.textMuted} mt-0.5`}>Cadastro de equipe e métricas por colaborador</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', role: 'sdr', email: '', phone: '' }); }}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} /> Novo Colaborador
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Colaboradores', value: colaboradores.length, icon: <UserCog size={16} />, color: 'text-sky-600' },
          { label: 'SDRs', value: colaboradores.filter(c => c.role === 'sdr').length, icon: <TrendingUp size={16} />, color: 'text-blue-600' },
          { label: 'CS (Customer Success)', value: colaboradores.filter(c => c.role === 'cs').length, icon: <Users size={16} />, color: 'text-emerald-600' },
          ...(!hideFinancial ? [{ label: 'MRR Total (Est.)', value: `R$ ${totalMRR.toFixed(0)}`, icon: <DollarSign size={16} />, color: 'text-amber-600' }] : []),
        ].map((kpi, i) => (
          <div key={i} className={`${t.kpi} border ${t.border} rounded-xl p-4 shadow-sm`}>
            <div className={`flex items-center gap-1.5 text-xs mb-2 ${kpi.color}`}>{kpi.icon}<span>{kpi.label}</span></div>
            <div className={`text-2xl font-bold ${t.text}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`${t.modalBg} border rounded-2xl shadow-2xl w-full max-w-md`}>
            <div className={`flex items-center justify-between p-5 border-b ${t.border}`}>
              <h2 className={`text-base font-bold ${t.text}`}>{editingId ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
              <button onClick={() => setShowForm(false)} className={`p-1.5 rounded-lg ${t.surfaceHover}`}><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${t.input}`} placeholder="Nome completo" />
              </div>
              <div>
                <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Função</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${t.input}`}>
                  <option value="sdr">SDR (Vendas)</option>
                  <option value="cs">CS (Customer Success)</option>
                  <option value="gerente">Gerente</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${t.input}`} placeholder="email@empresa.com" />
              </div>
              <div>
                <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>WhatsApp / Telefone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${t.input}`} placeholder="5551999999999" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
                </button>
                <button onClick={() => setShowForm(false)} className={`flex items-center justify-center gap-2 border ${t.border} text-sm font-medium px-4 py-2.5 rounded-lg transition-colors ${t.textSub}`}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Table */}
      <div className={`${t.table} border ${t.border} rounded-xl overflow-hidden shadow-sm`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${t.border}`}>
          <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}>
            <BarChart2 size={16} className="text-sky-500" /> Métricas por Colaborador
          </h3>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${t.textMuted}`}>Clique na linha para ver o perfil</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar colaborador..."
              className={`border rounded-lg pl-3 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 ${t.input}`}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-sky-500" /></div>
        ) : sortedMetrics.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 ${t.textMuted}`}>
            <UserCog size={36} className="mb-3 opacity-30" />
            <p className="font-medium">Nenhum colaborador cadastrado</p>
            <p className="text-sm mt-1">Clique em "Novo Colaborador" para começar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className={`border-b ${t.border}`}>
                  {[
                    { label: 'Colaborador', field: 'name' as keyof ColaboradorMetrics },
                    { label: 'Função', field: null },
                    { label: 'Clientes SDR', field: 'clientsAsSDR' as keyof ColaboradorMetrics },
                    { label: 'Clientes CS', field: 'clientsAsCS' as keyof ColaboradorMetrics },
                    { label: 'Ativos', field: 'activeClients' as keyof ColaboradorMetrics },
                    { label: 'Trial', field: 'trialingClients' as keyof ColaboradorMetrics },
                    { label: 'Expirados', field: 'expiredClients' as keyof ColaboradorMetrics },
                    { label: 'Conversão', field: 'conversionRate' as keyof ColaboradorMetrics },
                    { label: 'Health Médio', field: 'avgHealthScore' as keyof ColaboradorMetrics },
                    ...(!hideFinancial ? [{ label: 'MRR Est.', field: 'mrrContribution' as keyof ColaboradorMetrics }] : []),
                    { label: '', field: null },
                  ].map((h, i) => (
                    <th
                      key={i}
                      onClick={() => h.field && handleSort(h.field)}
                      className={`text-left text-xs font-semibold ${t.thead} uppercase tracking-wider px-4 py-3 ${h.field ? 'cursor-pointer hover:text-sky-500' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {h.label}
                        {h.field && <SortIcon field={h.field} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divider}`}>
                {sortedMetrics.map(m => {
                  const col = colaboradores.find(c => c.id === m.id);
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedColaborador(m)}
                      className={`${t.rowHover} transition-colors cursor-pointer`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className={`font-semibold text-sm ${t.text}`}>{m.name}</div>
                            {col?.email && <div className={`text-xs ${t.textMuted}`}>{col.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] || 'bg-slate-100 text-slate-600'}`}>
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-bold ${t.text}`}>{m.clientsAsSDR}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-bold ${t.text}`}>{m.clientsAsCS}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-emerald-600">{m.activeClients}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-sky-500">{m.trialingClients}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${m.expiredClients > 0 ? 'text-red-500' : t.textMuted}`}>{m.expiredClients}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-16 h-1.5 rounded-full ${isDark ? 'bg-gray-800' : 'bg-slate-100'}`}>
                            <div
                              className={`h-1.5 rounded-full ${m.conversionRate >= 60 ? 'bg-emerald-500' : m.conversionRate >= 30 ? 'bg-yellow-400' : 'bg-red-500'}`}
                              style={{ width: `${m.conversionRate}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${m.conversionRate >= 60 ? 'text-emerald-600' : m.conversionRate >= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {m.conversionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Heart size={12} className={getHealthColor(m.avgHealthScore)} />
                          <span className={`text-xs font-semibold ${getHealthColor(m.avgHealthScore)}`}>{m.avgHealthScore}</span>
                        </div>
                      </td>
                      {!hideFinancial && (
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-amber-600">R$ {m.mrrContribution.toFixed(0)}</span>
                        </td>
                      )}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!col) return;
                              setForm({ name: col.name, role: col.role, email: col.email || '', phone: col.phone || '' });
                              setEditingId(col.id);
                              setShowForm(true);
                            }}
                            className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textMuted} hover:text-sky-500 transition-colors`}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(m.id, e)}
                            className={`p-1.5 rounded-lg ${t.surfaceHover} ${t.textMuted} hover:text-red-500 transition-colors`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comparison charts */}
      {sortedMetrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`${t.table} border ${t.border} rounded-xl p-5 shadow-sm`}>
            <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2 mb-4`}><Star size={16} className="text-amber-500" /> Clientes por SDR</h3>
            <div className="space-y-3">
              {[...sortedMetrics].sort((a, b) => b.clientsAsSDR - a.clientsAsSDR).map(m => {
                const maxClients = Math.max(...metrics.map(x => x.clientsAsSDR), 1);
                const pct = (m.clientsAsSDR / maxClients) * 100;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className={`text-xs font-medium ${t.text} w-28 truncate`}>{m.name}</div>
                    <div className={`flex-1 h-5 rounded-full ${isDark ? 'bg-gray-800' : 'bg-slate-100'} overflow-hidden`}>
                      <div className="h-5 rounded-full bg-sky-500 transition-all duration-500 flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 4)}%` }}>
                        {pct > 15 && <span className="text-white text-xs font-bold">{m.clientsAsSDR}</span>}
                      </div>
                    </div>
                    {pct <= 15 && <span className={`text-xs font-bold ${t.text} w-6`}>{m.clientsAsSDR}</span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`${t.table} border ${t.border} rounded-xl p-5 shadow-sm`}>
            <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2 mb-4`}><Target size={16} className="text-purple-500" /> Taxa de Conversão por SDR</h3>
            <div className="space-y-3">
              {[...sortedMetrics].sort((a, b) => b.conversionRate - a.conversionRate).map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className={`text-xs font-medium ${t.text} w-28 truncate`}>{m.name}</div>
                  <div className={`flex-1 h-5 rounded-full ${isDark ? 'bg-gray-800' : 'bg-slate-100'} overflow-hidden`}>
                    <div
                      className={`h-5 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${m.conversionRate >= 60 ? 'bg-emerald-500' : m.conversionRate >= 30 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${Math.max(m.conversionRate, 4)}%` }}
                    >
                      {m.conversionRate > 15 && <span className="text-white text-xs font-bold">{m.conversionRate}%</span>}
                    </div>
                  </div>
                  {m.conversionRate <= 15 && <span className={`text-xs font-bold ${t.text} w-8`}>{m.conversionRate}%</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    {/* Client Profile Slide-over */}
    {profileClient && (
      <ClientProfile
        client={{
          id: profileClient.id,
          name: profileClient.name,
          email: profileClient.email,
          phone: undefined,
          plan: profileClient.plan,
          companyName: profileClient.company,
          createdAt: profileClient.created_at,
          lastLogin: profileClient.last_login,
          companies: [],
          primaryCompany: null,
          consolidatedStatus: profileClient.status,
          consolidatedTrialModel: null,
          consolidatedDaysRemaining: null,
          sdrName: profileClient.sdr_name,
          csName: profileClient.cs_name,
        }}
        isDark={isDark}
        onClose={() => setProfileClient(null)}
        adminName="Admin"
      />
    )}
    </main>
  );
}
