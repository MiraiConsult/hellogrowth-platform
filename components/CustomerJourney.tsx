import React, { useState, useEffect, useMemo } from 'react';
import { NPSResponse, CustomerAction } from '@/types';

interface CustomerJourneyData {
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  totalResponses: number;
  firstResponseDate: string;
  lastResponseDate: string;
  currentStatus: 'Promotor' | 'Neutro' | 'Detrator';
  previousStatus?: 'Promotor' | 'Neutro' | 'Detrator';
  evolutionTrend: 'improving' | 'stable' | 'declining';
  averageScore: number;
  responses: NPSResponse[];
  actions: CustomerAction[];
  needsAttention: boolean;
  daysSinceLastContact: number;
}

interface AISuggestion {
  message: string;
  whatsappTemplate: string;
  emailTemplate: { subject: string; body: string };
  suggestedActions: string[];
}

import { 
  Users, Search, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle,
  Phone, Mail, MessageSquare, Calendar, ChevronRight, ChevronDown, Plus,
  Loader2, X, Clock, Star, Filter, ArrowUpRight, History, Send, Sparkles,
  Copy, ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MESSAGE_THEMES } from '@/components/message_themes';
import { MessageSuggestionsPanel } from '@/components/MessageSuggestionsPanel';

interface CustomerJourneyProps {
  userId: string;
  npsData: NPSResponse[];
  initialFilter?: { status?: string };
  onRefreshNPS?: () => void;
}

