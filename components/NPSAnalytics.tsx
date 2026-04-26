import React, { useState, useEffect, useRef } from 'react';
import { encodeWhatsAppMessage } from '@/lib/utils/whatsapp';
import { useTenantId } from '@/hooks/useTenantId';
import { NPSResponse, Campaign } from '@/types';
import { BarChart3, Sparkles, Loader2, X, Mail, Phone, History, Plus, MessageSquare, User, Calendar, Layout, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { callGeminiAPI } from '@/lib/gemini-client';
import ReactMarkdown from 'react-markdown';

interface NPSAnalyticsProps {
  npsData: NPSResponse[];
  onUpdateNPSNote?: (id: string, note: string) => Promise<void>;
  onDeleteNPSResponse?: (id: string) => Promise<void>;
  campaigns?: Campaign[];
}

const NPSAnalytics: React.FC<NPSAnalyticsProps> = ({ npsData, onUpdateNPSNote, onDeleteNPSResponse, campaigns }) => {
  const tenantId = useTenantId()

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<NPSResponse | null>(null);

  // Notes State
  const [newNoteText, setNewNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Delete State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Filter & Sort State
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<'customerName' | 'score' | 'status' | 'date' | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const handleDeleteResponse = async (id: string) => {
    if (!onDeleteNPSResponse) return;
    setIsDeletingId(id);
    try {
      await onDeleteNPSResponse(id);
      // Fechar painel de detalhes se o item excluído estava aberto
      if (selectedResponse?.id === id) setSelectedResponse(null);
      setConfirmDeleteId(null);
    } catch (e) {
      console.error('Erro ao excluir resposta NPS', e);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleGlobalAnalysis = async () => {
    if (npsData.length === 0) return;
    
    setIsAnalyzing(true);
    setIsModalOpen(true); // Open modal to show loading/result

    try {
      const comments = npsData
          .slice(0, 50)
          .filter(r => r.comment && r.comment.length > 3)
          .map(r => `- [${r.status}] ${r.comment}`)
          .join('\n');

        // Calcular metricas detalhadas
        const promotores = npsData.filter(r => r.score >= 9);
        const neutros = npsData.filter(r => r.score >= 7 && r.score <= 8);
        const detratores = npsData.filter(r => r.score <= 6);
        
        // Agrupar comentarios por categoria
        const detractorComments = npsData
          .filter(r => r.score <= 6 && r.comment && r.comment.length > 3)
          .slice(0, 20)
          .map(r => `- Nota ${r.score}: "${r.comment}"`);
        const promoterComments = npsData
          .filter(r => r.score >= 9 && r.comment && r.comment.length > 3)
          .slice(0, 10)
          .map(r => `- Nota ${r.score}: "${r.comment}"`);
        const neutralComments = npsData
          .filter(r => r.score >= 7 && r.score <= 8 && r.comment && r.comment.length > 3)
          .slice(0, 10)
          .map(r => `- Nota ${r.score}: "${r.comment}"`);

        const prompt = `Voce e um Head de Customer Experience com 15 anos de experiencia. Analise os dados de NPS desta empresa e gere um relatorio executivo ACIONAVEL.

METRICAS GLOBAIS:
- NPS Score Atual: ${npsScore}
- Volume Total de Respostas: ${npsData.length}
- Promotores (9-10): ${promotores.length} (${npsData.length > 0 ? ((promotores.length / npsData.length) * 100).toFixed(1) : 0}%)
- Neutros (7-8): ${neutros.length} (${npsData.length > 0 ? ((neutros.length / npsData.length) * 100).toFixed(1) : 0}%)
- Detratores (0-6): ${detratores.length} (${npsData.length > 0 ? ((detratores.length / npsData.length) * 100).toFixed(1) : 0}%)

COMENTARIOS DE DETRATORES (PRIORIDADE MAXIMA - analise padroes):
${detractorComments.length > 0 ? detractorComments.join('\n') : 'Nenhum comentario de detrator disponivel'}

COMENTARIOS DE NEUTROS (oportunidade de conversao):
${neutralComments.length > 0 ? neutralComments.join('\n') : 'Nenhum comentario de neutro disponivel'}

COMENTARIOS DE PROMOTORES (pontos fortes a manter):
${promoterComments.length > 0 ? promoterComments.join('\n') : 'Nenhum comentario de promotor disponivel'}

TAREFA (responda em Markdown formatado):

## 1. Diagnostico Geral
Avalie a saude da base de clientes. Compare o NPS com benchmarks do mercado. Identifique se a tendencia e positiva ou negativa.

## 2. Analise de Padroes nos Comentarios
- O que os DETRATORES reclamam em comum? (identifique os 2-3 temas mais recorrentes)
- O que os PROMOTORES elogiam? (identifique os pontos fortes)
- O que falta para os NEUTROS virarem promotores?

## 3. Plano de Acao (3 acoes taticas)
Para cada acao:
- O que fazer (especifico)
- Por que (baseado nos dados)
- Impacto esperado no NPS
- Prazo sugerido

## 4. Quick Wins
Liste 2 acoes que podem ser implementadas ESTA SEMANA para melhorar a experiencia.

Seja ESPECIFICO e baseie TUDO nos dados reais. NAO use frases genericas.
        `;

        const text = await callGeminiAPI(prompt);
        setAiReport(text || "Análise concluída, mas sem texto retornado.");
    } catch (error) {
      console.error(error);
      setAiReport("Erro ao gerar análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Filtro e ordenação aplicados sobre npsData
  const filteredAndSorted = React.useMemo(() => {
    let data = [...npsData];

    // Filtro de data
    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00');
      data = data.filter(n => new Date(n.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59');
      data = data.filter(n => new Date(n.date) <= to);
    }

    // Ordenação
    if (sortColumn) {
      data.sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';
        if (sortColumn === 'customerName') { valA = a.customerName?.toLowerCase() || ''; valB = b.customerName?.toLowerCase() || ''; }
        if (sortColumn === 'score') { valA = a.score; valB = b.score; }
        if (sortColumn === 'status') { valA = a.status || ''; valB = b.status || ''; }
        if (sortColumn === 'date') { valA = new Date(a.date).getTime(); valB = new Date(b.date).getTime(); }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [npsData, dateFrom, dateTo, sortColumn, sortDirection]);

  const handleSort = (col: 'customerName' | 'score' | 'status' | 'date') => {
    if (sortColumn === col) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ col }: { col: 'customerName' | 'score' | 'status' | 'date' }) => {
    if (sortColumn !== col) return <ChevronsUpDown size={12} className="ml-1 text-gray-300" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={12} className="ml-1 text-primary-500" />
      : <ChevronDown size={12} className="ml-1 text-primary-500" />;
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

      {/* Filtros e Cabeçalho da Tabela */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-gray-900">Feedbacks Detalhados
          <span className="ml-2 text-sm font-normal text-gray-400">{filteredAndSorted.length} de {npsData.length}</span>
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">De</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-xs text-gray-700 border-none outline-none bg-transparent cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-500 font-medium">Até</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-xs text-gray-700 border-none outline-none bg-transparent cursor-pointer"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors font-medium"
            >
              Limpar filtro
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 font-medium">
                <button onClick={() => handleSort('customerName')} className="flex items-center hover:text-gray-700 transition-colors">
                  Cliente <SortIcon col="customerName" />
                </button>
              </th>
              <th className="px-6 py-3 font-medium">
                <button onClick={() => handleSort('score')} className="flex items-center hover:text-gray-700 transition-colors">
                  Nota <SortIcon col="score" />
                </button>
              </th>
              <th className="px-6 py-3 font-medium">Comentário</th>
              <th className="px-6 py-3 font-medium">
                <button onClick={() => handleSort('status')} className="flex items-center hover:text-gray-700 transition-colors">
                  Status <SortIcon col="status" />
                </button>
              </th>
              <th className="px-6 py-3 font-medium">
                <button onClick={() => handleSort('date')} className="flex items-center hover:text-gray-700 transition-colors">
                  Data <SortIcon col="date" />
                </button>
              </th>
              {onDeleteNPSResponse && <th className="px-4 py-3 font-medium text-center">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAndSorted.length === 0 ? (
              <tr><td colSpan={onDeleteNPSResponse ? 6 : 5} className="px-6 py-10 text-center text-gray-400 text-sm">Nenhum feedback encontrado para o período selecionado.</td></tr>
            ) : filteredAndSorted.map((nps) => (
              <tr key={nps.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedResponse(nps)}>
                  <p className="font-medium text-gray-900">{nps.customerName}</p>
                  <p className="text-xs text-gray-500">{nps.campaign}</p>
                </td>
                <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedResponse(nps)}>
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-white ${
                    nps.score >= 9 ? 'bg-green-500' : nps.score >= 7 ? 'bg-yellow-400' : 'bg-red-500'
                  }`}>
                    {nps.score}
                  </span>
                </td>
                <td className="px-6 py-4 max-w-xs truncate text-gray-600 cursor-pointer" onClick={() => setSelectedResponse(nps)}>
                  {nps.comment || (nps.notes ? <span className="text-gray-400 italic flex items-center gap-1"><History size={12}/> Ver notas internas</span> : '')}
                </td>
                <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedResponse(nps)}>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                     nps.status === 'Promotor' ? 'bg-green-100 text-green-700' :
                     nps.status === 'Neutro' ? 'bg-yellow-100 text-yellow-700' :
                     'bg-red-100 text-red-700'
                  }`}>
                    {nps.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 cursor-pointer" onClick={() => setSelectedResponse(nps)}>
                  {new Date(nps.date).toLocaleDateString('pt-BR')}
                </td>
                {onDeleteNPSResponse && (
                  <td className="px-4 py-4 text-center">
                    {confirmDeleteId === nps.id ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleDeleteResponse(nps.id)}
                          disabled={isDeletingId === nps.id}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                        >
                          {isDeletingId === nps.id ? '...' : 'Sim'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(nps.id); }}
                        className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir resposta"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                )}
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
              <div className="flex items-center gap-2">
                {onDeleteNPSResponse && (
                  confirmDeleteId === `panel-${selectedResponse.id}` ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 mr-1">Excluir?</span>
                      <button
                        onClick={() => handleDeleteResponse(selectedResponse.id)}
                        disabled={isDeletingId === selectedResponse.id}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                      >
                        {isDeletingId === selectedResponse.id ? '...' : 'Sim'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(`panel-${selectedResponse.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                      title="Excluir esta resposta"
                    >
                      <Trash2 size={13} /> Excluir
                    </button>
                  )
                )}
                <button onClick={() => setSelectedResponse(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
                  <X size={24} />
                </button>
              </div>
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
                    if (phone) window.open(`https://wa.me/55${phone}?text=${encodeWhatsAppMessage(`Olá ${selectedResponse.customerName}, obrigado pelo seu feedback!`)}`, '_blank');
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
