'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { 
  X, 
  ArrowRight, 
  Sparkles,
  Target,
  MessageSquare,
  CheckCircle,
  Loader2,
  Bot,
  User,
  MapPin,
  Gift,
  Palette
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface NPSGame {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface CampaignQuestion {
  id: string;
  text: string;
  type: 'text' | 'rating' | 'single';
  options?: string[];
}

interface NPSConsultantProps {
  supabase: SupabaseClient | null;
  onClose: () => void;
  onSaveCampaign: (campaignData: any) => void;
  existingCampaign?: any;
}

type ConsultantStep = 
  | 'welcome' 
  | 'objective' 
  | 'tone'
  | 'evaluation_points'
  | 'google_redirect'
  | 'prize_option'
  | 'select_game'
  | 'message_before_google'
  | 'message_after_game'
  | 'analysis' 
  | 'generation' 
  | 'review' 
  | 'complete';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  options?: { label: string; value: string; icon?: any }[];
}

interface NPSContext {
  campaignName: string;
  objective: string;
  tone: 'formal' | 'informal' | 'direct' | 'friendly';
  evaluationPoints: string;
  googleRedirect: boolean;
  hasPrize: boolean;
  selectedGameId?: string;
  messageBeforeGoogle?: string;
  messageAfterGame?: string;
}

