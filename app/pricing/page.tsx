'use client';

import React, { useState } from 'react';
import { Check, X, Sparkles, Users, Mail } from 'lucide-react';

// Pricing data structure based on the user's table
const PRICING_DATA: Record<number, Record<string, number>> = {
  1: {
    hello_client: 99.90,
    hello_rating: 99.90,
    hello_growth: 149.90,
    hc_mpd: 129.90,
    hr_game: 129.90,
    hr_mpd: 129.90,
    hr_game_mpd: 149.90,
    hg_game: 199.90,
    hg_mpd: 199.90,
    hg_game_mpd: 199.90,
  },
  2: {
    hello_client: 94.90,
    hello_rating: 94.90,
    hello_growth: 144.90,
    hc_mpd: 124.90,
    hr_game: 124.90,
    hr_mpd: 124.90,
    hr_game_mpd: 144.90,
    hg_game: 194.90,
    hg_mpd: 194.90,
    hg_game_mpd: 194.90,
  },
  3: {
    hello_client: 89.90,
    hello_rating: 89.90,
    hello_growth: 139.90,
    hc_mpd: 119.90,
    hr_game: 119.90,
    hr_mpd: 119.90,
    hr_game_mpd: 139.90,
    hg_game: 189.90,
    hg_mpd: 189.90,
    hg_game_mpd: 189.90,
  },
  4: {
    hello_client: 84.90,
    hello_rating: 84.90,
    hello_growth: 134.90,
    hc_mpd: 114.90,
    hr_game: 114.90,
    hr_mpd: 114.90,
    hr_game_mpd: 134.90,
    hg_game: 184.90,
    hg_mpd: 184.90,
    hg_game_mpd: 184.90,
  },
  5: {
    hello_client: 79.90,
    hello_rating: 79.90,
    hello_growth: 129.90,
    hc_mpd: 109.90,
    hr_game: 109.90,
    hr_mpd: 109.90,
    hr_game_mpd: 129.90,
    hg_game: 179.90,
    hg_mpd: 179.90,
    hg_game_mpd: 179.90,
  },
  6: {
    hello_client: 74.90,
    hello_rating: 74.90,
    hello_growth: 124.90,
    hc_mpd: 104.90,
    hr_game: 104.90,
    hr_mpd: 104.90,
    hr_game_mpd: 124.90,
    hg_game: 174.90,
    hg_mpd: 174.90,
    hg_game_mpd: 174.90,
  },
  7: {
    hello_client: 69.90,
    hello_rating: 69.90,
    hello_growth: 119.90,
    hc_mpd: 99.90,
    hr_game: 99.90,
    hr_mpd: 99.90,
    hr_game_mpd: 119.90,
    hg_game: 169.90,
    hg_mpd: 169.90,
    hg_game_mpd: 169.90,
  },
  8: {
    hello_client: 64.90,
    hello_rating: 64.90,
    hello_growth: 114.90,
    hc_mpd: 94.90,
    hr_game: 94.90,
    hr_mpd: 94.90,
    hr_game_mpd: 114.90,
    hg_game: 164.90,
    hg_mpd: 164.90,
    hg_game_mpd: 164.90,
  },
  9: {
    hello_client: 59.90,
    hello_rating: 59.90,
    hello_growth: 109.90,
    hc_mpd: 89.90,
    hr_game: 89.90,
    hr_mpd: 89.90,
    hr_game_mpd: 109.90,
    hg_game: 159.90,
    hg_mpd: 159.90,
    hg_game_mpd: 159.90,
  },
  10: {
    hello_client: 54.90,
    hello_rating: 54.90,
    hello_growth: 104.90,
    hc_mpd: 84.90,
    hr_game: 84.90,
    hr_mpd: 84.90,
    hr_game_mpd: 104.90,
    hg_game: 154.90,
    hg_mpd: 154.90,
    hg_game_mpd: 154.90,
  },
};

type PlanKey = 'hello_client' | 'hello_rating' | 'hello_growth';

