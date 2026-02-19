'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('Sessão inválida. Por favor, tente novamente.');
      return;
    }

    // Verify the session with the backend
    const verifySession = async () => {
      try {
        const response = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Failed to verify session');
        }

        const data = await response.json();

        if (data.status === 'complete') {
          setStatus('success');
          setMessage('Pagamento confirmado! Sua assinatura está ativa.');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/');
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Pagamento pendente. Aguarde a confirmação.');
        }
      } catch (error) {
        console.error('Error verifying session:', error);
        setStatus('error');
        setMessage('Erro ao verificar o pagamento. Entre em contato conosco.');
      }
    };

    verifySession();
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-emerald-500 mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Verificando pagamento...
            </h1>
            <p className="text-gray-600">
              Aguarde enquanto confirmamos sua assinatura.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Pagamento confirmado!
            </h1>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <p className="text-sm text-gray-500">
              Você será redirecionado para o login em instantes...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Ops! Algo deu errado
            </h1>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
            >
              Voltar para planos
            </button>
            <p className="text-sm text-gray-500 mt-4">
              Precisa de ajuda?{' '}
              <a
                href="mailto:contato@miraiconsult.com"
                className="text-emerald-600 hover:underline font-medium"
              >
                Entre em contato
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center px-4">
        <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
