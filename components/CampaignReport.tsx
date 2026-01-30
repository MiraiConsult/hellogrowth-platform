
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Campaign, NPSResponse } from '@/types';
import { ArrowLeft, Users, Star, TrendingUp, MessageSquare, Sparkles, Loader2, Download, Calendar, X, Mail, Phone, Trash2, ArrowRight, History, Plus } from 'lucide-react';
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
      const apiKey = process.env.API_KEY;
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
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
        <div className="fixed inset-0 z-50 flex print:hidden">
          {/* Backdrop */}
          <div className="flex-1 bg-black/20" onClick={() => setSelectedResponse(null)} />
          {/* Slide-over Panel */}
          <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10 flex-shrink-0">
                  <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedResponse.customerName}</h2>
                      <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-white text-xs font-bold ${selectedResponse.score>=9?'bg-green-500':selectedResponse.score<=6?'bg-red-500':'bg-yellow-400'}`}>Score: {selectedResponse.score}</span>
                          <span className="text-xs text-gray-500">{selectedResponse.customerEmail}</span>
                      </div>
                  </div>
                  <button onClick={() => setSelectedResponse(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20}/></button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                  
                  {selectedResponse.answers && Array.isArray(selectedResponse.answers) && selectedResponse.answers.length > 0 && (
                    <div>
                      <h3 className="font-bold text-sm mb-3 text-gray-900 flex items-center gap-2">
                          <MessageSquare size={16} /> Respostas Detalhadas
                      </h3>
                      <div className="space-y-3">
                        {selectedResponse.answers.map((ans: any, idx: number) => {
                            // Defensive handling for nested structures
                            let qId = ans.question;
                            let val = ans.answer;
                            if (val && typeof val === 'object' && 'question' in val && 'answer' in val) {
                                qId = val.question;
                                val = val.answer;
                            }
                            const displayValue = typeof val === 'object' ? (val.label || JSON.stringify(val)) : val;

                            return (
                              <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white">
                                <p className="text-xs font-bold text-gray-500 mb-1">{getQuestionText(qId)}</p>
                                <p className="font-medium text-gray-800">{displayValue}</p>
                              </div>
                            );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                      {selectedResponse.customerEmail && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail size={16} /> {selectedResponse.customerEmail}
                          </div>
                      )}
                      {selectedResponse.customerPhone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone size={16} /> {selectedResponse.customerPhone}
                          </div>
                      )}
                  </div>

                  {/* Internal Notes Section (Compact & Bottom) */}
                  <div className="border border-blue-500 rounded-lg overflow-hidden shadow-sm bg-white flex flex-col h-36">
                     <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex justify-between items-center">
                        <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-2">
                            <History size={14}/> Anotações Internas (CRM)
                        </h3>
                     </div>
                     
                     {/* History Area */}
                     <div className="flex-1 bg-gray-50 p-3 overflow-y-auto text-sm border-b border-gray-200">
                         {selectedResponse.notes ? (
                             <div className="whitespace-pre-wrap text-gray-700 font-mono text-xs">
                                 {selectedResponse.notes}
                             </div>
                         ) : (
                             <div className="text-gray-400 italic text-center mt-2 text-xs">Nenhuma anotação registrada.</div>
                         )}
                         <div ref={notesEndRef} />
                     </div>

                     {/* New Note Input */}
                     <div className="p-2 bg-white">
                         <div className="flex gap-2">
                             <input 
                                type="text"
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Nova anotação..."
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                             />
                             <button 
                                onClick={handleAddNote}
                                disabled={isSavingNote || !newNoteText.trim()}
                                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                             >
                                {isSavingNote ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12}/>}
                                Add
                             </button>
                         </div>
                     </div>
                  </div>

              </div>
              <div className="p-4 border-t bg-gray-50 rounded-b-2xl text-right flex-shrink-0">
                  <button onClick={() => setSelectedResponse(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium">Fechar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CampaignReport;
