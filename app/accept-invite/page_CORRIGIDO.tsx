'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Componente interno que usa useSearchParams
function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Token de convite inválido');
      setLoading(false);
      return;
    }

    loadInvite(token);
  }, [searchParams]);

  const loadInvite = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('team_invites')
        .select('*, users!team_invites_owner_id_fkey(business_name)')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        setError('Convite não encontrado ou já foi aceito');
        setLoading(false);
        return;
      }

      // Verificar se expirou
      if (new Date(data.expires_at) < new Date()) {
        setError('Este convite expirou');
        setLoading(false);
        return;
      }

      setInviteData(data);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar convite:', err);
      setError('Erro ao carregar convite');
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: newPassword,
      });

      if (authError) {
        throw authError;
      }

      // 2. Criar membro da equipe
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: authData.user!.id,
          owner_id: inviteData.owner_id,
          email: inviteData.email,
          name: inviteData.name,
          role: inviteData.role,
          status: 'active',
        });

      if (memberError) {
        throw memberError;
      }

      // 3. Atualizar status do convite
      await supabase
        .from('team_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteData.id);

      // 4. Fazer login automático
      await supabase.auth.signInWithPassword({
        email: inviteData.email,
        password: newPassword,
      });

      // 5. Redirecionar para a plataforma
      router.push('/');
    } catch (err: any) {
      console.error('Erro ao aceitar convite:', err);
      setError(err.message || 'Erro ao aceitar convite');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Convite Inválido</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Aceitar Convite</h1>
          <p className="text-gray-600">
            Você foi convidado para se juntar à equipe de{' '}
            <span className="font-semibold">{inviteData?.users?.business_name}</span>
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={inviteData?.email || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome
            </label>
            <input
              type="text"
              value={inviteData?.name || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nível de Acesso
            </label>
            <input
              type="text"
              value={inviteData?.role === 'admin' ? 'Administrador' : inviteData?.role === 'manager' ? 'Gerente' : inviteData?.role === 'member' ? 'Membro' : 'Visualizador'}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova Senha *
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Senha *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a senha novamente"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={loading || !newPassword || !confirmPassword}
          className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Processando...' : 'Aceitar Convite e Criar Conta'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Ao aceitar, você concorda com os termos de uso da plataforma
        </p>
      </div>
    </div>
  );
}

// Componente principal com Suspense
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