const NPSConsultant: React.FC<NPSConsultantProps> = ({ 
  supabase, 
  onClose, 
  onSaveCampaign,
  existingCampaign 
}) => {
  const tenantId = useTenantId();
  const [currentStep, setCurrentStep] = useState<ConsultantStep>('welcome');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [npsContext, setNpsContext] = useState<NPSContext>({
    campaignName: '',
    objective: '',
    tone: 'friendly',
    evaluationPoints: '',
    googleRedirect: false,
    hasPrize: false
  });
  const [generatedQuestions, setGeneratedQuestions] = useState<CampaignQuestion[]>([]);
  const [availableGames, setAvailableGames] = useState<NPSGame[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (currentStep !== 'welcome' && currentStep !== 'complete') {
      inputRef.current?.focus();
    }
  }, [currentStep]);

  // Mensagem inicial
  useEffect(() => {
    if (!initialMessageSent && chatMessages.length === 0) {
      setInitialMessageSent(true);
      setTimeout(() => {
        addAssistantMessage(
          "👋 Olá! Sou seu assistente de pesquisas NPS.\n\n" +
          "Vou te ajudar a criar uma pesquisa inteligente que mede a satisfação dos seus clientes e pode até incluir gamificação para aumentar as avaliações no Google!\n\n" +
          "Vamos começar?",
          [{ label: "Vamos começar!", value: "start", icon: Sparkles }]
        );
      }, 500);
    }
  }, [initialMessageSent, chatMessages.length]);

  // Buscar games disponíveis
  useEffect(() => {
    if (supabase && tenantId) {
      fetchGames();
    }
  }, [supabase, tenantId]);

  const fetchGames = async () => {
    if (!supabase || !tenantId) return;
    try {
      const { data, error } = await supabase
        .from('nps_games')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
      
      if (!error && data) {
        setAvailableGames(data);
      }
    } catch (error) {
      console.error('Erro ao buscar games:', error);
    }
  };

  const addAssistantMessage = (content: string, options?: { label: string; value: string; icon?: any }[]) => {
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date(),
        options
      }]);
      setIsTyping(false);
    }, 800);
  };

  const addUserMessage = (content: string) => {
    setChatMessages(prev => [...prev, {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }]);
  };

  const handleOptionClick = (value: string, label: string) => {
    addUserMessage(label);
    
    switch (value) {
      case 'start':
        setCurrentStep('objective');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Para começar, me conte: **qual é o objetivo desta pesquisa NPS?**\n\n" +
            "💡 **Exemplos:**\n" +
            "• Medir satisfação geral dos clientes\n" +
            "• Avaliar um serviço específico (ex: atendimento, produto)\n" +
            "• Pesquisa pós-venda\n" +
            "• Avaliar experiência em um evento\n\n" +
            "Quanto mais específico, melhor!"
          );
        }, 500);
        break;

      case 'objective_input':
        setNpsContext(prev => ({ ...prev, campaignName: userInput, objective: userInput }));
        setCurrentStep('tone');
        setTimeout(() => {
          addAssistantMessage(
            `Ótimo! Então a pesquisa será sobre: "${userInput}"\n\n` +
            "**Qual tom você prefere para as perguntas?**",
            [
              { label: "🎯 Direto - Objetivo e sem rodeios", value: "tone_direct" },
              { label: "😊 Informal - Descontraído e amigável", value: "tone_informal" },
              { label: "👔 Formal - Profissional e corporativo", value: "tone_formal" },
              { label: "💚 Amigável - Acolhedor e empático", value: "tone_friendly" }
            ]
          );
        }, 500);
        break;

      case 'tone_direct':
      case 'tone_informal':
      case 'tone_formal':
      case 'tone_friendly':
        const toneMap: Record<string, 'formal' | 'informal' | 'direct' | 'friendly'> = {
          'tone_direct': 'direct',
          'tone_informal': 'informal',
          'tone_formal': 'formal',
          'tone_friendly': 'friendly'
        };
        setNpsContext(prev => ({ ...prev, tone: toneMap[value] }));
        setCurrentStep('evaluation_points');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Agora me conte: **quais pontos você quer avaliar além da nota NPS?**\n\n" +
            "💡 **Exemplos:**\n" +
            "• Qualidade do atendimento\n" +
            "• Tempo de resposta\n" +
            "• Qualidade do produto/serviço\n" +
            "• Facilidade de uso\n" +
            "• Custo-benefício\n\n" +
            "A IA vai criar perguntas complementares baseadas nisso!"
          );
        }, 500);
        break;

      case 'evaluation_points_input':
        setNpsContext(prev => ({ ...prev, evaluationPoints: userInput }));
        setCurrentStep('google_redirect');
        setTimeout(() => {
          addAssistantMessage(
            "Ótimo! Agora uma pergunta importante:\n\n" +
            "**Você quer redirecionar os clientes para avaliar no Google Reviews?**\n\n" +
            "💡 Isso é útil para aumentar suas avaliações públicas no Google!",
            [
              { label: "✅ Sim, redirecionar para o Google", value: "google_yes" },
              { label: "❌ Não, apenas coletar feedback interno", value: "google_no" }
            ]
          );
        }, 500);
        break;

      case 'google_yes':
        setNpsContext(prev => ({ ...prev, googleRedirect: true }));
        setCurrentStep('prize_option');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Vou configurar o redirecionamento para o Google.\n\n" +
            "**Quer oferecer um prêmio para incentivar a avaliação?**\n\n" +
            "💡 Com gamificação (ex: Roleta da Sorte), você aumenta muito a taxa de avaliações!",
            [
              { label: "🎁 Sim, quero oferecer prêmio", value: "prize_yes" },
              { label: "❌ Não, sem prêmio", value: "prize_no" }
            ]
          );
        }, 500);
        break;

      case 'google_no':
        setNpsContext(prev => ({ ...prev, googleRedirect: false, hasPrize: false }));
        setCurrentStep('analysis');
        setTimeout(() => {
          addAssistantMessage(
            "Entendido! Vou criar uma pesquisa NPS focada em feedback interno.\n\n" +
            "⏳ **Gerando perguntas estratégicas...**"
          );
          runAIAnalysis();
        }, 500);
        break;

      case 'prize_yes':
        setNpsContext(prev => ({ ...prev, hasPrize: true }));
        if (availableGames.length > 0) {
          setCurrentStep('select_game');
          setTimeout(() => {
            addAssistantMessage(
              "🎮 **Ótimo! Você tem games cadastrados.**\n\n" +
              "Escolha qual game usar nesta pesquisa:",
              availableGames.map(game => ({
                label: `🎰 ${game.name}`,
                value: `game_${game.id}`
              }))
            );
          }, 500);
        } else {
          setTimeout(() => {
            addAssistantMessage(
              "⚠️ **Você ainda não tem nenhum game cadastrado!**\n\n" +
              "Para usar gamificação, você precisa primeiro criar uma Roleta da Sorte na tela de Games.\n\n" +
              "Por enquanto, vou criar a pesquisa sem prêmio. Você pode adicionar depois!",
              [{ label: "Ok, continuar sem prêmio", value: "continue_no_prize" }]
            );
          }, 500);
        }
        break;

      case 'continue_no_prize':
        setNpsContext(prev => ({ ...prev, hasPrize: false }));
        setCurrentStep('message_before_google');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Agora personalize a **mensagem que aparece antes de redirecionar para o Google**:\n\n" +
            "💡 **Sugestão:** \"Obrigado pelo feedback! Agora nos avalie no Google para ajudar outros clientes.\"\n\n" +
            "Digite sua mensagem:"
          );
        }, 500);
        break;

      default:
        if (value.startsWith('game_')) {
          const gameId = value.replace('game_', '');
          setNpsContext(prev => ({ ...prev, selectedGameId: gameId }));
          setCurrentStep('message_after_game');
          setTimeout(() => {
            addAssistantMessage(
              "Perfeito! Agora personalize a **mensagem que aparece DEPOIS do cliente jogar**:\n\n" +
              "💡 **Sugestão:** \"Parabéns! Para liberar seu prêmio, nos avalie no Google na próxima tela.\"\n\n" +
              "Digite sua mensagem:"
            );
          }, 500);
        }
        break;
    }
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const message = userInput.trim();
    addUserMessage(message);
    setUserInput('');

    switch (currentStep) {
      case 'objective':
        handleOptionClick('objective_input', message);
        break;
      case 'evaluation_points':
        handleOptionClick('evaluation_points_input', message);
        break;
      case 'message_before_google':
        setNpsContext(prev => ({ ...prev, messageBeforeGoogle: message }));
        setCurrentStep('analysis');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Agora vou gerar as perguntas da pesquisa.\n\n" +
            "⏳ **Criando perguntas estratégicas...**"
          );
          runAIAnalysis();
        }, 500);
        break;
      case 'message_after_game':
        setNpsContext(prev => ({ ...prev, messageAfterGame: message }));
        setCurrentStep('analysis');
        setTimeout(() => {
          addAssistantMessage(
            "Perfeito! Agora vou gerar as perguntas da pesquisa.\n\n" +
            "⏳ **Criando perguntas estratégicas...**"
          );
          runAIAnalysis();
        }, 500);
        break;
    }
  };

  const runAIAnalysis = async () => {
    setCurrentStep('generation');
    setIsGenerating(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('API Key não configurada');

      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `
Você é um especialista em pesquisas NPS (Net Promoter Score).

CONTEXTO DA PESQUISA:
- Objetivo: ${npsContext.objective}
- Tom: ${npsContext.tone}
- Pontos a avaliar: ${npsContext.evaluationPoints}

TAREFA:
Gere exatamente 3-5 perguntas COMPLEMENTARES para acompanhar a pergunta NPS principal (0-10).

REGRAS:
1. A pergunta NPS principal já existe: "Em uma escala de 0 a 10, o quanto você recomendaria [empresa/serviço] para um amigo?"
2. Crie perguntas que ajudem a entender o PORQUÊ da nota
3. Foque nos pontos de avaliação mencionados
4. Use o tom especificado (${npsContext.tone})
5. Retorne APENAS um JSON array válido, sem markdown, sem \`\`\`

FORMATO:
[
  {
    "text": "Texto da pergunta",
    "type": "text" | "rating" | "single",
    "options": ["Opção1", "Opção2"] // apenas se type for "single"
  }
]

Gere as perguntas agora:
`;

      const result = await model.generateContent(prompt);
      const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      
      let generated = JSON.parse(cleanJson);
      
      if (Array.isArray(generated) && generated.length > 0) {
        const questions: CampaignQuestion[] = generated.map((q: any, idx: number) => ({
          id: `q_${Date.now()}_${idx}`,
          text: q.text,
          type: q.type || 'text',
          options: q.options || []
        }));

        setGeneratedQuestions(questions);
        setCurrentStep('review');
        setIsGenerating(false);

        setTimeout(() => {
          addAssistantMessage(
            `✅ **Perguntas geradas com sucesso!**\n\n` +
            `Criei ${questions.length} perguntas complementares para sua pesquisa NPS.\n\n` +
            `Você pode revisar e editar abaixo antes de salvar.`,
            [
              { label: "💾 Salvar Pesquisa", value: "save_survey" },
              { label: "🔄 Gerar Novamente", value: "regenerate" }
            ]
          );
        }, 500);
      } else {
        throw new Error('Resposta inválida da IA');
      }

    } catch (error) {
      console.error('Erro ao gerar perguntas:', error);
      // Fallback
      const fallbackQuestions: CampaignQuestion[] = [
        { id: 'q1', text: 'O que motivou sua nota?', type: 'text' },
        { id: 'q2', text: 'O que podemos melhorar?', type: 'text' },
        { id: 'q3', text: 'Você voltaria a fazer negócio conosco?', type: 'single', options: ['Sim', 'Talvez', 'Não'] }
      ];

      setGeneratedQuestions(fallbackQuestions);
      setCurrentStep('review');
      setIsGenerating(false);

      setTimeout(() => {
        addAssistantMessage(
          `✅ **Perguntas criadas!**\n\n` +
          `Criei 3 perguntas complementares padrão para sua pesquisa NPS.\n\n` +
          `Você pode revisar e editar abaixo antes de salvar.`,
          [
            { label: "💾 Salvar Pesquisa", value: "save_survey" },
            { label: "🔄 Gerar Novamente", value: "regenerate" }
          ]
        );
      }, 500);
    }
  };

  const handleSaveSurvey = () => {
    const campaignData = {
      name: npsContext.campaignName || 'Pesquisa NPS',
      description: npsContext.objective,
      status: 'Ativa',
      type: 'NPS',
      enableRedirection: npsContext.googleRedirect,
      questions: generatedQuestions,
      game_id: npsContext.selectedGameId || null,
      game_config: {
        messageBeforeGoogle: npsContext.messageBeforeGoogle,
        messageAfterGame: npsContext.messageAfterGame
      }
    };

    onSaveCampaign(campaignData);
    
    setCurrentStep('complete');
    setTimeout(() => {
      addAssistantMessage(
        "🎉 **Pesquisa NPS criada com sucesso!**\n\n" +
        "Sua pesquisa está pronta para ser enviada aos clientes.\n\n" +
        "Você pode compartilhar o link, gerar QR Code ou enviar em massa!",
        [{ label: "✅ Concluir", value: "close" }]
      );
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Assistente NPS</h2>
              <p className="text-sm text-gray-500">Criando sua pesquisa de satisfação</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === 'assistant' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gray-300'
                }`}>
                  {msg.role === 'assistant' ? <Bot size={18} className="text-white" /> : <User size={18} className="text-gray-700" />}
                </div>
                <div>
                  <div className={`rounded-2xl p-4 ${
                    msg.role === 'assistant' ? 'bg-gray-100 text-gray-900' : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content.split('\n').map((line, i) => {
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return <div key={i} className="font-bold mt-2 mb-1">{line.replace(/\*\*/g, '')}</div>;
                        }
                        if (line.startsWith('•')) {
                          return <div key={i} className="ml-4">{line}</div>;
                        }
                        if (line.startsWith('💡')) {
                          return <div key={i} className="mt-2 text-xs opacity-80">{line}</div>;
                        }
                        return <div key={i}>{line}</div>;
                      })}
                    </div>
                  </div>
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.options.map((opt, idx) => {
                        const Icon = opt.icon || ArrowRight;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleOptionClick(opt.value, opt.label)}
                            className="w-full flex items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                          >
                            <Icon size={20} className="text-purple-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                  <Bot size={18} className="text-white" />
                </div>
                <div className="rounded-2xl p-4 bg-gray-100">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Review Section */}
          {currentStep === 'review' && generatedQuestions.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="text-purple-500" size={24} />
                Perguntas Geradas
              </h3>
              <div className="space-y-3">
                {/* Pergunta NPS Principal */}
                <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      NPS
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Em uma escala de 0 a 10, o quanto você recomendaria nosso serviço para um amigo?
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Tipo: Escala 0-10 (Pergunta NPS obrigatória)</p>
                    </div>
                  </div>
                </div>

                {/* Perguntas Complementares */}
                {generatedQuestions.map((q, idx) => (
                  <div key={q.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{q.text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Tipo: {q.type === 'text' ? 'Texto livre' : q.type === 'rating' ? 'Avaliação' : 'Múltipla escolha'}
                        </p>
                        {q.options && q.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {q.options.map((opt, i) => (
                              <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{opt}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && currentStep !== 'analysis' && currentStep !== 'generation' && currentStep !== 'review' && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Digite sua resposta..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!userInput.trim()}
                className="px-6 py-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons for Review */}
        {currentStep === 'review' && (
          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button
              onClick={() => {
                addUserMessage("Gerar novamente");
                setCurrentStep('analysis');
                setTimeout(() => {
                  addAssistantMessage("⏳ **Gerando novas perguntas...**");
                  runAIAnalysis();
                }, 500);
              }}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <Loader2 size={20} />
              Gerar Novamente
            </button>
            <button
              onClick={() => {
                addUserMessage("Salvar pesquisa");
                handleSaveSurvey();
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              Salvar Pesquisa
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NPSConsultant;
