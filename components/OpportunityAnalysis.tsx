
import React, { useState } from 'react';
import { Lead, Form } from '@/types';
import { BarChart3, Sparkles, Loader2, X, PieChart, TrendingUp, DollarSign, Calendar, Mail, FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Pie, Cell } from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import { MessageSuggestionsPanel } from '@/components/MessageSuggestionsPanel';

interface OpportunityAnalysisProps {
  leads: Lead[];
  forms?: Form[];
}

const OpportunityAnalysis: React.FC<OpportunityAnalysisProps> = ({ leads, forms }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Metrics
  const totalLeads = leads.length;
  const totalValue = leads.reduce((acc, curr) => acc + curr.value, 0);
  const wonLeads = leads.filter(l => l.status === 'Vendido');
  const lostLeads = leads.filter(l => l.status === 'Perdido');
  const conversionRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0;
  const lostValue = lostLeads.reduce((acc, curr) => acc + curr.value, 0);

  const statusData = [
    { name: 'Novo', value: leads.filter(l => l.status === 'Novo').length, fill: '#E5E7EB' }, // Gray
    { name: 'Em Contato', value: leads.filter(l => l.status === 'Em Contato').length, fill: '#DBEAFE' }, // Blue
    { name: 'Negociação', value: leads.filter(l => l.status === 'Negociação').length, fill: '#F3E8FF' }, // Purple
    { name: 'Vendido', value: wonLeads.length, fill: '#DCFCE7' }, // Green
    { name: 'Perdido', value: lostLeads.length, fill: '#FEE2E2' }, // Red
  ];

  const getQuestionText = (lead: Lead, questionId: string) => {
    if (!forms) return `Pergunta: ${questionId}`;
    for (const form of forms) {
        const question = form.questions.find(q => q.id === questionId);
        if (question) return question.text;
    }
    const sourceForm = forms.find(f => f.name === lead.formSource);
    if (sourceForm) {
        const q = sourceForm.questions.find(q => q.id === questionId);
        if (q) return q.text;
    }
    return `Pergunta: ${questionId}`;
  };

  const handleGlobalAnalysis = async () => {
    if (leads.length === 0) return;
    
    setIsAnalyzing(true);
    setIsModalOpen(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        // Summarize last 50 leads including Notes
        const leadSummary = leads
          .slice(0, 50)
          .map(l => {
              const notesSnippet = l.notes ? ` (Obs: ${l.notes.replace(/\n/g, ' ').substring(0, 100)}...)` : '';
              return `- [${l.status}] ${l.name} (R$ ${l.value}) - Fonte: ${l.formSource}${notesSnippet}`;
          })
          .join('\n');

        const prompt = `
          Atue como Diretor Comercial.
          Analise o pipeline de vendas global abaixo e gere um relatório de inteligência.
          
          MÉTRICAS GLOBAIS:
          - Total Oportunidades: ${totalLeads}
          - Volume Financeiro Total: R$ ${totalValue}
          - Taxa de Conversão: ${conversionRate.toFixed(1)}%
          - Valor Perdido: R$ ${lostValue}
          
          AMOSTRA DE LEADS (Incluindo anotações internas do CRM):
          ${leadSummary}
          
          TAREFA (Markdown):
          1. **Diagnóstico do Funil**: Onde estão os gargalos?
          2. **Análise Qualitativa**: Com base nas observações (Obs), quais são as objeções comuns ou padrões de comportamento?
          3. **Ações Táticas**: 3 recomendações para acelerar vendas e recuperar perdidos.
          
          Seja estratégico e direto.
        `;

        const result = await model.generateContent(prompt);

        setAiReport(result.response.text() || "Análise concluída, mas sem texto retornado.");
      } else {
        // Mock Fallback
        await new Promise(r => setTimeout(r, 2000));
        setAiReport(`**Relatório Simulado (Sem API Key)**\n\nSua taxa de conversão é de **${conversionRate.toFixed(1)}%**. Há um volume considerável de leads na fase inicial que precisam de abordagem urgente.`);
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
        <h1 className="text-2xl font-bold text-gray-900">Análise de Vendas</h1>
        <p className="text-gray-500">Inteligência comercial aplicada ao seu funil</p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Volume em Pipeline</p>
          <div className="flex items-baseline gap-2 mt-2">
             <h3 className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalValue)}
             </h3>
          </div>
          <div className="p-2 bg-green-50 rounded-lg w-fit mt-2 text-green-600"><DollarSign size={20} /></div>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Taxa de Conversão</p>
          <div className="flex items-baseline gap-2 mt-2">
             <h3 className={`text-3xl font-bold ${conversionRate >= 20 ? 'text-green-600' : 'text-yellow-600'}`}>
                 {conversionRate.toFixed(1)}%
             </h3>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg w-fit mt-2 text-blue-600"><TrendingUp size={20} /></div>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Leads Vendidos</p>
          <div className="flex items-baseline gap-2 mt-2">
             <h3 className="text-3xl font-bold text-green-600">{wonLeads.length}</h3>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
             <div className="h-full bg-green-500" style={{ width: `${conversionRate}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">Valor Perdido</p>
          <div className="flex items-baseline gap-2 mt-2">
             <h3 className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(lostValue)}
             </h3>
          </div>
          <p className="text-xs text-red-400 mt-2">{lostLeads.length} oportunidades perdidas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
           <h3 className="text-lg font-bold text-gray-900 mb-6">Distribuição do Funil</h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Insights AI */}
        <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl shadow-sm border border-indigo-100 flex flex-col justify-between">
           <div>
             <div className="flex items-center gap-2 mb-4 text-indigo-700">
               <Sparkles size={20} />
               <h3 className="font-bold">Coach de Vendas Global</h3>
             </div>
             <ul className="space-y-4">
               <li className="flex gap-3 text-sm text-gray-700">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                 <span>Análise completa do ciclo de vendas.</span>
               </li>
               <li className="flex gap-3 text-sm text-gray-700">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                 <span>Identificação de gargalos e oportunidades.</span>
               </li>
             </ul>
           </div>
           <button 
             onClick={handleGlobalAnalysis}
             disabled={leads.length === 0}
             className="w-full mt-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Sparkles size={16} /> Analisar Oportunidades
           </button>
        </div>
      </div>

      {/* Leads Table */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">Oportunidades Detalhadas</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 font-medium">Cliente</th>
              <th className="px-6 py-3 font-medium">Origem</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Valor</th>
              <th className="px-6 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{lead.name}</p>
                  <p className="text-xs text-gray-500">{lead.email}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {lead.formSource}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                     lead.status === 'Novo' ? 'bg-blue-100 text-blue-700' :
                     lead.status === 'Vendido' ? 'bg-green-100 text-green-700' :
                     lead.status === 'Perdido' ? 'bg-red-100 text-red-700' :
                     'bg-yellow-100 text-yellow-700'
                  }`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-gray-700">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                   <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(lead.date || Date.now()).toLocaleDateString('pt-BR')}
                  </div>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Nenhuma oportunidade encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* AI Analysis Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50 rounded-t-2xl">
              <div className="flex items-center gap-2 text-indigo-800">
                <Sparkles size={20} />
                <h2 className="text-lg font-bold">Diagnóstico Comercial IA</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-2 hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                   <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
                   <p>Analisando todas as oportunidades...</p>
                </div>
              ) : (
                <div className="prose prose-indigo max-w-none">
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

      {/* Lead Details Panel */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          {/* Full Screen Panel */}
          <div className="w-full h-full bg-white shadow-2xl flex flex-col animate-in fade-in duration-300">
            <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50 sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedLead.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                     selectedLead.status === 'Novo' ? 'bg-blue-100 text-blue-700' :
                     selectedLead.status === 'Vendido' ? 'bg-green-100 text-green-700' :
                     selectedLead.status === 'Perdido' ? 'bg-red-100 text-red-700' :
                     'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedLead.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(selectedLead.date || Date.now()).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-2 hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="max-w-4xl mx-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-gray-500"><Mail size={18} /></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Email</p>
                    <p className="text-sm text-gray-800">{selectedLead.email || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg text-green-600"><DollarSign size={18} /></div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Valor</p>
                    <p className="text-sm font-bold text-green-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedLead.value)}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Message Suggestions with Send Buttons */}
              <MessageSuggestionsPanel
                client={{
                  id: selectedLead.id,
                  name: selectedLead.name,
                  email: selectedLead.email,
                  phone: selectedLead.phone,
                  type: 'lead',
                  leadStatus: selectedLead.status,
                  value: selectedLead.value,
                  daysSinceLastContact: Math.floor((Date.now() - new Date(selectedLead.date).getTime()) / (1000 * 60 * 60 * 24)),
                  answers: selectedLead.answers
                }}
                insightType={selectedLead.status === 'Vendido' ? 'opportunity' : selectedLead.status === 'Perdido' ? 'recovery' : 'sales'}
                showSendButtons={true}
              />

              {selectedLead.answers && Object.keys(selectedLead.answers).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} className="text-gray-400" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase">Respostas do Formulário</h3>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {Object.entries(selectedLead.answers).map(([questionId, answerData]: [string, any]) => (
                      <div key={questionId} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <p className="text-xs text-gray-500 font-semibold mb-1.5">{getQuestionText(selectedLead, questionId)}</p>
                        <div className="flex justify-between items-start">
                          <p className="text-gray-900 font-medium text-base">{Array.isArray(answerData.value) ? answerData.value.join(', ') : answerData.value}</p>
                          {answerData.optionSelected?.value > 0 && (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100">
                              + R$ {answerData.optionSelected.value}
                            </span>
                          )}
                        </div>
                        {answerData.followUps && Object.values(answerData.followUps).some(text => text) && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            {Object.entries(answerData.followUps).map(([optId, text]) => 
                              text ? (
                                <div key={optId}>
                                  <p className="text-xs text-gray-500 font-medium italic">Informação adicional:</p>
                                  <p className="text-sm text-gray-800 font-medium pl-2 border-l-2 border-gray-200 mt-1">{text as string}</p>
                                </div>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right flex-shrink-0">
              <button 
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OpportunityAnalysis;
