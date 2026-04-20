import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import { Lead, NPSResponse, PlanType } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  isThinking?: boolean;
}

interface AIChatProps {
  leads: Lead[];
  npsData: NPSResponse[];
  activePlan: PlanType;
}

const AIChat: React.FC<AIChatProps> = ({ leads, npsData, activePlan }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      content: 'Olá! Sou seu **Consultor de HelloGrowth**. Posso analisar seus dados de vendas e satisfação para sugerir estratégias. \n\nPor exemplo: _"Por que meu NPS caiu?"_ ou _"Como recuperar os clientes detratores?"_'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use environment variable as per specific instructions
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''; 

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Data Context Serialization - Optimized for Analysis
      const leadsContext = leads.slice(0, 60).map(l => 
        `- [LEAD] ${l.name} | Status: ${l.status} | Valor: R$${l.value} | Origem: ${l.formSource} | Data: ${new Date(l.date).toLocaleDateString('pt-BR')}${l.notes ? ` | Obs: ${l.notes}` : ''}`
      ).join('\n');

      const npsContext = npsData.slice(0, 60).map(n => 
        `- [NPS] ${n.customerName} | Nota: ${n.score} (${n.status}) | Comentário: "${n.comment || 'N/A'}"${n.answers ? ` | Detalhes: ${JSON.stringify(n.answers)}` : ''}`
      ).join('\n');

      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        
        const systemInstruction = `
          ATUE COMO: Um Consultor Sênior de Customer Experience (CX) e Estratégia Comercial da plataforma HelloGrowth.
          
          SUA MISSÃO: Não apenas ler dados, mas INTERPRETAR padrões, DIAGNOSTICAR problemas e DAR SUGESTÕES TÁTICAS para o crescimento do negócio.
          
          === CONTEXTO DE DADOS VIVOS ===
          
          TABELA DE OPORTUNIDADES (CRM):
          ${leads.length > 0 ? leadsContext : "Sem dados de leads no momento."}
          
          TABELA DE FEEDBACK (NPS):
          ${npsData.length > 0 ? npsContext : "Sem dados de NPS no momento."}
          
          ================================
          
          DIRETRIZES DE RESPOSTA:
          1. **Analise o "Porquê"**: Se o usuário perguntar sobre detratores, procure padrões nos comentários (ex: preço, atendimento, prazo) e explique a causa raiz.
          2. **Ação Consultiva**: Sempre que identificar um problema (ex: nota baixa, venda perdida), sugira uma AÇÃO IMEDIATA (ex: "Ligue para o cliente X e ofereça Y", "Revise o script de vendas").
          3. **Memória de Conversa**: O usuário pode fazer perguntas de seguimento como "O que faço com ELES?". Você deve saber a quem "eles" se refere com base na mensagem anterior.
          4. **Formatação**: Use Markdown. Destaque números e nomes importantes em negrito. Use listas para planos de ação.
          5. **Personalidade**: Profissional, perspicaz, orientado a dados e proativo.
        `;

        // Construct Conversation History for Context Awareness
        const historyPayload = messages.filter(m => m.id !== '1').map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));
        
        // Add current message
        const currentContent = { role: 'user' as const, parts: [{ text: input }] };
        const fullContents = [...historyPayload, currentContent];

        const model = ai.getGenerativeModel({ 
          model: 'gemini-2.5-flash',
          systemInstruction: systemInstruction,
        });

        const result = await model.generateContent({
          contents: fullContents,
          generationConfig: {
            temperature: 0.4,
          },
        });

        const text = result.response.text();
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: text || 'Desculpe, não consegui processar a análise. Tente reformular.',
        }]);

      } else {
        // --- MOCK FALLBACK (Smarter Logic for Suggestions) ---
        await new Promise(resolve => setTimeout(resolve, 1500));

        let mockResponse = '';
        const lowerInput = input.toLowerCase();

        // Check context from previous messages (Simple heuristic for Mock)
        const lastBotMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
        const contextIsDetractors = lastBotMessage.includes('detratores') || lastBotMessage.includes('insatisfeitos');

        if ((lowerInput.includes('fazer') || lowerInput.includes('sugere') || lowerInput.includes('ação')) && (lowerInput.includes('detrator') || contextIsDetractors)) {
            mockResponse = `### 🚨 Plano de Recuperação de Detratores\n\nBaseado nas melhores práticas de CX, aqui está o que sugiro para os clientes insatisfeitos listados:\n\n1.  **Fechamento do Loop (Close the Loop):** Entre em contato em até 24h. A agilidade demonstra preocupação real.\n2.  **Escuta Ativa:** Não justifique o erro imediatamente. Deixe o cliente desabafar sobre o motivo da nota baixa.\n3.  **Compensação:** Se houve falha no serviço, ofereça um desconto na próxima compra ou um serviço cortesia para reconquistar a confiança.\n4.  **Ação Interna:** Registre o motivo da insatisfação nas notas do cliente para evitar reincidência.`;
        } else if (lowerInput.includes('detrator') || lowerInput.includes('insatisfeito')) {
           const detractors = npsData.filter(n => n.score <= 6);
           if (detractors.length > 0) {
             mockResponse = `Identifiquei **${detractors.length} clientes detratores** que precisam de atenção urgente:\n\n` + 
                            detractors.map(d => `- **${d.customerName}** (Nota ${d.score}): ${d.comment ? `_"${d.comment}"_` : 'Sem comentário'}`).join('\n') +
                            `\n\n💡 *Dica: Gostaria de sugestões sobre como abordar esses casos?*`;
           } else {
             mockResponse = "Ótima notícia! Analisei sua base e **não encontrei detratores** (notas 0 a 6) no momento. Seus clientes parecem satisfeitos.";
           }
        } else if (lowerInput.includes('promotor') || lowerInput.includes('elogio')) {
           const promoters = npsData.filter(n => n.score >= 9);
           mockResponse = `Você tem **${promoters.length} promotores** fiéis à marca:\n\n` + 
                          promoters.map(p => `- **${p.customerName}** (Nota ${p.score})`).join('\n') +
                          `\n\n🚀 *Sugestão: Que tal pedir para esses clientes avaliarem sua empresa no Google?*`;
        } else if (lowerInput.includes('venda') || lowerInput.includes('oportunidade') || lowerInput.includes('lead')) {
           const total = leads.reduce((sum, lead) => sum + lead.value, 0);
           const hotLeads = leads.filter(l => l.status === 'Negociação' || l.status === 'Novo').slice(0, 5);
           
           mockResponse = `### Análise de Vendas\n\n` +
                          `💰 **Pipeline Total:** R$ ${total.toLocaleString('pt-BR')}\n` +
                          `📊 **Oportunidades Ativas:** ${leads.length}\n\n` +
                          `**Leads Quentes para Priorizar:**\n` +
                          hotLeads.map(l => `- **${l.name}**: R$ ${l.value} (${l.status})`).join('\n');
        } else {
          mockResponse = "Entendi. Como seu consultor, posso analisar seus dados. Tente perguntar: 'Quem são os clientes insatisfeitos?' ou 'Qual minha taxa de conversão de vendas?'.";
        }

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'model',
          content: mockResponse,
        }]);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "Estou com dificuldade de acessar seus dados no momento. Verifique sua conexão ou tente novamente em instantes.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Quais clientes são detratores?",
    "Sugestões para melhorar vendas",
    "Analise meus feedbacks recentes",
    "Resuma a saúde do meu negócio"
  ];

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg text-white shadow-lg shadow-primary-200">
             <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">HelloGrowth AI</h2>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Consultor Conectado
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-primary-100 text-primary-600'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-primary-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
              }`}>
                 <ReactMarkdown 
                    components={{
                      strong: ({node, ...props}) => <span className="font-bold" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc ml-4 my-2 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal ml-4 my-2 space-y-1" {...props} />,
                      // Ensure blockquote is valid HTML and styled
                      blockquote: ({node, ...props}) => (
                        <blockquote className="border-l-4 border-primary-300 pl-3 italic my-2 text-gray-500 bg-gray-50 py-1 pr-2 rounded-r" {...props} />
                      ),
                      h3: ({node, ...props}) => <h3 className="font-bold text-base mt-2 mb-1 text-primary-800" {...props} />
                    }}
                 >
                   {msg.content}
                 </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full">
             <div className="flex max-w-[80%] gap-3">
               <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                 <Bot size={16} />
               </div>
               <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2 text-gray-400">
                 <Loader2 size={16} className="animate-spin" />
                 <span className="text-xs">Consultando base de dados e analisando...</span>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length < 3 && (
        <div className="p-4 bg-slate-50 flex gap-2 overflow-x-auto border-t border-gray-100">
          {suggestedQuestions.map((q, idx) => (
            <button 
              key={idx}
              onClick={() => { setInput(q); }} 
              className="whitespace-nowrap px-3 py-1.5 bg-white border border-primary-200 text-primary-700 text-xs rounded-full hover:bg-primary-50 transition-colors shadow-sm"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="relative flex items-end gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Peça uma análise ou sugestão..."
            className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm max-h-32 py-2 text-gray-800 placeholder-gray-400"
            rows={1}
            style={{ minHeight: '40px' }}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-0.5"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
