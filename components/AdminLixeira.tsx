'use client';
import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Search, Loader2, FileText, BarChart2, Package, Users, Briefcase, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type EntityType = 'forms' | 'campaigns' | 'leads' | 'products_services' | 'colaboradores';

interface DeletedItem {
  id: string;
  name: string;
  type: EntityType;
  typeLabel: string;
  deletedAt: string;
  extra?: string; // info adicional (email, tenant, etc)
}

const TYPE_CONFIG: Record<EntityType, { label: string; icon: React.ReactNode; color: string; nameField: string; extraField?: string }> = {
  forms:             { label: 'Formulário',   icon: <FileText size={14} />,  color: 'bg-blue-100 text-blue-700',    nameField: 'name', extraField: 'tenant_id' },
  campaigns:         { label: 'Campanha NPS', icon: <BarChart2 size={14} />, color: 'bg-purple-100 text-purple-700', nameField: 'name', extraField: 'tenant_id' },
  leads:             { label: 'Lead',         icon: <Users size={14} />,     color: 'bg-green-100 text-green-700',  nameField: 'name', extraField: 'email' },
  products_services: { label: 'Produto',      icon: <Package size={14} />,   color: 'bg-orange-100 text-orange-700', nameField: 'name', extraField: 'tenant_id' },
  colaboradores:     { label: 'Colaborador',  icon: <Briefcase size={14} />, color: 'bg-sky-100 text-sky-700',      nameField: 'name', extraField: 'email' },
};

interface Props {
  isDark?: boolean;
}

export default function AdminLixeira({ isDark = false }: Props) {
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<EntityType | 'all'>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDeleted = async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        (Object.keys(TYPE_CONFIG) as EntityType[]).map(async (type) => {
          const cfg = TYPE_CONFIG[type];
          const fields = ['id', cfg.nameField, 'deleted_at', cfg.extraField].filter(Boolean).join(', ');
          const { data } = await supabase
            .from(type)
            .select(fields)
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });
          return (data || []).map((row: any) => ({
            id: row.id,
            name: row[cfg.nameField] || '(sem nome)',
            type,
            typeLabel: cfg.label,
            deletedAt: row.deleted_at,
            extra: cfg.extraField ? row[cfg.extraField] : undefined,
          } as DeletedItem));
        })
      );
      setItems(results.flat().sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()));
    } catch (err) {
      console.error('Erro ao buscar lixeira:', err);
      showToast('error', 'Erro ao carregar lixeira');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDeleted(); }, []);

  const handleRestore = async (item: DeletedItem) => {
    setRestoring(item.id);
    try {
      const { error } = await supabase
        .from(item.type)
        .update({ deleted_at: null })
        .eq('id', item.id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== item.id));
      showToast('success', `"${item.name}" restaurado com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao restaurar:', err);
      showToast('error', 'Erro ao restaurar item');
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (!confirm(`Excluir permanentemente "${item.name}"? Esta ação não pode ser desfeita.`)) return;
    setRestoring(item.id);
    try {
      const { error } = await supabase.from(item.type).delete().eq('id', item.id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== item.id));
      showToast('success', `"${item.name}" excluído permanentemente.`);
    } catch (err: any) {
      showToast('error', 'Erro ao excluir permanentemente');
    } finally {
      setRestoring(null);
    }
  };

  const filtered = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.extra || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || item.type === filterType;
    return matchSearch && matchType;
  });

  const bg = isDark ? 'bg-gray-950' : 'bg-slate-50';
  const surface = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';
  const text = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? 'text-gray-400' : 'text-slate-500';
  const inputCls = isDark
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const rowHover = isDark ? 'hover:bg-gray-800/60' : 'hover:bg-slate-50';

  return (
    <div className={`min-h-screen ${bg} px-6 py-6`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Trash2 size={20} className="text-red-600" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${text}`}>Lixeira</h1>
            <p className={`text-sm ${textSub}`}>{items.length} item{items.length !== 1 ? 's' : ''} excluído{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={fetchDeleted} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${surface} ${textSub} hover:opacity-80`}>
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className={`${surface} border rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center`}>
        <div className="relative flex-1 min-w-48">
          <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textSub}`} />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${inputCls}`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', ...Object.keys(TYPE_CONFIG)] as (EntityType | 'all')[]).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filterType === type
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : isDark ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {type === 'all' ? 'Todos' : TYPE_CONFIG[type as EntityType].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={`${surface} border rounded-xl overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Trash2 size={40} className={textSub} />
            <p className={`text-sm ${textSub}`}>Nenhum item na lixeira</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-slate-100 bg-slate-50'}`}>
                <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Item</th>
                <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Tipo</th>
                <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Info</th>
                <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Excluído em</th>
                <th className={`text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide ${textSub}`}>Ações</th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-gray-800' : 'divide-y divide-slate-100'}>
              {filtered.map(item => {
                const cfg = TYPE_CONFIG[item.type];
                const isProcessing = restoring === item.id;
                return (
                  <tr key={`${item.type}-${item.id}`} className={`transition-colors ${rowHover}`}>
                    <td className={`px-4 py-3 text-sm font-medium ${text}`}>{item.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${textSub} max-w-48 truncate`}>
                      {item.extra || '—'}
                    </td>
                    <td className={`px-4 py-3 text-xs ${textSub}`}>
                      {new Date(item.deletedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(item)}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                          Restaurar
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item)}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 size={12} />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
