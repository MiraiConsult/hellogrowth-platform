
import React, { useState } from 'react';
import { Campaign, NPSResponse, InitialField } from '@/types';
import { Star, Check, ArrowRight, ShieldCheck, MapPin, X, ChevronRight, MessageSquare } from 'lucide-react';

interface PublicSurveyProps {
  campaign: Campaign;
  onClose: () => void;
  onSubmit: (response: Partial<NPSResponse>) => void;
  isPreview?: boolean;
  settings?: any;
  companyName?: string;
}

const PublicSurvey: React.FC<PublicSurveyProps> = ({ campaign, onClose, onSubmit, isPreview = false, settings, companyName }) => {
  // State Definitions
  const [step, setStep] = useState<'intro' | 'score' | 'questions' | 'redirecting' | 'thankyou'>('intro');
  const [score, setScore] = useState<number | null>(null);
  const [respondent, setRespondent] = useState({ name: '', email: '', phone: '' });
  const [answers, setAnswers] = useState<{ question: string; answer: any }[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState<any>('');

  // Get initial fields configuration or use defaults
  const initialFields: InitialField[] = campaign.initialFields || [
    { field: 'name', label: 'Nome Completo', placeholder: 'Seu nome', required: true, enabled: true },
    { field: 'email', label: 'Email', placeholder: 'seu@email.com', required: false, enabled: true },
    { field: 'phone', label: 'Telefone / WhatsApp', placeholder: '(00) 00000-0000', required: false, enabled: true }
  ];

  const enabledFields = initialFields.filter(f => f.enabled);
  const hasRequiredFields = enabledFields.some(f => f.required);

  const displayCompanyName = companyName || settings?.companyName || 'Nossa Empresa';

  // Handlers
  const handleStart = () => {
    // Check if all required fields are filled
    const allRequiredFilled = enabledFields
      .filter(f => f.required)
      .every(f => respondent[f.field].trim() !== '');
    
    if (allRequiredFilled) {
      setStep('score');
    }
  };

  const handleScoreSelect = (val: number) => {
    setScore(val);
    if (campaign.questions && campaign.questions.length > 0) {
      setStep('questions');
    } else {
      finishSurvey(val, []);
    }
  };

  const handleNextQuestion = () => {
    if (!campaign.questions) return;

    const currentQ = campaign.questions[currentQuestionIndex];
    const newAnswers = [...answers, { question: currentQ.id, answer: currentAnswer }];
    setAnswers(newAnswers);
    setCurrentAnswer(''); // Reset for next question

    if (currentQuestionIndex < campaign.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishSurvey(score!, newAnswers);
    }
  };

  const finishSurvey = (finalScore: number, finalAnswers: any[]) => {
    // Submit Data
    const response: Partial<NPSResponse> = {
      customerName: respondent.name,
      customerEmail: respondent.email,
      customerPhone: respondent.phone,
      score: finalScore,
      comment: '',
      status: finalScore >= 9 ? 'Promotor' : finalScore >= 7 ? 'Neutro' : 'Detrator',
      answers: finalAnswers
    };
    
    // Try to find a text answer to use as the main comment
    const textAnswer = finalAnswers.find(a => typeof a.answer === 'string' && a.answer.length > 0);
    if (textAnswer) response.comment = textAnswer.answer;

    onSubmit(response);

    // Redirect Logic - Reduced delay to 800ms
    if (campaign.enableRedirection && finalScore >= 9 && settings?.placeId) {
        setStep('redirecting');
        setTimeout(() => {
            const googleUrl = `https://search.google.com/local/writereview?placeid=${settings.placeId}`;
            window.location.href = googleUrl;
        }, 800);
    } else {
        setStep('thankyou');
    }
  };

  const currentQ = campaign.questions ? campaign.questions[currentQuestionIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      {/* Header */}
      {isPreview && (
        <div className="absolute top-4 left-4 z-50">
             <button onClick={onClose} className="px-4 py-2 bg-white text-gray-700 shadow-md rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-100 border border-gray-200">
                 <X size={16} /> Fechar Visualização
             </button>
        </div>
      )}

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden min-h-[400px] flex flex-col">
        {/* Brand Header */}
        <div className="bg-white p-6 border-b border-gray-100 flex justify-center">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">
                  {displayCompanyName.charAt(0)}
              </div>
              <span className="font-bold text-gray-900">{displayCompanyName}</span>
           </div>
        </div>

        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
          
          {/* STEP 1: IDENTIFICATION */}
          {step === 'intro' && (
            <div className="w-full space-y-4">
               <h2 className="text-xl font-bold text-gray-900">{campaign.name}</h2>
               <p className="text-gray-500 mb-6">Por favor, preencha seus dados para iniciarmos o atendimento.</p>
               
               {enabledFields.map((field) => {
                 const inputType = field.field === 'email' ? 'email' : field.field === 'phone' ? 'tel' : 'text';
                 const placeholderText = `${field.placeholder}${field.required ? '' : ' (Opcional)'}`;
                 
                 return (
                   <div key={field.field}>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                     <input 
                       type={inputType}
                       placeholder={placeholderText}
                       className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-gray-900 placeholder-gray-500"
                       style={{ backgroundColor: '#ffffff', color: '#111827' }}
                       value={respondent[field.field]}
                       onChange={(e) => setRespondent({...respondent, [field.field]: e.target.value})}
                       required={field.required}
                     />
                   </div>
                 );
               })}
               
               <button 
                 onClick={handleStart}
                 disabled={!enabledFields.filter(f => f.required).every(f => respondent[f.field].trim() !== '')}
                 className="w-full py-3 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 transition-all mt-4 flex items-center justify-center gap-2"
               >
                 Iniciar Preenchimento <ArrowRight size={18} />
               </button>
            </div>
          )}

          {/* STEP 2: SCORE (DESCRIPTION HIDDEN) */}
          {step === 'score' && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Olá, {(respondent.name || '').split(' ')[0]}!</h2>
              <p className="text-gray-600 mb-6">Em uma escala de 0 a 10, o quanto você recomendaria a {displayCompanyName} para um amigo ou familiar?</p>
              
              {/* NOTE: campaign.description removed here as requested */}
              
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {Array.from({ length: 11 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleScoreSelect(i)}
                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all transform hover:scale-110 ${
                      score === i 
                        ? 'bg-primary-600 text-white ring-2 ring-offset-2 ring-primary-500' 
                        : 'bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="w-full flex justify-between text-xs text-gray-400 px-2">
                <span>Não recomendaria</span>
                <span>Com certeza recomendaria</span>
              </div>
            </>
          )}

          {/* STEP 3: FOLLOW UP QUESTIONS */}
          {step === 'questions' && currentQ && (
            <div className="w-full animate-in slide-in-from-right-8 duration-300">
                <span className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2 block">
                  Pergunta {currentQuestionIndex + 1} de {campaign.questions?.length}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mb-6">
                    {currentQ.text}
                </h3>

                {/* TEXT Question */}
                {currentQ.type === 'text' && (
                    <textarea 
                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[120px] bg-white text-gray-900 placeholder-gray-500"
                        style={{ backgroundColor: '#ffffff', color: '#111827' }}
                        placeholder="Digite sua resposta..."
                        autoFocus
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                    />
                )}

                {/* SINGLE CHOICE Question */}
                {currentQ.type === 'single' && (
                    <div className="space-y-2">
                        {currentQ.options?.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentAnswer(opt)}
                                className={`w-full p-3 rounded-lg border text-left transition-all flex justify-between items-center bg-white ${
                                    currentAnswer === opt 
                                    ? 'border-primary-500 bg-primary-50 text-primary-700' 
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                                {opt}
                                {currentAnswer === opt && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                )}

                {/* MULTIPLE CHOICE Question */}
                {currentQ.type === 'multiple' && (
                    <div className="space-y-2">
                        {currentQ.options?.map((opt, idx) => {
                            const selected = Array.isArray(currentAnswer) ? currentAnswer : [];
                            const isSelected = selected.includes(opt);
                            return (
                              <button
                                  key={idx}
                                  onClick={() => {
                                      let newSelected;
                                      if (isSelected) newSelected = selected.filter((s: any) => s !== opt);
                                      else newSelected = [...selected, opt];
                                      setCurrentAnswer(newSelected);
                                  }}
                                  className={`w-full p-3 rounded-lg border text-left transition-all flex justify-between items-center bg-white ${
                                      isSelected
                                      ? 'border-primary-500 bg-primary-50 text-primary-700' 
                                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                  }`}
                              >
                                  {opt}
                                  {isSelected && <Check size={16} />}
                              </button>
                            );
                        })}
                    </div>
                )}

                {/* RATING Question (1-5 Scale) */}
                {currentQ.type === 'rating' && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                  key={val}
                                  onClick={() => setCurrentAnswer(val)}
                                  className={`w-12 h-12 rounded-lg font-bold text-lg transition-all flex items-center justify-center ${
                                      currentAnswer === val
                                      ? 'bg-primary-600 text-white shadow-lg scale-110'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                              >
                                  {val}
                              </button>
                          ))}
                      </div>
                      <div className="flex justify-between w-full max-w-[280px] text-xs text-gray-400 px-1">
                          <span>Ruim</span>
                          <span>Excelente</span>
                      </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button 
                        onClick={handleNextQuestion}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 flex items-center gap-2"
                    >
                        {currentQuestionIndex < (campaign.questions?.length || 0) - 1 ? 'Próxima' : 'Finalizar'} 
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
          )}

          {/* STEP 4: REDIRECTING */}
          {step === 'redirecting' && (
             <div className="py-8">
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                     <MapPin size={32} />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900 mb-2">Muito Obrigado!</h2>
                 <p className="text-gray-600 max-w-xs mx-auto">
                     Ficamos felizes com sua nota! Você está sendo redirecionado para nos avaliar no Google...
                 </p>
                 <div className="mt-6 flex justify-center">
                     <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                 </div>
             </div>
          )}

          {/* STEP 5: THANK YOU */}
          {step === 'thankyou' && (
             <div className="py-8">
                 <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Check size={32} />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900 mb-2">Obrigado pelo feedback!</h2>
                 <p className="text-gray-600">
                     Sua opinião ajuda a melhorarmos nossos serviços constantemente.
                 </p>
                 {isPreview && (
                     <button onClick={onClose} className="mt-8 text-primary-600 font-medium hover:underline">
                         Voltar ao Painel
                     </button>
                 )}
             </div>
          )}

        </div>
        
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-center items-center gap-2 text-gray-400 text-xs">
            <ShieldCheck size={12} /> Ambiente Seguro • Powered by HelloGrowth
        </div>
      </div>
    </div>
  );
};

export default PublicSurvey;
