'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { 
  X, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Target,
  MessageSquare,
  CheckCircle,
  Loader2,
  Wand2,
  Eye,
  Edit3,
  Plus,
  Trash2,
  GripVertical,
  Send,
  Bot,
  User,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SupabaseClient } from '@supabase/supabase-js';

interface QuestionOption {
  id: string;
  text: string;
}

interface GeneratedQuestion {
  id: string;
  text: string;
  type: 'nps' | 'single_choice' | 'multiple_choice' | 'text';
  options: QuestionOption[];
  insight: string;
  conditional?: 'promoter' | 'passive' | 'detractor';
}

interface NPSConsultantProps {
  supabase: SupabaseClient | null;
  userId: string;
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
  | 'prize_config'
  | 'messages'
  | 'generation' 
  | 'review' 
  | 'complete';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  buttons?: { text: string; value: string }[];
}

export default function NPSConsultant({
  supabase,
  userId,
  onClose,
  onSaveCampaign,
  existingCampaign
}: NPSConsultantProps) {
  const tenantId = useTenantId();
  
  const [step, setStep] = useState<ConsultantStep>('welcome');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [objective, setObjective] = useState('');
  const [tone, setTone] = useState('');
  const [evaluationPoints, setEvaluationPoints] = useState<string[]>([]);
  const [googleRedirect, setGoogleRedirect] = useState(false);
  const [googleUrl, setGoogleUrl] = useState('');
  const [offerPrize, setOfferPrize] = useState(false);
  const [beforeGoogleMessage, setBeforeGoogleMessage] = useState('');
  const [afterGameMessage, setAfterGameMessage] = useState('');
  
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (supabase && tenantId) {
      loadBusinessProfile();
    }
  }, [supabase, tenantId]);

  const loadBusinessProfile = async () => {
    if (!supabase || !tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('business_profile')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
      
      if (data && !error) {
        setBusinessProfile(data);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (step === 'welcome' && chatMessages.length === 0) {
      addAssistantMessage(
        businessProfile 
          ? `Olá! Vou te ajudar a criar uma pesquisa NPS para ${businessProfile.business_name || 'seu negócio'}. Vamos começar?`
          : 'Olá! Vou te ajudar a criar uma pesquisa NPS. Vamos começar?',
        [
          { text: '✨ Começar agora', value: 'start' }
        ]
      );
    }
  }, [step, businessProfile]);

  const addAssistantMessage = (content: string, buttons?: { text: string; value: string }[]) => {
    setChatMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      buttons
    }]);
  };

  const addUserMessage = (content: string) => {
    setChatMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }]);
  };

  const handleButtonClick = async (value: string) => {
    if (value === 'start') {
      addUserMessage('Começar agora');
      setStep('objective');
      setTimeout(() => {
        addAssistantMessage(
          'Qual é o objetivo desta pesquisa NPS?',
          [
            { text: '📊 Medir satisfação geral', value: 'satisfacao_geral' },
            { text: '🎯 Avaliar serviço específico', value: 'servico_especifico' },
            { text: '📦 Pesquisa pós-venda', value: 'pos_venda' },
            { text: '🎉 Avaliar experiência em evento', value: 'evento' },
            { text: '✍️ Outro objetivo', value: 'outro' }
          ]
        );
      }, 500);
    } else if (step === 'objective') {
      handleObjectiveSelection(value);
    } else if (step === 'tone') {
      handleToneSelection(value);
    } else if (step === 'google_redirect') {
      handleGoogleRedirectSelection(value);
    } else if (step === 'prize_config') {
      handlePrizeSelection(value);
    } else if (step === 'evaluation_points' && value === 'ai_suggestions') {
      addUserMessage('Usar sugestões da IA');
      const suggestions = ['Atendimento', 'Qualidade do serviço', 'Tempo de resposta', 'Custo-benefício'];
      setEvaluationPoints(suggestions);
      setStep('google_redirect');
      setTimeout(() => {
        addAssistantMessage(
          'Quer redirecionar os clientes para avaliarem no Google após a pesquisa?',
          [
            { text: '✅ Sim', value: 'yes' },
            { text: '❌ Não', value: 'no' }
          ]
        );
      }, 500);
    }
  };

  const handleObjectiveSelection = (value: string) => {
    const objectiveTexts: Record<string, string> = {
      'satisfacao_geral': 'Medir satisfação geral dos clientes',
      'servico_especifico': 'Avaliar um serviço específico',
      'pos_venda': 'Pesquisa pós-venda',
      'evento': 'Avaliar experiência em um evento'
    };
    
    if (value === 'outro') {
      addUserMessage('Outro objetivo');
      addAssistantMessage('Por favor, descreva o objetivo da sua pesquisa NPS:');
    } else {
      const selectedText = objectiveTexts[value];
      addUserMessage(selectedText);
      setObjective(selectedText);
      setStep('tone');
      setTimeout(() => {
        addAssistantMessage(
          'Qual tom você prefere para as perguntas?',
          [
            { text: '🎯 Direto e objetivo', value: 'direto' },
            { text: '😊 Amigável e acolhedor', value: 'amigavel' },
            { text: '💼 Profissional', value: 'profissional' },
            { text: '🤝 Informal e descontraído', value: 'informal' }
          ]
        );
      }, 500);
    }
  };

  const handleToneSelection = (value: string) => {
    const toneTexts: Record<string, string> = {
      'direto': 'Direto e objetivo',
      'amigavel': 'Amigável e acolhedor',
      'profissional': 'Profissional',
      'informal': 'Informal e descontraído'
    };
    
    const selectedText = toneTexts[value];
    addUserMessage(selectedText);
    setTone(selectedText);
    setStep('evaluation_points');
    setTimeout(() => {
      addAssistantMessage(
        'Quais pontos você quer avaliar na pesquisa? (Digite separados por vírgula ou escolha sugestões)',
        [
          { text: '✨ Usar sugestões da IA', value: 'ai_suggestions' }
        ]
      );
    }, 500);
  };

  const handleGoogleRedirectSelection = (value: string) => {
    if (value === 'yes') {
      addUserMessage('Sim, quero redirecionar para o Google');
      setGoogleRedirect(true);
      addAssistantMessage('Cole aqui o link da sua página de avaliações do Google:');
    } else {
      addUserMessage('Não, apenas a pesquisa NPS');
      setGoogleRedirect(false);
      setStep('generation');
      startGeneration();
    }
  };

  const handlePrizeSelection = (value: string) => {
    if (value === 'yes') {
      addUserMessage('Sim, quero oferecer prêmio');
      setOfferPrize(true);
      addAssistantMessage('Ótimo! Agora escreva a mensagem que aparecerá DEPOIS do jogo, antes de redirecionar para o Google:');
      addAssistantMessage('💡 Exemplo: "Parabéns! Para liberar seu prêmio, nos avalie no Google na próxima tela."');
    } else {
      addUserMessage('Não, sem prêmio');
      setOfferPrize(false);
      addAssistantMessage('Escreva a mensagem que aparecerá antes de redirecionar para o Google:');
      addAssistantMessage('💡 Exemplo: "Obrigado! Agora nos avalie no Google para ajudar outros clientes."');
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    const message = userInput.trim();
    addUserMessage(message);
    setUserInput('');
    setIsLoading(true);

    try {
      if (step === 'objective' && objective === '') {
        setObjective(message);
        setStep('tone');
        setTimeout(() => {
          addAssistantMessage(
            'Qual tom você prefere para as perguntas?',
            [
              { text: '🎯 Direto e objetivo', value: 'direto' },
              { text: '😊 Amigável e acolhedor', value: 'amigavel' },
              { text: '💼 Profissional', value: 'profissional' },
              { text: '🤝 Informal e descontraído', value: 'informal' }
            ]
          );
        }, 500);
      } else if (step === 'evaluation_points') {
        const points = message.split(',').map(p => p.trim()).filter(p => p);
        setEvaluationPoints(points);
        setStep('google_redirect');
        setTimeout(() => {
          addAssistantMessage(
            'Quer redirecionar os clientes para avaliarem no Google após a pesquisa?',
            [
              { text: '✅ Sim', value: 'yes' },
              { text: '❌ Não', value: 'no' }
            ]
          );
        }, 500);
      } else if (step === 'google_redirect' && googleRedirect && !googleUrl) {
        setGoogleUrl(message);
        setStep('prize_config');
        setTimeout(() => {
          addAssistantMessage(
            'Quer oferecer um prêmio (game/sorteio) para incentivar a avaliação?',
            [
              { text: '🎁 Sim, com prêmio', value: 'yes' },
              { text: '📝 Não, sem prêmio', value: 'no' }
            ]
          );
        }, 500);
      } else if (step === 'prize_config' && offerPrize && !afterGameMessage) {
        setAfterGameMessage(message);
        setStep('generation');
        startGeneration();
      } else if (step === 'prize_config' && !offerPrize && !beforeGoogleMessage) {
        setBeforeGoogleMessage(message);
        setStep('generation');
        startGeneration();
      }
    } catch (error) {
      console.error('Erro:', error);
      addAssistantMessage('Desculpe, ocorreu um erro. Pode tentar novamente?');
    } finally {
      setIsLoading(false);
    }
  };

  const startGeneration = async () => {
    setIsGenerating(true);
    addAssistantMessage('✨ Gerando suas perguntas NPS com IA...');

    try {
      const prompt = `Você é um especialista em pesquisas NPS (Net Promoter Score).

Crie uma pesquisa NPS com as seguintes características:

**Objetivo:** ${objective}
**Tom:** ${tone}
**Pontos a avaliar:** ${evaluationPoints.join(', ')}
**Negócio:** ${businessProfile?.business_name || 'Empresa'}
**Descrição do negócio:** ${businessProfile?.description || 'Não informado'}

**Regras importantes:**
1. A PRIMEIRA pergunta SEMPRE deve ser a pergunta NPS padrão: "Em uma escala de 0 a 10, o quanto você recomendaria [empresa/serviço] para um amigo ou colega?"
2. Crie 2-4 perguntas complementares que ajudem a entender melhor a experiência do cliente
3. Inclua perguntas condicionais para promotores (9-10), passivos (7-8) e detratores (0-6)
4. Use o tom ${tone}
5. Foque nos pontos: ${evaluationPoints.join(', ')}

Retorne APENAS um JSON válido com este formato:
{
  "questions": [
    {
      "text": "texto da pergunta",
      "type": "nps" | "single_choice" | "multiple_choice" | "text",
      "options": ["opção 1", "opção 2"],
      "insight": "por que essa pergunta é importante",
      "conditional": "promoter" | "passive" | "detractor" (opcional)
    }
  ]
}`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) throw new Error('Erro na API');

      const data = await response.json();
      const parsed = JSON.parse(data.text);
      
      const questions: GeneratedQuestion[] = parsed.questions.map((q: any, index: number) => ({
        id: `q${index + 1}`,
        text: q.text,
        type: q.type,
        options: q.options ? q.options.map((opt: string, i: number) => ({
          id: `opt${i + 1}`,
          text: opt
        })) : [],
        insight: q.insight,
        conditional: q.conditional
      }));

      setGeneratedQuestions(questions);
      setStep('review');
      addAssistantMessage(`✅ ${questions.length} perguntas geradas! Revise abaixo e edite se necessário.`);
    } catch (error) {
      console.error('Erro ao gerar perguntas:', error);
      addAssistantMessage('❌ Erro ao gerar perguntas. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCampaign = async () => {
    if (!tenantId) {
      alert('Erro: tenant_id não encontrado');
      return;
    }

    setIsLoading(true);

    try {
      const campaignData = {
        tenant_id: tenantId,
        name: `Pesquisa NPS - ${objective}`,
        objective,
        tone,
        evaluation_points: evaluationPoints,
        google_redirect: googleRedirect,
        google_url: googleUrl,
        offer_prize: offerPrize,
        before_google_message: beforeGoogleMessage,
        after_game_message: afterGameMessage,
        questions: generatedQuestions,
        status: 'active',
        created_at: new Date().toISOString()
      };

      onSaveCampaign(campaignData);
      setStep('complete');
      addAssistantMessage('🎉 Pesquisa NPS criada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar pesquisa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddQuestion = () => {
    const newQuestion: GeneratedQuestion = {
      id: `q${generatedQuestions.length + 1}`,
      text: 'Nova pergunta',
      type: 'text',
      options: [],
      insight: 'Pergunta customizada'
    };
    setGeneratedQuestions([...generatedQuestions, newQuestion]);
    setEditingQuestionId(newQuestion.id);
  };

  const handleDeleteQuestion = (id: string) => {
    setGeneratedQuestions(generatedQuestions.filter(q => q.id !== id));
  };

  const handleEditQuestion = (id: string, updates: Partial<GeneratedQuestion>) => {
    setGeneratedQuestions(generatedQuestions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Assistente NPS</h2>
              <p className="text-sm text-gray-500">Criando sua pesquisa de satisfação</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' ? 'bg-purple-500' : 'bg-gray-200'
                    }`}>
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <div className={`rounded-2xl px-4 py-3 ${
                        msg.role === 'user' 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {msg.content}
                      </div>
                      {msg.buttons && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.buttons.map((btn, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleButtonClick(btn.value)}
                              className="px-4 py-2 bg-white border-2 border-purple-500 text-purple-500 rounded-xl hover:bg-purple-50 transition-colors font-medium"
                            >
                              {btn.text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {!['review', 'complete'].includes(step) && (
              <div className="p-6 border-t border-gray-200">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Digite sua resposta..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !userInput.trim()}
                    className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {step === 'review' && (
            <div className="w-1/2 border-l border-gray-200 flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Perguntas Geradas</h3>
                <p className="text-sm text-gray-500">Revise e edite conforme necessário</p>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {generatedQuestions.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500">Pergunta {index + 1}</span>
                        {question.type === 'nps' && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full font-medium">
                            NPS
                          </span>
                        )}
                        {question.conditional && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full font-medium">
                            {question.conditional === 'promoter' ? 'Promotores' : 
                             question.conditional === 'passive' ? 'Passivos' : 'Detratores'}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingQuestionId(editingQuestionId === question.id ? null : question.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Edit3 className="w-4 h-4 text-gray-600" />
                        </button>
                        {question.type !== 'nps' && (
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                    {editingQuestionId === question.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) => handleEditQuestion(question.id, { text: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    ) : (
                      <p className="text-gray-900 font-medium">{question.text}</p>
                    )}
                    {question.options.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {question.options.map((opt) => (
                          <div key={opt.id} className="text-sm text-gray-600">
                            • {opt.text}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2 italic">{question.insight}</p>
                  </div>
                ))}
                <button
                  onClick={handleAddQuestion}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-purple-500 hover:text-purple-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Adicionar pergunta
                </button>
              </div>
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={handleSaveCampaign}
                  disabled={isLoading}
                  className="w-full py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Salvar Pesquisa NPS
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
