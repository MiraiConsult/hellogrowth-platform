'use client';

import React, { useState } from 'react';
import { Check, X, Sparkles, Users, Mail } from 'lucide-react';

// Pricing data structure based on the user's table
const PRICING_DATA: Record<number, Record<string, number>> = {
  1: {
    hello_client: 99.90,
    hello_rating: 99.90,
    hello_growth: 149.90,
    hc_game: 129.90,
    hc_mpd: 129.90,
    hc_game_mpd: 149.90,
    hr_game: 129.90,
    hr_mpd: 129.90,
    hr_game_mpd: 149.90,
    hg_game: 189.90,
    hg_mpd: 189.90,
    hg_game_mpd: 199.90,
  },
  2: {
    hello_client: 94.90,
    hello_rating: 94.90,
    hello_growth: 144.90,
    hc_game: 124.90,
    hc_mpd: 124.90,
    hc_game_mpd: 144.90,
    hr_game: 124.90,
    hr_mpd: 124.90,
    hr_game_mpd: 144.90,
    hg_game: 184.90,
    hg_mpd: 184.90,
    hg_game_mpd: 194.90,
  },
  3: {
    hello_client: 89.90,
    hello_rating: 89.90,
    hello_growth: 139.90,
    hc_game: 119.90,
    hc_mpd: 119.90,
    hc_game_mpd: 139.90,
    hr_game: 119.90,
    hr_mpd: 119.90,
    hr_game_mpd: 139.90,
    hg_game: 179.90,
    hg_mpd: 179.90,
    hg_game_mpd: 189.90,
  },
  4: {
    hello_client: 84.90,
    hello_rating: 84.90,
    hello_growth: 134.90,
    hc_game: 114.90,
    hc_mpd: 114.90,
    hc_game_mpd: 134.90,
    hr_game: 114.90,
    hr_mpd: 114.90,
    hr_game_mpd: 134.90,
    hg_game: 174.90,
    hg_mpd: 174.90,
    hg_game_mpd: 184.90,
  },
  5: {
    hello_client: 79.90,
    hello_rating: 79.90,
    hello_growth: 129.90,
    hc_game: 109.90,
    hc_mpd: 109.90,
    hc_game_mpd: 129.90,
    hr_game: 109.90,
    hr_mpd: 109.90,
    hr_game_mpd: 129.90,
    hg_game: 169.90,
    hg_mpd: 169.90,
    hg_game_mpd: 179.90,
  },
  6: {
    hello_client: 74.90,
    hello_rating: 74.90,
    hello_growth: 124.90,
    hc_game: 104.90,
    hc_mpd: 104.90,
    hc_game_mpd: 124.90,
    hr_game: 104.90,
    hr_mpd: 104.90,
    hr_game_mpd: 124.90,
    hg_game: 164.90,
    hg_mpd: 164.90,
    hg_game_mpd: 174.90,
  },
  7: {
    hello_client: 69.90,
    hello_rating: 69.90,
    hello_growth: 119.90,
    hc_game: 99.90,
    hc_mpd: 99.90,
    hc_game_mpd: 119.90,
    hr_game: 99.90,
    hr_mpd: 99.90,
    hr_game_mpd: 119.90,
    hg_game: 159.90,
    hg_mpd: 159.90,
    hg_game_mpd: 169.90,
  },
  8: {
    hello_client: 64.90,
    hello_rating: 64.90,
    hello_growth: 114.90,
    hc_game: 94.90,
    hc_mpd: 94.90,
    hc_game_mpd: 114.90,
    hr_game: 94.90,
    hr_mpd: 94.90,
    hr_game_mpd: 114.90,
    hg_game: 154.90,
    hg_mpd: 154.90,
    hg_game_mpd: 164.90,
  },
  9: {
    hello_client: 59.90,
    hello_rating: 59.90,
    hello_growth: 109.90,
    hc_game: 89.90,
    hc_mpd: 89.90,
    hc_game_mpd: 109.90,
    hr_game: 89.90,
    hr_mpd: 89.90,
    hr_game_mpd: 109.90,
    hg_game: 149.90,
    hg_mpd: 149.90,
    hg_game_mpd: 159.90,
  },
  10: {
    hello_client: 54.90,
    hello_rating: 54.90,
    hello_growth: 104.90,
    hc_game: 84.90,
    hc_mpd: 84.90,
    hc_game_mpd: 104.90,
    hr_game: 84.90,
    hr_mpd: 84.90,
    hr_game_mpd: 104.90,
    hg_game: 144.90,
    hg_mpd: 144.90,
    hg_game_mpd: 154.90,
  },
};

