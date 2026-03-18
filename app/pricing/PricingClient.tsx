'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, X, Sparkles, Users, Mail, ArrowLeft, RefreshCw, Crown, Gift, Clock } from 'lucide-react';

// Pricing data structure based on the user's table
const PRICING_DATA: Record<number, Record<string, number>> = {
  1: { hello_client: 99.90, hello_rating: 99.90, hello_growth: 149.90, hc_game: 129.90, hc_mpd: 129.90, hc_game_mpd: 149.90, hr_game: 129.90, hr_mpd: 129.90, hr_game_mpd: 149.90, hg_game: 189.90, hg_mpd: 189.90, hg_game_mpd: 199.90 },
  2: { hello_client: 94.90, hello_rating: 94.90, hello_growth: 144.90, hc_game: 124.90, hc_mpd: 124.90, hc_game_mpd: 144.90, hr_game: 124.90, hr_mpd: 124.90, hr_game_mpd: 144.90, hg_game: 184.90, hg_mpd: 184.90, hg_game_mpd: 194.90 },
  3: { hello_client: 89.90, hello_rating: 89.90, hello_growth: 139.90, hc_game: 119.90, hc_mpd: 119.90, hc_game_mpd: 139.90, hr_game: 119.90, hr_mpd: 119.90, hr_game_mpd: 139.90, hg_game: 179.90, hg_mpd: 179.90, hg_game_mpd: 189.90 },
  4: { hello_client: 84.90, hello_rating: 84.90, hello_growth: 134.90, hc_game: 114.90, hc_mpd: 114.90, hc_game_mpd: 134.90, hr_game: 114.90, hr_mpd: 114.90, hr_game_mpd: 134.90, hg_game: 174.90, hg_mpd: 174.90, hg_game_mpd: 184.90 },
  5: { hello_client: 79.90, hello_rating: 79.90, hello_growth: 129.90, hc_game: 109.90, hc_mpd: 109.90, hc_game_mpd: 129.90, hr_game: 109.90, hr_mpd: 109.90, hr_game_mpd: 129.90, hg_game: 169.90, hg_mpd: 169.90, hg_game_mpd: 179.90 },
  6: { hello_client: 74.90, hello_rating: 74.90, hello_growth: 124.90, hc_game: 104.90, hc_mpd: 104.90, hc_game_mpd: 124.90, hr_game: 104.90, hr_mpd: 104.90, hr_game_mpd: 124.90, hg_game: 164.90, hg_mpd: 164.90, hg_game_mpd: 174.90 },
  7: { hello_client: 69.90, hello_rating: 69.90, hello_growth: 119.90, hc_game: 99.90, hc_mpd: 99.90, hc_game_mpd: 119.90, hr_game: 99.90, hr_mpd: 99.90, hr_game_mpd: 119.90, hg_game: 159.90, hg_mpd: 159.90, hg_game_mpd: 169.90 },
  8: { hello_client: 64.90, hello_rating: 64.90, hello_growth: 114.90, hc_game: 94.90, hc_mpd: 94.90, hc_game_mpd: 114.90, hr_game: 94.90, hr_mpd: 94.90, hr_game_mpd: 114.90, hg_game: 154.90, hg_mpd: 154.90, hg_game_mpd: 164.90 },
  9: { hello_client: 59.90, hello_rating: 59.90, hello_growth: 109.90, hc_game: 89.90, hc_mpd: 89.90, hc_game_mpd: 109.90, hr_game: 89.90, hr_mpd: 89.90, hr_game_mpd: 109.90, hg_game: 149.90, hg_mpd: 149.90, hg_game_mpd: 159.90 },
  10: { hello_client: 54.90, hello_rating: 54.90, hello_growth: 104.90, hc_game: 84.90, hc_mpd: 84.90, hc_game_mpd: 104.90, hr_game: 84.90, hr_mpd: 84.90, hr_game_mpd: 104.90, hg_game: 144.90, hg_mpd: 144.90, hg_game_mpd: 154.90 },
};

