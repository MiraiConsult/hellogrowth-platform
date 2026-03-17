import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User, PlanType } from '@/types';
import {
  Plus, Trash2, LogOut, Loader2, Users, Edit, X, Save, RefreshCw,
  Key, CheckCircle, AlertTriangle, Clock, Gift, CreditCard, Send,
  ExternalLink, Filter, ChevronDown, ChevronUp, Mail, Building2,
  TrendingUp, AlertCircle
} from 'lucide-react';

interface AdminUserManagementProps {
  onLogout: () => void;
}

interface TrialCompany {
  id: string;
  name: string;
  plan: string;
  plan_addons?: string;
  subscription_status: string;
  trial_model: string;
  trial_start_at?: string;
  trial_end_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  settings?: Record<string, any>;
  owner?: {
    id: string;
    name: string;
    email: string;
    plan: string;
  } | null;
  daysRemaining?: number | null;
  paymentLinkSentAt?: string | null;
  paymentLinkUrl?: string | null;
}

interface SendPaymentLinkConfig {
  company: TrialCompany;
  plan: string;
  userCount: number;
  addons: { game: boolean; mpd: boolean };
  customNote: string;
}

const PLAN_OPTIONS = [
  { value: 'hello_client', label: 'Hello Client' },
  { value: 'hello_rating', label: 'Hello Rating' },
  { value: 'hello_growth', label: 'Hello Growth' },
];

const PRICING_DATA: Record<number, Record<string, number>> = {
  1: { hello_client: 99.90, hello_rating: 99.90, hello_growth: 149.90, hc_game: 129.90, hc_mpd: 129.90, hc_game_mpd: 149.90, hr_game: 129.90, hr_mpd: 129.90, hr_game_mpd: 149.90, hg_game: 189.90, hg_mpd: 189.90, hg_game_mpd: 199.90 },
  2: { hello_client: 94.90, hello_rating: 94.90, hello_growth: 144.90, hc_game: 124.90, hc_mpd: 124.90, hc_game_mpd: 144.90, hr_game: 124.90, hr_mpd: 124.90, hr_game_mpd: 144.90, hg_game: 184.90, hg_mpd: 184.90, hg_game_mpd: 194.90 },
  3: { hello_client: 89.90, hello_rating: 89.90, hello_growth: 139.90, hc_game: 119.90, hc_mpd: 119.90, hc_game_mpd: 139.90, hr_game: 119.90, hr_mpd: 119.90, hr_game_mpd: 139.90, hg_game: 179.90, hg_mpd: 179.90, hg_game_mpd: 189.90 },
  4: { hello_client: 84.90, hello_rating: 84.90, hello_growth: 134.90, hc_game: 114.90, hc_mpd: 114.90, hc_game_mpd: 134.90, hr_game: 114.90, hr_mpd: 114.90, hr_game_mpd: 134.90, hg_game: 174.90, hg_mpd: 174.90, hg_game_mpd: 184.90 },
  5: { hello_client: 79.90, hello_rating: 79.90, hello_growth: 129.90, hc_game: 109.90, hc_mpd: 109.90, hc_game_mpd: 129.90, hr_game: 109.90, hr_mpd: 109.90, hr_game_mpd: 129.90, hg_game: 169.90, hg_mpd: 169.90, hg_game_mpd: 179.90 },
  6: { hello_client: 74.90, hello_rating: 74.90, hello_growth: 124.90, hc_game: 104.90, hc_mpd: 104.90, hc_game_mpd: 124.90, hr_game: 104.90, hr_mpd: 104.90, hr_game_mpd: 124.90, hg_game: 164.90, hg_mpd: 164.90, hg_game_mpd: 174.90 },
  7: { hello_client: 69.90, hello_rating: 69.90, hello_growth: 119.90, hc_game: 99.90, hc_mpd: 99.90, hc_game_mpd: 119.90, hr_game: 99.90, hr_mpd: 99.90, hr_game_mpd: 119.90, hg_game: 159.90, hg_mpd: 159.90, hg_game_mpd: 169.90 },
  8: { hello_client: 64.90, hello_rating: 64.90, hello_growth: 114.90, hc_game: 94.90, hc_mpd: 94.90, hc_game_mpd: 114.90, hr_game: 94.90, hr_mpd: 94.90, hr_game_mpd: 114.90, hg_game: 154.90, hg_mpd: 154.90, hg_game_mpd: 164.90 },
  9: { hello_client: 59.90, hello_rating: 59.90, hello_growth: 109.90, hc_game: 89.90, hc_mpd: 89.90, hc_game_mpd: 109.90, hr_game: 89.90, hr_mpd: 89.90, hr_game_mpd: 109.90, hg_game: 149.90, hg_mpd: 149.90, hg_game_mpd: 159.90 },
  10: { hello_client: 54.90, hello_rating: 54.90, hello_growth: 104.90, hc_game: 84.90, hc_mpd: 84.90, hc_game_mpd: 104.90, hr_game: 84.90, hr_mpd: 84.90, hr_game_mpd: 104.90, hg_game: 144.90, hg_mpd: 144.90, hg_game_mpd: 154.90 },
};

