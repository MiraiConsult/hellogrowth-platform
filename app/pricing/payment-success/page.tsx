'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('success');
      setMessage('Pagamento realizado com sucesso! Sua assinatura foi ativada.');
      return;
    }

    // Verificar status do pagamento
    const checkPayment = async () => {
      try {
        const response = await fetch('/api/stripe/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const data = await response.json();
        if (data.success) {
          setStatus('success');
          setMessage('Pagamento confirmado! Sua assinatura foi ativada com sucesso.');
        } else {
          setStatus('success');
          setMessage('Pagamento recebido! Sua assinatura será ativada em breve.');
        }
      } catch {
        setStatus('success');
        setMessage('Pagamento recebido! Sua assinatura será ativada em breve.');
      }
    };

    checkPayment();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' ? (
          <>
            <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={48} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirmando pagamento...</h1>
            <p className="text-gray-500">Aguarde enquanto verificamos seu pagamento.</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-emerald-600" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Assinatura Ativada!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-emerald-800 mb-2">Próximos passos:</h3>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>✓ Acesse a plataforma com seu e-mail e senha</li>
                <li>✓ Sua senha padrão é: <strong>12345</strong></li>
                <li>✓ Recomendamos alterar sua senha nas configurações</li>
              </ul>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              Acessar a Plataforma <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
