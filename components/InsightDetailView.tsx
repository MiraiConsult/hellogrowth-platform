'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { Lead, NPSResponse, Form } from '@/types';
import { 
  ArrowLeft, AlertTriangle, TrendingUp, DollarSign, Heart,
  Phone, Mail, Calendar, MessageSquare, FileText, Sparkles,
  Copy, Check, ExternalLink, Clock, User, Star, CheckCircle, XCircle, Filter,
  LayoutGrid, List, Save, History, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MessageSuggestionsPanel } from '@/components/MessageSuggestionsPanel';
import { SalesCoachModal } from '@/components/SalesCoachModal';

// ============================================
// CONFIGURAÇÕES ESTÁTICAS - FORA DO COMPONENTE
// ============================================

// Configurações por tipo de insight
const INSIGHT_CONFIGS = {
  risk: {
    title: 'Riscos',
    color: 'red',
    description: 'Detratores (NPS ≤ 6) e leads parados que precisam de atenção urgente'
  },
  opportunity: {
    title: 'Oportunidades',
    color: 'green',
    description: 'Clientes e leads com alto potencial'
  },
  sales: {
    title: 'Vendas',
    color: 'blue',
    description: 'Leads prontos para fechamento'
  },
  recovery: {
    title: 'Recuperação',
    color: 'purple',
    description: 'Clientes neutros (NPS 7-8) que podem virar promotores'
  }
} as const;

// Mapeamento de cores para classes CSS
const COLOR_CLASSES = {
  red: { icon: 'text-red-600', bg: 'bg-red-100', bgIcon: 'bg-red-100' },
  green: { icon: 'text-green-600', bg: 'bg-green-100', bgIcon: 'bg-green-100' },
  blue: { icon: 'text-blue-600', bg: 'bg-blue-100', bgIcon: 'bg-blue-100' },
  purple: { icon: 'text-purple-600', bg: 'bg-purple-100', bgIcon: 'bg-purple-100' },
  gray: { icon: 'text-gray-600', bg: 'bg-gray-100', bgIcon: 'bg-gray-100' }
} as const;

// Função para obter o ícone correto - FORA DO COMPONENTE
const getInsightIcon = (type: string) => {
  switch (type) {
    case 'risk': return AlertTriangle;
    case 'opportunity': return TrendingUp;
    case 'sales': return DollarSign;
    case 'recovery': return Heart;
    default: return AlertTriangle;
  }
};

// Função para formatar respostas de forma segura - FORA DO COMPONENTE
const formatAnswer = (answer: any): string => {
  if (answer === null || answer === undefined) return 'Não respondido';
  if (typeof answer === 'string') return answer;
  if (typeof answer === 'number') return answer.toString();
  if (typeof answer === 'boolean') return answer ? 'Sim' : 'Não';
  
  if (Array.isArray(answer)) {
    if (answer.every(item => typeof item === 'string')) {
      return answer.join(', ');
    }
    return answer.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item.text || item.label || item.value || JSON.stringify(item);
      }
      return String(item);
    }).join(', ');
  }
  
  if (typeof answer === 'object') {
    return answer.text || answer.label || answer.value || JSON.stringify(answer);
  }
  
  return String(answer);
};

// ============================================
// INTERFACES
// ============================================

interface InsightDetailViewProps {
  insightType: 'risk' | 'opportunity' | 'sales' | 'recovery';
  leads: Lead[];
  npsData: NPSResponse[];
  onBack: () => void;
  userId: string;
}

