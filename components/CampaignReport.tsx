import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Campaign, NPSResponse } from '@/types';
import { ArrowLeft, Users, Star, TrendingUp, MessageSquare, Sparkles, Loader2, Download, Calendar, X, Mail, Phone, Trash2, ArrowRight, History, Plus, User, Info, FileText, Layout, Search, Filter } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';

interface CampaignReportProps {
  campaignId: string;
  campaigns: Campaign[];
  npsData: NPSResponse[];
  onBack: () => void;
  onDeleteResponse: (id: string) => void;
  onUpdateNPSNote?: (id: string, note: string) => Promise<void>;
}

const CampaignReport: React.FC<CampaignReportProps> = ({ campaignId, campaigns, npsData, onBack, onDeleteResponse, onUpdateNPSNote }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<NPSResponse | null>(null);
  
  // Notes State
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const campaign = campaigns.find(c => c.id === campaignId);
  const campaignResponses = useMemo(() => {
    if (!campaign) return [];
    return npsData.filter(r => r.campaign === campaign.name);
  }, [campaign, npsData]);

  const totalResponses = campaignResponses.length;
  const promoters = campaignResponses.filter(r => r.score >= 9).length;
  const passives = campaignResponses.filter(r => r.score >= 7 && r.score <= 8).length;
  const detractors = campaignResponses.filter(r => r.score <= 6).length;

  const npsScore = useMemo(() => {
      if (totalResponses === 0) return 0;
      const rawScore = Math.round(((promoters - detractors) / totalResponses) * 100);
      return Math.max(0, rawScore);
  }, [promoters, detractors, totalResponses]);

  const distributionData = [
    { name: 'Promotores', value: promoters, color: '#10b981' },
    { name: 'Neutros', value: passives, color: '#fbbf24' },
    { name: 'Detratores', value: detractors, color: '#ef4444' },
  ];

  // Scroll to bottom of notes
  useEffect(() => {
    if (selectedResponse && notesEndRef.current) {
        notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedResponse?.notes, selectedResponse]);

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

  const handleAnalyzeFeedback = async () => {
    if (campaignResponses.length === 0) return;
    setIsAnalyzing(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        const detailedFeedback = campaignResponses
            .slice(0, 50) // Limit context
            .map(r => `Nota ${r.score}: ${r.comment || 'Sem comentário'}`)
            .join('\n');
            
        const prompt = `
          Atue como Especialista em CX (Customer Experience).
          Analise os feedbacks desta campanha específica: "${campaign?.name}".
          
          DADOS:
          - NPS: ${npsScore}
          - Total: ${totalResponses}
          
          FEEDBACKS RECENTES:
          ${detailedFeedback}
          
          Gere um resumo curto em Markdown com:
          1. **Sentimento Geral**: O que os clientes mais elogiam ou criticam?
          2. **Ação Imediata**: Uma sugestão para melhorar a nota.
        `;
        
        // FIX: Updated model from deprecated 'gemini-2.5-flash' to 'gemini-3-flash-preview' for basic text task.
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt );
        const response = { text: result.response.text() };
        setAiAnalysis(response.text || "Sem análise gerada.");
      } else {
        await new Promise(r => setTimeout(r, 2000));
        setAiAnalysis(`**Análise Simulada:**\n\nO NPS de **${npsScore}** indica um desempenho estável. A maioria dos feedbacks positivos destaca o atendimento, enquanto as críticas focam no tempo de espera.`);
      }
    } catch (error) { 
        setAiAnalysis("Erro na análise. Verifique sua conexão."); 
    } finally { 
        setIsAnalyzing(false); 
    }
  };

  const getQuestionText = (questionId: string) => {
    if (!campaign || !campaign.questions) return questionId;
    const question = campaign.questions.find(q => q.id === questionId);
    return question ? question.text : `Pergunta: ${questionId}`;
  };

  const handleExportPDF = () => window.print();

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("Tem certeza que deseja excluir esta resposta?")) {
          onDeleteResponse(id);
          if (selectedResponse?.id === id) setSelectedResponse(null);
      }
  };

  if (!campaign) return <div>Campanha não encontrada</div>;

  return (
    <div className="p-8 min-h-screen bg-gray-50 relative print:bg-white print:p-0">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {campaign.name}
              <span className={`text-xs px-2 py-1 rounded-full border ${campaign.status === 'Ativa' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {campaign.status}
              </span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">Relatório individual</p>
          </div>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium">
          <Download size={16} /> Exportar PDF
        </button>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:grid-cols-4 print:gap-4">
         {/* ... KPIs kept same as previous ... */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <div>
                <p className="text-sm font-medium text-gray-500">NPS Score</p>
                <h3 className={`text-3xl font-bold mt-2 ${npsScore >= 75 ? 'text-green-600' : npsScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {npsScore}
                </h3>
             </div>
             <div className="p-2 bg-gray-50 rounded-lg absolute top-6 right-6 text-gray-400">
                <Star size={20} />
             </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
             <div>
                <p className="text-sm font-medium text-gray-500">Total Respostas</p>
                <h3 className="text-3xl font-bold mt-2 text-gray-900">{totalResponses}</h3>
             </div>
             <div className="p-2 bg-blue-50 rounded-lg absolute top-6 right-6 text-blue-600">
                <MessageSquare size={20} />
             </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
             <div>
                <p className="text-sm font-medium text-gray-500">Promotores</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold mt-2 text-green-600">{promoters}</h3>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        {totalResponses > 0 ? Math.round((promoters / totalResponses) * 100) : 0}%
                    </span>
                </div>
             </div>
             <div className="p-2 bg-green-50 rounded-lg absolute top-6 right-6 text-green-600">
                <TrendingUp size={20} />
             </div>
         </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
             <div>
                <p className="text-sm font-medium text-gray-500">Detratores</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold mt-2 text-red-600">{detractors}</h3>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        {totalResponses > 0 ? Math.round((detractors / totalResponses) * 100) : 0}%
                    </span>
                </div>
             </div>
             <div className="p-2 bg-red-50 rounded-lg absolute top-6 right-6 text-red-600">
                <ArrowRight size={20} className="rotate-45" />
             </div>
         </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 print:hidden">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
           <h3 className="text-lg font-bold text-gray-900 mb-6">Distribuição de Sentimento</h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* AI Analysis */}
        <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl shadow-sm border border-purple-100 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-purple-700">
                <Sparkles size={20} />
                <h3 className="font-bold">IA de Análise</h3>
            </div>
            
            <div className="flex-1 bg-white/60 rounded-xl p-4 border border-purple-100 mb-4 overflow-y-auto max-h-[200px]">
                 {aiAnalysis ? (
                    <div className="prose prose-sm prose-purple">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 text-sm">
                        <Sparkles size={24} className="mb-2 opacity-50" />
                        <p>Clique abaixo para gerar insights sobre esta campanha.</p>
                    </div>
                 )}
            </div>

            <button
                onClick={handleAnalyzeFeedback}
                disabled={isAnalyzing || totalResponses === 0}
                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isAnalyzing ? 'Analisando...' : 'Gerar Análise'}
            </button>
        </div>
      </div>
      
      {/* Table with DELETE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:break-before-page">
        <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Participantes e Respostas</h3></div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase"><tr><th className="px-6 py-3">Cliente</th><th className="px-6 py-3">Nota</th><th className="px-6 py-3">Comentário / Notas</th><th className="px-6 py-3">Data</th><th className="px-6 py-3 text-right">Ações</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {campaignResponses.map((resp) => (
              <tr key={resp.id} onClick={() => setSelectedResponse(resp)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4 font-medium">{resp.customerName}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-white text-xs font-bold ${resp.score>=9?'bg-green-500':resp.score<=6?'bg-red-500':'bg-yellow-400'}`}>{resp.score}</span></td>
                <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">
                    {resp.comment || (resp.notes ? <span className="text-gray-400 italic flex items-center gap-1"><History size={12}/> Ver notas internas</span> : '')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(resp.date || Date.now()).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4 text-right">
                    <button onClick={(e) => handleDelete(e, resp.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-100"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {campaignResponses.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Nenhuma resposta registrada nesta campanha ainda.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

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
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{getQuestionText(qId)}</p>
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

export default CampaignReport;
