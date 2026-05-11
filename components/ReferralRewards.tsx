'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gift, Plus, Trash2, Edit3, Check, X, Loader2, Star,
  Award, Users, TrendingUp, RefreshCw, AlertCircle,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Info
} from 'lucide-react';

interface Props {
  isDark: boolean;
  tenantId: string;
}

interface ReferralReward {
  id: string;
  name: string;
  description: string;
  reward_type: 'discount' | 'gift' | 'service' | 'cash' | 'points' | 'custom';
  reward_value: string;
  min_referrals: number;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

interface ReferralStats {
  total_referrals: number;
  pending_rewards: number;
  delivered_rewards: number;
  top_referrer: string | null;
}

const REWARD_TYPES = [
  { value: 'discount', label: 'Desconto', icon: '🏷️', placeholder: 'Ex: 20% de desconto na próxima consulta' },
  { value: 'gift', label: 'Brinde', icon: '🎁', placeholder: 'Ex: Kit de produtos no valor de R$ 50' },
  { value: 'service', label: 'Serviço Grátis', icon: '✨', placeholder: 'Ex: Limpeza de pele gratuita' },
  { value: 'cash', label: 'Cashback', icon: '💰', placeholder: 'Ex: R$ 30 de crédito na conta' },
  { value: 'points', label: 'Pontos', icon: '⭐', placeholder: 'Ex: 500 pontos no programa de fidelidade' },
  { value: 'custom', label: 'Personalizado', icon: '🎯', placeholder: 'Descreva o prêmio personalizado' },
];

const EMPTY_REWARD: Omit<ReferralReward, 'id' | 'usage_count' | 'created_at'> = {
  name: '',
  description: '',
  reward_type: 'discount',
  reward_value: '',
  min_referrals: 1,
  is_active: true,
};

export default function ReferralRewards({ isDark, tenantId }: Props) {
  const t = {
    bg: isDark ? 'bg-slate-900' : 'bg-slate-50',
    card: isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200',
    text: isDark ? 'text-slate-100' : 'text-slate-800',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    input: isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400',
    label: isDark ? 'text-slate-300' : 'text-slate-600',
    divider: isDark ? 'border-slate-700' : 'border-slate-200',
    highlight: isDark ? 'bg-slate-700' : 'bg-slate-100',
    hover: isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50',
  };

  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [stats, setStats] = useState<ReferralStats>({ total_referrals: 0, pending_rewards: 0, delivered_rewards: 0, top_referrer: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_REWARD });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/referral-rewards?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setRewards(data.rewards || []);
        setStats(data.stats || stats);
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.reward_value.trim()) errs.reward_value = 'Descrição do prêmio é obrigatória';
    if (form.min_referrals < 1) errs.min_referrals = 'Mínimo de 1 indicação';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `/api/referral-rewards/${editingId}` : '/api/referral-rewards';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tenantId }),
      });
      if (res.ok) {
        await fetchRewards();
        setShowForm(false);
        setEditingId(null);
        setForm({ ...EMPTY_REWARD });
        setErrors({});
      }
    } catch (err) {
      console.error('Error saving reward:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (reward: ReferralReward) => {
    setForm({
      name: reward.name,
      description: reward.description,
      reward_type: reward.reward_type,
      reward_value: reward.reward_value,
      min_referrals: reward.min_referrals,
      is_active: reward.is_active,
    });
    setEditingId(reward.id);
    setShowForm(true);
    setErrors({});
  };

  const handleToggleActive = async (reward: ReferralReward) => {
    try {
      await fetch(`/api/referral-rewards/${reward.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !reward.is_active, tenantId }),
      });
      await fetchRewards();
    } catch (err) {
      console.error('Error toggling reward:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este prêmio?')) return;
    try {
      await fetch(`/api/referral-rewards/${id}?tenantId=${tenantId}`, { method: 'DELETE' });
      await fetchRewards();
    } catch (err) {
      console.error('Error deleting reward:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_REWARD });
    setErrors({});
  };

  const rewardTypeCfg = REWARD_TYPES.find((r) => r.value === form.reward_type) || REWARD_TYPES[0];
  const activeRewards = rewards.filter((r) => r.is_active);

  return (
    <div className={`${t.bg} min-h-screen p-6`}>
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
            <Gift size={20} className="text-purple-500" />
            Prêmios de Indicação
          </h1>
          <p className={`text-sm ${t.textMuted} mt-0.5`}>
            Configure os prêmios oferecidos a promotores que indicam novos clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRewards} className={`p-2 rounded-xl border ${t.card} ${t.textMuted}`}>
            <RefreshCw size={14} />
          </button>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_REWARD }); }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus size={15} />
              Novo Prêmio
            </button>
          )}
        </div>
      </div>

      {/* ---- Stats ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total de Indicações', value: stats.total_referrals, icon: Users, color: 'text-blue-500', bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50' },
          { label: 'Prêmios Pendentes', value: stats.pending_rewards, icon: Gift, color: 'text-amber-500', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50' },
          { label: 'Prêmios Entregues', value: stats.delivered_rewards, icon: Award, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50' },
          { label: 'Prêmios Ativos', value: activeRewards.length, icon: Star, color: 'text-purple-500', bg: isDark ? 'bg-purple-900/20' : 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border p-4 ${t.card}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
              <Icon size={16} className={color} />
            </div>
            <p className={`text-2xl font-bold ${t.text}`}>{value}</p>
            <p className={`text-xs ${t.textMuted} mt-1`}>{label}</p>
          </div>
        ))}
      </div>

      {/* ---- Formulário de criação/edição ---- */}
      {showForm && (
        <div className={`rounded-2xl border p-5 mb-5 ${t.card}`}>
          <h2 className={`text-sm font-bold ${t.text} mb-4`}>
            {editingId ? 'Editar Prêmio' : 'Novo Prêmio de Indicação'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className={`block text-xs font-semibold ${t.label} mb-1.5`}>
                Nome do Prêmio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Desconto Fidelidade"
                className={`w-full px-3 py-2 text-sm rounded-xl border ${t.input} focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Tipo de prêmio */}
            <div>
              <label className={`block text-xs font-semibold ${t.label} mb-1.5`}>
                Tipo de Prêmio
              </label>
              <select
                value={form.reward_type}
                onChange={(e) => setForm({ ...form, reward_type: e.target.value as ReferralReward['reward_type'] })}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${t.input} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
              >
                {REWARD_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>
                    {rt.icon} {rt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição do prêmio */}
            <div className="md:col-span-2">
              <label className={`block text-xs font-semibold ${t.label} mb-1.5`}>
                Descrição do Prêmio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.reward_value}
                onChange={(e) => setForm({ ...form, reward_value: e.target.value })}
                placeholder={rewardTypeCfg.placeholder}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${t.input} focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.reward_value ? 'border-red-500' : ''}`}
              />
              {errors.reward_value && <p className="text-xs text-red-500 mt-1">{errors.reward_value}</p>}
              <p className={`text-xs ${t.textMuted} mt-1`}>
                Esta descrição será mencionada pela IA na conversa com o promotor.
              </p>
            </div>

            {/* Mínimo de indicações */}
            <div>
              <label className={`block text-xs font-semibold ${t.label} mb-1.5`}>
                Mínimo de Indicações para Ganhar
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.min_referrals}
                onChange={(e) => setForm({ ...form, min_referrals: parseInt(e.target.value) || 1 })}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${t.input} focus:ring-2 focus:ring-purple-500 focus:border-transparent ${errors.min_referrals ? 'border-red-500' : ''}`}
              />
              {errors.min_referrals && <p className="text-xs text-red-500 mt-1">{errors.min_referrals}</p>}
            </div>

            {/* Descrição interna */}
            <div>
              <label className={`block text-xs font-semibold ${t.label} mb-1.5`}>
                Observações Internas (opcional)
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Notas para a equipe sobre este prêmio"
                className={`w-full px-3 py-2 text-sm rounded-xl border ${t.input} focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
              />
            </div>

            {/* Ativo */}
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`flex items-center gap-2 text-sm font-medium ${t.text}`}
              >
                {form.is_active
                  ? <ToggleRight size={22} className="text-purple-500" />
                  : <ToggleLeft size={22} className={t.textMuted} />
                }
                {form.is_active ? 'Prêmio ativo' : 'Prêmio inativo'}
              </button>
              <span className={`text-xs ${t.textMuted}`}>
                Apenas prêmios ativos são mencionados pela IA
              </span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-dashed" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
            <button
              onClick={handleCancel}
              className={`px-4 py-2 text-sm rounded-xl border ${t.divider} ${t.textMuted} ${t.hover} font-medium`}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Prêmio'}
            </button>
          </div>
        </div>
      )}

      {/* ---- Dica de uso ---- */}
      {!showForm && rewards.length === 0 && !loading && (
        <div className={`rounded-2xl border p-5 mb-5 ${isDark ? 'bg-purple-900/20 border-purple-800/30' : 'bg-purple-50 border-purple-200'}`}>
          <div className="flex items-start gap-3">
            <Info size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-purple-300' : 'text-purple-800'} mb-1`}>
                Como funciona o programa de indicação
              </p>
              <p className={`text-sm ${isDark ? 'text-purple-200' : 'text-purple-700'} leading-relaxed`}>
                Quando a IA identifica um promotor (NPS 9-10), ela menciona automaticamente o prêmio ativo
                na conversa, incentivando a indicação de novos clientes. Configure pelo menos um prêmio
                para ativar este fluxo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---- Lista de prêmios ---- */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="animate-spin text-purple-500" size={24} />
        </div>
      ) : rewards.length === 0 ? (
        <div className={`text-center py-16 ${t.textMuted}`}>
          <Gift size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-base font-medium">Nenhum prêmio configurado</p>
          <p className="text-sm mt-1 opacity-70">Crie o primeiro prêmio para ativar o fluxo de indicação</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rewards.map((reward) => {
            const typeCfg = REWARD_TYPES.find((r) => r.value === reward.reward_type) || REWARD_TYPES[0];
            const isExpanded = expandedId === reward.id;

            return (
              <div
                key={reward.id}
                className={`rounded-2xl border transition-all ${t.card} ${!reward.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Ícone */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    {typeCfg.icon}
                  </div>

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-semibold ${t.text}`}>{reward.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        reward.is_active
                          ? isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                          : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {reward.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className={`text-sm ${t.textMuted} truncate`}>{reward.reward_value}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs ${t.textMuted}`}>
                        {typeCfg.label}
                      </span>
                      <span className={`text-xs ${t.textMuted}`}>
                        • Mín. {reward.min_referrals} indicação{reward.min_referrals !== 1 ? 'ões' : ''}
                      </span>
                      {reward.usage_count > 0 && (
                        <span className={`text-xs ${t.textMuted}`}>
                          • {reward.usage_count} uso{reward.usage_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(reward)}
                      className={`p-2 rounded-lg ${t.hover} ${reward.is_active ? 'text-emerald-500' : t.textMuted}`}
                      title={reward.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {reward.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => handleEdit(reward)}
                      className={`p-2 rounded-lg ${t.hover} ${t.textMuted}`}
                      title="Editar"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(reward.id)}
                      className={`p-2 rounded-lg ${t.hover} text-red-400`}
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : reward.id)}
                      className={`p-2 rounded-lg ${t.hover} ${t.textMuted}`}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className={`px-4 pb-4 border-t ${t.divider} pt-3`}>
                    <div className="grid grid-cols-2 gap-3">
                      {reward.description && (
                        <div>
                          <p className={`text-xs font-semibold ${t.textMuted} mb-1`}>Observações Internas</p>
                          <p className={`text-sm ${t.text}`}>{reward.description}</p>
                        </div>
                      )}
                      <div>
                        <p className={`text-xs font-semibold ${t.textMuted} mb-1`}>Criado em</p>
                        <p className={`text-sm ${t.text}`}>
                          {new Date(reward.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Preview da mensagem da IA */}
                    <div className={`mt-3 rounded-xl p-3 ${isDark ? 'bg-purple-900/20 border border-purple-800/30' : 'bg-purple-50 border border-purple-200'}`}>
                      <p className={`text-xs font-semibold ${isDark ? 'text-purple-300' : 'text-purple-700'} mb-1`}>
                        Como a IA vai mencionar este prêmio:
                      </p>
                      <p className={`text-sm italic ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>
                        "Além disso, temos um programa especial para quem indica amigos: {reward.reward_value}. Você conhece alguém que poderia se beneficiar dos nossos serviços?"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