interface IntelligenceAction {
  id: string;
  client_id: string;
  client_email: string;
  action_type: 'contacted' | 'completed' | 'dismissed' | 'scheduled' | 'pending';
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface InteractionHistoryItem {
  id: string;
  action_type: string;
  old_value?: string;
  new_value?: string;
  notes?: string;
  created_at: string;
}

interface ClientAnalysis {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'lead' | 'nps';
  status: string;
  reason: string;
  responses: any[];
  lastInteraction: string;
  aiSuggestion: string;
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
  priority: 'high' | 'medium' | 'low';
  score?: number;
  value?: number;
  actionStatus?: 'pending' | 'contacted' | 'completed' | 'dismissed';
  lastActionDate?: string;
  daysSinceAction?: number;
  notes?: string;
  notesLastSaved?: string;
  originalAnswers?: any;
  comment?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const InsightDetailView: React.FC<InsightDetailViewProps> = ({
  insightType,
  leads,
  npsData,
  onBack,
  userId
}) => {
  const tenantId = useTenantId()

  const [clients, setClients] = useState<ClientAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientAnalysis | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [intelligenceActions, setIntelligenceActions] = useState<IntelligenceAction[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [showSalesCoach, setShowSalesCoach] = useState(false);
  const [salesCoachClient, setSalesCoachClient] = useState<ClientAnalysis | null>(null);
  const [interactionHistory, setInteractionHistory] = useState<InteractionHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [forms, setForms] = useState<Form[]>([]);
  const [questionMap, setQuestionMap] = useState<Record<string, string>>({});

  // Obter configuração e ícone - usando constantes estáticas
  const config = INSIGHT_CONFIGS[insightType] || INSIGHT_CONFIGS.risk;
  const IconComponent = getInsightIcon(insightType);
  const colorClasses = COLOR_CLASSES[config.color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.gray;

  // Fetch intelligence actions
  useEffect(() => {
    fetchIntelligenceActions();
  }, [userId]);

  // Fetch forms and build question map
  useEffect(() => {
    const fetchForms = async () => {
      if (!supabase || !userId) return;
      
      try {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('tenant_id', tenantId);
        
        if (error) throw error;
        
        if (data) {
          setForms(data);
          
          // Build question map: questionId -> questionText
          const qMap: Record<string, string> = {};
          data.forEach((form: any) => {
            if (form.questions && Array.isArray(form.questions)) {
              form.questions.forEach((q: any) => {
                if (q.id && q.text) {
                  qMap[q.id] = q.text;
                  qMap[String(q.id)] = q.text;
                }
                if (q.id && q.label) {
                  qMap[q.id] = q.label;
                  qMap[String(q.id)] = q.label;
                }
              });
            }
          });
          setQuestionMap(qMap);
        }
      } catch (error) {
        console.error('Error fetching forms:', error);
      }
    };
    
    fetchForms();
  }, [userId]);

  // Filter and analyze clients based on insight type
  useEffect(() => {
    analyzeClients();
  }, [insightType, leads, npsData, intelligenceActions, questionMap]);

  const fetchIntelligenceActions = async () => {
    if (!supabase || !userId) return;
    
    try {
      const { data, error } = await supabase
        .from('intelligence_actions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('insight_type', insightType);
      
      if (error) throw error;
      setIntelligenceActions(data || []);
    } catch (error) {
      console.error('Error fetching intelligence actions:', error);
    }
  };

  const fetchInteractionHistory = async (clientId: string) => {
    if (!supabase || !userId) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('interaction_history')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInteractionHistory(data || []);
    } catch (error) {
      console.error('Error fetching interaction history:', error);
      setInteractionHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const addToHistory = async (
    clientId: string, 
    clientEmail: string, 
    clientType: 'lead' | 'nps',
    actionType: string, 
    oldValue?: string, 
    newValue?: string, 
    notes?: string
  ) => {
    if (!supabase || !userId) return;
    
    try {
      await supabase
        .from('interaction_history')
        .insert({
          user_id: userId, tenant_id: tenantId,
          client_id: clientId,
          client_email: clientEmail,
          client_type: clientType,
          insight_type: insightType,
          action_type: actionType,
          old_value: oldValue,
          new_value: newValue,
          notes: notes
        });
    } catch (error) {
      console.error('Error adding to history:', error);
    }
  };

  const analyzeClients = () => {
    setIsLoading(true);
    const analyzedClients: ClientAnalysis[] = [];

    if (insightType === 'risk') {
      // Detratores (NPS <= 6)
      const detractors = npsData.filter(n => n.status === 'Detrator');
      for (const nps of detractors) {
        const analysis = generateClientAnalysis(nps, 'nps', 'risk');
        analyzedClients.push(analysis);
      }

      // Leads parados há mais de 7 dias
      const staleLeads = leads.filter(l => {
        const daysSinceUpdate = Math.floor((Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceUpdate > 7 && l.status !== 'Vendido' && l.status !== 'Perdido';
      });
      for (const lead of staleLeads) {
        const analysis = generateClientAnalysis(lead, 'lead', 'risk');
        analyzedClients.push(analysis);
      }
    } else if (insightType === 'opportunity') {
      // Promotores
      const promoters = npsData.filter(n => n.status === 'Promotor');
      for (const nps of promoters) {
        const analysis = generateClientAnalysis(nps, 'nps', 'opportunity');
        analyzedClients.push(analysis);
      }

      // Leads em negociação de alto valor
      const highValueLeads = leads.filter(l => l.status === 'Negociação' && Number(l.value || 0) >= 1000);
      for (const lead of highValueLeads) {
        const analysis = generateClientAnalysis(lead, 'lead', 'opportunity');
        analyzedClients.push(analysis);
      }
    } else if (insightType === 'sales') {
      // Leads qualificados E vendas concluídas
      const salesLeads = leads.filter(l => 
        l.status === 'Novo' || 
        l.status === 'Em Contato' || 
        l.status === 'Negociação' ||
        l.status === 'Vendido'  // ✅ Incluir vendas concluídas
      );
      for (const lead of salesLeads) {
        const analysis = generateClientAnalysis(lead, 'lead', 'sales');
        analyzedClients.push(analysis);
      }
    } else if (insightType === 'recovery') {
      // Apenas Neutros (NPS 7-8) - Detratores ficam em Riscos
      const needsRecovery = npsData.filter(n => n.status === 'Neutro');
      for (const nps of needsRecovery) {
        const analysis = generateClientAnalysis(nps, 'nps', 'recovery');
        analyzedClients.push(analysis);
      }
    }

    setClients(analyzedClients);
    setIsLoading(false);
  };

  const generateClientAnalysis = (
    data: Lead | NPSResponse,
    type: 'lead' | 'nps',
    category: string
  ): ClientAnalysis => {
    const isLead = type === 'lead';
    
    const name = isLead ? ((data as Lead).name || 'Cliente') : ((data as NPSResponse).customerName || 'Cliente');
    const email = isLead ? (data as Lead).email : (data as NPSResponse).customerEmail || '';
    const phone = isLead ? (data as Lead).phone : (data as NPSResponse).customerPhone;

    // Generate AI suggestion
    const aiSuggestion = generateAISuggestion(data, type, category);
    
    // Generate messages
    const messages = generateMessages(data, type, category, aiSuggestion);

    // Check if there's an action for this client
    const clientAction = intelligenceActions.find(a => a.client_id === data.id);
    const actionStatus = clientAction ? clientAction.action_type : 'pending';
    const lastActionDate = clientAction?.updated_at || clientAction?.created_at;
    const daysSinceAction = lastActionDate 
      ? Math.floor((Date.now() - new Date(lastActionDate).getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    return {
      id: data.id,
      name,
      email,
      phone,
      type,
      status: isLead ? (data as Lead).status : (data as NPSResponse).status,
      reason: getReason(data, type, category),
      responses: getResponses(data, type),
      lastInteraction: isLead ? (data as Lead).date : (data as NPSResponse).date,
      aiSuggestion,
      whatsappMessage: messages.whatsapp,
      emailSubject: messages.emailSubject,
      emailBody: messages.emailBody,
      priority: clientAction?.priority || getPriority(data, type, category),
      score: !isLead ? (data as NPSResponse).score : undefined,
      value: isLead ? Number((data as Lead).value || 0) : undefined,
      actionStatus: actionStatus as 'pending' | 'contacted' | 'completed' | 'dismissed',
      lastActionDate,
      daysSinceAction,
      notes: clientAction?.notes,
      notesLastSaved: clientAction?.updated_at,
      originalAnswers: isLead ? (data as Lead).answers : undefined,
      comment: !isLead ? (data as NPSResponse).comment : undefined
    };
  };

  const generateAISuggestion = (data: any, type: string, category: string): string => {
    const isLead = type === 'lead';
    const name = isLead ? data.name : data.customerName;
    
    if (category === 'risk') {
      if (isLead) {
        const days = Math.floor((Date.now() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24));
        return `Este lead está parado há ${days} dias. Recomendo fazer um contato imediato para reativar o interesse. Pergunte se ainda há necessidade do serviço e ofereça uma condição especial para fechar hoje.`;
      }
      return `Cliente insatisfeito (nota ${data.score}). Priorize um contato pessoal para entender o problema específico. Demonstre empatia, peça desculpas pelo ocorrido e ofereça uma solução concreta. O objetivo é recuperar a confiança.`;
    } else if (category === 'opportunity') {
      if (isLead) {
        return `Lead de alto valor (R$ ${data.value}) em fase de negociação. Recomendo apresentar cases de sucesso similares e criar senso de urgência com uma proposta com prazo limitado. Foque nos benefícios específicos para o negócio dele.`;
      }
      return `Cliente promotor (nota ${data.score}) muito satisfeito! Momento ideal para pedir indicações. Considere criar um programa de referência com benefícios. Mantenha o relacionamento próximo com conteúdo exclusivo.`;
    } else if (category === 'sales') {
      return `Lead qualificado pronto para fechamento. Agende uma reunião de apresentação da proposta comercial. Prepare um orçamento detalhado e esteja pronto para negociar condições de pagamento. Foque em resolver as dores específicas identificadas.`;
    } else if (category === 'recovery') {
      return `Cliente com experiência abaixo do esperado (nota ${data.score}). Faça um contato proativo para entender os pontos de melhoria. Ofereça um benefício como compensação e mostre as melhorias já implementadas. O objetivo é transformar em promotor.`;
    }
    return "Entre em contato para entender melhor as necessidades e oferecer soluções personalizadas.";
  };

  const generateMessages = (data: any, type: string, category: string, aiSuggestion: string) => {
    const isLead = type === 'lead';
    const name = isLead ? (data.name || '') : (data.customerName || '');
    const firstName = name ? name.split(' ')[0] : 'Cliente';

    let whatsapp = '';
    let emailSubject = '';
    let emailBody = '';

    if (category === 'risk') {
      if (isLead) {
        const interest = (data.answers && Object.values(data.answers)[0]) ? (Object.values(data.answers)[0] as any).value : 'seu interesse';
        whatsapp = `Olá ${firstName}! Notei que ainda não conseguimos avançar com sua solicitação sobre ${interest}. Podemos conversar para entender melhor como posso te ajudar? 😊`;
        emailSubject = `${firstName}, vamos retomar nossa conversa?`;
        emailBody = `Olá ${name},\n\nEspero que esteja bem!\n\nNotei que ainda não conseguimos avançar com sua solicitação sobre ${interest}. Gostaria muito de entender melhor suas necessidades e ver como posso te ajudar.\n\nPodemos agendar uma conversa rápida?\n\nAtenciosamente,\nEquipe`;
      } else {
        whatsapp = `Olá ${firstName}! Vi que sua experiência conosco não foi ideal (nota ${data.score}). Gostaria muito de entender o que aconteceu e como posso melhorar isso. Podemos conversar?`;
        emailSubject = `${firstName}, sua opinião é muito importante para nós`;
        emailBody = `Olá ${name},\n\nObrigado por compartilhar seu feedback (nota ${data.score}).\n\nSua experiência não atendeu nossas expectativas, e isso nos preocupa muito. Gostaríamos de entender melhor o que aconteceu e encontrar uma solução.\n\nPodemos agendar uma conversa?\n\nAtenciosamente,\nEquipe`;
      }
    } else if (category === 'opportunity') {
      if (isLead) {
        const interest = (data.answers && Object.values(data.answers)[0]) ? (Object.values(data.answers)[0] as any).value : 'seu interesse';
        whatsapp = `Olá ${firstName}! Vi que você está interessado em ${interest} e o valor estimado é R$ ${data.value}. Tenho uma proposta especial que pode te interessar! Podemos conversar?`;
        emailSubject = `${firstName}, proposta especial para você!`;
        emailBody = `Olá ${name},\n\nVi que você está interessado em ${interest}.\n\nTenho uma proposta especial que pode se encaixar perfeitamente no que você procura. Vamos conversar sobre como podemos te ajudar?\n\nAtenciosamente,\nEquipe`;
      } else {
        whatsapp = `Olá ${firstName}! Muito obrigado pela nota ${data.score}! 🎉 Clientes como você são muito importantes para nós. Você conhece alguém que também poderia se beneficiar dos nossos serviços?`;
        emailSubject = `${firstName}, obrigado pela confiança! 🎉`;
        emailBody = `Olá ${name},\n\nMuito obrigado pela nota ${data.score}! Ficamos muito felizes em saber que você está satisfeito.\n\nClientes como você são a razão do nosso trabalho. Se conhecer alguém que também possa se beneficiar dos nossos serviços, ficaremos gratos pela indicação!\n\nAtenciosamente,\nEquipe`;
      }
    } else if (category === 'sales') {
      const interest = (data.answers && Object.values(data.answers)[0]) ? (Object.values(data.answers)[0] as any).value : 'seu interesse';
      whatsapp = `Olá ${firstName}! Vi que você está interessado em ${interest}. Preparei uma proposta personalizada para você. Podemos conversar sobre os próximos passos?`;
      emailSubject = `${firstName}, proposta personalizada pronta!`;
      emailBody = `Olá ${name},\n\nPreparei uma proposta personalizada para ${interest} considerando suas necessidades.\n\nGostaria de apresentar os detalhes e discutir os próximos passos. Quando você tem disponibilidade para conversarmos?\n\nAtenciosamente,\nEquipe`;
    } else if (category === 'recovery') {
      whatsapp = `Olá ${firstName}! Sua opinião (nota ${data.score}) é muito importante. Gostaríamos de entender como podemos melhorar sua experiência. Podemos conversar?`;
      emailSubject = `${firstName}, como podemos melhorar?`;
      emailBody = `Olá ${name},\n\nSua avaliação (nota ${data.score}) nos mostra que há espaço para melhorias.\n\nGostaríamos muito de entender suas expectativas e ver como podemos proporcionar uma experiência melhor. Podemos agendar uma conversa?\n\nAtenciosamente,\nEquipe`;
    }

    return { whatsapp, emailSubject, emailBody };
  };

  const getReason = (data: any, type: string, category: string): string => {
    if (category === 'risk') {
      if (type === 'lead') {
        const days = Math.floor((Date.now() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24));
        return `Lead parado há ${days} dias sem interação`;
      }
      return `Cliente detrator (nota ${data.score}) - insatisfeito`;
    } else if (category === 'opportunity') {
      if (type === 'lead') {
        return `Lead em negociação de alto valor (R$ ${data.value})`;
      }
      return `Cliente promotor (nota ${data.score}) - potencial indicador`;
    } else if (category === 'sales') {
      return `Lead qualificado pronto para fechamento`;
    } else if (category === 'recovery') {
      return `Cliente com experiência abaixo do esperado (nota ${data.score})`;
    }
    return '';
  };

  const getResponses = (data: any, type: string): any[] => {
    if (type === 'lead') {
      const answers = data.answers ? Object.entries(data.answers)
        .filter(([key]) => key !== '_internal_notes') // Filtrar notas internas
        .map(([key, ans]: [string, any]) => {
          // Primeiro tenta buscar no mapa de perguntas pelo ID
          let questionText = questionMap[key] || questionMap[String(key)];
          
          // Se não encontrou no mapa, tenta extrair de outras formas
          if (!questionText) {
            if (typeof ans === 'object' && ans !== null) {
              questionText = ans.questionText || ans.question || ans.label;
            }
          }
          
          // Se ainda não encontrou, usa um texto genérico ao invés do ID
          if (!questionText || questionText === key) {
            // Tenta identificar pelo tipo de resposta
            const ansValue = typeof ans === 'object' ? (ans.value || ans.answer || ans.text) : ans;
            if (typeof ansValue === 'string') {
              if (ansValue.includes('R$') || ansValue.includes('6.000') || ansValue.includes('3.000')) {
                questionText = 'Faixa de investimento';
              } else if (ansValue.includes('meses') || ansValue.includes('semanas') || ansValue.includes('dias')) {
                questionText = 'Prazo para iniciar';
              } else if (ansValue.includes('laser') || ansValue.includes('gordura') || ansValue.includes('facial')) {
                questionText = 'Área de interesse';
              } else if (ansValue.includes('Solucionar') || ansValue.includes('questão') || ansValue.includes('objetivo')) {
                questionText = 'Objetivo principal';
              } else {
                questionText = 'Resposta';
              }
            } else {
              questionText = 'Resposta';
            }
          }
          
          // Extrai o valor da resposta
          let answerValue: any;
          if (typeof ans === 'object' && ans !== null) {
            answerValue = ans.value !== undefined ? ans.value : (ans.answer || ans.text || ans.label || ans.resposta || '[Resposta não disponível]');
          } else {
            answerValue = ans;
          }
          
          return { 
            question: questionText, 
            answer: answerValue 
          };
        }) : [];
      return [
        ...answers,
        { question: 'Valor estimado', answer: `R$ ${data.value || 0}` },
        { question: 'Status', answer: data.status },
        { question: 'Notas', answer: data.notes || 'Sem notas' }
      ];
    } else {
      return [
        { question: 'Nota NPS', answer: data.score },
        { question: 'Feedback', answer: data.comment || 'Não fornecido' },
        { question: 'Status', answer: data.status }
      ];
    }
  };

  const getPriority = (data: any, type: string, category: string): 'high' | 'medium' | 'low' => {
    if (category === 'risk') {
      if (type === 'lead') {
        const days = Math.floor((Date.now() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24));
        return days > 14 ? 'high' : 'medium';
      }
      return data.score <= 4 ? 'high' : 'medium';
    } else if (category === 'opportunity') {
      if (type === 'lead') {
        return Number(data.value || 0) >= 2000 ? 'high' : 'medium';
      }
      return data.score >= 9 ? 'high' : 'medium';
    }
    return 'medium';
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleWhatsApp = async (client: ClientAnalysis) => {
    const phone = client.phone?.replace(/[^0-9]/g, '');
    if (!phone) {
      alert("Cliente não possui telefone cadastrado.");
      return;
    }
    const message = encodeURIComponent(client.whatsappMessage);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    
    // Add to history
    await addToHistory(client.id, client.email, client.type, 'whatsapp_sent', undefined, undefined, client.whatsappMessage);
    
    // Refresh history if showing
    if (showHistory) {
      fetchInteractionHistory(client.id);
    }
  };

  const handleEmail = async (client: ClientAnalysis) => {
    const subject = encodeURIComponent(client.emailSubject);
    const body = encodeURIComponent(client.emailBody);
    window.location.href = `mailto:${client.email}?subject=${subject}&body=${body}`;
    
    // Add to history
    await addToHistory(client.id, client.email, client.type, 'email_sent', undefined, undefined, `${client.emailSubject}\n\n${client.emailBody}`);
    
    // Refresh history if showing
    if (showHistory) {
      fetchInteractionHistory(client.id);
    }
  };

  const handlePriorityChange = async (clientId: string, priority: 'high' | 'medium' | 'low') => {
    if (!supabase || !userId) return;
    
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    const oldPriority = client.priority;
    
    try {
      // Update priority in intelligence_actions table
      const { data: existing } = await supabase
        .from('intelligence_actions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('intelligence_actions')
          .update({ priority, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('intelligence_actions')
          .insert({
            user_id: userId, tenant_id: tenantId,
            client_id: clientId,
            insight_type: insightType,
            action_type: 'pending',
            priority
          });
      }
      
      // Add to history
      await addToHistory(clientId, client.email, client.type, 'priority_changed', oldPriority, priority);
      
      // Update local state
      setClients(prev => prev.map(c => 
        c.id === clientId ? { ...c, priority } : c
      ));
      if (selectedClient?.id === clientId) {
        setSelectedClient({ ...selectedClient, priority });
      }
      
      // Refresh history if showing
      if (showHistory) {
        fetchInteractionHistory(clientId);
      }
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const handleNotesChange = (clientId: string, notes: string) => {
    // Update local state immediately
    setClients(prev => prev.map(c => 
      c.id === clientId ? { ...c, notes } : c
    ));
    if (selectedClient?.id === clientId) {
      setSelectedClient({ ...selectedClient, notes });
    }
  };

  const saveNotes = async (clientId: string) => {
    if (!supabase || !userId) return;
    
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    setIsSavingNotes(true);
    const now = new Date().toISOString();
    
    try {
      const { data: existing } = await supabase
        .from('intelligence_actions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('intelligence_actions')
          .update({ notes: client.notes || '', updated_at: now })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('intelligence_actions')
          .insert({
            user_id: userId, tenant_id: tenantId,
            client_id: clientId,
            insight_type: insightType,
            action_type: 'pending',
            notes: client.notes || ''
          });
      }
      
      // Add to history
      await addToHistory(clientId, client.email, client.type, 'note_saved', undefined, undefined, client.notes);
      
      // Update local state with saved timestamp
      setClients(prev => prev.map(c => 
        c.id === clientId ? { ...c, notesLastSaved: now } : c
      ));
      if (selectedClient?.id === clientId) {
        setSelectedClient({ ...selectedClient, notesLastSaved: now });
      }
      
      // Refresh history if showing
      if (showHistory) {
        fetchInteractionHistory(clientId);
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Erro ao salvar anotação. Tente novamente.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleMarkAction = async (clientId: string, clientEmail: string, clientType: 'lead' | 'nps', actionType: 'contacted' | 'completed' | 'dismissed') => {
    if (!supabase || !userId) return;
    
    const client = clients.find(c => c.id === clientId);
    const oldStatus = client?.actionStatus || 'pending';
    
    setIsSavingAction(true);
    try {
      // Check if action already exists
      const { data: existing } = await supabase
        .from('intelligence_actions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .single();
      
      if (existing) {
        // Update existing action
        const { error } = await supabase
          .from('intelligence_actions')
          .update({ 
            action_type: actionType, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new action
        const { error } = await supabase
          .from('intelligence_actions')
          .insert({
            user_id: userId, tenant_id: tenantId,
            client_id: clientId,
            client_email: clientEmail,
            client_type: clientType,
            insight_type: insightType,
            action_type: actionType
          });
        
        if (error) throw error;
      }
      
      // Add to history
      await addToHistory(clientId, clientEmail, clientType, 'status_changed', oldStatus, actionType);
      
      // Update local state immediately
      setClients(prev => prev.map(c => 
        c.id === clientId ? { ...c, actionStatus: actionType } : c
      ));
      if (selectedClient?.id === clientId) {
        setSelectedClient({ ...selectedClient, actionStatus: actionType });
      }
      
      // Refresh actions in background
      await fetchIntelligenceActions();
      
      // Refresh history if showing
      if (showHistory) {
        fetchInteractionHistory(clientId);
      }
    } catch (error) {
      console.error('Error marking action:', error);
      alert('Erro ao salvar ação. Tente novamente.');
    } finally {
      setIsSavingAction(false);
    }
  };

  // Calculate total value for sales category
  const totalValue = useMemo(() => {
    if (insightType === 'sales') {
      return clients.reduce((sum, client) => sum + (client.value || 0), 0);
    }
    return 0;
  }, [clients, insightType]);

  // Filter clients based on showCompleted - EXCLUDING completed and dismissed from count
  const filteredClients = useMemo(() => {
    if (showCompleted) {
      return clients;
    }
    return clients.filter(c => c.actionStatus === 'pending' || !c.actionStatus);
  }, [clients, showCompleted]);

  // Active clients count (excluding completed and dismissed)
  const activeClientsCount = useMemo(() => {
    return clients.filter(c => c.actionStatus === 'pending' || !c.actionStatus).length;
  }, [clients]);

  // Format action type for display
  const formatActionType = (actionType: string): string => {
    switch (actionType) {
      case 'note_saved': return 'Anotação salva';
      case 'status_changed': return 'Status alterado';
      case 'priority_changed': return 'Prioridade alterada';
      case 'whatsapp_sent': return 'WhatsApp enviado';
      case 'email_sent': return 'Email enviado';
      case 'coach_used': return 'Coach IA utilizado';
      default: return actionType;
    }
  };

  // Format status for display
  const formatStatus = (status: string): string => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'contacted': return 'Contatado';
      case 'completed': return 'Concluído';
      case 'dismissed': return 'Dispensado';
      default: return status;
    }
  };

  // Format priority for display
  const formatPriority = (priority: string): string => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority;
    }
  };

  // ============================================
  // RENDERIZAÇÃO - LOADING
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analisando clientes...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDERIZAÇÃO - CLIENTE SELECIONADO
  // ============================================

  if (selectedClient) {
    return (
      <div className="space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setSelectedClient(null);
              setShowHistory(false);
              setInteractionHistory([]);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{selectedClient.name}</h2>
            <p className="text-sm text-gray-600">{selectedClient.email}</p>
          </div>
          {selectedClient.value !== undefined && selectedClient.value > 0 && (
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-lg">
              <DollarSign size={16} className="text-green-600" />
              <span className="text-sm font-bold text-green-700">R$ {selectedClient.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            selectedClient.priority === 'high' ? 'bg-red-100 text-red-700' :
            selectedClient.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-green-100 text-green-700'
          }`}>
            Prioridade {selectedClient.priority === 'high' ? 'Alta' : selectedClient.priority === 'medium' ? 'Média' : 'Baixa'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Reason */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                <IconComponent size={16} className={colorClasses.icon} />
                Por que este cliente está aqui?
              </h3>
              <p className="text-sm text-gray-700">{selectedClient.reason}</p>
            </div>

            {/* AI Suggestion */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-4">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                <Sparkles size={16} className="text-purple-600" />
                Sugestão da IA
              </h3>
              <p className="text-sm text-gray-700">{selectedClient.aiSuggestion}</p>
            </div>

            {/* Responses */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <FileText size={16} />
                Respostas e Informações
              </h3>
              <div className="space-y-2">
                {selectedClient.responses.map((r, i) => (
                  <div key={i} className="border-l-4 border-primary-500 pl-3">
                    <p className="text-xs font-medium text-gray-600">{r.question}</p>
                    <p className="text-sm text-gray-900">{formatAnswer(r.answer)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Message Suggestions with Send Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <MessageSquare size={16} />
                Mensagens Sugeridas
              </h3>
              <MessageSuggestionsPanel
                client={{
                  id: selectedClient.id,
                  name: selectedClient.name,
                  email: selectedClient.email,
                  phone: selectedClient.phone,
                  type: selectedClient.type,
                  score: selectedClient.score,
                  status: selectedClient.status,
                  comment: selectedClient.comment || selectedClient.responses.find(r => 
                    typeof r.question === 'string' && r.question.toLowerCase().includes('comentário')
                  )?.answer,
                  leadStatus: selectedClient.type === 'lead' ? selectedClient.status : undefined,
                  value: selectedClient.value,
                  lastInteraction: selectedClient.lastInteraction,
                  answers: selectedClient.originalAnswers || selectedClient.responses
                }}
                insightType={insightType}
              />
            </div>

            {/* Interaction History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <button
                onClick={() => {
                  if (!showHistory) {
                    fetchInteractionHistory(selectedClient.id);
                  }
                  setShowHistory(!showHistory);
                }}
                className="w-full flex items-center justify-between text-sm font-bold text-gray-900"
              >
                <div className="flex items-center gap-2">
                  <History size={16} />
                  Histórico de Interações
                </div>
                {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {showHistory && (
                <div className="mt-3 space-y-2">
                  {isLoadingHistory ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                    </div>
                  ) : interactionHistory.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Nenhuma interação registrada ainda.</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {interactionHistory.map((item) => (
                        <div key={item.id} className="border-l-2 border-gray-200 pl-3 py-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-900">{formatActionType(item.action_type)}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(item.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {item.action_type === 'status_changed' && item.old_value && item.new_value && (
                            <p className="text-xs text-gray-600">
                              {formatStatus(item.old_value)} → {formatStatus(item.new_value)}
                            </p>
                          )}
                          {item.action_type === 'priority_changed' && item.old_value && item.new_value && (
                            <p className="text-xs text-gray-600">
                              {formatPriority(item.old_value)} → {formatPriority(item.new_value)}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-4">
            {/* Mark Action Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Marcar Status</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleMarkAction(selectedClient.id, selectedClient.email, selectedClient.type, 'contacted')}
                  disabled={isSavingAction}
                  className={`w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 ${
                    selectedClient.actionStatus === 'contacted' 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                  } ${isSavingAction ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Phone size={16} />
                  {isSavingAction ? 'Salvando...' : 'Contatado'}
                  {selectedClient.actionStatus === 'contacted' && <Check size={16} />}
                </button>
                <button
                  onClick={() => handleMarkAction(selectedClient.id, selectedClient.email, selectedClient.type, 'completed')}
                  disabled={isSavingAction}
                  className={`w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 ${
                    selectedClient.actionStatus === 'completed' 
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 hover:text-green-700'
                  } ${isSavingAction ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <CheckCircle size={16} />
                  {isSavingAction ? 'Salvando...' : 'Concluído'}
                  {selectedClient.actionStatus === 'completed' && <Check size={16} />}
                </button>
                <button
                  onClick={() => handleMarkAction(selectedClient.id, selectedClient.email, selectedClient.type, 'dismissed')}
                  disabled={isSavingAction}
                  className={`w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 ${
                    selectedClient.actionStatus === 'dismissed' 
                      ? 'bg-gray-500 text-white shadow-lg shadow-gray-500/30' 
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } ${isSavingAction ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <XCircle size={16} />
                  {isSavingAction ? 'Salvando...' : 'Dispensar'}
                  {selectedClient.actionStatus === 'dismissed' && <Check size={16} />}
                </button>
              </div>
            </div>

            {/* Priority Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Prioridade</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handlePriorityChange(selectedClient.id, 'high')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    selectedClient.priority === 'high'
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                  }`}
                >
                  Alta
                </button>
                <button
                  onClick={() => handlePriorityChange(selectedClient.id, 'medium')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    selectedClient.priority === 'medium'
                      ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700'
                  }`}
                >
                  Média
                </button>
                <button
                  onClick={() => handlePriorityChange(selectedClient.id, 'low')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    selectedClient.priority === 'low'
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  Baixa
                </button>
              </div>
            </div>

            {/* Notes with Save Button */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">Anotações</h3>
                <button
                  onClick={() => saveNotes(selectedClient.id)}
                  disabled={isSavingNotes}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isSavingNotes 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  <Save size={12} />
                  {isSavingNotes ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
              <textarea
                value={selectedClient.notes || ''}
                onChange={(e) => handleNotesChange(selectedClient.id, e.target.value)}
                placeholder="Adicione anotações sobre este cliente..."
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-400 focus:outline-none resize-none text-sm text-gray-700"
                rows={3}
              />
              {selectedClient.notesLastSaved && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Clock size={10} />
                  Última atualização: {new Date(selectedClient.notesLastSaved).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>

            {/* Last Interaction */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                <Clock size={16} />
                Última Interação
              </h3>
              <p className="text-sm text-gray-700">
                {new Date(selectedClient.lastInteraction).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Sales Coach Modal */}
        {showSalesCoach && salesCoachClient && (
          <SalesCoachModal
            client={{
              id: salesCoachClient.id,
              name: salesCoachClient.name,
              email: salesCoachClient.email,
              phone: salesCoachClient.phone,
              type: salesCoachClient.type,
              leadStatus: salesCoachClient.status,
              value: salesCoachClient.value,
              lastInteraction: salesCoachClient.lastInteraction,
              answers: salesCoachClient.responses
            }}
            onClose={() => {
              setShowSalesCoach(false);
              setSalesCoachClient(null);
            }}
          />
        )}
      </div>
    );
  }

  // ============================================
  // RENDERIZAÇÃO - LISTA DE CLIENTES
  // ============================================

  return (
    <>
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <IconComponent size={28} className={colorClasses.icon} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
            <p className="text-gray-600">{config.description}</p>
          </div>
        </div>
        {insightType === 'sales' && totalValue > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-3">
            <p className="text-sm text-green-700 font-medium">Valor Total</p>
            <p className="text-2xl font-bold text-green-900">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            Exibindo {filteredClients.length} de {clients.length} clientes 
            <span className="text-gray-500 ml-1">({activeClientsCount} ativos)</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Visão em Cards"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Visão em Lista"
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showCompleted 
                ? 'bg-primary-100 text-primary-700 border border-primary-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}
          >
            {showCompleted ? 'Ocultar Concluídos' : 'Mostrar Todos'}
          </button>
        </div>
      </div>

      {/* Clients List - Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => (
          <div
            key={client.id}
            onClick={() => setSelectedClient(client)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${colorClasses.bgIcon} flex items-center justify-center`}>
                  <User size={24} className={colorClasses.icon} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-600">{client.email}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                client.priority === 'high' ? 'bg-red-100 text-red-700' :
                client.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {client.priority === 'high' ? 'Alta' : client.priority === 'medium' ? 'Média' : 'Baixa'}
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-4">{client.reason}</p>

            {client.score !== undefined && (
              <div className="flex items-center gap-2 mb-4">
                <Star size={16} className="text-yellow-500" fill="currentColor" />
                <span className="text-sm font-medium">Nota: {client.score}</span>
              </div>
            )}

            {client.value !== undefined && client.value > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-700">R$ {client.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Clock size={14} />
              {new Date(client.lastInteraction).toLocaleDateString('pt-BR')}
            </div>

            {/* Action Status Badge */}
            {client.actionStatus && client.actionStatus !== 'pending' && (
              <div className="flex items-center gap-2 mb-2">
                {client.actionStatus === 'completed' && (
                  <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                    <CheckCircle size={12} />
                    Concluído {client.daysSinceAction !== undefined && `há ${client.daysSinceAction} dia${client.daysSinceAction !== 1 ? 's' : ''}`}
                  </div>
                )}
                {client.actionStatus === 'contacted' && (
                  <div className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                    <Phone size={12} />
                    Contatado {client.daysSinceAction !== undefined && `há ${client.daysSinceAction} dia${client.daysSinceAction !== 1 ? 's' : ''}`}
                  </div>
                )}
                {client.actionStatus === 'dismissed' && (
                  <div className="flex items-center gap-1 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded-full">
                    <XCircle size={12} />
                    Dispensado
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedClient(client);
                }}
                className="flex-1 text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center justify-center gap-1"
              >
                Ver Detalhes
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Clients List - List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor/Nota</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Interação</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${colorClasses.bgIcon} flex items-center justify-center flex-shrink-0`}>
                          <User size={20} className={colorClasses.icon} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{client.name}</p>
                          <p className="text-sm text-gray-600 truncate">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        client.priority === 'high' ? 'bg-red-100 text-red-700' :
                        client.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {client.priority === 'high' ? 'Alta' : client.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {client.actionStatus && client.actionStatus !== 'pending' ? (
                        <div className="flex items-center gap-1">
                          {client.actionStatus === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                              <CheckCircle size={12} />
                              Concluído
                            </span>
                          )}
                          {client.actionStatus === 'contacted' && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                              <Phone size={12} />
                              Contatado
                            </span>
                          )}
                          {client.actionStatus === 'dismissed' && (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded-full">
                              <XCircle size={12} />
                              Dispensado
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Pendente</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 line-clamp-2 max-w-xs">{client.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      {client.score !== undefined && (
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500" fill="currentColor" />
                          <span className="text-sm font-medium">{client.score}</span>
                        </div>
                      )}
                      {client.value !== undefined && client.value > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-green-600" />
                          <span className="text-sm font-medium text-green-700">
                            R$ {client.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock size={14} />
                        {new Date(client.lastInteraction).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                      >
                        Ver Detalhes
                        <ExternalLink size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredClients.length === 0 && clients.length > 0 && (
        <div className="text-center py-12">
          <IconComponent size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Todos os clientes desta categoria já foram atendidos.</p>
          <button 
            onClick={() => setShowCompleted(true)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Mostrar Todos
          </button>
        </div>
      )}
      {clients.length === 0 && (
        <div className="text-center py-12">
          <IconComponent size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Nenhum cliente encontrado nesta categoria.</p>
        </div>
      )}
    </div>

    {/* Sales Coach Modal */}
    {showSalesCoach && salesCoachClient && (
      <SalesCoachModal
        client={{
          id: salesCoachClient.id,
          name: salesCoachClient.name,
          email: salesCoachClient.email,
          phone: salesCoachClient.phone,
          type: salesCoachClient.type,
          leadStatus: salesCoachClient.status,
          value: salesCoachClient.value,
          lastInteraction: salesCoachClient.lastInteraction,
          answers: salesCoachClient.responses
        }}
        onClose={() => {
          setShowSalesCoach(false);
          setSalesCoachClient(null);
        }}
      />
    )}
    </>
  );
};

export default InsightDetailView;
