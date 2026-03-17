'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, Trash2, LogOut, Loader2, Users, Edit, X, Save, RefreshCw,
  Key, CheckCircle, AlertTriangle, Clock, Gift, CreditCard, Send,
  ExternalLink, Filter, Mail, Building2, TrendingUp, AlertCircle,
  Search, ChevronDown, ChevronRight, MoreVertical, Copy, Eye,
  Package, Settings, Zap, Star, Shield, UserPlus, BarChart3,
  DollarSign, Activity, ArrowUpRight, Check, Ban, Play
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  plan: string;
  plan_addons?: any;
  subscription_status: string;
  trial_model?: string | null;
  trial_start_at?: string | null;
  trial_end_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  max_users?: number;
  settings?: Record<string, any>;
  created_at: string;
  userRole?: string;
  isDefault?: boolean;
  daysRemaining?: number | null;
  paymentLinkSentAt?: string | null;
  paymentLinkUrl?: string | null;
}

interface Client {
  id: string;
  name: string;
  email: string;
  plan: string;
  companyName?: string;
  createdAt: string;
  settings?: Record<string, any>;
  companies: Company[];
  primaryCompany: Company | null;
  consolidatedStatus: string;
  consolidatedTrialModel: string | null;
  consolidatedDaysRemaining: number | null;
}

