import React, { useMemo } from 'react';
import { Lead, NPSResponse } from '@/types';
import { 
  TrendingUp, DollarSign, Users, Star, Target, Heart, 
  AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight,
  Calendar, Award, Zap, TrendingDown
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface ValueDeliveredProps {
  leads: Lead[];
  npsData: NPSResponse[];
}

interface Metrics {
  totalOpportunities: number;
  totalOpportunitiesValue: number;
  convertedSales: number;
  convertedSalesValue: number;
  conversionRate: number;
  totalNPS: number;
  npsScore: number;
  promoters: number;
  detractors: number;
  detractorsConverted: number;
  leadsRecovered: number;
  leadsRecoveredValue: number;
  averageTicket: number;
  opportunitiesIdentified: number;
  opportunitiesIdentifiedValue: number;
}

const ValueDelivered: React.FC<ValueDeliveredProps> = ({ leads, npsData }) => {
  
  // Calculate all metrics
  const metrics = useMemo((): Metrics => {
    // Leads metrics
    const totalOpportunities = leads.length;
    const totalOpportunitiesValue = leads.reduce((sum, l) => sum + Number(l.value || 0), 0);
    
    const convertedLeads = leads.filter(l => l.status === 'Vendido');
    const convertedSales = convertedLeads.length;
    const convertedSalesValue = convertedLeads.reduce((sum, l) => sum + Number(l.value || 0), 0);
    
    const conversionRate = totalOpportunities > 0 ? (convertedSales / totalOpportunities) * 100 : 0;
    
    const averageTicket = convertedSales > 0 ? convertedSalesValue / convertedSales : 0;
    
    // NPS metrics
    const totalNPS = npsData.length;
    const promoters = npsData.filter(n => n.status === 'Promotor').length;
    const detractors = npsData.filter(n => n.status === 'Detrator').length;
    const npsScore = totalNPS > 0 
      ? Math.round(((promoters - detractors) / totalNPS) * 100)
      : 0;
    
    // Detractors converted (simplified: detractors with multiple responses showing improvement)
    const detractorsConverted = 0; // TODO: Implement logic based on customer journey
    
    // Leads recovered (leads that were stale but then converted)
    const leadsRecovered = leads.filter(l => {
      const daysSinceCreation = Math.floor((Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24));
      return (l.status === 'Vendido') && daysSinceCreation > 7;
    }).length;
    
    const leadsRecoveredValue = leads
      .filter(l => {
        const daysSinceCreation = Math.floor((Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24));
        return (l.status === 'Vendido') && daysSinceCreation > 7;
      })
      .reduce((sum, l) => sum + Number(l.value || 0), 0);
    
    // Opportunities identified by the system (high-value leads in negotiation)
    const opportunitiesIdentified = leads.filter(l => 
      l.status === 'Negociação' && Number(l.value || 0) >= 1000
    ).length;
    
    const opportunitiesIdentifiedValue = leads
      .filter(l => l.status === 'Negociação' && Number(l.value || 0) >= 1000)
      .reduce((sum, l) => sum + Number(l.value || 0), 0);
    
    return {
      totalOpportunities,
      totalOpportunitiesValue,
      convertedSales,
      convertedSalesValue,
      conversionRate,
      totalNPS,
      npsScore,
      promoters,
      detractors,
      detractorsConverted,
      leadsRecovered,
      leadsRecoveredValue,
      averageTicket,
      opportunitiesIdentified,
      opportunitiesIdentifiedValue
    };
  }, [leads, npsData]);

  // Prepare chart data - Sales over time
  const salesChartData = useMemo(() => {
    const monthlyData: Record<string, { month: string; value: number; count: number }> = {};
    
    leads.filter(l => l.status === 'Vendido').forEach(lead => {
      const date = new Date(lead.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthLabel, value: 0, count: 0 };
      }
      
      monthlyData[monthKey].value += Number(lead.value || 0);
      monthlyData[monthKey].count += 1;
    });
    
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  }, [leads]);

  // NPS distribution
  const npsDistribution = useMemo(() => {
    const promoters = npsData.filter(n => n.status === 'Promotor').length;
    const neutrals = npsData.filter(n => n.status === 'Neutro').length;
    const detractors = npsData.filter(n => n.status === 'Detrator').length;
    
    return [
      { name: 'Promotores', value: promoters, color: '#10b981' },
      { name: 'Neutros', value: neutrals, color: '#f59e0b' },
      { name: 'Detratores', value: detractors, color: '#ef4444' }
    ];
  }, [npsData]);

  // Lead status distribution
  const leadStatusData = useMemo(() => {
    const statusCount: Record<string, number> = {};
    
    leads.forEach(lead => {
      statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
    });
    
    return Object.entries(statusCount).map(([status, count]) => ({
      status,
      count
    }));
  }, [leads]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Valor Entregue</h1>
        <p className="text-gray-600">Visualize o impacto e os resultados que o sistema Hello Growth está gerando para o seu negócio</p>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Opportunities */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Target size={24} className="text-white" />
            </div>
            <div className="flex items-center gap-1 text-blue-700 text-sm font-medium">
              <TrendingUp size={16} />
              +{metrics.totalOpportunities}
            </div>
          </div>
          <h3 className="text-sm font-medium text-blue-900 mb-1">Oportunidades Geradas</h3>
          <p className="text-3xl font-bold text-blue-900">{metrics.totalOpportunities}</p>
          <p className="text-sm text-blue-700 mt-2">
            R$ {metrics.totalOpportunitiesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Converted Sales */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <DollarSign size={24} className="text-white" />
            </div>
            <div className="flex items-center gap-1 text-green-700 text-sm font-medium">
              <ArrowUpRight size={16} />
              {metrics.conversionRate.toFixed(1)}%
            </div>
          </div>
          <h3 className="text-sm font-medium text-green-900 mb-1">Vendas Convertidas</h3>
          <p className="text-3xl font-bold text-green-900">{metrics.convertedSales}</p>
          <p className="text-sm text-green-700 mt-2">
            R$ {metrics.convertedSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* NPS Score */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Star size={24} className="text-white" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${
              metrics.npsScore >= 50 ? 'text-green-700' : metrics.npsScore >= 0 ? 'text-yellow-700' : 'text-red-700'
            }`}>
              {metrics.npsScore >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {metrics.npsScore >= 50 ? 'Excelente' : metrics.npsScore >= 0 ? 'Bom' : 'Crítico'}
            </div>
          </div>
          <h3 className="text-sm font-medium text-purple-900 mb-1">NPS Registrados</h3>
          <p className="text-3xl font-bold text-purple-900">{metrics.totalNPS}</p>
          <p className="text-sm text-purple-700 mt-2">
            Score: {metrics.npsScore}
          </p>
        </div>

        {/* Leads Recovered */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
              <Heart size={24} className="text-white" />
            </div>
            <div className="flex items-center gap-1 text-orange-700 text-sm font-medium">
              <CheckCircle size={16} />
              Recuperados
            </div>
          </div>
          <h3 className="text-sm font-medium text-orange-900 mb-1">Leads Recuperados</h3>
          <p className="text-3xl font-bold text-orange-900">{metrics.leadsRecovered}</p>
          <p className="text-sm text-orange-700 mt-2">
            R$ {metrics.leadsRecoveredValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average Ticket */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Award size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Ticket Médio</h3>
              <p className="text-2xl font-bold text-gray-900">
                R$ {metrics.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Promoters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Promotores</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.promoters}</p>
            </div>
          </div>
        </div>

        {/* Opportunities Identified */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Zap size={20} className="text-yellow-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600">Oportunidades Identificadas</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.opportunitiesIdentified}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Over Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{ minHeight: '400px' }}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Vendas ao Longo do Tempo</h3>
          {salesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Nenhuma venda registrada ainda
            </div>
          )}
        </div>

        {/* NPS Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{ minHeight: '400px' }}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Distribuição NPS</h3>
          {npsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={npsDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {npsDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Nenhum NPS registrado ainda
            </div>
          )}
        </div>
      </div>

      {/* Lead Status Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{ minHeight: '400px' }}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Distribuição de Status dos Leads</h3>
        {leadStatusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1">
                {leadStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            Nenhum lead registrado ainda
          </div>
        )}
      </div>

      {/* Summary Box */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200 p-8">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp size={32} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-indigo-900 mb-3">Resumo do Valor Entregue</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-indigo-900">
              <div>
                <p className="text-sm text-indigo-700 mb-1">💰 Valor Total Identificado</p>
                <p className="text-xl font-bold">
                  R$ {(metrics.totalOpportunitiesValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-indigo-700 mb-1">✅ Valor Convertido</p>
                <p className="text-xl font-bold">
                  R$ {metrics.convertedSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-indigo-700 mb-1">📊 Taxa de Conversão</p>
                <p className="text-xl font-bold">{metrics.conversionRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-indigo-700 mb-1">⚡ Oportunidades em Aberto</p>
                <p className="text-xl font-bold">
                  R$ {metrics.opportunitiesIdentifiedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValueDelivered;
