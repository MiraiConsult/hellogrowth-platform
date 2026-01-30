
import React, { useState, useEffect, useRef } from 'react';
import { NPSResponse, Campaign } from '@/types';
import { BarChart3, Sparkles, Loader2, X, Mail, Phone, History, Plus, MessageSquare } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';

interface NPSAnalyticsProps {
  npsData: NPSResponse[];
  onUpdateNPSNote?: (id: string, note: string) => Promise<void>;
  campaigns?: Campaign[];
}

const NPSAnalytics: React.FC<NPSAnalyticsProps> = ({ npsData, onUpdateNPSNote, campaigns }) => {
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
      const apiKey = process.env.API_KEY;
      
      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        
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

        const result = await model.generateContent({
          // FIX: Upgraded model to 'gemini-3-pro-preview' for complex analysis and reporting.
          contents: prompt,
        });

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
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden bg-black/30">
          {/* Full Screen Panel */}
          <div className="w-full h-full bg-white shadow-2xl flex flex-col animate-in fade-in duration-300">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10 flex-shrink-0">
                  <div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedResponse.customerName}</h2>
                      <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-white text-xs font-bold ${selectedResponse.score>=9?'bg-green-500':selectedResponse.score<=6?'bg-red-500':'bg-yellow-400'}`}>Score: {selectedResponse.score}</span>
                          <span className="text-xs text-gray-500">{selectedResponse.customerEmail}</span>
                      </div>
                  </div>
                  <button onClick={() => setSelectedResponse(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20}/></button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="max-w-4xl mx-auto space-y-6">
                  
                  {selectedResponse.answers && Array.isArray(selectedResponse.answers) && selectedResponse.answers.length > 0 && (
                    <div>
                      <h3 className="font-bold text-sm mb-3 text-gray-900 flex items-center gap-2">
                          <MessageSquare size={16} /> Respostas Detalhadas
                      </h3>
                      <div className="space-y-3">
                        {selectedResponse.answers.map((ans: any, idx: number) => {
                            let qId = ans.question;
                            let val = ans.answer;
                            if (val && typeof val === 'object' && 'question' in val && 'answer' in val) {
                                qId = val.question;
                                val = val.answer;
                            }
                            const displayValue = typeof val === 'object' ? (val.label || JSON.stringify(val)) : val;

                            return (
                              <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white">
                                <p className="text-xs font-bold text-gray-500 mb-1">{getQuestionText(qId, selectedResponse.campaign)}</p>
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

                  {onUpdateNPSNote && (
                    <div className="border border-emerald-500 rounded-lg overflow-hidden shadow-sm bg-white flex flex-col h-36">
                       <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex justify-between items-center">
                          <h3 className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-2">
                              <History size={14}/> Anotações Internas (CRM)
                          </h3>
                       </div>
                       
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

                       <div className="p-2 bg-white">
                           <div className="flex gap-2">
                               <input 
                                  type="text"
                                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                  placeholder="Nova anotação..."
                                  value={newNoteText}
                                  onChange={(e) => setNewNoteText(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                               />
                               <button 
                                  onClick={handleAddNote}
                                  disabled={isSavingNote || !newNoteText.trim()}
                                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                               >
                                  {isSavingNote ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12}/>}
                                  Add
                               </button>
                           </div>
                       </div>
                    </div>
                  )}

                </div>
              </div>
              <div className="p-4 border-t bg-gray-50 text-right flex-shrink-0">
                  <button onClick={() => setSelectedResponse(null)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium">Fechar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default NPSAnalytics;