export default function PricingPage() {
  const [userCount, setUserCount] = useState<number>(1);
  const [selectedPlans, setSelectedPlans] = useState<{
    hello_client: { game: boolean; mpd: boolean };
    hello_rating: { game: boolean; mpd: boolean };
    hello_growth: { game: boolean; mpd: boolean };
  }>({
    hello_client: { game: false, mpd: false },
    hello_rating: { game: false, mpd: false },
    hello_growth: { game: false, mpd: false },
  });

  // Calculate price for each plan
  const calculatePrice = (plan: PlanKey): number => {
    if (userCount > 10) return 0; // Contact for 10+

    const pricing = PRICING_DATA[userCount];
    const addons = selectedPlans[plan];

    // Build the key for the pricing lookup
    let key = plan;
    const planCode = plan.substring(0, 2); // 'he' -> need to fix this
    
    // Fix: extract correct plan code
    const planCodeMap: Record<PlanKey, string> = {
      hello_client: 'hc',
      hello_rating: 'hr',
      hello_growth: 'hg',
    };
    
    const code = planCodeMap[plan];
    
    if (addons.game && addons.mpd) {
      key = `${code}_game_mpd`;
    } else if (addons.game) {
      key = `${code}_game`;
    } else if (addons.mpd) {
      key = `${code}_mpd`;
    }

    return pricing[key] || pricing[plan];
  };

  const handleAddonToggle = (plan: PlanKey, addon: 'game' | 'mpd') => {
    setSelectedPlans(prev => ({
      ...prev,
      [plan]: {
        ...prev[plan],
        [addon]: !prev[plan][addon],
      },
    }));
  };

  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: PlanKey) => {
    if (userCount > 10) {
      // Open email client
      window.location.href = `mailto:contato@miraiconsult.com?subject=Solicita%C3%A7%C3%A3o%20de%20Or%C3%A7amento%20-%20${plan}%20(10%2B%20usu%C3%A1rios)&body=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento%20para%20o%20plano%20${plan}%20com%20mais%20de%2010%20usu%C3%A1rios.`;
      return;
    }

    try {
      setIsLoading(plan);

      // Call API to create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan,
          userCount,
          addons: selectedPlans[plan],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Erro ao criar sessão de checkout. Por favor, tente novamente.');
      setIsLoading(null);
    }
  };

  const plans = [
    {
      key: 'hello_client' as PlanKey,
      name: 'Hello Client',
      category: 'PRÉ-VENDA',
      description: 'Ferramentas essenciais para gestão de leads e oportunidades',
      features: [
        'Construtor de Formulários',
        'Cálculo de Oportunidade',
        'Quadro Kanban',
        'Script de Vendas IA',
      ],
      canAddGame: false,
      canAddMPD: true,
    },
    {
      key: 'hello_growth' as PlanKey,
      name: 'Hello Growth',
      category: 'MAIS POPULAR',
      description: 'Plano completo com todas as funcionalidades',
      features: [
        'Dashboard Unificado 360°',
        'Correlação Vendas vs NPS',
        'IA com Contexto Completo',
        'Inclui tudo dos outros planos',
      ],
      recommended: true,
      canAddGame: true,
      canAddMPD: true,
    },
    {
      key: 'hello_rating' as PlanKey,
      name: 'Hello Rating',
      category: 'PÓS-VENDA',
      description: 'Análise de satisfação e relacionamento com clientes',
      features: [
        'Campanhas NPS ilimitadas',
        'Redirecionamento Google Reviews',
        'Análise de Sentimento IA',
        'Relatórios de Satisfação',
      ],
      canAddGame: true,
      canAddMPD: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-4">
            <Sparkles className="text-emerald-500 mr-2" size={32} />
            <h1 className="text-5xl font-bold">
              <span className="text-gray-900">Hello</span>
              <span className="text-emerald-600">Growth</span>
            </h1>
            <Sparkles className="text-emerald-500 ml-2" size={32} />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Escolha o plano ideal para transformar sua gestão comercial
          </p>
        </div>

        {/* User Count Selector */}
        <div className="max-w-md mx-auto mb-12 bg-white rounded-2xl shadow-lg p-6">
          <label className="flex items-center justify-center gap-3 text-lg font-semibold text-gray-700 mb-4">
            <Users size={24} className="text-emerald-600" />
            Número de usuários
          </label>
          <select
            value={userCount}
            onChange={(e) => setUserCount(Number(e.target.value))}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all duration-300 text-lg font-medium text-gray-900 cursor-pointer"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <option key={num} value={num}>
                {num} {num === 1 ? 'usuário' : 'usuários'}
              </option>
            ))}
            <option value={11}>10+ usuários (Entre em contato)</option>
          </select>
          {userCount > 10 && (
            <p className="mt-3 text-sm text-gray-500 text-center">
              Para mais de 10 usuários, entre em contato conosco para um orçamento personalizado
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            const price = calculatePrice(plan.key);
            const isRecommended = plan.recommended;
            const addons = selectedPlans[plan.key];

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                  isRecommended ? 'ring-4 ring-emerald-500' : ''
                }`}
              >
                {/* Recommended Badge */}
                {isRecommended && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      {plan.category}
                    </div>
                  </div>
                )}

                {/* Category Badge (for non-recommended) */}
                {!isRecommended && (
                  <div className="bg-gray-100 px-4 py-2 text-center">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {plan.category}
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {plan.description}
                  </p>

                  {/* Price */}
                  {userCount <= 10 ? (
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-gray-900">
                          R$ {price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-gray-600">/mês</span>
                      </div>
                      {userCount > 1 && (
                        <p className="text-sm text-emerald-600 font-medium mt-2">
                          Economia de R$ {((PRICING_DATA[1][plan.key] - price) * userCount).toFixed(2).replace('.', ',')} ({Math.round(((PRICING_DATA[1][plan.key] - price) / PRICING_DATA[1][plan.key]) * 100)}%)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mb-6">
                      <p className="text-2xl font-bold text-gray-900">
                        Entre em contato
                      </p>
                    </div>
                  )}

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Add-ons */}
                  {userCount <= 10 && (
                    <div className="space-y-3 mb-6 pt-6 border-t border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Adicionais:
                      </p>

                      {/* Game Add-on */}
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                          plan.canAddGame
                            ? addons.game
                              ? 'border-emerald-500 bg-emerald-50 cursor-pointer'
                              : 'border-gray-200 hover:border-emerald-300 cursor-pointer'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={addons.game}
                          onChange={() => handleAddonToggle(plan.key, 'game')}
                          disabled={!plan.canAddGame}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 disabled:cursor-not-allowed"
                        />
                        <span className="flex-1 text-sm font-medium text-gray-900">
                          Game
                        </span>
                        {!plan.canAddGame && (
                          <X size={16} className="text-gray-400" />
                        )}
                      </label>

                      {/* MPD Add-on */}
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                          plan.canAddMPD
                            ? addons.mpd
                              ? 'border-emerald-500 bg-emerald-50 cursor-pointer'
                              : 'border-gray-200 hover:border-emerald-300 cursor-pointer'
                            : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={addons.mpd}
                          onChange={() => handleAddonToggle(plan.key, 'mpd')}
                          disabled={!plan.canAddMPD}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 disabled:cursor-not-allowed"
                        />
                        <span className="flex-1 text-sm font-medium text-gray-900">
                          MPD
                        </span>
                        {!plan.canAddMPD && (
                          <X size={16} className="text-gray-400" />
                        )}
                      </label>
                    </div>
                  )}

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={isLoading === plan.key}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isRecommended
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-105'
                        : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg hover:shadow-xl hover:scale-105'
                    }`}
                  >
                    {userCount > 10 ? (
                      <span className="flex items-center justify-center gap-2">
                        <Mail size={20} />
                        Entrar em contato
                      </span>
                    ) : isLoading === plan.key ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processando...
                      </span>
                    ) : (
                      'Assinar agora'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600">
          <p className="text-sm">
            Todos os planos incluem suporte técnico e atualizações gratuitas
          </p>
          <p className="text-xs mt-2">
            Dúvidas? Entre em contato:{' '}
            <a
              href="mailto:contato@miraiconsult.com"
              className="text-emerald-600 hover:underline font-medium"
            >
              contato@miraiconsult.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
