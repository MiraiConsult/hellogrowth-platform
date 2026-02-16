
import React, { useState, useEffect, useRef } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { NPSResponse, Campaign } from '@/types';
import { BarChart3, Sparkles, Loader2, X, Mail, Phone, History, Plus, MessageSquare, User, Calendar, Layout } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Markdown from 'react-markdown';

interface NPSAnalyticsProps {
  npsData: NPSResponse[];
  onUpdateNPSNote?: (id: string, note: string) => Promise<void>;
  campaigns?: Campaign[];
}

const NPSAnalytics: React.FC<NPSAnalyticsProps> = ({ npsData, onUpdateNPSNote, campaigns }) => {
  const tenantId = useTenantId()

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<NPSResponse | null>(null);

  // Notes State
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  // CÁLCULO CORRETO DE NPS (Range -100 a +100)
  const calculateNPS = () => {
      if (npsData.length === 0) return 0;
      const promoters = npsData.filter(n => n.score >= 9).length;
      const detractors = npsData.filter(n => n.score <= 6).length;
      const total = npsData.length;
      
      const rawScore = Math.round(((promoters - detractors) / total) * 100);
      return Math.max(0, rawScore);
  };

  const npsScore = calculateNPS();
  
  const promoters = npsData.filter(n => n.status === 'Promotor').length;
  const passives = npsData.filter(n => n.status === 'Neutro').length;
  const detractors = npsData.filter(n => n.status === 'Detrator').length;

  const sentimentData = [
    { name: 'Promotores', value: promoters, fill: '#10b981' },
    { name: 'Neutros', value: passives, fill: '#fbbf24' },
    { name: 'Detratores', value: detractors, fill: '#ef4444' },
  ];

  useEffect(() => {
    if (selectedResponse && notesEndRef.current) {
        notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedResponse?.notes, selectedResponse]);

  const getQuestionText = (questionId: string, campaignName: string) => {
    if (!campaigns) return questionId;
    const campaign = campaigns.find(c => c.name === campaignName);
    if (!campaign || !campaign.questions) return `Pergunta (${campaignName})`;
    const question = campaign.questions.find(q => q.id === questionId);
    return question ? question.text : `Pergunta desconhecida`;
  };

  const handleAddNote = async () => {
    if (!selectedResponse || !newNoteText.trim() || !onUpdateNPSNote) return;
    setIsSavingNote(true);
    
    try {
        const timestamp = new Date().toLocaleString('pt-BR');
        const noteEntry = `[${timestamp}] ${newNoteText.trim()}`;
        
        const updatedNotes = selectedResponse.notes 
            ? `${selectedResponse.notes}\n\n${noteEntry}`
            : noteEntry;

        await onUpdateNPSNote(selectedResponse.id, updatedNotes);
        
        // Update local state for immediate feedback
        setSelectedResponse(prev => prev ? { ...prev, notes: updatedNotes } : null);
        setNewNoteText('');
    } catch (e) {
        console.error("Error saving note", e);
    } finally {
        setIsSavingNote(false);
    }
  };

  const handleGlobalAnalysis = async () => {
    if (npsData.length === 0) return;
    
    setIsAnalyzing(true);
    setIsModalOpen(true); // Open modal to show loading/result

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        // Summarize last 50 comments to avoid token limits
        const comments = npsData
          .slice(0, 50)
          .filter(r => r.comment && r.comment.length > 3)
          .map(r => `- [${r.status}] ${r.comment}`)
          .join('\n');

        const prompt = `
          Atue como Head de Customer Experience.
          Analise os feedbacks globais da empresa abaixo e gere um relatório executivo.
          
          MÉTRICAS GLOBAIS:
          - NPS Atual: ${npsScore}
          - Volume Total: ${npsData.length}
          
          AMOSTRA DE COMENTÁRIOS RECENTES:
          ${comments}
          
          TAREFA (Markdown):
          1. **Diagnóstico Geral**: Qual a saúde da base de clientes?
          2. **Principais Ofensores**: O que está gerando detratores?
          3. **Oportunidades de Melhoria**: 3 ações táticas para subir o NPS no próximo trimestre.
          
          Seja estratégico e direto.
        `;

        const result = await model.generateContent(prompt);

        setAiReport(result.response.text() || "Análise concluída, mas sem texto retornado.");
      } else {
        // Mock Fallback
        await new Promise(r => setTimeout(r, 2000));
        setAiReport(`**Relatório Simulado (Sem API Key)**\n\nO NPS de **${npsScore}** mostra estabilidade. A análise dos ${npsData.length} feedbacks indica que o produto é bem aceito, mas o suporte precisa ser mais ágil.`);
      }
    } catch (error) {
      console.error(error);
      setAiReport("Erro ao gerar análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-gray-50 relative">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Análise de Feedback</h1>
        <p className="text-gray-500">Métricas detalhadas de satisfação do cliente</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">NPS Global</p>
          <div className="flex items-baseline gap-2 mt-2">
             <h3 className={`text-3xl font-bold ${npsScore >= 75 ? 'text-green-600' : npsScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                 {npsScore}
             </h3>
             <span className="text-xs text-gray-400 font-medium">Score Real</span>
          </div>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Total Respostas</p>
          <div className="flex items-baseline gap-2 mt-2">
             <h3 className="text-3xl font-bold text-gray-900">{npsData.length}</h3>
             <span className="text-xs text-gray-400 font-medium">Total</span>
          </div>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Promotores</p>
          <div className="flex items-baseline gap-2 mt-2">
             <h3 className="text-3xl font-bold text-green-600">{promoters}</h3>
             <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                {npsData.length > 0 ? Math.round((promoters / npsData.length) * 100) : 0}%
             </span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Detratores</p>
          <div className="flex items-baseline gap-2 mt-2">
             <h3 className="text-3xl font-bold text-red-600">{detractors}</h3>
             <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                {npsData.length > 0 ? Math.round((detractors / npsData.length) * 100) : 0}%
             </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
           <h3 className="text-lg font-bold text-gray-900 mb-6">Distribuição de Sentimento</h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sentimentData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Insights AI */}
        <div className="bg-gradient-to-br from-primary-50 to-white p-6 rounded-xl shadow-sm border border-primary-100 flex flex-col justify-between">
           <div>
             <div className="flex items-center gap-2 mb-4 text-primary-700">
               <BarChart3 size={20} />
               <h3 className="font-bold">Insights da IA</h3>
             </div>
             <ul className="space-y-4">
               <li className="flex gap-3 text-sm text-gray-700">
                 <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0"></span>
                 <span>Análise global de todos os feedbacks recebidos.</span>
               </li>
               <li className="flex gap-3 text-sm text-gray-700">
                 <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0"></span>
                 <span>Identificação de tendências macro de satisfação.</span>
               </li>
             </ul>
           </div>
           <button 
             onClick={handleGlobalAnalysis}
             disabled={npsData.length === 0}
             className="w-full mt-6 py-2 bg-white border border-primary-200 text-primary-600 rounded-lg hover:bg-primary-50 text-sm font-medium shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Sparkles size={16} /> Ver análise completa
           </button>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4">Feedbacks Detalhados</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 font-medium">Cliente</th>
              <th className="px-6 py-3 font-medium">Nota</th>
              <th className="px-6 py-3 font-medium">Comentário</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {npsData.map((nps) => (
              <tr key={nps.id} onClick={() => setSelectedResponse(nps)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{nps.customerName}</p>
                  <p className="text-xs text-gray-500">{nps.campaign}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-white ${
                    nps.score >= 9 ? 'bg-green-500' : nps.score >= 7 ? 'bg-yellow-400' : 'bg-red-500'
                  }`}>
                    {nps.score}
                  </span>
                </td>
                <td className="px-6 py-4 max-w-xs truncate text-gray-600">
                  {nps.comment || (nps.notes ? <span className="text-gray-400 italic flex items-center gap-1"><History size={12}/> Ver notas internas</span> : '')}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                     nps.status === 'Promotor' ? 'bg-green-100 text-green-700' :
                     nps.status === 'Neutro' ? 'bg-yellow-100 text-yellow-700' :
                     'bg-red-100 text-red-700'
                  }`}>
                    {nps.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(nps.date).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Analysis Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-50 rounded-t-2xl">
              <div className="flex items-center gap-2 text-purple-800">
                <Sparkles size={20} />
                <h2 className="text-lg font-bold">Relatório de Inteligência Artificial</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-2 hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                   <Loader2 size={40} className="animate-spin text-purple-600 mb-4" />
                   <p>Analisando todos os feedbacks da sua base...</p>
                </div>
              ) : (
                <div className="prose prose-purple max-w-none">
                   <ReactMarkdown>{aiReport || ''}</ReactMarkdown>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 rounded-b-2xl border-t border-gray-100 text-right">
               <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium">
                 Fechar Relatório
               </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Response Details Panel */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden bg-black/40 backdrop-blur-sm p-4 md:p-10">
          <div className="w-full max-w-6xl h-full max-h-[90vh] bg-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 rounded-3xl overflow-hidden border border-gray-100">
            {/* Header - Identidade Visual */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                  selectedResponse.score >= 9 ? 'bg-green-50 text-green-600' : 
                  selectedResponse.score <= 6 ? 'bg-red-50 text-red-600' : 
                  'bg-yellow-50 text-yellow-600'
                }`}>
                  <User size={30} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {selectedResponse.customerName}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      selectedResponse.score >= 9 ? 'bg-green-100 text-green-700' : 
                      selectedResponse.score <= 6 ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedResponse.score >= 9 ? 'Promotor' : selectedResponse.score <= 6 ? 'Detrator' : 'Passivo'}
                    </span>
                  </h2>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail size={12} className="text-gray-400" /> {selectedResponse.customerEmail || 'Sem e-mail'}
                    </div>
                    {selectedResponse.customerPhone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone size={12} className="text-gray-400" /> {selectedResponse.customerPhone}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar size={12} className="text-gray-400" /> {new Date(selectedResponse.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedResponse(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar de Resumo (Esquerda) */}
              <div className="w-80 border-r border-gray-100 bg-gray-50/50 overflow-y-auto p-6 hidden lg:block space-y-6">
                {/* Score Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Score Identificado</p>
                  <div className="flex items-end justify-between mb-4">
                    <span className={`text-5xl font-black ${
                      selectedResponse.score >= 9 ? 'text-green-500' : 
                      selectedResponse.score <= 6 ? 'text-red-500' : 
                      'text-yellow-500'
                    }`}>{selectedResponse.score}</span>
                    <span className="text-gray-300 text-lg font-medium">/ 10</span>
                  </div>
                  {/* NPS Bar */}
                  <div className="h-2 w-full bg-gray-100 rounded-full flex overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: '60%' }} />
                    <div className="h-full bg-yellow-400" style={{ width: '20%' }} />
                    <div className="h-full bg-green-500" style={{ width: '20%' }} />
                  </div>
                  <div className="relative w-full h-4 mt-1">
                    <div 
                      className="absolute top-0 w-3 h-3 bg-white border-2 border-gray-800 rounded-full -translate-x-1/2 shadow-sm transition-all duration-1000"
                      style={{ left: `${selectedResponse.score * 10}%` }}
                    />
                  </div>
                </div>

                {/* AI Sentiment Analysis */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                      <Sparkles size={14} />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Análise da IA</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    {selectedResponse.score >= 9 
                      ? "Cliente promotor com alto potencial de indicação. Demonstra satisfação clara com os serviços prestados." 
                      : selectedResponse.score <= 6 
                      ? "Atenção necessária. O cliente apresenta pontos de insatisfação que podem levar ao churn se não abordados." 
                      : "Cliente neutro. Experiência satisfatória, mas sem o 'encantamento' necessário para fidelização total."}
                  </p>
                </div>

                {/* Tags de Categoria */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Categorias Relacionadas</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-tight">#NPS</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md uppercase tracking-tight">#Feedback</span>
                    {selectedResponse.score >= 9 && <span className="px-2 py-1 bg-green-100 text-green-600 text-[10px] font-bold rounded-md uppercase tracking-tight">#Fidelizado</span>}
                    {selectedResponse.score <= 6 && <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-md uppercase tracking-tight">#Crítico</span>}
                  </div>
                </div>
              </div>

              {/* Conteúdo Principal (Direita) */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
                <div className="max-w-3xl mx-auto space-y-8">
                  {/* Seção de Respostas */}
                  <section>
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Layout size={18} />
                      </div>
                      <h3 className="font-bold text-gray-900">Perguntas e Respostas</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {selectedResponse.answers && Array.isArray(selectedResponse.answers) && selectedResponse.answers.length > 0 ? (
                        selectedResponse.answers.map((ans: any, idx: number) => {
                          let qId = ans.question;
                          let val = ans.answer;
                          if (val && typeof val === 'object' && 'question' in val && 'answer' in val) {
                              qId = val.question;
                              val = val.answer;
                          }
                          const displayValue = typeof val === 'object' ? (val.label || JSON.stringify(val)) : val;

                          return (
                            <div key={idx} className="group p-5 rounded-2xl border border-gray-100 bg-white hover:border-indigo-100 hover:shadow-sm transition-all duration-200">
                              <div className="flex items-start gap-3">
                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                <div className="space-y-2">
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{getQuestionText(qId, selectedResponse.campaign)}</p>
                                  <p className="text-gray-800 font-semibold leading-relaxed">{displayValue || <span className="text-gray-300 italic">Sem resposta</span>}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-10 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                          <p className="text-gray-400 text-sm">Nenhuma resposta detalhada registrada para este cliente.</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Anotações Internas (CRM Style) */}
                  {onUpdateNPSNote && (
                    <section className="pt-4">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                          <History size={18} />
                        </div>
                        <h3 className="font-bold text-gray-900">Anotações do Time</h3>
                      </div>
                      
                      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <div className="max-h-60 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
                          {selectedResponse.notes ? (
                            selectedResponse.notes.split('\n\n').map((note, i) => (
                              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{note}</p>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6">
                              <p className="text-gray-400 text-xs italic">Nenhuma anotação registrada ainda.</p>
                            </div>
                          )}
                          <div ref={notesEndRef} />
                        </div>

                        <div className="relative">
                          <input 
                            type="text"
                            className="w-full bg-white border border-gray-200 rounded-2xl pl-5 pr-24 py-4 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm transition-all"
                            placeholder="Adicionar nova nota interna..."
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                          />
                          <button 
                            onClick={handleAddNote}
                            disabled={isSavingNote || !newNoteText.trim()}
                            className="absolute right-2 top-2 bottom-2 bg-emerald-600 text-white px-5 rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-md shadow-emerald-200"
                          >
                            {isSavingNote ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
                            SALVAR
                          </button>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>

            {/* Footer com Ações */}
            <div className="p-5 border-t border-gray-100 bg-white flex justify-between items-center flex-shrink-0">
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    const phone = selectedResponse.customerPhone?.replace(/\D/g, '');
                    if (phone) window.open(`https://wa.me/55${phone}?text=Olá ${selectedResponse.customerName}, obrigado pelo seu feedback!`, '_blank');
                  }}
                  className="px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold hover:bg-green-100 transition-all flex items-center gap-2 border border-green-200"
                >
                  <Phone size={14} /> WhatsApp
                </button>
                <button 
                  onClick={() => window.location.href = `mailto:${selectedResponse.customerEmail}?subject=Feedback NPS`}
                  className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-200"
                >
                  <Mail size={14} /> E-mail
                </button>
              </div>
              <button onClick={() => setSelectedResponse(null)} className="px-8 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
                FECHAR DETALHES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NPSAnalytics;
