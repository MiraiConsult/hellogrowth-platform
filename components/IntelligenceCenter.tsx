'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { Lead, NPSResponse, InsightType } from '@/types';
import InsightDetailView from '@/components/InsightDetailView';
import { 
  Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Target, Users, 
  DollarSign, Heart, MessageSquare, ChevronRight, Sparkles, Loader2,
  Phone, Mail, ArrowUpRight, RefreshCw, Filter, Zap, Brain, HelpCircle
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/lib/supabase';

interface ActionInsight {
  id: string;
  type: InsightType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  metric?: string;
  actionLabel: string;
  actionTarget: string;
  createdAt: string;
}

interface ConsultantQuestion {
  id: string;
  category: 'sales' | 'satisfaction' | 'strategy' | 'operations';
  question: string;
  icon: string;
}

interface IntelligenceAction {
  id: string;
  client_id: string;
  insight_type: string;
  action_type: string;
}

interface IntelligenceCenterProps {
  leads: Lead[];
  npsData: NPSResponse[];
  onNavigateToCustomer?: (email: string) => void;
  onNavigateToLead?: (id: string) => void;
  onNavigate: (view: string, filter?: any) => void;
  userId: string;
}

const IntelligenceCenter: React.FC<IntelligenceCenterProps> = ({ 
  leads, 
  npsData, 
  onNavigateToCustomer,
  onNavigateToLead,
  onNavigate,
  userId
}) => {
  const tenantId = useTenantId()

  const [activeFilter, setActiveFilter] = useState<InsightType | 'all'>('all');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<ConsultantQuestion | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [detailViewType, setDetailViewType] = useState<'risk' | 'opportunity' | 'sales' | 'recovery' | null>(null);
  const [intelligenceActions, setIntelligenceActions] = useState<IntelligenceAction[]>([]);

  // Fetch intelligence actions to filter completed/dismissed clients
  useEffect(() => {
    const fetchActions = async () => {
      if (!supabase || !userId) return;
      
      try {
        const { data, error } = await supabase
          .from('intelligence_actions')
          .select('id, client_id, insight_type, action_type')
          .eq('tenant_id', tenantId);
        
        if (error) throw error;
        setIntelligenceActions(data || []);
      } catch (error) {
        console.error('Error fetching intelligence actions:', error);
      }
    };
    
    fetchActions();
  }, [userId]);

  // Helper function to check if a client is completed or dismissed for a specific insight type
  const isClientActive = (clientId: string, insightType: string): boolean => {
    const action = intelligenceActions.find(
      a => a.client_id === clientId && a.insight_type === insightType
    );
    return !action || (action.action_type !== 'completed' && action.action_type !== 'dismissed');
  };

  // Handle insight action click
  const handleInsightAction = (actionTarget: string, insightType?: InsightType) => {
    // Map insight types to detail view types
    const typeMap: Record<InsightType, 'risk' | 'opportunity' | 'sales' | 'recovery'> = {
      'risk': 'risk',
      'opportunity': 'opportunity',
      'sales': 'sales',
      'recovery': 'recovery'
    };

    // Check for specific detail view targets first
    if (actionTarget === 'risk-detail') {
      setDetailViewType('risk');
      setShowDetailView(true);
    } else if (actionTarget === 'sales-detail') {
      setDetailViewType('sales');
      setShowDetailView(true);
    } else if (actionTarget === 'opportunity-detail') {
      setDetailViewType('opportunity');
      setShowDetailView(true);
    } else if (actionTarget === 'recovery-detail') {
      setDetailViewType('recovery');
      setShowDetailView(true);
    } else if (insightType && typeMap[insightType]) {
      setDetailViewType(typeMap[insightType]);
      setShowDetailView(true);
    } else if (actionTarget === 'kanban') {
      onNavigate('kanban');
    } else if (actionTarget === 'nps' || actionTarget === 'analytics') {
      onNavigate('nps-analytics');
    } else if (actionTarget === 'forms') {
      onNavigate('form-list');
    }
  };

  const consultantQuestions: ConsultantQuestion[] = [
    { id: '1', category: 'sales', question: 'Quais leads têm maior potencial de conversão?', icon: 'target' },
    { id: '2', category: 'satisfaction', question: 'Como posso melhorar meu NPS rapidamente?', icon: 'trending-up' },
    { id: '3', category: 'strategy', question: 'Qual serviço está gerando mais promotores?', icon: 'heart' },
    { id: '4', category: 'operations', question: 'Quais clientes precisam de atenção urgente?', icon: 'alert' },
    { id: '5', category: 'sales', question: 'Qual é o ticket médio dos meus leads qualificados?', icon: 'dollar' },
    { id: '6', category: 'strategy', question: 'Existe correlação entre pré-venda e satisfação?', icon: 'brain' },
  ];

  // Generate insights based on data - WITH ACTIVE CLIENT FILTERING
  const insights = useMemo(() => {
    const generatedInsights: ActionInsight[] = [];
    const now = new Date();

    // === OPPORTUNITY INSIGHTS ===
    
    // Promoters that could be referrals - FILTER ACTIVE ONLY
    const activePromoters = npsData.filter(n => 
      n.status === 'Promotor' &&
      isClientActive(n.id, 'opportunity')
    );
    if (activePromoters.length > 0) {
      generatedInsights.push({
        id: 'opp-1',
        type: 'opportunity',
        priority: activePromoters.length >= 5 ? 'high' : 'medium',
        title: `${activePromoters.length} promotores podem indicar novos clientes`,
        description: 'Clientes satisfeitos são sua melhor fonte de indicações. Considere um programa de referência.',
        metric: `${activePromoters.length} promotores`,
        actionLabel: 'Ver Promotores',
        actionTarget: 'opportunity-detail',
        createdAt: now.toISOString()
      });
    }

    // === RISK INSIGHTS ===

    // Detratores (NPS <= 6) - FILTER ACTIVE ONLY
    const activeDetractors = npsData.filter(n => 
      n.status === 'Detrator' &&
      isClientActive(n.id, 'risk')
    );
    
    // Leads stuck (any status, not just "Novo") - FILTER ACTIVE ONLY
    const stuckLeads = leads.filter(l => {
      if (l.status === 'Vendido' || l.status === 'Perdido') return false;
      if (!isClientActive(l.id, 'risk')) return false;
      const daysSince = Math.floor((now.getTime() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 7;
    });
    
    // Total de riscos = detratores (NPS <= 6) + leads parados (ATIVOS)
    const totalRisks = activeDetractors.length + stuckLeads.length;
    
    if (totalRisks > 0) {
      generatedInsights.push({
        id: 'risk-1',
        type: 'risk',
        priority: activeDetractors.length > 0 ? 'high' : 'medium',
        title: `${totalRisks} clientes e leads em risco`,
        description: activeDetractors.length > 0 
          ? `${activeDetractors.length} detratores (NPS ≤ 6) + ${stuckLeads.length} leads parados há mais de 7 dias.`
          : `${stuckLeads.length} leads parados há mais de 7 dias.`,
        metric: `${totalRisks} total`,
        actionLabel: 'Ver Riscos',
        actionTarget: 'risk-detail',
        createdAt: now.toISOString()
      });
    }

    // === SALES INSIGHTS ===

    // Vendas concluídas - SEMPRE MOSTRAR
    const soldLeads = leads.filter(l => l.status === 'Vendido');
    if (soldLeads.length > 0) {
      const totalValue = soldLeads.reduce((acc, l) => acc + Number(l.value || 0), 0);
      generatedInsights.push({
        id: 'sales-1',
        type: 'sales',
        priority: 'high',
        title: `${soldLeads.length} vendas concluídas`,
        description: `Vendas realizadas totalizando R$ ${totalValue.toLocaleString('pt-BR')}. Clique para visualizar e editar.`,
        metric: `R$ ${totalValue.toLocaleString('pt-BR')}`,
        actionLabel: 'Ver Vendas',
        actionTarget: 'sales-detail',
        createdAt: now.toISOString()
      });
    }

    // Leads qualificados prontos para fechamento - FILTER ACTIVE ONLY
    const qualifiedLeads = leads.filter(l => 
      (l.status === 'Novo' || l.status === 'Em Contato' || l.status === 'Negociação') &&
      isClientActive(l.id, 'sales')
    );
    if (qualifiedLeads.length > 0) {
      const totalValue = qualifiedLeads.reduce((acc, l) => acc + Number(l.value || 0), 0);
      generatedInsights.push({
        id: 'sales-2',
        type: 'sales',
        priority: 'medium',
        title: `${qualifiedLeads.length} leads prontos para fechamento`,
        description: `Leads qualificados totalizando R$ ${totalValue.toLocaleString('pt-BR')}. Priorize o contato para fechar negócio.`,
        metric: `R$ ${totalValue.toLocaleString('pt-BR')}`,
        actionLabel: 'Ver Leads',
        actionTarget: 'sales-detail',
        createdAt: now.toISOString()
      });
    }

    // === RECOVERY INSIGHTS ===

    // Apenas Neutros (NPS 7-8) que podem ser recuperados - FILTER ACTIVE ONLY
    const recoverableClients = npsData.filter(d => 
      d.status === 'Neutro' &&
      isClientActive(d.id, 'recovery')
    );
    if (recoverableClients.length > 0) {
      generatedInsights.push({
        id: 'recovery-1',
        type: 'recovery',
        priority: 'medium',
        title: `${recoverableClients.length} clientes neutros com potencial de recuperação`,
        description: 'Clientes com NPS entre 7-8 que podem ser convertidos em promotores com atenção adequada.',
        metric: `${recoverableClients.length} neutros`,
        actionLabel: 'Ver Clientes',
        actionTarget: 'recovery-detail',
        createdAt: now.toISOString()
      });
    }

    // === ALL (TODOS) - Resumo geral incluindo vendas ===
    // Adicionar insight de vendas concluídas para aba "Todos" também
    if (soldLeads.length > 0) {
      const totalValue = soldLeads.reduce((acc, l) => acc + Number(l.value || 0), 0);
      generatedInsights.push({
        id: 'all-sales',
        type: 'sales',
        priority: 'high',
        title: `🎉 ${soldLeads.length} vendas concluídas`,
        description: `Vendas realizadas totalizando R$ ${totalValue.toLocaleString('pt-BR')}. Clique para visualizar e editar.`,
        metric: `R$ ${totalValue.toLocaleString('pt-BR')}`,
        actionLabel: 'Ver Vendas',
        actionTarget: 'sales-detail',
        createdAt: now.toISOString()
      });
    }

    return generatedInsights;
  }, [leads, npsData, intelligenceActions, activeFilter]);

  // Filtered insights
  const filteredInsights = useMemo(() => {
    if (activeFilter === 'all') return insights;
    return insights.filter(i => i.type === activeFilter);
  }, [insights, activeFilter]);

  // Correlation data
  const correlationData = useMemo(() => {
    // Group by month
    const monthlyData = new Map<string, { leads: number; nps: number[]; value: number }>();
    
    leads.forEach(l => {
      const month = new Date(l.date).toLocaleDateString('pt-BR', { month: 'short' });
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { leads: 0, nps: [], value: 0 });
      }
      const data = monthlyData.get(month)!;
      data.leads++;
      data.value += Number(l.value || 0);
    });

    npsData.forEach(n => {
      const month = new Date(n.date).toLocaleDateString('pt-BR', { month: 'short' });
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { leads: 0, nps: [], value: 0 });
      }
      monthlyData.get(month)!.nps.push(n.score);
    });

    return Array.from(monthlyData.entries()).slice(-6).map(([month, data]) => ({
      name: month,
      leads: data.leads,
      npsScore: data.nps.length > 0 
        ? Math.round(((data.nps.filter(s => s >= 9).length - data.nps.filter(s => s <= 6).length) / data.nps.length) * 100)
        : 0,
      value: data.value
    }));
  }, [leads, npsData]);

  // Handle AI question
  const handleAskQuestion = async (question: ConsultantQuestion) => {
    setSelectedQuestion(question);
    setIsLoadingAI(true);
    setAiResponse(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (apiKey) {
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        // Build context from data
        const context = `
          DADOS DA EMPRESA:
          - Total de Leads: ${leads.length}
          - Leads por Status: Novos (${leads.filter(l => l.status === 'Novo').length}), Em Contato (${leads.filter(l => l.status === 'Em Contato').length}), Negociação (${leads.filter(l => l.status === 'Negociação').length}), Vendidos (${leads.filter(l => l.status === 'Vendido').length}), Perdidos (${leads.filter(l => l.status === 'Perdido').length})
          - Valor Total em Pipeline: R$ ${leads.filter(l => l.status !== 'Vendido' && l.status !== 'Perdido').reduce((acc, l) => acc + Number(l.value || 0), 0).toLocaleString('pt-BR')}
          - Total de Respostas NPS: ${npsData.length}
          - Promotores: ${npsData.filter(n => n.status === 'Promotor').length}
          - Neutros: ${npsData.filter(n => n.status === 'Neutro').length}
          - Detratores: ${npsData.filter(n => n.status === 'Detrator').length}
          - NPS Score: ${npsData.length > 0 ? Math.round(((npsData.filter(n => n.score >= 9).length - npsData.filter(n => n.score <= 6).length) / npsData.length) * 100) : 0}
        `;

        const prompt = `
          Você é um consultor de negócios especializado em pré-venda e pós-venda.
          
          ${context}
          
          PERGUNTA DO USUÁRIO: ${question.question}
          
          Responda de forma direta, prática e acionável em no máximo 3 parágrafos.
          Use dados específicos da empresa quando possível.
          Sugira ações concretas que podem ser tomadas imediatamente.
        `;

        const result = await model.generateContent(prompt);

        setAiResponse(result.response.text() || "Não foi possível gerar uma resposta.");
      } else {
        // Mock response
        await new Promise(r => setTimeout(r, 1500));
        setAiResponse(`**Análise baseada nos seus dados:**\n\nCom base nos ${leads.length} leads e ${npsData.length} respostas de NPS, identifiquei algumas oportunidades importantes.\n\n**Recomendação:** Foque primeiro nos leads em negociação de alto valor e nos detratores que precisam de atenção imediata. Isso pode aumentar sua conversão em até 25% e melhorar seu NPS significativamente.`);
      }
    } catch (e) {
      console.error(e);
      setAiResponse("Erro ao processar sua pergunta. Tente novamente.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getInsightIcon = (type: InsightType) => {
    switch (type) {
      case 'opportunity': return <Target size={18} />;
      case 'risk': return <AlertTriangle size={18} />;
      case 'sales': return <DollarSign size={18} />;
      case 'recovery': return <Heart size={18} />;
    }
  };

  const getInsightColor = (type: InsightType) => {
    switch (type) {
      case 'opportunity': return 'bg-green-50 border-green-200 text-green-700';
      case 'risk': return 'bg-red-50 border-red-200 text-red-700';
      case 'sales': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'recovery': return 'bg-purple-50 border-purple-200 text-purple-700';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const mainContent = (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lightbulb className="text-yellow-500" /> Centro de Inteligência
        </h1>
        <p className="text-gray-500">Insights e recomendações baseados nos seus dados de pré-venda e pós-venda</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filter Tabs */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos ({insights.length})
              </button>
              <button
                onClick={() => setActiveFilter('opportunity')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeFilter === 'opportunity' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                <Target size={16} /> Oportunidades ({insights.filter(i => i.type === 'opportunity').length})
              </button>
              <button
                onClick={() => setActiveFilter('risk')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeFilter === 'risk' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                <AlertTriangle size={16} /> Riscos ({insights.filter(i => i.type === 'risk').length})
              </button>
              <button
                onClick={() => setActiveFilter('sales')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeFilter === 'sales' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <DollarSign size={16} /> Vendas ({insights.filter(i => i.type === 'sales').length})
              </button>
              <button
                onClick={() => setActiveFilter('recovery')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeFilter === 'recovery' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <Heart size={16} /> Recuperação ({insights.filter(i => i.type === 'recovery').length})
              </button>
            </div>
          </div>

          {/* Insights Cards */}
          <div className="space-y-4">
            {filteredInsights.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Lightbulb size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum insight disponível</h3>
                <p className="text-gray-500">Continue coletando dados para gerar insights personalizados.</p>
              </div>
            ) : (
              filteredInsights.map(insight => (
                <div 
                  key={insight.id}
                  className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${getInsightColor(insight.type).split(' ')[1]}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getInsightColor(insight.type)}`}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(insight.priority)}`}>
                          {insight.priority === 'high' ? 'Alta' : insight.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                      <div className="flex items-center justify-between">
                        {insight.metric && (
                          <span className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                            {insight.metric}
                          </span>
                        )}
                        <button onClick={() => handleInsightAction(insight.actionTarget, insight.type)} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                      {insight.actionLabel} <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Correlation Chart */}
          {correlationData.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Correlação: Pré-Venda vs Pós-Venda</h3>
              <div className="h-64" style={{ minHeight: '256px' }}>
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={correlationData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" stroke="#9ca3af" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#10b981" axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar yAxisId="left" dataKey="leads" fill="#10b981" radius={[4, 4, 0, 0]} name="Leads" />
                    <Bar yAxisId="right" dataKey="npsScore" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="NPS Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Consultant */}
        <div className="space-y-6">
          {/* AI Consultant */}
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-sm border border-purple-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="text-purple-600" size={24} />
              <h3 className="font-bold text-gray-900">Consultor Virtual</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Faça perguntas sobre seus dados e receba recomendações personalizadas.
            </p>

            {/* Quick Questions */}
            <div className="space-y-2 mb-4">
              {consultantQuestions.map(q => (
                <button
                  key={q.id}
                  onClick={() => handleAskQuestion(q)}
                  disabled={isLoadingAI}
                  className={`w-full text-left p-3 rounded-lg border transition-colors text-sm ${
                    selectedQuestion?.id === q.id 
                      ? 'bg-purple-100 border-purple-300 text-purple-800' 
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle size={14} className="text-purple-500 flex-shrink-0" />
                    <span>{q.question}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* AI Response */}
            {(isLoadingAI || aiResponse) && (
              <div className="bg-white rounded-lg border border-purple-200 p-4">
                {isLoadingAI ? (
                  <div className="flex items-center gap-2 text-purple-600">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-sm">Analisando seus dados...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{aiResponse}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Resumo Rápido</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Leads Ativos</span>
                <span className="font-bold text-gray-900">
                  {leads.filter(l => l.status !== 'Vendido' && l.status !== 'Perdido').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Taxa de Conversão</span>
                <span className="font-bold text-green-600">
                  {leads.length > 0 
                    ? Math.round((leads.filter(l => l.status === 'Vendido').length / leads.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">NPS Atual</span>
                <span className={`font-bold ${
                  npsData.length > 0 
                    ? (((npsData.filter(n => n.score >= 9).length - npsData.filter(n => n.score <= 6).length) / npsData.length) * 100) >= 50
                      ? 'text-green-600'
                      : 'text-red-600'
                    : 'text-gray-400'
                }`}>
                  {npsData.length > 0 
                    ? Math.round(((npsData.filter(n => n.score >= 9).length - npsData.filter(n => n.score <= 6).length) / npsData.length) * 100)
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Detratores Pendentes</span>
                <span className="font-bold text-red-600">
                  {npsData.filter(n => n.status === 'Detrator').length}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Ações Rápidas</h3>
            <div className="space-y-2">
              <button onClick={() => onNavigate('analytics')} className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2">
                <Phone size={18} /> Ver Detratores
              </button>
              <button onClick={() => onNavigate('nps-campaigns')} className="w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                <Mail size={18} /> Enviar Pesquisa NPS
              </button>
              <button onClick={() => onNavigate('digital-diagnostic')} className="w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                <RefreshCw size={18} /> Atualizar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render InsightDetailView if active
  if (showDetailView && detailViewType) {
    return (
      <InsightDetailView
        insightType={detailViewType}
        leads={leads}
        npsData={npsData}
        onBack={() => setShowDetailView(false)}
        userId={userId}
      />
    );
  }

  return mainContent;
};

export default IntelligenceCenter;