type PlanKey = 'hello_client' | 'hello_rating' | 'hello_growth';

interface PricingClientProps {
  showCanceledMessage: boolean;
}

interface CurrentSubscription {
  plan: string;
  planName: string;
  hasGame: boolean;
  hasMpd: boolean;
  userCount: number;
  status: string;
  nextBillingDate?: string;
  amount?: number;
}

export default function PricingClient({ showCanceledMessage: initialShowCanceledMessage }: PricingClientProps) {
  const searchParams = useSearchParams();
  // trial_model pode ser passado via URL: ?trial_model=model_a ou ?trial_model=model_b
  const urlTrialModel = searchParams?.get('trial_model') as 'model_a' | 'model_b' | null;
  const [trialModel, setTrialModel] = useState<'none' | 'model_a' | 'model_b'>(urlTrialModel || 'none');
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

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [isManageMode, setIsManageMode] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showCanceledMessage, setShowCanceledMessage] = useState(initialShowCanceledMessage);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ plan: PlanKey; planName: string; price: number } | null>(null);

  // Helper function to get price key
  const getPriceKey = (plan: PlanKey): string => {
    const planAddons = selectedPlans[plan];
    const planCodeMap: Record<string, string> = { 'hello_client': 'hc', 'hello_rating': 'hr', 'hello_growth': 'hg' };
    const planCode = planCodeMap[plan];
    if (!planCode) return plan;
    if (planAddons.game && planAddons.mpd) return `${planCode}_game_mpd`;
    if (planAddons.game) return `${planCode}_game`;
    if (planAddons.mpd) return `${planCode}_mpd`;
    return plan;
  };

  const calculatePrice = (plan: PlanKey): number => {
    const priceKey = getPriceKey(plan);
    return PRICING_DATA[userCount]?.[priceKey] || 0;
  };

  const getBasePrice = (plan: PlanKey): number => PRICING_DATA[userCount]?.[plan] || 0;

  const calculateEconomy = (plan: PlanKey): number => {
    const currentPrice = calculatePrice(plan);
    const fullPriceKey = getPriceKey(plan);
    const fullPrice = PRICING_DATA[1]?.[fullPriceKey] || 0;
    return Math.max(0, (fullPrice * userCount) - (currentPrice * userCount));
  };

  const calculateEconomyPercentage = (plan: PlanKey): number => {
    const currentPrice = calculatePrice(plan);
    const fullPriceKey = getPriceKey(plan);
    const fullPrice = PRICING_DATA[1]?.[fullPriceKey] || 0;
    if (fullPrice === 0) return 0;
    return Math.round(((fullPrice - currentPrice) / fullPrice) * 100);
  };

  const toggleAddon = (plan: PlanKey, addon: 'game' | 'mpd') => {
    setSelectedPlans((prev) => ({ ...prev, [plan]: { ...prev[plan], [addon]: !prev[plan][addon] } }));
  };

  // Detect if user is logged in and has active subscription
  useEffect(() => {
    const checkUserAndSubscription = async () => {
      try {
        // Try to get user from localStorage (same pattern as the main app)
        const savedUser = localStorage.getItem('currentUser') || localStorage.getItem('hg_current_user');
        if (!savedUser) return;

        const user = JSON.parse(savedUser);
        setCurrentUser(user);

        // Fetch subscription info
        const response = await fetch('/api/stripe/subscription-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.hasSubscription && data.subscription) {
            const sub = data.subscription;
            setCurrentSubscription({
              plan: sub.plan || 'growth',
              planName: sub.planName || 'Hello Growth',
              hasGame: sub.hasGame || false,
              hasMpd: sub.hasMpd || false,
              userCount: sub.userCount || 1,
              status: sub.status || 'active',
              nextBillingDate: sub.nextBillingDate,
              amount: sub.amount,
            });
            setIsManageMode(true);

            // Pre-select current plan's addons
            const planKey = sub.plan === 'client' ? 'hello_client' : sub.plan === 'rating' ? 'hello_rating' : 'hello_growth';
            setSelectedPlans(prev => ({
              ...prev,
              [planKey]: { game: sub.hasGame || false, mpd: sub.hasMpd || false },
            }));
            setUserCount(sub.userCount || 1);
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    checkUserAndSubscription();
  }, []);

  useEffect(() => {
    const wasCanceled = sessionStorage.getItem('checkout_canceled');
    if (wasCanceled === 'true') {
      setShowCanceledMessage(true);
      sessionStorage.removeItem('checkout_canceled');
    }
    if (initialShowCanceledMessage || wasCanceled === 'true') {
      setTimeout(() => setShowCanceledMessage(false), 5000);
    }
  }, [initialShowCanceledMessage]);

  const getPlanDisplayName = (plan: PlanKey): string => {
    const addons = selectedPlans[plan];
    const baseNames: Record<string, string> = { hello_client: 'Hello Client', hello_rating: 'Hello Rating', hello_growth: 'Hello Growth' };
    let name = baseNames[plan];
    const addonNames: string[] = [];
    if (addons.game) addonNames.push('Game');
    if (addons.mpd) addonNames.push('MPD');
    if (addonNames.length > 0) name += ' + ' + addonNames.join(' + ');
    return name;
  };

  const isCurrentPlan = (plan: PlanKey): boolean => {
    if (!currentSubscription) return false;
    const planMap: Record<string, string> = { 'hello_client': 'client', 'hello_rating': 'rating', 'hello_growth': 'growth' };
    const addons = selectedPlans[plan];
    return (
      currentSubscription.plan === planMap[plan] &&
      currentSubscription.hasGame === addons.game &&
      currentSubscription.hasMpd === addons.mpd &&
      currentSubscription.userCount === userCount
    );
  };

  const handleSubscribeOrUpdate = async (plan: PlanKey) => {
    if (userCount > 10) {
      window.location.href = `mailto:contato@miraiconsult.com?subject=Solicita%C3%A7%C3%A3o%20de%20Or%C3%A7amento%20-%20${plan}%20(10%2B%20usu%C3%A1rios)`;
      return;
    }

    // If manage mode, show confirmation dialog
    if (isManageMode && currentUser) {
      const price = calculatePrice(plan) * userCount;
      const planName = getPlanDisplayName(plan);
      setConfirmDialog({ plan, planName, price });
      return;
    }

    // Modelo B: redirecionar para formulário interno (sem Stripe, sem cartão)
    if (trialModel === 'model_b') {
      const trialEndAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const addons = selectedPlans[plan];
      const params = new URLSearchParams({
        plan,
        user_count: userCount.toString(),
        addons: JSON.stringify(addons),
        trial_end_at: trialEndAt,
      });
      window.location.href = `/pricing/trial-setup?${params.toString()}`;
      return;
    }

    // New subscription flow (Modelo A ou normal)
    try {
      setIsLoading(plan);
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan, 
          userCount, 
          addons: selectedPlans[plan],
          trial_model: trialModel !== 'none' ? trialModel : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      const { url } = data;
      if (url) window.location.href = url;
      else throw new Error('No checkout URL returned');
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Erro ao criar sessão de checkout. Por favor, tente novamente.');
      setIsLoading(null);
    }
  };

  const handleConfirmUpdate = async () => {
    if (!confirmDialog || !currentUser) return;

    const { plan } = confirmDialog;
    setIsLoading(plan);
    setConfirmDialog(null);

    try {
      const response = await fetch('/api/stripe/update-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userCount,
          addons: selectedPlans[plan],
          userId: currentUser.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update subscription');
      }

      const data = await response.json();

      if (data.requiresCheckout && data.url) {
        // Redirect to checkout for new subscription
        window.location.href = data.url;
      } else if (data.success) {
        // Subscription updated successfully
        setSuccessMessage('Assinatura atualizada com sucesso! As mudanças entrarão em vigor imediatamente.');
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      alert('Erro ao atualizar assinatura: ' + (error.message || 'Tente novamente.'));
    } finally {
      setIsLoading(null);
    }
  };

  // Plans configuration
  const plans = [
    {
      key: 'hello_client' as PlanKey,
      name: 'Hello Client',
      tag: 'PRÉ-VENDA',
      description: 'Ferramentas essenciais para gestão de leads e oportunidades',
      features: ['Construtor de Formulários', 'Cálculo de Oportunidade', 'Quadro Kanban', 'Script de Vendas IA'],
      canAddGame: true,
      canAddMPD: true,
    },
    {
      key: 'hello_growth' as PlanKey,
      name: 'Hello Growth',
      tag: 'MAIS POPULAR',
      description: 'Plano completo com todas as funcionalidades',
      features: ['Dashboard Unificado 360°', 'Correlação Vendas vs NPS', 'IA com Contexto Completo', 'Inclui tudo dos outros planos'],
      canAddGame: true,
      canAddMPD: true,
      isRecommended: true,
    },
    {
      key: 'hello_rating' as PlanKey,
      name: 'Hello Rating',
      tag: 'PÓS-VENDA',
      description: 'Análise de satisfação e relacionamento com clientes',
      features: ['Campanhas NPS ilimitadas', 'Redirecionamento Google Reviews', 'Análise de Sentimento IA', 'Relatórios de Satisfação'],
      canAddGame: true,
      canAddMPD: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Success Message */}
        {successMessage && (
          <div className="max-w-2xl mx-auto mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <Check className="text-emerald-600 flex-shrink-0" size={24} />
            <p className="text-emerald-800 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Canceled Message */}
        {showCanceledMessage && (
          <div className="max-w-2xl mx-auto mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <X className="text-yellow-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-yellow-800 font-medium">Pagamento cancelado</p>
              <p className="text-yellow-700 text-sm">Você pode escolher um plano quando estiver pronto.</p>
            </div>
          </div>
        )}

        {/* Trial Model Banner */}
        {trialModel === 'model_a' && !isManageMode && (
          <div className="max-w-2xl mx-auto mb-6 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <Gift className="text-emerald-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-emerald-800 font-semibold">Trial com Cartão — 30 dias grátis</p>
              <p className="text-emerald-700 text-sm">Escolha seu plano, clique em assinar e use o cupom <strong>TRIAL30</strong> no checkout. Você terá <strong>30 dias grátis</strong> e a cobrança inicia automaticamente no 31º dia.</p>
            </div>
          </div>
        )}
        {trialModel === 'model_b' && !isManageMode && (
          <div className="max-w-2xl mx-auto mb-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="text-amber-600 flex-shrink-0" size={24} />
            <div>
              <p className="text-amber-800 font-semibold">Trial Gratuito 30 dias — sem cartão de crédito</p>
              <p className="text-amber-700 text-sm">Escolha seu plano e clique em <strong>Ativar 30 dias grátis</strong>. Você só precisa do seu e-mail — nenhum dado de pagamento necessário agora.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          {isManageMode && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                <ArrowLeft size={16} />
                Voltar ao sistema
              </button>
            </div>
          )}
          <div className="inline-flex items-center justify-center mb-4">
            {isManageMode ? (
              <RefreshCw className="text-emerald-500 mr-2" size={32} />
            ) : (
              <Sparkles className="text-emerald-500 mr-2" size={32} />
            )}
            <h1 className="text-5xl font-bold">
              <span className="text-gray-900">Hello</span>
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Growth</span>
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {isManageMode
              ? 'Gerencie sua assinatura — altere o plano, adicione ou remova adicionais'
              : 'Escolha o plano perfeito para impulsionar suas vendas e satisfação dos clientes'}
          </p>

          {/* Current Plan Banner */}
          {isManageMode && currentSubscription && (
            <div className="max-w-lg mx-auto mt-6 bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 justify-center mb-1">
                <Crown className="text-emerald-500" size={18} />
                <span className="text-sm font-semibold text-gray-700">Plano atual</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{currentSubscription.planName}</p>
              {currentSubscription.amount && (
                <p className="text-emerald-600 font-medium">
                  R$ {(currentSubscription.amount / 100).toFixed(2).replace('.', ',')}/mês
                </p>
              )}
              {currentSubscription.nextBillingDate && (
                <p className="text-gray-500 text-xs mt-1">
                  Próxima cobrança: {new Date(currentSubscription.nextBillingDate).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* User Count Selector */}
        <div className="max-w-md mx-auto mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="text-emerald-500" size={24} />
                <label className="text-lg font-semibold text-gray-900">
                  Número de empresas
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
              className="w-full h-3 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${((userCount - 1) / 9) * 100}%, rgb(209 250 229) ${((userCount - 1) / 9) * 100}%, rgb(209 250 229) 100%)`
              }}
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>1</span>
              <span>10+</span>
            </div>
            {userCount > 1 && (
              <p className="text-center text-xs text-emerald-600 mt-2 font-medium">
                Desconto progressivo aplicado automaticamente
              </p>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const price = calculatePrice(plan.key);
            const economy = calculateEconomy(plan.key);
            const economyPercentage = calculateEconomyPercentage(plan.key);
            const isRecommended = plan.isRecommended;
            const isCurrent = isCurrentPlan(plan.key);

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 hover:scale-105 ${
                  isCurrent
                    ? 'ring-4 ring-emerald-500 ring-offset-4'
                    : isRecommended && !isManageMode
                    ? 'ring-4 ring-emerald-500 ring-offset-4'
                    : ''
                }`}
              >
                {/* Tag */}
                <div className={`text-center py-2 font-bold text-sm ${
                  isCurrent
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : isRecommended && !isManageMode
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {isCurrent ? '✓ PLANO ATUAL' : plan.tag}
                </div>

                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        R$ {(price * userCount).toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-gray-600">/mês</span>
                    </div>
                    {userCount > 1 && (
                      <p className="text-gray-500 text-xs mt-1">
                        R$ {price.toFixed(2).replace('.', ',')} por empresa/mês
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
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedPlans[plan.key].game ? 'translate-x-6' : 'translate-x-1'}`} />
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
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedPlans[plan.key].mpd ? 'translate-x-6' : 'translate-x-1'}`} />
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
                    onClick={() => handleSubscribeOrUpdate(plan.key)}
                    disabled={isLoading === plan.key || isCurrent}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCurrent
                        ? 'bg-emerald-100 text-emerald-700 cursor-default'
                        : isRecommended && !isManageMode
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
                    ) : isCurrent ? (
                      '✓ Plano atual'
                    ) : isManageMode ? (
                      'Alterar para este plano'
                    ) : trialModel === 'model_a' ? (
                      <span className="flex items-center justify-center gap-2">
                        <Gift size={18} />
                        Iniciar trial com cartão
                      </span>
                    ) : trialModel === 'model_b' ? (
                      <span className="flex items-center justify-center gap-2">
                        <Clock size={18} />
                        Ativar 30 dias grátis
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

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirmar alteração de plano</h3>
            <p className="text-gray-600 mb-6">
              Você está alterando para o plano <strong>{confirmDialog.planName}</strong> por{' '}
              <strong>R$ {confirmDialog.price.toFixed(2).replace('.', ',')}/mês</strong>.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <p className="text-emerald-800 text-sm">
                A mudança será aplicada imediatamente. O valor proporcional será calculado automaticamente na próxima fatura.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUpdate}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg"
              >
                Confirmar alteração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