function calcPrice(plan: string, userCount: number, addons: { game: boolean; mpd: boolean }): number {
  const planCodeMap: Record<string, string> = {
    hello_client: 'hc', hello_rating: 'hr', hello_growth: 'hg',
    client: 'hc', rating: 'hr', growth: 'hg',
  };
  const code = planCodeMap[plan] || 'hg';
  let key: string;
  if (addons.game && addons.mpd) key = `${code}_game_mpd`;
  else if (addons.game) key = `${code}_game`;
  else if (addons.mpd) key = `${code}_mpd`;
  else {
    const baseMap: Record<string, string> = { hc: 'hello_client', hr: 'hello_rating', hg: 'hello_growth' };
    key = baseMap[code] || plan;
  }
  const count = Math.min(Math.max(userCount, 1), 10);
  return (PRICING_DATA[count]?.[key] || 0) * count;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'trials'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Trials state
  const [trials, setTrials] = useState<TrialCompany[]>([]);
  const [trialsLoading, setTrialsLoading] = useState(false);
  const [trialFilter, setTrialFilter] = useState<'all' | 'model_a' | 'model_b'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'trialing' | 'trial_expired' | 'active'>('all');

  // Payment Link modal
  const [paymentLinkModal, setPaymentLinkModal] = useState<SendPaymentLinkConfig | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [sentLinkResult, setSentLinkResult] = useState<{ url: string; emailSent: boolean } | null>(null);

  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    companyName: '',
    plan: 'trial' as PlanType
  });
  const [trialModel, setTrialModel] = useState<'none' | 'model_a' | 'model_b'>('none');
  const [trialPlan, setTrialPlan] = useState<string>('hello_growth');
  const [trialDays, setTrialDays] = useState<number>(30);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
    } else if (data) {
      const mappedUsers: User[] = data.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        plan: u.plan,
        createdAt: u.created_at,
        companyName: u.company_name
      }));
      setUsers(mappedUsers);
    }
    setIsLoading(false);
  };

  const fetchTrials = useCallback(async () => {
    setTrialsLoading(true);
    try {
      const response = await fetch('/api/admin/trials');
      if (response.ok) {
        const data = await response.json();
        setTrials(data.trials || []);
      }
    } catch (err) {
      console.error('Error fetching trials:', err);
    } finally {
      setTrialsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'trials') {
      fetchTrials();
    }
  }, [activeTab, fetchTrials]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setMessage(null);

    try {
      // Se for Modelo B, usar a API de setup-trial
      if (newUser.plan === 'trial' && trialModel === 'model_b') {
        const trialEndAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
        const response = await fetch('/api/onboarding/setup-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newUser.email.toLowerCase().trim(),
            companies: [newUser.companyName],
            plan: trialPlan,
            userCount: 1,
            addons: { game: false, mpd: false },
            trial_model: 'model_b',
            trial_end_at: trialEndAt,
            // Sobrescrever nome do usuário se fornecido
            userName: newUser.name || undefined,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          if (data.error === 'EMAIL_EXISTS') throw new Error('Este e-mail já está cadastrado.');
          throw new Error(data.error || 'Erro ao criar conta Modelo B.');
        }
        setMessage({ type: 'success', text: `Conta Modelo B criada! Acesso: ${newUser.email} / 12345. Trial de ${trialDays} dias.` });
        setNewUser({ name: '', email: '', companyName: '', plan: 'trial' });
        setTrialModel('none');
        setTrialDays(30);
        fetchUsers();
        // Atualizar lista de trials se estiver na aba
        if (activeTab === 'trials') fetchTrials();
        return;
      }

      // Fluxo padrão (Modelo A ou sem modelo)
      const { data: existing } = await supabase.from('users').select('id').eq('email', newUser.email).single();
      if (existing) {
        throw new Error("Este email já está cadastrado.");
      }

      const newTenantId = crypto.randomUUID();
      const userData: any = {
        name: newUser.name,
        email: newUser.email,
        company_name: newUser.companyName,
        plan: newUser.plan,
        tenant_id: newTenantId,
        role: 'admin',
        is_owner: true,
        settings: {
          companyName: newUser.companyName,
          adminEmail: newUser.email,
          phone: '',
          website: '',
          autoRedirect: true,
          ...(newUser.plan === 'trial' && trialModel === 'model_a' ? { trial_model: 'model_a' } : {}),
        }
      };

      let { data: createdUser, error } = await supabase.from('users').insert([{
        ...userData,
        password: '12345',
      }]).select().single();

      if (error && (error.message?.includes('Could not find') || error.message?.includes('column'))) {
        const retry = await supabase.from('users').insert([userData]).select().single();
        error = retry.error;
        createdUser = retry.data;
      }

      if (error) throw error;

      // Se for Modelo A, criar company com trial_model
      if (newUser.plan === 'trial' && trialModel === 'model_a' && createdUser) {
        const trialEndAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
        const companyId = crypto.randomUUID();
        await supabase.from('companies').insert([{
          id: companyId,
          name: newUser.companyName,
          plan: trialPlan.replace('hello_', '') || 'growth',
          plan_addons: JSON.stringify({ game: false, mpd: false }),
          subscription_status: 'trialing',
          trial_start_at: new Date().toISOString(),
          trial_end_at: trialEndAt,
          trial_model: 'model_a',
          created_by: createdUser.id,
          settings: {
            companyName: newUser.companyName,
            adminEmail: newUser.email,
            autoRedirect: true,
            trial_model: 'model_a',
          }
        }]);
        await supabase.from('user_companies').insert([{
          user_id: createdUser.id,
          company_id: companyId,
          role: 'owner',
        }]);
      }

      setMessage({ type: 'success', text: 'Usuário criado com sucesso (Senha padrão: 12345)' });
      setNewUser({ name: '', email: '', companyName: '', plan: 'trial' });
      setTrialModel('none');
      setTrialDays(30);
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao criar usuário.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este usuário? Todos os dados vinculados podem ser afetados.")) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch {
      alert("Erro ao excluir usuário.");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: editingUser.name, email: editingUser.email, company_name: editingUser.companyName, plan: editingUser.plan })
        .eq('id', editingUser.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
      alert("Usuário atualizado com sucesso!");
    } catch (err: any) {
      alert("Erro ao atualizar usuário: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm("Deseja resetar a senha deste usuário para '12345'?")) return;
    setIsResetting(true);
    try {
      const { error } = await supabase.from('users').update({ password: '12345' }).eq('id', userId);
      if (error && (error.message?.includes('Could not find') || error.message?.includes('column'))) {
        alert("Aviso: A coluna de senha não existe no banco de dados.");
      } else if (error) {
        throw error;
      } else {
        alert("Senha resetada para '12345' com sucesso!");
      }
      if (editingUser) setEditingUser({ ...editingUser, password: '12345' });
    } catch (err: any) {
      alert("Erro ao resetar senha: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const openPaymentLinkModal = (company: TrialCompany) => {
    // Mapear o plano da empresa para o formato do seletor
    let plan = company.plan;
    if (plan === 'client') plan = 'hello_client';
    else if (plan === 'rating') plan = 'hello_rating';
    else if (plan === 'growth') plan = 'hello_growth';

    setPaymentLinkModal({
      company,
      plan,
      userCount: 1,
      addons: { game: false, mpd: false },
      customNote: '',
    });
    setSentLinkResult(null);
  };

  const handleSendPaymentLink = async () => {
    if (!paymentLinkModal) return;
    setSendingLink(true);
    try {
      const response = await fetch('/api/stripe/send-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: paymentLinkModal.company.owner?.id,
          companyId: paymentLinkModal.company.id,
          plan: paymentLinkModal.plan,
          userCount: paymentLinkModal.userCount,
          addons: paymentLinkModal.addons,
          customNote: paymentLinkModal.customNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar link');
      setSentLinkResult({ url: data.paymentUrl, emailSent: data.emailSent });
      fetchTrials(); // Atualizar lista
    } catch (err: any) {
      alert('Erro ao gerar link de pagamento: ' + err.message);
    } finally {
      setSendingLink(false);
    }
  };

  const filteredTrials = trials.filter(t => {
    if (trialFilter !== 'all' && t.trial_model !== trialFilter) return false;
    if (statusFilter !== 'all' && t.subscription_status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string, daysRemaining: number | null | undefined) => {
    const base = 'px-2 py-1 rounded-full text-xs font-bold border';
    if (status === 'active') return <span className={`${base} bg-emerald-100 text-emerald-700 border-emerald-200`}>Ativo</span>;
    if (status === 'trialing') {
      const urgent = daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7;
      return <span className={`${base} ${urgent ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
        Trial {daysRemaining !== null ? `(${daysRemaining}d)` : ''}
      </span>;
    }
    if (status === 'trial_expired') return <span className={`${base} bg-red-100 text-red-700 border-red-200`}>Expirado</span>;
    if (status === 'past_due') return <span className={`${base} bg-yellow-100 text-yellow-700 border-yellow-200`}>Inadimplente</span>;
    if (status === 'canceled') return <span className={`${base} bg-gray-100 text-gray-600 border-gray-200`}>Cancelado</span>;
    return <span className={`${base} bg-gray-100 text-gray-600 border-gray-200`}>{status}</span>;
  };

  const getModelBadge = (model: string) => {
    if (model === 'model_a') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">Modelo A</span>;
    if (model === 'model_b') return <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-700 border border-teal-200">Modelo B</span>;
    return null;
  };

  // Summary stats
  const trialStats = {
    total: trials.length,
    modelA: trials.filter(t => t.trial_model === 'model_a').length,
    modelB: trials.filter(t => t.trial_model === 'model_b').length,
    trialing: trials.filter(t => t.subscription_status === 'trialing').length,
    expired: trials.filter(t => t.subscription_status === 'trial_expired').length,
    converted: trials.filter(t => t.subscription_status === 'active').length,
    urgentB: trials.filter(t => t.trial_model === 'model_b' && t.subscription_status === 'trialing' && (t.daysRemaining ?? 999) <= 7).length,
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Admin Navbar */}
      <nav className="bg-gray-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold">A</div>
            <span className="font-bold text-lg">Painel Administrativo</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}
              >
                <span className="flex items-center gap-1.5"><Users size={14} /> Usuários</span>
              </button>
              <button
                onClick={() => setActiveTab('trials')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'trials' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}
              >
                <span className="flex items-center gap-1.5">
                  <Clock size={14} /> Trials
                  {trialStats.urgentB > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{trialStats.urgentB}</span>
                  )}
                </span>
              </button>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>
      </nav>

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create User Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Plus size={20} className="text-primary-600" /> Novo Usuário
              </h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                  <input type="text" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                  <input type="text" required value={newUser.companyName} onChange={e => setNewUser({ ...newUser, companyName: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (Login)</label>
                  <input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5" />
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-500 flex items-center gap-2">
                  <Key size={16} /> Senha padrão será: <strong>12345</strong>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plano Inicial</label>
                  <select value={newUser.plan} onChange={e => { setNewUser({ ...newUser, plan: e.target.value as PlanType }); if (e.target.value !== 'trial') setTrialModel('none'); }} className="w-full border border-gray-300 rounded-lg p-2.5">
                    <option value="trial">Trial (Teste)</option>
                    <option value="client">HelloClient (Pré)</option>
                    <option value="rating">HelloRating (Pós)</option>
                    <option value="growth">HelloGrowth (Completo)</option>
                    <option value="growth_lifetime">Lifetime (Vitalício)</option>
                  </select>
                </div>

                {/* Campos extras para Trial */}
                {newUser.plan === 'trial' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modelo de Trial</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['none', 'model_a', 'model_b'] as const).map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setTrialModel(m)}
                            className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                              trialModel === m
                                ? m === 'model_b' ? 'bg-teal-600 text-white border-teal-600' : m === 'model_a' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-600 text-white border-gray-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {m === 'none' ? 'Nenhum' : m === 'model_a' ? 'Modelo A' : 'Modelo B'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {trialModel !== 'none' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Plano do Trial</label>
                          <select value={trialPlan} onChange={e => setTrialPlan(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5">
                            <option value="hello_client">Hello Client (Pré-venda)</option>
                            <option value="hello_rating">Hello Rating (Pós-venda)</option>
                            <option value="hello_growth">Hello Growth (Completo)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duração do Trial (dias)</label>
                          <input
                            type="number"
                            min={1}
                            max={90}
                            value={trialDays}
                            onChange={e => setTrialDays(parseInt(e.target.value) || 30)}
                            className="w-full border border-gray-300 rounded-lg p-2.5"
                          />
                        </div>
                        {trialModel === 'model_b' && (
                          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-700">
                            <strong>Modelo B:</strong> Conta criada sem cobrança. Você poderá enviar o link de pagamento quando quiser pela aba <strong>Trials</strong>.
                          </div>
                        )}
                        {trialModel === 'model_a' && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700">
                            <strong>Modelo A:</strong> Conta criada em trial. O cliente precisará assinar pelo fluxo normal de pricing.
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {message && (
                  <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    {message.text}
                  </div>
                )}
                <button type="submit" disabled={isCreating} className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {isCreating ? <Loader2 className="animate-spin" /> : 'Criar Login'}
                </button>
              </form>
            </div>
          </div>

          {/* Users List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Users size={20} className="text-gray-500" /> Usuários Cadastrados ({users.length})
                </h2>
                <button onClick={fetchUsers} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
                  <RefreshCw size={16} />
                </button>
              </div>
              {isLoading ? (
                <div className="p-12 text-center text-gray-500">
                  <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                  Carregando usuários...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                      <tr>
                        <th className="px-6 py-3">Usuário / Empresa</th>
                        <th className="px-6 py-3">Plano</th>
                        <th className="px-6 py-3">Data Cadastro</th>
                        <th className="px-6 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            <p className="text-xs text-primary-600 font-medium">{user.companyName}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold border capitalize ${user.plan === 'growth_lifetime' ? 'bg-gray-800 text-yellow-400 border-gray-700' : user.plan === 'growth' ? 'bg-purple-100 text-purple-700 border-purple-200' : user.plan === 'trial' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                              {user.plan === 'growth_lifetime' ? 'Lifetime' : user.plan}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingUser(user)} className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors" title="Editar Usuário">
                                <Edit size={18} />
                              </button>
                              <button onClick={() => handleDeleteUser(user.id)} className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors" title="Excluir Usuário">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRIALS TAB */}
      {activeTab === 'trials' && (
        <div className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { label: 'Total Trials', value: trialStats.total, color: 'bg-gray-100 text-gray-700', icon: <Users size={16} /> },
              { label: 'Modelo A', value: trialStats.modelA, color: 'bg-purple-100 text-purple-700', icon: <CreditCard size={16} /> },
              { label: 'Modelo B', value: trialStats.modelB, color: 'bg-teal-100 text-teal-700', icon: <Gift size={16} /> },
              { label: 'Em Trial', value: trialStats.trialing, color: 'bg-blue-100 text-blue-700', icon: <Clock size={16} /> },
              { label: 'Expirados', value: trialStats.expired, color: 'bg-red-100 text-red-700', icon: <AlertCircle size={16} /> },
              { label: 'Convertidos', value: trialStats.converted, color: 'bg-emerald-100 text-emerald-700', icon: <TrendingUp size={16} /> },
              { label: 'Urgente (B)', value: trialStats.urgentB, color: 'bg-orange-100 text-orange-700', icon: <AlertTriangle size={16} /> },
            ].map((stat) => (
              <div key={stat.label} className={`${stat.color} rounded-xl p-4 flex flex-col gap-1`}>
                <div className="flex items-center gap-1 opacity-70">{stat.icon}<span className="text-xs font-medium">{stat.label}</span></div>
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Filtros:</span>
            </div>
            <div className="flex gap-2">
              {(['all', 'model_a', 'model_b'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTrialFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${trialFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {f === 'all' ? 'Todos' : f === 'model_a' ? 'Modelo A' : 'Modelo B'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(['all', 'trialing', 'trial_expired', 'active'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {f === 'all' ? 'Todos Status' : f === 'trialing' ? 'Em Trial' : f === 'trial_expired' ? 'Expirados' : 'Ativos'}
                </button>
              ))}
            </div>
            <button onClick={fetchTrials} className="ml-auto flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm">
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>

          {/* Trials Table */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Clock size={20} className="text-gray-500" /> Clientes em Trial ({filteredTrials.length})
              </h2>
            </div>
            {trialsLoading ? (
              <div className="p-12 text-center text-gray-500">
                <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                Carregando trials...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                    <tr>
                      <th className="px-6 py-3">Empresa / Usuário</th>
                      <th className="px-6 py-3">Modelo</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Plano</th>
                      <th className="px-6 py-3">Vencimento</th>
                      <th className="px-6 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTrials.map((trial) => (
                      <tr key={trial.id} className={`hover:bg-gray-50 ${trial.trial_model === 'model_b' && trial.subscription_status === 'trialing' && (trial.daysRemaining ?? 999) <= 7 ? 'bg-orange-50' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <Building2 size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-bold text-gray-900">{trial.name}</p>
                              {trial.owner && (
                                <>
                                  <p className="text-xs text-gray-500">{trial.owner.name}</p>
                                  <p className="text-xs text-primary-600">{trial.owner.email}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getModelBadge(trial.trial_model)}</td>
                        <td className="px-6 py-4">{getStatusBadge(trial.subscription_status, trial.daysRemaining)}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-600 capitalize">{trial.plan}</span>
                        </td>
                        <td className="px-6 py-4">
                          {trial.trial_end_at ? (
                            <div>
                              <p className="text-xs font-medium text-gray-700">
                                {new Date(trial.trial_end_at).toLocaleDateString('pt-BR')}
                              </p>
                              {trial.daysRemaining !== null && trial.daysRemaining !== undefined && (
                                <p className={`text-xs ${trial.daysRemaining <= 7 ? 'text-orange-600 font-bold' : 'text-gray-400'}`}>
                                  {trial.daysRemaining > 0 ? `${trial.daysRemaining} dias restantes` : 'Expirado'}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {/* Botão de Payment Link apenas para Modelo B */}
                            {trial.trial_model === 'model_b' && trial.owner && (
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => openPaymentLinkModal(trial)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 transition-colors"
                                  title="Enviar Link de Pagamento"
                                >
                                  <Send size={12} /> Enviar Link
                                </button>
                                {trial.paymentLinkSentAt && (
                                  <p className="text-xs text-gray-400">
                                    Enviado {new Date(trial.paymentLinkSentAt).toLocaleDateString('pt-BR')}
                                  </p>
                                )}
                                {trial.paymentLinkUrl && (
                                  <a
                                    href={trial.paymentLinkUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-teal-600 hover:underline flex items-center gap-0.5"
                                  >
                                    <ExternalLink size={10} /> Ver link
                                  </a>
                                )}
                              </div>
                            )}
                            {trial.trial_model === 'model_a' && (
                              <span className="text-xs text-gray-400 italic">Auto-billing</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTrials.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          {trialsLoading ? 'Carregando...' : 'Nenhum trial encontrado com os filtros selecionados.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Edit size={20} className="text-blue-600" /> Editar Usuário
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input type="text" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                  <input type="text" value={editingUser.companyName} onChange={(e) => setEditingUser({ ...editingUser, companyName: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2" required />
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Key size={16} className="text-yellow-600" />
                    <h4 className="font-bold text-yellow-800 text-sm">Segurança</h4>
                  </div>
                  <p className="text-xs text-yellow-700 mb-3">Não é possível ver a senha atual. Você pode resetá-la para o padrão <strong>12345</strong>.</p>
                  <button type="button" onClick={() => handleResetPassword(editingUser.id)} disabled={isResetting} className="w-full py-2 bg-yellow-100 text-yellow-900 rounded-lg text-sm font-bold hover:bg-yellow-200 border border-yellow-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                    {isResetting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Resetar Senha para '12345'
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plano (Acesso)</label>
                  <select value={editingUser.plan} onChange={(e) => setEditingUser({ ...editingUser, plan: e.target.value as PlanType })} className="w-full border border-gray-300 rounded-lg p-2">
                    <option value="trial">Trial (Teste)</option>
                    <option value="client">HelloClient (Pré)</option>
                    <option value="rating">HelloRating (Pós)</option>
                    <option value="growth">HelloGrowth (Completo)</option>
                    <option value="growth_lifetime">Lifetime (Vitalício)</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={isUpdating} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2">
                    {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Link Modal */}
      {paymentLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-teal-50">
              <h3 className="font-bold text-lg text-teal-900 flex items-center gap-2">
                <Send size={20} className="text-teal-600" /> Enviar Link de Pagamento
              </h3>
              <button onClick={() => { setPaymentLinkModal(null); setSentLinkResult(null); }} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Customer Info */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Cliente</p>
                <p className="font-bold text-gray-900">{paymentLinkModal.company.name}</p>
                {paymentLinkModal.company.owner && (
                  <p className="text-sm text-gray-600">{paymentLinkModal.company.owner.email}</p>
                )}
              </div>

              {sentLinkResult ? (
                /* Success state */
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle size={18} className="text-emerald-600" />
                      <p className="font-bold text-emerald-800">Link gerado com sucesso!</p>
                    </div>
                    {sentLinkResult.emailSent ? (
                      <p className="text-sm text-emerald-700">O e-mail foi enviado automaticamente para o cliente.</p>
                    ) : (
                      <p className="text-sm text-emerald-700">Copie o link abaixo e envie manualmente para o cliente.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link de Pagamento</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={sentLinkResult.url}
                        className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 font-mono"
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(sentLinkResult.url); alert('Link copiado!'); }}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                  <a
                    href={sentLinkResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 border border-teal-600 text-teal-700 rounded-xl font-bold hover:bg-teal-50 transition-colors text-sm"
                  >
                    <ExternalLink size={16} /> Abrir Link no Stripe
                  </a>
                  <button
                    onClick={() => { setPaymentLinkModal(null); setSentLinkResult(null); }}
                    className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                /* Configuration form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                    <select
                      value={paymentLinkModal.plan}
                      onChange={e => setPaymentLinkModal({ ...paymentLinkModal, plan: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2.5"
                    >
                      {PLAN_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Usuários</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={paymentLinkModal.userCount}
                      onChange={e => setPaymentLinkModal({ ...paymentLinkModal, userCount: parseInt(e.target.value) || 1 })}
                      className="w-full border border-gray-300 rounded-lg p-2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Add-ons</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentLinkModal.addons.game}
                          onChange={e => setPaymentLinkModal({ ...paymentLinkModal, addons: { ...paymentLinkModal.addons, game: e.target.checked } })}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700">Game</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentLinkModal.addons.mpd}
                          onChange={e => setPaymentLinkModal({ ...paymentLinkModal, addons: { ...paymentLinkModal.addons, mpd: e.target.checked } })}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700">MPD</span>
                      </label>
                    </div>
                  </div>

                  {/* Price Preview */}
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-teal-700 font-medium">Valor mensal:</span>
                      <span className="text-xl font-bold text-teal-800">
                        R$ {calcPrice(paymentLinkModal.plan, paymentLinkModal.userCount, paymentLinkModal.addons).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <p className="text-xs text-teal-600 mt-1">
                      {paymentLinkModal.userCount} usuário{paymentLinkModal.userCount > 1 ? 's' : ''} × R$ {((calcPrice(paymentLinkModal.plan, paymentLinkModal.userCount, paymentLinkModal.addons)) / paymentLinkModal.userCount).toFixed(2).replace('.', ',')} / usuário
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nota personalizada para o e-mail (opcional)</label>
                    <textarea
                      value={paymentLinkModal.customNote}
                      onChange={e => setPaymentLinkModal({ ...paymentLinkModal, customNote: e.target.value })}
                      placeholder="Ex: Seu trial expira em 3 dias. Aproveite o desconto especial!"
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm resize-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setPaymentLinkModal(null); setSentLinkResult(null); }}
                      className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSendPaymentLink}
                      disabled={sendingLink || !paymentLinkModal.company.owner}
                      className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {sendingLink ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      {sendingLink ? 'Gerando...' : 'Gerar Link'}
                    </button>
                  </div>
                  {!paymentLinkModal.company.owner && (
                    <p className="text-xs text-red-600 text-center">Usuário dono não encontrado para esta empresa.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