type PlanKey = 'hello_client' | 'hello_rating' | 'hello_growth';

interface PricingClientProps {
  showCanceledMessage: boolean;
}

export default function PricingClient({ showCanceledMessage: initialShowCanceledMessage }: PricingClientProps) {
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

  // Helper function to get price key
  const getPriceKey = (plan: PlanKey): string => {
    const planAddons = selectedPlans[plan];
    
    // Map plan names to their codes
    const planCodeMap: Record<string, string> = {
      'hello_client': 'hc',
      'hello_rating': 'hr',
      'hello_growth': 'hg',
    };
    
    const planCode = planCodeMap[plan];
    
    if (!planCode) {
      console.error('Invalid plan:', plan);
      return plan; // fallback to original plan name
    }
    
    if (planAddons.game && planAddons.mpd) {
      return `${planCode}_game_mpd`;
    } else if (planAddons.game) {
      return `${planCode}_game`;
    } else if (planAddons.mpd) {
      return `${planCode}_mpd`;
    } else {
      return plan;
    }
  };

  // Calculate price for a plan
  const calculatePrice = (plan: PlanKey): number => {
    const priceKey = getPriceKey(plan);
    return PRICING_DATA[userCount][priceKey] || 0;
  };

  // Calculate base price (without add-ons)
  const getBasePrice = (plan: PlanKey): number => {
    return PRICING_DATA[userCount][plan] || 0;
  };

  // Calculate economy
  const calculateEconomy = (plan: PlanKey): number => {
    const currentPrice = calculatePrice(plan);
    const fullPriceKey = getPriceKey(plan);
    const fullPrice = PRICING_DATA[1][fullPriceKey] || 0;
    
    // Economy is based on the difference from 1-user price (with same addons)
    const economy = (fullPrice * userCount) - (currentPrice * userCount);
    return Math.max(0, economy);
  };

  // Calculate economy percentage
  const calculateEconomyPercentage = (plan: PlanKey): number => {
    const currentPrice = calculatePrice(plan);
    const fullPriceKey = getPriceKey(plan);
    const fullPrice = PRICING_DATA[1][fullPriceKey] || 0;
    
    if (fullPrice === 0) return 0;
    return Math.round(((fullPrice - currentPrice) / fullPrice) * 100);
  };

  // Toggle add-on
  const toggleAddon = (plan: PlanKey, addon: 'game' | 'mpd') => {
    setSelectedPlans((prev) => ({
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

  const [showCanceledMessage, setShowCanceledMessage] = useState(initialShowCanceledMessage);

  React.useEffect(() => {
    // Check sessionStorage for canceled flag (set by /pricing/canceled redirect)
    const wasCanceled = sessionStorage.getItem('checkout_canceled');
    if (wasCanceled === 'true') {
      setShowCanceledMessage(true);
      sessionStorage.removeItem('checkout_canceled');
    }
    
    if (initialShowCanceledMessage || wasCanceled === 'true') {
      // Hide message after 5 seconds
      setTimeout(() => setShowCanceledMessage(false), 5000);
    }
  }, [initialShowCanceledMessage]);

  // Plans configuration
  const plans = [
    {
      key: 'hello_client' as PlanKey,
      name: 'Hello Client',
      tag: 'PRÉ-VENDA',
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
      tag: 'MAIS POPULAR',
      description: 'Plano completo com todas as funcionalidades',
      features: [
        'Dashboard Unificado 360°',
        'Correlação Vendas vs NPS',
        'IA com Contexto Completo',
        'Inclui tudo dos outros planos',
      ],
      canAddGame: true,
      canAddMPD: true,
      isRecommended: true,
    },
    {
      key: 'hello_rating' as PlanKey,
      name: 'Hello Rating',
      tag: 'PÓS-VENDA',
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
        {/* Canceled Message */}
        {showCanceledMessage && (
          <div className="max-w-2xl mx-auto mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <X className="text-yellow-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-yellow-800 font-medium">Pagamento cancelado</p>
              <p className="text-yellow-700 text-sm">Você pode escolher um plano quando estiver pronto.</p>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-4">
            <Sparkles className="text-emerald-500 mr-2" size={32} />
            <h1 className="text-5xl font-bold">
              <span className="text-gray-900">Hello</span>
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Growth</span>
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Escolha o plano perfeito para impulsionar suas vendas e satisfação dos clientes
          </p>
        </div>

        {/* User Count Selector */}
        <div className="max-w-md mx-auto mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="text-emerald-500" size={24} />
                <label className="text-lg font-semibold text-gray-900">
                  Número de usuários
                </label>
              </div>
              <span className="text-3xl font-bold text-emerald-600">{userCount}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={userCount}
              onChange={(e) => setUserCount(parseInt(e.target.value))}
              className="w-full h-3 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${((userCount - 1) / 9) * 100}%, rgb(209 250 229) ${((userCount - 1) / 9) * 100}%, rgb(209 250 229) 100%)`
              }}
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>1</span>
              <span>10</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const price = calculatePrice(plan.key);
            const economy = calculateEconomy(plan.key);
            const economyPercentage = calculateEconomyPercentage(plan.key);
            const isRecommended = plan.isRecommended;

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 hover:scale-105 ${
                  isRecommended ? 'ring-4 ring-emerald-500 ring-offset-4' : ''
                }`}
              >
                {/* Tag */}
                <div className={`text-center py-2 font-bold text-sm ${
                  isRecommended 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {plan.tag}
                </div>

                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        R$ {price.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-gray-600">/mês</span>
                    </div>
                    {userCount > 1 && (
                      <p className="text-gray-500 text-xs mt-1">
                        R$ {(price * userCount).toFixed(2).replace('.', ',')} total para {userCount} usuários
                      </p>
                    )}
                    {userCount > 1 && economy > 0 && (
                      <p className="text-emerald-600 font-medium text-sm mt-2">
                        Economia de R$ {economy.toFixed(2).replace('.', ',')} ({economyPercentage}%)
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Add-ons */}
                  {(plan.canAddGame || plan.canAddMPD) && (
                    <div className="mb-6 space-y-3">
                      <p className="text-sm font-semibold text-gray-700">Adicionais:</p>
                      
                      {plan.canAddGame && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Game</span>
                            <button
                              onClick={() => toggleAddon(plan.key, 'game')}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                selectedPlans[plan.key].game ? 'bg-emerald-500' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  selectedPlans[plan.key].game ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Adicione premiações ao fim das pesquisas NPS para incentivar mais avaliações e aumentar o engajamento dos seus clientes.
                          </p>
                        </div>
                      )}

                      {plan.canAddMPD && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Minha Presença Digital</span>
                            <button
                              onClick={() => toggleAddon(plan.key, 'mpd')}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                selectedPlans[plan.key].mpd ? 'bg-emerald-500' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  selectedPlans[plan.key].mpd ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Analise seu posicionamento no Google com IA. Receba um levantamento completo de pontos fortes, fracos, melhorias e comentários para otimizar sua reputação online.
                          </p>
                        </div>
                      )}
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
      </div>
    </div>
  );
}
