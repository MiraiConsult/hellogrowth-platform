'use client';

import React, { useState, useEffect } from 'react';
import Auth from '@/components/Auth';
import MainApp from '@/components/MainApp';
import { User, PlanType, Company, UserCompany } from '@/types';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'auth' | 'app'>('auth');
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

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
    setView('auth');
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

      if (companyData && ucData) {
        const updatedUser: User = {
          ...currentUser,
          tenantId: companyId,
          activeCompanyId: companyId,
          companyName: companyData.name,
          plan: companyData.plan || currentUser.plan,
          isOwner: ucData.role === 'owner',
          role: ucData.role || currentUser.role,
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

  return (
    <MainApp
      currentUser={currentUser}
      onLogout={handleLogout}
      onUpdatePlan={handleUpdatePlan}
      onSwitchCompany={handleSwitchCompany}
      daysLeft={undefined}
    />
  );
}
