import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, CheckCircle, ArrowRight, ArrowLeft, Users } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Form, FormQuestion, InitialField } from '@/types';
import InitialFieldsConfig from '@/components/InitialFieldsConfig';

interface FormConsultantProps {
  supabase: any;
  userId: string;
  onClose: () => void;
  onSaveForm: (formData: any) => void;
  existingForm?: Form;
}

type Step = 'context' | 'analysis' | 'generation' | 'revision' | 'conclusion';

const FormConsultant: React.FC<FormConsultantProps> = ({ supabase, userId, onClose, onSaveForm, existingForm }) => {
  const [currentStep, setCurrentStep] = useState<Step>('context');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Form Data
  const [formName, setFormName] = useState(existingForm?.name || '');
  const [formDescription, setFormDescription] = useState(existingForm?.description || '');
  const [objective, setObjective] = useState<'qualify' | 'feedback' | 'custom'>('qualify');
  const [initialFields, setInitialFields] = useState<InitialField[]>(
    existingForm?.initialFields || [
      { field: 'name', label: 'Nome Completo', placeholder: 'Seu nome', required: true, enabled: true },
      { field: 'email', label: 'Email', placeholder: 'seu@email.com', required: true, enabled: true },
      { field: 'phone', label: 'Telefone / WhatsApp', placeholder: '(00) 00000-0000', required: false, enabled: true }
    ]
  );
  const [questions, setQuestions] = useState<FormQuestion[]>(existingForm?.questions || []);
  const [gameEnabled, setGameEnabled] = useState(existingForm?.game_enabled || false);

  const steps: { id: Step; label: string; icon: any }[] = [
    { id: 'context', label: 'Contexto', icon: Sparkles },
    { id: 'analysis', label: 'Análise', icon: Loader2 },
    { id: 'generation', label: 'Geração', icon: Loader2 },
    { id: 'revision', label: 'Revisão', icon: CheckCircle },
    { id: 'conclusion', label: 'Concluído', icon: CheckCircle }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleGenerateQuestions = async () => {
    if (!formName) return;
    
    setIsGenerating(true);
    setCurrentStep('analysis');

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        setCurrentStep('generation');
        
        const prompt = `
          Atue como um especialista em Vendas e Qualificação de Leads.
          
          CONTEXTO: "${formName}"
          DESCRIÇÃO: "${formDescription}"
          OBJETIVO: ${objective === 'qualify' ? 'Qualificar leads para vendas' : objective === 'feedback' ? 'Coletar feedback de clientes' : 'Personalizado'}
          
          Gere 5 perguntas estratégicas para este formulário.
          
          REGRAS:
          1. TODAS as perguntas devem ser do tipo "single" (Única Escolha) ou "multiple" (Múltipla Escolha).
          2. JAMAIS gere perguntas de texto livre ("text").
          3. Para cada pergunta, gere 3-5 opções de resposta relevantes.
          4. Cada opção deve ter um "value" (valor de oportunidade em R$) e um "script" (dica para o vendedor).
          
          Retorne APENAS um JSON válido com esta estrutura:
          [{ "text": "...", "type": "single|multiple", "options": [{"label": "...", "value": 100, "script": "..."}] }]
        `;
        
        const result = await model.generateContent(prompt);
        
        if (result.response.text()) {
          const generated = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
          const mapped = generated.map((q: any, index: number) => ({
            id: `q_${Date.now()}_${index}`,
            text: q.text,
            type: q.type,
            options: q.options?.map((opt: any, optIndex: number) => ({
              id: `opt_${Date.now()}_${index}_${optIndex}`,
              label: opt.label,
              value: opt.value || 0,
              linkedProduct: '',
              script: opt.script || ''
            })) || []
          }));
          
          setQuestions(mapped);
          setCurrentStep('revision');
        }
      } else {
        throw new Error("No API Key");
      }
    } catch (error) {
      console.error('Erro ao gerar perguntas:', error);
      // Fallback com perguntas padrão
      const fallbackQuestions: FormQuestion[] = [
        {
          id: `q_${Date.now()}_1`,
          text: 'Qual é o seu principal interesse?',
          type: 'single',
          options: [
            { id: 'opt1', label: 'Produto A', value: 100, script: 'Reforce os benefícios do Produto A', linkedProduct: 'Produto A' },
            { id: 'opt2', label: 'Produto B', value: 150, script: 'Destaque as vantagens do Produto B', linkedProduct: 'Produto B' },
            { id: 'opt3', label: 'Ainda não sei', value: 0, script: 'Ofereça uma consultoria gratuita', linkedProduct: '' }
          ]
        }
      ];
      setQuestions(fallbackQuestions);
      setCurrentStep('revision');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 'context') {
      handleGenerateQuestions();
    } else if (currentStep === 'revision') {
      // Salvar formulário
      onSaveForm({
        name: formName,
        description: formDescription,
        objective,
        identification_fields: initialFields,
        questions,
        game_enabled: gameEnabled
      });
      setCurrentStep('conclusion');
    }
  };

  const handleBack = () => {
    if (currentStep === 'revision') {
      setCurrentStep('context');
    }
  };

  const handleQuestionChange = (questionId: string, field: string, value: any) => {
    setQuestions(questions.map(q => q.id === questionId ? { ...q, [field]: value } : q));
  };

  const handleOptionChange = (questionId: string, optionId: string, field: string, value: any) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options?.map(opt => opt.id === optionId ? { ...opt, [field]: value } : opt)
        };
      }
      return q;
    }));
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      id: `q_${Date.now()}`,
      text: '',
      type: 'single',
      options: [
        { id: `opt_${Date.now()}_1`, label: '', value: 0, script: '', linkedProduct: '' }
      ]
    }]);
  };

  const handleRemoveQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleAddOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: [...(q.options || []), {
            id: `opt_${Date.now()}`,
            label: '',
            value: 0,
            script: '',
            linkedProduct: ''
          }]
        };
      }
      return q;
    }));
  };

  const handleRemoveOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options?.filter(opt => opt.id !== optionId)
        };
      }
      return q;
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-white rounded-lg">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Consultor HelloGrowth</h2>
              <p className="text-sm text-gray-600">Criação Inteligente de Formulários</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStepIndex === index;
            const isCompleted = currentStepIndex > index;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-emerald-500 text-white' :
                    isActive ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-500' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} className={isActive && (step.id === 'analysis' || step.id === 'generation') ? 'animate-spin' : ''} />}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${isActive ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-px flex-1 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'context' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Conte-nos sobre o formulário</h3>
                <p className="text-sm text-gray-600">Forneça informações para que possamos gerar perguntas personalizadas</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Formulário *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Anamnese Odontológica"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição / Contexto</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Formulário para qualificar pacientes interessados em implantes dentários..."
                  rows={4}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Objetivo do Formulário</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setObjective('qualify')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      objective === 'qualify' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🎯</div>
                      <div className="text-sm font-medium">Qualificar Leads</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setObjective('feedback')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      objective === 'feedback' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">💬</div>
                      <div className="text-sm font-medium">Coletar Feedback</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setObjective('custom')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      objective === 'custom' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">✨</div>
                      <div className="text-sm font-medium">Personalizado</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {(currentStep === 'analysis' || currentStep === 'generation') && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {currentStep === 'analysis' ? 'Analisando contexto...' : 'Gerando perguntas...'}
              </h3>
              <p className="text-sm text-gray-600">
                {currentStep === 'analysis' ? 'Entendendo o objetivo do seu formulário' : 'Criando perguntas estratégicas com IA'}
              </p>
            </div>
          )}

          {currentStep === 'revision' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Revise e edite suas perguntas</h3>
                <p className="text-sm text-gray-600">Você pode editar textos, modificar opções, mudar tipos e adicionar novas perguntas</p>
              </div>

              {/* Campos de Identificação */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={20} className="text-emerald-600" />
                  <h4 className="font-bold text-gray-900">Campos de Identificação</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">Defina quais informações coletar do cliente no início do formulário</p>
                <InitialFieldsConfig
                  initialFields={initialFields}
                  onChange={setInitialFields}
                />
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {questions.map((q, qIndex) => (
                  <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Pergunta {qIndex + 1}</label>
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                          placeholder="Digite a pergunta..."
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border text-sm"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveQuestion(q.id)}
                        className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {q.options?.map((opt, optIndex) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => handleOptionChange(q.id, opt.id, 'label', e.target.value)}
                            placeholder={`Opção ${optIndex + 1}`}
                            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border text-sm"
                          />
                          <button
                            onClick={() => handleRemoveOption(q.id, opt.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddOption(q.id)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        + Adicionar opção
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddQuestion}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                >
                  + Adicionar Nova Pergunta
                </button>
              </div>
            </div>
          )}

          {currentStep === 'conclusion' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Formulário criado com sucesso!</h3>
              <p className="text-sm text-gray-600 text-center max-w-md">
                Seu formulário foi salvo e está pronto para capturar leads qualificados.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={currentStep === 'conclusion' ? onClose : handleBack}
            disabled={currentStep === 'context' || currentStep === 'analysis' || currentStep === 'generation'}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {currentStep === 'conclusion' ? 'Fechar' : <><ArrowLeft size={16} /> Voltar</>}
          </button>
          {currentStep !== 'conclusion' && (
            <button
              onClick={handleNext}
              disabled={!formName || isGenerating}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === 'context' ? 'Gerar Perguntas' : 'Salvar Formulário'} <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormConsultant;
