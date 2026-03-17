'use client';

import React, { useState } from 'react';
import { Lock, Clock, CreditCard, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import { User } from '@/types';

interface TrialExpiredScreenProps {
  currentUser: User;
  onLogout: () => void;
}

const TrialExpiredScreen: React.FC<TrialExpiredScreenProps> = ({ currentUser, onLogout }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivateSubscription = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Criar checkout Stripe com o cupom TRIAL30B (100% off, 1ª cobrança)
      // aplicado automaticamente para clientes do Modelo B
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: currentUser.plan || 'hello_growth',
          userCount: 1,
          addons: { game: false, mpd: false },
          trial_model: 'model_b_convert', // flag especial para aplicar TRIAL30B
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao criar sessão de pagamento');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar pagamento. Tente novamente.');
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative max-w-lg w-full">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={40} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Período de Trial Encerrado
            </h1>
            <p className="text-red-100 text-sm">
              Seus 30 dias gratuitos chegaram ao fim
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Trial info */}
            <div className="bg-slate-50 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock size={20} className="text-slate-500" />
                <span className="font-semibold text-slate-700">Informações da conta</span>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Conta:</span>
                  <span className="font-medium">{currentUser.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Empresa:</span>
                  <span className="font-medium">{currentUser.companyName}</span>
                </div>
                {currentUser.trialEndAt && (
                  <div className="flex justify-between">
                    <span>Trial expirou em:</span>
                    <span className="font-medium text-red-600">{formatDate(currentUser.trialEndAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Message */}
            <div className="text-center mb-6">
              <p className="text-slate-600 text-base leading-relaxed">
                Para continuar usando o HelloGrowth, assine o plano que você escolheu durante o cadastro.
              </p>
            </div>

            {/* Data preservation notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <p className="text-emerald-800 text-sm">
                <strong>Seus dados estão seguros.</strong> Todas as suas informações foram preservadas e estarão disponíveis assim que você ativar sua assinatura.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* CTA Button */}
            <button
              onClick={handleActivateSubscription}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mb-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  Aguarde...
                </>
              ) : (
                <>
                  <CreditCard size={22} />
                  Assinar agora
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <button
              onClick={onLogout}
              disabled={isLoading}
              className="w-full py-3 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogOut size={16} />
              Sair da conta
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-slate-400 text-sm">
          HelloGrowth • Seus dados estão seguros e protegidos
        </p>
      </div>
    </div>
  );
};

export default TrialExpiredScreen;
