'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Plus, Trash2, LogOut, Loader2, Users, Edit, X, Save, RefreshCw,
  Key, CheckCircle, AlertTriangle, Clock, Gift, CreditCard,
  ExternalLink, Building2, AlertCircle, Search, ChevronRight, Copy,
  Zap, Star, UserPlus, DollarSign, Check, Moon, Sun, Send, BookOpen, Package, TrendingUp,
  LayoutDashboard, Brain, MessageSquare, ChevronLeft, BarChart3,
  Activity, Heart, FileText, MessageCircle, UserCheck, UserCog, Kanban, Lock, Eye, EyeOff, LogIn, Mail
} from 'lucide-react';
import AdminBroadcast from '@/components/AdminBroadcast';
import AdminIntelligence from '@/components/AdminIntelligence';
import AdminTemplates from '@/components/AdminTemplates';
import AdminCatalogs from '@/components/AdminCatalogs';
import AdminFinanceiro from '@/components/AdminFinanceiro';
import AdminHome from '@/components/AdminHome';
import AdminColaboradores from '@/components/AdminColaboradores';
import AdminWhatsApp from '@/components/AdminWhatsApp';
import AdminEmail from '@/components/AdminEmail';
import AdminKanban from '@/components/AdminKanban';
import AdminHistorico from '@/components/AdminHistorico';
import ClientProfile from '@/components/ClientProfile';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface AdminUserManagementProps {
  onLogout: () => void;
  onImpersonate?: (client: any) => void;
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────

const DARK = {
  bg: 'bg-gray-950',
  surface: 'bg-gray-900',
  surfaceHover: 'hover:bg-gray-800/50',
  surfaceExpanded: 'bg-gray-800/30',
  surfaceInner: 'bg-gray-900',
  border: 'border-gray-800',
  borderInner: 'border-gray-700',
  text: 'text-white',
  textSub: 'text-gray-400',
  textMuted: 'text-gray-500',
  label: 'text-gray-400',
  input: 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500 focus:border-emerald-500 focus:ring-emerald-500/30',
  btnSecondary: 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300',
  header: 'bg-gray-900 border-gray-800',
  kpi: 'bg-gray-900 border-gray-800',
  filterBar: 'bg-gray-900 border-gray-800',
  table: 'bg-gray-900 border-gray-800',
  thead: 'text-gray-500',
  divider: 'divide-gray-800',
  expandBg: 'bg-gray-800/20',
  companyCard: 'bg-gray-900 border-gray-700',
  modalBg: 'bg-gray-900 border-gray-700',
  modalHeader: 'border-gray-800',
  securityBox: 'bg-gray-800 border-gray-700',
  securityText: 'text-gray-400',
  paymentBox: 'bg-emerald-900/20 border-emerald-700/40',
  paymentText: 'text-emerald-400',
  successBox: 'bg-emerald-900/30 border-emerald-700/50',
  linkBox: 'bg-gray-800 border-gray-700',
  linkText: 'text-emerald-400',
  modelBBox: 'bg-teal-900/30 border-teal-700/50 text-teal-300',
  stripeBox: 'text-teal-500',
  avatar: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
  sendLinkBtn: 'bg-teal-600/20 hover:bg-teal-600/40 text-teal-400 border-teal-600/30',
  overlay: 'bg-black/70',
};

const LIGHT = {
  bg: 'bg-slate-50',
  surface: 'bg-white',
  surfaceHover: 'hover:bg-slate-50',
  surfaceExpanded: 'bg-slate-50/80',
  surfaceInner: 'bg-white',
  border: 'border-slate-200',
  borderInner: 'border-slate-200',
  text: 'text-slate-900',
  textSub: 'text-slate-500',
  textMuted: 'text-slate-400',
  label: 'text-slate-500',
  input: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20',
  btnSecondary: 'bg-white hover:bg-slate-50 border-slate-300 text-slate-600',
  header: 'bg-white border-slate-200',
  kpi: 'bg-white border-slate-200',
  filterBar: 'bg-white border-slate-200',
  table: 'bg-white border-slate-200',
  thead: 'text-slate-500',
  divider: 'divide-slate-100',
  expandBg: 'bg-slate-50',
  companyCard: 'bg-slate-50 border-slate-200',
  modalBg: 'bg-white border-slate-200',
  modalHeader: 'border-slate-100',
  securityBox: 'bg-amber-50 border-amber-200',
  securityText: 'text-amber-700',
  paymentBox: 'bg-emerald-50 border-emerald-200',
  paymentText: 'text-emerald-700',
  successBox: 'bg-emerald-50 border-emerald-200',
  linkBox: 'bg-slate-50 border-slate-200',
  linkText: 'text-emerald-600',
  modelBBox: 'bg-teal-50 border-teal-200 text-teal-700',
  stripeBox: 'text-teal-600',
  avatar: 'bg-gradient-to-br from-emerald-100 to-teal-100 border-emerald-200 text-emerald-600',
  sendLinkBtn: 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200',
  overlay: 'bg-slate-900/50',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'Ativo', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  trialing: { label: 'Em Trial', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
  trial_expired: { label: 'Trial Expirado', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  past_due: { label: 'Pagamento Atrasado', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
  canceled: { label: 'Cancelado', color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200', dot: 'bg-slate-400' },
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

// ─── Shared Badge Components (theme-agnostic, use fixed Tailwind classes) ─────

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
    trial: { label: 'Trial', color: 'bg-slate-100 text-slate-600' },
    growth_lifetime: { label: 'Lifetime', color: 'bg-amber-100 text-amber-700' },
  };
  const cfg = labels[plan] || { label: plan, color: 'bg-slate-100 text-slate-600' };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ onLogout, onImpersonate }) => {
   // ── Theme ──
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? DARK : LIGHT;
  // ── Active Tab ──
  const [activeTab, setActiveTab] = useState<'home' | 'clients' | 'broadcast' | 'intelligence' | 'templates' | 'catalogs' | 'financeiro' | 'conteudo' | 'colaboradores' | 'kanban' | 'whatsapp' | 'email' | 'lixeira'>('home');
  const [conteudoSubTab, setConteudoSubTab] = useState<'templates' | 'catalogs' | 'broadcast'>('templates');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // ── Financeiro Password Protection ──
  const [financeiroUnlocked, setFinanceiroUnlocked] = useState(false);
  const [showFinanceiroModal, setShowFinanceiroModal] = useState(false);
  const [financeiroPassword, setFinanceiroPassword] = useState('');
  const [financeiroPasswordError, setFinanceiroPasswordError] = useState(false);
  const [financeiroShowPwd, setFinanceiroShowPwd] = useState(false);
  const FINANCEIRO_PASSWORD = '2002';
  const [asaasClientMap, setAsaasClientMap] = useState<Record<string, any>>({});
  const [asaasLoaded, setAsaasLoaded] = useState(false);

  // ── Analytics / Intelligence ──
  const [analyticsData, setAnalyticsData] = useState<{ global: any; tenants: any[] } | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (analyticsData) return; // já carregado
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch('/api/admin/analytics?type=overview');
      const data = await res.json();
      setAnalyticsData(data);
    } catch (e) {
      console.error('Error fetching analytics:', e);
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [analyticsData]);
  // ── State ──
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [clientSortField, setClientSortField] = useState<string>('createdAt');
  const [clientSortDir, setClientSortDir] = useState<'asc' | 'desc'>('desc');
  const handleClientSort = (field: string) => {
    if (clientSortField === field) {
      setClientSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setClientSortField(field);
      setClientSortDir('desc');
    }
  };
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editModal, setEditModal] = useState<'client' | 'company' | 'new_client' | 'new_company' | 'payment_link' | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clientUsageMap, setClientUsageMap] = useState<Record<string, any>>({});
  const [loadingUsage, setLoadingUsage] = useState<Record<string, boolean>>({});
  const [editingSdrCs, setEditingSdrCs] = useState<string | null>(null);
  const [sdrCsForm, setSdrCsForm] = useState({ sdr_name: '', cs_name: '', internal_notes: '' });
  const [colaboradoresList, setColaboradoresList] = useState<{ id: string; name: string; role: string }[]>([]);
  const [paymentLinkResult, setPaymentLinkResult] = useState<{ url: string; emailSent: boolean } | null>(null);
  const [profileClient, setProfileClient] = useState<Client | null>(null);
  const [sendingLink, setSendingLink] = useState(false);
  const [reportModal, setReportModal] = useState<{ client: Client; usage: any } | null>(null);
  const [reportContent, setReportContent] = useState('');

  // ── Form states ──
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', plan: 'trial', companyName: '', password: '', city: '', state: '', niche: '', chairs: '' as string | number, dentists: '' as string | number, has_secretary: false });
  const [niches, setNiches] = useState<{ id: string; name: string; slug: string; has_clinic_fields: boolean }[]>([]);

  // ── Kanban selection for new client ──
  const [kanbanBoards, setKanbanBoards] = useState<{ id: string; name: string; color: string }[]>([]);
  const [kanbanStages, setKanbanStages] = useState<{ id: string; name: string; emoji: string; board_id?: string }[]>([]);
  const [newClientBoardId, setNewClientBoardId] = useState('');
  const [newClientStageId, setNewClientStageId] = useState('');
  const [loadingKanban, setLoadingKanban] = useState(false);

  const fetchKanbanBoardsAndStages = async () => {
    setLoadingKanban(true);
    try {
      const res = await fetch('/api/admin/kanban?action=all');
      const data = await res.json();
      const boards = data.boards || [];
      const stages = data.stages || [];
      setKanbanBoards(boards);
      setKanbanStages(stages);
      if (boards.length > 0) {
        const defaultBoard = boards.find((b: any) => b.is_default) || boards[0];
        setNewClientBoardId(defaultBoard.id);
        const boardStages = stages.filter((s: any) => s.board_id === defaultBoard.id || !s.board_id);
        if (boardStages.length > 0) setNewClientStageId(boardStages[0].id);
      }
    } catch (e) {
      console.error('Error fetching kanban:', e);
    } finally {
      setLoadingKanban(false);
    }
  };
  const [companyForm, setCompanyForm] = useState({
    name: '', plan: 'hello_growth', subscriptionStatus: 'trialing',
    trialModel: 'model_b', trialEndAt: '', maxUsers: 1,
    addons: { game: false, mpd: false, health: false, actions: 'none' as 'none' | 'simplified' | 'complete' },
    stripeCustomerId: '', stripeSubscriptionId: '',
  });
  const [newClientTrialModel, setNewClientTrialModel] = useState<'none' | 'model_a' | 'model_b'>('none');
  const [newClientTrialPlan, setNewClientTrialPlan] = useState('hello_growth');
  const [newClientTrialDays, setNewClientTrialDays] = useState(30);
  const [paymentLinkForm, setPaymentLinkForm] = useState({
    plan: 'hello_growth', userCount: 1, addons: { game: false, mpd: false, health: false, actions: 'none' as 'none' | 'simplified' | 'complete' }, customNote: '',
  });

  // ── Fetch Colaboradores ──
  useEffect(() => {
    const fetchColaboradores = async () => {
      try {
        const { data } = await supabase
          .from('colaboradores')
          .select('id, name, role')
          .order('name');
        if (data) setColaboradoresList(data);
      } catch (err) {
        console.error('Error fetching colaboradores:', err);
      }
    };
    fetchColaboradores();
  }, []);

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

  const fetchNiches = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/niches');
      if (res.ok) {
        const data = await res.json();
        setNiches(data.niches || []);
      }
    } catch (err) {
      console.error('Error fetching niches:', err);
    }
  }, []);

  useEffect(() => { fetchNiches(); }, [fetchNiches]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Atualiza um cliente no estado local sem recarregar toda a lista (preserva scroll e filtros)
  const updateClientInState = (clientId: string, patch: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...patch } : c));
  };

  // Atualiza uma empresa de um cliente no estado local
  const updateCompanyInState = (clientId: string, companyId: string, patch: Partial<Company>) => {
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const updatedCompanies = c.companies.map(co => co.id === companyId ? { ...co, ...patch } : co);
      const updatedPrimary = c.primaryCompany?.id === companyId ? { ...c.primaryCompany, ...patch } : c.primaryCompany;
      return { ...c, companies: updatedCompanies, primaryCompany: updatedPrimary };
    }));
  };

  // ── Client Usage ──
  const fetchClientUsage = async (client: Client) => {
    const tenantId = client.tenantId || client.primaryCompany?.id || client.companies?.[0]?.id;
    if (!tenantId || clientUsageMap[tenantId]) return;
    setLoadingUsage(prev => ({ ...prev, [tenantId]: true }));
    try {
      const res = await fetch(`/api/admin/client-usage?tenant_id=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setClientUsageMap(prev => ({ ...prev, [tenantId]: data }));
      }
    } catch (err) {
      console.error('Error fetching client usage:', err);
    } finally {
      setLoadingUsage(prev => ({ ...prev, [tenantId]: false }));
    }
  };

  const handleSaveSdrCs = async (clientId: string) => {
    try {
      const res = await fetch('/api/admin/client-usage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: clientId, ...sdrCsForm }),
      });
      if (res.ok) {
        showToast('success', 'SDR/CS atualizado com sucesso!');
        setEditingSdrCs(null);
        // Atualiza localmente sem recarregar a lista
        updateClientInState(clientId, {
          sdrName: sdrCsForm.sdr_name || null,
          csName: sdrCsForm.cs_name || null,
          internalNotes: sdrCsForm.internal_notes || null,
        });
      }
    } catch (err) {
      showToast('error', 'Erro ao salvar SDR/CS');
    }
  };

  // ── Create Client ──
  const handleCreateClient = async () => {
    if (!clientForm.email || !clientForm.name) return showToast('error', 'Nome e e-mail são obrigatórios.');
    if (!newClientStageId) return showToast('error', 'Selecione uma etapa do Kanban.');
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
            addons: { game: false, mpd: false, actions: 'none' },
            trial_model: 'model_b',
            trial_end_at: trialEndAt,
            userName: clientForm.name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error === 'EMAIL_EXISTS' ? 'E-mail já cadastrado.' : data.error);
        showToast('success', `Conta Modelo B criada! Login: ${clientForm.email} / 12345`);
      } else {
        const { data: existing } = await supabase.from('users').select('id').eq('email', clientForm.email.toLowerCase()).single();
        if (existing) throw new Error('E-mail já cadastrado.');
        const companyId = crypto.randomUUID();
        const selectedNicheNew = niches.find(n => n.slug === clientForm.niche);
        const isClinicNicheNew = Boolean(selectedNicheNew?.has_clinic_fields);
        const nicheDataNew: Record<string, any> = {};
        if (isClinicNicheNew) {
          if (clientForm.chairs !== '') nicheDataNew.chairs = Number(clientForm.chairs) || 0;
          if (clientForm.dentists !== '') nicheDataNew.dentists = Number(clientForm.dentists) || 0;
          nicheDataNew.has_secretary = clientForm.has_secretary;
        }
        const userData: any = {
          name: clientForm.name,
          email: clientForm.email.toLowerCase().trim(),
          phone: clientForm.phone || null,
          company_name: clientForm.companyName || clientForm.name,
          plan: clientForm.plan,
          tenant_id: companyId,
          role: 'admin',
          is_owner: true,
          password: '12345',
          city: clientForm.city.trim() || null,
          state: clientForm.state.trim() || null,
          niche: clientForm.niche || null,
          niche_data: nicheDataNew,
          settings: {
            companyName: clientForm.companyName || clientForm.name,
            adminEmail: clientForm.email.toLowerCase().trim(),
            autoRedirect: true,
            ...(clientForm.plan === 'trial' && newClientTrialModel === 'model_a' ? { trial_model: 'model_a' } : {}),
          }
        };
        const { data: createdUser, error } = await supabase.from('users').insert([userData]).select().single();
        if (error) throw error;
        if (createdUser) {
          // Sempre criar empresa e vínculo user_companies, independente do plano
          // companyId já foi gerado acima e usado como tenant_id do usuário
          const isTrialModelA = clientForm.plan === 'trial' && newClientTrialModel === 'model_a';
          const trialEndAt = isTrialModelA
            ? new Date(Date.now() + newClientTrialDays * 24 * 60 * 60 * 1000).toISOString()
            : null;
          // Mapear plano para nome normalizado
          const planMap: Record<string, string> = {
            trial: newClientTrialPlan?.replace('hello_', '') || 'growth',
            client: 'client',
            rating: 'rating',
            growth: 'growth',
            growth_lifetime: 'growth',
          };
          const companyPlan = planMap[clientForm.plan] || clientForm.plan;
          const subscriptionStatus = clientForm.plan === 'trial' ? 'trialing' : 'active';
          await supabase.from('companies').insert([{
            id: companyId,
            name: clientForm.companyName || clientForm.name,
            plan: companyPlan,
            plan_addons: JSON.stringify({ game: false, mpd: false, actions: 'none' }),
            subscription_status: subscriptionStatus,
            ...(isTrialModelA ? {
              trial_start_at: new Date().toISOString(),
              trial_end_at: trialEndAt,
              trial_model: 'model_a',
            } : {}),
            created_by: createdUser.id,
            settings: { companyName: clientForm.companyName || clientForm.name, adminEmail: clientForm.email, autoRedirect: true }
          }]);
          await supabase.from('user_companies').insert([{
            user_id: createdUser.id, company_id: companyId, role: 'owner', is_default: true, status: 'active', accepted_at: new Date().toISOString()
          }]);
          // Nota: a tabela users não tem coluna company_id; o vínculo é feito via user_companies
          // Salvar contatos extras
          if (clientContacts.length > 0) {
            try {
              await fetch('/api/admin/clients', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: createdUser.id, action: 'save_contacts', contacts: clientContacts }),
              });
            } catch (e) { console.error('Erro ao salvar contatos:', e); }
          }
          // Criar card no Kanban
          if (newClientStageId) {
            try {
              await fetch('/api/admin/kanban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'card',
                  stage_id: newClientStageId,
                  board_id: newClientBoardId || undefined,
                  client_name: clientForm.name,
                  client_email: clientForm.email.toLowerCase().trim(),
                  notes: `Plano: ${clientForm.plan}`,
                  position: 9999,
                }),
              });
            } catch (e) {
              console.error('Erro ao criar card no Kanban:', e);
            }
          }
        }
        showToast('success', `Cliente criado! Login: ${clientForm.email} / 12345`);
      }
      setEditModal(null);
      setClientForm({ name: '', email: '', phone: '', plan: 'trial', companyName: '', password: '', city: '', state: '', niche: '', chairs: '', dentists: '', has_secretary: false });
      setNewClientTrialModel('none');
      setNewClientBoardId('');
      setNewClientStageId('');
      setClientContacts([]);
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
      const selectedNicheEdit = niches.find(n => n.slug === clientForm.niche);
      const isClinicEdit = Boolean(selectedNicheEdit?.has_clinic_fields);
      const nicheDataEdit: Record<string, any> = {};
      if (isClinicEdit) {
        if (clientForm.chairs !== '') nicheDataEdit.chairs = Number(clientForm.chairs) || 0;
        if (clientForm.dentists !== '') nicheDataEdit.dentists = Number(clientForm.dentists) || 0;
        nicheDataEdit.has_secretary = clientForm.has_secretary;
      }
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedClient.id,
          userData: {
            name: clientForm.name,
            email: clientForm.email,
            phone: clientForm.phone || null,
            plan: clientForm.plan,
            companyName: clientForm.companyName,
            city: clientForm.city.trim() || null,
            state: clientForm.state.trim() || null,
            niche: clientForm.niche || null,
            nicheData: nicheDataEdit,
            ...(clientForm.password ? { password: clientForm.password } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      // Salvar contatos extras
      if (clientContacts.length > 0 || selectedClient.id) {
        await fetch('/api/admin/clients', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedClient.id, action: 'save_contacts', contacts: clientContacts }),
        });
      }
      showToast('success', 'Cliente atualizado!');
      setEditModal(null);
      // Atualiza localmente sem recarregar
      updateClientInState(selectedClient.id, {
        name: clientForm.name,
        email: clientForm.email,
        phone: clientForm.phone || undefined,
        plan: clientForm.plan,
        companyName: clientForm.companyName,
        city: clientForm.city.trim() || null,
        state: clientForm.state.trim() || null,
        niche: clientForm.niche || null,
        nicheData: nicheDataEdit,
      });
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
      const res = await fetch('/api/admin/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedClient.id,
          companyUpdates: {
            companyId: editingCompany.id,
            name: companyForm.name,
            plan: companyForm.plan.replace('hello_', ''),
            planAddons: companyForm.addons,
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
      // Atualiza localmente sem recarregar
      updateCompanyInState(selectedClient.id, editingCompany.id, {
        name: companyForm.name,
        plan: companyForm.plan.replace('hello_', ''),
        plan_addons: companyForm.addons,
        subscription_status: companyForm.subscriptionStatus,
        trial_model: companyForm.trialModel || null,
        trial_end_at: companyForm.trialEndAt || null,
        max_users: companyForm.maxUsers,
      });
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
      const isTrialing = companyForm.subscriptionStatus === 'trialing';
      const trialEndAt = isTrialing
        ? (companyForm.trialEndAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        : null;
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
            trialModel: isTrialing ? (companyForm.trialModel || null) : null,
            trialEndAt,
            maxUsers: companyForm.maxUsers,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast('success', 'Empresa adicionada!');
      setEditModal(null);
      // Empresa nova precisa do ID gerado pelo servidor — faz refresh silencioso
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
      // Remove empresa do estado local
      setClients(prev => prev.map(c => {
        if (c.id !== client.id) return c;
        const updatedCompanies = c.companies.filter(co => co.id !== companyId);
        const updatedPrimary = c.primaryCompany?.id === companyId
          ? (updatedCompanies[0] || null)
          : c.primaryCompany;
        return { ...c, companies: updatedCompanies, primaryCompany: updatedPrimary };
      }));
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
      // Remove do estado local sem recarregar
      setClients(prev => prev.filter(c => c.id !== client.id));
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
      // Atualiza o link de pagamento na empresa localmente
      if (selectedClient && data.paymentUrl) {
        updateCompanyInState(selectedClient.id, company.id, {
          paymentLinkUrl: data.paymentUrl,
          paymentLinkSentAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao gerar link de pagamento.');
    } finally {
      setSendingLink(false);
    }
  };

  // ── Open Modals ──
  const openEditClient = async (client: Client) => {
    setSelectedClient(client);
    setClientForm({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      plan: client.plan,
      companyName: client.companyName || '',
      password: '',
      city: client.city || '',
      state: client.state || '',
      niche: client.niche || '',
      chairs: client.nicheData?.chairs ?? '',
      dentists: client.nicheData?.dentists ?? '',
      has_secretary: Boolean(client.nicheData?.has_secretary),
    });
    setEditModal('client');
    // Buscar contatos extras
    setLoadingContacts(true);
    try {
      const res = await fetch(`/api/admin/clients?action=contacts&userId=${client.id}`);
      const data = await res.json();
      setClientContacts(data.contacts || []);
    } catch { setClientContacts([]); } finally { setLoadingContacts(false); }
  };

  const openEditCompany = (client: Client, company: Company) => {
    setSelectedClient(client);
    setEditingCompany(company);
    const addons = typeof company.plan_addons === 'string' ? JSON.parse(company.plan_addons || '{}') : (company.plan_addons || {});
    setCompanyForm({
      name: company.name,
      plan: company.plan.startsWith('hello_') ? company.plan : `hello_${company.plan}`,
      subscriptionStatus: company.subscription_status,
      trialModel: company.trial_model || '',
      trialEndAt: company.trial_end_at ? company.trial_end_at.split('T')[0] : '',
      maxUsers: company.max_users || 1,
      addons: { game: addons.game || false, mpd: addons.mpd || false, health: addons.health || false, actions: (addons.actions || 'none') as 'none' | 'simplified' | 'complete' },
      stripeCustomerId: company.stripe_customer_id || '',
      stripeSubscriptionId: company.stripe_subscription_id || '',
    });
    setEditModal('company');
  };

  const openAddCompany = (client: Client) => {
    setSelectedClient(client);
    setCompanyForm({ name: '', plan: 'hello_growth', subscriptionStatus: 'trialing', trialModel: 'model_b', trialEndAt: '', maxUsers: 1, addons: { game: false, mpd: false, health: false, actions: 'none' as 'none' | 'simplified' | 'complete' }, stripeCustomerId: '', stripeSubscriptionId: '' });
    setEditModal('new_company');
  };

  const openPaymentLink = (client: Client, company: Company) => {
    setSelectedClient(client);
    setEditingCompany(company);
    let plan = company.plan;
    if (!plan.startsWith('hello_')) plan = `hello_${plan}`;
    const compAddons = typeof company.plan_addons === 'string' ? JSON.parse(company.plan_addons || '{}') : (company.plan_addons || {});
    setPaymentLinkForm({ plan, userCount: company.max_users || 1, addons: { game: compAddons.game || false, mpd: compAddons.mpd || false, health: compAddons.health || false, actions: (compAddons.actions || 'none') as 'none' | 'simplified' | 'complete' }, customNote: '' });
    setPaymentLinkResult(null);
    setEditModal('payment_link');
  };

  const paymentPrice = calcPrice(paymentLinkForm.plan, paymentLinkForm.userCount, paymentLinkForm.addons);

  // ── Helpers ──
  const inputCls = `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${t.input}`;
  const btnPrimary = `flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`;
  const btnSecondary = `flex items-center justify-center gap-2 border ${t.btnSecondary} text-sm font-medium px-4 py-2.5 rounded-lg transition-colors`;

  const NAV_ITEMS = [
    { id: 'home',           label: 'Início',         icon: <LayoutDashboard size={18} />, activeClass: 'bg-emerald-600 text-white' },
    { id: 'clients',        label: 'Clientes',       icon: <Users size={18} />,           activeClass: 'bg-emerald-600 text-white' },
    { id: 'financeiro',     label: 'Financeiro',     icon: <TrendingUp size={18} />,      activeClass: 'bg-violet-600 text-white' },
    { id: 'conteudo',       label: 'Conteúdo',       icon: <BookOpen size={18} />,        activeClass: 'bg-orange-500 text-white' },
    { id: 'intelligence',   label: 'Inteligência',   icon: <Brain size={18} />,           activeClass: 'bg-purple-600 text-white' },
    { id: 'colaboradores',  label: 'Colaboradores',  icon: <UserCog size={18} />,         activeClass: 'bg-sky-600 text-white' },
    { id: 'kanban',         label: 'Kanban CS',      icon: <Kanban size={18} />,          activeClass: 'bg-violet-600 text-white' },
    { id: 'whatsapp',       label: 'WhatsApp',       icon: <MessageSquare size={18} />,   activeClass: 'bg-green-600 text-white' },
    { id: 'email',          label: 'E-mail',         icon: <Mail size={18} />,            activeClass: 'bg-blue-600 text-white' },
    { id: 'lixeira',        label: 'Histórico',      icon: <Activity size={18} />,        activeClass: 'bg-violet-600 text-white' },
  ];

  return (
    <div className={`flex min-h-screen ${t.bg} transition-colors duration-200`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {toast.text}
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}
        border-r h-screen flex flex-col fixed left-0 top-0 z-20
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-[72px]' : 'w-60'}
      `}>
        {/* Logo */}
        <div className={`px-4 py-5 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} relative`}>
          {!sidebarCollapsed ? (
            <span className="font-extrabold text-xl tracking-tight select-none">
              <span className="text-emerald-500">Hello</span>
              <span className={isDark ? 'text-white' : 'text-slate-800'}>Growth</span>
            </span>
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
              H
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`absolute -right-3 top-6 w-6 h-6 ${
              isDark ? 'bg-gray-900 border-gray-700 text-gray-400 hover:text-emerald-400' : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-500'
            } border rounded-full flex items-center justify-center shadow-sm transition-colors z-30`}
          >
            {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="px-4 pb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
            }`}>
              <Zap size={10} /> Painel Admin
            </span>
          </div>
        )}

        <div className={`mx-4 mb-2 h-px ${isDark ? 'bg-gray-800' : 'bg-slate-100'}`} />

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'financeiro' && !financeiroUnlocked) {
                    setShowFinanceiroModal(true);
                    setFinanceiroPassword('');
                    setFinanceiroPasswordError(false);
                    return;
                  }
                  setActiveTab(item.id as any);
                  if (item.id === 'intelligence') fetchAnalytics();
                }}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                  isActive
                    ? item.activeClass
                    : isDark
                      ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-3 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`px-2 py-2 border-t ${isDark ? 'border-gray-800' : 'border-slate-100'} space-y-0.5`}>
          {activeTab === 'clients' && (
            <button
              onClick={() => { setClientForm({ name: '', email: '', phone: '', plan: 'trial', companyName: '', password: '', city: '', state: '', niche: '', chairs: '', dentists: '', has_secretary: false }); setNewClientTrialModel('none'); setEditModal('new_client'); fetchKanbanBoardsAndStages(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors bg-emerald-600 hover:bg-emerald-500 text-white`}
            >
              <span className="shrink-0"><UserPlus size={18} /></span>
              {!sidebarCollapsed && <span>Novo Cliente</span>}
            </button>
          )}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="shrink-0">{isDark ? <Sun size={18} /> : <Moon size={18} />}</span>
            {!sidebarCollapsed && <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isDark ? 'text-gray-400 hover:text-red-400 hover:bg-gray-800' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <span className="shrink-0"><LogOut size={18} /></span>
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className={`flex-1 min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-60'}`}>

      {activeTab === 'home' && (
        <AdminHome isDark={isDark} hideFinancial={!financeiroUnlocked} onNavigate={(tab, filter) => {
          if (tab === 'financeiro' && !financeiroUnlocked) {
            setShowFinanceiroModal(true);
            setFinanceiroPassword('');
            setFinanceiroPasswordError(false);
            return;
          }
          setActiveTab(tab as any);
          if (filter?.status) setStatusFilter(filter.status);
          if (filter?.search) setSearch(filter.search);
        }} />
      )}
      {activeTab === 'financeiro' && financeiroUnlocked && (
        <AdminFinanceiro isDark={isDark} />
      )}

      {/* Modal de senha do Financeiro */}
      {showFinanceiroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'} border rounded-2xl shadow-2xl w-full max-w-sm p-6`}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Lock size={20} className="text-violet-600" />
              </div>
              <div>
                <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Área Restrita</h2>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Digite a senha para acessar o Financeiro</p>
              </div>
            </div>
            <div className="relative mb-4">
              <input
                type={financeiroShowPwd ? 'text' : 'password'}
                value={financeiroPassword}
                onChange={e => { setFinanceiroPassword(e.target.value); setFinanceiroPasswordError(false); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (financeiroPassword === FINANCEIRO_PASSWORD) {
                      setFinanceiroUnlocked(true);
                      setShowFinanceiroModal(false);
                      setActiveTab('financeiro');
                    } else {
                      setFinanceiroPasswordError(true);
                    }
                  }
                }}
                placeholder="Senha"
                autoFocus
                className={`w-full border rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                  financeiroPasswordError
                    ? 'border-red-400 bg-red-50 text-red-900'
                    : isDark
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setFinanceiroShowPwd(v => !v)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {financeiroShowPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {financeiroPasswordError && (
              <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
                <AlertTriangle size={12} /> Senha incorreta. Tente novamente.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinanceiroModal(false)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (financeiroPassword === FINANCEIRO_PASSWORD) {
                    setFinanceiroUnlocked(true);
                    setShowFinanceiroModal(false);
                    setActiveTab('financeiro');
                  } else {
                    setFinanceiroPasswordError(true);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'conteudo' && (
        <div className="flex flex-col min-h-screen">
          {/* Sub-nav */}
          <div className={`border-b ${t.border} ${t.surface} px-6 py-3 flex items-center gap-2`}>
            {[
              { id: 'templates', label: 'Templates', icon: <BookOpen size={14} /> },
              { id: 'catalogs',  label: 'Catálogos',  icon: <Package size={14} /> },
              { id: 'broadcast', label: 'Disparo',   icon: <MessageSquare size={14} /> },
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setConteudoSubTab(sub.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  conteudoSubTab === sub.id
                    ? 'bg-orange-500 text-white'
                    : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {sub.icon}{sub.label}
              </button>
            ))}
          </div>
          {conteudoSubTab === 'templates' && <AdminTemplates isDark={isDark} surveysData={analyticsData} />}
          {conteudoSubTab === 'catalogs' && <AdminCatalogs />}
          {conteudoSubTab === 'broadcast' && <AdminBroadcast isDark={isDark} />}
        </div>
      )}
      {activeTab === 'intelligence' && (
        isLoadingAnalytics ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className={`text-sm ${t.textMuted}`}>Carregando dados de inteligência...</p>
            </div>
          </div>
        ) : analyticsData ? (
          <AdminIntelligence
            isDark={isDark}
            tenants={analyticsData.tenants || []}
            globalStats={analyticsData.global}
          />
        ) : (
          <div className="flex items-center justify-center py-32">
            <p className={`text-sm ${t.textMuted}`}>Nenhum dado disponível.</p>
          </div>
        )
      )}
      {activeTab === 'colaboradores' && (
        <AdminColaboradores isDark={isDark} hideFinancial={!financeiroUnlocked} />
      )}
      {activeTab === 'kanban' && (
        <AdminKanban isDark={isDark} />
      )}
      {activeTab === 'whatsapp' && (
        <AdminWhatsApp isDark={isDark} />
      )}
      {activeTab === 'email' && (
        <AdminEmail isDark={isDark} />
      )}
      {activeTab === 'lixeira' && (
        <AdminHistorico isDark={isDark} />
      )}
      {activeTab === 'clients' && (
      <main className="w-full overflow-x-auto px-6 py-6 space-y-5">
        {/* KPI Cards */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 ${financeiroUnlocked ? 'lg:grid-cols-8' : 'lg:grid-cols-7'} gap-3`}>
          {[
            { label: 'Total', value: stats.total || 0, icon: <Users size={14} />, color: isDark ? 'text-slate-300' : 'text-slate-600' },
            { label: 'Ativos', value: stats.active || 0, icon: <CheckCircle size={14} />, color: 'text-emerald-600' },
            { label: 'Em Trial', value: stats.trialing || 0, icon: <Clock size={14} />, color: 'text-blue-600' },
            { label: 'Expirados', value: stats.trial_expired || 0, icon: <AlertCircle size={14} />, color: 'text-red-500' },
            { label: 'Modelo A', value: stats.model_a || 0, icon: <Star size={14} />, color: 'text-purple-600' },
            { label: 'Modelo B', value: stats.model_b || 0, icon: <Gift size={14} />, color: 'text-teal-600' },
            { label: 'Urgente (B)', value: stats.urgent_b || 0, icon: <AlertTriangle size={14} />, color: 'text-orange-500' },
            ...(financeiroUnlocked ? [{ label: 'MRR Est.', value: `R$ ${(stats.mrr || 0).toFixed(0)}`, icon: <DollarSign size={14} />, color: 'text-amber-600' }] : []),
          ].map((kpi, i) => (
            <div key={i} className={`${t.kpi} border rounded-xl p-4 shadow-sm`}>
              <div className={`flex items-center gap-1.5 text-xs mb-2 ${kpi.color}`}>
                {kpi.icon}
                <span className={`${t.textMuted} truncate`}>{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className={`${t.filterBar} border rounded-xl p-4 shadow-sm`}>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou empresa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 ${t.input}`}
              />
            </div>
            {[
              { value: planFilter, onChange: setPlanFilter, options: [['all','Todos os Planos'],['trial','Trial'],['client','Hello Client'],['rating','Hello Rating'],['growth','Hello Growth'],['growth_lifetime','Lifetime']] },
              { value: statusFilter, onChange: setStatusFilter, options: [['all','Todos os Status'],['active','Ativos'],['trialing','Em Trial'],['trial_expired','Trial Expirado'],['past_due','Pagamento Atrasado'],['canceled','Cancelados'],['never_login','Nunca logou']] },
              { value: modelFilter, onChange: setModelFilter, options: [['all','Todos os Modelos'],['model_a','Modelo A'],['model_b','Modelo B'],['no_model','Sem Modelo']] },
            ].map((sel, i) => (
              <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)} className={`border rounded-lg px-3 py-2 text-sm focus:outline-none ${t.input}`}>
                {sel.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <button onClick={fetchClients} className={`flex items-center gap-2 border ${t.btnSecondary} text-sm px-3 py-2 rounded-lg transition-colors`}>
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Atualizar
            </button>
            <span className={`text-xs ${t.textMuted} ml-auto`}>{clients.length} cliente{clients.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border shadow-sm" style={{minWidth: '900px'}}>
        <div className={`${t.table} overflow-hidden`}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : clients.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-20 ${t.textMuted}`}>
              <Users size={40} className="mb-3 opacity-30" />
              <p className="font-medium">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros ou criar um novo cliente</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className={`border-b ${t.border}`}>
                  {[
                    { label: '', field: null, px: 'px-6' },
                    { label: 'Cliente', field: 'name', px: 'px-6' },
                    { label: 'Plano', field: 'plan', px: 'px-4' },
                    { label: 'Status', field: 'consolidatedStatus', px: 'px-4' },
                    { label: 'Health', field: null, px: 'px-4' },
                    { label: 'Modelo', field: null, px: 'px-4' },
                    { label: 'Empresas', field: null, px: 'px-4' },
                    { label: 'Cadastro', field: 'createdAt', px: 'px-4' },
                    { label: 'Último Acesso', field: 'lastLogin', px: 'px-4' },
                    { label: '', field: null, px: 'px-6 text-right' },
                  ].map((h, i) => (
                    <th
                      key={i}
                      onClick={() => h.field && handleClientSort(h.field)}
                      className={`text-left text-xs font-semibold ${t.thead} uppercase tracking-wider ${h.px} py-3 select-none ${h.field ? 'cursor-pointer hover:text-emerald-500 transition-colors' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {h.label}
                        {h.field && (
                          <span className={`text-xs ${clientSortField === h.field ? 'opacity-100' : 'opacity-30'}`}>
                            {clientSortField === h.field ? (clientSortDir === 'asc' ? '↑' : '↓') : '↕'}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divider}`}>
                {[...clients].sort((a, b) => {
                  const dir = clientSortDir === 'asc' ? 1 : -1;
                  if (clientSortField === 'name') return dir * (a.name || '').localeCompare(b.name || '');
                  if (clientSortField === 'plan') return dir * (a.plan || '').localeCompare(b.plan || '');
                  if (clientSortField === 'consolidatedStatus') return dir * (a.consolidatedStatus || '').localeCompare(b.consolidatedStatus || '');
                  if (clientSortField === 'createdAt') return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                  if (clientSortField === 'lastLogin') {
                    const aT = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
                    const bT = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
                    return dir * (aT - bT);
                  }
                  return 0;
                }).map(client => (
                  <React.Fragment key={client.id}>
                    <tr
                      className={`${t.surfaceHover} transition-colors cursor-pointer ${expandedClient === client.id ? t.surfaceExpanded : ''}`}
                      onClick={() => { const next = expandedClient === client.id ? null : client.id; setExpandedClient(next); if (next) fetchClientUsage(client); }}
                    >
                      <td className="px-6 py-4">
                        <ChevronRight size={14} className={`${t.textMuted} transition-transform ${expandedClient === client.id ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm flex-shrink-0 ${t.avatar}`}>
                            {client.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${t.text}`}>{client.name}</p>
                            <p className={`text-xs ${t.textSub}`}>{client.email}</p>
                            {client.phone && <p className={`text-xs ${t.textMuted}`}>{client.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><PlanBadge plan={client.plan} /></td>
                      <td className="px-4 py-4"><StatusBadge status={client.consolidatedStatus} daysRemaining={client.consolidatedDaysRemaining} /></td>
                      <td className="px-4 py-4">
                        {(() => {
                          const tenantId = client.tenantId || client.primaryCompany?.id || client.companies?.[0]?.id;
                          const usage = tenantId ? clientUsageMap[tenantId] : null;
                          const isLoadingH = tenantId ? loadingUsage[tenantId] : false;
                          const score = usage?.healthScore ?? null;
                          const scoreColor = score === null ? '' : score >= 75 ? 'emerald' : score >= 50 ? 'yellow' : score >= 25 ? 'orange' : 'red';
                          if (isLoadingH) return <Loader2 size={12} className="animate-spin text-emerald-500" />;
                          if (score === null) return <span className={`text-xs ${t.textMuted} opacity-40`}>—</span>;
                          return (
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-${scoreColor}-100 text-${scoreColor}-700`}>
                              <Heart size={10} />{score}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-4"><ModelBadge model={client.consolidatedTrialModel} /></td>
                      <td className="px-4 py-4"><span className={`text-sm ${t.textSub}`}>{client.companies.length} empresa{client.companies.length !== 1 ? 's' : ''}</span></td>
                      <td className="px-4 py-4"><span className={`text-xs ${t.textMuted}`}>{new Date(client.createdAt).toLocaleDateString('pt-BR')}</span></td>
                      <td className="px-4 py-4">
                        {client.lastLogin ? (
                          <div>
                            <span className={`text-xs ${t.textMuted}`}>{new Date(client.lastLogin).toLocaleDateString('pt-BR')}</span>
                            <p className={`text-xs ${t.textMuted} opacity-70`}>{new Date(client.lastLogin).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        ) : (
                          <span className={`text-xs ${t.textMuted} opacity-50`}>Nunca</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setProfileClient(client)} className={`p-1.5 ${t.textMuted} hover:text-emerald-500 hover:${isDark ? 'bg-gray-700' : 'bg-slate-100'} rounded-lg transition-colors`} title="Ver perfil">
                            <FileText size={14} />
                          </button>
                          <button onClick={() => openEditClient(client)} className={`p-1.5 ${t.textMuted} hover:${t.text} hover:${isDark ? 'bg-gray-700' : 'bg-slate-100'} rounded-lg transition-colors`} title="Editar">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => openAddCompany(client)} className={`p-1.5 ${t.textMuted} hover:text-emerald-600 hover:${isDark ? 'bg-gray-700' : 'bg-slate-100'} rounded-lg transition-colors`} title="Adicionar empresa">
                            <Building2 size={14} />
                          </button>
                          <button onClick={() => handleResetPassword(client)} className={`p-1.5 ${t.textMuted} hover:text-amber-600 hover:${isDark ? 'bg-gray-700' : 'bg-slate-100'} rounded-lg transition-colors`} title="Resetar senha">
                            <Key size={14} />
                          </button>
                          {onImpersonate && (
                            <button
                              onClick={() => onImpersonate(client)}
                              className={`p-1.5 ${t.textMuted} hover:text-blue-500 hover:${isDark ? 'bg-gray-700' : 'bg-slate-100'} rounded-lg transition-colors`}
                              title="Acessar como este cliente"
                            >
                              <LogIn size={14} />
                            </button>
                          )}
                          <button onClick={() => handleDeleteClient(client)} className={`p-1.5 ${t.textMuted} hover:text-red-500 hover:${isDark ? 'bg-gray-700' : 'bg-slate-100'} rounded-lg transition-colors`} title="Excluir">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Companies */}
                    {expandedClient === client.id && (
                      <tr>
                        <td colSpan={10} className={`${t.expandBg} px-6 py-4`}>
                          <div className="space-y-4">
                            {/* Health Score + SDR/CS */}
                            {(() => {
                              const tenantId = client.tenantId || client.primaryCompany?.id || client.companies?.[0]?.id;
                              const usage = tenantId ? clientUsageMap[tenantId] : null;
                              const isLoadingU = tenantId ? loadingUsage[tenantId] : false;
                              const score = usage?.healthScore ?? null;
                              const scoreColor = score === null ? 'gray' : score >= 75 ? 'emerald' : score >= 50 ? 'yellow' : score >= 25 ? 'orange' : 'red';
                              const scoreLabel = score === null ? '—' : score >= 75 ? 'Saudável' : score >= 50 ? 'Atenção' : score >= 25 ? 'Risco' : 'Crítico';
                              return (
                                <div className={`${isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-slate-200'} border rounded-xl p-4`}>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider flex items-center gap-2`}>
                                      <Heart size={12} /> Health Score de Uso
                                      <span
                                        title="O Health Score mede o engajamento do cliente com a plataforma (0-100).\n\nComo é calculado:\n• +25 pts: Acesso nos últimos 7 dias\n• +25 pts: Avaliações NPS nos últimos 30 dias\n• +25 pts: Respostas de formulário nos últimos 30 dias\n• +25 pts: Campanhas ou formulários ativos\n\nClassificação:\n• 80-100: Saudável (verde)\n• 60-79: Atenção (amarelo)\n• 40-59: Risco (laranja)\n• 0-39: Crítico (vermelho)"
                                        className={`cursor-help text-xs px-1.5 py-0.5 rounded-full border ${isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-slate-300 text-slate-400 hover:bg-slate-100'} transition-colors`}
                                      >?
                                      </span>
                                    </h4>
                                    {usage && (
                                      <button
                                        onClick={() => {
                                          const now = new Date();
                                          const dateStr = now.toLocaleDateString('pt-BR');
                                          const content = `Olá ${client.name},\n\nSegue seu relatório de uso HelloGrowth referente ao período de 30 dias (até ${dateStr}):\n\n📊 RESUMO DE USO\n\n• Avaliações NPS recebidas: ${usage.metrics?.npsLast30Days || 0}\n• Respostas de formulário: ${usage.metrics?.formResponsesLast30Days || 0}\n• Campanhas ativas: ${usage.metrics?.activeCampaigns || 0}\n• Formulários ativos: ${usage.metrics?.activeForms || 0}\n\n📈 HEALTH SCORE: ${usage.healthScore || 0}/100 (${usage.healthScore >= 80 ? 'Saudável' : usage.healthScore >= 60 ? 'Atenção' : usage.healthScore >= 40 ? 'Risco' : 'Crítico'})\n\n📌 DESTAQUES\n${usage.indicators?.hasRecentLogin ? '✅' : '⚠️'} Acesso recente à plataforma\n${usage.indicators?.hasNpsResponses ? '✅' : '⚠️'} Avaliações NPS ativas\n${usage.indicators?.hasFormResponses ? '✅' : '⚠️'} Respostas de formulário\n${(usage.indicators?.hasActiveCampaigns || usage.indicators?.hasActiveForms) ? '✅' : '⚠️'} Campanhas/Formulários ativos\n\nQualquer dúvida, estamos à disposição!\n\nEquipe HelloGrowth`;
                                          setReportContent(content);
                                          setReportModal({ client, usage });
                                        }}
                                        className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-500 font-medium"
                                      >
                                        <FileText size={12} /> Gerar relatório
                                      </button>
                                    )}
                                  </div>
                                  {isLoadingU ? (
                                    <div className="flex items-center gap-2 py-2"><Loader2 size={14} className="animate-spin text-emerald-500" /><span className={`text-xs ${t.textMuted}`}>Carregando dados de uso...</span></div>
                                  ) : usage ? (
                                    <div className="space-y-3">
                                      {/* Score bar */}
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                          <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-slate-100'}`}>
                                            <div className={`h-2 rounded-full bg-${scoreColor}-500 transition-all`} style={{ width: `${score}%` }} />
                                          </div>
                                        </div>
                                        <span className={`text-sm font-bold text-${scoreColor}-500 w-16 text-right`}>{score}/100</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-${scoreColor}-100 text-${scoreColor}-700`}>{scoreLabel}</span>
                                      </div>
                                      {/* Indicators */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {[
                                          { label: 'Acesso recente', ok: usage.indicators?.hasRecentLogin, detail: usage.metrics?.lastLogin ? `${new Date(usage.metrics.lastLogin).toLocaleDateString('pt-BR')}` : 'Nunca' },
                                          { label: 'Avaliações NPS', ok: usage.indicators?.hasNpsResponses, detail: `${usage.metrics?.npsLast30Days || 0} em 30 dias` },
                                          { label: 'Respostas Form.', ok: usage.indicators?.hasFormResponses, detail: `${usage.metrics?.formResponsesLast30Days || 0} em 30 dias` },
                                          { label: 'Campanhas/Forms', ok: usage.indicators?.hasActiveCampaigns || usage.indicators?.hasActiveForms, detail: `${(usage.metrics?.activeCampaigns || 0) + (usage.metrics?.activeForms || 0)} ativos` },
                                        ].map((ind, i) => (
                                          <div key={i} className={`${isDark ? 'bg-gray-700/50' : 'bg-slate-50'} rounded-lg p-2.5 flex flex-col gap-1`}>
                                            <div className="flex items-center gap-1.5">
                                              {ind.ok ? <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" /> : <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                                              <span className={`text-xs font-medium ${t.text}`}>{ind.label}</span>
                                            </div>
                                            <span className={`text-xs ${t.textMuted}`}>{ind.detail}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className={`text-xs ${t.textMuted} italic`}>Clique no cliente para carregar dados de uso.</p>
                                  )}
                                  {/* SDR / CS */}
                                  <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-slate-200'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider flex items-center gap-2`}>
                                        <UserCog size={12} /> Equipe responsável
                                      </h5>
                                      {editingSdrCs !== client.id ? (
                                        <button onClick={() => { setEditingSdrCs(client.id); setSdrCsForm({ sdr_name: client.sdrName || '', cs_name: client.csName || '', internal_notes: client.internalNotes || '' }); }} className={`text-xs ${t.textMuted} hover:${t.text} flex items-center gap-1`}>
                                          <Edit size={11} /> Editar
                                        </button>
                                      ) : (
                                        <div className="flex gap-2">
                                          <button onClick={() => handleSaveSdrCs(client.id)} className="text-xs text-emerald-600 hover:text-emerald-500 font-medium flex items-center gap-1"><Save size={11} /> Salvar</button>
                                          <button onClick={() => setEditingSdrCs(null)} className={`text-xs ${t.textMuted} flex items-center gap-1`}><X size={11} /> Cancelar</button>
                                        </div>
                                      )}
                                    </div>
                                    {editingSdrCs === client.id ? (
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                        <div>
                                          <label className={`text-xs ${t.textMuted} block mb-1`}>SDR (Fechou a venda)</label>
                                          <select
                                            value={sdrCsForm.sdr_name}
                                            onChange={e => setSdrCsForm(f => ({ ...f, sdr_name: e.target.value }))}
                                            className={`w-full text-xs px-2 py-1.5 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300 text-gray-900'}`}
                                          >
                                            <option value="">-- Nenhum --</option>
                                            {colaboradoresList
                                              .filter(c => c.role === 'sdr' || c.role === 'gerente' || c.role === 'outro')
                                              .map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                              ))}
                                            {/* Se o valor atual não está na lista, mostra como opção */}
                                            {sdrCsForm.sdr_name && !colaboradoresList.some(c => c.name === sdrCsForm.sdr_name) && (
                                              <option value={sdrCsForm.sdr_name}>{sdrCsForm.sdr_name} (manual)</option>
                                            )}
                                          </select>
                                        </div>
                                        <div>
                                          <label className={`text-xs ${t.textMuted} block mb-1`}>CS (Customer Success)</label>
                                          <select
                                            value={sdrCsForm.cs_name}
                                            onChange={e => setSdrCsForm(f => ({ ...f, cs_name: e.target.value }))}
                                            className={`w-full text-xs px-2 py-1.5 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300 text-gray-900'}`}
                                          >
                                            <option value="">-- Nenhum --</option>
                                            {colaboradoresList
                                              .filter(c => c.role === 'cs' || c.role === 'gerente' || c.role === 'outro')
                                              .map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                              ))}
                                            {/* Se o valor atual não está na lista, mostra como opção */}
                                            {sdrCsForm.cs_name && !colaboradoresList.some(c => c.name === sdrCsForm.cs_name) && (
                                              <option value={sdrCsForm.cs_name}>{sdrCsForm.cs_name} (manual)</option>
                                            )}
                                          </select>
                                        </div>
                                        <div><label className={`text-xs ${t.textMuted} block mb-1`}>Notas internas</label><input value={sdrCsForm.internal_notes} onChange={e => setSdrCsForm(f => ({ ...f, internal_notes: e.target.value }))} className={`w-full text-xs px-2 py-1.5 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300 text-gray-900'}`} placeholder="Observações..." /></div>
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-1.5">
                                          <UserCheck size={12} className="text-blue-500" />
                                          <span className={`text-xs ${t.textMuted}`}>SDR:</span>
                                          <span className={`text-xs font-medium ${t.text}`}>{client.sdrName || <span className={`italic ${t.textMuted}`}>não definido</span>}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <UserCog size={12} className="text-purple-500" />
                                          <span className={`text-xs ${t.textMuted}`}>CS:</span>
                                          <span className={`text-xs font-medium ${t.text}`}>{client.csName || <span className={`italic ${t.textMuted}`}>não definido</span>}</span>
                                        </div>
                                        {client.internalNotes && (
                                          <div className="flex items-center gap-1.5">
                                            <FileText size={12} className={t.textMuted} />
                                            <span className={`text-xs ${t.textMuted}`}>{client.internalNotes}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                            {/* Empresas vinculadas */}
                            <div className="flex items-center justify-between mb-2">
                              <h4 className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider flex items-center gap-2`}>
                                <Building2 size={12} /> Empresas vinculadas
                              </h4>
                              <button onClick={() => openAddCompany(client)} className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-500 font-medium">
                                <Plus size={12} /> Adicionar empresa
                              </button>
                            </div>
                            {client.companies.length === 0 ? (
                              <p className={`text-xs ${t.textMuted} italic`}>Nenhuma empresa vinculada.</p>
                            ) : (
                              <div className="grid gap-2">
                                {client.companies.map(company => {
                                  const addons = typeof company.plan_addons === 'string' ? JSON.parse(company.plan_addons || '{}') : (company.plan_addons || {});
                                  return (
                                    <div key={company.id} className={`${t.companyCard} border rounded-xl p-4 flex items-center gap-4`}>
                                      <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} border flex items-center justify-center ${t.textMuted} flex-shrink-0`}>
                                        <Building2 size={14} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className={`text-sm font-semibold ${t.text} truncate`}>{company.name}</p>
                                          <PlanBadge plan={company.plan} />
                                          <StatusBadge status={company.subscription_status} daysRemaining={company.daysRemaining} />
                                          {company.trial_model && <ModelBadge model={company.trial_model} />}
                                          {addons.game && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded border border-purple-200">Game</span>}
                                          {addons.mpd && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded border border-blue-200">MPD</span>}
                                          {addons.health && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-xs rounded border border-rose-200">Saúde</span>}
                                          {addons.actions === 'simplified' && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded border border-orange-200">Ações Simpl.</span>}
                                          {addons.actions === 'complete' && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded border border-emerald-200">Ações Compl.</span>}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                                          {company.trial_end_at && <span className={`text-xs ${t.textMuted}`}>Vence: {new Date(company.trial_end_at).toLocaleDateString('pt-BR')}</span>}
                                          {company.stripe_subscription_id && <span className={`text-xs ${t.textMuted} font-mono truncate max-w-[120px]`}>sub: {company.stripe_subscription_id.slice(0, 12)}...</span>}
                                          {company.paymentLinkSentAt && <span className="text-xs text-teal-600">Link enviado: {new Date(company.paymentLinkSentAt).toLocaleDateString('pt-BR')}</span>}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => openEditCompany(client, company)} className={`p-1.5 ${t.textMuted} hover:${t.text} hover:${isDark ? 'bg-gray-700' : 'bg-slate-100'} rounded-lg transition-colors`} title="Editar empresa">
                                          <Edit size={13} />
                                        </button>
                                        {company.trial_model === 'model_b' && (
                                          <button onClick={() => openPaymentLink(client, company)} className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${t.sendLinkBtn}`}>
                                            <CreditCard size={12} /> Enviar Link
                                          </button>
                                        )}
                                        {client.companies.length > 1 && (
                                          <button onClick={() => handleRemoveCompany(client, company.id)} className={`p-1.5 ${t.textMuted} hover:text-red-500 hover:${isDark ? 'bg-gray-700' : 'bg-slate-100'} rounded-lg transition-colors`} title="Remover empresa">
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
        </div>
      </main>
      )}
      {/* ── Modals ── */}

      {/* Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`${t.modalBg} border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between p-5 border-b ${t.border}`}>
              <div>
                <h2 className={`text-base font-bold ${t.text}`}>Relatório de Uso — {reportModal.client.name}</h2>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>Edite o conteúdo antes de enviar ou baixar em PDF</p>
              </div>
              <button onClick={() => setReportModal(null)} className={`p-1.5 rounded-lg ${t.surfaceHover}`}><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Editable text area */}
              <div>
                <label className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider block mb-2`}>Conteúdo do Relatório</label>
                <textarea
                  value={reportContent}
                  onChange={e => setReportContent(e.target.value)}
                  rows={16}
                  className={`w-full text-sm px-3 py-2.5 rounded-xl border font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-slate-50 border-slate-200 text-gray-800'}`}
                />
              </div>
              {/* Health Score summary */}
              <div className={`${isDark ? 'bg-gray-800' : 'bg-slate-50'} rounded-xl p-4 border ${t.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>Health Score</span>
                  <span className={`text-lg font-bold ${reportModal.usage.healthScore >= 80 ? 'text-emerald-500' : reportModal.usage.healthScore >= 60 ? 'text-yellow-500' : reportModal.usage.healthScore >= 40 ? 'text-orange-500' : 'text-red-500'}`}>{reportModal.usage.healthScore || 0}/100</span>
                </div>
                <div className={`h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-slate-200'}`}>
                  <div
                    className={`h-2 rounded-full ${reportModal.usage.healthScore >= 80 ? 'bg-emerald-500' : reportModal.usage.healthScore >= 60 ? 'bg-yellow-500' : reportModal.usage.healthScore >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                    style={{ width: `${reportModal.usage.healthScore || 0}%` }}
                  />
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    const phone = reportModal.client.phone?.replace(/\D/g, '');
                    if (!phone) { alert('Cliente sem telefone cadastrado.'); return; }
                    const msg = encodeURIComponent(reportContent);
                    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors"
                >
                  <MessageCircle size={16} /> Enviar via WhatsApp
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/generate-report', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: reportContent, clientName: reportModal.client.name, healthScore: reportModal.usage.healthScore }),
                      });
                      if (!res.ok) throw new Error('Erro ao gerar relatório');
                      const html = await res.text();
                      const blob = new Blob([html], { type: 'text/html' });
                      const url = URL.createObjectURL(blob);
                      const win = window.open(url, '_blank');
                      if (win) {
                        win.onload = () => {
                          setTimeout(() => { win.print(); }, 500);
                        };
                      }
                    } catch (err) {
                      alert('Erro ao gerar relatório. Tente novamente.');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                >
                  <FileText size={16} /> Visualizar / Imprimir PDF
                </button>
                <button
                  onClick={() => setReportModal(null)}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-colors ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Client */}
      {editModal === 'new_client' && (
        <Modal title="Novo Cliente" onClose={() => setEditModal(null)} t={t}>
          <div className="space-y-4">
            <FormField label="Nome Completo" t={t}><input type="text" value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="João Silva" /></FormField>
            <FormField label="E-mail (Login)" t={t}><input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="joao@empresa.com" /></FormField>
            <FormField label="WhatsApp / Telefone" t={t}><input type="tel" value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="5551999999999" /></FormField>
            <FormField label="Empresa Principal" t={t}><input type="text" value={clientForm.companyName} onChange={e => setClientForm(f => ({ ...f, companyName: e.target.value }))} className={inputCls} placeholder="Nome da empresa" /></FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Cidade" t={t} className="col-span-2"><input type="text" value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} className={inputCls} placeholder="Curitiba" /></FormField>
              <FormField label="UF" t={t}><input type="text" maxLength={2} value={clientForm.state} onChange={e => setClientForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} className={inputCls} placeholder="PR" /></FormField>
            </div>
            <FormField label="Nicho" t={t}>
              <select value={clientForm.niche} onChange={e => setClientForm(f => ({ ...f, niche: e.target.value }))} className={inputCls}>
                <option value="">— Selecione um nicho —</option>
                {niches.map(n => <option key={n.id} value={n.slug}>{n.name}</option>)}
              </select>
            </FormField>
            {(() => {
              const n = niches.find(x => x.slug === clientForm.niche);
              if (!n?.has_clinic_fields) return null;
              return (
                <div className={`border rounded-xl p-3 space-y-2 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Dados da clínica</div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Cadeiras" t={t}><input type="number" min={0} value={clientForm.chairs} onChange={e => setClientForm(f => ({ ...f, chairs: e.target.value }))} className={inputCls} /></FormField>
                    <FormField label="Dentistas" t={t}><input type="number" min={0} value={clientForm.dentists} onChange={e => setClientForm(f => ({ ...f, dentists: e.target.value }))} className={inputCls} /></FormField>
                  </div>
                  <label className={`flex items-center gap-2 text-sm ${t.textSub}`}>
                    <input type="checkbox" checked={clientForm.has_secretary} onChange={e => setClientForm(f => ({ ...f, has_secretary: e.target.checked }))} className="w-4 h-4 accent-emerald-500" />
                    Possui secretária
                  </label>
                </div>
              );
            })()}
            <div className={`${t.securityBox} border rounded-lg p-3 text-xs ${t.securityText} flex items-center gap-2`}>
              <Key size={14} /> Senha padrão: <strong className={t.text}>12345</strong>
            </div>
            <FormField label="Plano Inicial" t={t}>
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
                <FormField label="Modelo de Trial" t={t}>
                  <div className="grid grid-cols-3 gap-2">
                    {(['none', 'model_a', 'model_b'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setNewClientTrialModel(m)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors ${newClientTrialModel === m
                          ? m === 'model_b' ? 'bg-teal-600 text-white border-teal-500' : m === 'model_a' ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-600 text-white border-slate-500'
                          : `${isDark ? 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500' : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'}`}`}>
                        {m === 'none' ? 'Nenhum' : m === 'model_a' ? 'Modelo A' : 'Modelo B'}
                      </button>
                    ))}
                  </div>
                </FormField>
                {newClientTrialModel !== 'none' && (
                  <>
                    <FormField label="Plano do Trial" t={t}>
                      <select value={newClientTrialPlan} onChange={e => setNewClientTrialPlan(e.target.value)} className={inputCls}>
                        <option value="hello_client">Hello Client</option>
                        <option value="hello_rating">Hello Rating</option>
                        <option value="hello_growth">Hello Growth</option>
                      </select>
                    </FormField>
                    <FormField label="Duração (dias)" t={t}>
                      <input type="number" min={1} max={90} value={newClientTrialDays} onChange={e => setNewClientTrialDays(parseInt(e.target.value) || 30)} className={inputCls} />
                    </FormField>
                    {newClientTrialModel === 'model_b' && (
                      <div className={`${t.modelBBox} border rounded-lg p-3 text-xs`}>
                        <strong>Modelo B:</strong> Conta criada sem cobrança. Envie o link de pagamento pela aba de empresas do cliente.
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {/* Localização */}
            <div className={`border rounded-xl p-4 space-y-3 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Localização</div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Cidade" t={t}><input type="text" value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} className={inputCls} placeholder="São Paulo" /></FormField>
                <FormField label="Estado" t={t}>
                  <select value={clientForm.state} onChange={e => setClientForm(f => ({ ...f, state: e.target.value }))} className={inputCls}>
                    <option value="">— UF —</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
            {/* Nicho */}
            <div className={`border rounded-xl p-4 space-y-3 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Nicho</div>
              <FormField label="Nicho de Atuação" t={t}>
                <select value={clientForm.niche} onChange={e => setClientForm(f => ({ ...f, niche: e.target.value, nicheData: {} }))} className={inputCls}>
                  <option value="">— Selecione —</option>
                  <option value="clinica_odontologica">Clínica Odontológica</option>
                  <option value="clinica_estetica">Clínica Estética</option>
                  <option value="clinica_medica">Clínica Médica</option>
                  <option value="pet_shop">Pet Shop / Veterinária</option>
                  <option value="academia">Academia / Fitness</option>
                  <option value="restaurante">Restaurante / Food</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="servicos">Serviços Gerais</option>
                  <option value="outro">Outro</option>
                </select>
              </FormField>
              {clientForm.niche === 'clinica_odontologica' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Qtd. de Cadeiras" t={t}><input type="number" min={1} value={clientForm.nicheData.cadeiras || ''} onChange={e => setClientForm(f => ({ ...f, nicheData: { ...f.nicheData, cadeiras: parseInt(e.target.value) || '' } }))} className={inputCls} placeholder="Ex: 4" /></FormField>
                    <FormField label="Qtd. de Dentistas" t={t}><input type="number" min={1} value={clientForm.nicheData.dentistas || ''} onChange={e => setClientForm(f => ({ ...f, nicheData: { ...f.nicheData, dentistas: parseInt(e.target.value) || '' } }))} className={inputCls} placeholder="Ex: 2" /></FormField>
                  </div>
                  <FormField label="Tem Secretária?" t={t}>
                    <div className="flex gap-3 mt-1">
                      {[['sim', 'Sim'], ['nao', 'Não']].map(([v, l]) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="secretaria_new" value={v} checked={clientForm.nicheData.secretaria === v} onChange={() => setClientForm(f => ({ ...f, nicheData: { ...f.nicheData, secretaria: v } }))} className="accent-emerald-500" />
                          <span className={`text-sm ${t.textSub}`}>{l}</span>
                        </label>
                      ))}
                    </div>
                  </FormField>
                </div>
              )}
            </div>
            {/* Contatos Extras */}
            <div className={`border rounded-xl p-4 space-y-3 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`flex items-center justify-between`}>
                <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Contatos da Empresa</div>
                <button type="button" onClick={() => setClientContacts(c => [...c, { name: '', role: '', phone: '', email: '' }])} className={`text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-500 font-medium`}><Plus size={12} /> Adicionar</button>
              </div>
              {clientContacts.length === 0 ? (
                <p className={`text-xs ${t.textMuted}`}>Nenhum contato extra. Clique em Adicionar para incluir.</p>
              ) : (
                <div className="space-y-3">
                  {clientContacts.map((c, idx) => (
                    <div key={idx} className={`border rounded-lg p-3 space-y-2 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${t.textSub}`}>Contato {idx + 1}</span>
                        <button type="button" onClick={() => setClientContacts(cs => cs.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Nome" value={c.name} onChange={e => setClientContacts(cs => cs.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} className={`${inputCls} text-xs`} />
                        <input type="text" placeholder="Cargo/Função" value={c.role} onChange={e => setClientContacts(cs => cs.map((x, i) => i === idx ? { ...x, role: e.target.value } : x))} className={`${inputCls} text-xs`} />
                        <input type="tel" placeholder="WhatsApp" value={c.phone} onChange={e => setClientContacts(cs => cs.map((x, i) => i === idx ? { ...x, phone: e.target.value } : x))} className={`${inputCls} text-xs`} />
                        <input type="email" placeholder="E-mail" value={c.email} onChange={e => setClientContacts(cs => cs.map((x, i) => i === idx ? { ...x, email: e.target.value } : x))} className={`${inputCls} text-xs`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Kanban Selection */}
            <div className={`border rounded-xl p-4 space-y-3 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                <Kanban size={13} /> Posicionar no Kanban
              </div>
              {loadingKanban ? (
                <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={14} className="animate-spin" /> Carregando fluxos...</div>
              ) : kanbanBoards.length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Nenhum fluxo Kanban encontrado. Crie um fluxo primeiro na aba Kanban.</p>
              ) : (
                <>
                  {kanbanBoards.length > 1 && (
                    <FormField label="Fluxo Kanban" t={t}>
                      <select
                        value={newClientBoardId}
                        onChange={e => {
                          setNewClientBoardId(e.target.value);
                          const boardStages = kanbanStages.filter(s => s.board_id === e.target.value || !s.board_id);
                          setNewClientStageId(boardStages.length > 0 ? boardStages[0].id : '');
                        }}
                        className={inputCls}
                      >
                        {kanbanBoards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </FormField>
                  )}
                  <FormField label="Etapa *" t={t}>
                    <select
                      value={newClientStageId}
                      onChange={e => setNewClientStageId(e.target.value)}
                      className={`${inputCls} ${!newClientStageId ? 'border-red-400' : ''}`}
                    >
                      <option value="">— Selecione uma etapa —</option>
                      {kanbanStages
                        .filter(s => !newClientBoardId || s.board_id === newClientBoardId || !s.board_id)
                        .map(s => <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ''}{s.name}</option>)
                      }
                    </select>
                  </FormField>
                </>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditModal(null)} className={btnSecondary}>Cancelar</button>
              <button onClick={handleCreateClient} disabled={isSaving || !newClientStageId} className={btnPrimary}>
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Criar Cliente
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Client */}
      {editModal === 'client' && selectedClient && (
        <Modal title={`Editar — ${selectedClient.name}`} onClose={() => setEditModal(null)} t={t}>
          <div className="space-y-4">
            <FormField label="Nome Completo" t={t}><input type="text" value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="E-mail (Login)" t={t}><input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="WhatsApp / Telefone" t={t}><input type="tel" value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="5551999999999" /></FormField>
            <FormField label="Empresa Principal" t={t}><input type="text" value={clientForm.companyName} onChange={e => setClientForm(f => ({ ...f, companyName: e.target.value }))} className={inputCls} /></FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Cidade" t={t} className="col-span-2"><input type="text" value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} className={inputCls} /></FormField>
              <FormField label="UF" t={t}><input type="text" maxLength={2} value={clientForm.state} onChange={e => setClientForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} className={inputCls} /></FormField>
            </div>
            <FormField label="Nicho" t={t}>
              <select value={clientForm.niche} onChange={e => setClientForm(f => ({ ...f, niche: e.target.value }))} className={inputCls}>
                <option value="">— Selecione um nicho —</option>
                {niches.map(n => <option key={n.id} value={n.slug}>{n.name}</option>)}
              </select>
            </FormField>
            {(() => {
              const n = niches.find(x => x.slug === clientForm.niche);
              if (!n?.has_clinic_fields) return null;
              return (
                <div className={`border rounded-xl p-3 space-y-2 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Dados da clínica</div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Cadeiras" t={t}><input type="number" min={0} value={clientForm.chairs} onChange={e => setClientForm(f => ({ ...f, chairs: e.target.value }))} className={inputCls} /></FormField>
                    <FormField label="Dentistas" t={t}><input type="number" min={0} value={clientForm.dentists} onChange={e => setClientForm(f => ({ ...f, dentists: e.target.value }))} className={inputCls} /></FormField>
                  </div>
                  <label className={`flex items-center gap-2 text-sm ${t.textSub}`}>
                    <input type="checkbox" checked={clientForm.has_secretary} onChange={e => setClientForm(f => ({ ...f, has_secretary: e.target.checked }))} className="w-4 h-4 accent-emerald-500" />
                    Possui secretária
                  </label>
                </div>
              );
            })()}
            <FormField label="Plano de Acesso" t={t}>
              <select value={clientForm.plan} onChange={e => setClientForm(f => ({ ...f, plan: e.target.value }))} className={inputCls}>
                <option value="trial">Trial</option>
                <option value="client">Hello Client</option>
                <option value="rating">Hello Rating</option>
                <option value="growth">Hello Growth</option>
                <option value="growth_lifetime">Lifetime</option>
              </select>
            </FormField>
            {/* Localização */}
            <div className={`border rounded-xl p-4 space-y-3 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Localização</div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Cidade" t={t}><input type="text" value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} className={inputCls} placeholder="São Paulo" /></FormField>
                <FormField label="Estado" t={t}>
                  <select value={clientForm.state} onChange={e => setClientForm(f => ({ ...f, state: e.target.value }))} className={inputCls}>
                    <option value="">— UF —</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
            {/* Nicho */}
            <div className={`border rounded-xl p-4 space-y-3 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Nicho</div>
              <FormField label="Nicho de Atuação" t={t}>
                <select value={clientForm.niche} onChange={e => setClientForm(f => ({ ...f, niche: e.target.value, nicheData: {} }))} className={inputCls}>
                  <option value="">— Selecione —</option>
                  <option value="clinica_odontologica">Clínica Odontológica</option>
                  <option value="clinica_estetica">Clínica Estética</option>
                  <option value="clinica_medica">Clínica Médica</option>
                  <option value="pet_shop">Pet Shop / Veterinária</option>
                  <option value="academia">Academia / Fitness</option>
                  <option value="restaurante">Restaurante / Food</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="servicos">Serviços Gerais</option>
                  <option value="outro">Outro</option>
                </select>
              </FormField>
              {clientForm.niche === 'clinica_odontologica' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Qtd. de Cadeiras" t={t}><input type="number" min={1} value={clientForm.nicheData.cadeiras || ''} onChange={e => setClientForm(f => ({ ...f, nicheData: { ...f.nicheData, cadeiras: parseInt(e.target.value) || '' } }))} className={inputCls} placeholder="Ex: 4" /></FormField>
                    <FormField label="Qtd. de Dentistas" t={t}><input type="number" min={1} value={clientForm.nicheData.dentistas || ''} onChange={e => setClientForm(f => ({ ...f, nicheData: { ...f.nicheData, dentistas: parseInt(e.target.value) || '' } }))} className={inputCls} placeholder="Ex: 2" /></FormField>
                  </div>
                  <FormField label="Tem Secretária?" t={t}>
                    <div className="flex gap-3 mt-1">
                      {[['sim', 'Sim'], ['nao', 'Não']].map(([v, l]) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="secretaria" value={v} checked={clientForm.nicheData.secretaria === v} onChange={() => setClientForm(f => ({ ...f, nicheData: { ...f.nicheData, secretaria: v } }))} className="accent-emerald-500" />
                          <span className={`text-sm ${t.textSub}`}>{l}</span>
                        </label>
                      ))}
                    </div>
                  </FormField>
                </div>
              )}
            </div>
            {/* Contatos Extras */}
            <div className={`border rounded-xl p-4 space-y-3 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className={`flex items-center justify-between`}>
                <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Contatos Extras</div>
                <button type="button" onClick={() => setClientContacts(c => [...c, { name: '', role: '', phone: '', email: '' }])} className={`text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-500 font-medium`}><Plus size={12} /> Adicionar</button>
              </div>
              {loadingContacts ? (
                <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={14} className="animate-spin" /> Carregando...</div>
              ) : clientContacts.length === 0 ? (
                <p className={`text-xs ${t.textMuted}`}>Nenhum contato extra cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {clientContacts.map((c, idx) => (
                    <div key={idx} className={`border rounded-lg p-3 space-y-2 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${t.textSub}`}>Contato {idx + 1}</span>
                        <button type="button" onClick={() => setClientContacts(cs => cs.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Nome" value={c.name} onChange={e => setClientContacts(cs => cs.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} className={`${inputCls} text-xs`} />
                        <input type="text" placeholder="Cargo/Função" value={c.role} onChange={e => setClientContacts(cs => cs.map((x, i) => i === idx ? { ...x, role: e.target.value } : x))} className={`${inputCls} text-xs`} />
                        <input type="tel" placeholder="WhatsApp" value={c.phone} onChange={e => setClientContacts(cs => cs.map((x, i) => i === idx ? { ...x, phone: e.target.value } : x))} className={`${inputCls} text-xs`} />
                        <input type="email" placeholder="E-mail" value={c.email} onChange={e => setClientContacts(cs => cs.map((x, i) => i === idx ? { ...x, email: e.target.value } : x))} className={`${inputCls} text-xs`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={`${t.securityBox} border rounded-lg p-3`}>
              <p className={`text-xs ${t.securityText} mb-2 flex items-center gap-1.5`}><Key size={12} /> Nova Senha (deixe vazio para não alterar)</p>
              <input type="text" value={clientForm.password} onChange={e => setClientForm(f => ({ ...f, password: e.target.value }))} className={inputCls} placeholder="Nova senha..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditModal(null)} className={btnSecondary}>Cancelar</button>
              <button onClick={handleUpdateClient} disabled={isSaving} className={btnPrimary}>
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Company */}
      {editModal === 'company' && editingCompany && (
        <Modal title={`Empresa — ${editingCompany.name}`} onClose={() => setEditModal(null)} t={t} wide>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nome da Empresa" t={t} className="col-span-2"><input type="text" value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Plano" t={t}><select value={companyForm.plan} onChange={e => setCompanyForm(f => ({ ...f, plan: e.target.value }))} className={inputCls}><option value="hello_client">Hello Client</option><option value="hello_rating">Hello Rating</option><option value="hello_growth">Hello Growth</option></select></FormField>
            <FormField label="Status" t={t}><select value={companyForm.subscriptionStatus} onChange={e => setCompanyForm(f => ({ ...f, subscriptionStatus: e.target.value }))} className={inputCls}><option value="trialing">Em Trial</option><option value="active">Ativo</option><option value="trial_expired">Trial Expirado</option><option value="past_due">Pagamento Atrasado</option><option value="canceled">Cancelado</option></select></FormField>
            <FormField label="Modelo de Trial" t={t}><select value={companyForm.trialModel} onChange={e => setCompanyForm(f => ({ ...f, trialModel: e.target.value }))} className={inputCls}><option value="">Nenhum</option><option value="model_a">Modelo A</option><option value="model_b">Modelo B</option></select></FormField>
            <FormField label="Vencimento do Trial" t={t}><input type="date" value={companyForm.trialEndAt} onChange={e => setCompanyForm(f => ({ ...f, trialEndAt: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Máx. Usuários" t={t}><input type="number" min={1} max={50} value={companyForm.maxUsers} onChange={e => setCompanyForm(f => ({ ...f, maxUsers: parseInt(e.target.value) || 1 }))} className={inputCls} /></FormField>
            <FormField label="Add-ons" t={t}>
              <div className="flex gap-3 mt-1 flex-wrap">
                {[['game', 'Game'], ['mpd', 'MPD'], ['health', 'Saúde']].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(companyForm.addons as any)[k]} onChange={e => setCompanyForm(f => ({ ...f, addons: { ...f.addons, [k]: e.target.checked } }))} className="w-4 h-4 rounded accent-emerald-500" />
                    <span className={`text-sm ${t.textSub}`}>{l}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Módulo de Ações" t={t}>
              <select value={(companyForm.addons as any).actions || 'none'} onChange={e => setCompanyForm(f => ({ ...f, addons: { ...f.addons, actions: e.target.value as 'none' | 'simplified' | 'complete' } }))} className={inputCls}>
                <option value="none">Nenhum</option>
                <option value="simplified">Simplificado</option>
                <option value="complete">Completo</option>
              </select>
            </FormField>
            <FormField label="Stripe Customer ID" t={t} className="col-span-2"><input type="text" value={companyForm.stripeCustomerId} onChange={e => setCompanyForm(f => ({ ...f, stripeCustomerId: e.target.value }))} className={inputCls} placeholder="cus_..." /></FormField>
            <FormField label="Stripe Subscription ID" t={t} className="col-span-2"><input type="text" value={companyForm.stripeSubscriptionId} onChange={e => setCompanyForm(f => ({ ...f, stripeSubscriptionId: e.target.value }))} className={inputCls} placeholder="sub_..." /></FormField>
          </div>
          <div className={`flex gap-3 pt-4 mt-2 border-t ${t.modalHeader}`}>
            <button onClick={() => setEditModal(null)} className={btnSecondary}>Cancelar</button>
            <button onClick={handleUpdateCompany} disabled={isSaving} className={btnPrimary}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Empresa
            </button>
          </div>
        </Modal>
      )}

      {/* Add Company */}
      {editModal === 'new_company' && selectedClient && (
        <Modal title={`Nova Empresa — ${selectedClient.name}`} onClose={() => setEditModal(null)} t={t} wide>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nome da Empresa" t={t} className="col-span-2"><input type="text" value={companyForm.name} onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Nome da empresa" /></FormField>
            <FormField label="Plano" t={t}><select value={companyForm.plan} onChange={e => setCompanyForm(f => ({ ...f, plan: e.target.value }))} className={inputCls}><option value="hello_client">Hello Client</option><option value="hello_rating">Hello Rating</option><option value="hello_growth">Hello Growth</option></select></FormField>
            <FormField label="Status Inicial" t={t}><select value={companyForm.subscriptionStatus} onChange={e => setCompanyForm(f => ({ ...f, subscriptionStatus: e.target.value }))} className={inputCls}><option value="trialing">Em Trial</option><option value="active">Ativo</option></select></FormField>
            <FormField label="Modelo de Trial" t={t}><select value={companyForm.trialModel} onChange={e => setCompanyForm(f => ({ ...f, trialModel: e.target.value }))} className={inputCls}><option value="">Nenhum</option><option value="model_a">Modelo A</option><option value="model_b">Modelo B</option></select></FormField>
            <FormField label="Vencimento do Trial" t={t}><input type="date" value={companyForm.trialEndAt} onChange={e => setCompanyForm(f => ({ ...f, trialEndAt: e.target.value }))} className={inputCls} /></FormField>
            <FormField label="Máx. Usuários" t={t}><input type="number" min={1} max={50} value={companyForm.maxUsers} onChange={e => setCompanyForm(f => ({ ...f, maxUsers: parseInt(e.target.value) || 1 }))} className={inputCls} /></FormField>
            <FormField label="Add-ons" t={t}>
              <div className="flex gap-3 mt-1 flex-wrap">
                {[['game', 'Game'], ['mpd', 'MPD'], ['health', 'Saúde']].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(companyForm.addons as any)[k]} onChange={e => setCompanyForm(f => ({ ...f, addons: { ...f.addons, [k]: e.target.checked } }))} className="w-4 h-4 rounded accent-emerald-500" />
                    <span className={`text-sm ${t.textSub}`}>{l}</span>
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Módulo de Ações" t={t}>
              <select value={(companyForm.addons as any).actions || 'none'} onChange={e => setCompanyForm(f => ({ ...f, addons: { ...f.addons, actions: e.target.value as 'none' | 'simplified' | 'complete' } }))} className={inputCls}>
                <option value="none">Nenhum</option>
                <option value="simplified">Simplificado</option>
                <option value="complete">Completo</option>
              </select>
            </FormField>
          </div>
          <div className={`flex gap-3 pt-4 mt-2 border-t ${t.modalHeader}`}>
            <button onClick={() => setEditModal(null)} className={btnSecondary}>Cancelar</button>
            <button onClick={handleAddCompany} disabled={isSaving || !companyForm.name} className={btnPrimary}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Adicionar Empresa
            </button>
          </div>
        </Modal>
      )}

      {/* Payment Link */}
      {editModal === 'payment_link' && editingCompany && selectedClient && (
        <Modal title="Enviar Link de Pagamento" onClose={() => { setEditModal(null); setPaymentLinkResult(null); }} t={t}>
          {paymentLinkResult ? (
            <div className="space-y-4">
              <div className={`${t.successBox} border rounded-xl p-4 text-center`}>
                <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-600 font-semibold">Link gerado com sucesso!</p>
              </div>
              <div className={`${t.linkBox} border rounded-lg p-3`}>
                <p className={`text-xs ${t.textMuted} mb-2`}>Link de Pagamento:</p>
                <div className="flex items-center gap-2">
                  <p className={`text-xs ${t.linkText} font-mono flex-1 truncate`}>{paymentLinkResult.url}</p>
                  <button onClick={() => { navigator.clipboard.writeText(paymentLinkResult.url); showToast('success', 'Link copiado!'); }} className={`p-1.5 ${t.textMuted} hover:${t.text} rounded transition-colors`}><Copy size={14} /></button>
                  <a href={paymentLinkResult.url} target="_blank" rel="noopener noreferrer" className={`p-1.5 ${t.textMuted} hover:${t.text} rounded transition-colors`}><ExternalLink size={14} /></a>
                </div>
              </div>
              <button onClick={() => { setEditModal(null); setPaymentLinkResult(null); }} className={`w-full ${btnPrimary}`}><Check size={16} /> Concluído</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`${t.linkBox} border rounded-lg p-3 text-sm`}>
                <p className={`${t.textMuted} text-xs mb-1`}>Cliente</p>
                <p className={`${t.text} font-semibold`}>{selectedClient.name}</p>
                <p className={`${t.textMuted} text-xs`}>{selectedClient.email}</p>
              </div>
              <FormField label="Plano" t={t}>
                <select value={paymentLinkForm.plan} onChange={e => setPaymentLinkForm(f => ({ ...f, plan: e.target.value }))} className={inputCls}>
                  <option value="hello_client">Hello Client</option>
                  <option value="hello_rating">Hello Rating</option>
                  <option value="hello_growth">Hello Growth</option>
                </select>
              </FormField>
              <FormField label="Número de Usuários" t={t}>
                <input type="number" min={1} max={10} value={paymentLinkForm.userCount} onChange={e => setPaymentLinkForm(f => ({ ...f, userCount: parseInt(e.target.value) || 1 }))} className={inputCls} />
              </FormField>
              <FormField label="Add-ons" t={t}>
                <div className="flex gap-4 mt-1 flex-wrap">
                  {[['game', 'Game'], ['mpd', 'MPD'], ['health', 'Saúde']].map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={(paymentLinkForm.addons as any)[k] || false} onChange={e => setPaymentLinkForm(f => ({ ...f, addons: { ...f.addons, [k]: e.target.checked } }))} className="w-4 h-4 rounded accent-emerald-500" />
                      <span className={`text-sm ${t.textSub}`}>{l}</span>
                    </label>
                  ))}
                </div>
              </FormField>
              <FormField label="Módulo de Ações" t={t}>
                <select value={(paymentLinkForm.addons as any).actions || 'none'} onChange={e => setPaymentLinkForm(f => ({ ...f, addons: { ...f.addons, actions: e.target.value as 'none' | 'simplified' | 'complete' } }))} className={inputCls}>
                  <option value="none">Nenhum</option>
                  <option value="simplified">Simplificado</option>
                  <option value="complete">Completo</option>
                </select>
              </FormField>
              <div className={`${t.paymentBox} border rounded-lg p-3 flex items-center justify-between`}>
                <span className={`text-sm ${t.textSub}`}>Valor mensal total:</span>
                <span className={`text-lg font-bold ${t.paymentText}`}>R$ {paymentPrice.toFixed(2).replace('.', ',')}</span>
              </div>
              <FormField label="Nota personalizada (opcional)" t={t}>
                <textarea value={paymentLinkForm.customNote} onChange={e => setPaymentLinkForm(f => ({ ...f, customNote: e.target.value }))} className={`${inputCls} h-20 resize-none`} placeholder="Mensagem para o cliente..." />
              </FormField>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditModal(null)} className={btnSecondary}>Cancelar</button>
                <button onClick={() => handleSendPaymentLink(editingCompany)} disabled={sendingLink} className={btnPrimary}>
                  {sendingLink ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} Gerar Link
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
      </div>{/* end main content */}

      {/* Client Profile Slide-over */}
      {profileClient && (
        <ClientProfile
          client={profileClient}
          isDark={isDark}
          onClose={() => setProfileClient(null)}
          adminName="Admin"
          onClientUpdate={(patch) => {
            updateClientInState(profileClient.id, patch as any);
            setProfileClient(prev => prev ? { ...prev, ...patch } as any : prev);
          }}
        />
      )}
    </div>
  );
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function FormField({ label, children, className = '', t }: { label: string; children: React.ReactNode; className?: string; t: typeof DARK }) {
  return (
    <div className={className}>
      <label className={`block text-xs font-semibold ${t.label} uppercase tracking-wider mb-1.5`}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose, wide = false, t }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean; t: typeof DARK }) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${t.overlay} backdrop-blur-sm`}>
      <div className={`${t.modalBg} border rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${t.modalHeader}`}>
          <h2 className={`text-base font-bold ${t.text}`}>{title}</h2>
          <button onClick={onClose} className={`p-1.5 ${t.textMuted} hover:${t.text} hover:${t.surface === 'bg-white' ? 'bg-slate-100' : 'bg-gray-800'} rounded-lg transition-colors`}>
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default AdminUserManagement;
