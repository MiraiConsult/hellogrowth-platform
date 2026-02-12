
import React, { useState } from 'react';
import { Form, InitialField } from '@/types';
import { CheckCircle, ArrowRight, ArrowLeft, Check, ShieldCheck, X } from 'lucide-react';

interface PublicFormProps {
  form: Form;
  onClose: () => void;
  onSubmit: (answers: any) => Promise<boolean>;
  isPreview?: boolean;
  companyName?: string;
}

// CORREÇÃO: Helper function que extrai o texto da opção independente do formato
// Suporta: string, {label: string}, {text: string}, {label: {text: string}}
const getOptionLabel = (opt: any): string => {
  if (!opt) return '';
  if (typeof opt === 'string') return opt;
  
  // Se label é um objeto com text (caso do bug)
  if (opt.label && typeof opt.label === 'object' && opt.label.text) {
    return opt.label.text;
  }
  
  // Se label é string
  if (opt.label && typeof opt.label === 'string') {
    return opt.label;
  }
  
  // Se text é string
  if (opt.text && typeof opt.text === 'string') {
    return opt.text;
  }
  
  return '';
};

const PublicForm: React.FC<PublicFormProps> = ({ form, onClose, onSubmit, isPreview = false, companyName }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [patientData, setPatientData] = useState({ name: '', email: '', phone: '' });
  const [showIntro, setShowIntro] = useState(true);

  const initialFields: InitialField[] = form.initialFields || [
    { field: 'name', label: 'Nome Completo', placeholder: 'Seu nome', required: true, enabled: true },
    { field: 'email', label: 'Email', placeholder: 'seu@email.com', required: true, enabled: true },
    { field: 'phone', label: 'Telefone / WhatsApp', placeholder: '(00) 00000-0000', required: true, enabled: true }
  ];

  const enabledFields = initialFields.filter(f => f.enabled);

  const displayCompanyName = companyName || 'Sua Empresa';
  const companyInitial = displayCompanyName.charAt(0).toUpperCase();

  const handleStart = () => {
    const allRequiredFilled = enabledFields
      .filter(f => f.required)
      .every(f => patientData[f.field].trim() !== '');
    
    if (allRequiredFilled) {
      setShowIntro(false);
    }
  };

  const handleAnswer = (questionId: string, value: any, option?: any) => {
    setAnswers(prev => {
      const question = form.questions.find(q => q.id === questionId);
      if (!question) return prev;

      if (question.type === 'multiple') {
        const currentAnswer = prev[questionId] || { value: [], optionSelected: [], followUps: {} };
        const currentValues = Array.isArray(currentAnswer.value) ? currentAnswer.value : [];
        const currentOptions = Array.isArray(currentAnswer.optionSelected) ? currentAnswer.optionSelected : [];
        const currentFollowUps = currentAnswer.followUps || {};

        if (currentValues.includes(value)) {
          const newValues = currentValues.filter((v: string) => v !== value);
          const newOptions = currentOptions.filter((o: any) => getOptionLabel(o) !== value);
          delete currentFollowUps[option?.id];
          return {
            ...prev,
            [questionId]: {
              value: newValues,
              optionSelected: newOptions,
              followUps: currentFollowUps,
            }
          };
        } else {
          const newFollowUps = { ...currentFollowUps };
          if (option?.followUpLabel !== undefined) {
              newFollowUps[option.id] = '';
          }
          return {
            ...prev,
            [questionId]: {
              value: [...currentValues, value],
              optionSelected: [...currentOptions, option],
              followUps: newFollowUps,
            }
          };
        }
      }

      return {
        ...prev,
        [questionId]: {
          value,
          optionSelected: option,
          followUps: (question.type === 'single' && option?.followUpLabel !== undefined) ? { [option.id]: '' } : {},
        }
      };
    });
  };

  const handleFollowUpChange = (questionId: string, optionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        followUps: {
          ...prev[questionId].followUps,
          [optionId]: text,
        }
      }
    }));
  };


  const handleNext = async () => {
    if (currentStep < form.questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Aguardar salvamento antes de mostrar sucesso
      setIsSubmitting(true);
      try {
        const success = await onSubmit({ patient: patientData, answers });
        if (success) {
          setIsCompleted(true);
        } else {
          alert('Erro ao enviar formulário. Por favor, tente novamente.');
        }
      } catch (error) {
        console.error('Erro ao enviar:', error);
        alert('Erro ao enviar formulário. Por favor, tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const currentQuestion = form.questions[currentStep];
  const progress = ((currentStep + 1) / form.questions.length) * 100;

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ colorScheme: 'light' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Formulário Enviado!</h2>
          <p className="text-gray-600 mb-8">
            Obrigado, {patientData.name}. Suas respostas foram registradas e nossa equipe já está analisando seu perfil.
          </p>
          
          {isPreview && (
            <div className="pt-6 border-t border-gray-100">
               <button onClick={onClose} className="text-primary-600 hover:text-primary-700 font-medium">
                 Voltar ao início (Admin)
               </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative" style={{ colorScheme: 'light' }}>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
            {companyInitial}
          </div>
          <span className="font-bold text-gray-800 hidden sm:block">{displayCompanyName}</span>
        </div>
        <div className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1">
          <ShieldCheck size={12} /> Ambiente Seguro
        </div>
      </div>

      {isPreview && (
        <div className="absolute top-4 left-4 z-50">
             <button onClick={onClose} className="px-4 py-2 bg-white text-gray-700 shadow-md rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-100 border border-gray-200">
                 <X size={16} /> Fechar Visualização
             </button>
        </div>
      )}

      {!showIntro && (
        <div className="w-full bg-gray-200 h-1">
          <div 
            className="bg-primary-600 h-1 transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          
          {showIntro ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.name}</h1>
              <p className="text-gray-600 mb-8">Por favor, preencha seus dados para iniciarmos o atendimento.</p>
              
              <div className="space-y-4 mb-8">
                {enabledFields.map((field) => {
                  const inputType = field.field === 'email' ? 'email' : field.field === 'phone' ? 'tel' : 'text';
                  
                  return (
                    <div key={field.field}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input 
                        type={inputType}
                        value={patientData[field.field]}
                        onChange={(e) => setPatientData({...patientData, [field.field]: e.target.value})}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500 p-3 border bg-white text-gray-900 placeholder-gray-500"
                        style={{ backgroundColor: '#ffffff', color: '#111827' }}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={handleStart}
                disabled={!enabledFields.filter(f => f.required).every(f => patientData[f.field].trim() !== '')}
                className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                Iniciar Preenchimento <ArrowRight size={20} />
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[400px] flex flex-col animate-in fade-in slide-in-from-right-8 duration-300" key={currentStep}>
              <div className="flex-1">
                <span className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2 block">
                  Pergunta {currentStep + 1} de {form.questions.length}
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-8 leading-tight">
                  {currentQuestion.text}
                </h2>

                <div className="space-y-3">
                  {currentQuestion.type === 'text' && (
                    <textarea 
                      className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[150px] text-lg bg-white text-gray-900 placeholder-gray-500"
                      style={{ backgroundColor: '#ffffff', color: '#111827' }}
                      placeholder="Digite sua resposta..."
                      autoFocus
                      value={answers[currentQuestion.id]?.value || ''}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    />
                  )}

                  {(currentQuestion.type === 'single' || currentQuestion.type === 'multiple' || currentQuestion.type === 'single_choice' || currentQuestion.type === 'multiple_choice') && currentQuestion.options && (
                    <div className="grid gap-3">
                      {currentQuestion.options?.map((opt) => {
                         const optLabel = getOptionLabel(opt);
                         let isSelected = false;
                         if (currentQuestion.type === 'multiple' || currentQuestion.type === 'multiple_choice') {
                            const currentValues = answers[currentQuestion.id]?.value || [];
                            isSelected = Array.isArray(currentValues) && currentValues.includes(optLabel);
                         } else {
                            isSelected = answers[currentQuestion.id]?.value === optLabel;
                         }
                         
                         return (
                          <div key={opt.id}>
                            <button
                              onClick={() => handleAnswer(currentQuestion.id, optLabel, opt)}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                                isSelected 
                                  ? 'border-primary-500 shadow-sm'
                                  : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50'
                              }`}
                              style={{ 
                                  backgroundColor: isSelected ? '#ecfdf5' : '#ffffff', 
                                  borderColor: isSelected ? '#10b981' : undefined
                              }}
                            >
                              <span className="font-medium text-lg" style={{color: isSelected ? '#064e3b' : '#374151'}}>{optLabel}</span>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isSelected ? 'border-white bg-primary-500 text-white' : 'border-gray-300 group-hover:border-primary-300'
                              }`}>
                                {isSelected && <Check size={14} />}
                              </div>
                            </button>
                            {isSelected && opt.followUpLabel !== undefined && (
                              <div className="mt-3 pl-4 animate-in fade-in duration-300">
                                <label className="block text-sm font-medium text-gray-700 mb-1">{opt.followUpLabel || 'Por favor, especifique:'}</label>
                                <textarea
                                  value={answers[currentQuestion.id]?.followUps?.[opt.id] || ''}
                                  onChange={(e) => handleFollowUpChange(currentQuestion.id, opt.id, e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500 bg-white"
                                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                                  rows={2}
                                  autoFocus
                                />
                              </div>
                            )}
                          </div>
                         )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-100">
                <button 
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="px-4 py-2 text-gray-500 hover:text-gray-800 disabled:opacity-0 transition-opacity flex items-center gap-2"
                >
                  <ArrowLeft size={18} /> Anterior
                </button>
                <button 
                  onClick={handleNext}
                  disabled={isSubmitting || !answers[currentQuestion.id] || (Array.isArray(answers[currentQuestion.id]?.value) && answers[currentQuestion.id]?.value.length === 0)}
                  className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-200 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    currentStep === form.questions.length - 1 ? 'Finalizar' : 'Próximo'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="py-6 text-center text-gray-400 text-xs">
        <p>Powered by HelloGrowth</p>
      </div>
    </div>
  );
};

export default PublicForm;
