import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import GiuliaWhatsApp from '@/components/GiuliaWhatsApp';
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
import OnboardingWizard from '@/components/OnboardingWizard';
import DatabaseExport from '@/components/DatabaseExport';
// NEW IMPORTS FOR HELLO GROWTH 2.0
import DigitalDiagnostic from '@/components/DigitalDiagnostic';
import ProductsManagement from '@/components/ProductsManagement';
import BusinessProfile from '@/components/BusinessProfile';
import TeamManagement from '@/components/TeamManagement';
// CustomerJourney removed
import IntelligenceCenter from '@/components/IntelligenceCenter';
import GameConfig from '@/components/GameConfig';
import GameParticipations from '@/components/GameParticipations';
import ReportSettings from '@/components/ReportSettings';
import AlertSettings from '@/components/AlertSettings';
import ActionInbox from '@/components/ActionInbox';
import ActionMetrics from '@/components/ActionMetrics';
import ReferralRewards from '@/components/ReferralRewards';
import WhatsAppSetup from '@/components/WhatsAppSetup';
import CSVImport from '@/components/CSVImport';
import PromptManager from '@/components/PromptManager';
import PilotChecklist from '@/components/PilotChecklist';
import PilotReport from '@/components/PilotReport';
import OptOutManager from '@/components/OptOutManager';
import GoLiveGuide from '@/components/GoLiveGuide';
import NotificationSettings from '@/components/NotificationSettings';
import ReportHistory from '@/components/ReportHistory';
import SystemHealth from '@/components/SystemHealth';
import ConversationExport from '@/components/ConversationExport';
import { PlanType, Lead, NPSResponse, Campaign, Form, AccountSettings, User } from '@/types';
import { setActiveTenantId } from '@/hooks/useTenantId';
import { mockSettings } from '@/services/mockData';
import { supabase } from '@/lib/supabase';
import { logActivity, logError } from '@/lib/activityLog';

interface MainAppProps {
  currentUser: User;
  onLogout: () => void;
  onUpdatePlan: (plan: PlanType) => void;
  onSwitchCompany?: (companyId: string) => void;
  onImpersonate?: (clientData: any) => void;
  daysLeft?: number;
}

