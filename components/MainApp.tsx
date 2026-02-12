
import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import DashboardUnificado from '@/components/DashboardUnificado';
import Kanban from '@/components/Kanban';
import FormBuilder from '@/components/FormBuilder';
import NPSAnalytics from '@/components/NPSAnalytics';
import NPSCampaigns from '@/components/NPSCampaigns';
import CampaignReport from '@/components/CampaignReport';
import FormReport from '@/components/FormReport';
import PublicSurvey from '@/components/PublicSurvey';
import PublicForm from '@/components/PublicForm';
import Settings from '@/components/Settings';
import AIChat from '@/components/AIChat';
import Pricing from '@/components/Pricing';
import AdminUserManagement from '@/components/AdminUserManagement';
import OpportunityAnalysis from '@/components/OpportunityAnalysis'; 
import Tutorial from '@/components/Tutorial'; 
import OnboardingTour from '@/components/OnboardingTour';
import DatabaseExport from '@/components/DatabaseExport';
// NEW IMPORTS FOR HELLO GROWTH 2.0
import DigitalDiagnostic from '@/components/DigitalDiagnostic';
import ProductsManagement from '@/components/ProductsManagement';
import BusinessProfile from '@/components/BusinessProfile';
import TeamManagement from '@/components/TeamManagement';
// CustomerJourney removed
import IntelligenceCenter from '@/components/IntelligenceCenter';
import { PlanType, Lead, NPSResponse, Campaign, Form, AccountSettings, User } from '@/types';
import { mockSettings } from '@/services/mockData';
import { supabase } from '@/lib/supabase';

interface MainAppProps {
  currentUser: User;
  onLogout: () => void;
  onUpdatePlan: (plan: PlanType) => void;
  daysLeft?: number;
}