interface AdminUserManagementProps {
  onLogout: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial',
  client: 'Hello Client',
  rating: 'Hello Rating',
  growth: 'Hello Growth',
  growth_lifetime: 'Lifetime',
  hello_client: 'Hello Client',
  hello_rating: 'Hello Rating',
  hello_growth: 'Hello Growth',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'Ativo', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  trialing: { label: 'Em Trial', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  trial_expired: { label: 'Trial Expirado', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  past_due: { label: 'Pagamento Atrasado', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  canceled: { label: 'Cancelado', color: 'text-gray-600', bg: 'bg-gray-100 border-gray-200', dot: 'bg-gray-400' },
  growth: { label: 'Hello Growth', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', dot: 'bg-violet-500' },
  rating: { label: 'Hello Rating', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  client: { label: 'Hello Client', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' },
  growth_lifetime: { label: 'Lifetime', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
};

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, daysRemaining }: { status: string; daysRemaining?: number | null }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['active'];
  const urgent = status === 'trialing' && daysRemaining !== null && daysRemaining !== undefined && daysRemaining <= 7;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${urgent ? 'bg-orange-50 text-orange-700 border-orange-200' : cfg.bg + ' ' + cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${urgent ? 'bg-orange-500' : cfg.dot}`} />
      {urgent ? `${daysRemaining}d restantes` : cfg.label}
    </span>
  );
}

function ModelBadge({ model }: { model: string | null }) {
  if (!model) return null;
  if (model === 'model_b') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-teal-100 text-teal-700 border border-teal-200">B</span>;
  if (model === 'model_a') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">A</span>;
  return null;
}

function PlanBadge({ plan }: { plan: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    growth: { label: 'Growth', color: 'bg-violet-100 text-violet-700' },
    hello_growth: { label: 'Growth', color: 'bg-violet-100 text-violet-700' },
    rating: { label: 'Rating', color: 'bg-blue-100 text-blue-700' },
    hello_rating: { label: 'Rating', color: 'bg-blue-100 text-blue-700' },
    client: { label: 'Client', color: 'bg-indigo-100 text-indigo-700' },
    hello_client: { label: 'Client', color: 'bg-indigo-100 text-indigo-700' },
    trial: { label: 'Trial', color: 'bg-gray-100 text-gray-600' },
    growth_lifetime: { label: 'Lifetime', color: 'bg-amber-100 text-amber-700' },
  };
  const cfg = labels[plan] || { label: plan, color: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ onLogout }) => {
  // ── State ──
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editModal, setEditModal] = useState<'client' | 'company' | 'new_client' | 'new_company' | 'payment_link' | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [paymentLinkResult, setPaymentLinkResult] = useState<{ url: string; emailSent: boolean } | null>(null);
  const [sendingLink, setSendingLink] = useState(false);

  // ── Form states ──
  const [clientForm, setClientForm] = useState({ name: '', email: '', plan: 'trial', companyName: '', password: '' });
  const [companyForm, setCompanyForm] = useState({
    name: '', plan: 'hello_growth', subscriptionStatus: 'trialing',
    trialModel: 'model_b', trialEndAt: '', maxUsers: 1,
    addons: { game: false, mpd: false },
    stripeCustomerId: '', stripeSubscriptionId: '',
  });
  const [newClientTrialModel, setNewClientTrialModel] = useState<'none' | 'model_a' | 'model_b'>('none');
  const [newClientTrialPlan, setNewClientTrialPlan] = useState('hello_growth');
  const [newClientTrialDays, setNewClientTrialDays] = useState(30);
  const [paymentLinkForm, setPaymentLinkForm] = useState({
    plan: 'hello_growth', userCount: 1, addons: { game: false, mpd: false }, customNote: '',
  });

  // ── Fetch ──
  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (planFilter !== 'all') params.set('plan', planFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (modelFilter !== 'all') params.set('model', modelFilter);

      const res = await fetch(`/api/admin/clients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, planFilter, statusFilter, modelFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  // ── Toast ──
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Create Client ──
  const handleCreateClient = async () => {
    if (!clientForm.email || !clientForm.name) return showToast('error', 'Nome e e-mail são obrigatórios.');
    setIsSaving(true);
    try {
      if (clientForm.plan === 'trial' && newClientTrialModel === 'model_b') {
        const trialEndAt = new Date(Date.now() + newClientTrialDays * 24 * 60 * 60 * 1000).toISOString();
        const res = await fetch('/api/onboarding/setup-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: clientForm.email.toLowerCase().trim(),
            companies: [clientForm.companyName || clientForm.name],
            plan: newClientTrialPlan,
            userCount: 1,
            addons: { game: false, mpd: false },
            trial_model: 'model_b',
            trial_end_at: trialEndAt,
            userName: clientForm.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error === 'EMAIL_EXISTS' ? 'E-mail já cadastrado.' : data.error);
        showToast('success', `Conta Modelo B criada! Login: ${clientForm.email} / 12345`);
      } else {
        // Verificar se email já existe
        const { data: existing } = await supabase.from('users').select('id').eq('email', clientForm.email.toLowerCase()).single();
        if (existing) throw new Error('E-mail já cadastrado.');

        const userData: any = {
          name: clientForm.name,
          email: clientForm.email.toLowerCase().trim(),
          company_name: clientForm.companyName || clientForm.name,
          plan: clientForm.plan,
          tenant_id: crypto.randomUUID(),
          role: 'admin',
          is_owner: true,
          password: '12345',
          settings: {
            companyName: clientForm.companyName || clientForm.name,
            adminEmail: clientForm.email.toLowerCase().trim(),
            autoRedirect: true,
            ...(clientForm.plan === 'trial' && newClientTrialModel === 'model_a' ? { trial_model: 'model_a' } : {}),
          }
        };

        const { data: createdUser, error } = await supabase.from('users').insert([userData]).select().single();
        if (error) throw error;

        // Se Modelo A, criar empresa
        if (clientForm.plan === 'trial' && newClientTrialModel === 'model_a' && createdUser) {
          const trialEndAt = new Date(Date.now() + newClientTrialDays * 24 * 60 * 60 * 1000).toISOString();
          const companyId = crypto.randomUUID();
          await supabase.from('companies').insert([{
            id: companyId,
            name: clientForm.companyName || clientForm.name,
            plan: newClientTrialPlan.replace('hello_', '') || 'growth',
            plan_addons: JSON.stringify({ game: false, mpd: false }),
            subscription_status: 'trialing',
            trial_start_at: new Date().toISOString(),
            trial_end_at: trialEndAt,
            trial_model: 'model_a',
            created_by: createdUser.id,
            settings: { companyName: clientForm.companyName || clientForm.name, adminEmail: clientForm.email, autoRedirect: true, trial_model: 'model_a' }
          }]);
          await supabase.from('user_companies').insert([{
            user_id: createdUser.id, company_id: companyId, role: 'owner', is_default: true, status: 'active', accepted_at: new Date().toISOString()
          }]);
        }

        showToast('success', `Cliente criado! Login: ${clientForm.email} / 12345`);
      }

      setEditModal(null);
      setClientForm({ name: '', email: '', plan: 'trial', companyName: '', password: '' });
      setNewClientTrialModel('none');
      fetchClients();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao criar cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Update Client ──
  const handleUpdateClient = async () => {
    if (!selectedClient) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedClient.id,
          userData: {
            name: clientForm.name,
            email: clientForm.email,
            plan: clientForm.plan,
            companyName: clientForm.companyName,
            ...(clientForm.password ? { password: clientForm.password } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('success', 'Cliente atualizado com sucesso!');
      setEditModal(null);
      fetchClients();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao atualizar.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Update Company ──
  const handleUpdateCompany = async () => {
    if (!selectedClient || !editingCompany) return;
    setIsSaving(true);
    try {
      const addons = companyForm.addons;
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedClient.id,
          companyUpdates: {
            companyId: editingCompany.id,
            name: companyForm.name,
            plan: companyForm.plan.replace('hello_', ''),
            planAddons: addons,
            subscriptionStatus: companyForm.subscriptionStatus,
            trialModel: companyForm.trialModel || null,
            trialEndAt: companyForm.trialEndAt || null,
            maxUsers: companyForm.maxUsers,
            stripeCustomerId: companyForm.stripeCustomerId || null,
            stripeSubscriptionId: companyForm.stripeSubscriptionId || null,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('success', 'Empresa atualizada!');
      setEditModal(null);
      fetchClients();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao atualizar empresa.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Add Company ──
  const handleAddCompany = async () => {
    if (!selectedClient) return;
    setIsSaving(true);
    try {
      const trialEndAt = companyForm.trialEndAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedClient.id,
          addCompany: {
            name: companyForm.name,
            plan: companyForm.plan.replace('hello_', ''),
            planAddons: companyForm.addons,
            subscriptionStatus: companyForm.subscriptionStatus,
            trialModel: companyForm.trialModel || null,
            trialEndAt,
            maxUsers: companyForm.maxUsers,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('success', 'Empresa adicionada!');
      setEditModal(null);
      fetchClients();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao adicionar empresa.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Remove Company ──
  const handleRemoveCompany = async (client: Client, companyId: string) => {
    if (!confirm('Remover esta empresa? Os dados serão perdidos.')) return;
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: client.id, removeCompanyId: companyId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('success', 'Empresa removida.');
      fetchClients();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao remover empresa.');
    }
  };

  // ── Delete Client ──
  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Excluir permanentemente "${client.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/admin/clients?userId=${client.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('success', 'Cliente excluído.');
      if (expandedClient === client.id) setExpandedClient(null);
      fetchClients();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao excluir.');
    }
  };

  // ── Reset Password ──
  const handleResetPassword = async (client: Client) => {
    if (!confirm(`Resetar senha de "${client.email}" para '12345'?`)) return;
    try {
      const { error } = await supabase.from('users').update({ password: '12345' }).eq('id', client.id);
      if (error) throw error;
      showToast('success', 'Senha resetada para 12345.');
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao resetar senha.');
    }
  };

  // ── Payment Link ──
  const handleSendPaymentLink = async (company: Company) => {
    setSendingLink(true);
    try {
      const res = await fetch('/api/stripe/send-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedClient?.id,
          companyId: company.id,
          plan: paymentLinkForm.plan,
          userCount: paymentLinkForm.userCount,
          addons: paymentLinkForm.addons,
          customNote: paymentLinkForm.customNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar link');
      setPaymentLinkResult({ url: data.paymentUrl, emailSent: data.emailSent });
      fetchClients();
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao gerar link de pagamento.');
    } finally {
      setSendingLink(false);
    }
  };

  // ── Open Modals ──
  const openEditClient = (client: Client) => {
    setSelectedClient(client);
    setClientForm({
      name: client.name,
      email: client.email,
      plan: client.plan,
      companyName: client.companyName || '',
      password: '',
    });
    setEditModal('client');
  };

  const openEditCompany = (client: Client, company: Company) => {
    setSelectedClient(client);
    setEditingCompany(company);
    const addons = typeof company.plan_addons === 'string'
      ? JSON.parse(company.plan_addons || '{}')
      : (company.plan_addons || {});
    setCompanyForm({
      name: company.name,
      plan: company.plan.startsWith('hello_') ? company.plan : `hello_${company.plan}`,
      subscriptionStatus: company.subscription_status,
      trialModel: company.trial_model || '',
      trialEndAt: company.trial_end_at ? company.trial_end_at.split('T')[0] : '',
      maxUsers: company.max_users || 1,
      addons: { game: addons.game || false, mpd: addons.mpd || false },
      stripeCustomerId: company.stripe_customer_id || '',
      stripeSubscriptionId: company.stripe_subscription_id || '',
    });
    setEditModal('company');
  };

  const openAddCompany = (client: Client) => {
    setSelectedClient(client);
    setCompanyForm({
      name: '', plan: 'hello_growth', subscriptionStatus: 'trialing',
      trialModel: 'model_b', trialEndAt: '', maxUsers: 1,
      addons: { game: false, mpd: false },
      stripeCustomerId: '', stripeSubscriptionId: '',
    });
    setEditModal('new_company');
  };

  const openPaymentLink = (client: Client, company: Company) => {
    setSelectedClient(client);
    setEditingCompany(company);
    let plan = company.plan;
    if (!plan.startsWith('hello_')) plan = `hello_${plan}`;
    setPaymentLinkForm({ plan, userCount: company.max_users || 1, addons: { game: false, mpd: false }, customNote: '' });
    setPaymentLinkResult(null);
    setEditModal('payment_link');
  };

  // ── Render ──
  const paymentPrice = calcPrice(paymentLinkForm.plan, paymentLinkForm.userCount, paymentLinkForm.addons);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">HelloGrowth Admin</h1>
              <p className="text-xs text-gray-400">Painel de Gestão de Clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setClientForm({ name: '', email: '', plan: 'trial', companyName: '', password: '' }); setNewClientTrialModel('none'); setEditModal('new_client'); }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <UserPlus size={16} /> Novo Cliente
            </button>
            <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Total Clientes', value: stats.total || 0, icon: <Users size={14} />, color: 'text-gray-300' },
            { label: 'Ativos', value: stats.active || 0, icon: <CheckCircle size={14} />, color: 'text-emerald-400' },
            { label: 'Em Trial', value: stats.trialing || 0, icon: <Clock size={14} />, color: 'text-blue-400' },
            { label: 'Expirados', value: stats.trial_expired || 0, icon: <AlertCircle size={14} />, color: 'text-red-400' },
            { label: 'Modelo A', value: stats.model_a || 0, icon: <Star size={14} />, color: 'text-purple-400' },
            { label: 'Modelo B', value: stats.model_b || 0, icon: <Gift size={14} />, color: 'text-teal-400' },
            { label: 'Urgente (B)', value: stats.urgent_b || 0, icon: <AlertTriangle size={14} />, color: 'text-orange-400' },
            { label: 'MRR Est.', value: `R$ ${(stats.mrr || 0).toFixed(0)}`, icon: <DollarSign size={14} />, color: 'text-amber-400' },
          ].map((kpi, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className={`flex items-center gap-1.5 text-xs mb-2 ${kpi.color}`}>
                {kpi.icon}
                <span className="text-gray-400 truncate">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou empresa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Plan Filter */}
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-emerald-500">
              <option value="all">Todos os Planos</option>
              <option value="trial">Trial</option>
              <option value="client">Hello Client</option>
              <option value="rating">Hello Rating</option>
              <option value="growth">Hello Growth</option>
              <option value="growth_lifetime">Lifetime</option>
            </select>

            {/* Status Filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-emerald-500">
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="trialing">Em Trial</option>
              <option value="trial_expired">Trial Expirado</option>
              <option value="past_due">Pagamento Atrasado</option>
              <option value="canceled">Cancelados</option>
            </select>

            {/* Model Filter */}
            <select value={modelFilter} onChange={e => setModelFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-emerald-500">
              <option value="all">Todos os Modelos</option>
              <option value="model_a">Modelo A</option>
              <option value="model_b">Modelo B</option>
              <option value="no_model">Sem Modelo</option>
            </select>

            <button onClick={fetchClients} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm px-3 py-2 rounded-lg transition-colors">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Atualizar
            </button>

            <span className="text-xs text-gray-500 ml-auto">{clients.length} cliente{clients.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Users size={40} className="mb-3 opacity-30" />
              <p className="font-medium">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou criar um novo cliente</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 w-8"></th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Plano</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Modelo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Empresas</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Cadastro</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {clients.map(client => (
                  <React.Fragment key={client.id}>
                    <tr
                      className={`hover:bg-gray-800/50 transition-colors cursor-pointer ${expandedClient === client.id ? 'bg-gray-800/30' : ''}`}
                      onClick={() => setExpandedClient(expandedClient === client.id ? null : client.id)}
                    >
                      <td className="px-6 py-4">
                        <ChevronRight size={14} className={`text-gray-500 transition-transform ${expandedClient === client.id ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm flex-shrink-0">
                            {client.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{client.name}</p>
                            <p className="text-xs text-gray-400">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <PlanBadge plan={client.plan} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={client.consolidatedStatus} daysRemaining={client.consolidatedDaysRemaining} />
                      </td>
                      <td className="px-4 py-4">
                        <ModelBadge model={client.consolidatedTrialModel} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-300">{client.companies.length} empresa{client.companies.length !== 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-500">{new Date(client.createdAt).toLocaleDateString('pt-BR')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEditClient(client)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Editar cliente">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => openAddCompany(client)} className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-gray-700 rounded-lg transition-colors" title="Adicionar empresa">
                            <Building2 size={14} />
                          </button>
                          <button onClick={() => handleResetPassword(client)} className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-gray-700 rounded-lg transition-colors" title="Resetar senha">
                            <Key size={14} />
                          </button>
                          <button onClick={() => handleDeleteClient(client)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors" title="Excluir cliente">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row — Companies */}
                    {expandedClient === client.id && (
                      <tr>
                        <td colSpan={8} className="bg-gray-800/20 px-6 py-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Building2 size={12} /> Empresas vinculadas
                              </h4>
                              <button
                                onClick={() => openAddCompany(client)}
                                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                              >
                                <Plus size={12} /> Adicionar empresa
                              </button>
                            </div>

                            {client.companies.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">Nenhuma empresa vinculada.</p>
                            ) : (
                              <div className="grid gap-2">
                                {client.companies.map(company => {
                                  const addons = typeof company.plan_addons === 'string'
                                    ? JSON.parse(company.plan_addons || '{}')
                                    : (company.plan_addons || {});
                                  return (
                                    <div key={company.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
                                      <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                                        <Building2 size={14} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-sm font-semibold text-white truncate">{company.name}</p>
                                          <PlanBadge plan={company.plan} />
                                          <StatusBadge status={company.subscription_status} daysRemaining={company.daysRemaining} />
                                          {company.trial_model && <ModelBadge model={company.trial_model} />}
                                          {addons.game && <span className="px-1.5 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded border border-purple-700">Game</span>}
                                          {addons.mpd && <span className="px-1.5 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded border border-blue-700">MPD</span>}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1">
                                          {company.trial_end_at && (
                                            <span className="text-xs text-gray-500">
                                              Vence: {new Date(company.trial_end_at).toLocaleDateString('pt-BR')}
                                            </span>
                                          )}
                                          {company.stripe_subscription_id && (
                                            <span className="text-xs text-gray-500 font-mono truncate max-w-[120px]" title={company.stripe_subscription_id}>
                                              sub: {company.stripe_subscription_id.slice(0, 12)}...
                                            </span>
                                          )}
                                          {company.paymentLinkSentAt && (
                                            <span className="text-xs text-teal-500">
                                              Link enviado: {new Date(company.paymentLinkSentAt).toLocaleDateString('pt-BR')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => openEditCompany(client, company)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Editar empresa">
                                          <Edit size={13} />
                                        </button>
                                        {company.trial_model === 'model_b' && (
                                          <button onClick={() => openPaymentLink(client, company)} className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600/20 hover:bg-teal-600/40 text-teal-400 text-xs font-semibold rounded-lg border border-teal-600/30 transition-colors">
                                            <CreditCard size={12} /> Enviar Link
                                          </button>
                                        )}
                                        {client.companies.length > 1 && (
                                          <button onClick={() => handleRemoveCompany(client, company.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors" title="Remover empresa">
                                            <Trash2 size={13} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── Modals ── */}

      {/* New Client Modal */}
      {editModal === 'new_client' && (
        <Modal title="Novo Cliente" onClose={() => setEditModal(null)}>
          <div className="space-y-4">
            <FormField label="Nome Completo">
              <input type="text" value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="João Silva" />
            </FormField>
            <FormField label="E-mail (Login)">
              <input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="joao@empresa.com" />
            </FormField>
            <FormField label="Empresa Principal">
              <input type="text" value={clientForm.companyName} onChange={e => setClientForm(f => ({ ...f, companyName: e.target.value }))} className={inputCls} placeholder="Nome da empresa" />
            </FormField>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-gray-400 flex items-center gap-2">
              <Key size={14} /> Senha padrão: <strong className="text-white">12345</strong>
            </div>
            <FormField label="Plano Inicial">
              <select value={clientForm.plan} onChange={e => { setClientForm(f => ({ ...f, plan: e.target.value })); if (e.target.value !== 'trial') setNewClientTrialModel('none'); }} className={inputCls}>
                <option value="trial">Trial (Teste)</option>
                <option value="client">Hello Client</option>
                <option value="rating">Hello Rating</option>
                <option value="growth">Hello Growth</option>
                <option value="growth_lifetime">Lifetime (Vitalício)</option>
              </select>
            </FormField>

            {clientForm.plan === 'trial' && (
              <>
                <FormField label="Modelo de Trial">
                  <div className="grid grid-cols-3 gap-2">
                    {(['none', 'model_a', 'model_b'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setNewClientTrialModel(m)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${newClientTrialModel === m
                          ? m === 'model_b' ? 'bg-teal-600 text-white border-teal-500' : m === 'model_a' ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-600 text-white border-gray-500'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}>
                        {m === 'none' ? 'Nenhum' : m === 'model_a' ? 'Modelo A' : 'Modelo B'}
                      </button>
                    ))}
                  </div>
                </FormField>

                {newClientTrialModel !== 'none' && (
                  <>
                    <FormField label="Plano do Trial">
                      <select value={newClientTrialPlan} onChange={e => setNewClientTrialPlan(e.target.value)} className={inputCls}>
                        <option value="hello_client">Hello Client</option>
                        <option value="hello_rating">Hello Rating</option>
                        <option value="hello_growth">Hello Growth</option>
                      </select>
                    </FormField>
                    <FormField label="Duração (dias)">
                      <input type="number" min={1} max={90} value={newClientTrialDays} onChange={e => setNewClientTrialDays(parseInt(e.target.value) || 30)} className={inputCls} />
                    </FormField>
                    {newClientTrialModel === 'model_b' && (
                      <div className="bg-teal-900/30 border border-teal-700/50 rounded-lg p-3 text-xs text-teal-300">
                        <strong>Modelo B:</strong> Conta criada sem cobrança. Envie o link de pagamento pela aba de empresas do cliente.
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditModal(null)} className={btnSecondary}>Cancelar</button>
              <button onClick={handleCreateClient} disabled={isSaving} className={btnPrimary}>
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Criar Cliente
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Client Modal */}
      {editModal === 'client' && selectedClient && (
        <Modal title={`Editar Cliente — ${selectedClient.name}`} onClose={() => setEditModal(null)}>
          <div className="space-y-4">
            <FormField label="Nome Completo">
              <input type="text" value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="E-mail (Login)">
              <input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Empresa Principal">
              <input type="text" value={clientForm.companyName} onChange={e => setClientForm(f => ({ ...f, companyName: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Plano de Acesso">
              <select value={clientForm.plan} onChange={e => setClientForm(f => ({ ...f, plan: e.target.value }))} className={inputCls}>
                <option value="trial">Trial</option>
                <option value="client">Hello Client</option>
                <option value="rating">Hello Rating</option>
                <option value="growth">Hello Growth</option>
                <option value="growth_lifetime">Lifetime</option>
              </select>
            </FormField>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5"><Key size={12} /> Nova Senha (deixe vazio para não alterar)</p>
              <input type="text" value={clientForm.password} onChange={e => setClientForm(f => ({ ...f, password: e.target.value }))} className={inputCls} placeholder="Nova senha..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditModal(null)} className={btnSecondary}>Cancelar</button>
              <button onClick={handleUpdateClient} disabled={isSaving} className={btnPrimary}>
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Company Modal */}
      {editModal === 'company' && editingCompany && (
        <Modal title={`Editar Empresa — ${editingCompany.name}`} onClose={() => setEditModal(null)} wide>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nome da Empresa" className="col-span-2">
              <input type="text" value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Plano">
              <select value={companyForm.plan} onChange={e => setCompanyForm(f => ({ ...f, plan: e.target.value }))} className={inputCls}>
                <option value="hello_client">Hello Client</option>
                <option value="hello_rating">Hello Rating</option>
                <option value="hello_growth">Hello Growth</option>
              </select>
            </FormField>
            <FormField label="Status da Assinatura">
              <select value={companyForm.subscriptionStatus} onChange={e => setCompanyForm(f => ({ ...f, subscriptionStatus: e.target.value }))} className={inputCls}>
                <option value="trialing">Em Trial</option>
                <option value="active">Ativo</option>
                <option value="trial_expired">Trial Expirado</option>
                <option value="past_due">Pagamento Atrasado</option>
                <option value="canceled">Cancelado</option>
              </select>
            </FormField>
            <FormField label="Modelo de Trial">
              <select value={companyForm.trialModel} onChange={e => setCompanyForm(f => ({ ...f, trialModel: e.target.value }))} className={inputCls}>
                <option value="">Nenhum</option>
                <option value="model_a">Modelo A</option>
                <option value="model_b">Modelo B</option>
              </select>
            </FormField>
            <FormField label="Vencimento do Trial">
              <input type="date" value={companyForm.trialEndAt} onChange={e => setCompanyForm(f => ({ ...f, trialEndAt: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Máx. Usuários">
              <input type="number" min={1} max={50} value={companyForm.maxUsers} onChange={e => setCompanyForm(f => ({ ...f, maxUsers: parseInt(e.target.value) || 1 }))} className={inputCls} />
            </FormField>
            <FormField label="Add-ons">
              <div className="flex gap-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={companyForm.addons.game} onChange={e => setCompanyForm(f => ({ ...f, addons: { ...f.addons, game: e.target.checked } }))} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-300">Game</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={companyForm.addons.mpd} onChange={e => setCompanyForm(f => ({ ...f, addons: { ...f.addons, mpd: e.target.checked } }))} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-300">MPD</span>
                </label>
              </div>
            </FormField>
            <FormField label="Stripe Customer ID" className="col-span-2">
              <input type="text" value={companyForm.stripeCustomerId} onChange={e => setCompanyForm(f => ({ ...f, stripeCustomerId: e.target.value }))} className={inputCls} placeholder="cus_..." />
            </FormField>
            <FormField label="Stripe Subscription ID" className="col-span-2">
              <input type="text" value={companyForm.stripeSubscriptionId} onChange={e => setCompanyForm(f => ({ ...f, stripeSubscriptionId: e.target.value }))} className={inputCls} placeholder="sub_..." />
            </FormField>
          </div>
          <div className="flex gap-3 pt-4 mt-2 border-t border-gray-800">
            <button onClick={() => setEditModal(null)} className={btnSecondary}>Cancelar</button>
            <button onClick={handleUpdateCompany} disabled={isSaving} className={btnPrimary}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar Empresa
            </button>
          </div>
        </Modal>
      )}

      {/* Add Company Modal */}
      {editModal === 'new_company' && selectedClient && (
        <Modal title={`Nova Empresa — ${selectedClient.name}`} onClose={() => setEditModal(null)} wide>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nome da Empresa" className="col-span-2">
              <input type="text" value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Nome da empresa" />
            </FormField>
            <FormField label="Plano">
              <select value={companyForm.plan} onChange={e => setCompanyForm(f => ({ ...f, plan: e.target.value }))} className={inputCls}>
                <option value="hello_client">Hello Client</option>
                <option value="hello_rating">Hello Rating</option>
                <option value="hello_growth">Hello Growth</option>
              </select>
            </FormField>
            <FormField label="Status Inicial">
              <select value={companyForm.subscriptionStatus} onChange={e => setCompanyForm(f => ({ ...f, subscriptionStatus: e.target.value }))} className={inputCls}>
                <option value="trialing">Em Trial</option>
                <option value="active">Ativo</option>
              </select>
            </FormField>
            <FormField label="Modelo de Trial">
              <select value={companyForm.trialModel} onChange={e => setCompanyForm(f => ({ ...f, trialModel: e.target.value }))} className={inputCls}>
                <option value="">Nenhum</option>
                <option value="model_a">Modelo A</option>
                <option value="model_b">Modelo B</option>
              </select>
            </FormField>
            <FormField label="Vencimento do Trial">
              <input type="date" value={companyForm.trialEndAt} onChange={e => setCompanyForm(f => ({ ...f, trialEndAt: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Máx. Usuários">
              <input type="number" min={1} max={50} value={companyForm.maxUsers} onChange={e => setCompanyForm(f => ({ ...f, maxUsers: parseInt(e.target.value) || 1 }))} className={inputCls} />
            </FormField>
            <FormField label="Add-ons">
              <div className="flex gap-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={companyForm.addons.game} onChange={e => setCompanyForm(f => ({ ...f, addons: { ...f.addons, game: e.target.checked } }))} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-300">Game</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={companyForm.addons.mpd} onChange={e => setCompanyForm(f => ({ ...f, addons: { ...f.addons, mpd: e.target.checked } }))} className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-300">MPD</span>
                </label>
              </div>
            </FormField>
          </div>
          <div className="flex gap-3 pt-4 mt-2 border-t border-gray-800">
            <button onClick={() => setEditModal(null)} className={btnSecondary}>Cancelar</button>
            <button onClick={handleAddCompany} disabled={isSaving || !companyForm.name} className={btnPrimary}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Adicionar Empresa
            </button>
          </div>
        </Modal>
      )}

      {/* Payment Link Modal */}
      {editModal === 'payment_link' && editingCompany && selectedClient && (
        <Modal title="Enviar Link de Pagamento" onClose={() => { setEditModal(null); setPaymentLinkResult(null); }}>
          {paymentLinkResult ? (
            <div className="space-y-4">
              <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4 text-center">
                <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-300 font-semibold">Link gerado com sucesso!</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Link de Pagamento:</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-emerald-400 font-mono flex-1 truncate">{paymentLinkResult.url}</p>
                  <button onClick={() => { navigator.clipboard.writeText(paymentLinkResult.url); showToast('success', 'Link copiado!'); }} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                    <Copy size={14} />
                  </button>
                  <a href={paymentLinkResult.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              <button onClick={() => { setEditModal(null); setPaymentLinkResult(null); }} className={`w-full ${btnPrimary}`}>
                <Check size={16} /> Concluído
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm">
                <p className="text-gray-400 text-xs mb-1">Cliente</p>
                <p className="text-white font-semibold">{selectedClient.name}</p>
                <p className="text-gray-400 text-xs">{selectedClient.email}</p>
              </div>
              <FormField label="Plano">
                <select value={paymentLinkForm.plan} onChange={e => setPaymentLinkForm(f => ({ ...f, plan: e.target.value }))} className={inputCls}>
                  <option value="hello_client">Hello Client</option>
                  <option value="hello_rating">Hello Rating</option>
                  <option value="hello_growth">Hello Growth</option>
                </select>
              </FormField>
              <FormField label="Número de Usuários">
                <input type="number" min={1} max={10} value={paymentLinkForm.userCount} onChange={e => setPaymentLinkForm(f => ({ ...f, userCount: parseInt(e.target.value) || 1 }))} className={inputCls} />
              </FormField>
              <FormField label="Add-ons">
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={paymentLinkForm.addons.game} onChange={e => setPaymentLinkForm(f => ({ ...f, addons: { ...f.addons, game: e.target.checked } }))} className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-300">Game</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={paymentLinkForm.addons.mpd} onChange={e => setPaymentLinkForm(f => ({ ...f, addons: { ...f.addons, mpd: e.target.checked } }))} className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-300">MPD</span>
                  </label>
                </div>
              </FormField>
              <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-300">Valor mensal total:</span>
                <span className="text-lg font-bold text-emerald-400">R$ {paymentPrice.toFixed(2).replace('.', ',')}</span>
              </div>
              <FormField label="Nota personalizada (opcional)">
                <textarea value={paymentLinkForm.customNote} onChange={e => setPaymentLinkForm(f => ({ ...f, customNote: e.target.value }))} className={`${inputCls} h-20 resize-none`} placeholder="Mensagem para o cliente..." />
              </FormField>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditModal(null)} className={btnSecondary}>Cancelar</button>
                <button onClick={() => handleSendPaymentLink(editingCompany)} disabled={sendingLink} className={btnPrimary}>
                  {sendingLink ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  Gerar Link
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30';
const btnPrimary = 'flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary = 'flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors';

function FormField({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default AdminUserManagement;
