'use client';

import React, { useState, useEffect } from 'react';
import { LogIn, X } from 'lucide-react';
import Auth from '@/components/Auth';
import MainApp from '@/components/MainApp';
import TrialExpiredScreen from '@/components/TrialExpiredScreen';
import { User, PlanType, Company, UserCompany } from '@/types';
import { supabase } from '@/lib/supabase';

// Verifica se o trial do Modelo B expirou
function isTrialExpired(user: User): boolean {
  // Apenas bloqueia o Modelo B (sem cartão)
  // O Modelo A é gerenciado pelo Stripe (cancela automaticamente)
  if (user.trialModel !== 'model_b') return false;
  if (!user.trialEndAt) return false;
  if (user.subscriptionStatus === 'active') return false; // Já pagou
  const trialEnd = new Date(user.trialEndAt);
  return new Date() > trialEnd;
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'auth' | 'app'>('auth');
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  // Impersonation: admin acessando conta de cliente
  const [impersonating, setImpersonating] = useState<{ adminUser: User; clientName: string } | null>(() => {
    // Restaurar estado de impersonation após reload (ex: troca de empresa)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hg_impersonating');
      if (saved) {
        try { return JSON.parse(saved); } catch { return null; }
      }
    }
    return null;
  });

  // Check for active session on load
  useEffect(() => {
    const init = async () => {
      // Check DB connection first
      if (supabase) {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
          console.error('DB Check Error:', error);
          setDbError('Erro ao conectar com o banco de dados.');
        }
      }

      const savedUser = localStorage.getItem('hg_current_user');
      const params = new URLSearchParams(window.location.search);
      const hasPublicLink = params.has('form') || params.has('survey');

      if (hasPublicLink) {
        const publicUser: User = {
          id: 'public',
          name: 'Public',
          email: '',
          password: '',
          plan: 'growth',
          createdAt: '',
          companyName: '',
        };
        setCurrentUser(publicUser);
        setView('app');
      } else {
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
          setView('app');
        } else {
          setView('auth');
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  // Handle Login/Logout Persisting
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('hg_current_user', JSON.stringify(user));
    setView('app');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hg_current_user');
    localStorage.removeItem('hg_impersonating');
    setImpersonating(null);
    setView('auth');
  };

  // Impersonation: admin entra na conta do cliente sem precisar de senha
  const handleImpersonate = async (clientData: any) => {
    if (!supabase || !currentUser) return;
    try {
      // Buscar dados completos do usuário cliente no banco
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', clientData.id)
        .single();
      if (!userData) return;

      // Determinar o tenant_id do cliente
      const clientTenantId = clientData.tenantId || userData.tenant_id;

      // Montar o objeto User do cliente
      const clientUser: User = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        password: '',
        plan: userData.plan || 'growth',
        createdAt: userData.created_at,
        companyName: userData.company_name || clientData.companyName || '',
        tenantId: clientTenantId,
        isOwner: true,
        role: 'admin',
        trialEndAt: userData.trial_end_at,
        trialModel: userData.trial_model,
        subscriptionStatus: userData.subscription_status,
      };

      // Salvar admin para poder voltar (persistir no localStorage para sobreviver a reloads)
      const impersonatingData = { adminUser: currentUser, clientName: clientUser.name || clientUser.companyName || clientData.email };
      localStorage.setItem('hg_impersonating', JSON.stringify(impersonatingData));
      setImpersonating(impersonatingData);
      // Salvar o usuário cliente no hg_current_user para que o reload restaure o cliente, não o admin
      localStorage.setItem('hg_current_user', JSON.stringify(clientUser));
      // Limpar active company para forçar o carregamento do tenant do cliente
      localStorage.removeItem('hg_active_company_id');
      if (clientTenantId) {
        localStorage.setItem('hg_active_company_id', clientTenantId);
      }
      setCurrentUser(clientUser);
      setView('app');
    } catch (err) {
      console.error('Erro ao impersonar cliente:', err);
    }
  };

  // Voltar ao painel admin após impersonation
  const handleStopImpersonating = () => {
    if (!impersonating) return;
    const adminUser = impersonating.adminUser;
    setImpersonating(null);
    localStorage.removeItem('hg_impersonating');
    localStorage.removeItem('hg_active_company_id');
    // Restaurar o usuário admin no hg_current_user
    localStorage.setItem('hg_current_user', JSON.stringify(adminUser));
    setCurrentUser(adminUser);
    setView('app');
  };

  // Handle Company Switch
  const handleSwitchCompany = async (companyId: string) => {
    if (!currentUser || !supabase) return;

    try {
      // Buscar dados da empresa selecionada
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      // Buscar role do usuário nessa empresa
      const { data: ucData } = await supabase
        .from('user_companies')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('company_id', companyId)
        .single();

      // Buscar TODAS as empresas do usuário com dados completos
      const { data: allUserCompanies } = await supabase
        .from('user_companies')
        .select('*, company:companies(*)')
        .eq('user_id', currentUser.id)
        .eq('status', 'active');

      if (companyData && ucData) {
        const updatedUser: User = {
          ...currentUser,
          tenantId: companyId,
          activeCompanyId: companyId,
          companyName: companyData.name,
          plan: companyData.plan || currentUser.plan,
          isOwner: ucData.role === 'owner',
          role: ucData.role || currentUser.role,
          companies: allUserCompanies || currentUser.companies,
        };

        // Atualizar is_default: desmarcar todas e marcar a nova
        await supabase
          .from('user_companies')
          .update({ is_default: false })
          .eq('user_id', currentUser.id);

        await supabase
          .from('user_companies')
          .update({ is_default: true })
          .eq('user_id', currentUser.id)
          .eq('company_id', companyId);

        setCurrentUser(updatedUser);
        localStorage.setItem('hg_current_user', JSON.stringify(updatedUser));

        // Aguardar um pouco para garantir que o localStorage foi salvo
        await new Promise(resolve => setTimeout(resolve, 100));

        // Forçar reload para recarregar todos os dados com o novo tenant
        window.location.reload();
      }
    } catch (err) {
      console.error('Erro ao trocar de empresa:', err);
    }
  };

  // Handle Plan Updates
  const handleUpdatePlan = (newPlan: PlanType) => {
    if (!currentUser || currentUser.id === 'public') return;

    const updatedUser = { ...currentUser, plan: newPlan };

    setCurrentUser(updatedUser);
    localStorage.setItem('hg_current_user', JSON.stringify(updatedUser));

    if (supabase) {
      // Atualizar plano na tabela companies (multi-tenant)
      if (currentUser.activeCompanyId || currentUser.tenantId) {
        supabase
          .from('companies')
          .update({ plan: newPlan })
          .eq('id', currentUser.activeCompanyId || currentUser.tenantId)
          .then(({ error }) => {
            if (error) console.error('Error updating plan in companies:', error);
          });
      }
      
      // Manter compatibilidade: atualizar também na tabela users
      supabase
        .from('users')
        .update({ plan: newPlan })
        .eq('id', currentUser.id)
        .then(({ error }) => {
          if (error) console.error('Error updating plan in DB:', error);
        });
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        Carregando...
      </div>
    );

  if (dbError)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4 text-red-700 font-bold border border-red-200 rounded">
        {dbError}
      </div>
    );

  if (view === 'auth') {
    return <Auth onLogin={handleLogin} />;
  }

  if (!currentUser) return null;

  // Verificar se o trial do Modelo B expirou
  if (isTrialExpired(currentUser)) {
    return (
      <TrialExpiredScreen
        currentUser={currentUser}
        onLogout={handleLogout}
      />
    );
  }

  // Calcular dias restantes do trial (para banner informativo)
  let daysLeft: number | undefined = undefined;
  if (currentUser.trialModel === 'model_b' && currentUser.trialEndAt) {
    const trialEnd = new Date(currentUser.trialEndAt);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="relative">
      {/* Banner de retorno ao admin (impersonation) - posicionado no canto inferior esquerdo para não conflitar com botões X de paineis */}
      {impersonating && (
        <button
          onClick={handleStopImpersonating}
          title={`Clique para voltar ao Admin`}
          className="fixed bottom-6 left-4 z-[9999] flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg transition-all hover:scale-105 max-w-[220px]"
        >
          <LogIn size={14} strokeWidth={2.5} className="flex-shrink-0 rotate-180" />
          <span className="truncate">Admin: {impersonating.clientName}</span>
        </button>
      )}
      <MainApp
        currentUser={currentUser}
        onLogout={handleLogout}
        onUpdatePlan={handleUpdatePlan}
        onSwitchCompany={handleSwitchCompany}
        onImpersonate={handleImpersonate}
        daysLeft={daysLeft}
      />
    </div>
  );
}
