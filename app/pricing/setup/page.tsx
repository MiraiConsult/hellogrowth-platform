'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  LayoutDashboard 
} from 'lucide-react';

function SetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [companyNames, setCompanyNames] = useState<string[]>([]);
  const [step, setStep] = useState<'form' | 'success'>('form');

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    } else {
      setError('Sessão de pagamento não encontrada.');
      setLoading(false);
    }
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`/api/stripe/session?session_id=${sessionId}`);
      if (!response.ok) throw new Error('Erro ao carregar dados da sessão.');
      
      const data = await response.json();
      setSessionData(data);
      
      // Initialize company names array based on userCount
      const count = parseInt(data.metadata?.userCount || '1');
      setCompanyNames(new Array(count).fill(''));
      
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (companyNames.some(name => !name.trim())) {
      alert('Por favor, preencha o nome de todas as empresas.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/onboarding/setup-tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          email: sessionData.customer_email,
          companies: companyNames,
          plan: sessionData.metadata?.plan,
          addons: JSON.parse(sessionData.metadata?.addons || '{}')
        })
      });

      if (!response.ok) throw new Error('Erro ao criar suas empresas.');
      
      setStep('success');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Validando seu pagamento...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
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
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo Pronto!</h2>
          
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-8 text-left">
            <p className="text-emerald-800 font-semibold mb-2">Suas empresas foram configuradas com sucesso!</p>
            <p className="text-emerald-700 text-sm leading-relaxed">
              Para o seu primeiro acesso, utilize o e-mail da compra e a senha padrão:
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
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-600 rounded-2xl mb-4">
            <Building2 size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Configure suas Empresas
          </h1>
          <p className="mt-3 text-lg text-slate-500">
            Estamos quase lá! Dê um nome para as empresas que você contratou.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-8">
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
              <div className="flex items-center justify-between mb-6 text-sm text-slate-500 bg-slate-50 p-4 rounded-xl">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  E-mail da conta: <strong>{sessionData.customer_email}</strong>
                </div>
                <div className="font-medium">
                  Plano: {sessionData.metadata?.plan?.replace('_', ' ').toUpperCase()}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Criando Empresas...
                  </>
                ) : (
                  <>
                    Finalizar Configuração
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

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Carregando...</h2>
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}
