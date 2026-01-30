import React from 'react';
import { Check, Star, Users, Zap, Lock } from 'lucide-react';
import { PlanType } from '@/types';

interface PricingProps {
  currentPlan: PlanType;
  onSelectPlan: (plan: PlanType) => void;
}

const Pricing: React.FC<PricingProps> = ({ currentPlan, onSelectPlan }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
      <div className="text-center mb-12 max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Seu Plano Atual</h1>
        <p className="text-gray-600 text-lg">
          Mudanças de plano são gerenciadas exclusivamente pela equipe administrativa. Entre em contato para solicitar alterações.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        
        {/* HelloClient */}
        <div className={`relative bg-white rounded-2xl p-8 border-2 transition-all duration-300 ${currentPlan === 'client' ? 'border-primary-500 shadow-xl scale-105 z-10' : 'border-transparent shadow-md opacity-75 grayscale-[0.5]'}`}>
          <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
            PRÉ-VENDA
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">HelloClient</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-3xl font-bold text-gray-900">R$ 99,90</span>
            <span className="text-gray-500">/mês</span>
          </div>
          
          <button 
            disabled
            className={`w-full py-3 rounded-lg font-semibold transition-colors mb-8 flex items-center justify-center gap-2 cursor-not-allowed ${currentPlan === 'client' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}
          >
            {currentPlan === 'client' ? <><Check size={18}/> Plano Ativo</> : <><Lock size={16}/> Indisponível</>}
          </button>

          <ul className="space-y-4">
            <li className="flex gap-3 text-sm text-gray-600">
              <Check size={18} className="text-green-500 flex-shrink-0" />
              <span>Construtor de Formulários</span>
            </li>
            <li className="flex gap-3 text-sm text-gray-600">
              <Check size={18} className="text-green-500 flex-shrink-0" />
              <span>Cálculo de Oportunidade</span>
            </li>
            <li className="flex gap-3 text-sm text-gray-600">
              <Check size={18} className="text-green-500 flex-shrink-0" />
              <span>Quadro Kanban</span>
            </li>
             <li className="flex gap-3 text-sm text-gray-600">
              <Check size={18} className="text-green-500 flex-shrink-0" />
              <span>Script de Vendas IA</span>
            </li>
          </ul>
        </div>

        {/* HelloGrowth (Center) */}
        <div className={`relative bg-white rounded-2xl p-8 border-2 transition-all duration-300 ${currentPlan === 'growth' || currentPlan === 'growth_lifetime' ? 'border-primary-500 shadow-xl scale-105 z-10' : 'border-transparent shadow-md opacity-75 grayscale-[0.5]'}`}>
           <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-500 to-emerald-600 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Zap size={14} fill="currentColor" /> MAIS POPULAR
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">HelloGrowth</h3>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-bold text-gray-900">R$ 149,90</span>
            <span className="text-gray-500">/mês</span>
          </div>
          <p className="text-green-600 text-sm font-semibold mb-6">Economia de R$ 49,90 (25%)</p>
          
          <button 
             disabled
             className={`w-full py-3 rounded-lg font-semibold transition-colors mb-8 flex items-center justify-center gap-2 cursor-not-allowed ${currentPlan === 'growth' || currentPlan === 'growth_lifetime' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}
          >
            {currentPlan === 'growth' || currentPlan === 'growth_lifetime' ? <><Check size={18}/> Plano Ativo</> : <><Lock size={16}/> Indisponível</>}
          </button>

          <div className="space-y-4">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">INCLUI TUDO DOS OUTROS PLANOS +</p>
             <ul className="space-y-4">
              <li className="flex gap-3 text-sm text-gray-600">
                <Check size={18} className="text-primary-500 flex-shrink-0" />
                <span className="font-medium text-gray-900">Dashboard Unificado 360°</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-600">
                <Check size={18} className="text-primary-500 flex-shrink-0" />
                <span className="font-medium text-gray-900">Correlação Vendas vs NPS</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-600">
                <Check size={18} className="text-primary-500 flex-shrink-0" />
                <span className="font-medium text-gray-900">IA com Contexto Completo</span>
              </li>
            </ul>
          </div>
        </div>

        {/* HelloRating */}
        <div className={`relative bg-white rounded-2xl p-8 border-2 transition-all duration-300 ${currentPlan === 'rating' ? 'border-primary-500 shadow-xl scale-105 z-10' : 'border-transparent shadow-md opacity-75 grayscale-[0.5]'}`}>
          <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
            PÓS-VENDA
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">HelloRating</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-3xl font-bold text-gray-900">R$ 99,90</span>
            <span className="text-gray-500">/mês</span>
          </div>
          
          <button 
             disabled
             className={`w-full py-3 rounded-lg font-semibold transition-colors mb-8 flex items-center justify-center gap-2 cursor-not-allowed ${currentPlan === 'rating' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}
          >
            {currentPlan === 'rating' ? <><Check size={18}/> Plano Ativo</> : <><Lock size={16}/> Indisponível</>}
          </button>

          <ul className="space-y-4">
            <li className="flex gap-3 text-sm text-gray-600">
              <Check size={18} className="text-green-500 flex-shrink-0" />
              <span>Campanhas NPS Ilimitadas</span>
            </li>
            <li className="flex gap-3 text-sm text-gray-600">
              <Check size={18} className="text-green-500 flex-shrink-0" />
              <span>Redirecionamento Google Reviews</span>
            </li>
            <li className="flex gap-3 text-sm text-gray-600">
              <Check size={18} className="text-green-500 flex-shrink-0" />
              <span>Análise de Sentimento IA</span>
            </li>
             <li className="flex gap-3 text-sm text-gray-600">
              <Check size={18} className="text-green-500 flex-shrink-0" />
              <span>Relatórios de Satisfação</span>
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default Pricing;