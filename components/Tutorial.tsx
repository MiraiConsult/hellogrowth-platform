
import React, { useState } from 'react';
import { BookOpen, CheckSquare, Users, Star, MessageSquare, BarChart3, ChevronRight, PlayCircle } from 'lucide-react';

const Tutorial: React.FC = () => {
  const [activeTab, setActiveTab] = useState('welcome');

  const tabs = [
    { id: 'welcome', label: 'Boas-vindas', icon: BookOpen },
    { id: 'forms', label: 'Pré-Venda (Formulários)', icon: CheckSquare },
    { id: 'kanban', label: 'Gestão de Oportunidades', icon: Users },
    { id: 'nps', label: 'Pós-Venda (NPS)', icon: Star },
    { id: 'ai', label: 'Inteligência Artificial', icon: MessageSquare },
  ];

  const renderContent = () => {
    switch (activeTab) {
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
        <div className="lg:w-64 flex-shrink-0 space-y-2">
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
