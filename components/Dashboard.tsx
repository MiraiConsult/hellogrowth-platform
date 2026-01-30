
import React, { useMemo } from 'react';
import { PlanType, Lead, NPSResponse } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Star, DollarSign, AlertCircle, Zap, FileText, CheckCircle } from 'lucide-react';

interface DashboardProps {
  activePlan: PlanType;
  leads: Lead[];
  npsData: NPSResponse[];
  formsCount?: number;     // New prop
  campaignsCount?: number; // New prop
}

const Dashboard: React.FC<DashboardProps> = ({ activePlan, leads, npsData, formsCount = 0, campaignsCount = 0 }) => {
  // Dynamic Calculations ensuring real-time updates based on props
  const totalLeads = leads.length;
  const totalValue = leads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  
  const npsScore = useMemo(() => {
     if (npsData.length === 0) return 0;
     
     const promoters = npsData.filter(n => n.score >= 9).length;
     const detractors = npsData.filter(n => n.score <= 6).length;
     const total = npsData.length;

     const rawScore = Math.round(((promoters - detractors) / total) * 100);
     return rawScore;
  }, [npsData]);
  
  const npsDistribution = useMemo(() => [
    { name: 'Promotores', value: npsData.filter(n => n.score >= 9).length, color: '#10b981' },
    { name: 'Neutros', value: npsData.filter(n => n.score >= 7 && n.score <= 8).length, color: '#fbbf24' },
    { name: 'Detratores', value: npsData.filter(n => n.score <= 6).length, color: '#ef4444' },
  ], [npsData]);

  const funnelData = useMemo(() => [
    { name: 'Novos', value: leads.filter(l => l.status === 'Novo').length, fill: '#6ee7b7' },
    { name: 'Contato', value: leads.filter(l => l.status === 'Em Contato').length, fill: '#34d399' },
    { name: 'Negoc.', value: leads.filter(l => l.status === 'Negociação').length, fill: '#10b981' },
    { name: 'Vendido', value: leads.filter(l => l.status === 'Vendido').length, fill: '#059669' },
  ], [leads]);

  // Calculate real correlation data from actual leads and NPS
  const correlationData = useMemo(() => {
    if (leads.length === 0 && npsData.length === 0) return [];

    // Group by Month using a sortable key YYYY-MM
    const grouped = new Map<string, { sortKey: string; name: string; dealValue: number; npsScores: number[] }>();

    const processEntry = (entry: Lead | NPSResponse, isLead: boolean) => {
        const date = new Date(entry.date);
        // Ignore invalid dates
        if (isNaN(date.getTime())) return;
        
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        
        const sortKey = `${year}-${String(month).padStart(2, '0')}`; // e.g., "2023-10" for November
        const monthName = date.toLocaleString('pt-BR', { month: 'short' }); // e.g., "nov."

        if (!grouped.has(sortKey)) {
            grouped.set(sortKey, { sortKey, name: monthName, dealValue: 0, npsScores: [] });
        }

        const group = grouped.get(sortKey)!;
        if (isLead) {
            group.dealValue += Number((entry as Lead).value) || 0;
        } else {
            group.npsScores.push((entry as NPSResponse).score);
        }
    };

    leads.forEach(l => processEntry(l, true));
    npsData.forEach(n => processEntry(n, false));

    // Convert map to array, sort by key, take the last 3 months, and then format for the chart
    return Array.from(grouped.values())
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .slice(-3) // Limit to last 3 months with data
        .map(data => {
            let npsScore = 0;
            if (data.npsScores.length > 0) {
                const promoters = data.npsScores.filter(s => s >= 9).length;
                const detractors = data.npsScores.filter(s => s <= 6).length;
                const rawNps = Math.round(((promoters - detractors) / data.npsScores.length) * 100);
                npsScore = Math.max(0, rawNps); // Clamp at 0 for chart display consistency
            }
            
            return {
                name: data.name,
                dealValue: data.dealValue,
                npsScore: npsScore,
                retention: 0, // This field seems unused
            };
        });
  }, [leads, npsData]);

  const isTrial = activePlan === 'trial';
  const isGrowth = activePlan === 'growth' || activePlan === 'growth_lifetime' || isTrial;
  const isClient = activePlan === 'client' || isGrowth;
  const isRating = activePlan === 'rating' || isGrowth;

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Unificado</h1>
          <p className="text-gray-500">Visão geral da sua jornada {isGrowth ? 'completa' : ''}.</p>
        </div>
        {isGrowth && (
           <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${activePlan === 'growth_lifetime' ? 'bg-gray-900 text-yellow-400 border-gray-700' : activePlan === 'trial' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-primary-100 text-primary-800 border-primary-200'}`}>
             {activePlan === 'growth_lifetime' && <Zap size={12} fill="currentColor" />}
             {activePlan === 'growth_lifetime' ? 'Lifetime Pro Ativo' : activePlan === 'trial' ? 'Trial Ativo' : 'HelloGrowth Ativo'}
           </span>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isClient && (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Oportunidades</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">{totalLeads}</h3>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Users size={20} />
                </div>
              </div>
              <p className="text-sm text-green-600 mt-4 flex items-center gap-1">
                <TrendingUp size={14} /> Real
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Valor em Pipeline</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                  </h3>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                  <DollarSign size={20} />
                </div>
              </div>
              <p className="text-sm text-green-600 mt-4 flex items-center gap-1">
                <TrendingUp size={14} /> Real
              </p>
            </div>
            
            {/* NEW: Active Forms Counter */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Formulários Ativos</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">{formsCount}</h3>
                </div>
                <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                  <FileText size={20} />
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-4 flex items-center gap-1">
                Pré-Venda
              </p>
            </div>
          </>
        )}

        {isRating && (
          <>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">NPS Score</p>
                  <h3 className={`text-2xl font-bold mt-2 ${npsScore >= 75 ? 'text-green-600' : npsScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {npsScore}
                  </h3>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                  <Star size={20} />
                </div>
              </div>
              <div className="mt-4 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${npsScore >= 75 ? 'bg-green-500' : npsScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                    style={{ width: `${Math.max(5, Math.abs(npsScore))}%` }} 
                ></div>
              </div>
            </div>
            
            {/* NEW: Active Campaigns Counter */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pesquisas Ativas</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">{campaignsCount}</h3>
                </div>
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <CheckCircle size={20} />
                </div>
              </div>
               <p className="text-sm text-gray-400 mt-4 flex items-center gap-1">
                Pós-Venda (NPS)
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ações Pendentes</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">
                    {npsData.filter(n => n.status === 'Detrator').length}
                  </h3>
                </div>
                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                  <AlertCircle size={20} />
                </div>
              </div>
               <p className="text-sm text-gray-500 mt-4">Detratores que precisam de atenção</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Growth Specific: Correlation Chart */}
        {isGrowth && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Correlação: Vendas vs. Satisfação</h3>
            {correlationData.length > 0 ? (
                <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={correlationData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#10b981" orientation="left" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" stroke="#8b5cf6" orientation="right" axisLine={false} tickLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="dealValue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Valor Vendas (R$)" />
                    <Line yAxisId="right" type="monotone" dataKey="npsScore" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} name="NPS Score (0-100)" />
                    </LineChart>
                </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-80 w-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p>Sem dados suficientes para gerar gráfico.</p>
                </div>
            )}
          </div>
        )}

        {/* HelloClient Specific: Funnel */}
        {isClient && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Funil de Oportunidades</h3>
             <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f9fafb'}} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
        )}

        {/* HelloRating Specific: NPS Distribution */}
        {isRating && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Distribuição NPS</h3>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={npsDistribution}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {npsDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                 <span className="text-3xl font-bold text-gray-800">{npsScore}</span>
                 <span className="text-xs text-gray-500 uppercase">Score</span>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {npsDistribution.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <span className="text-sm text-gray-600">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
