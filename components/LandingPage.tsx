
import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, CheckCircle2, MessageSquare, Star, Target, TrendingUp, 
  Zap, Settings, Send, BrainCircuit, Bell, 
  ChevronDown, ChevronUp, Menu, X, Play, Check 
} from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-slate-900 overflow-x-hidden">
      
      {/* HEADER */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#83E509] rounded-lg flex items-center justify-center text-slate-900 font-bold text-xl">H</div>
              <span className="font-bold text-xl tracking-tight">HelloGrowth</span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">Funcionalidades</button>
              <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">Planos</button>
              <button onClick={() => scrollToSection('faq')} className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors">FAQ</button>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <button onClick={onLoginClick} className="text-sm font-medium text-slate-900 hover:text-primary-600">
                Entrar
              </button>
              <button 
                onClick={onLoginClick}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
              >
                Começar Agora
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-slate-600"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-lg p-4 md:hidden flex flex-col gap-4 animate-in slide-in-from-top-5">
            <button onClick={() => scrollToSection('features')} className="text-left py-2 font-medium text-slate-600">Funcionalidades</button>
            <button onClick={() => scrollToSection('pricing')} className="text-left py-2 font-medium text-slate-600">Planos</button>
            <button onClick={() => scrollToSection('faq')} className="text-left py-2 font-medium text-slate-600">FAQ</button>
            <div className="h-px bg-gray-100 my-2"></div>
            <button onClick={onLoginClick} className="w-full py-3 text-center font-bold text-slate-900 bg-gray-50 rounded-lg">Entrar</button>
            <button onClick={onLoginClick} className="w-full py-3 text-center font-bold text-white bg-[#83E509] rounded-lg shadow-md">Começar Agora</button>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-gradient-to-b from-white to-gray-50">
          {/* Background Decor */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
             {/* Abstract Shapes using CSS */}
             <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-[#83E509]/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
             <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#83E509]/10 text-green-800 text-sm font-bold mb-8 border border-[#83E509]/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#83E509] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#83E509]"></span>
                </span>
                Nova Era do Crescimento B2B
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-slate-900 leading-tight">
                Transforme sua Base de Clientes em <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#72c908] to-emerald-600">Máquina de Crescimento</span>
              </h1>
              
               <p className="text-xl md:text-2xl text-slate-500 mb-10 leading-relaxed max-w-3xl mx-auto">
                <span className="text-slate-900 font-bold">Conheça a HelloGrowth</span>, a plataforma que organiza pré e pós-venda, fortalece sua reputação online e aumenta suas vendas de forma automática.
              </p>

              {/* Highlight Element */}
              <div className="flex flex-col items-center justify-center mb-12">
                <div className="flex flex-wrap justify-center gap-6 text-sm md:text-base font-bold text-slate-700 mb-4 tracking-wide">
                  <div className="flex items-center gap-2 bg-white shadow-sm px-3 py-1 rounded-full border border-gray-100">
                    <TrendingUp className="w-4 h-4 text-[#83E509]" />
                    <span>+ VISIBILIDADE</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white shadow-sm px-3 py-1 rounded-full border border-gray-100">
                    <Target className="w-4 h-4 text-[#83E509]" />
                    <span>+ VENDAS</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={onLoginClick}
                  className="w-full sm:w-auto px-8 py-4 bg-[#83E509] text-slate-900 rounded-full font-bold text-lg hover:bg-[#72c908] transition-all shadow-xl shadow-green-200 flex items-center justify-center gap-2 hover:-translate-y-1"
                >
                  Utilizar por 14 dias de graça
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-gray-200 rounded-full font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center">
                  Agendar uma apresentação
                </button>
              </div>
            </div>

            {/* Hero Mockup Placeholder */}
            <div className="relative mx-auto max-w-6xl mt-16">
              <div className="relative z-10 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 aspect-[16/9] flex items-center justify-center group">
                 {/* Replaced Image with Dashboard Simulation */}
                 <div className="w-full h-full bg-slate-50 flex flex-col">
                    <div className="h-14 border-b flex items-center px-6 justify-between bg-white">
                        <div className="flex gap-4">
                            <div className="w-32 h-3 bg-gray-200 rounded animate-pulse"></div>
                            <div className="w-20 h-3 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                        <div className="w-8 h-8 bg-[#83E509] rounded-full opacity-20"></div>
                    </div>
                    <div className="p-6 grid grid-cols-12 gap-6 flex-1 bg-slate-50 overflow-hidden relative">
                        {/* Fake Dashboard Content */}
                        <div className="col-span-3 bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
                           <div className="w-8 h-8 bg-blue-100 rounded mb-2"></div>
                           <div className="h-2 w-1/2 bg-gray-200 rounded"></div>
                           <div className="h-6 w-3/4 bg-gray-100 rounded"></div>
                        </div>
                        <div className="col-span-3 bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
                           <div className="w-8 h-8 bg-green-100 rounded mb-2"></div>
                           <div className="h-2 w-1/2 bg-gray-200 rounded"></div>
                           <div className="h-6 w-3/4 bg-gray-100 rounded"></div>
                        </div>
                        <div className="col-span-3 bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
                           <div className="w-8 h-8 bg-purple-100 rounded mb-2"></div>
                           <div className="h-2 w-1/2 bg-gray-200 rounded"></div>
                           <div className="h-6 w-3/4 bg-gray-100 rounded"></div>
                        </div>
                        <div className="col-span-3 bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3">
                           <div className="w-8 h-8 bg-red-100 rounded mb-2"></div>
                           <div className="h-2 w-1/2 bg-gray-200 rounded"></div>
                           <div className="h-6 w-3/4 bg-gray-100 rounded"></div>
                        </div>
                        
                        <div className="col-span-8 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                             <div className="h-4 w-1/3 bg-gray-200 rounded mb-6"></div>
                             <div className="flex items-end gap-4 h-32">
                                <div className="w-full bg-blue-50 h-[40%] rounded-t"></div>
                                <div className="w-full bg-blue-100 h-[60%] rounded-t"></div>
                                <div className="w-full bg-blue-200 h-[30%] rounded-t"></div>
                                <div className="w-full bg-blue-300 h-[80%] rounded-t"></div>
                                <div className="w-full bg-blue-400 h-[50%] rounded-t"></div>
                                <div className="w-full bg-blue-500 h-[90%] rounded-t"></div>
                             </div>
                        </div>
                        <div className="col-span-4 bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex items-center justify-center">
                             <div className="w-40 h-40 rounded-full border-8 border-gray-100 border-t-[#83E509] border-r-[#83E509]"></div>
                        </div>
                    </div>
                    
                    {/* Placeholder Text Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/5 backdrop-blur-[1px]">
                        <p className="text-gray-500 font-medium bg-white/80 px-4 py-2 rounded-full shadow-sm border border-gray-200 text-sm">
                           Visualização do Dashboard
                        </p>
                    </div>
                 </div>
              </div>
              
              {/* Decorative Glow */}
              <div className="absolute -inset-4 bg-[#83E509]/20 blur-3xl -z-10 rounded-[3rem] opacity-50"></div>
            </div>
          </div>
        </section>

        {/* LOGOS SECTION */}
        <section className="py-12 bg-white border-y border-gray-100 overflow-hidden">
          <div className="w-full max-w-7xl mx-auto px-4">
            <p className="text-center text-sm font-bold text-[#83E509] uppercase tracking-widest mb-8">Confiado por empresas inovadoras</p>
            
            <div className="flex justify-center gap-8 md:gap-16 flex-wrap opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Logo Placeholders - Simulating Client Logos */}
                {['Clínica Huk', 'Love Sugar', 'RR Uniformes', 'TPK Hotéis', 'Parceria Leilões', 'Gio Estética'].map((name, i) => (
                    <div key={i} className="font-bold text-lg md:text-xl text-slate-700 flex items-center gap-2 select-none">
                        <div className="w-8 h-8 bg-slate-200 rounded-md flex items-center justify-center text-xs text-slate-500">Logo</div>
                        {name}
                    </div>
                ))}
            </div>
          </div>
        </section>

        {/* GREEN BANNER SECTION */}
        <section className="py-20 bg-slate-900 text-white overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="w-full md:w-1/2 text-center md:text-left">
                <h2 className="text-4xl md:text-6xl font-bold leading-tight">
                  Sua empresa <br/>
                  organizada. <br/>
                  <span className="text-[#83E509] relative inline-block">
                    Sem esforço.
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-[#83E509] opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                       <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                  </span>
                </h2>
              </div>

              <div className="w-full md:w-1/2 text-slate-300 space-y-6 text-lg md:text-xl font-medium">
                <p>
                  Sem dados na pré-venda, você perde oportunidades.<br/>
                  Sem pós-venda estruturado, você perde reputação.
                </p>
                <p className="text-white font-bold border-l-4 border-[#83E509] pl-4">
                  O HelloGrowth integra as duas pontas em uma única plataforma.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BENEFITS SECTION */}
        <section id="features" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-16 items-center">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#83E509]/10 text-green-800 text-sm font-bold mb-6">
                  <CheckCircle2 className="w-4 h-4" />
                  Por que HelloGrowth?
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900">
                  A única plataforma que une <span className="text-[#83E509]">Vendas</span> e <span className="text-[#83E509]">Reputação</span>
                </h2>
                <p className="text-xl text-slate-500">
                  Resolva os gargalos que impedem seu crescimento com uma solução integrada e inteligente.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 w-full">
                {[
                  {
                    title: "Inteligência Comercial",
                    desc: "Identifique oportunidades ocultas na sua base e saiba exatamente quem abordar e quando.",
                    icon: <BrainCircuit className="w-8 h-8 text-[#83E509]" />,
                    bg: "bg-white",
                    image: "https://placehold.co/400x200/f0fdf4/10b981?text=Inteligencia" // Placeholder
                  },
                  {
                    title: "Reputação Automática",
                    desc: "Transforme clientes satisfeitos em avaliações 5 estrelas no Google automaticamente.",
                    icon: <Star className="w-8 h-8 text-[#83E509]" />,
                    bg: "bg-white",
                    image: "https://placehold.co/400x200/fefce8/eab308?text=Reputacao" // Placeholder
                  },
                  {
                    title: "Eficiência Operacional",
                    desc: "Elimine planilhas e processos manuais. Centralize tudo em um dashboard intuitivo.",
                    icon: <Zap className="w-8 h-8 text-[#83E509]" />,
                    bg: "bg-white",
                    image: "https://placehold.co/400x200/eff6ff/3b82f6?text=Eficiencia" // Placeholder
                  }
                ].map((feature, i) => (
                  <div key={i} className="border border-gray-200 bg-white hover:border-[#83E509]/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-2xl overflow-hidden group flex flex-col">
                    <div className="h-48 overflow-hidden bg-gray-100 relative">
                       {/* Placeholder Image Logic */}
                       <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                          {/* Use the SVG icon as placeholder graphic */}
                          {/* FIX: The 'size' prop was causing a TypeScript error because the type of 'feature.icon' was too generic. Switched to using Tailwind CSS classes for sizing. */}
                          {React.cloneElement(feature.icon as React.ReactElement, { className: "w-16 h-16 opacity-20 text-gray-400" })}
                       </div>
                    </div>
                    <div className="p-8 flex-1 flex flex-col">
                      <div className="w-14 h-14 rounded-2xl bg-[#83E509]/10 flex items-center justify-center mb-6 group-hover:bg-[#83E509]/20 transition-colors">
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                      <p className="text-slate-500 leading-relaxed text-sm">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-24 bg-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-gray-50 to-transparent pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Planos que crescem com você</h2>
              <p className="text-lg text-slate-500 mb-8">
                Escolha a solução ideal para o seu momento. Sem contratos de fidelidade.
              </p>
              
              {/* Toggle */}
              <div className="flex items-center justify-center gap-4 mb-8 select-none">
                <span className={`text-sm font-bold cursor-pointer ${!isAnnual ? 'text-slate-900' : 'text-slate-400'}`} onClick={() => setIsAnnual(false)}>Mensal</span>
                <button 
                  onClick={() => setIsAnnual(!isAnnual)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 ${isAnnual ? 'bg-[#83E509]' : 'bg-slate-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`}></div>
                </button>
                <span className={`text-sm font-bold cursor-pointer ${isAnnual ? 'text-slate-900' : 'text-slate-400'}`} onClick={() => setIsAnnual(true)}>
                  Anual <span className="text-[#83E509] text-xs ml-1 font-extrabold">-20% OFF</span>
                </span>
              </div>

              <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium border border-green-100">
                <CheckCircle2 className="w-4 h-4" />
                Sem fidelidade. Cancele quando quiser.
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
              {/* Plan 1 */}
              <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">HelloClient</h3>
                  <p className="text-sm text-slate-500">Módulo de Pré-venda Inteligente</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">R$ {isAnnual ? '79,90' : '99,90'}</span>
                  <span className="text-slate-400">/mês</span>
                  {isAnnual && <div className="text-xs text-[#83E509] font-bold mt-1">Economia de 20%</div>}
                </div>
                <button onClick={onLoginClick} className="w-full py-3 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-colors mb-8">Começar Agora</button>
                <ul className="space-y-4">
                  {["Qualificação de Leads", "Gestão de Oportunidades", "Integração com Formulários", "Suporte por Email"].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plan 2 (Featured) */}
              <div className="bg-white rounded-2xl border-2 border-[#83E509] p-8 shadow-2xl relative transform md:-translate-y-4">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#83E509] text-slate-900 font-bold px-4 py-1 rounded-full text-sm shadow-md">
                  Melhor Valor
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">HelloGrowth</h3>
                  <p className="text-sm text-slate-500">Plataforma Completa (All-in-One)</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">R$ {isAnnual ? '119,90' : '149,90'}</span>
                  <span className="text-slate-400">/mês</span>
                  {isAnnual && <div className="text-xs text-[#83E509] font-bold mt-1 inline-block bg-[#83E509]/20 px-2 py-0.5 rounded">Economia de 20%</div>}
                </div>
                <button onClick={onLoginClick} className="w-full py-3 bg-[#83E509] text-slate-900 rounded-lg font-bold hover:bg-[#72c908] transition-colors mb-8 shadow-lg shadow-green-100">
                  Começar Teste Grátis
                </button>
                <ul className="space-y-4">
                  {["Tudo do HelloClient", "Tudo do HelloRating", "Integração Total dos Dados", "Dashboard Unificado", "Suporte Prioritário"].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                      <CheckCircle2 className="w-5 h-5 text-[#83E509] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plan 3 */}
              <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">HelloRating</h3>
                  <p className="text-sm text-slate-500">Módulo de Pós-venda e Reputação</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">R$ {isAnnual ? '79,90' : '99,90'}</span>
                  <span className="text-slate-400">/mês</span>
                  {isAnnual && <div className="text-xs text-[#83E509] font-bold mt-1">Economia de 20%</div>}
                </div>
                <button onClick={onLoginClick} className="w-full py-3 border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-colors mb-8">Começar Agora</button>
                <ul className="space-y-4">
                  {["Pesquisas de NPS", "Gestão de Reviews (Google)", "Alertas de Detratores", "Suporte por Email"].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24 bg-gray-50 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-0 w-64 h-64 bg-[#83E509]/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Como funciona o HelloGrowth?</h2>
              <p className="text-lg text-slate-500">
                Implementação simples e rápida. Em poucos minutos sua empresa já começa a colher os resultados.
              </p>
            </div>

            <div className="relative">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>

              <div className="grid md:grid-cols-5 gap-8">
                {[
                  { step: "01", title: "Configure em 5 min", desc: "Cadastre seus produtos e ative formulários em um só lugar.", icon: <Settings size={20} /> },
                  { step: "02", title: "Envie para todos", desc: "Compartilhe links por WhatsApp ou email.", icon: <Send size={20} /> },
                  { step: "03", title: "A IA interpreta tudo", desc: "Respostas geram oportunidades e classificam clientes.", icon: <BrainCircuit size={20} /> },
                  { step: "04", title: "Receba o que importa", desc: "Alertas de leads quentes e pontos críticos.", icon: <Bell size={20} /> },
                  { step: "05", title: "Crescimento contínuo", desc: "Venda mais e ganhe reviews positivos.", icon: <TrendingUp size={20} /> }
                ].map((item, i) => (
                  <div key={i} className="relative flex flex-col items-center text-center group">
                    <div className="w-24 h-24 rounded-full bg-white border-4 border-slate-200 group-hover:border-[#83E509]/50 transition-colors duration-500 flex items-center justify-center mb-6 relative z-10 shadow-lg">
                      <div className="w-16 h-16 rounded-full bg-[#83E509]/10 text-green-700 flex items-center justify-center group-hover:bg-[#83E509]/20 transition-colors">
                        {item.icon}
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#83E509] text-white flex items-center justify-center text-sm font-bold shadow-md border-2 border-white">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-900 group-hover:text-[#83E509] transition-colors">{item.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-[200px] mx-auto">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-16 text-center">
              <button onClick={onLoginClick} className="px-8 py-4 bg-white border border-gray-200 text-slate-700 rounded-full font-bold text-lg hover:bg-gray-50 transition-all shadow-md flex items-center justify-center gap-2 mx-auto">
                Começar Agora
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">O que nossos clientes dizem</h2>
              <p className="text-lg text-slate-500">Histórias reais de quem transformou seu negócio.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: "Camila Huk",
                  role: "Sócia Clínica Huk",
                  text: "Nunca medimos o real potencial da nossa base até começar a usar o HelloGrowth. Hoje identificamos quem tem perfil para novos procedimentos, aumentamos o ticket médio e multiplicamos reviews."
                },
                {
                  name: "André Castro",
                  role: "Sócio GioLaser Bonfim",
                  text: "O HelloGrowth fez o comercial parar de desperdiçar tempo com leads frios. A plataforma mostra onde estão as melhores oportunidades e já entrega argumentos prontos para abordagem."
                }
              ].map((t, i) => (
                <div key={i} className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all flex flex-col h-full">
                  <div className="flex justify-end mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#83E509]/20 flex items-center justify-center text-green-700">
                       <MessageSquare className="w-5 h-5" />
                    </div>
                  </div>
                  <blockquote className="text-lg text-slate-600 italic mb-6 flex-grow">"{t.text}"</blockquote>
                  <div>
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <p className="text-sm text-[#83E509] font-bold">{t.role}</p>
                  </div>
                  {/* Mock Map Image */}
                  <div className="mt-6 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-40 flex items-center justify-center relative">
                      <div className="text-gray-400 text-xs text-center px-4">
                         <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                         Print do Google Maps ({t.name})
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Perguntas Frequentes</h2>
              <p className="text-lg text-slate-500">Tire suas dúvidas sobre a HelloGrowth.</p>
            </div>

            <div className="space-y-4">
              {[
                { q: "Como funciona o HelloGrowth?", a: "Você configura em poucos minutos, cria formulários de qualificação e pesquisas NPS, envia para leads e clientes, e o sistema identifica automaticamente oportunidades de venda e reputação." },
                { q: "Preciso ter conhecimento técnico?", a: "Não. O HelloGrowth é simples e intuitivo. A configuração inicial leva cerca de 5 minutos e oferecemos suporte em português." },
                { q: "Posso cancelar a qualquer momento?", a: "Sim. O cancelamento pode ser feito diretamente na plataforma, sem multa ou burocracia." },
                { q: "Existe limite de formulários?", a: "Não existe limite. Todos os planos permitem criar formulários e pesquisas ilimitadas." },
                { q: "Como funciona a integração com Google Avaliações?", a: "Quando um cliente avalia com nota alta no NPS, o sistema direciona automaticamente para o Google Meu Negócio para deixar review." }
              ].map((faq, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <button 
                    className="w-full flex justify-between items-center p-5 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => toggleFaq(i)}
                  >
                    <span className="font-bold text-slate-800 text-lg">{faq.q}</span>
                    {openFaqIndex === i ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                  </button>
                  {openFaqIndex === i && (
                    <div className="p-5 pt-0 text-slate-600 bg-white border-t border-gray-50">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-[#111] text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Pronto para Transformar seu Crescimento?</h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Junte-se a centenas de empresas que já estão usando a HelloGrowth para vender mais e melhor.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={onLoginClick} className="w-full sm:w-auto px-8 py-4 bg-[#83E509] text-slate-900 rounded-full font-bold text-lg hover:bg-[#72c908] transition-all flex items-center justify-center gap-2">
                Começar Teste Grátis
                <ArrowRight size={20} />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/20 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all">
                Falar com Consultor
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-xs">H</div>
            <span className="font-bold text-slate-900">HelloGrowth</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-[#83E509]">Termos</a>
            <a href="#" className="hover:text-[#83E509]">Privacidade</a>
            <a href="#" className="hover:text-[#83E509]">Contato</a>
          </div>
          <p className="text-sm text-slate-400">© 2025 HelloGrowth.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
