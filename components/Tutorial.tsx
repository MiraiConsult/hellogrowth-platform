'use client';
import React, { useState } from 'react';
import {
  BookOpen, CheckSquare, Users, Star, MessageSquare, BarChart3,
  ChevronRight, PlayCircle, Sparkles, Building2, Package, FileText,
  Bell, Zap, ArrowRight, RefreshCw, CheckCircle2
} from 'lucide-react';

interface TutorialProps {
  onOpenOnboarding?: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onOpenOnboarding }) => {
  const [activeTab, setActiveTab] = useState('onboarding');

  const tabs = [
    { id: 'onboarding', label: 'Configuração Inicial', icon: Sparkles },
    { id: 'welcome', label: 'Visão Geral', icon: BookOpen },
    { id: 'forms', label: 'Pré-Venda (Formulários)', icon: CheckSquare },
    { id: 'kanban', label: 'Gestão de Oportunidades', icon: Users },
    { id: 'nps', label: 'Pós-Venda (NPS)', icon: Star },
    { id: 'ai', label: 'Inteligência Artificial', icon: MessageSquare },
  ];

  const onboardingSteps = [
    {
      id: 'profile',
      icon: Building2,
      color: 'emerald',
      title: 'Perfil do Negócio',
      description: 'Configure o nome, tipo, descrição e público-alvo da sua empresa. O Place ID do Google é fundamental para redirecionar clientes satisfeitos para avaliações.',
      tips: [
        'Preencha a descrição com detalhes — a IA usa isso para gerar textos personalizados',
        'O Place ID é o código do seu negócio no Google Maps (essencial para o NPS)',
        'Quanto mais completo o perfil, mais inteligente o sistema fica',
      ],
    },
    {
      id: 'nps',
      icon: Star,
      color: 'yellow',
      title: 'Pesquisa de NPS',
      description: 'Crie sua primeira pesquisa de satisfação. Clientes com nota 9-10 são redirecionados para o Google; notas baixas geram alertas internos.',
      tips: [
        'Use os templates prontos para começar mais rápido',
        'Ative o redirecionamento para o Google para clientes com nota 9-10',
        'Envie o link por WhatsApp logo após o atendimento para maior taxa de resposta',
      ],
    },
    {
      id: 'products',
      icon: Package,
      color: 'blue',
      title: 'Cadastro de Produtos',
      description: 'Adicione seus produtos e serviços para que o sistema calcule o valor de pipeline e a IA sugira o produto certo para cada lead.',
      tips: [
        'Use o botão "Gerar com IA" para criar o catálogo automaticamente',
        'Coloque preços reais para que o pipeline seja calculado corretamente',
        'Adicione boas descrições para que a IA entenda o que cada produto resolve',
      ],
    },
    {
      id: 'form',
      icon: FileText,
      color: 'purple',
      title: 'Formulário de Pré-venda',
      description: 'Crie formulários para captar e qualificar leads automaticamente. Compartilhe o link no Instagram, WhatsApp e Google Meu Negócio.',
      tips: [
        'Use templates prontos do seu segmento de negócio',
        'Inclua uma pergunta de orçamento para qualificar melhor os leads',
        'Ative a análise de IA para classificar cada lead automaticamente',
      ],
    },
    {
      id: 'mbd',
      icon: MessageSquare,
      color: 'green',
      title: 'Conectar WhatsApp (MBD)',
      description: 'Conecte o WhatsApp para enviar pesquisas automaticamente após atendimentos e receber alertas de avaliações negativas em tempo real.',
      tips: [
        'Use um número de WhatsApp dedicado ao negócio (não o pessoal)',
        'Pesquisas por WhatsApp têm até 3x mais respostas que por e-mail',
        'Disponível nos planos Growth — pode pular se não tiver o plano',
      ],
      optional: true,
    },
    {
      id: 'alerts',
      icon: Bell,
      color: 'orange',
      title: 'Alertas e Relatórios',
      description: 'Configure quem recebe alertas de novos leads, detratores e leads de alto valor. Defina o e-mail para relatórios periódicos.',
      tips: [
        'Coloque o número do responsável pelo atendimento para alertas de detratores',
        'Configure alertas de novo lead para entrar em contato imediatamente',
        'Relatórios semanais ajudam a acompanhar a evolução do negócio',
      ],
    },
  ];

  const colorMap: Record<string, { bg: string; light: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    yellow: { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    blue: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    purple: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    green: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    orange: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'onboarding':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={20} className="text-emerald-200" />
                    <span className="text-emerald-200 text-sm font-medium uppercase tracking-wider">Configuração Inicial</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Guia de Onboarding</h2>
                  <p className="text-emerald-100 text-sm max-w-lg">
                    Revise as 6 etapas de configuração do HelloGrowth. Você pode reabrir o assistente de configuração a qualquer momento para completar ou revisar cada etapa.
                  </p>
                </div>
                {onOpenOnboarding && (
                  <button
                    onClick={onOpenOnboarding}
                    className="flex-shrink-0 bg-white text-emerald-600 font-semibold px-5 py-3 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-2 text-sm shadow-md"
                  >
                    <RefreshCw size={16} />
                    Reabrir Configuração
                  </button>
                )}
              </div>
            </div>

            {/* Giulia card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4 shadow-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Giulia — Assistente de Configuração</p>
                <p className="text-sm text-gray-600">
                  Durante o onboarding, a Giulia está disponível em cada etapa para responder dúvidas, dar dicas e guiar você pelo processo. Clique em <strong>"Reabrir Configuração"</strong> acima para conversar com ela novamente.
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {onboardingSteps.map((step, idx) => {
                const Icon = step.icon;
                const colors = colorMap[step.color];
                return (
                  <div key={step.id} className={`bg-white border ${colors.border} rounded-xl p-5 shadow-sm`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Etapa {idx + 1}</span>
                          {step.optional && (
                            <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">Opcional</span>
                          )}
                        </div>
                        <h3 className={`font-bold text-gray-900 mb-1`}>{step.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                        <div className={`${colors.light} rounded-lg p-3 space-y-1`}>
                          {step.tips.map((tip, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2 size={14} className={`${colors.text} flex-shrink-0 mt-0.5`} />
                              <p className={`text-xs ${colors.text}`}>{tip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA final */}
            {onOpenOnboarding && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                <Zap size={24} className="text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Pronto para configurar?</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Clique abaixo para abrir o assistente de configuração e completar as etapas com a ajuda da Giulia.
                </p>
                <button
                  onClick={onOpenOnboarding}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 mx-auto"
                >
                  <ArrowRight size={18} />
                  Abrir Assistente de Configuração
                </button>
              </div>
            )}
          </div>
        );

      case 'welcome':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-r from-primary-600 to-emerald-600 p-8 rounded-2xl text-white shadow-lg">
              <h2 className="text-3xl font-bold mb-4">Bem-vindo ao HelloGrowth! 🚀</h2>
              <p className="text-lg opacity-90 max-w-2xl">
                Sua plataforma completa para vender mais e fidelizar clientes. Aqui você unifica a captação de leads qualificados com a gestão da satisfação do cliente.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Users size={20}/></div>
                  HelloClient (Pré-Venda)
                </h3>
                <p className="text-gray-600 mb-4">
                  Focado em trazer clientes novos. Crie formulários inteligentes, gerencie leads no Kanban e use IA para fechar vendas.
                </p>
                <button onClick={() => setActiveTab('forms')} className="text-primary-600 font-medium hover:underline flex items-center gap-1">
                  Ver tutorial <ChevronRight size={16}/>
                </button>
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Star size={20}/></div>
                  HelloRating (Pós-Venda)
                </h3>
                <p className="text-gray-600 mb-4">
                  Focado em manter clientes. Meça a satisfação (NPS), identifique detratores e gere avaliações no Google.
                </p>
                <button onClick={() => setActiveTab('nps')} className="text-primary-600 font-medium hover:underline flex items-center gap-1">
                  Ver tutorial <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          </div>
        );

      case 'forms':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Como usar os Formulários Inteligentes</h2>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
               <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Criando um Formulário</h4>
                    <p className="text-gray-600 mt-1">
                      Vá em <strong>Formulários</strong> e clique em "Novo Formulário". Dê um nome e uma descrição.
                      Use o botão <strong>"Sugerir Perguntas com IA"</strong> para criar automaticamente perguntas estratégicas baseadas no seu negócio.
                    </p>
                  </div>
               </div>

               <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-800">
                  <strong>Novidade: Gamificação!</strong> 🎁 Ao ativar a roleta de prêmios em um formulário, ele exibirá a tag <strong>"Game Ativo"</strong> no painel principal. Isso ajuda você a identificar rapidamente quais campanhas estão usando gamificação para aumentar a conversão.
               </div>
               
               <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Qualificação Automática</h4>
                    <p className="text-gray-600 mt-1">
                      Em perguntas de escolha (única ou múltipla), você pode atribuir um <strong>"Valor de Oportunidade"</strong> para cada opção. 
                      Isso permite que o sistema calcule automaticamente o valor potencial do lead assim que ele responde.
                    </p>
                  </div>
               </div>

               <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Scripts de Vendas</h4>
                    <p className="text-gray-600 mt-1">
                      Para cada opção de resposta, você pode definir um <strong>Script de Venda</strong> (ou pedir para a IA gerar). 
                      Quando o lead chega no seu Kanban, você verá exatamente o que dizer para quebrar objeções baseado no que ele respondeu.
                    </p>
                  </div>
               </div>
            </div>
          </div>
        );

      case 'kanban':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Gestão de Oportunidades (Kanban)</h2>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
                   <strong>Dica:</strong> Todos os leads captados pelos formulários caem automaticamente na coluna "Novo" do Kanban.
                </div>

                <ul className="space-y-4">
                   <li className="flex gap-3">
                      <CheckSquare className="text-green-500 flex-shrink-0 mt-1" />
                      <div>
                         <h4 className="font-bold text-gray-900">Arrastar e Soltar</h4>
                         <p className="text-gray-600 text-sm">Mova os cards entre as colunas (Novo, Em Contato, Negociação, Vendido) conforme o progresso da venda.</p>
                      </div>
                   </li>
                   <li className="flex gap-3">
                      <CheckSquare className="text-green-500 flex-shrink-0 mt-1" />
                      <div>
                         <h4 className="font-bold text-gray-900">Detalhes do Lead</h4>
                         <p className="text-gray-600 text-sm">Clique no card para ver todas as respostas do formulário, dados de contato e o histórico de anotações (CRM).</p>
                      </div>
                   </li>
                   <li className="flex gap-3">
                      <CheckSquare className="text-green-500 flex-shrink-0 mt-1" />
                      <div>
                         <h4 className="font-bold text-gray-900">Coach de Vendas IA</h4>
                         <p className="text-gray-600 text-sm">Dentro do card do lead, use o botão "Gerar" na seção Coach IA para receber uma dica personalizada de como fechar aquela venda específica.</p>
                      </div>
                   </li>
                </ul>
            </div>
          </div>
        );

      case 'nps':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">NPS e Redirecionamento Google</h2>
            
            <div className="grid grid-cols-1 gap-6">
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">Como funciona a Campanha?</h3>
                  <p className="text-gray-600 mb-4">
                     Crie campanhas de satisfação (ex: "Pós-Venda", "Atendimento"). Você pode enviar o link para seus clientes via WhatsApp ou Email.
                  </p>
                  <div className="flex gap-2 mb-2">
                     <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Promotores (9-10)</span>
                     <span className="text-sm text-gray-600">São direcionados para avaliar sua empresa no Google (se configurado).</span>
                  </div>
                  <div className="flex gap-2">
                     <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Detratores (0-6)</span>
                     <span className="text-sm text-gray-600">São direcionados para um formulário de feedback interno para conter a crise.</span>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">Configurando o Google Reviews</h3>
                  <ol className="list-decimal ml-5 space-y-2 text-gray-600">
                     <li>Vá em <strong>Configurações</strong> no menu lateral.</li>
                     <li>Na seção "Integrações HelloRating", siga o passo a passo para encontrar seu <strong>Place ID</strong>.</li>
                     <li>Cole o ID e clique em verificar. Ative a opção "Ativar redirecionamento automático".</li>
                     <li>Pronto! Seus clientes promotores agora aumentarão sua nota no Google automaticamente.</li>
                  </ol>
               </div>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Consultoria com Inteligência Artificial</h2>
            
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl">
               <h3 className="font-bold text-indigo-900 text-lg mb-2">HelloIA: Seu Analista de Dados</h3>
               <p className="text-indigo-800 mb-4">
                 Acesse a aba <strong>HelloIA</strong> para conversar com uma inteligência que tem acesso a todo o seu banco de dados (Leads e NPS).
               </p>
               <p className="font-medium text-indigo-900 mb-2">Exemplos de perguntas que você pode fazer:</p>
               <ul className="list-disc ml-5 space-y-1 text-indigo-800 italic">
                  <li>"Quem são os meus clientes detratores e o que eles disseram?"</li>
                  <li>"Qual o valor total de oportunidades paradas em negociação?"</li>
                  <li>"Me dê 3 sugestões para melhorar meu NPS baseado nos comentários recentes."</li>
                  <li>"Faça um resumo da saúde do meu negócio hoje."</li>
               </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <BookOpen size={24} className="text-primary-600"/> Central de Ajuda & Tutorial
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                activeTab === tab.id 
                  ? 'bg-white shadow-md text-primary-600 border border-primary-100 font-bold' 
                  : 'text-gray-600 hover:bg-white hover:shadow-sm'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
              {tab.id === 'onboarding' && (
                <span className="ml-auto bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">Novo</span>
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
           {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
