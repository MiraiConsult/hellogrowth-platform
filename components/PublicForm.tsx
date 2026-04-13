import React, { useState, useEffect } from 'react';
import { Form, InitialField } from '@/types';
import { CheckCircle, ArrowRight, ArrowLeft, Check, ShieldCheck, X, Sparkles } from 'lucide-react';
import SpinWheel from './SpinWheel';

interface PublicFormProps {
  form: Form;
  onClose: () => void;
  onSubmit: (answers: any) => Promise<boolean>;
  isPreview?: boolean;
  companyName?: string;
  logoUrl?: string;
}

// Helper para detectar se uma opção é "Outro"
const isOtherOption = (label: string): boolean => {
  return label.trim().toLowerCase() === 'outro' || label.trim().toLowerCase() === 'other';
};

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

const PublicForm: React.FC<PublicFormProps> = ({ form, onClose, onSubmit, isPreview = false, companyName, logoUrl }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAnalyzingScreen, setShowAnalyzingScreen] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [gameData, setGameData] = useState<any>(null);
  const [loadingGame, setLoadingGame] = useState(false);

  const [patientData, setPatientData] = useState({ name: '', email: '', phone: '' });
  const [showIntro, setShowIntro] = useState(true);

  // Persistência de progresso via localStorage
  const STORAGE_KEY = `hg_form_progress_${form.id}`;
  const [savedProgress, setSavedProgress] = useState<{ step: number; answers: Record<string, any>; patientData: { name: string; email: string; phone: string } } | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Carregar progresso salvo ao montar o componente
  useEffect(() => {
    if (isPreview) return; // Não persistir em modo preview
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Só mostrar banner se há pelo menos uma resposta salva
        if (parsed && parsed.step >= 0 && Object.keys(parsed.answers || {}).length > 0) {
          setSavedProgress(parsed);
          setShowResumePrompt(true);
        }
      }
    } catch (e) {
      // Ignorar erros de localStorage
    }
  }, []);

  // Salvar progresso automaticamente a cada mudança
  useEffect(() => {
    if (isPreview || showIntro || isCompleted) return;
    try {
      const progress = { step: currentStep, answers, patientData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      // Ignorar erros de localStorage
    }
  }, [currentStep, answers, patientData, showIntro, isCompleted]);

  const handleResume = () => {
    if (!savedProgress) return;
    setPatientData(savedProgress.patientData || { name: '', email: '', phone: '' });
    setAnswers(savedProgress.answers || {});
    setCurrentStep(savedProgress.step || 0);
    setShowIntro(false);
    setShowResumePrompt(false);
  };

  const handleStartFresh = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    setSavedProgress(null);
    setShowResumePrompt(false);
  };

  const clearProgress = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  };

  // Carregar dados do game (prêmios reais) quando o form tem game_id
  useEffect(() => {
    const gameId = form.game_id;
    if (gameId && form.game_enabled && !gameData && !loadingGame) {
      setLoadingGame(true);
      fetch(`/api/games?id=${gameId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setGameData(data);
        })
        .catch(err => console.error('Erro ao carregar game:', err))
        .finally(() => setLoadingGame(false));
    }
  }, [form.game_id, form.game_enabled]);

  const hasGame = !!(form.game_id && form.game_enabled);
  const rawInitialFields: InitialField[] = form.initialFields || [
    { field: 'name', label: 'Nome Completo', placeholder: 'Seu nome', required: true, enabled: true },
    { field: 'email', label: 'Email', placeholder: 'seu@email.com', required: true, enabled: true },
    { field: 'phone', label: 'Telefone / WhatsApp', placeholder: '(00) 00000-0000', required: true, enabled: true }
  ];
  // Se o game estiver ativo, forçar campo phone como obrigatório e habilitado
  const initialFields: InitialField[] = hasGame
    ? rawInitialFields.map((f: InitialField) => f.field === 'phone' ? { ...f, required: true, enabled: true } : f)
    : rawInitialFields;

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

  // Handler para o campo de texto livre da opção "Outro"
  const handleOtherTextChange = (questionId: string, optionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        otherTexts: {
          ...(prev[questionId]?.otherTexts || {}),
          [optionId]: text,
        }
      }
    }));
  };


  const handleNext = async () => {
    // Validar pergunta obrigatória
    const q = form.questions[currentStep];
    if (q.required) {
      const ans = answers[q.id];
      const isEmpty = !ans || (Array.isArray(ans.value) ? ans.value.length === 0 : !ans.value || String(ans.value).trim() === '');
      if (isEmpty) {
        alert('Esta pergunta é obrigatória. Por favor, responda antes de continuar.');
        return;
      }
    }
    if (currentStep < form.questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Aguardar salvamento antes de mostrar sucesso
      setIsSubmitting(true);
      try {
        const success = await onSubmit({ patient: patientData, answers });
        if (success) {
          // Limpar progresso salvo após envio bem-sucedido
          clearProgress();
          // Mostrar tela de "analisando" por 5 segundos antes de concluir
          setShowAnalyzingScreen(true);
          setTimeout(() => {
            setShowAnalyzingScreen(false);
            // Se game_enabled, mostrar roleta; senão, mostrar tela de sucesso
            if (form.game_enabled) {
              setShowGame(true);
            } else {
              setIsCompleted(true);
            }
          }, 5000);
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

  // Tela de carregamento/análise de 5 segundos
  if (showAnalyzingScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ colorScheme: 'light' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analisando suas respostas...</h2>
          <p className="text-gray-600 mb-6">
            Nossa inteligência artificial está processando seu perfil para oferecer a melhor experiência.
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all ease-linear"
              style={{ 
                width: '100%',
                animation: 'loadingBar 5s linear forwards'
              }}
            />
          </div>
          <p className="text-xs text-gray-400">Isso levará apenas alguns segundos</p>
          <style>{`
            @keyframes loadingBar {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Mostrar roleta se game_enabled
  if (showGame && gameData) {
    return (
      <SpinWheel
        prizes={gameData.prizes || []}
        gameId={gameData.id}
        clientName={patientData.name}
        clientEmail={patientData.email}
        clientPhone={patientData.phone}
        participationPolicy={gameData.participation_policy || 'unlimited'}
        prizeValidityDays={gameData.prize_validity_days || 7}
        customMessage={gameData.messages?.before || 'Parabéns! Gire a roleta e ganhe um prêmio especial!'}
        source="pre-sale"
        onComplete={() => setIsCompleted(true)}
        onPhoneChange={(p) => setPatientData(prev => ({ ...prev, phone: p }))}
      />
    );
  }

  // Se showGame mas gameData ainda não carregou, mostrar loading
  if (showGame && !gameData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ colorScheme: 'light' }}>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Preparando sua surpresa...</h2>
          <p className="text-gray-600">Aguarde um momento!</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-50 flex flex-col relative" style={{ colorScheme: 'light', backgroundColor: '#f9fafb', color: '#111827' }}>
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
        <div className="flex items-center gap-2">
          {logoUrl && (form as any).show_logo ? (
            <img src={logoUrl} alt={displayCompanyName} className="h-14 w-auto max-w-[220px] object-contain" />
          ) : (
            <>
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                {companyInitial}
              </div>
              <span className="font-bold text-gray-800 hidden sm:block">{displayCompanyName}</span>
            </>
          )}
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ backgroundColor: '#ffffff', color: '#111827' }}>
              {/* Banner de retomada de progresso */}
              {showResumePrompt && savedProgress && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in duration-300">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-emerald-800 mb-0.5">Você tem um preenchimento em andamento</p>
                      <p className="text-xs text-emerald-600 mb-3">
                        Pergunta {savedProgress.step + 1} de {form.questions.length} &mdash; {Object.keys(savedProgress.answers).length} {Object.keys(savedProgress.answers).length === 1 ? 'resposta salva' : 'respostas salvas'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleResume}
                          className="flex-1 py-2 px-3 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                        >
                          Continuar de onde parei
                        </button>
                        <button
                          onClick={handleStartFresh}
                          className="py-2 px-3 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors"
                        >
                          Começar do zero
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 min-h-[400px] flex flex-col animate-in fade-in slide-in-from-right-8 duration-300" key={currentStep} style={{ backgroundColor: '#ffffff', color: '#111827' }}>
              <div className="flex-1">
                <span className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2 block">
                  Pergunta {currentStep + 1} de {form.questions.length}
                </span>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-8 leading-tight">
                  {currentQuestion.text}{currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
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

                  {(currentQuestion.type === 'multiple' || currentQuestion.type === 'multiple_choice') && currentQuestion.options && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>Você pode selecionar <strong>mais de uma opção</strong> nesta pergunta.</span>
                    </div>
                  )}

                  {(currentQuestion.type === 'single' || currentQuestion.type === 'multiple' || currentQuestion.type === 'single_choice' || currentQuestion.type === 'multiple_choice') && currentQuestion.options && (
                    <div className="grid gap-3">
                      {currentQuestion.options?.map((rawOpt, optIdx) => {
                         // Normalizar opção: suporta string simples, {text}, {label}, {id, label, ...}
                         const rawOptAny: any = rawOpt;
                         const normalizedLabel = typeof rawOptAny === 'string' ? rawOptAny : getOptionLabel(rawOptAny);
                         const normalizedId = typeof rawOptAny === 'string' ? `opt_${optIdx}_${rawOptAny}` : (rawOptAny.id || `opt_${optIdx}`);
                         const opt: any = typeof rawOptAny === 'string'
                           ? { id: normalizedId, label: normalizedLabel }
                           : { ...rawOptAny, id: normalizedId, label: normalizedLabel };
                         const optLabel = normalizedLabel || '';
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
                            {isSelected && isOtherOption(optLabel) && !opt.followUpLabel && (
                              <div className="mt-3 pl-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-sm font-medium text-gray-600 mb-1">Qual seria essa outra opção?</label>
                                <input
                                  type="text"
                                  value={answers[currentQuestion.id]?.otherTexts?.[opt.id] || ''}
                                  onChange={(e) => handleOtherTextChange(currentQuestion.id, opt.id, e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                                  placeholder="Descreva aqui..."
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
      
      <div className="py-8 text-center flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-widest text-gray-300">Powered by</span>
        <span className="text-base font-bold" style={{ background: 'linear-gradient(to right, #1e6b4a, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>HelloGrowth</span>
      </div>
    </div>
  );
};

export default PublicForm;
