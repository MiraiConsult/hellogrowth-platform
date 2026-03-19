'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  LayoutDashboard,
  Clock,
  Gift,
  AlertCircle
} from 'lucide-react';

function TrialSetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parâmetros passados via URL (do PricingClient após resposta do Modelo B)
  const plan = searchParams.get('plan') || '';
  const userCount = parseInt(searchParams.get('user_count') || '1');
  const addonsParam = searchParams.get('addons') || '{}';
  const trialEndAt = searchParams.get('trial_end_at') || '';

  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyNames, setCompanyNames] = useState<string[]>(new Array(userCount).fill(''));
  const [step, setStep] = useState<'form' | 'success'>('form');

  useEffect(() => {
    // Se não há parâmetros válidos, redirecionar para pricing em vez de mostrar erro
    if (!plan) {
      router.replace('/pricing');
      return;
    }
    setCompanyNames(new Array(userCount).fill(''));
  }, [plan, userCount, router]);

  const handleSave = async () => {
    if (!email.trim() || !email.includes('@')) {
      alert('Por favor, informe um e-mail válido.');
      return;
    }
    if (companyNames.some(name => !name.trim())) {
      alert('Por favor, preencha o nome de todas as empresas.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/onboarding/setup-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          companies: companyNames,
          plan,
          userCount,
          addons: JSON.parse(addonsParam),
          trial_model: 'model_b',
          trial_end_at: trialEndAt,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'EMAIL_EXISTS') {
          throw new Error(data.message);
        }
        throw new Error(data.error || 'Erro ao criar sua conta de trial. Por favor, tente novamente.');
      }
      
      setStep('success');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getPlanDisplayName = (p: string) => {
    const names: Record<string, string> = {
      hello_client: 'Hello Client',
      hello_rating: 'Hello Rating',
      hello_growth: 'Hello Growth',
    };
    return names[p] || p;
  };

  const formatTrialEndDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ops! Algo deu errado</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/pricing')}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all"
          >
            Voltar para Preços
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center border border-emerald-50">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Trial Ativado!</h2>
          <p className="text-slate-500 mb-6">
            Você tem <strong>30 dias gratuitos</strong> para explorar o HelloGrowth.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-amber-600" />
              <span className="font-semibold text-amber-800">Seu trial expira em:</span>
            </div>
            <p className="text-amber-700 font-bold text-lg">{formatTrialEndDate(trialEndAt)}</p>
            <p className="text-amber-600 text-sm mt-1">
              Após essa data, o acesso será bloqueado até a ativação de uma assinatura.
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-8 text-left">
            <p className="text-emerald-800 font-semibold mb-2">Suas empresas foram configuradas!</p>
            <p className="text-emerald-700 text-sm leading-relaxed">
              Para o seu primeiro acesso, utilize o e-mail cadastrado e a senha padrão:
            </p>
            <div className="mt-3 flex items-center justify-center bg-white border border-emerald-200 py-2 rounded-xl text-2xl font-mono font-bold text-emerald-600 tracking-widest shadow-sm">
              12345
            </div>
            <p className="text-emerald-600 text-xs mt-3 italic text-center">
              Você poderá alterar sua senha após o primeiro login.
            </p>
          </div>

          <button 
            onClick={() => router.push('/')}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <LayoutDashboard size={24} />
            Acessar meu Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-amber-100 text-amber-600 rounded-2xl mb-4">
            <Gift size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Ativar Trial Gratuito
          </h1>
          <p className="mt-3 text-lg text-slate-500">
            30 dias grátis, sem precisar de cartão de crédito.
          </p>

          {/* Trial Info Banner */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <Clock size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800">
                  Plano {getPlanDisplayName(plan)} — Trial de 30 dias
                </p>
                {trialEndAt && (
                  <p className="text-amber-700 text-sm mt-1">
                    Acesso gratuito até <strong>{formatTrialEndDate(trialEndAt)}</strong>
                  </p>
                )}
                <p className="text-amber-600 text-xs mt-1">
                  Após o período, você receberá um cupom de desconto para assinar.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8">
            {/* Email field */}
            <div className="mb-6">
              <label className="text-sm font-bold text-slate-700 block mb-2">
                Seu E-mail de Acesso
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="seu@email.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                Este será o e-mail de login da sua conta.
              </p>
            </div>

            {/* Company names */}
            <div className="space-y-6">
              {companyNames.map((name, index) => (
                <div key={index} className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                    Nome da Empresa {companyNames.length > 1 ? index + 1 : ''}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                      <Building2 size={20} />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        const newNames = [...companyNames];
                        newNames[index] = e.target.value;
                        setCompanyNames(newNames);
                      }}
                      className="block w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      placeholder="Ex: Minha Clínica de Estética"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 bg-slate-50 p-4 rounded-xl">
                <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
                <span>
                  Plano: <strong>{getPlanDisplayName(plan).toUpperCase()}</strong> — {userCount} empresa{userCount > 1 ? 's' : ''} — Sem cartão necessário
                </span>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Ativando Trial...
                  </>
                ) : (
                  <>
                    <Gift size={20} />
                    Ativar 30 Dias Grátis
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-sm">
          Ambiente Seguro • Powered by HelloGrowth
        </p>
      </div>
    </div>
  );
}

export default function TrialSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Carregando...</h2>
      </div>
    }>
      <TrialSetupContent />
    </Suspense>
  );
}
