'use client';

import React from 'react';
import { Lock, Clock, CreditCard, ArrowRight, LogOut, Gift } from 'lucide-react';
import { User } from '@/types';

interface TrialExpiredScreenProps {
  currentUser: User;
  onLogout: () => void;
}

const TrialExpiredScreen: React.FC<TrialExpiredScreenProps> = ({ currentUser, onLogout }) => {
  const handleActivateSubscription = () => {
    // Redirecionar para a página de preços para ativar assinatura
    // O cupom JLRn112F (30% off) pode ser usado no checkout
    window.location.href = '/pricing';
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
              Seu acesso gratuito expirou
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Trial info */}
            <div className="bg-slate-50 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock size={20} className="text-slate-500" />
                <span className="font-semibold text-slate-700">Detalhes do Trial</span>
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

            {/* Coupon info */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Gift size={18} className="text-amber-600" />
                <span className="font-semibold text-amber-800">Oferta especial para você!</span>
              </div>
              <p className="text-amber-700 text-sm mb-3">
                Como agradecimento pelo seu período de trial, use o cupom abaixo para obter <strong>30% de desconto</strong> no primeiro mês:
              </p>
              <div className="bg-white border-2 border-amber-300 rounded-xl p-3 text-center">
                <span className="text-2xl font-mono font-bold text-amber-700 tracking-widest">JLRn112F</span>
              </div>
              <p className="text-amber-600 text-xs mt-2 text-center">
                Aplique este cupom no checkout para 30% de desconto
              </p>
            </div>

            {/* Data preservation notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <p className="text-emerald-800 text-sm">
                <strong>Seus dados estão seguros.</strong> Todas as suas informações foram preservadas e estarão disponíveis assim que você ativar sua assinatura.
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleActivateSubscription}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mb-3"
            >
              <CreditCard size={22} />
              Ativar Assinatura
              <ArrowRight size={20} />
            </button>

            <button
              onClick={onLogout}
              className="w-full py-3 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
