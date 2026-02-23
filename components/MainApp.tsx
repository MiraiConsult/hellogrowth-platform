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
import Strategic from '@/components/Strategic';
import Game from '@/components/Game';
import { PlanType, Lead, NPSResponse, Campaign, Form, AccountSettings, User, UserCompany, Company } from '@/types';
import CompanySwitcher from '@/components/CompanySwitcher';
import { mockSettings } from '@/services/mockData';
import { supabase } from '@/lib/supabase';

interface MainAppProps {
  currentUser: User;
  onLogout: () => void;
  onUpdatePlan: (plan: PlanType) => void;
  onSwitchCompany?: (companyId: string) => void;
  daysLeft?: number;
}

const MainApp: React.FC<MainAppProps> = ({ currentUser, onLogout, onUpdatePlan, onSwitchCompany, daysLeft }) => {
  // Estado da empresa ativa
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [userCompanies, setUserCompanies] = useState<UserCompany[]>(currentUser.companies || []);

  // Carregar empresa ativa
  useEffect(() => {
    const loadActiveCompany = async () => {
      if (currentUser.companies && currentUser.companies.length > 0) {
        const defaultUc = currentUser.companies.find(uc => uc.is_default) || currentUser.companies[0];
        if (defaultUc?.company) {
          setActiveCompany(defaultUc.company as Company);
        }
        setUserCompanies(currentUser.companies);
      } else if (currentUser.tenantId) {
        // Fallback: criar empresa virtual a partir dos dados do usuário
        setActiveCompany({
          id: currentUser.tenantId,
          name: currentUser.companyName || 'Minha Empresa',
          plan: currentUser.plan,
        });
      }
    };
    loadActiveCompany();
  }, [currentUser]);
  // If Super Admin, show Admin Panel immediately
  if (currentUser.role === 'super_admin') {
      return <AdminUserManagement onLogout={onLogout} />;
  }

  // Sempre inicia no dashboard, independente do plano
  const [currentView, setCurrentViewRaw] = useState("dashboard");

  // Proteção de acesso por role - redireciona views não permitidas
  const userRole = currentUser.role || 'admin';
  const setCurrentView = (view: string) => {
    const allAccess = ['dashboard', 'analytics', 'intelligence-center', 'tutorial'];
    const viewerAccess = [...allAccess, 'digital-diagnostic', 'settings'];
    const memberAccess = [...allAccess, 'kanban', 'nps', 'database-export', 'ai-chat', 'settings', 'digital-diagnostic'];
    
    if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'owner') {
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

  // --- GLOBAL AI ANALYSIS STATE ---
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

  const pendingAnalysisCount = leads.filter(l => 
    l.answers && !l.answers._ai_analysis && l.formSource !== 'Manual'
  ).length;

  const handleAnalyzeAllLeads = async () => {
    if (!supabase || !activeCompany?.id || isAnalyzingAll) return;
    
    const pendingLeads = leads.filter(l => 
      l.answers && !l.answers._ai_analysis && l.formSource !== 'Manual'
    );
    
    if (pendingLeads.length === 0) {
      alert('Todos os leads j\u00e1 foram analisados!');
      return;
    }
    
    setIsAnalyzingAll(true);
    setAnalysisProgress({ current: 0, total: pendingLeads.length });
    
    let successCount = 0;
    let failCount = 0;
    
    const { data: products } = await supabase
      .from('products_services')
      .select('*')
      .eq('tenant_id', activeCompany.id);
    
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('*')
      .eq('tenant_id', activeCompany.id)
      .single();
    
    for (let i = 0; i < pendingLeads.length; i++) {
      const lead = pendingLeads[i];
      setAnalysisProgress({ current: i + 1, total: pendingLeads.length });
      
      try {
        const leadForm = forms.find(f => f.id === lead.formId || f.name === lead.formSource);
        
        const answersText = Object.entries(lead.answers || {}).filter(([key]) => !key.startsWith('_')).map(([qId, ans]: [string, any]) => {
          const questionText = leadForm ? (leadForm.questions.find((q: any) => q.id === qId)?.text || qId) : qId;
          const answerValue = typeof ans === 'object' && ans !== null ? (Array.isArray(ans.value) ? ans.value.join(', ') : ans.value || JSON.stringify(ans)) : ans;
          return `Pergunta: ${questionText}\nResposta: ${answerValue}`;
        }).join('\n\n');
        
        if (!answersText.trim()) { failCount++; continue; }
        
        let budgetContext = '';
        if (lead.answers) {
          const budgetEntry = Object.entries(lead.answers).find(([qId]) => {
            const q = leadForm?.questions.find((q: any) => q.id === qId);
            const txt = q?.text?.toLowerCase() || '';
            return txt.includes('or\u00e7amento') || txt.includes('investir') || txt.includes('valor') || txt.includes('quanto');
          });
          if (budgetEntry) {
            const [, ans] = budgetEntry as [string, any];
            const val = typeof ans === 'object' ? (Array.isArray(ans.value) ? ans.value.join(', ') : ans.value) : ans;
            budgetContext = `\n\n\u26a0\ufe0f OR\u00c7AMENTO DO CLIENTE (RESTRI\u00c7\u00c3O OBRIGAT\u00d3RIA): ${val}`;
          }
        }
        
        const productsContext = products && products.length > 0 ? products.map(p => 
          `- **${p.name}** (R$ ${p.value})\n  Descri\u00e7\u00e3o: ${p.ai_description || 'Sem descri\u00e7\u00e3o'}`
        ).join('\n\n') : 'Nenhum produto cadastrado';
        
        let businessContext = '';
        if (businessProfile) {
          businessContext = `\n\nCONTEXTO DO NEG\u00d3CIO:\n- Tipo: ${businessProfile.business_type || 'N/A'}\n- Descri\u00e7\u00e3o: ${businessProfile.business_description || 'N/A'}\n- P\u00fablico-alvo: ${businessProfile.target_audience || 'N/A'}\n- Diferenciais: ${businessProfile.differentials || 'N/A'}`;
        }
        
        const formSelectedProducts = (leadForm as any)?.selected_products || [];
        let focusedProductsContext = '';
        if (formSelectedProducts.length > 0 && products) {
          const fp = products.filter(p => formSelectedProducts.includes(p.id));
          if (fp.length > 0) {
            focusedProductsContext = `\n\n\ud83c\udfaf PRODUTOS EM FOCO NESTE FORMUL\u00c1RIO (PRIORIDADE ALTA):\n${fp.map(p => `- **${p.name}** (R$ ${p.value})\n  Descri\u00e7\u00e3o: ${p.ai_description || 'Sem descri\u00e7\u00e3o'}`).join('\n\n')}`;
          }
        }
        
        const prompt = `Voc\u00ea \u00e9 um consultor de vendas especializado. Analise as respostas do cliente e forne\u00e7a uma an\u00e1lise completa de oportunidade de venda.${businessContext}\nRESPOSTAS DO CLIENTE:\n${answersText}${budgetContext}\nPRODUTOS/SERVI\u00c7OS DISPON\u00cdVEIS:\n${productsContext}${focusedProductsContext}\n\ud83c\udfaf INSTRU\u00c7\u00d5ES:\n1. Analise profundamente as respostas do cliente\n2. \u26a0\ufe0f **REGRA OBRIGAT\u00d3RIA**: Se o cliente informou um or\u00e7amento, recomende APENAS produtos dentro dessa faixa de pre\u00e7o (tolerando no m\u00e1ximo 10% acima)\n3. ${focusedProductsContext ? 'PRIORIZE os produtos em foco, mas considere TODOS os produtos dispon\u00edveis' : 'Considere TODOS os produtos dispon\u00edveis'}\n4. Identifique produtos que o cliente pode precisar E que estejam dentro do or\u00e7amento\n5. Use as descri\u00e7\u00f5es dos produtos para entender o que cada um resolve\n6. Conecte os problemas/necessidades do cliente com as solu\u00e7\u00f5es dispon\u00edveis\n7. Se nenhum produto estiver no or\u00e7amento, sugira o mais pr\u00f3ximo e mencione possibilidade de parcelamento\n8. Gere um script de vendas personalizado e estrat\u00e9gico\nResponda APENAS com JSON v\u00e1lido (sem markdown):\n{\n  "recommended_products": [{"id": "product_id", "name": "Nome", "value": 0, "reason": "Raz\u00e3o"}],\n  "suggested_product": "Nome do produto principal",\n  "suggested_value": 0,\n  "classification": "opportunity|risk|monitoring",\n  "confidence": 0.85,\n  "reasoning": "Explica\u00e7\u00e3o detalhada",\n  "client_insights": ["Insight 1", "Insight 2"],\n  "sales_script": "Script de abordagem",\n  "next_steps": ["A\u00e7\u00e3o 1", "A\u00e7\u00e3o 2"]\n}`;
        
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        
        if (response.ok) {
          const aiData = await response.json();
          const cleanResponse = aiData.response.replace(/```json\n?|\n?```/g, '').trim();
          const aiAnalysis = JSON.parse(cleanResponse);
          
          let updatedValue = lead.value;
          if (aiAnalysis.recommended_products && aiAnalysis.recommended_products.length > 0) {
            updatedValue = aiAnalysis.recommended_products.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
          } else if (aiAnalysis.suggested_value > 0) {
            updatedValue = aiAnalysis.suggested_value;
          }
          
          const updatedAnswers = { ...lead.answers, _ai_analysis: aiAnalysis, _analyzing: false };
          await supabase.from('leads').update({
            value: updatedValue,
            answers: updatedAnswers
          }).eq('id', lead.id);
          
          setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, value: updatedValue, answers: updatedAnswers } : l));
          successCount++;
        } else { failCount++; }
      } catch (error) {
        console.error(`Erro ao analisar lead ${lead.name}:`, error);
        failCount++;
      }
      
      if (i < pendingLeads.length - 1) await new Promise(r => setTimeout(r, 1000));
    }
    
    setIsAnalyzingAll(false);
    alert(`An\u00e1lise conclu\u00edda!\n\u2705 ${successCount} leads analisados com sucesso\n${failCount > 0 ? `\u274c ${failCount} falharam` : ''}`);
  };

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

          // Use activeCompany.id if available, otherwise fallback to userData.tenant_id
          const tenantId = activeCompany?.id || userData?.tenant_id;

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
                 initialFields: campaign.initial_fields || [],
                 initial_fields: campaign.initial_fields || [],
                 google_redirect: campaign.google_redirect || false,
                 google_place_id: campaign.google_place_id || '',
                 offer_prize: campaign.offer_prize || false,
                 before_google_message: campaign.before_google_message || '',
                 after_game_message: campaign.after_game_message || '',
                 objective: campaign.objective || '',
                 tone: campaign.tone || '',
                 evaluation_points: campaign.evaluation_points || []
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
    // For public users (form/survey links), always call fetchData
    // For logged-in users, only call when activeCompany is available
    if (currentUser.id === 'public' || activeCompany) {
      fetchData();
    }
  }, [currentUser.id, activeCompany]);

  // Supabase Realtime: Listen for new leads being inserted
  useEffect(() => {
    if (!supabase || !activeCompany?.id) return;

    const channel = supabase
      .channel('leads-insert-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `tenant_id=eq.${activeCompany.id}`
        },
        (payload) => {
          console.log('Novo lead inserido via Realtime:', payload);
          const newLead = payload.new as any;
          
          // Adicionar novo lead ao estado local
          setLeads((prev) => {
            // Verificar se o lead já existe (evitar duplicatas)
            if (prev.some(l => l.id === newLead.id)) {
              return prev;
            }
            
            return [{
              ...newLead,
              date: newLead.created_at,
              formSource: newLead.form_source,
              formId: newLead.form_id,
              notes: newLead.notes || ''
            }, ...prev];
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompany?.id]);

  // --- CRUD HANDLERS ---
  const handleSaveForm = async (form: Form) => {
    if (!supabase) return;
    
    // If game is enabled, get the active game for this tenant
    let gameId = null;
    if (form.game_enabled) {
      const { data: activeGame } = await supabase
        .from('nps_games')
        .select('id')
        .eq('tenant_id', activeCompany?.id || currentUser.tenantId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (activeGame) {
        gameId = activeGame.id;
      }
    }
    
    const formData = {
      name: form.name,
      description: form.description,
      questions: form.questions,
      initial_fields: form.initialFields,
      active: form.active,
      game_enabled: form.game_enabled || false,
      game_id: gameId,
      user_id: currentUser.id,
      tenant_id: activeCompany?.id || currentUser.tenantId
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
        await fetchData(); // Reload all data to ensure consistency
      } else {
        // INSERT new form (ID doesn't exist in database)
        await supabase.from('forms').insert([formData]).select().single();
        await fetchData(); // Reload all data to ensure consistency
      }
    } else {
      // INSERT new form (no ID provided)
      await supabase.from('forms').insert([formData]).select().single();
      await fetchData(); // Reload all data to ensure consistency
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
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (leadsData) {
      setLeads(leadsData);
    }
  };

  const handleSaveCampaign = async (campaign: Campaign) => {
    if (!supabase) return;
    const campaignData: any = {
      name: campaign.name,
      description: campaign.description,
      questions: campaign.questions,
      status: campaign.status,
      enable_redirection: (campaign as any).google_redirect ?? campaign.enableRedirection ?? false,
      initial_fields: (campaign as any).initial_fields ?? campaign.initialFields ?? [],
      google_redirect: (campaign as any).google_redirect ?? campaign.enableRedirection ?? false,
      google_place_id: (campaign as any).google_place_id ?? (campaign as any).googlePlaceId ?? '',
      offer_prize: (campaign as any).offer_prize ?? (campaign as any).offerPrize ?? false,
      game_id: (campaign as any).game_id ?? null,
      before_google_message: (campaign as any).before_google_message ?? (campaign as any).beforeGoogleMessage ?? '',
      after_game_message: (campaign as any).after_game_message ?? (campaign as any).afterGameMessage ?? '',
      objective: (campaign as any).objective ?? '',
      tone: (campaign as any).tone ?? '',
      evaluation_points: (campaign as any).evaluation_points ?? [],
      user_id: currentUser.id,
      tenant_id: activeCompany?.id || currentUser.tenantId
    };

    if (campaign.id && campaigns.find(c => c.id === campaign.id)) {
      await supabase.from('campaigns').update(campaignData).eq('id', campaign.id);
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, ...campaign } : c));
    } else {
      const { data } = await supabase.from('campaigns').insert([campaignData]).select().single();
      if (data) setCampaigns(prev => [...prev, { ...data, npsScore: 0, responses: 0, questions: data.questions || [], initialFields: data.initial_fields || [], enableRedirection: data.enable_redirection, google_redirect: data.google_redirect, google_place_id: data.google_place_id, offer_prize: data.offer_prize, game_id: data.game_id, before_google_message: data.before_google_message, after_game_message: data.after_game_message, objective: data.objective, tone: data.tone, evaluation_points: data.evaluation_points }]);
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
      tenant_id: activeCompany?.id || currentUser.tenantId,
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
        }
    }]).select().single();
    
    if (insertError) {
      console.error('Erro ao salvar lead:', insertError);
      return false;
    }
    
    // Análise de IA será feita sob demanda pelo admin (botão "Analisar com IA")
    return true;
  };
  
  // Função auxiliar para processar análise de IA em background
  const processAIAnalysisInBackground = async (
    leadId: string,
    data: any,
    form: Form,
    formTenantId: string
  ) => {
    if (!supabase) return;
    
    let aiAnalysis = null;
    let updatedValue = 0;
    try {
      // Buscar produtos e perfil do negócio
      const { data: products } = await supabase
        .from('products_services')
        .select('*')
        .eq('tenant_id', formTenantId);

      // Buscar perfil do negócio
      const { data: businessProfile } = await supabase
        .from('business_profile')
        .select('*')
        .eq('tenant_id', formTenantId)
        .single();

      if (products && products.length > 0) {
        // 3. Preparar contexto para análise da IA
        const answersText = Object.entries(data.answers).map(([qId, ans]: [string, any]) => {
          const question = publicForm.questions.find((q: any) => q.id === qId);
          const answerValue = Array.isArray(ans.value) ? ans.value.join(', ') : ans.value;
          return `Pergunta: ${question?.text || qId}\nResposta: ${answerValue}`;
        }).join('\n\n');
        
        // Extrair orçamento do cliente das respostas
        let budgetContext = '';
        const budgetAnswer = Object.entries(data.answers).find(([qId, ans]: [string, any]) => {
          const question = form.questions.find((q: any) => q.id === qId);
          const questionText = question?.text?.toLowerCase() || '';
          return questionText.includes('orçamento') || 
                 questionText.includes('investir') || 
                 questionText.includes('valor') ||
                 questionText.includes('quanto');
        });
        
        if (budgetAnswer) {
          const [, ans] = budgetAnswer as [string, any];
          const budgetValue = Array.isArray(ans.value) ? ans.value.join(', ') : ans.value;
          budgetContext = `\n\n⚠️ ORÇAMENTO DO CLIENTE (RESTRIÇÃO OBRIGATÓRIA): ${budgetValue}`;
        }

        // Preparar contexto de produtos com descrições
        const productsContext = products.map(p => 
          `- **${p.name}** (R$ ${p.value})\n  Descrição: ${p.ai_description || 'Sem descrição'}`
        ).join('\n\n');

        // Preparar contexto do negócio
        let businessContext = '';
        if (businessProfile) {
          businessContext = `\n\nCONTEXTO DO NEGÓCIO:\n- Tipo: ${businessProfile.business_type || 'Não especificado'}\n- Descrição: ${businessProfile.business_description || 'Não especificado'}\n- Público-alvo: ${businessProfile.target_audience || 'Não especificado'}\n- Diferenciais: ${businessProfile.differentials || 'Não especificado'}`;
        }

        // Verificar se o formulário tem produtos selecionados
        const formSelectedProducts = (publicForm as any).selected_products || [];
        let focusedProductsContext = '';
        if (formSelectedProducts.length > 0) {
          const focusedProducts = products.filter(p => formSelectedProducts.includes(p.id));
          if (focusedProducts.length > 0) {
            focusedProductsContext = `\n\n🎯 PRODUTOS EM FOCO NESTE FORMULÁRIO (PRIORIDADE ALTA):\n${focusedProducts.map(p => `- **${p.name}** (R$ ${p.value})\n  Descrição: ${p.ai_description || 'Sem descrição'}`).join('\n\n')}`;
          }
        }

        const prompt = `Você é um consultor de vendas especializado. Analise as respostas do cliente e forneça uma análise completa de oportunidade de venda.${businessContext}

RESPOSTAS DO CLIENTE:
${answersText}${budgetContext}

PRODUTOS/SERVIÇOS DISPONÍVEIS:
${productsContext}${focusedProductsContext}

🎯 INSTRUÇÕES:
1. Analise profundamente as respostas do cliente
2. ⚠️ **REGRA OBRIGATÓRIA**: Se o cliente informou um orçamento, recomende APENAS produtos dentro dessa faixa de preço (tolerando no máximo 10% acima)
3. ${focusedProductsContext ? 'PRIORIZE os produtos em foco, mas considere TODOS os produtos disponíveis' : 'Considere TODOS os produtos disponíveis'}
4. Identifique produtos que o cliente pode precisar E que estejam dentro do orçamento
5. Use as descrições dos produtos para entender o que cada um resolve
6. Conecte os problemas/necessidades do cliente com as soluções disponíveis
7. Se nenhum produto estiver no orçamento, sugira o mais próximo e mencione possibilidade de parcelamento
8. Gere um script de vendas personalizado e estratégico

Responda APENAS com JSON válido (sem markdown):
{
  "recommended_products": [
    {"id": "product_id_1", "name": "Nome do Produto 1", "value": 0, "reason": "Por que este produto é adequado"},
    {"id": "product_id_2", "name": "Nome do Produto 2", "value": 0, "reason": "Por que este produto é adequado"}
  ],
  "suggested_product": "Nome do produto principal (para compatibilidade)",
  "suggested_value": 0,
  "classification": "opportunity|risk|monitoring",
  "confidence": 0.85,
  "reasoning": "Explicação detalhada conectando as respostas do cliente com os produtos recomendados",
  "client_insights": [
    "Insight 1 sobre o cliente",
    "Insight 2 sobre necessidades",
    "Insight 3 sobre urgência"
  ],
  "sales_script": "Script de abordagem estratégico: Baseado nas respostas, identifiquei que [necessidade do cliente]. Recomendo [produtos] porque [benefícios específicos].",
  "next_steps": [
    "Ação 1 recomendada",
    "Ação 2 recomendada"
  ]
}`;

        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });

        if (response.ok) {
          const aiData = await response.json();
          try {
            const cleanResponse = aiData.response.replace(/```json\n?|\n?```/g, '').trim();
            aiAnalysis = JSON.parse(cleanResponse);
            
            // Atualizar valor somando TODOS os produtos recomendados
            if (aiAnalysis.recommended_products && aiAnalysis.recommended_products.length > 0) {
              updatedValue = aiAnalysis.recommended_products.reduce((sum: number, product: any) => sum + (product.value || 0), 0);
            } else if (aiAnalysis.suggested_value > 0) {
              // Fallback: usar suggested_value se recommended_products não existir
              updatedValue = aiAnalysis.suggested_value;
            }
          } catch (e) {
            console.error('Erro ao parsear resposta da IA:', e);
            // Se falhar, criar análise básica
            aiAnalysis = {
              recommended_products: products.slice(0, 1).map(p => ({
                id: p.id,
                name: p.name,
                value: p.value,
                reason: 'Produto sugerido com base no perfil do cliente'
              })),
              suggested_product: products[0]?.name || 'Produto não identificado',
              suggested_value: updatedValue || products[0]?.value || 0,
              classification: updatedValue > 0 ? 'opportunity' : 'monitoring',
              confidence: 0.5,
              reasoning: 'Análise automática baseada nas respostas fornecidas.',
              client_insights: ['Cliente demonstrou interesse nos serviços'],
              sales_script: 'Entre em contato para entender melhor as necessidades do cliente.',
              next_steps: ['Fazer contato inicial', 'Agendar reunião']
            };
          }
        }
      } else {
        // Sem produtos cadastrados - criar análise básica
        aiAnalysis = {
          suggested_product: 'Cadastre produtos para análise automática',
          suggested_value: updatedValue || 0,
          classification: 'monitoring',
          confidence: 0.3,
          reasoning: 'Nenhum produto cadastrado para análise. Cadastre produtos na seção Produtos/Serviços.',
          client_insights: ['Lead capturado aguardando análise'],
          sales_script: 'Entre em contato para qualificar o lead.',
          next_steps: ['Cadastrar produtos', 'Fazer contato inicial']
        };
      }
    } catch (error) {
      console.error('Erro na análise de IA em background:', error);
    }
    
    // Atualizar lead com análise de IA
    if (aiAnalysis) {
      await supabase
        .from('leads')
        .update({
          value: updatedValue,
          answers: {
            ...data.answers,
            _ai_analysis: aiAnalysis,
            _analyzing: false  // Remove flag de análise
          }
        })
        .eq('id', leadId);
    }
  };

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
        currentUser={currentUser}
        activeCompany={activeCompany}
        userCompanies={userCompanies}
        onSwitchCompany={onSwitchCompany}
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
                isAnalyzingAll={isAnalyzingAll}
                analysisProgress={analysisProgress}
                pendingAnalysisCount={pendingAnalysisCount}
                onAnalyzeAllLeads={handleAnalyzeAllLeads}
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
                activeCompany={activeCompany}
                isAnalyzingAll={isAnalyzingAll}
                analysisProgress={analysisProgress}
                pendingAnalysisCount={pendingAnalysisCount}
                onAnalyzeAllLeads={handleAnalyzeAllLeads}
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
        
        {currentView === 'games' && (
            <Game tenantId={activeCompany?.id || currentUser.tenantId} campaigns={campaigns} />
        )}
        
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
          <Strategic 
            leads={leads}
            npsData={npsData}
            onNavigate={handleNavigateWithFilter}
            userId={currentUser.id}
            activePlan={currentUser.plan}
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
