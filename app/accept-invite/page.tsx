'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Componente interno que usa useSearchParams
function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);

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
      const response = await fetch(`/api/team/accept?token=${encodeURIComponent(token)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Convite não encontrado ou já foi aceito');
        setLoading(false);
        return;
      }

      setInviteData(data.invite);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar convite:', err);
      setError('Erro ao carregar convite');
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    setError('');

    try {
      const token = searchParams.get('token');
      
      const response = await fetch('/api/team/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erro ao aceitar convite');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      
      // Redirecionar para página de cadastro após 2 segundos
      setTimeout(() => {
        // Redireciona para a página principal com parâmetros para abrir cadastro
        router.push(`/?signup=true&email=${encodeURIComponent(inviteData?.email || '')}&name=${encodeURIComponent(inviteData?.name || '')}`);
      }, 2000);

    } catch (err: any) {
      console.error('Erro ao aceitar convite:', err);
      setError(err.message || 'Erro ao aceitar convite');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando convite...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Convite Aceito!</h1>
          <p className="text-gray-600 mb-4">
            Você foi adicionado à equipe de <strong>{inviteData?.owner_company_name || 'HelloGrowth'}</strong>.
          </p>
          <p className="text-gray-500 mb-6">
            Redirecionando para criar sua conta...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
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
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      manager: 'Gerente',
      member: 'Membro',
      viewer: 'Visualizador'
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Aceitar Convite</h1>
          <p className="text-gray-600">
            Você foi convidado para se juntar à equipe de{' '}
            <span className="font-semibold text-emerald-600">{inviteData?.owner_company_name || 'HelloGrowth'}</span>
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Email
            </label>
            <p className="text-gray-800 font-medium">{inviteData?.email || ''}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Nome
            </label>
            <p className="text-gray-800 font-medium">{inviteData?.name || ''}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Nível de Acesso
            </label>
            <p className="text-gray-800 font-medium">{getRoleLabel(inviteData?.role)}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Próximo passo:</strong> Ao aceitar o convite, você será redirecionado para criar sua conta na plataforma com o email acima.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Processando...
            </>
          ) : (
            <>
              Aceitar Convite
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
