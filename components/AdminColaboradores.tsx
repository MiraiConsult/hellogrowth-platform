'use client';
import React, { useState, useEffect } from 'react';
import {
  UserCog, Plus, Pencil, Trash2, X, Check, Users, TrendingUp,
  DollarSign, Star, BarChart2, Phone, Mail, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Colaborador {
  id: string;
  name: string;
  role: 'sdr' | 'cs' | 'gerente' | 'outro';
  email?: string;
  phone?: string;
  created_at: string;
}

interface ColaboradorMetrics {
  id: string;
  name: string;
  role: string;
  clientsAsSDR: number;
  clientsAsCS: number;
  activeClients: number;
  trialingClients: number;
  mrrContribution: number;
}

interface Props {
  isDark?: boolean;
}

const DARK = {
  bg: 'bg-gray-950', surface: 'bg-gray-900', border: 'border-gray-800',
  text: 'text-white', textSub: 'text-gray-400', textMuted: 'text-gray-500',
  input: 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-emerald-500',
  table: 'bg-gray-900', thead: 'text-gray-400', divider: 'divide-gray-800',
  surfaceHover: 'hover:bg-gray-800/50', kpi: 'bg-gray-900',
  modalBg: 'bg-gray-900 border-gray-800',
  badge: 'bg-gray-800 text-gray-300',
};
const LIGHT = {
  bg: 'bg-slate-50', surface: 'bg-white', border: 'border-slate-200',
  text: 'text-slate-900', textSub: 'text-slate-500', textMuted: 'text-slate-400',
  input: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-emerald-500',
  table: 'bg-white', thead: 'text-slate-500', divider: 'divide-slate-100',
  surfaceHover: 'hover:bg-slate-50', kpi: 'bg-white',
  modalBg: 'bg-white border-slate-200',
  badge: 'bg-slate-100 text-slate-600',
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

export default function AdminColaboradores({ isDark = false }: Props) {
  const t = isDark ? DARK : LIGHT;
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [metrics, setMetrics] = useState<ColaboradorMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', role: 'sdr', email: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sortField, setSortField] = useState<'name' | 'clientsAsSDR' | 'clientsAsCS' | 'mrrContribution'>('mrrContribution');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

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
        // Table doesn't exist yet — create it
        await supabase.rpc('exec_sql', {
          sql: `CREATE TABLE IF NOT EXISTS colaboradores (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'sdr',
            email TEXT,
            phone TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );`
        });
        setColaboradores([]);
        setIsLoading(false);
        return;
      }

      if (error) throw error;
      setColaboradores(data || []);

      // Fetch metrics: count clients per collaborator
      if (data && data.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, sdr_name, cs_name, plan')
          .neq('email', 'admin@hellogrowth.com');

        const metricsData: ColaboradorMetrics[] = data.map((col: Colaborador) => {
          const asSDR = (users || []).filter((u: any) => u.sdr_name === col.name);
          const asCS = (users || []).filter((u: any) => u.cs_name === col.name);
          const activeClients = asSDR.filter((u: any) => u.plan === 'active' || u.plan === 'hello_growth' || u.plan === 'hello_rating' || u.plan === 'hello_client').length;
          const trialingClients = asSDR.filter((u: any) => u.plan === 'trial').length;

          return {
            id: col.id,
            name: col.name,
            role: col.role,
            clientsAsSDR: asSDR.length,
            clientsAsCS: asCS.length,
            activeClients,
            trialingClients,
            mrrContribution: activeClients * 149.90,
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

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este colaborador?')) return;
    const { error } = await supabase.from('colaboradores').delete().eq('id', id);
    if (error) { showToast('error', 'Erro ao remover.'); return; }
    showToast('success', 'Colaborador removido.');
    fetchColaboradores();
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sortedMetrics = [...metrics]
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortField] as any;
      const vb = b[sortField] as any;
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
      : <ChevronDown size={12} className="opacity-30" />
  );

  const totalMRR = metrics.reduce((s, m) => s + m.mrrContribution, 0);
  const totalClients = metrics.reduce((s, m) => s + m.clientsAsSDR, 0);

  return (
    <main className="w-full px-6 py-6 space-y-6">
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
          { label: 'MRR Total (Est.)', value: `R$ ${totalMRR.toFixed(0)}`, icon: <DollarSign size={16} />, color: 'text-amber-600' },
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
          <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2`}><BarChart2 size={16} className="text-sky-500" /> Métricas por Colaborador</h3>
          <div className="relative">
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
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className={`border-b ${t.border}`}>
                  {[
                    { label: 'Colaborador', field: 'name' as const },
                    { label: 'Função', field: null },
                    { label: 'Clientes (SDR)', field: 'clientsAsSDR' as const },
                    { label: 'Clientes (CS)', field: 'clientsAsCS' as const },
                    { label: 'Ativos', field: null },
                    { label: 'Em Trial', field: null },
                    { label: 'MRR Est.', field: 'mrrContribution' as const },
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
                    <tr key={m.id} className={`${t.surfaceHover} transition-colors`}>
                      <td className="px-4 py-3.5">
                        <div className={`font-semibold text-sm ${t.text}`}>{m.name}</div>
                        {col?.email && <div className={`text-xs ${t.textMuted} flex items-center gap-1 mt-0.5`}><Mail size={10} />{col.email}</div>}
                        {col?.phone && <div className={`text-xs ${t.textMuted} flex items-center gap-1`}><Phone size={10} />{col.phone}</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] || 'bg-slate-100 text-slate-600'}`}>
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-bold ${t.text}`}>{m.clientsAsSDR}</span>
                        <span className={`text-xs ${t.textMuted} ml-1`}>clientes</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-bold ${t.text}`}>{m.clientsAsCS}</span>
                        <span className={`text-xs ${t.textMuted} ml-1`}>clientes</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-emerald-600">{m.activeClients}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-blue-500">{m.trialingClients}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-amber-600">R$ {m.mrrContribution.toFixed(0)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => {
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
                            onClick={() => handleDelete(m.id)}
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

      {/* Comparison chart — simple bar visualization */}
      {sortedMetrics.length > 0 && (
        <div className={`${t.table} border ${t.border} rounded-xl p-5 shadow-sm`}>
          <h3 className={`text-sm font-semibold ${t.text} flex items-center gap-2 mb-4`}><Star size={16} className="text-amber-500" /> Comparativo — Clientes por SDR</h3>
          <div className="space-y-3">
            {[...sortedMetrics].sort((a, b) => b.clientsAsSDR - a.clientsAsSDR).map(m => {
              const maxClients = Math.max(...metrics.map(x => x.clientsAsSDR), 1);
              const pct = (m.clientsAsSDR / maxClients) * 100;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className={`text-xs font-medium ${t.text} w-28 truncate`}>{m.name}</div>
                  <div className={`flex-1 h-5 rounded-full ${isDark ? 'bg-gray-800' : 'bg-slate-100'} overflow-hidden`}>
                    <div
                      className="h-5 rounded-full bg-sky-500 transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${pct}%` }}
                    >
                      {pct > 15 && <span className="text-white text-xs font-bold">{m.clientsAsSDR}</span>}
                    </div>
                  </div>
                  {pct <= 15 && <span className={`text-xs font-bold ${t.text} w-6`}>{m.clientsAsSDR}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