const MainApp: React.FC<MainAppProps> = ({ currentUser, onLogout, onUpdatePlan, daysLeft }) => {
  // If Super Admin, show Admin Panel immediately
  if (currentUser.role === 'super_admin') {
      return <AdminUserManagement onLogout={onLogout} />;
  }

  // Sempre inicia no dashboard, independente do plano
  const [currentView, setCurrentViewRaw] = useState('dashboard');

  // Proteção de acesso por role - redireciona views não permitidas
  const userRole = currentUser.role || 'admin';
  const setCurrentView = (view: string) => {
    const allAccess = ['dashboard', 'analytics', 'intelligence-center', 'tutorial'];
    const viewerAccess = [...allAccess, 'digital-diagnostic', 'settings'];
    const memberAccess = [...allAccess, 'kanban', 'nps', 'database-export', 'ai-chat', 'settings', 'digital-diagnostic'];
    
    if (userRole === 'admin' || userRole === 'super_admin') {
      setCurrentViewRaw(view);
    } else if (userRole === 'manager') {
      if (view !== 'team-management' && view !== 'pricing') setCurrentViewRaw(view);
      else setCurrentViewRaw('dashboard');
    } else if (userRole === 'member') {
      if (memberAccess.includes(view)) setCurrentViewRaw(view);
      else setCurrentViewRaw('dashboard');
    } else if (userRole === 'viewer') {
      if (viewerAccess.includes(view)) setCurrentViewRaw(view);
      else setCurrentViewRaw('dashboard');
    } else {
      setCurrentViewRaw(view);
    }
  };

  
  // View States
  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);
  const [previewFormId, setPreviewFormId] = useState<string | null>(null);
  const [reportCampaignId, setReportCampaignId] = useState<string | null>(null);
  const [reportFormId, setReportFormId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // UI State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // --- REAL DATA STATES (Fetched from Supabase) ---
  const [leads, setLeads] = useState<Lead[]>([]);
  const [npsData, setNpsData] = useState<NPSResponse[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [settings, setSettings] = useState<AccountSettings>(mockSettings);
  const [loading, setLoading] = useState(true);

  // --- PUBLIC LINK DATA ---
  const [publicCampaign, setPublicCampaign] = useState<Campaign | null>(null);
  const [publicForm, setPublicForm] = useState<Form | null>(null);
  const [publicSettings, setPublicSettings] = useState<AccountSettings | undefined>(undefined);
  const [publicCompanyName, setPublicCompanyName] = useState<string>('');

  // --- INITIAL DATA FETCH ---
  const fetchData = async () => {
      if (!supabase) return;
      setLoading(true);

      try {
        if (currentUser.id !== 'public') {
          
          // 1. Buscar tenant_id do usuário atual
          const { data: userData } = await supabase
            .from('users')
            .select('tenant_id, settings, company_name, is_owner')
            .eq('id', currentUser.id)
            .single();

          const tenantId = userData?.tenant_id;

          // 2. Se não é owner, buscar settings do owner do tenant
          let ownerSettings = userData;
          if (userData && !userData.is_owner && tenantId) {
            const { data: ownerData } = await supabase
              .from('users')
              .select('settings, company_name')
              .eq('tenant_id', tenantId)
              .eq('is_owner', true)
              .single();
            if (ownerData) {
              ownerSettings = { ...userData, settings: ownerData.settings, company_name: ownerData.company_name };
            }
          }

          // 2. Fetch All Raw Data Parallelly usando tenant_id
          const results = await Promise.all([
            supabase.from('leads').select('*').eq('tenant_id', tenantId),
            supabase.from('campaigns').select('*').eq('tenant_id', tenantId),
            supabase.from('forms').select('*').eq('tenant_id', tenantId),
            supabase.from('nps_responses').select('*').eq('tenant_id', tenantId)
          ]);

          const dbLeads = results[0].data;
          const dbCampaigns = results[1].data;
          const dbForms = results[2].data;
          const dbNPS = results[3].data;
          const dbUser = ownerSettings;

          // --- PROCESS DATA ---

          // Leads
          if (dbLeads) {
             setLeads(dbLeads.map(l => {
                 // Safe extraction of notes from either column or JSON
                 const internalNotes = (l.answers && typeof l.answers === 'object' && l.answers._internal_notes) ? l.answers._internal_notes : '';
                 
                 return {
                    ...l,
                    formSource: l.form_source,
                    formId: l.form_id,
                    date: l.created_at,
                    // Robust Notes Loading: Check explicit column first, then fallback to JSON answer field
                    notes: l.notes || internalNotes || '' 
                 };
             }));
          }

          // Forms (CRITICAL: Strict array check to prevent white screen)
          if (dbForms) {
           setForms(dbForms.map(f => ({
               ...f,
               questions: Array.isArray(f.questions) ? f.questions : [],
               initialFields: f.initial_fields || []
           })));
         }

          // NPS Responses & Campaigns Integration
          let localCampaigns: Campaign[] = [];
          
          if (dbCampaigns) {
             const safeNPS = dbNPS || []; 
             localCampaigns = dbCampaigns.map(c => {
                const campaignResponses = safeNPS.filter(r => r.campaign_id === c.id);
                const count = campaignResponses.length;
                
                let score = 0;
                if (count > 0) {
                    const p = campaignResponses.filter(r => r.score >= 9).length;
                    const d = campaignResponses.filter(r => r.score <= 6).length;
                    score = Math.round(((p - d) / count) * 100);
                }

               return {
                   ...c,
                   npsScore: Math.max(0, score), 
                   responses: count,
                   enableRedirection: c.enable_redirection,
                   // CRITICAL: Strict array check
                   questions: Array.isArray(c.questions) ? c.questions : [],
                   initialFields: c.initial_fields || []
               };
             });
             setCampaigns(localCampaigns);
          }

          if (dbNPS) {
              const mappedNPS = dbNPS.map(n => {
                  const campaignName = localCampaigns.find(c => c.id === n.campaign_id)?.name || 'Desconhecida';
                  const derivedStatus = n.status || (n.score >= 9 ? 'Promotor' : n.score >= 7 ? 'Neutro' : 'Detrator');

                  let normalizedAnswers = n.answers;
                  if (normalizedAnswers && !Array.isArray(normalizedAnswers) && typeof normalizedAnswers === 'object') {
                     normalizedAnswers = Object.entries(normalizedAnswers).map(([k, v]: [string, any]) => {
                        // Fix for indexed objects where value is the full answer object
                        if (v && typeof v === 'object' && 'question' in v && 'answer' in v) {
                            return v;
                        }
                        return { question: k, answer: v };
                     });
                  }
                  
                  // Extract internal notes from JSON if column is empty
                  const internalNotes = (n.answers && typeof n.answers === 'object' && n.answers._internal_notes) ? n.answers._internal_notes : '';

                  return {
                    id: n.id,
                    customerName: n.customer_name,
                    customerEmail: n.customer_email,
                    customerPhone: n.customer_phone,
                    score: n.score,
                    comment: n.comment,
                    date: n.created_at,
                    campaign: campaignName,
                    campaignId: n.campaign_id,
                    status: derivedStatus as 'Promotor' | 'Neutro' | 'Detrator',
                    answers: normalizedAnswers,
                    notes: n.notes || internalNotes || ''
                  };
              });
              setNpsData(mappedNPS);
          }

           if (dbUser) {
               const mergedSettings = { 
                   ...mockSettings, 
                   ...(dbUser.settings as any || {}),
                   companyName: dbUser.settings?.companyName || dbUser.company_name || mockSettings.companyName
               };
               setSettings(mergedSettings);
               
               // Check if Onboarding Needed
               const hasSeenTour = localStorage.getItem('hg_onboarding_complete');
               
               // LOGIC UPDATE: Only show tour if not seen AND PlaceID is missing. 
               if (!hasSeenTour && !mergedSettings.placeId) {
                   setShowTour(true);
               }
           }
        }

        // ... (Public Link Logic)
        const params = new URLSearchParams(window.location.search);
        const surveyId = params.get('survey');
        const formId = params.get('form');

        if (surveyId) {
          setPreviewCampaignId(surveyId);
          setIsPreviewMode(false); 
          setCurrentView('public-survey');
          
          const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', surveyId).single();
          if (campaign) {
             const safeCampaign = {
                 ...campaign,
                 npsScore: campaign.nps_score,
                 enableRedirection: campaign.enable_redirection,
                 questions: Array.isArray(campaign.questions) ? campaign.questions : [],
                 initialFields: campaign.initial_fields || []
             };
              setPublicCampaign(safeCampaign);
              
              const { data: owner } = await supabase.from('users').select('settings, company_name').eq('id', campaign.user_id).single();
              if (owner) {
                   const realName = owner.company_name || owner.settings?.companyName || 'Sua Empresa';
                   setPublicCompanyName(realName);
                   const ownerSettings = { ...mockSettings, ...owner.settings, companyName: realName, placeId: owner.settings?.placeId };
                   setPublicSettings(ownerSettings);
              }
          }
        } else if (formId) {
          setPreviewFormId(formId);
          setIsPreviewMode(false);
          setCurrentView('public-form');
          
          const { data: form } = await supabase.from('forms').select('*').eq('id', formId).single();
          if (form) {
            const safeForm = {
              ...form,
              questions: Array.isArray(form.questions) ? form.questions : [],
              initialFields: form.initial_fields || []
            };
            setPublicForm(safeForm);
            
            const { data: owner } = await supabase.from('users').select('company_name, settings').eq('id', form.user_id).single();
            if (owner) {
              setPublicCompanyName(owner.company_name || owner.settings?.companyName || 'Sua Empresa');
            }
          }
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  // Supabase Realtime: Listen for new leads AND updates
  useEffect(() => {
    if (!supabase || !currentUser.tenantId) return;

    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `tenant_id=eq.${currentUser.tenantId}`
        },
        (payload) => {
          console.log('Novo lead inserido via Realtime:', payload);
          const newLead = payload.new as any;
          
          // Adicionar novo lead ao estado local
          setLeads((prev) => {
            if (prev.some(l => l.id === newLead.id)) return prev;
            return [{
              ...newLead,
              date: newLead.created_at,
              formSource: newLead.form_source,
              formId: newLead.form_id,
              notes: newLead.notes || ''
            }, ...prev];
          });
          
          // Análise IA é feita pela API Route /api/analyze-lead (no servidor)
          // Não precisa disparar aqui - já foi chamada no handleFormSubmit
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads',
          filter: `tenant_id=eq.${currentUser.tenantId}`
        },
        (payload) => {
          console.log('Lead atualizado via Realtime:', payload);
          const updatedLead = payload.new as any;
          
          // Atualizar lead no estado local
          setLeads((prev) => prev.map(l => {
            if (l.id === updatedLead.id) {
              return {
                ...l,
                ...updatedLead,
                date: updatedLead.created_at,
                formSource: updatedLead.form_source,
                formId: updatedLead.form_id,
                notes: updatedLead.notes || l.notes || ''
              };
            }
            return l;
          }));
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.tenantId]);

  // --- CRUD HANDLERS ---
  const handleSaveForm = async (form: Form) => {
    if (!supabase) return;
    const formData = {
      name: form.name,
      description: form.description,
      questions: form.questions,
      initial_fields: form.initialFields,
      active: form.active,
      user_id: currentUser.id,
      tenant_id: currentUser.tenantId
    };
    
    // Check if form exists in database
    if (form.id) {
      const { data: existingForm } = await supabase
        .from('forms')
        .select('id')
        .eq('id', form.id)
        .single();
      
      if (existingForm) {
        // UPDATE existing form
        await supabase.from('forms').update(formData).eq('id', form.id);
        setForms(prev => prev.map(f => f.id === form.id ? { ...f, ...form } : f));
      } else {
        // INSERT new form (ID doesn't exist in database)
        const { data } = await supabase.from('forms').insert([formData]).select().single();
        if (data) setForms(prev => [...prev, { ...data, questions: data.questions || [], initialFields: data.initial_fields || [] }]);
      }
    } else {
      // INSERT new form (no ID provided)
      const { data } = await supabase.from('forms').insert([formData]).select().single();
      if (data) setForms(prev => [...prev, { ...data, questions: data.questions || [], initialFields: data.initial_fields || [] }]);
    }
  };

  const handleDeleteForm = async (id: string) => {
    if (!supabase) return;
    
    // Primeiro: excluir todos os leads (respostas) deste formulário
    // A tabela leads usa 'form_id'
    const { error: leadsError } = await supabase
      .from('leads')
      .delete()
      .eq('form_id', id);
    
    if (leadsError) {
      console.error('Erro ao excluir leads:', leadsError);
      alert('Erro ao excluir leads do formulário');
      return;
    }
    
    // Depois: excluir o formulário
    const { error: formError } = await supabase
      .from('forms')
      .delete()
      .eq('id', id);
    
    if (formError) {
      console.error('Erro ao excluir formulário:', formError);
      alert('Erro ao excluir formulário');
      return;
    }
    
    // Atualizar estado local
    setForms(prev => prev.filter(f => f.id !== id));
    
    // Recarregar leads para atualizar o contador
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', currentUser.tenantId)
      .order('created_at', { ascending: false });
    
    if (leadsData) {
      setLeads(leadsData);
    }
  };

  const handleSaveCampaign = async (campaign: Campaign) => {
    if (!supabase) return;
    const campaignData = {
      name: campaign.name,
      description: campaign.description,
      questions: campaign.questions,
      status: campaign.status,
      enable_redirection: campaign.enableRedirection,
      initial_fields: campaign.initialFields,
      user_id: currentUser.id,
      tenant_id: currentUser.tenantId
    };

    if (campaign.id && campaigns.find(c => c.id === campaign.id)) {
      await supabase.from('campaigns').update(campaignData).eq('id', campaign.id);
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, ...campaign } : c));
    } else {
      const { data } = await supabase.from('campaigns').insert([campaignData]).select().single();
      if (data) setCampaigns(prev => [...prev, { ...data, npsScore: 0, responses: 0, questions: data.questions || [], initialFields: data.initial_fields || [], enableRedirection: data.enable_redirection }]);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!supabase) return;
    await supabase.from('campaigns').delete().eq('id', id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const handleAddLead = async (lead: Omit<Lead, 'id' | 'date'>) => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leads').insert([{
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      value: lead.value,
      form_source: lead.formSource,
      form_id: lead.formId,
      user_id: currentUser.id,
      tenant_id: currentUser.tenantId,
      answers: lead.answers
    }]).select().single();
    if (data && !error) {
      setLeads(prev => [{ ...data, date: data.created_at, formSource: data.form_source, formId: data.form_id }, ...prev]);
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, status: Lead['status']) => {
    if (!supabase) return;
    await supabase.from('leads').update({ status }).eq('id', leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
  };

  const handleUpdateLeadNotes = async (leadId: string, notes: string) => {
    if (!supabase) return;
    await supabase.from('leads').update({ notes }).eq('id', leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes } : l));
  };

  const handleUpdateNPSNote = async (responseId: string, notes: string) => {
    if (!supabase) return;
    await supabase.from('nps_responses').update({ notes }).eq('id', responseId);
    setNpsData(prev => prev.map(n => n.id === responseId ? { ...n, notes } : n));
  };

  const handleDeleteNpsResponse = async (id: string) => {
    if (!supabase) return;
    await supabase.from('nps_responses').delete().eq('id', id);
    setNpsData(prev => prev.filter(n => n.id !== id));
  };

  const handleSaveSettings = async (newSettings: AccountSettings) => {
    if (!supabase) return;
    // Se não é owner, salvar no owner do tenant
    const { data: userData } = await supabase.from('users').select('tenant_id, is_owner').eq('id', currentUser.id).single();
    if (userData?.is_owner) {
      await supabase.from('users').update({ settings: newSettings }).eq('id', currentUser.id);
    } else if (userData?.tenant_id) {
      await supabase.from('users').update({ settings: newSettings }).eq('tenant_id', userData.tenant_id).eq('is_owner', true);
    }
    setSettings(newSettings);
  };

  const handleNavigateWithFilter = (view: string, filter?: any) => {
    if (filter) setCustomerJourneyFilter(filter);
    setCurrentView(view);
  };

  const handleSurveySubmit = async (response: any) => {
    if (!supabase || !publicCampaign) return;
    
    const { data, error } = await supabase.from('nps_responses').insert([{
        campaign_id: publicCampaign.id,
        user_id: (publicCampaign as any).user_id,
        tenant_id: (publicCampaign as any).tenant_id,
        customer_name: response.customerName,
        customer_email: response.customerEmail,
        customer_phone: response.customerPhone,
        score: response.score,
        comment: response.comment,
        status: response.status,
        answers: response.answers
    }]).select().single();

    if (!error && data && isPreviewMode) {
        const newResponse: NPSResponse = {
            id: data.id,
            customerName: data.customer_name,
            customerEmail: data.customer_email,
            customerPhone: data.customer_phone,
            score: data.score,
            comment: data.comment,
            status: data.status,
            answers: data.answers,
            date: data.created_at,
            campaign: publicCampaign.name
        };
        setNpsData(prev => [newResponse, ...prev]);
        
        setCampaigns(prev => prev.map(c => {
            if (c.id === publicCampaign.id) {
                return { ...c, responses: (c.responses || 0) + 1 };
            }
            return c;
        }));
    }
  };

  const handleFormSubmit = async (data: any): Promise<boolean> => {
    if (!supabase || !publicForm) return false;
    
    const formUserId = (publicForm as any).user_id;
    const formTenantId = (publicForm as any).tenant_id || formUserId;
    
    // 1. Calcular valor base das respostas
    let opportunityValue = 0;
    Object.values(data.answers).forEach((ans: any) => {
        if (ans.optionSelected && ans.optionSelected.value) opportunityValue += ans.optionSelected.value;
    });

    // 2. OTIMIZAÇÃO: Salvar IMEDIATAMENTE sem aguardar análise de IA
    const status = 'Novo';
    
    const { data: insertedLead, error: insertError } = await supabase.from('leads').insert([{
        form_id: publicForm.id,
        user_id: formUserId,
        tenant_id: formTenantId,
        name: data.patient.name,
        email: data.patient.email,
        phone: data.patient.phone,
        status: status,
        value: opportunityValue,
        form_source: publicForm.name,
        answers: {
          ...data.answers
          // Removido _analyzing: lead aparece imediatamente sem badge
        }
    }]).select().single();
    
    if (insertError) {
      console.error('Erro ao salvar lead:', insertError);
      return false;
    }
    
    // Disparar análise IA no SERVIDOR (fire-and-forget)
    // A API roda no Vercel (servidor), não no navegador do cliente
    // Mesmo se o cliente fechar a página, a análise continua no servidor
    try {
      fetch('/api/analyze-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: insertedLead.id, tenantId: formTenantId })
      }).catch(err => console.error('Erro ao disparar análise IA:', err));
    } catch (e) {
      console.error('Erro ao chamar API analyze-lead:', e);
    }
    
    return true;
  };
  
  // Análise IA agora é feita pela API Route /api/analyze-lead (no servidor)

  const handlePreviewSurvey = (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    if (campaign) {
      setPublicCampaign(campaign);
      setPublicSettings(settings);
      setPublicCompanyName(settings.companyName);
    }
    setPreviewCampaignId(id);
    setIsPreviewMode(true);
    setCurrentView('public-survey');
  }

  const handlePreviewForm = (id: string) => {
    const form = forms.find(f => f.id === id);
    if (form) {
      setPublicForm(form);
      setPublicCompanyName(settings.companyName); // Set local preview name
    }
    setPreviewFormId(id);
    setIsPreviewMode(true);
    setCurrentView('public-form');
  }

  const handleClosePublicView = () => {
     if (currentView === 'public-survey') setCurrentView('nps');
     else if (currentView === 'public-form') setCurrentView('forms');
     else setCurrentView('dashboard');
     
     const url = new URL(window.location.href);
     url.searchParams.delete('survey');
     url.searchParams.delete('form');
     window.history.pushState({}, '', url);
     setPreviewCampaignId(null);
     setPreviewFormId(null);
     setIsPreviewMode(false);
  };



  // --- RENDER ---

  if (currentView === 'public-survey') {
    if (loading || !publicCampaign) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando pesquisa...</p>
          </div>
        </div>
      );
    }
    if (!publicCampaign) return <div className="p-8 text-center">Campanha não encontrada no banco de dados.</div>;
    return (
      <PublicSurvey 
        campaign={publicCampaign} 
        onClose={handleClosePublicView} 
        onSubmit={handleSurveySubmit} 
        isPreview={isPreviewMode} 
        settings={publicSettings} 
        companyName={publicCompanyName}
      />
    );
  }

  if (currentView === 'public-form') {
    if (loading || !publicForm) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando formulário...</p>
          </div>
        </div>
      );
    }
    return (
      <PublicForm 
        form={publicForm} 
        onClose={handleClosePublicView} 
        onSubmit={handleFormSubmit} 
        isPreview={isPreviewMode} 
        companyName={publicCompanyName}
      />
    );
  }

  return (
    <div className="flex min-h-screen font-sans text-slate-800 bg-gray-50">
      <Navigation 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        activePlan={currentUser.plan === 'trial' ? 'growth' : currentUser.plan} 
        onLogout={onLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        userRole={currentUser.role || 'admin'}
      />
      <main className={`flex-1 relative transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        {currentUser.plan === 'trial' && daysLeft !== undefined && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-sm font-medium flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 px-2 py-0.5 rounded text-xs uppercase font-bold tracking-wider">Teste Grátis</span>
              <span>Você tem <strong>{daysLeft} dias restantes</strong>.</span>
            </div>
            <button onClick={() => setCurrentView('pricing')} className="bg-white text-indigo-600 px-3 py-1 rounded text-xs font-bold">Assinar Agora</button>
          </div>
        )}
        
        {/* DASHBOARD UNIFICADO - SUBSTITUI O ANTIGO */}
        {currentView === 'dashboard' && (
            <DashboardUnificado 
                activePlan={currentUser.plan} 
                leads={leads} 
                npsData={npsData} 
                formsCount={forms.filter(f => f.active).length}
                campaignsCount={campaigns.filter(c => c.status === 'Ativa').length}
            />
        )}
        
        {currentView === 'kanban' && (
            <Kanban 
                leads={leads} 
                setLeads={setLeads}
                forms={forms}
                onLeadCreate={handleAddLead}
                onLeadStatusUpdate={handleUpdateLeadStatus}
                onLeadNoteUpdate={handleUpdateLeadNotes}
                currentUser={currentUser}
            />
        )}
        
        
        {currentView === 'forms' && (
            <FormBuilder 
                forms={forms} 
                leads={leads}
                onSaveForm={handleSaveForm}
                onDeleteForm={handleDeleteForm}
                onPreview={handlePreviewForm} 
                onViewReport={(id) => { setReportFormId(id); setCurrentView('form-report'); }}
                userId={currentUser.id}
            />
        )}
        
        {currentView === 'nps' && (
            <NPSCampaigns 
                campaigns={campaigns} 
                onSaveCampaign={handleSaveCampaign}
                onDeleteCampaign={handleDeleteCampaign}
                navigateToAnalytics={() => setCurrentView('analytics')} 
                onPreview={handlePreviewSurvey} 
                onViewReport={(id) => { setReportCampaignId(id); setCurrentView('campaign-report'); }} 
                currentUser={currentUser}
            />
        )}
        
        {currentView === 'analytics' && <NPSAnalytics 
            npsData={npsData} 
            onUpdateNPSNote={handleUpdateNPSNote}
            campaigns={campaigns}
        />}
        
        {currentView === 'campaign-report' && reportCampaignId && (
            <CampaignReport 
                campaignId={reportCampaignId} 
                campaigns={campaigns} 
                npsData={npsData} 
                onBack={() => setCurrentView('nps')} 
                onDeleteResponse={handleDeleteNpsResponse}
                onUpdateNPSNote={handleUpdateNPSNote}
            />
        )}
        
        {currentView === 'form-report' && reportFormId && (
            <FormReport 
                formId={reportFormId} 
                forms={forms} 
                leads={leads} 
                onBack={() => setCurrentView('forms')}
                supabase={supabase || undefined}
                userId={currentUser.id}
                onLeadUpdate={(leadId, updatedData) => {
                  setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updatedData } : l));
                }}
            />
        )}

        {currentView === 'database-export' && (
          <DatabaseExport 
            leads={leads}
            npsData={npsData}
            campaigns={campaigns}
            forms={forms}
            users={[currentUser]}
          />
        )}

        {/* NEW VIEWS FOR HELLO GROWTH 2.0 */}
        {currentView === 'intelligence-center' && (
          <IntelligenceCenter 
            leads={leads}
            npsData={npsData}

            onNavigate={handleNavigateWithFilter}
            userId={currentUser.id}
          />
        )}

        {currentView === 'digital-diagnostic' && (
          <DigitalDiagnostic 
            userId={currentUser.id}
            settings={settings}
            npsData={npsData}
          />
        )}

        {currentView === 'business-profile' && (
          <BusinessProfile 
            userId={currentUser.id}
            supabase={supabase}
            onProfileUpdate={fetchData}
          />
        )}

        {currentView === 'products' && (
          <ProductsManagement 
            supabase={supabase}
            userId={currentUser.id}
          />
        )}
        
        {currentView === 'ai-chat' && <AIChat leads={leads} npsData={npsData} activePlan={currentUser.plan} />}
        
        {currentView === 'pricing' && <Pricing currentPlan={currentUser.plan} onSelectPlan={onUpdatePlan} />}
        
        {currentView === 'settings' && (
            <Settings 
                activePlan={currentUser.plan} 
                onSelectPlan={() => setCurrentView('pricing')} 
                settings={settings} 
                setSettings={handleSaveSettings} 
                currentUser={currentUser}
                userRole={currentUser.role || 'admin'}
            />
        )}

        {currentView === 'tutorial' && (
            <Tutorial />
        )}

        {currentView === 'team-management' && (
            <TeamManagement 
                supabase={supabase}
                userId={currentUser.id}
                userRole={currentUser.role || 'admin'}
                userName={currentUser.name}
                userEmail={currentUser.email}
            />
        )}

        {showTour && (
            <OnboardingTour 
                onClose={() => setShowTour(false)} 
                setCurrentView={setCurrentView}
            />
        )}
      </main>
    </div>
  );
}

export default MainApp;