const MainApp: React.FC<MainAppProps> = ({ currentUser, onLogout, onUpdatePlan, onImpersonate, daysLeft }) => {
  // If Super Admin, show Admin Panel immediately
  if (currentUser.role === 'super_admin') {
      return <AdminUserManagement onLogout={onLogout} onImpersonate={onImpersonate} />;
  }

  // Views que NÃO devem ser persistidas na URL (públicas ou transitórias)
  const NON_PERSISTENT_VIEWS = ['public-survey', 'public-form', 'pricing'];

  // Inicializar a view a partir do hash da URL (ex: #kanban → 'kanban')
  const getInitialView = () => {
    if (typeof window === 'undefined') return 'dashboard';
    const hash = window.location.hash.replace('#', '');
    if (hash && !NON_PERSISTENT_VIEWS.includes(hash)) return hash;
    return 'dashboard';
  };

  // Sempre inicia no dashboard, independente do plano
  const [currentView, setCurrentViewRaw] = useState(getInitialView);

  // Proteção de acesso por role - redireciona views não permitidas
  const userRole = currentUser.role || 'admin';

  // Atualiza o hash da URL ao mudar de view (exceto views transitórias)
  const persistView = (view: string) => {
    if (typeof window !== 'undefined') {
      if (!NON_PERSISTENT_VIEWS.includes(view)) {
        window.history.replaceState(null, '', `#${view}`);
      } else {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  };

  const setCurrentView = (view: string) => {
    const allAccess = ['dashboard', 'analytics', 'intelligence-center', 'tutorial'];
    const viewerAccess = [...allAccess, 'digital-diagnostic', 'settings'];
    const memberAccess = [...allAccess, 'kanban', 'nps', 'database-export', 'ai-chat', 'settings', 'digital-diagnostic'];
    
    if (userRole === 'admin' || userRole === 'super_admin') {
      setCurrentViewRaw(view);
      persistView(view);
    } else if (userRole === 'manager') {
      if (view !== 'team-management' && view !== 'pricing') { setCurrentViewRaw(view); persistView(view); }
      else { setCurrentViewRaw('dashboard'); persistView('dashboard'); }
    } else if (userRole === 'member') {
      if (view !== 'team-management' && view !== 'pricing') { setCurrentViewRaw(view); persistView(view); }
      else { setCurrentViewRaw('dashboard'); persistView('dashboard'); }
    } else if (userRole === 'viewer') {
      if (viewerAccess.includes(view)) { setCurrentViewRaw(view); persistView(view); }
      else { setCurrentViewRaw('dashboard'); persistView('dashboard'); }
    } else {
      setCurrentViewRaw(view);
      persistView(view);
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
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  // Onboarding: controla se o banner flutuante deve aparecer (wizard fechado mas não concluído)
  const [onboardingInProgress, setOnboardingInProgress] = useState(false);
  // Onboarding: sinais de criação para marcar etapas como concluídas
  const [npsCreatedSignal, setNpsCreatedSignal] = useState(0);
  const [formCreatedSignal, setFormCreatedSignal] = useState(0);
  const [productsCreatedSignal, setProductsCreatedSignal] = useState(0);
  // Onboarding: estados para abrir modais nativos diretamente do wizard
  const [onboardingOpenNpsTemplates, setOnboardingOpenNpsTemplates] = useState(0);
  const [onboardingOpenNpsAI, setOnboardingOpenNpsAI] = useState(0);
  const [onboardingOpenNpsManual, setOnboardingOpenNpsManual] = useState(0);
  const [onboardingOpenFormTemplates, setOnboardingOpenFormTemplates] = useState(0);
  const [onboardingOpenFormAI, setOnboardingOpenFormAI] = useState(0);
  const [onboardingOpenFormManual, setOnboardingOpenFormManual] = useState(0);
  const [onboardingOpenProductCatalog, setOnboardingOpenProductCatalog] = useState(0);
  const [onboardingOpenProductAI, setOnboardingOpenProductAI] = useState(0);
  const [onboardingOpenProductManual, setOnboardingOpenProductManual] = useState(0);

  // --- REAL DATA STATES (Fetched from Supabase) ---
  const [leads, setLeads] = useState<Lead[]>([]);
  const [npsData, setNpsData] = useState<NPSResponse[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [forms, setForms] = useState<Form[]>([]);
  const [settings, setSettings] = useState<AccountSettings>(mockSettings);
  const [loading, setLoading] = useState(true);
  const [catalogProducts, setCatalogProducts] = useState<Array<{ id: string; name: string; value: number }>>([]);

  // --- MULTI-COMPANY STATE ---
  const [userCompanies, setUserCompanies] = useState<any[]>([]);
  const [activeCompany, setActiveCompany] = useState<any>(null);

  // --- HELPER: retorna o tenant_id da empresa ativa (company switcher) ou fallback ---
  const getActiveTenant = (): string | undefined => {
    // Prioridade: 1) localStorage (persistido entre reloads), 2) activeCompany state, 3) fallback user
    const saved = typeof window !== 'undefined' ? localStorage.getItem('hg_active_company_id') : null;
    return saved || activeCompany?.id || currentUser.tenantId;
  };

  // --- GLOBAL AI ANALYSIS STATE ---
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

  const pendingAnalysisCount = leads.filter(l => 
    l.answers && !l.answers._ai_analysis && l.formSource !== 'Manual'
  ).length;

  const handleAnalyzeAllLeads = async () => {
    if (!supabase || !getActiveTenant() || isAnalyzingAll) return;
    
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
      .eq('tenant_id', getActiveTenant()!);
    
    const { data: businessProfile } = await supabase
      .from('business_profile')
      .select('*')
      .eq('tenant_id', getActiveTenant()!)
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
          `- **${p.name}** (R$ ${p.value})\n  Critérios de Indicação: ${p.ai_criteria || p.ai_description || 'Sem critérios definidos'}`
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
            focusedProductsContext = `\n\n\ud83c\udfaf PRODUTOS EM FOCO NESTE FORMUL\u00c1RIO (PRIORIDADE ALTA):\n${fp.map(p => `- **${p.name}** (R$ ${p.value})\n  Crit\u00e9rios de Indica\u00e7\u00e3o: ${p.ai_criteria || p.ai_description || 'Sem crit\u00e9rios definidos'}`).join('\n\n')}`;
          }
        }
        
        const prompt = `Voc\u00ea \u00e9 um consultor de vendas especializado. Analise as respostas do cliente e forne\u00e7a uma an\u00e1lise completa de oportunidade de venda.${businessContext}\nRESPOSTAS DO CLIENTE:\n${answersText}${budgetContext}\nPRODUTOS/SERVI\u00c7OS DISPON\u00cdVEIS:\n${productsContext}${focusedProductsContext}\n\ud83c\udfaf INSTRU\u00c7\u00d5ES:\n1. Analise profundamente as respostas do cliente\n2. \u26a0\ufe0f **REGRA OBRIGAT\u00d3RIA**: Se o cliente informou um or\u00e7amento, recomende APENAS produtos dentro dessa faixa de pre\u00e7o (tolerando no m\u00e1ximo 10% acima)\n3. ${focusedProductsContext ? 'PRIORIZE os produtos em foco, mas considere TODOS os produtos dispon\u00edveis' : 'Considere TODOS os produtos dispon\u00edveis'}\n4. Identifique produtos que o cliente pode precisar E que estejam dentro do or\u00e7amento\n5. Use as descri\u00e7\u00f5es dos produtos para entender o que cada um resolve\n6. Conecte os problemas/necessidades do cliente com as solu\u00e7\u00f5es dispon\u00edveis\n7. Se nenhum produto estiver no or\u00e7amento, sugira o mais pr\u00f3ximo e mencione possibilidade de parcelamento\n8. Gere um script de vendas personalizado e estrat\u00e9gico\nResponda APENAS com JSON v\u00e1lido (sem markdown):\n{\n  "recommended_products": [{"id": "product_id", "name": "Nome", "value": 0, "reason": "Raz\u00e3o"}],\n  "suggested_product": "Nome do produto principal",\n  "suggested_value": 0,\n  "classification": "opportunity|risk|monitoring",\n  "confidence": 0.85,\n  "reasoning": "Explica\u00e7\u00e3o detalhada",\n  "client_insights": ["Insight 1", "Insight 2"],\n  "sales_script": "Script de abordagem",\n  "next_steps": ["A\u00e7\u00e3o 1", "A\u00e7\u00e3o 2"]\n}`;
        
        // Retry no lado do cliente: até 3 tentativas com backoff
        let analyzed = false;
        for (let attempt = 0; attempt < 3 && !analyzed; attempt++) {
          try {
            if (attempt > 0) {
              const backoff = Math.pow(2, attempt) * 1500; // 3s, 6s
              await new Promise(r => setTimeout(r, backoff));
            }
            
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
              analyzed = true;
            } else if (attempt === 2) {
              failCount++;
            }
            // Se response não ok e não é última tentativa, o loop continua
          } catch (retryErr) {
            if (attempt === 2) {
              console.error(`Lead ${lead.name}: falhou após 3 tentativas`, retryErr);
              failCount++;
            }
          }
        }
      } catch (error) {
        console.error(`Erro ao analisar lead ${lead.name}:`, error);
        failCount++;
      }
      
      if (i < pendingLeads.length - 1) await new Promise(r => setTimeout(r, 1500));
    }
    
    setIsAnalyzingAll(false);
    alert(`An\u00e1lise conclu\u00edda!\n\u2705 ${successCount} leads analisados com sucesso\n${failCount > 0 ? `\u274c ${failCount} falharam` : ''}`);
  };

  // --- PUBLIC LINK DATA ---
  const [publicCampaign, setPublicCampaign] = useState<Campaign | null>(null);
  const [publicForm, setPublicForm] = useState<Form | null>(null);
  const [publicSettings, setPublicSettings] = useState<AccountSettings | undefined>(undefined);
  const [publicCompanyName, setPublicCompanyName] = useState<string>('');
  const [publicLogoUrl, setPublicLogoUrl] = useState<string>('');

  // --- INITIAL DATA FETCH ---
  const fetchData = async () => {
      if (!supabase) return;
      setLoading(true);

      try {
        if (currentUser.id !== 'public') {
          
          // 1. Determinar tenant_id: verifica localStorage para empresa ativa
          const savedActiveCompanyId = typeof window !== 'undefined' ? localStorage.getItem('hg_active_company_id') : null;
          let userData: any = null;

          // Sempre buscar dados base do usuário atual
          const { data: currentUserData } = await supabase
            .from('users')
            .select('tenant_id, settings, company_name, is_owner, role')
            .eq('id', currentUser.id)
            .single();

          // Verificar se a empresa salva no localStorage pertence ao usuário
          let tenantId: string | null = null;
          
          if (savedActiveCompanyId && savedActiveCompanyId !== currentUserData?.tenant_id) {
            // Verificar se o usuário tem acesso a essa empresa
            const { data: accessCheck } = await supabase
              .from('user_companies')
              .select('company_id')
              .eq('user_id', currentUser.id)
              .eq('company_id', savedActiveCompanyId)
              .eq('status', 'active')
              .maybeSingle();
            
            if (accessCheck) {
              // Usuário tem acesso: usar a empresa do localStorage
              tenantId = savedActiveCompanyId;
              
              // Buscar nome e settings da empresa na tabela companies
              const { data: companyData } = await supabase
                .from('companies')
                .select('*')
                .eq('id', tenantId)
                .maybeSingle();
              
              userData = {
                ...currentUserData,
                tenant_id: tenantId,
                company_name: companyData?.name || currentUserData?.company_name,
                is_owner: true,
                settings: companyData?.settings || currentUserData?.settings
              };
            } else {
              // Sem acesso: limpar localStorage e usar tenant padrão
              localStorage.removeItem('hg_active_company_id');
              tenantId = currentUserData?.tenant_id;
              userData = currentUserData;
            }
          } else {
            // Sem empresa salva ou é a mesma do usuário: usar tenant_id padrão
            tenantId = currentUserData?.tenant_id;
            userData = currentUserData;
          }

          // 2. Se não é owner, buscar settings do owner do tenant original
          let ownerSettings = userData;
          if ((!savedActiveCompanyId || savedActiveCompanyId === currentUserData?.tenant_id) && userData && !userData.is_owner && tenantId) {
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
            supabase.from('leads').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
            supabase.from('campaigns').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
            supabase.from('forms').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
            supabase.from('nps_responses').select('*').eq('tenant_id', tenantId).is('deleted_at', null),
            supabase.from('business_profile').select('*').eq('tenant_id', tenantId).maybeSingle(),
            supabase.from('products_services').select('id, name, value').eq('tenant_id', tenantId).is('deleted_at', null).order('name')
          ]);

          const dbLeads = results[0].data;
          const dbCampaigns = results[1].data;
          const dbForms = results[2].data;
          const dbNPS = results[3].data;
          const dbBizProfile = results[4].data;
          const dbProducts = results[5]?.data;
          if (dbProducts) setCatalogProducts(dbProducts.map((p: any) => ({ id: p.id, name: p.name, value: p.value || 0 })));
          if (dbBizProfile) setBusinessProfile(dbBizProfile);
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
                    notes: l.notes || internalNotes || '',
                    negotiation_notes: l.negotiation_notes || '',
                    suggested_products: l.suggested_products || null
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
               
               // Check if New Onboarding Wizard is needed (substitui o tour antigo)
               // Show wizard for new users who haven't completed onboarding
               const hasCompletedOnboarding = localStorage.getItem('hg_wizard_complete');
               
               // Se o perfil do negócio já foi preenchido, não mostrar onboarding
               const hasBusinessProfile = !!(dbBizProfile?.company_name || dbBizProfile?.business_type || dbBizProfile?.business_description);
               
               if (hasBusinessProfile) {
                 // Perfil já preenchido — marcar onboarding como completo e não exibir
                 localStorage.setItem('hg_wizard_complete', 'true');
               } else if (!hasCompletedOnboarding && tenantId) {
                 // Check onboarding_progress table
                 try {
                   const { data: onboardingData } = await supabase
                     .from('onboarding_progress')
                     .select('is_complete')
                     .eq('tenant_id', tenantId)
                     .maybeSingle();
                   if (!onboardingData || !onboardingData.is_complete) {
                     setShowOnboardingWizard(true);
                   } else {
                     localStorage.setItem('hg_wizard_complete', 'true');
                   }
                 } catch {
                   // Se a tabela não existe ainda, verificar tour antigo como fallback
                   const hasSeenTour = localStorage.getItem('hg_onboarding_complete');
                   const hasPlaceId = !!(mergedSettings.placeId || dbBizProfile?.google_place_id);
                   if (!hasSeenTour && !hasPlaceId) {
                     setShowTour(true);
                   }
                 }
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
              // Buscar business_profile ANTES de montar o safeCampaign para garantir que o
              // google_place_id e google_redirect estejam corretos desde o primeiro render
              const campaignTenantId = campaign.tenant_id || campaign.user_id;
              const { data: bizProfile } = await supabase
                .from('business_profile')
                .select('company_name, google_place_id, logo_url')
                .eq('tenant_id', campaignTenantId)
                .maybeSingle();

              // Place ID final: business_profile tem prioridade (mais atualizado)
              const finalPlaceId = bizProfile?.google_place_id || campaign.google_place_id || '';
              // Redirecionamento ativo se: campo google_redirect OU enable_redirection OU há Place ID no business_profile
              const finalRedirect = !!(campaign.google_redirect || campaign.enable_redirection || bizProfile?.google_place_id);

              const safeCampaign = {
                 ...campaign,
                 npsScore: campaign.nps_score,
                 enableRedirection: finalRedirect,
                 questions: Array.isArray(campaign.questions) ? campaign.questions : [],
                 initialFields: campaign.initial_fields || [],
                 initial_fields: campaign.initial_fields || [],
                 google_redirect: finalRedirect,
                 google_place_id: finalPlaceId,
                 offer_prize: campaign.offer_prize || false,
                 before_google_message: campaign.before_google_message || '',
                 after_game_message: campaign.after_game_message || '',
                 objective: campaign.objective || '',
                 tone: campaign.tone || '',
                 evaluation_points: campaign.evaluation_points || []
             };

              if (bizProfile?.company_name) {
                setPublicCompanyName(bizProfile.company_name);
                setPublicLogoUrl((bizProfile as any).logo_url || '');
                const ownerSettings = { ...mockSettings, companyName: bizProfile.company_name, placeId: finalPlaceId };
                setPublicSettings(ownerSettings);
              } else {
                // Fallback: buscar pelo user_id se não tiver business_profile
                const { data: owner } = await supabase.from('users').select('settings, company_name').eq('id', campaign.user_id).single();
                if (owner) {
                  const realName = owner.company_name || owner.settings?.companyName || 'Sua Empresa';
                  setPublicCompanyName(realName);
                  const ownerSettings = { ...mockSettings, ...owner.settings, companyName: realName, placeId: owner.settings?.placeId || finalPlaceId };
                  setPublicSettings(ownerSettings);
                }
              }

              // Definir publicCampaign apenas uma vez, já com todos os dados corretos
              setPublicCampaign(safeCampaign);
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
            
            // Buscar nome da empresa pelo business_profile do tenant do formulário
            const formTenantId = form.tenant_id || form.user_id;
            const { data: formBizProfile } = await supabase
              .from('business_profile')
              .select('company_name, logo_url')
              .eq('tenant_id', formTenantId)
              .maybeSingle();
            
            if (formBizProfile?.company_name) {
              setPublicCompanyName(formBizProfile.company_name);
              setPublicLogoUrl((formBizProfile as any).logo_url || '');
            } else {
              // Fallback: buscar pelo user_id
              const { data: owner } = await supabase.from('users').select('company_name, settings').eq('id', form.user_id).single();
              if (owner) {
                setPublicCompanyName(owner.company_name || owner.settings?.companyName || 'Sua Empresa');
              }
            }
          }
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
  };

  // --- BUSCA EMPRESAS DO USUÁRIO ---
  useEffect(() => {
    const fetchUserCompanies = async () => {
      if (!supabase || !currentUser.id || currentUser.id === 'public') return;
      try {
        // Busca empresas vinculadas ao usuário via user_companies
        const { data: userCompaniesData } = await supabase
          .from('user_companies')
          .select('*, company:companies(*)')
          .eq('user_id', currentUser.id)
          .eq('status', 'active');

        if (userCompaniesData && userCompaniesData.length > 0) {
          setUserCompanies(userCompaniesData);
          // Define empresa ativa: a que já estava ativa no localStorage, ou a default, ou a primeira
          const currentActiveId = localStorage.getItem('hg_active_company_id');
          const alreadyActive = currentActiveId ? userCompaniesData.find((uc: any) => uc.company_id === currentActiveId) : null;
          const defaultCompany = alreadyActive || userCompaniesData.find((uc: any) => uc.is_default) || userCompaniesData[0];
          if (defaultCompany?.company) {
            setActiveCompany(defaultCompany.company);
            setActiveTenantId(defaultCompany.company.id);
          }
        } else {
          // Fallback: usa o tenant_id do próprio usuário como empresa
          const { data: userData } = await supabase
            .from('users')
            .select('tenant_id, company_name')
            .eq('id', currentUser.id)
            .single();
          if (userData?.tenant_id) {
            const { data: companyData } = await supabase
              .from('companies')
              .select('*')
              .eq('id', userData.tenant_id)
              .maybeSingle();
            if (companyData) {
              setActiveCompany(companyData);
              setActiveTenantId(companyData.id);
              setUserCompanies([{ company_id: companyData.id, company: companyData, is_default: true, role: 'owner' }]);
            } else if (userData.company_name) {
              // Empresa não está na tabela companies, cria objeto local
              const fakeCompany = { id: userData.tenant_id, name: userData.company_name };
              setActiveCompany(fakeCompany);
              setActiveTenantId(userData.tenant_id);
              setUserCompanies([{ company_id: userData.tenant_id, company: fakeCompany, is_default: true, role: 'owner' }]);
            }
          }
        }
      } catch (e) {
        console.error('Erro ao buscar empresas do usuário:', e);
      }
    };
    fetchUserCompanies();
  }, [currentUser.id]);

  const handleSwitchCompany = async (companyId: string): Promise<void> => {
    // Salva a empresa selecionada no localStorage e recarrega a página inteira
    // Isso garante que TODOS os componentes (MainApp + filhos) carreguem dados da empresa correta
    setActiveTenantId(companyId);
    window.location.reload();
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  // Supabase Realtime: Listen for new leads and NPS responses being inserted
  useEffect(() => {
    const activeTenant = getActiveTenant();
    if (!supabase || !activeTenant) return;

    const channel = supabase
      .channel('realtime-new-submissions')
      // --- Novos leads (respostas de formulários) ---
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `tenant_id=eq.${activeTenant}`
        },
        (payload) => {
          const newLead = payload.new as any;
          const internalNotes = (newLead.answers && typeof newLead.answers === 'object' && newLead.answers._internal_notes)
            ? newLead.answers._internal_notes : '';
          setLeads((prev) => {
            if (prev.some(l => l.id === newLead.id)) return prev;
            return [{
              ...newLead,
              date: newLead.created_at,
              formSource: newLead.form_source,
              formId: newLead.form_id,
              notes: newLead.notes || internalNotes || ''
            }, ...prev];
          });
        }
      )
      // --- Novas respostas NPS ---
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nps_responses',
          filter: `tenant_id=eq.${activeTenant}`
        },
        (payload) => {
          const n = payload.new as any;
          const derivedStatus = n.status || (n.score >= 9 ? 'Promotor' : n.score >= 7 ? 'Neutro' : 'Detrator');
          let normalizedAnswers = n.answers;
          if (normalizedAnswers && !Array.isArray(normalizedAnswers) && typeof normalizedAnswers === 'object') {
            normalizedAnswers = Object.entries(normalizedAnswers).map(([k, v]: [string, any]) => {
              if (v && typeof v === 'object' && 'question' in v && 'answer' in v) return v;
              return { question: k, answer: v };
            });
          }
          const internalNotes = (n.answers && typeof n.answers === 'object' && n.answers._internal_notes)
            ? n.answers._internal_notes : '';

          setNpsData((prev) => {
            if (prev.some(r => r.id === n.id)) return prev;
            // Buscar nome da campanha no estado atual de campaigns
            setCampaigns(prevCampaigns => {
              const campaignName = prevCampaigns.find(c => c.id === n.campaign_id)?.name || 'Desconhecida';
              const newResponse = {
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
              // Atualizar o score da campanha correspondente
              return prevCampaigns.map(c => {
                if (c.id !== n.campaign_id) return c;
                const allResponses = [...prev, newResponse].filter(r => r.campaignId === c.id);
                const count = allResponses.length;
                const p = allResponses.filter(r => r.score >= 9).length;
                const d = allResponses.filter(r => r.score <= 6).length;
                const score = count > 0 ? Math.round(((p - d) / count) * 100) : 0;
                return { ...c, npsScore: Math.max(0, score), responses: count };
              });
            });
            return [{ ...n, id: n.id, customerName: n.customer_name, customerEmail: n.customer_email,
              customerPhone: n.customer_phone, score: n.score, comment: n.comment, date: n.created_at,
              campaign: '', campaignId: n.campaign_id, status: derivedStatus as 'Promotor' | 'Neutro' | 'Detrator',
              answers: normalizedAnswers, notes: n.notes || internalNotes || '' }, ...prev];
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompany?.id, currentUser.tenantId]);

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
      tenant_id: getActiveTenant(),
      game_enabled: form.game_enabled || false,
      game_id: form.game_id || null,
      show_logo: (form as any).show_logo || false,
      email_analysis_enabled: form.email_analysis_enabled || false,
      email_analysis_recipients: form.email_analysis_recipients || ''
      // product_ids: requer migração 004 no Supabase antes de habilitar
      // product_ids: (form as any).product_ids || null
    };
    
    // Verificar se o ID é um UUID válido (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    // IDs temporários gerados com Date.now() não são UUIDs válidos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUUID = form.id && uuidRegex.test(form.id);
    
    if (isValidUUID) {
      // UPDATE: ID é UUID válido, formulário já existe no banco
      const { error: updateError } = await supabase.from('forms').update(formData).eq('id', form.id);
      if (updateError) {
        console.error('Erro ao atualizar formulário:', updateError);
        logError({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, entity_type: 'form', entity_id: form.id, entity_name: form.name, error_message: updateError.message, details: { action_attempted: 'update_form' } });
        alert('Erro ao salvar formulário: ' + updateError.message);
        return;
      }
      setForms(prev => prev.map(f => f.id === form.id ? { ...f, ...form } : f));
      logActivity({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, action: 'update', entity_type: 'form', entity_id: form.id, entity_name: form.name });
    } else {
      // INSERT: ID ausente ou temporário (Date.now()) - deixar banco gerar UUID
      const { data, error: insertError } = await supabase.from('forms').insert([formData]).select().single();
      if (insertError) {
        console.error('Erro ao inserir formulário:', insertError);
        logError({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, entity_type: 'form', entity_name: form.name, error_message: insertError.message, details: { action_attempted: 'create_form' } });
        alert('Erro ao salvar formulário: ' + insertError.message);
        return;
      }
      if (data) {
        setForms(prev => [...prev, { ...data, questions: data.questions || [], initialFields: data.initial_fields || [] }]);
        // Sinalizar para o onboarding que um formulário foi criado
        if (showOnboardingWizard || onboardingInProgress) setFormCreatedSignal(prev => prev + 1);
        logActivity({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, action: 'create', entity_type: 'form', entity_id: data.id, entity_name: form.name });
      }
    }
  };

  const handleDeleteForm = async (id: string) => {
    if (!supabase) return;
    
    // Soft delete: marcar leads do formulário como deletados
    const { error: leadsError } = await supabase
      .from('leads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('form_id', id)
      .is('deleted_at', null);
    
    if (leadsError) {
      console.error('Erro ao excluir leads:', leadsError);
      alert('Erro ao excluir leads do formulário');
      return;
    }
    
    // Soft delete: marcar formulário como deletado
    const { error: formError } = await supabase
      .from('forms')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (formError) {
      console.error('Erro ao excluir formulário:', formError);
      alert('Erro ao excluir formulário');
      return;
    }
    
    // Atualizar estado local
    const deletedForm = forms.find(f => f.id === id);
    setForms(prev => prev.filter(f => f.id !== id));
    logActivity({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, action: 'delete', entity_type: 'form', entity_id: id, entity_name: deletedForm?.name || id });
    
    // Recarregar leads para atualizar o contador (excluindo soft-deleted)
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
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
      show_logo: (campaign as any).show_logo ?? false,
      objective: (campaign as any).objective ?? '',
      tone: (campaign as any).tone ?? '',
      evaluation_points: (campaign as any).evaluation_points ?? [],
      user_id: currentUser.id,
      tenant_id: getActiveTenant()
    };

    if (campaign.id && campaigns.find(c => c.id === campaign.id)) {
      const { error: updateError } = await supabase.from('campaigns').update(campaignData).eq('id', campaign.id);
      if (updateError) {
        console.error('Erro ao atualizar campanha:', updateError);
        logError({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, entity_type: 'campaign', entity_id: campaign.id, entity_name: campaign.name, error_message: updateError.message, details: { action_attempted: 'update_campaign' } });
        alert('Erro ao salvar campanha: ' + updateError.message);
        return;
      }
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, ...campaign } : c));
      logActivity({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, action: 'update', entity_type: 'campaign', entity_id: campaign.id, entity_name: campaign.name });
    } else {
      const { data, error: insertError } = await supabase.from('campaigns').insert([campaignData]).select().single();
      if (insertError) {
        console.error('Erro ao inserir campanha:', insertError);
        logError({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, entity_type: 'campaign', entity_name: campaign.name, error_message: insertError.message, details: { action_attempted: 'create_campaign' } });
        alert('Erro ao salvar campanha: ' + insertError.message);
        return;
      }
      if (data) {
        setCampaigns(prev => [...prev, { ...data, npsScore: 0, responses: 0, questions: data.questions || [], initialFields: data.initial_fields || [], enableRedirection: data.enable_redirection, google_redirect: data.google_redirect, google_place_id: data.google_place_id, offer_prize: data.offer_prize, game_id: data.game_id, before_google_message: data.before_google_message, after_game_message: data.after_game_message, objective: data.objective, tone: data.tone, evaluation_points: data.evaluation_points }]);
        // Sinalizar para o onboarding que um NPS foi criado
        if (showOnboardingWizard || onboardingInProgress) setNpsCreatedSignal(prev => prev + 1);
        logActivity({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, action: 'create', entity_type: 'campaign', entity_id: data.id, entity_name: campaign.name });
      }
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!supabase) return;
    
    try {
      // Soft delete: marcar respostas e campanha como deletadas
      await supabase.from('nps_responses').update({ deleted_at: new Date().toISOString() }).eq('campaign_id', id).is('deleted_at', null);
      
      // Soft delete: marcar a campanha como deletada
      const { error } = await supabase.from('campaigns').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      
      if (error) {
        console.error('Erro ao deletar campanha:', error);
        alert('Erro ao excluir campanha. Tente novamente.');
        return;
      }
      
      // Atualizar estado local
      const deletedCampaign = campaigns.find(c => c.id === id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      logActivity({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, action: 'delete', entity_type: 'campaign', entity_id: id, entity_name: deletedCampaign?.name || id });
    } catch (err: any) {
      console.error('Erro inesperado ao deletar campanha:', err);
      logError({ tenant_id: getActiveTenant(), user_email: currentUser.email, user_name: currentUser.name, entity_type: 'campaign', entity_id: id, error_message: err?.message || 'Erro desconhecido', details: { action_attempted: 'delete_campaign' } });
      alert('Erro inesperado ao excluir campanha.');
    }
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
      tenant_id: getActiveTenant(),
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
    // Disparar alerta de lead ganho ou perdido
    if (status === 'Vendido' || status === 'Perdido') {
      const lead = leads.find(l => l.id === leadId);
      const tenantId = getActiveTenant();
      if (lead && tenantId) {
        fetch('/api/send-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: status === 'Vendido' ? 'lead_won' : 'lead_lost',
            companyId: tenantId,
            data: {
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              value: lead.value || 0,
              formSource: lead.formSource,
            },
          }),
        }).catch(() => {});
      }
    }
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

    // Disparar alertas de NPS (fire-and-forget)
    if (!error && data) {
      const npsAlertData = {
        customerName: data.customer_name || 'Cliente',
        score: data.score,
        comment: data.comment || '',
        phone: data.customer_phone || '',
        companyName: publicCompanyName || undefined,
      };
      const campaignTenantId = (publicCampaign as any).tenant_id;
      if (campaignTenantId) {
        let alertType: string | null = null;
        if (data.score <= 6) alertType = 'detractor';
        else if (data.score >= 9) alertType = 'promoter';
        else if (data.score >= 7 && data.score <= 8 && data.comment) alertType = 'neutral_with_comment';
        if (alertType) {
          fetch('/api/send-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: alertType, companyId: campaignTenantId, data: npsAlertData }),
          }).catch(() => {});
        }
        // Alerta de qualquer resposta NPS (independente da nota)
        fetch('/api/send-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'any_nps_response', companyId: campaignTenantId, data: npsAlertData }),
        }).catch(() => {});
      }
    }

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

    // 1b. Enriquecer respostas com o texto livre da opção "Outro"
    // Quando o usuário selecionou "Outro" e digitou um texto livre, substituir o valor
    const enrichedAnswers: Record<string, any> = {};
    Object.entries(data.answers).forEach(([qId, ans]: [string, any]) => {
      if (!ans || typeof ans !== 'object') { enrichedAnswers[qId] = ans; return; }
      const otherTexts = ans.otherTexts || {};
      if (Object.keys(otherTexts).length === 0) { enrichedAnswers[qId] = ans; return; }
      // Para single choice: substituir "Outro" pelo texto digitado
      if (typeof ans.value === 'string' && ans.value.trim().toLowerCase() === 'outro') {
        const otherVal = Object.values(otherTexts)[0] as string;
        enrichedAnswers[qId] = { ...ans, value: otherVal ? `Outro: ${otherVal.trim()}` : ans.value };
      // Para multiple choice: substituir cada "Outro" no array
      } else if (Array.isArray(ans.value)) {
        const newValues = ans.value.map((v: string) => {
          if (v.trim().toLowerCase() === 'outro') {
            const otherVal = otherTexts[v] as string;
            return otherVal ? `Outro: ${otherVal.trim()}` : v;
          }
          return v;
        });
        enrichedAnswers[qId] = { ...ans, value: newValues };
      } else {
        enrichedAnswers[qId] = ans;
      }
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
        answers: enrichedAnswers
    }]).select().single();
    
    if (insertError) {
      console.error('Erro ao salvar lead:', insertError);
      return false;
    }
    
    // Disparar alertas de novo lead e lead de alto valor (fire-and-forget)
    if (insertedLead && formTenantId) {
      const alertData = {
        name: insertedLead.name,
        email: insertedLead.email,
        phone: insertedLead.phone,
        value: insertedLead.value || 0,
        formSource: insertedLead.form_source,
        companyName: publicCompanyName || undefined,
      };
      fetch('/api/send-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_lead', companyId: formTenantId, data: alertData }),
      }).catch(() => {});
      if ((insertedLead.value || 0) > 0) {
        fetch('/api/send-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'high_value_lead', companyId: formTenantId, data: alertData }),
        }).catch(() => {});
      }
    }
    
    // Disparar e-mail de análise direto (sem depender da IA) se o formulário tiver esse recurso ativado
    if (insertedLead && formTenantId && publicForm.email_analysis_enabled) {
      const rawRecipients = publicForm.email_analysis_recipients || '';
      const emailRecipients = typeof rawRecipients === 'string'
        ? rawRecipients.split(',').map((e: string) => e.trim()).filter(Boolean)
        : Array.isArray(rawRecipients) ? rawRecipients : [];
      if (emailRecipients.length > 0) {
        const questionsForEmail = publicForm.questions.map((q: any) => ({ id: q.id, text: q.text || q.id }));
        fetch('/api/send-analysis-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipients: emailRecipients,
            leadName: data.patient?.name || 'Lead',
            leadEmail: data.patient?.email || '',
            leadPhone: data.patient?.phone || '',
            formName: publicForm.name,
            companyName: publicCompanyName || '',
            answers: enrichedAnswers,
            questions: questionsForEmail,
            aiAnalysis: {},
          }),
        }).catch(err => console.error('[email-analysis] Erro ao disparar e-mail:', err));
      }
    }

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
          `- **${p.name}** (R$ ${p.value})\n  Critérios de Indicação: ${p.ai_criteria || p.ai_description || 'Sem critérios definidos'}`
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
            focusedProductsContext = `\n\n🎯 PRODUTOS EM FOCO NESTE FORMULÁRIO (PRIORIDADE ALTA):\n${focusedProducts.map(p => `- **${p.name}** (R$ ${p.value})\n  Critérios de Indicação: ${p.ai_criteria || p.ai_description || 'Sem critérios definidos'}`).join('\n\n')}`;
          }
        }

        const prompt = `Você é um consultor de vendas especializado. Analise as respostas do cliente e forneça uma análise completa de oportunidade de venda.${businessContext}

RESPOSTAS DO CLIENTE:
${answersText}${budgetContext}

PRODUTOS/SERVIÇOS DISPONÍVEIS (com critérios técnicos de indicação):
${productsContext}${focusedProductsContext}

🎯 INSTRUÇÕES:
1. Analise profundamente as respostas do cliente
2. ⚠️ **REGRA OBRIGATÓRIA**: Se o cliente informou um orçamento, recomende APENAS produtos dentro dessa faixa de preço (tolerando no máximo 10% acima)
3. ${focusedProductsContext ? 'PRIORIZE os produtos em foco, mas considere TODOS os produtos disponíveis' : 'Considere TODOS os produtos disponíveis'}
4. Identifique produtos que o cliente pode precisar E que estejam dentro do orçamento
5. Use os CRITÉRIOS DE INDICAÇÃO de cada produto para decidir se ele é adequado para este cliente
6. Sugira apenas produtos cujos critérios se alinhem com o perfil e necessidades do cliente
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
      // Mesclar o Place ID do business_profile (mais atualizado) com a campanha
      const finalPlaceId = (businessProfile as any)?.google_place_id || (campaign as any).google_place_id || settings?.placeId || '';
      const finalRedirect = !!((campaign as any).google_redirect || (campaign as any).enable_redirection || campaign.enableRedirection || finalPlaceId);
      const mergedCampaign = {
        ...campaign,
        google_place_id: finalPlaceId,
        google_redirect: finalRedirect,
        enableRedirection: finalRedirect,
      };
      setPublicCampaign(mergedCampaign);
      setPublicSettings({ ...settings, placeId: finalPlaceId });
      setPublicCompanyName(settings.companyName);
      setPublicLogoUrl(businessProfile?.logo_url || '');
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
      setPublicLogoUrl(businessProfile?.logo_url || '');
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
        logoUrl={publicLogoUrl}
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
        logoUrl={publicLogoUrl}
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
        onSwitchCompany={handleSwitchCompany}
        leads={leads}
        npsData={npsData}
      />
      <main className={`flex-1 relative transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        {(currentUser.plan === 'trial' || currentUser.trialModel === 'model_b') && daysLeft !== undefined && (
          <div className={`text-white px-4 py-2 text-sm font-medium flex justify-between items-center sticky top-0 z-20 ${daysLeft <= 3 ? 'bg-red-600' : daysLeft <= 7 ? 'bg-orange-500' : 'bg-emerald-600'}`}>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold tracking-wider ${daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-orange-400' : 'bg-emerald-500'}`}>Trial</span>
              {daysLeft === 0 ? (
                <span>Seu trial <strong>expira hoje</strong>! Assine para manter o acesso.</span>
              ) : (
                <span>Você tem <strong>{daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}</strong> de trial gratuito.</span>
              )}
            </div>
            <button onClick={() => setCurrentView('pricing')} className="bg-white text-emerald-700 px-3 py-1 rounded text-xs font-bold hover:bg-emerald-50 transition-colors">Assinar Agora</button>
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
                catalogProducts={catalogProducts}
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
                isAnalyzingAll={isAnalyzingAll}
                analysisProgress={analysisProgress}
                pendingAnalysisCount={pendingAnalysisCount}
                onAnalyzeAllLeads={handleAnalyzeAllLeads}
                onboardingOpenTemplates={onboardingOpenFormTemplates}
                onboardingOpenAI={onboardingOpenFormAI}
                onboardingOpenManual={onboardingOpenFormManual}
                businessProfile={businessProfile}
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
                businessProfile={businessProfile}
                onboardingOpenTemplates={onboardingOpenNpsTemplates}
                onboardingOpenAI={onboardingOpenNpsAI}
                onboardingOpenManual={onboardingOpenNpsManual}
            />
        )}
        
        {currentView === 'analytics' && <NPSAnalytics 
            npsData={npsData} 
            onUpdateNPSNote={handleUpdateNPSNote}
            onDeleteNPSResponse={handleDeleteNpsResponse}
            campaigns={campaigns}
        />}
        
        {currentView === 'games' && (
            <div className="p-6">
                <GameConfig tenantId={getActiveTenant()!} />
            </div>
        )}
        
        {currentView === 'game-participations' && (
            <div className="p-6">
                <GameParticipations tenantId={getActiveTenant()!} campaigns={campaigns} />
            </div>
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
                onLeadDelete={(leadId) => {
                  setLeads(prev => prev.filter(l => l.id !== leadId));
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
            tenantId={getActiveTenant()}
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
            activeTenantId={getActiveTenant()}
            settings={settings}
            npsData={npsData}
            businessProfile={businessProfile}
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
            onboardingOpenCatalog={onboardingOpenProductCatalog}
            onboardingOpenAI={onboardingOpenProductAI}
            onboardingOpenManual={onboardingOpenProductManual}
            onProductsCreated={() => setProductsCreatedSignal(prev => prev + 1)}
          />
        )}
        
        {currentView === 'ai-chat' && <AIChat leads={leads} npsData={npsData} activePlan={currentUser.plan} />}
        
        {currentView === 'pricing' && (() => {
          // Redirecionar para /pricing (PricingClient com isManageMode ativado)
          if (typeof window !== 'undefined') {
            window.location.href = '/pricing';
          }
          return null;
        })()}
        
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
            <Tutorial onOpenOnboarding={() => {
                localStorage.removeItem('hg_wizard_complete');
                setShowOnboardingWizard(true);
            }} />
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

        {currentView === 'report-settings' && (
            <ReportSettings 
                currentUser={currentUser}
                userRole={currentUser.role || 'admin'}
            />
        )}

        {currentView === 'alert-settings' && (
            <div className="p-6">
              <AlertSettings
                companyId={getActiveTenant() || ''}
                companyName={settings.companyName || 'Minha Empresa'}
                activePlan={currentUser.plan || 'hello_growth'}
              />
            </div>
        )}

        {currentView === 'action-inbox' && (
          <ActionInbox
            isDark={false}
            tenantId={getActiveTenant() || ''}
          />
        )}

        {currentView === 'whatsapp-setup' && (
          <div className="p-6 space-y-8">
            <WhatsAppSetup
              isDark={false}
              tenantId={getActiveTenant() || ''}
              companyName={settings.companyName || 'Minha Empresa'}
            />
            <div className="border-t border-gray-200 pt-8">
              <CSVImport tenantId={getActiveTenant() || ''} />
            </div>
          </div>
        )}

        {currentView === 'action-metrics' && (
          <ActionMetrics
            isDark={false}
            tenantId={getActiveTenant() || ''}
          />
        )}

        {currentView === 'referral-rewards' && (
          <ReferralRewards
            isDark={false}
            tenantId={getActiveTenant() || ''}
          />
        )}

        {currentView === 'prompt-manager' && (
          <PromptManager
            isDark={false}
            tenantId={getActiveTenant() || ''}
          />
        )}

        {currentView === 'pilot-checklist' && (
          <PilotChecklist />
        )}
        {currentView === 'pilot-report' && (
          <PilotReport isDark={false} tenantId={getActiveTenant() || ''} />
        )}
        {currentView === 'opt-out-manager' && (
          <OptOutManager isDark={false} tenantId={getActiveTenant() || ''} />
        )}
        {currentView === 'go-live-guide' && (
          <GoLiveGuide isDark={false} />
        )}
        {currentView === 'notification-settings' && (
          <NotificationSettings isDark={false} tenantId={getActiveTenant() || ''} />
        )}
        {currentView === 'report-history' && (
          <ReportHistory isDark={false} tenantId={getActiveTenant() || ''} />
        )}
        {currentView === 'system-health' && (
          <SystemHealth isDark={false} tenantId={getActiveTenant() || ''} />
        )}
        {currentView === 'conversation-export' && (
          <ConversationExport isDark={false} tenantId={getActiveTenant() || ''} />
        )}
        {/* Banner flutuante de onboarding em andamento — aparece quando o usuário navega para módulos durante o onboarding */}
        {!showOnboardingWizard && onboardingInProgress && ['nps','forms','products'].includes(currentView) && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-white"/>
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Onboarding em andamento</p>
              <p className="text-xs text-emerald-200 leading-tight">Crie aqui e volte ao wizard para continuar</p>
            </div>
            <button
              onClick={() => { setOnboardingInProgress(false); setShowOnboardingWizard(true); }}
              className="ml-2 flex items-center gap-1.5 bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors flex-shrink-0">
              <ArrowLeft size={12}/> Voltar ao Wizard
            </button>
          </div>
        )}

        {showTour && (
            <OnboardingTour 
                onClose={() => setShowTour(false)} 
                setCurrentView={setCurrentView}
            />
        )}

        {/* OnboardingWizard: mantido montado quando onboardingInProgress para que useEffects continuem ativos */}
        {(showOnboardingWizard || onboardingInProgress) && (
            <div style={{ display: showOnboardingWizard ? 'block' : 'none' }}>
              <OnboardingWizard
                  userId={currentUser.id}
                  tenantId={getActiveTenant() || currentUser.tenantId || ''}
                  userPlan={currentUser.plan || 'trial'}
                  companyName={settings.companyName || activeCompany?.name || 'Minha Empresa'}
                  onComplete={() => {
                      setShowOnboardingWizard(false);
                      setOnboardingInProgress(false);
                      localStorage.setItem('hg_wizard_complete', 'true');
                  }}
                  onNavigate={(view: string) => {
                      setShowOnboardingWizard(false);
                      setCurrentView(view);
                  }}
                  npsCreatedSignal={npsCreatedSignal}
                  formCreatedSignal={formCreatedSignal}
                  productsCreatedSignal={productsCreatedSignal}
                  onOpenNpsTemplates={() => { setShowOnboardingWizard(false); setOnboardingInProgress(true); setCurrentView('nps'); setTimeout(() => setOnboardingOpenNpsTemplates(Date.now()), 150); }}
                  onOpenNpsAI={() => { setShowOnboardingWizard(false); setOnboardingInProgress(true); setCurrentView('nps'); setTimeout(() => setOnboardingOpenNpsAI(Date.now()), 150); }}
                  onOpenNpsManual={() => { setShowOnboardingWizard(false); setOnboardingInProgress(true); setCurrentView('nps'); setTimeout(() => setOnboardingOpenNpsManual(Date.now()), 150); }}
                  onOpenFormTemplates={() => { setShowOnboardingWizard(false); setOnboardingInProgress(true); setCurrentView('forms'); setTimeout(() => setOnboardingOpenFormTemplates(Date.now()), 150); }}
                  onOpenFormAI={() => { setShowOnboardingWizard(false); setOnboardingInProgress(true); setCurrentView('forms'); setTimeout(() => setOnboardingOpenFormAI(Date.now()), 150); }}
                  onOpenFormManual={() => { setShowOnboardingWizard(false); setOnboardingInProgress(true); setCurrentView('forms'); setTimeout(() => setOnboardingOpenFormManual(Date.now()), 150); }}
                  onOpenProductCatalog={() => { setShowOnboardingWizard(false); setOnboardingInProgress(true); setCurrentView('products'); setTimeout(() => setOnboardingOpenProductCatalog(Date.now()), 150); }}
                  onOpenProductAI={() => { setShowOnboardingWizard(false); setOnboardingInProgress(true); setCurrentView('products'); setTimeout(() => setOnboardingOpenProductAI(Date.now()), 150); }}
                  onOpenProductManual={() => { setShowOnboardingWizard(false); setOnboardingInProgress(true); setCurrentView('products'); setTimeout(() => setOnboardingOpenProductManual(Date.now()), 150); }}
              />
            </div>
        )}
      </main>

      {/* Botão flutuante WhatsApp - Giulia Customer Success */}
      <GiuliaWhatsApp />

    </div>
  );
}

export default MainApp;
