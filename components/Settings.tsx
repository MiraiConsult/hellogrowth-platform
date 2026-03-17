import React, { useState, useEffect } from 'react';
import { PlanType, AccountSettings, User } from '@/types';
import {
  User as UserIcon, CreditCard, ShieldCheck, CheckCircle, AlertCircle,
  Loader2, Key, ExternalLink, RefreshCw, Package, Users, TrendingUp,
  Star, Zap, Calendar, AlertTriangle, XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SettingsProps {
  activePlan: PlanType;
  onSelectPlan: (plan: PlanType) => void;
  settings: AccountSettings;
  setSettings: (newSettings: AccountSettings) => void;
  currentUser?: User;
  userRole?: string;
}

interface SubscriptionInfo {
  plan: string;
  planId?: string;
  status: string;
  nextBilling?: string | null;
  amount?: number | null;
  currency?: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: string | null;
  addons?: Array<{ id: string; name: string; amount: number; quantity: number }>;
  maxUsers?: number;
  stripeConnected?: boolean;
  error?: string;
}

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'Hello Client': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  'Hello Rating': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  'Hello Growth': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  'growth_lifetime': { bg: 'bg-gray-900', text: 'text-yellow-400', border: 'border-yellow-400', badge: 'bg-yellow-400 text-gray-900' },
  'default': { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200', badge: 'bg-primary-100 text-primary-700' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: 'Ativa', color: 'text-emerald-600', icon: <CheckCircle size={14} /> },
  trialing: { label: 'Trial', color: 'text-blue-600', icon: <Star size={14} /> },
  past_due: { label: 'Pagamento pendente', color: 'text-amber-600', icon: <AlertTriangle size={14} /> },
  canceled: { label: 'Cancelada', color: 'text-red-600', icon: <XCircle size={14} /> },
  unpaid: { label: 'Não paga', color: 'text-red-600', icon: <AlertCircle size={14} /> },
  trial: { label: 'Trial', color: 'text-blue-600', icon: <Star size={14} /> },
};

const Settings: React.FC<SettingsProps> = ({ activePlan, onSelectPlan, settings, setSettings, currentUser, userRole = 'admin' }) => {
  const isReadOnly = userRole === 'viewer';
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [localSettings, setLocalSettings] = useState<AccountSettings>(settings);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: 'idle' as 'idle' | 'success' | 'error' });
  const [businessProfile, setBusinessProfile] = useState<any>(null);

  // Stripe
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');

  useEffect(() => {
    const loadBusinessProfile = async () => {
      if (!currentUser?.id) return;
      try {
        const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', currentUser.id).single();
        const tenantId = userData?.tenant_id || currentUser.id;
        const { data } = await supabase.from('business_profile').select('*').eq('tenant_id', tenantId).single();
        if (data) setBusinessProfile(data);
      } catch (e) { console.error('Erro ao carregar perfil:', e); }
    };
    loadBusinessProfile();
  }, [currentUser?.id]);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (passwordStatus === 'error' && (newPassword || confirmPassword)) {
      setPasswordStatus('idle');
      setPasswordMessage({ text: '', type: 'idle' });
    }
  }, [newPassword, confirmPassword, passwordStatus]);

  // Carregar informações da assinatura
  useEffect(() => {
    const loadSubscription = async () => {
      if (!currentUser?.id) return;
      setLoadingSubscription(true);
      try {
        const res = await fetch(`/api/stripe/subscription-info?userId=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setSubscriptionInfo(data);
        }
      } catch (e) {
        console.error('Erro ao carregar assinatura:', e);
      } finally {
        setLoadingSubscription(false);
      }
    };
    loadSubscription();
  }, [currentUser?.id]);

  const handleInputChange = (field: keyof AccountSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
  };

  const handleSaveAccountDetails = async () => {
    setSaveStatus('saving');
    setSettings(localSettings);
    setTimeout(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 3000); }, 800);
  };

  const handleChangePassword = async () => {
    setPasswordMessage({ text: '', type: 'idle' });
    if (!newPassword || !confirmPassword) { setPasswordMessage({ text: 'Preencha ambos os campos.', type: 'error' }); setPasswordStatus('error'); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage({ text: 'As senhas não coincidem.', type: 'error' }); setPasswordStatus('error'); return; }
    if (newPassword.length < 6) { setPasswordMessage({ text: 'Mínimo 6 caracteres.', type: 'error' }); setPasswordStatus('error'); return; }
    setPasswordStatus('saving');
    try {
      const { error } = await supabase.from('users').update({ password: newPassword }).eq('id', currentUser?.id);
      if (error) throw error;
      setPasswordStatus('saved');
      setPasswordMessage({ text: 'Senha atualizada!', type: 'success' });
      setNewPassword(''); setConfirmPassword('');
      setTimeout(() => { setPasswordStatus('idle'); setPasswordMessage({ text: '', type: 'idle' }); }, 5000);
    } catch (e: any) { setPasswordStatus('error'); setPasswordMessage({ text: 'Erro ao atualizar.', type: 'error' }); }
  };

  const handleOpenPortal = async () => {
    if (!currentUser?.id) return;
    setPortalLoading(true);
    setPortalError('');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          returnUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error || 'Erro ao abrir o portal de assinatura.');
      }
    } catch (e: any) {
      setPortalError('Erro ao conectar com o Stripe. Tente novamente.');
    } finally {
      setPortalLoading(false);
    }
  };

  const isLifetime = activePlan === 'growth_lifetime';
  const planKey = subscriptionInfo?.plan || activePlan;
  const planColors = PLAN_COLORS[planKey] || PLAN_COLORS['default'];
  const statusConfig = STATUS_CONFIG[subscriptionInfo?.status || 'active'] || STATUS_CONFIG['active'];

  const formatCurrency = (amount: number, currency = 'brl') => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  };

  return (
    <div className="p-8 min-h-screen bg-gray-50" style={{ colorScheme: 'light' }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500">{isReadOnly ? 'Visualização das configurações da conta.' : 'Gerencie sua conta e integrações.'}</p>
        {isReadOnly && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>Você tem permissão apenas para visualizar. Apenas administradores podem alterar configurações.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* Detalhes da Conta */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserIcon size={20} className="text-gray-400" /> Detalhes da Conta
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                <input type="text" value={businessProfile?.company_name || localSettings.companyName || ''} disabled className="w-full rounded-lg border-gray-300 shadow-sm p-2 border bg-gray-100 text-gray-600 cursor-not-allowed" placeholder="Definido no Perfil do Negócio" />
                <p className="text-xs text-gray-500 mt-1">Edite no Perfil do Negócio</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Administrativo</label>
                <input type="email" value={localSettings.adminEmail} onChange={(e) => handleInputChange('adminEmail', e.target.value)} disabled={isReadOnly} className={`w-full rounded-lg border-gray-300 shadow-sm p-2 border text-gray-900 ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'focus:border-primary-500 focus:ring-primary-500 bg-white'}`} style={{ backgroundColor: isReadOnly ? undefined : '#ffffff', color: '#111827' }} placeholder="email@empresa.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
                <input type="url" value={businessProfile?.website || localSettings.website || ''} disabled className="w-full rounded-lg border-gray-300 shadow-sm p-2 border bg-gray-100 text-gray-600 cursor-not-allowed" placeholder="Definido no Perfil do Negócio" />
                <p className="text-xs text-gray-500 mt-1">Edite no Perfil do Negócio</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              {!isReadOnly && (
                <button onClick={handleSaveAccountDetails} disabled={saveStatus === 'saving'} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${saveStatus === 'saved' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
                  {saveStatus === 'saving' && <Loader2 size={18} className="animate-spin" />}
                  {saveStatus === 'saved' && <CheckCircle size={18} />}
                  {saveStatus === 'idle' ? 'Salvar Alterações' : saveStatus === 'saving' ? 'Salvando...' : 'Salvo!'}
                </button>
              )}
            </div>
          </div>

          {/* Alterar Senha */}
          {!isReadOnly && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={20} className="text-gray-400" /> Alterar Senha
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-9 rounded-lg border-gray-300 shadow-sm p-2 border bg-white text-gray-900" style={{ backgroundColor: '#ffffff', color: '#111827' }} placeholder="Mínimo 6 caracteres" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-9 rounded-lg border-gray-300 shadow-sm p-2 border bg-white text-gray-900" style={{ backgroundColor: '#ffffff', color: '#111827' }} placeholder="Repita a nova senha" />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end items-center gap-4">
                {passwordMessage.text && <p className={`text-sm font-medium ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{passwordMessage.text}</p>}
                <button onClick={handleChangePassword} disabled={passwordStatus === 'saving'} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors min-w-[150px] justify-center ${passwordStatus === 'saved' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50'}`}>
                  {passwordStatus === 'saving' && <Loader2 size={18} className="animate-spin" />}
                  {passwordStatus === 'saved' && <CheckCircle size={18} />}
                  {passwordStatus === 'idle' || passwordStatus === 'error' ? 'Atualizar Senha' : passwordStatus === 'saving' ? 'Salvando...' : 'Senha Atualizada!'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita - Assinatura Stripe */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CreditCard size={20} className="text-gray-400" /> Assinatura
              </h2>
              {!loadingSubscription && (
                <button
                  onClick={() => {
                    if (currentUser?.id) {
                      setLoadingSubscription(true);
                      fetch(`/api/stripe/subscription-info?userId=${currentUser.id}`)
                        .then(r => r.json()).then(d => setSubscriptionInfo(d))
                        .finally(() => setLoadingSubscription(false));
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Atualizar"
                >
                  <RefreshCw size={15} />
                </button>
              )}
            </div>

            {/* Loading */}
            {loadingSubscription && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary-500" />
              </div>
            )}

            {/* Lifetime */}
            {!loadingSubscription && isLifetime && (
              <div className="bg-gray-900 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">🚀</div>
                <p className="text-xs font-bold uppercase text-yellow-400 mb-1">PLANO ATUAL</p>
                <p className="text-xl font-bold text-white">Lifetime Pro</p>
                <p className="text-xs text-gray-400 mt-2">Acesso vitalício a todas as funcionalidades</p>
              </div>
            )}

            {/* Dados da assinatura */}
            {!loadingSubscription && !isLifetime && subscriptionInfo && (
              <div className="space-y-4">
                {/* Plano atual */}
                <div className={`rounded-xl p-4 border ${planColors.bg} ${planColors.border}`}>
                  <p className={`text-xs font-bold uppercase mb-1 ${planColors.text}`}>PLANO ATUAL</p>
                  <div className="flex items-center justify-between">
                    <p className={`text-xl font-bold ${planColors.text}`}>{subscriptionInfo.plan || activePlan}</p>
                    {subscriptionInfo.amount && (
                      <p className={`text-sm font-semibold ${planColors.text}`}>
                        {formatCurrency(subscriptionInfo.amount, subscriptionInfo.currency)}/mês
                      </p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`flex items-center gap-1 font-medium ${statusConfig.color}`}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                </div>

                {/* Próxima cobrança */}
                {subscriptionInfo.nextBilling && !subscriptionInfo.cancelAtPeriodEnd && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1"><Calendar size={13} /> Próxima cobrança</span>
                    <span className="font-medium text-gray-800">{subscriptionInfo.nextBilling}</span>
                  </div>
                )}

                {/* Cancelamento agendado */}
                {subscriptionInfo.cancelAtPeriodEnd && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                    <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                    <span>Assinatura cancelada. Acesso até <strong>{subscriptionInfo.nextBilling}</strong></span>
                  </div>
                )}

                {/* Usuários */}
                {subscriptionInfo.maxUsers && subscriptionInfo.maxUsers > 1 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1"><Users size={13} /> Usuários incluídos</span>
                    <span className="font-medium text-gray-800">{subscriptionInfo.maxUsers}</span>
                  </div>
                )}

                {/* Add-ons */}
                {subscriptionInfo.addons && subscriptionInfo.addons.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                      <Package size={12} /> Add-ons ativos
                    </p>
                    <div className="space-y-1">
                      {subscriptionInfo.addons.map((addon, i) => (
                        <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-gray-700 flex items-center gap-1.5">
                            <Zap size={12} className="text-amber-500" />
                            {addon.name}
                            {addon.quantity > 1 && <span className="text-gray-400">×{addon.quantity}</span>}
                          </span>
                          <span className="text-gray-600 font-medium">{formatCurrency(addon.amount * addon.quantity, subscriptionInfo.currency)}/mês</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Erro do portal */}
                {portalError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                    <span>{portalError}</span>
                  </div>
                )}

                {/* Botões */}
                {!isReadOnly && (
                  <div className="space-y-2 pt-2">
                    {subscriptionInfo.stripeConnected ? (
                      <button
                        onClick={handleOpenPortal}
                        disabled={portalLoading}
                        className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {portalLoading ? (
                          <><Loader2 size={16} className="animate-spin" /> Abrindo portal...</>
                        ) : (
                          <><ExternalLink size={16} /> Gerenciar Assinatura</>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectPlan('growth')}
                        className="w-full py-2.5 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <TrendingUp size={16} /> Fazer Upgrade
                      </button>
                    )}

                    {subscriptionInfo.stripeConnected && (
                      <p className="text-xs text-center text-gray-400">
                        Gerencie plano, pagamento, add-ons e cancelamento pelo portal seguro do Stripe
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sem dados */}
            {!loadingSubscription && !isLifetime && !subscriptionInfo && (
              <div className="text-center py-6 text-gray-400">
                <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma assinatura encontrada</p>
                {!isReadOnly && (
                  <button onClick={() => onSelectPlan('growth')} className="mt-3 text-primary-600 text-sm font-medium hover:underline">
                    Ver planos disponíveis
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
