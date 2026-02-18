'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash (Supabase puts tokens in the URL fragment)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setErrorMessage('Erro ao processar a autenticação com o Google. Tente novamente.');
          setStatus('error');
          return;
        }

        if (!session || !session.user) {
          // Try to exchange the code/hash for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            window.location.href.split('?')[1] || ''
          );

          if (exchangeError || !data.session) {
            console.error('Exchange error:', exchangeError);
            setErrorMessage('Erro ao processar a autenticação com o Google. Tente novamente.');
            setStatus('error');
            return;
          }

          // Now we have a session, proceed with the user check
          await processGoogleUser(data.session.user.email);
          return;
        }

        // We have a session, proceed with the user check
        await processGoogleUser(session.user.email);

      } catch (err: any) {
        console.error('Callback error:', err);
        setErrorMessage(err.message || 'Ocorreu um erro inesperado.');
        setStatus('error');
      }
    };

    const processGoogleUser = async (googleEmail: string | undefined) => {
      if (!googleEmail) {
        setErrorMessage('Não foi possível obter o email da conta Google.');
        setStatus('error');
        return;
      }

      // Check if user exists in the 'users' table (our custom table)
      const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', googleEmail)
        .maybeSingle();

      if (dbError) {
        console.error('DB Error:', dbError);
        setErrorMessage('Erro ao verificar sua conta. Tente novamente mais tarde.');
        setStatus('error');
        return;
      }

      if (!userData) {
        // User not found - not registered
        // Sign out from Supabase Auth to clean up
        await supabase.auth.signOut();
        setErrorMessage('Conta não encontrada. O login com Google está disponível apenas para usuários já cadastrados na plataforma.');
        setStatus('error');
        return;
      }

      // User found! Build the user object and save to localStorage
      const user = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        password: userData.password || '',
        plan: userData.plan,
        createdAt: userData.created_at,
        companyName: userData.company_name,
        tenantId: userData.tenant_id,
        isOwner: userData.is_owner || false,
        role: userData.role || (userData.is_owner ? 'admin' : 'viewer'),
      };

      // Save user to localStorage (same key used by the main app)
      localStorage.setItem('hg_current_user', JSON.stringify(user));

      // Redirect to the main app
      window.location.href = '/';
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="relative bg-white/80 backdrop-blur-xl w-full rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center mb-2">
                <Sparkles className="text-emerald-200 mr-2" size={20} />
                <span className="font-bold text-3xl tracking-tight">
                  <span className="text-white">Hello</span>
                  <span className="text-emerald-100">Growth</span>
                </span>
                <Sparkles className="text-emerald-200 ml-2" size={20} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="animate-spin text-emerald-500" size={40} />
                <p className="text-gray-600 font-medium text-center">
                  Autenticando com o Google...
                </p>
                <p className="text-gray-400 text-sm text-center">
                  Aguarde enquanto verificamos sua conta.
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="text-red-600 text-sm bg-red-50 p-4 rounded-xl flex items-start gap-3 border border-red-100 w-full">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full mt-4 text-white font-bold py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all duration-300"
                >
                  Voltar para o Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  );
}
