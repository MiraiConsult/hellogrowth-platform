import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Target, Lightbulb, Copy, Check, DollarSign } from 'lucide-react';
import { getMessageSuggestions, MessageSuggestion, ClientContext } from '@/components/MessageSuggestionEngine';

interface SalesCoachPanelProps {
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    type: 'lead' | 'nps';
    leadStatus?: string;
    value?: number;
    lastInteraction?: string;
    answers?: any;
  };
}

export const SalesCoachPanel: React.FC<SalesCoachPanelProps> = ({ client }) => {
  const [suggestions, setSuggestions] = useState<MessageSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MessageSuggestion | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [salesInsight, setSalesInsight] = useState<string>('');

  useEffect(() => {
    // Calcular dias desde último contato
    const daysSinceLastContact = client.lastInteraction
      ? Math.floor((Date.now() - new Date(client.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Montar contexto do cliente
    const context: ClientContext = {
      name: client.name,
      email: client.email,
      phone: client.phone,
      type: client.type,
      leadStatus: client.leadStatus,
      value: client.value,
      lastInteraction: client.lastInteraction,
      daysSinceLastContact,
      answers: client.answers,
      insightType: 'sales', // Coach de Vendas sempre foca em vendas
    };

    // Gerar sugestões
    const generatedSuggestions = getMessageSuggestions(context);
    
    // Filtrar apenas sugestões de vendas
    const salesSuggestions = generatedSuggestions.filter(s => s.type === 'sales' || s.type === 'offer');
    setSuggestions(salesSuggestions);
    
    // Selecionar primeira sugestão por padrão
    if (salesSuggestions.length > 0) {
      setSelectedSuggestion(salesSuggestions[0]);
    }

    // Gerar insight de vendas
    generateSalesInsight(context);
  }, [client]);

  const generateSalesInsight = (context: ClientContext) => {
    const firstName = context.name.split(' ')[0];
    const value = context.value || 0;
    const status = context.leadStatus || 'Novo';
    const days = context.daysSinceLastContact || 0;

    // Analisar respostas do formulário
    let mainInterest = 'os serviços';
    if (context.answers && Object.keys(context.answers).length > 0) {
      const firstAnswer = Object.values(context.answers)[0] as any;
      if (firstAnswer && typeof firstAnswer === 'object' && firstAnswer.value) {
        mainInterest = firstAnswer.value;
      }
    }

    // Gerar insight baseado no contexto
    let insight = '';
    
    if (value >= 5000) {
      insight = `🎯 **Lead de Alto Valor (R$ ${value.toLocaleString('pt-BR')})**\n\n`;
      insight += `${firstName} demonstrou interesse em ${mainInterest}. `;
      insight += `Com um valor potencial de R$ ${value.toLocaleString('pt-BR')}, este é um lead prioritário. `;
      
      if (status === 'Novo') {
        insight += `\n\n**Estratégia Recomendada:**\n`;
        insight += `• Agende uma reunião de descoberta o quanto antes\n`;
        insight += `• Prepare cases de sucesso similares\n`;
        insight += `• Foque em ROI e resultados mensuráveis\n`;
        insight += `• Ofereça uma proposta personalizada com condições especiais`;
      } else if (status === 'Negociação') {
        insight += `\n\n**Estratégia de Fechamento:**\n`;
        insight += `• Apresente proposta final com melhores condições\n`;
        insight += `• Crie senso de urgência (prazo limitado)\n`;
        insight += `• Ofereça bônus se fechar hoje\n`;
        insight += `• Resolva objeções de forma proativa`;
      }
    } else if (value >= 1000) {
      insight = `💰 **Lead Qualificado (R$ ${value.toLocaleString('pt-BR')})**\n\n`;
      insight += `${firstName} está interessado em ${mainInterest}. `;
      
      if (days > 7) {
        insight += `Atenção: ${days} dias sem contato. `;
        insight += `\n\n**Ação Urgente:**\n`;
        insight += `• Retome o contato imediatamente\n`;
        insight += `• Pergunte se ainda há interesse\n`;
        insight += `• Ofereça condição especial de reativação\n`;
        insight += `• Agende demonstração ou reunião`;
      } else {
        insight += `\n\n**Próximos Passos:**\n`;
        insight += `• Envie proposta comercial detalhada\n`;
        insight += `• Agende apresentação da solução\n`;
        insight += `• Destaque benefícios específicos\n`;
        insight += `• Prepare orçamento flexível`;
      }
    } else {
      insight = `🌱 **Lead em Desenvolvimento**\n\n`;
      insight += `${firstName} demonstrou interesse em ${mainInterest}. `;
      insight += `\n\n**Estratégia de Qualificação:**\n`;
      insight += `• Entenda melhor as necessidades específicas\n`;
      insight += `• Eduque sobre os benefícios da solução\n`;
      insight += `• Ofereça demonstração gratuita\n`;
      insight += `• Construa relacionamento antes de vender`;
    }

    setSalesInsight(insight);
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const handleGenerateMessage = () => {
    // Trigger para gerar nova mensagem (pode abrir modal ou expandir seção)
    console.log('Gerar nova mensagem');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold">Coach de Vendas IA</h2>
        </div>
        <p className="text-purple-100">
          Gere uma mensagem personalizada para o cliente baseada nas respostas do formulário
        </p>
      </div>

      {/* Sales Insight */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900">Análise Inteligente</h3>
        </div>
        <div className="prose prose-sm max-w-none">
          <div className="text-gray-700 whitespace-pre-wrap">{salesInsight}</div>
        </div>
      </div>

      {/* Dados do Cliente */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Lead</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Nome:</span>
            <p className="font-medium text-gray-900">{client.name}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Status:</span>
            <p className="font-medium text-gray-900">{client.leadStatus || 'Novo'}</p>
          </div>
          {client.value && (
            <div>
              <span className="text-sm text-gray-600">Valor Estimado:</span>
              <p className="font-medium text-green-600 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                R$ {client.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {client.lastInteraction && (
            <div>
              <span className="text-sm text-gray-600">Último Contato:</span>
              <p className="font-medium text-gray-900">
                {new Date(client.lastInteraction).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Message Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Sugestões de Abordagem</h3>
            <span className="ml-auto text-sm text-gray-500">{suggestions.length} estratégias</span>
          </div>

          {/* Tipos de Abordagem */}
          <div className="mb-6">
            <div className="grid grid-cols-1 gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => setSelectedSuggestion(suggestion)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${selectedSuggestion?.id === suggestion.id
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{suggestion.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{suggestion.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          Prioridade {suggestion.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{suggestion.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mensagens Geradas */}
          {selectedSuggestion && (
            <div className="space-y-4">
              {/* WhatsApp */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-green-900">💬 Mensagem WhatsApp</span>
                  <button
                    onClick={() => handleCopy(selectedSuggestion.whatsappMessage, 'whatsapp')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    {copiedField === 'whatsapp' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedSuggestion.whatsappMessage}
                </p>
              </div>

              {/* Email */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-blue-900">📧 Email</span>
                  <button
                    onClick={() => handleCopy(`Assunto: ${selectedSuggestion.emailSubject}\n\n${selectedSuggestion.emailBody}`, 'email')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                  >
                    {copiedField === 'email' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Assunto</span>
                    <p className="text-sm text-gray-900 font-medium mt-1">{selectedSuggestion.emailSubject}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Corpo</span>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-1">
                      {selectedSuggestion.emailBody}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dica */}
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 mb-1">💡 Dica de Vendas</p>
                    <p className="text-sm text-amber-700">
                      Personalize a mensagem com informações específicas do cliente. 
                      Substitua os campos entre [COLCHETES] com dados reais antes de enviar. 
                      Quanto mais personalizada, maior a taxa de conversão!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {suggestions.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Carregando sugestões de vendas...</p>
        </div>
      )}
    </div>
  );
};

export default SalesCoachPanel;