const CustomerJourney: React.FC<CustomerJourneyProps> = ({ userId, npsData, initialFilter, onRefreshNPS }) => {
  const [customerActions, setCustomerActions] = useState<CustomerAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Promotor' | 'Neutro' | 'Detrator'>('all');
  const [filterAttention, setFilterAttention] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerJourneyData | null>(null);
  const [newActionText, setNewActionText] = useState('');
  const [newActionType, setNewActionType] = useState<'contact' | 'offer' | 'resolution' | 'note' | 'followup'>('note');
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  // Fetch customer actions
  useEffect(() => {
    fetchCustomerActions();
  }, [userId]);

  // Generate AI suggestions when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      generateAISuggestions(selectedCustomer);
    }
  }, [selectedCustomer]);

  // Apply initial filter
  useEffect(() => {
    if (initialFilter?.status) {
      setFilterStatus(initialFilter.status as any);
    }
  }, [initialFilter]);


  const fetchCustomerActions = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_actions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // FIX: Update property mapping to match the CustomerAction type (snake_case).
        setCustomerActions(data.map(a => ({
          id: a.id,
          user_id: a.user_id,
          customer_email: a.customer_email,
          action_type: a.action_type,
          description: a.description,
          created_at: a.created_at
        })));
      }
    } catch (e) {
      console.error('Error fetching customer actions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI suggestions based on customer data
  const generateAISuggestions = async (customer: CustomerJourneyData) => {
    setIsLoadingAI(true);
    try {
      const latestResponse = customer.responses[customer.responses.length - 1];
      const context = {
        name: customer.customerName,
        status: customer.currentStatus,
        previousStatus: customer.previousStatus,
        trend: customer.evolutionTrend,
        averageScore: customer.averageScore,
        daysSinceContact: customer.daysSinceLastContact,
        lastComment: latestResponse?.comment || '',
        totalActions: customer.actions.length
      };

      // Generate contextual suggestions
      let message = '';
      let whatsappTemplate = '';
      let emailSubject = '';
      let emailBody = '';
      let suggestedActions: string[] = [];

      if (context.status === 'Detrator') {
        message = `${context.name} é um detrator com média ${context.averageScore}. ${context.daysSinceContact > 7 ? 'Atenção: sem contato há mais de 7 dias!' : ''} Priorize contato imediato para entender e resolver o problema.`;
        
        whatsappTemplate = `Olá ${context.name}! Notamos que sua experiência conosco não foi a ideal. Gostaríamos muito de entender o que aconteceu e como podemos melhorar. Podemos conversar?`;
        
        emailSubject = `${context.name}, queremos melhorar sua experiência`;
        emailBody = `Olá ${context.name},\n\nNotamos que sua experiência recente conosco não atendeu suas expectativas, e isso nos preocupa muito.\n\n${context.lastComment ? `Vimos seu comentário: "${context.lastComment}"\n\n` : ''}Gostaríamos de entender melhor o que aconteceu e encontrar uma solução para você. Sua satisfação é nossa prioridade.\n\nPodemos agendar uma conversa?\n\nAtenciosamente,\nEquipe`;
        
        suggestedActions = [
          'Ligar para entender o problema',
          'Oferecer compensação ou desconto',
          'Agendar reunião presencial',
          'Escalar para gerência'
        ];
      } else if (context.status === 'Neutro') {
        message = `${context.name} é neutro (média ${context.averageScore}). Há potencial para converter em promotor com atenção adequada.`;
        
        whatsappTemplate = `Oi ${context.name}! Obrigado pelo seu feedback. Queremos saber: o que poderíamos fazer para tornar sua experiência ainda melhor?`;
        
        emailSubject = `${context.name}, como podemos surpreender você?`;
        emailBody = `Olá ${context.name},\n\nAgradecemos seu feedback! Queremos ir além e transformar sua experiência em algo excepcional.\n\n${context.lastComment ? `Sobre seu comentário: "${context.lastComment}"\n\n` : ''}O que poderíamos fazer para superar suas expectativas?\n\nEstamos aqui para ouvir!\n\nAtenciosamente,\nEquipe`;
        
        suggestedActions = [
          'Pedir feedback específico',
          'Oferecer upgrade ou benefício',
          'Apresentar novos serviços',
          'Solicitar depoimento'
        ];
      } else { // Promotor
        if (context.trend === 'improving' && context.previousStatus) {
          message = `Excelente! ${context.name} evoluiu de ${context.previousStatus} para Promotor! Momento ideal para solicitar indicações e depoimento.`;
        } else {
          message = `${context.name} é promotor (média ${context.averageScore})! Aproveite para pedir indicações e fortalecer o relacionamento.`;
        }
        
        whatsappTemplate = `${context.name}, muito obrigado pelo seu feedback positivo! 😊 Ficamos muito felizes em saber que você está satisfeito. Você conhece alguém que poderia se beneficiar dos nossos serviços?`;
        
        emailSubject = `${context.name}, obrigado por ser nosso promotor!`;
        emailBody = `Olá ${name},\n\nQueremos agradecer imensamente pelo seu feedback positivo! Clientes como você são a razão do nosso sucesso.\n\n${context.lastComment ? `Adoramos ler: "${context.lastComment}"\n\n` : ''}Se você conhece alguém que poderia se beneficiar dos nossos serviços, ficaríamos muito gratos por uma indicação!\n\nContinue contando conosco!\n\nAtenciosamente,\nEquipe`;
        
        suggestedActions = [
          'Solicitar indicações',
          'Pedir avaliação no Google',
          'Oferecer programa de fidelidade',
          'Enviar brinde de agradecimento'
        ];
      }

      setAiSuggestion({
        message,
        whatsappTemplate,
        emailTemplate: { subject: emailSubject, body: emailBody },
        suggestedActions
      });
    } catch (e) {
      console.error('Error generating AI suggestions:', e);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Send WhatsApp message
  const handleSendWhatsApp = async () => {
    if (!selectedCustomer || !aiSuggestion) return;
    
    const phone = selectedCustomer.customerPhone?.replace(/[^0-9]/g, '');
    if (!phone) {
      alert('Cliente não possui telefone cadastrado');
      return;
    }

    const message = encodeURIComponent(aiSuggestion.whatsappTemplate);
    const whatsappUrl = `https://wa.me/55${phone}?text=${message}`;
    
    // Register action
    await handleAddAction('contact', `Mensagem WhatsApp enviada: "${aiSuggestion.whatsappTemplate}"`);
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  // Send Email
  const handleSendEmail = async () => {
    if (!selectedCustomer || !aiSuggestion) return;
    
    const { subject, body } = aiSuggestion.emailTemplate;
    const mailtoUrl = `mailto:${selectedCustomer.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Register action
    await handleAddAction('contact', `Email enviado: "${subject}"`);
    
    // Open email client
    window.location.href = mailtoUrl;
  };

  // Copy template
  const handleCopyTemplate = (text: string, type: 'whatsapp' | 'email') => {
    navigator.clipboard.writeText(text);
    alert(`Mensagem de ${type} copiada!`);
  };

  // Handle theme change
  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    const theme = MESSAGE_THEMES.find(t => t.id === themeId);
    if (theme && selectedCustomer) {
      const latestResponse = selectedCustomer.responses[selectedCustomer.responses.length - 1];
      const comment = latestResponse?.comment || '';
      
      const whatsappTemplate = theme.whatsappTemplate(selectedCustomer.customerName, comment);
      const emailTemplate = theme.emailTemplate(selectedCustomer.customerName, comment);
      
      setAiSuggestion({
        message: theme.description,
        whatsappTemplate,
        emailTemplate,
        suggestedActions: aiSuggestion?.suggestedActions || []
      });
    }
  };


  // Aggregate customer journey data
  const customerJourneys = useMemo(() => {
    const journeyMap = new Map<string, CustomerJourneyData>();

    // Group NPS responses by customer email
    npsData.forEach(response => {
      const email = response.customerEmail?.toLowerCase() || 'unknown';
      
      if (!journeyMap.has(email)) {
        journeyMap.set(email, {
          customerEmail: email,
          customerName: response.customerName || 'Cliente',
          customerPhone: response.customerPhone,
          totalResponses: 0,
          firstResponseDate: response.date,
          lastResponseDate: response.date,
          currentStatus: response.status,
          evolutionTrend: 'stable',
          averageScore: 0,
          responses: [],
          actions: [],
          needsAttention: false,
          daysSinceLastContact: 0
        });
      }

      const journey = journeyMap.get(email)!;
      journey.responses.push(response);
      journey.totalResponses++;
      
      // Update dates
      if (new Date(response.date) < new Date(journey.firstResponseDate)) {
        journey.firstResponseDate = response.date;
      }
      if (new Date(response.date) > new Date(journey.lastResponseDate)) {
        journey.lastResponseDate = response.date;
        journey.currentStatus = response.status;
        journey.customerName = response.customerName || journey.customerName;
        journey.customerPhone = response.customerPhone || journey.customerPhone;
      }
    });

    // Add actions to each customer
    customerActions.forEach(action => {
      // FIX: Use snake_case 'customer_email' to match the CustomerAction type.
      const email = action.customer_email.toLowerCase();
      if (journeyMap.has(email)) {
        journeyMap.get(email)!.actions.push(action);
      }
    });

    // Calculate metrics for each customer
    journeyMap.forEach((journey, email) => {
      // Sort responses by date
      journey.responses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Calculate average score
      const totalScore = journey.responses.reduce((acc, r) => acc + r.score, 0);
      journey.averageScore = Math.round((totalScore / journey.responses.length) * 10) / 10;

      // Determine evolution trend
      if (journey.responses.length >= 2) {
        const recent = journey.responses.slice(-2);
        const scoreDiff = recent[1].score - recent[0].score;
        if (scoreDiff >= 2) {
          journey.evolutionTrend = 'improving';
          journey.previousStatus = recent[0].status;
        } else if (scoreDiff <= -2) {
          journey.evolutionTrend = 'declining';
          journey.previousStatus = recent[0].status;
        }
      }

      // Calculate days since last contact
      const lastAction = journey.actions[0];
      if (lastAction) {
        // FIX: Use snake_case 'created_at' to match the CustomerAction type.
        journey.daysSinceLastContact = Math.floor(
          (new Date().getTime() - new Date(lastAction.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
      } else {
        journey.daysSinceLastContact = Math.floor(
          (new Date().getTime() - new Date(journey.lastResponseDate).getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      // Determine if needs attention
      journey.needsAttention = 
        (journey.currentStatus === 'Detrator' && journey.daysSinceLastContact > 7) ||
        (journey.evolutionTrend === 'declining') ||
        (journey.currentStatus === 'Detrator' && journey.actions.length === 0);
    });

    return Array.from(journeyMap.values())
      .sort((a, b) => {
        // Prioritize those needing attention
        if (a.needsAttention && !b.needsAttention) return -1;
        if (!a.needsAttention && b.needsAttention) return 1;
        // Then by last response date
        return new Date(b.lastResponseDate).getTime() - new Date(a.lastResponseDate).getTime();
      });
  }, [npsData, customerActions]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customerJourneys.filter(c => {
      const matchesSearch = 
        c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || c.currentStatus === filterStatus;
      const matchesAttention = !filterAttention || c.needsAttention;
      return matchesSearch && matchesStatus && matchesAttention;
    });
  }, [customerJourneys, searchTerm, filterStatus, filterAttention]);

  // Stats
  const stats = useMemo(() => {
    const total = customerJourneys.length;
    const promoters = customerJourneys.filter(c => c.currentStatus === 'Promotor').length;
    const detractors = customerJourneys.filter(c => c.currentStatus === 'Detrator').length;
    const needsAttention = customerJourneys.filter(c => c.needsAttention).length;
    const improving = customerJourneys.filter(c => c.evolutionTrend === 'improving').length;
    const declining = customerJourneys.filter(c => c.evolutionTrend === 'declining').length;
    
    return { total, promoters, detractors, needsAttention, improving, declining };
  }, [customerJourneys]);

  // Handle adding new action
  const handleAddAction = async (type?: string, description?: string) => {
    if (!selectedCustomer) return;
    
    const actionType = type || newActionType;
    const actionDescription = description || newActionText.trim();
    
    if (!actionDescription) return;
    
    setIsSavingAction(true);

    try {
      const { error } = await supabase
        .from('customer_actions')
        .insert({
          user_id: userId,
          customer_email: selectedCustomer.customerEmail,
          action_type: actionType,
          description: actionDescription
        });

      if (error) throw error;

      // Refresh actions
      await fetchCustomerActions();
      setNewActionText('');
      
      // Update selected customer with new action
      const updatedJourney = customerJourneys.find(c => c.customerEmail === selectedCustomer.customerEmail);
      if (updatedJourney) {
        setSelectedCustomer({ ...updatedJourney });
      }
    } catch (e) {
      console.error('Error adding action:', e);
    } finally {
      setIsSavingAction(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Promotor': return 'bg-green-100 text-green-700 border-green-200';
      case 'Neutro': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Detrator': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'contact': return 'Contato';
      case 'offer': return 'Oferta';
      case 'resolution': return 'Resolução';
      case 'followup': return 'Follow-up';
      default: return 'Nota';
    }
  };

  const getActionTypeIcon = (type: string) => {
    switch (type) {
      case 'contact': return <Phone size={14} />;
      case 'offer': return <ArrowUpRight size={14} />;
      case 'resolution': return <CheckCircle size={14} />;
      case 'followup': return <Send size={14} />;
      default: return <MessageSquare size={14} />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Jornada do Cliente</h1>
        <p className="text-gray-500">Acompanhe a evolução da satisfação de cada cliente ao longo do tempo</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Total Clientes</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Promotores</p>
          <h3 className="text-2xl font-bold text-green-600 mt-1">{stats.promoters}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Detratores</p>
          <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.detractors}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <AlertCircle size={12} /> Precisam Atenção
          </p>
          <h3 className="text-2xl font-bold text-orange-600 mt-1">{stats.needsAttention}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <TrendingUp size={12} /> Em Melhoria
          </p>
          <h3 className="text-2xl font-bold text-teal-600 mt-1">{stats.improving}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
            <TrendingDown size={12} /> Em Queda
          </p>
          <h3 className="text-2xl font-bold text-red-600 mt-1">{stats.declining}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Todos os Status</option>
            <option value="Promotor">Promotores</option>
            <option value="Neutro">Neutros</option>
            <option value="Detrator">Detratores</option>
          </select>

          <button
            onClick={() => setFilterAttention(!filterAttention)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
              filterAttention 
                ? 'bg-orange-50 border-orange-200 text-orange-700' 
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <AlertCircle size={16} />
            Precisam de Atenção
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Clientes ({filteredCustomers.length})</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users size={32} className="mx-auto mb-2 text-gray-300" />
                <p>Nenhum cliente encontrado</p>
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <button
                  key={customer.customerEmail}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedCustomer?.customerEmail === customer.customerEmail ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 truncate">{customer.customerName}</h4>
                        {customer.needsAttention && (
                          <AlertCircle size={14} className="text-orange-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{customer.customerEmail}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(customer.currentStatus)}`}>
                          {customer.currentStatus}
                        </span>
                        <span className="text-xs text-gray-400">
                          {customer.totalResponses} resposta{customer.totalResponses > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`flex items-center gap-1 text-xs ${
                        customer.evolutionTrend === 'improving' ? 'text-green-600' :
                        customer.evolutionTrend === 'declining' ? 'text-red-600' :
                        'text-gray-400'
                      }`}>
                        {customer.evolutionTrend === 'improving' ? <TrendingUp size={12} /> :
                         customer.evolutionTrend === 'declining' ? <TrendingDown size={12} /> :
                         <Minus size={12} />}
                      </span>
                      <span className="text-xs text-gray-400">
                        Média: {customer.averageScore}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Customer Detail */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="space-y-6">
              {/* AI Suggestions Panel */}
              {aiSuggestion && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-purple-600" size={20} />
                      <h3 className="font-bold text-gray-900">Assistente IA</h3>
                    </div>
                    <button
                      onClick={() => setShowAISuggestions(!showAISuggestions)}
                      className="text-sm text-purple-600 hover:text-purple-700"
                    >
                      {showAISuggestions ? 'Ocultar' : 'Expandir'}
                    </button>
                  </div>

                  <p className="text-sm text-gray-700 mb-4">{aiSuggestion.message}</p>

                  {showAISuggestions && (
                    <MessageSuggestionsPanel
                      client={{
                        id: selectedCustomer.customerEmail,
                        name: selectedCustomer.customerName,
                        email: selectedCustomer.customerEmail,
                        phone: selectedCustomer.customerPhone,
                        type: 'nps',
                        status: selectedCustomer.currentStatus,
                        score: selectedCustomer.averageScore,
                        daysSinceLastContact: selectedCustomer.daysSinceLastContact,
                        comment: selectedCustomer.responses[selectedCustomer.responses.length - 1]?.comment
                      }}
                      insightType={selectedCustomer.currentStatus === 'Detrator' ? 'recovery' : selectedCustomer.currentStatus === 'Promotor' ? 'opportunity' : 'risk'}
                      showSendButtons={true}
                    />
                  )}
                </div>
              )}

              {/* Customer Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Customer Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.customerName}</h2>
                        <span className={`text-sm px-3 py-1 rounded-full border ${getStatusColor(selectedCustomer.currentStatus)}`}>
                          {selectedCustomer.currentStatus}
                        </span>
                        {selectedCustomer.previousStatus && selectedCustomer.previousStatus !== selectedCustomer.currentStatus && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            (era {selectedCustomer.previousStatus})
                            {selectedCustomer.evolutionTrend === 'improving' ? 
                              <TrendingUp size={12} className="text-green-600" /> : 
                              <TrendingDown size={12} className="text-red-600" />
                            }
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail size={14} /> {selectedCustomer.customerEmail}
                        </span>
                        {selectedCustomer.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone size={14} /> {selectedCustomer.customerPhone}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Média NPS</p>
                      <p className="text-lg font-bold text-gray-900">{selectedCustomer.averageScore}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Respostas</p>
                      <p className="text-lg font-bold text-gray-900">{selectedCustomer.totalResponses}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Ações</p>
                      <p className="text-lg font-bold text-gray-900">{selectedCustomer.actions.length}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Dias s/ Contato</p>
                      <p className={`text-lg font-bold ${selectedCustomer.daysSinceLastContact > 30 ? 'text-red-600' : 'text-gray-900'}`}>
                        {selectedCustomer.daysSinceLastContact}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <History size={18} /> Linha do Tempo
                  </h3>

                  {/* Add Action Form */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="flex gap-3">
                      <select
                        value={newActionType}
                        onChange={(e) => setNewActionType(e.target.value as any)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="contact">Contato</option>
                        <option value="offer">Oferta</option>
                        <option value="resolution">Resolução</option>
                        <option value="followup">Follow-up</option>
                        <option value="note">Nota</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Descreva a ação realizada..."
                        value={newActionText}
                        onChange={(e) => setNewActionText(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddAction()}
                      />
                      <button
                        onClick={() => handleAddAction()}
                        disabled={isSavingAction || !newActionText.trim()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSavingAction ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Timeline Items */}
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {[
                      ...selectedCustomer.responses.map(r => ({ type: 'response' as const, data: r, date: r.date })),
                      // FIX: Use snake_case 'created_at' to match the CustomerAction type.
                      ...selectedCustomer.actions.map(a => ({ type: 'action' as const, data: a, date: a.created_at }))
                    ]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((item, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              item.type === 'response' 
                                ? getStatusColor((item.data as NPSResponse).status).replace('text-', 'bg-').split(' ')[0]
                                : 'bg-blue-100'
                            }`}>
                              {item.type === 'response' ? (
                                <Star size={14} className={
                                  (item.data as NPSResponse).status === 'Promotor' ? 'text-green-600' :
                                  (item.data as NPSResponse).status === 'Detrator' ? 'text-red-600' :
                                  'text-yellow-600'
                                } />
                              ) : (
                                <span className="text-blue-600">
                                  {/* FIX: Use snake_case 'action_type' to match the CustomerAction type. */}
                                  {getActionTypeIcon((item.data as CustomerAction).action_type)}
                                </span>
                              )}
                            </div>
                            {index < selectedCustomer.responses.length + selectedCustomer.actions.length - 1 && (
                              <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-900">
                                {/* FIX: Use snake_case 'action_type' to match the CustomerAction type. */}
                                {item.type === 'response' ? 'Resposta NPS' : getActionTypeLabel((item.data as CustomerAction).action_type)}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">
                                {new Date(item.date).toLocaleDateString('pt-BR', { 
                                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            {item.type === 'response' ? (
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span className={`text-2xl font-bold ${
                                    (item.data as NPSResponse).score >= 9 ? 'text-green-600' :
                                    (item.data as NPSResponse).score >= 7 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {(item.data as NPSResponse).score}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor((item.data as NPSResponse).status)}`}>
                                    {(item.data as NPSResponse).status}
                                  </span>
                                </div>
                                {(item.data as NPSResponse).comment && (
                                  <p className="text-sm text-gray-600 mt-2">"{(item.data as NPSResponse).comment}"</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 mt-1">{(item.data as CustomerAction).description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Users size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione um Cliente</h3>
              <p className="text-gray-500">Clique em um cliente na lista para ver sua jornada completa e receber sugestões da IA</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerJourney;