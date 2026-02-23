import React, { useState, useEffect } from 'react';
import { ArrowRight, Settings, X, LayoutDashboard, CheckSquare, Users, Star, PartyPopper, PieChart, BarChart3, Sparkles, MapPin } from 'lucide-react';

interface OnboardingTourProps {
  onClose: () => void;
  setCurrentView: (view: string) => void;
  stepIndex?: number;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onClose, setCurrentView }) => {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step === 0) {
      setCurrentView('settings');
      setTimeout(() => setStep(1), 500); 
    } else if (step === 3) {
      // Transition from Settings to Dashboard
      setCurrentView('dashboard');
      setTimeout(() => setStep(4), 500);
    } else if (step === 4) {
      // Dashboard -> Forms
      setCurrentView('forms');
      setTimeout(() => setStep(5), 500);
    } else if (step === 5) {
      // Forms -> Kanban
      setCurrentView('kanban');
      setTimeout(() => setStep(6), 500);
    } else if (step === 6) {
      // Kanban -> Sales Analytics
      setCurrentView('sales-analytics');
      setTimeout(() => setStep(7), 500);
    } else if (step === 7) {
      // Sales Analytics -> NPS
      setCurrentView('nps');
      setTimeout(() => setStep(8), 500);
    } else if (step === 8) {
      // NPS -> Feedback Analytics
      setCurrentView('analytics');
      setTimeout(() => setStep(9), 500);
    } else if (step === 9) {
      // Feedback Analytics -> HelloIA
      setCurrentView('ai-chat');
      setTimeout(() => setStep(10), 500);
    } else if (step === 10) {
      // HelloIA -> Completion
      setStep(11);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('hg_onboarding_complete', 'true');
    onClose();
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-primary-400', 'ring-opacity-50');
      setTimeout(() => el.classList.remove('ring-4', 'ring-primary-400', 'ring-opacity-50'), 2000);
    }
  };

  useEffect(() => {
    if (step === 1) scrollToSection('settings-company-details');
    if (step === 2) scrollToSection('settings-password');
    if (step === 3) scrollToSection('settings-integrations');
  }, [step]);

  // Initial Modal
  if (step === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center animate-in zoom-in-95 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 to-emerald-500"></div>
          <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Bem-vindo ao HelloGrowth! 👋</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Vamos fazer um tour rápido para configurar sua conta e mostrar como a plataforma unifica suas Vendas e Pós-Venda em uma experiência completa.
          </p>
          <button 
            onClick={handleNext}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all flex items-center justify-center gap-2"
          >
            Começar Tour <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }
  
  // Completion Modal
  if (step === 11) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center animate-in zoom-in-95 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
           <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <PartyPopper size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Tudo Pronto! 🚀</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
             Agora você domina o HelloGrowth. É hora de captar leads, fechar vendas e transformar clientes em fãs da sua marca.
             <br/><br/>
             Qualquer dúvida, acesse o menu <strong>Ajuda & Tutorial</strong>.
          </p>
          <button 
            onClick={handleFinish}
            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2"
          >
            Acessar Plataforma
          </button>
        </div>
      </div>
    );
  }

  // Overlay Tour Steps
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute bottom-8 right-8 md:bottom-10 md:right-10 pointer-events-auto max-w-sm w-full">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          <div className="flex justify-between items-start mb-4">
            <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-1 rounded-full uppercase">
              Passo {step} de 10
            </span>
            <button onClick={handleFinish} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {/* SETTINGS STEPS (1-3) */}
          {step === 1 && (
            <>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Dados da Empresa</h3>
              <p className="text-sm text-gray-600 mb-4">
                Comece preenchendo o nome e telefone. Esses dados aparecem nos formulários para seus clientes e nos relatórios.
              </p>
              <button onClick={handleNext} className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm">Próximo</button>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Segurança</h3>
              <p className="text-sm text-gray-600 mb-4">
                Recomendamos alterar sua senha padrão agora para garantir a segurança dos dados dos seus leads e clientes.
              </p>
              <button onClick={handleNext} className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm">Próximo</button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-2 mb-2 text-purple-700">
                 <MapPin size={20} />
                 <h3 className="font-bold text-lg">Integração Google</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Insira seu <strong>Place ID</strong> aqui. Isso permite que clientes satisfeitos (Nota 9-10) sejam redirecionados automaticamente para avaliar sua empresa no Google Maps.
              </p>
              <button onClick={handleNext} className="w-full py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 text-sm">Configurar depois, ir para o sistema!</button>
            </>
          )}

          {/* SYSTEM OVERVIEW STEPS (4-10) */}
          {step === 4 && (
             <>
               <div className="flex items-center gap-2 mb-2 text-gray-800">
                  <LayoutDashboard size={20} className="text-primary-600" />
                  <h3 className="font-bold text-lg">Dashboard Unificado</h3>
               </div>
               <p className="text-sm text-gray-600 mb-4">
                 Aqui você tem a visão 360°: Vendas (HelloClient) e Satisfação (HelloRating). Acompanhe métricas vitais como Valor em Pipeline e NPS em tempo real.
               </p>
               <button onClick={handleNext} className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm">Ver Pré-Venda</button>
             </>
          )}

	          {step === 5 && (
	             <>
	               <div className="flex items-center gap-2 mb-2 text-gray-800">
	                  <CheckSquare size={20} className="text-blue-600" />
	                  <h3 className="font-bold text-lg">Formulários (HelloClient)</h3>
	               </div>
	               <p className="text-sm text-gray-600 mb-2">
	                 Crie formulários de anamnese inteligentes que qualificam o lead automaticamente.
	               </p>
	               <div className="bg-purple-50 p-2 rounded-lg border border-purple-100 mb-4">
	                  <p className="text-xs text-purple-700">
	                    <strong>Dica:</strong> Procure pela tag <strong>"Game Ativo"</strong> para saber quais formulários estão usando a roleta de prêmios para atrair mais clientes!
	                  </p>
	               </div>
	               <button onClick={handleNext} className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm">Ver Gestão de Leads</button>
	             </>
	          )}

          {step === 6 && (
             <>
               <div className="flex items-center gap-2 mb-2 text-gray-800">
                  <Users size={20} className="text-purple-600" />
                  <h3 className="font-bold text-lg">Kanban de Vendas</h3>
               </div>
               <p className="text-sm text-gray-600 mb-4">
                 Gerencie seu funil visualmente. Arraste cards de "Novo" até "Vendido". Use o <strong>Coach IA</strong> dentro de cada lead para receber dicas de como fechar a venda.
               </p>
               <button onClick={handleNext} className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm">Ver Análise de Vendas</button>
             </>
          )}

          {step === 7 && (
             <>
               <div className="flex items-center gap-2 mb-2 text-gray-800">
                  <PieChart size={20} className="text-indigo-600" />
                  <h3 className="font-bold text-lg">Análise de Vendas</h3>
               </div>
               <p className="text-sm text-gray-600 mb-4">
                 Mergulhe nos números. Veja sua taxa de conversão, onde você está perdendo dinheiro e peça para a IA gerar um diagnóstico estratégico do seu funil.
               </p>
               <button onClick={handleNext} className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm">Ver Pós-Venda</button>
             </>
          )}

          {step === 8 && (
             <>
               <div className="flex items-center gap-2 mb-2 text-gray-800">
                  <Star size={20} className="text-yellow-500" />
                  <h3 className="font-bold text-lg">NPS (HelloRating)</h3>
               </div>
               <p className="text-sm text-gray-600 mb-4">
                 Crie campanhas de satisfação ilimitadas. Monitore a fidelidade dos clientes e transforme promotores em avaliações públicas automaticamente.
               </p>
               <button onClick={handleNext} className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm">Ver Análise de Feedback</button>
             </>
          )}

          {step === 9 && (
             <>
               <div className="flex items-center gap-2 mb-2 text-gray-800">
                  <BarChart3 size={20} className="text-teal-600" />
                  <h3 className="font-bold text-lg">Análise de Feedback</h3>
               </div>
               <p className="text-sm text-gray-600 mb-4">
                 Entenda o "porquê" por trás da nota. Acompanhe a evolução do seu NPS e use a IA para resumir milhares de comentários em insights acionáveis.
               </p>
               <button onClick={handleNext} className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm">Conhecer HelloIA</button>
             </>
          )}

          {step === 10 && (
             <>
               <div className="flex items-center gap-2 mb-2 text-gray-800">
                  <Sparkles size={20} className="text-pink-600" />
                  <h3 className="font-bold text-lg">HelloIA</h3>
               </div>
               <p className="text-sm text-gray-600 mb-4">
                 Seu consultor 24h. Converse com seus dados! Pergunte: "Quem são meus clientes insatisfeitos?" ou "Como melhorar minhas vendas?" e obtenha respostas imediatas.
               </p>
               <button onClick={handleNext} className="w-full py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 text-sm">Concluir Tour</button>
             </>
          )}

        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;