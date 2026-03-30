'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Building2, Star, Package, FileText, Activity,
  ChevronRight, ChevronLeft, Check, Sparkles, X,
  Loader2, CheckCircle2, Zap, Plus, Trash2,
  MapPin, AlertCircle, ArrowRight, SkipForward, Info,
  LayoutTemplate, Wand2, PenLine, ArrowLeft,
  ExternalLink, Globe
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface OnboardingWizardProps {
  userId: string;
  tenantId: string;
  userPlan: string;
  companyName: string;
  onComplete: () => void;
  onNavigate: (view: string, onboardingStep?: string) => void;
}

type CreationMode = null | 'template' | 'ai' | 'manual';

// ─── Etapas ───────────────────────────────────────────────────────────────────
const getSteps = (plan: string) => {
  const all = [
    {
      id: 'profile', key: 'step_profile_done', title: 'Perfil do Negócio',
      subtitle: 'Identidade e informações da sua empresa',
      icon: Building2, color: 'emerald',
      plans: ['trial','client','rating','growth','growth_lifetime'], skippable: false,
      tip: 'Quanto mais detalhado, mais inteligente a IA fica para sugerir textos e ações personalizadas para o seu negócio.',
    },
    {
      id: 'nps', key: 'step_nps_done', title: 'Pesquisa de NPS',
      subtitle: 'Meça a satisfação dos seus clientes',
      icon: Star, color: 'yellow',
      plans: ['trial','client','rating','growth','growth_lifetime'], skippable: false,
      tip: 'Clientes com nota 9-10 são redirecionados automaticamente para o Google. Isso aumenta suas avaliações positivas!',
    },
    {
      id: 'products', key: 'step_products_done', title: 'Produtos e Serviços',
      subtitle: 'O que você vende',
      icon: Package, color: 'blue',
      plans: ['growth','growth_lifetime','client','trial'], skippable: false,
      tip: 'Cadastrar produtos permite calcular o valor de pipeline dos seus leads e a IA sugerir o produto certo na hora certa.',
    },
    {
      id: 'form', key: 'step_form_done', title: 'Formulário de Pré-venda',
      subtitle: 'Capte e qualifique leads automaticamente',
      icon: FileText, color: 'purple',
      plans: ['growth','growth_lifetime','client','trial'], skippable: false,
      tip: 'Compartilhe o link do formulário no Instagram, WhatsApp e Google. Cada preenchimento entra direto no CRM!',
    },
    {
      id: 'mpd', key: 'step_mbd_done', title: 'Minha Presença Digital',
      subtitle: 'Diagnóstico e monitoramento online',
      icon: Activity, color: 'teal',
      plans: ['growth','growth_lifetime'], skippable: true,
      tip: 'O MPD monitora suas avaliações no Google, presença nas redes sociais e gera um score de presença digital.',
    },
  ];
  return all.filter(s => s.plans.includes(plan));
};

// ─── Cores ────────────────────────────────────────────────────────────────────
const C: Record<string, { bg: string; text: string; border: string; light: string; btn: string; ring: string }> = {
  emerald: { bg:'bg-emerald-500', text:'text-emerald-600', border:'border-emerald-300', light:'bg-emerald-50', btn:'bg-emerald-500 hover:bg-emerald-600', ring:'ring-emerald-300' },
  yellow:  { bg:'bg-yellow-500',  text:'text-yellow-600',  border:'border-yellow-300',  light:'bg-yellow-50',  btn:'bg-yellow-500 hover:bg-yellow-600',  ring:'ring-yellow-300'  },
  blue:    { bg:'bg-blue-500',    text:'text-blue-600',    border:'border-blue-300',    light:'bg-blue-50',    btn:'bg-blue-500 hover:bg-blue-600',    ring:'ring-blue-300'    },
  purple:  { bg:'bg-purple-500',  text:'text-purple-600',  border:'border-purple-300',  light:'bg-purple-50',  btn:'bg-purple-500 hover:bg-purple-600',  ring:'ring-purple-300'  },
  teal:    { bg:'bg-teal-500',    text:'text-teal-600',    border:'border-teal-300',    light:'bg-teal-50',    btn:'bg-teal-500 hover:bg-teal-600',    ring:'ring-teal-300'    },
};

const BUSINESS_TYPES = [
  'Clínica de Estética','Consultório Médico','Salão de Beleza','Academia','Restaurante',
  'Loja de Roupas','Imobiliária','Agência de Marketing','Escritório de Advocacia',
  'Consultoria','E-commerce','Barbearia','Pet Shop','Escola / Curso','Outro (escrever)',
];

// ─── Componente principal ─────────────────────────────────────────────────────
export default function OnboardingWizard({ userId, tenantId, userPlan, companyName, onComplete, onNavigate }: OnboardingWizardProps) {
  const steps = getSteps(userPlan);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  // ── Perfil: sub-etapas ──
  const [profileSubStep, setProfileSubStep] = useState<1|2|3>(1);
  const [profile, setProfile] = useState({
    company_name: companyName || '',
    business_type: '',
    business_type_custom: '',
    business_description: '',
    target_audience: '',
    differentials: '',
    main_pain_points: '',
    google_place_id: '',
    brand_tone: 'profissional',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // ── NPS ──
  const [npsMode, setNpsMode] = useState<CreationMode>(null);
  const [npsName, setNpsName] = useState('Pesquisa de Satisfação Pós-Venda');
  const [npsDesc, setNpsDesc] = useState('Pesquisa enviada após o atendimento para medir a satisfação do cliente.');
  const [npsAiPrompt, setNpsAiPrompt] = useState('');
  const [npsTemplates, setNpsTemplates] = useState<any[]>([]);
  const [npsTemplatesLoading, setNpsTemplatesLoading] = useState(false);
  const [npsCreated, setNpsCreated] = useState(false);

  // ── Produtos ──
  const [productsMode, setProductsMode] = useState<CreationMode>(null);
  const [catalogSegments, setCatalogSegments] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<Array<{name:string;value:string;selected:boolean}>>([]);
  const [selectedSegment, setSelectedSegment] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [manualProducts, setManualProducts] = useState([{name:'',value:'',description:''}]);
  const [aiProductPrompt, setAiProductPrompt] = useState('');
  const [aiProductsResult, setAiProductsResult] = useState<Array<{name:string;value:string;description:string;selected:boolean}>>([]);
  const [productsSaved, setProductsSaved] = useState(false);

  // ── Formulário ──
  const [formMode, setFormMode] = useState<CreationMode>(null);
  const [formName, setFormName] = useState('Formulário de Interesse');
  const [formDesc, setFormDesc] = useState('Formulário para captar informações de clientes interessados.');
  const [formAiPrompt, setFormAiPrompt] = useState('');
  const [formTemplates, setFormTemplates] = useState<any[]>([]);
  const [formTemplatesLoading, setFormTemplatesLoading] = useState(false);
  const [formCreated, setFormCreated] = useState(false);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? (completedSteps.size / totalSteps) * 100 : 0;
  const colors = C[currentStep?.color || 'emerald'];
  const StepIcon = currentStep?.icon || Building2;

  // ── Init ──
  useEffect(() => { loadProgress(); }, [tenantId]);

  const loadProgress = async () => {
    try {
      const { data: prog } = await supabase.from('onboarding_progress').select('*').eq('tenant_id', tenantId).maybeSingle();
      if (prog) {
        const done = new Set<string>();
        if (prog.step_profile_done) done.add('profile');
        if (prog.step_nps_done) done.add('nps');
        if (prog.step_products_done) done.add('products');
        if (prog.step_form_done) done.add('form');
        if (prog.step_mbd_done) done.add('mpd');
        setCompletedSteps(done);
        if (prog.is_complete) { onComplete(); return; }
        const first = steps.findIndex(s => !done.has(s.id));
        if (first >= 0) setCurrentStepIndex(first);
      } else {
        await supabase.from('onboarding_progress').insert({ tenant_id: tenantId, user_id: userId, current_step: 1 });
      }
      const { data: bp } = await supabase.from('business_profile').select('*').eq('tenant_id', tenantId).maybeSingle();
      if (bp) setProfile(prev => ({
        ...prev,
        company_name: bp.company_name || companyName || '',
        business_type: bp.business_type || '',
        business_description: bp.business_description || '',
        target_audience: bp.target_audience || '',
        differentials: bp.differentials || '',
        main_pain_points: bp.main_pain_points || '',
        google_place_id: bp.google_place_id || '',
        brand_tone: bp.brand_tone || 'profissional',
      }));
    } catch (e) { console.error(e); }
  };

  const markStepDone = async (stepId: string) => {
    const fieldMap: Record<string,string> = { profile:'step_profile_done', nps:'step_nps_done', products:'step_products_done', form:'step_form_done', mpd:'step_mbd_done' };
    const newDone = new Set(completedSteps); newDone.add(stepId); setCompletedSteps(newDone);
    const isAll = steps.every(s => newDone.has(s.id));
    await supabase.from('onboarding_progress').update({ [fieldMap[stepId]]: true, current_step: currentStepIndex + 2, is_complete: isAll, completed_at: isAll ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId);
    if (isAll) { setTimeout(() => setShowCompletion(true), 600); return; }
    const next = steps.findIndex((s, i) => i > currentStepIndex && !newDone.has(s.id));
    setTimeout(() => setCurrentStepIndex(next >= 0 ? next : steps.findIndex(s => !newDone.has(s.id))), 800);
  };

  // ── NPS ──
  const loadNpsTemplates = async () => {
    setNpsTemplatesLoading(true);
    try {
      const res = await fetch('/api/templates?tipoVenda=pos_venda');
      const data = await res.json();
      setNpsTemplates(data.templates || []);
    } catch { setNpsTemplates([]); } finally { setNpsTemplatesLoading(false); }
  };
  const createNpsFromTemplate = async (tpl: any) => {
    setIsSaving(true);
    try {
      await fetch('/api/templates', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ templateId: tpl.id, tenantId, campaignName: tpl.name + ' (cópia)' }) });
      setNpsCreated(true);
      await markStepDone('nps');
    } catch { } finally { setIsSaving(false); }
  };
  const createNpsManual = async () => {
    if (!npsName.trim()) return;
    setIsSaving(true);
    try {
      await supabase.from('campaigns').insert({ name: npsName, description: npsDesc, status:'active', questions:[], initial_fields:[{id:'name',label:'Nome',type:'text',required:true},{id:'phone',label:'WhatsApp',type:'tel',required:false}], google_redirect: !!profile.google_place_id, google_place_id: profile.google_place_id||'', enable_redirection: !!profile.google_place_id, user_id: userId, tenant_id: tenantId });
      setNpsCreated(true);
      await markStepDone('nps');
    } catch { } finally { setIsSaving(false); }
  };
  const createNpsWithAI = async () => {
    if (!npsAiPrompt.trim()) return;
    setIsSaving(true);
    try {
      const name = `NPS — ${profile.company_name || companyName}`;
      await supabase.from('campaigns').insert({ name, description: npsAiPrompt, status:'active', questions:[], initial_fields:[{id:'name',label:'Nome',type:'text',required:true},{id:'phone',label:'WhatsApp',type:'tel',required:false}], google_redirect: !!profile.google_place_id, google_place_id: profile.google_place_id||'', enable_redirection: !!profile.google_place_id, user_id: userId, tenant_id: tenantId });
      setNpsCreated(true);
      await markStepDone('nps');
    } catch { } finally { setIsSaving(false); }
  };

  // ── Produtos ──
  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch('/api/product-catalog');
      const data = await res.json();
      const segs = Array.isArray(data) ? data : [];
      setCatalogSegments(segs);
      if (segs.length > 0) {
        const bt = profile.business_type.toLowerCase();
        const match = segs.find((s:any) => bt.includes(s.segment?.toLowerCase()?.split(' ')[0]));
        const seg = match || segs[0];
        setSelectedSegment(seg.segment);
        const segRes = await fetch(`/api/product-catalog?segment=${seg.segment}`);
        const segData = await segRes.json();
        if (segData?.products) {
          setCatalogItems(segData.products.map((p:any) => ({ name:p.name, value:String(Math.round((p.value_min+p.value_max)/2)), selected:false })));
        }
      }
    } catch { } finally { setCatalogLoading(false); }
  };
  const loadSegment = async (seg: string) => {
    setSelectedSegment(seg); setCatalogLoading(true);
    try {
      const res = await fetch(`/api/product-catalog?segment=${seg}`);
      const data = await res.json();
      if (data?.products) setCatalogItems(data.products.map((p:any) => ({ name:p.name, value:String(Math.round((p.value_min+p.value_max)/2)), selected:false })));
    } catch { } finally { setCatalogLoading(false); }
  };
  const saveTemplateProducts = async () => {
    const selected = catalogItems.filter(i => i.selected);
    if (!selected.length) return;
    setIsSaving(true);
    try {
      await supabase.from('products_services').insert(selected.map(p => ({ name:p.name, value:parseFloat(p.value)||0, ai_description:'', user_id:userId, tenant_id:tenantId, active:true })));
      setProductsSaved(true);
      await markStepDone('products');
    } catch { } finally { setIsSaving(false); }
  };
  const saveManualProducts = async () => {
    const valid = manualProducts.filter(p => p.name.trim());
    if (!valid.length) return;
    setIsSaving(true);
    try {
      await supabase.from('products_services').insert(valid.map(p => ({ name:p.name.trim(), value:parseFloat(p.value)||0, ai_description:p.description.trim(), user_id:userId, tenant_id:tenantId, active:true })));
      setProductsSaved(true);
      await markStepDone('products');
    } catch { } finally { setIsSaving(false); }
  };
  const generateAiProducts = async () => {
    if (!aiProductPrompt.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/gemini', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt: `Você é um especialista em negócios. Com base na descrição abaixo, sugira de 5 a 8 produtos/serviços típicos para esse tipo de negócio. Retorne APENAS um JSON array: [{"name":"...","value":0,"description":"..."}]\n\nNegócio: ${aiProductPrompt}` }) });
      const data = await res.json();
      const text = data.text || data.response || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setAiProductsResult(parsed.map((p:any) => ({ ...p, value: String(p.value||0), selected:true })));
      }
    } catch { } finally { setIsSaving(false); }
  };
  const saveAiProducts = async () => {
    const selected = aiProductsResult.filter(p => p.selected);
    if (!selected.length) return;
    setIsSaving(true);
    try {
      await supabase.from('products_services').insert(selected.map(p => ({ name:p.name, value:parseFloat(p.value)||0, ai_description:p.description, user_id:userId, tenant_id:tenantId, active:true })));
      setProductsSaved(true);
      await markStepDone('products');
    } catch { } finally { setIsSaving(false); }
  };

  // ── Formulário ──
  const loadFormTemplates = async () => {
    setFormTemplatesLoading(true);
    try {
      const res = await fetch('/api/templates?tipoVenda=pre_venda');
      const data = await res.json();
      setFormTemplates(data.templates || []);
    } catch { setFormTemplates([]); } finally { setFormTemplatesLoading(false); }
  };
  const createFormFromTemplate = async (tpl: any) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      const template = (data.templates || []).find((t:any) => t.id === tpl.id);
      if (!template) return;
      await supabase.from('forms').insert({ name: tpl.name + ' (cópia)', description: template.description||'', questions: (template.questions||[]).map((q:any) => ({ ...q, id: Date.now().toString()+Math.random() })), initial_fields:[{id:'name',label:'Nome completo',type:'text',required:true},{id:'phone',label:'WhatsApp',type:'tel',required:true},{id:'email',label:'E-mail',type:'email',required:false}], active:true, user_id:userId, tenant_id:tenantId });
      setFormCreated(true);
      await markStepDone('form');
    } catch { } finally { setIsSaving(false); }
  };
  const createFormManual = async () => {
    if (!formName.trim()) return;
    setIsSaving(true);
    try {
      await supabase.from('forms').insert({ name:formName, description:formDesc, questions:[], initial_fields:[{id:'name',label:'Nome completo',type:'text',required:true},{id:'phone',label:'WhatsApp',type:'tel',required:true},{id:'email',label:'E-mail',type:'email',required:false}], active:true, user_id:userId, tenant_id:tenantId });
      setFormCreated(true);
      await markStepDone('form');
    } catch { } finally { setIsSaving(false); }
  };
  const createFormWithAI = async () => {
    if (!formAiPrompt.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/gemini', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt: `Crie perguntas de qualificação para um formulário de pré-venda. Negócio: ${formAiPrompt}. Retorne APENAS JSON: [{"text":"...","type":"single","options":[{"id":"o1","label":"...","value":100,"script":""}]}]` }) });
      const data = await res.json();
      const text = data.text || data.response || '';
      const match = text.match(/\[[\s\S]*\]/);
      const questions = match ? JSON.parse(match[0]).map((q:any) => ({ ...q, id: Date.now().toString()+Math.random() })) : [];
      const name = `Formulário — ${profile.company_name || companyName}`;
      await supabase.from('forms').insert({ name, description:formAiPrompt, questions, initial_fields:[{id:'name',label:'Nome completo',type:'text',required:true},{id:'phone',label:'WhatsApp',type:'tel',required:true},{id:'email',label:'E-mail',type:'email',required:false}], active:true, user_id:userId, tenant_id:tenantId });
      setFormCreated(true);
      await markStepDone('form');
    } catch { } finally { setIsSaving(false); }
  };

  // ── Salvar perfil ──
  const saveProfile = async () => {
    if (!profile.company_name.trim()) return;
    setProfileSaving(true);
    try {
      const bt = profile.business_type === 'Outro (escrever)' ? profile.business_type_custom : profile.business_type;
      const data = { ...profile, business_type: bt, user_id:userId, tenant_id:tenantId, updated_at:new Date().toISOString() };
      const { data: ex } = await supabase.from('business_profile').select('id').eq('tenant_id', tenantId).maybeSingle();
      if (ex) await supabase.from('business_profile').update(data).eq('tenant_id', tenantId);
      else await supabase.from('business_profile').insert(data);
      await markStepDone('profile');
    } catch { } finally { setProfileSaving(false); }
  };

  // ─── Renderização do conteúdo de cada etapa ──────────────────────────────────
  const renderStepContent = () => {

    // ── PERFIL ──────────────────────────────────────────────────────────────
    if (currentStep?.id === 'profile') {
      const subStepTitles = ['Identidade', 'Contexto', 'Google'];
      return (
        <div className="space-y-5">
          {/* Sub-step tabs */}
          <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
            {subStepTitles.map((t, i) => (
              <button key={i} onClick={() => setProfileSubStep((i+1) as 1|2|3)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${profileSubStep === i+1 ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <span className={`w-4 h-4 rounded-full text-xs flex items-center justify-center flex-shrink-0 ${profileSubStep === i+1 ? 'bg-emerald-500 text-white' : completedSteps.has('profile') || profileSubStep > i+1 ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                  {profileSubStep > i+1 ? <Check size={9}/> : i+1}
                </span>
                {t}
              </button>
            ))}
          </div>

          {/* Sub-step 1: Identidade */}
          {profileSubStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome da Empresa *</label>
                  <input type="text" value={profile.company_name} onChange={e => setProfile(p=>({...p,company_name:e.target.value}))} placeholder="Ex: Clínica Bella Forma" className="w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-emerald-300" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Negócio</label>
                  <select value={profile.business_type} onChange={e => setProfile(p=>({...p,business_type:e.target.value}))} className="w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-emerald-300 bg-white">
                    <option value="">Selecione o tipo do negócio...</option>
                    {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {profile.business_type === 'Outro (escrever)' && (
                    <input type="text" value={profile.business_type_custom} onChange={e => setProfile(p=>({...p,business_type_custom:e.target.value}))} placeholder="Descreva o tipo do seu negócio..." className="mt-2 w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-emerald-300" />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Tom de Comunicação</label>
                <div className="grid grid-cols-5 gap-2">
                  {[{v:'profissional',l:'Profissional',e:'💼'},{v:'amigavel',l:'Amigável',e:'😊'},{v:'informal',l:'Informal',e:'🎉'},{v:'direto',l:'Direto',e:'🎯'},{v:'inspirador',l:'Inspirador',e:'✨'}].map(t => (
                    <button key={t.v} onClick={() => setProfile(p=>({...p,brand_tone:t.v}))} className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition-all text-center ${profile.brand_tone===t.v ? 'bg-emerald-50 text-emerald-700 border-emerald-300 border-2' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                      <div className="text-lg mb-0.5">{t.e}</div>{t.l}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setProfileSubStep(2)} disabled={!profile.company_name.trim()} className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                Próximo: Contexto <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Sub-step 2: Contexto */}
          {profileSubStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descrição do Negócio</label>
                <textarea value={profile.business_description} onChange={e => setProfile(p=>({...p,business_description:e.target.value}))} placeholder="O que sua empresa faz? Quais problemas resolve? Seja detalhado — a IA usa isso para personalizar textos e sugestões para você." rows={4} className="w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-emerald-300 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Público-alvo</label>
                  <input type="text" value={profile.target_audience} onChange={e => setProfile(p=>({...p,target_audience:e.target.value}))} placeholder="Ex: Mulheres 25-45 anos" className="w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-emerald-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Diferenciais</label>
                  <input type="text" value={profile.differentials} onChange={e => setProfile(p=>({...p,differentials:e.target.value}))} placeholder="Ex: 10 anos de experiência" className="w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-emerald-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Principais dores dos seus clientes</label>
                <input type="text" value={profile.main_pain_points} onChange={e => setProfile(p=>({...p,main_pain_points:e.target.value}))} placeholder="Ex: Falta de tempo, preço alto, mau atendimento no concorrente" className="w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-emerald-300" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setProfileSubStep(1)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
                  <ChevronLeft size={16} /> Anterior
                </button>
                <button onClick={() => setProfileSubStep(3)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  Próximo: Google <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Sub-step 3: Google */}
          {profileSubStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <MapPin size={13} className="text-emerald-500" />
                  Place ID do Google
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">Muito importante!</span>
                </label>
                <input type="text" value={profile.google_place_id} onChange={e => setProfile(p=>({...p,google_place_id:e.target.value}))} placeholder="Ex: ChIJN1t_tDeuEmsRUsoyG83frY4" className="w-full border-2 border-emerald-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-emerald-300" />
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5"><Globe size={13}/> Como encontrar o Place ID?</p>
                <ol className="text-xs text-emerald-700 space-y-1.5 list-decimal ml-4">
                  <li>Clique no link abaixo para abrir o Google Place ID Finder</li>
                  <li>Busque o nome do seu negócio no campo de pesquisa</li>
                  <li>Clique no resultado correto e copie o ID exibido</li>
                  <li>Cole o ID no campo acima</li>
                </ol>
                <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 bg-white border border-emerald-300 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors w-fit">
                  <ExternalLink size={12}/> Abrir Google Place ID Finder
                </a>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Com o Place ID configurado, clientes com nota <strong>9-10</strong> no NPS são redirecionados automaticamente para avaliar sua empresa no Google!
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setProfileSubStep(2)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
                  <ChevronLeft size={16} /> Anterior
                </button>
                <button onClick={saveProfile} disabled={!profile.company_name.trim() || profileSaving} className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
                  {profileSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Salvar e Continuar
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── NPS ─────────────────────────────────────────────────────────────────
    if (currentStep?.id === 'nps') {
      if (npsCreated) return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
          <CheckCircle2 size={32} className="text-green-500 flex-shrink-0"/>
          <div><p className="font-bold text-green-800">Pesquisa de NPS criada!</p><p className="text-sm text-green-600 mt-0.5">Avançando para a próxima etapa...</p></div>
        </div>
      );

      if (!npsMode) return (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">Como você quer criar sua primeira pesquisa de NPS?</p>
          <button onClick={() => { setNpsMode('template'); loadNpsTemplates(); }}
            className="w-full bg-white border-2 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 rounded-xl p-5 flex items-center gap-4 transition-all group text-left">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-200"><LayoutTemplate size={22} className="text-yellow-600"/></div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Usar Template</p>
              <p className="text-sm text-gray-500 mt-0.5">Modelos prontos para o seu segmento — mais rápido e recomendado!</p>
            </div>
            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">Recomendado</span>
          </button>
          <button onClick={() => setNpsMode('ai')}
            className="w-full bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl p-5 flex items-center gap-4 transition-all group text-left">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200"><Wand2 size={22} className="text-purple-600"/></div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Criar com IA</p>
              <p className="text-sm text-gray-500 mt-0.5">Descreva seu negócio e a IA monta a pesquisa personalizada</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 flex-shrink-0"/>
          </button>
          <button onClick={() => setNpsMode('manual')}
            className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl p-5 flex items-center gap-4 transition-all group text-left">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200"><PenLine size={22} className="text-gray-600"/></div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Criar Manualmente</p>
              <p className="text-sm text-gray-500 mt-0.5">Defina o nome e configure as perguntas depois</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 flex-shrink-0"/>
          </button>
        </div>
      );

      if (npsMode === 'template') return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setNpsMode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={16}/></button>
            <div><p className="font-bold text-gray-900">Escolha um template de NPS</p><p className="text-xs text-gray-400">Selecione o modelo mais adequado para o seu negócio</p></div>
          </div>
          {npsTemplatesLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={28} className="animate-spin text-yellow-500"/>
              <p className="text-sm text-gray-400">Carregando templates...</p>
            </div>
          ) : npsTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Nenhum template disponível no momento.</p>
              <button onClick={() => setNpsMode(null)} className="mt-3 text-yellow-600 text-sm font-medium hover:underline">Escolher outra opção</button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {npsTemplates.map(tpl => (
                <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-yellow-300 hover:bg-yellow-50 transition-all group">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-gray-900">{tpl.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{tpl.segment || 'Geral'} · {tpl.questions?.length || 0} perguntas</p>
                    {tpl.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{tpl.description}</p>}
                  </div>
                  <button onClick={() => createNpsFromTemplate(tpl)} disabled={isSaving}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0 transition-colors">
                    {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Usar este
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      if (npsMode === 'ai') return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setNpsMode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={16}/></button>
            <div><p className="font-bold text-gray-900">Criar NPS com IA</p><p className="text-xs text-gray-400">A IA vai criar uma pesquisa personalizada para o seu negócio</p></div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descreva seu negócio e o objetivo da pesquisa</label>
            <textarea value={npsAiPrompt} onChange={e => setNpsAiPrompt(e.target.value)}
              placeholder={`Ex: ${profile.business_description || 'Clínica de estética que atende mulheres. Quero medir a satisfação após procedimentos e redirecionar clientes satisfeitos para o Google.'}`}
              rows={5} className="w-full border border-purple-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-purple-300 resize-none"/>
          </div>
          {profile.google_place_id && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-xs text-green-700">
              <CheckCircle2 size={14}/> Redirecionamento automático para o Google será ativado!
            </div>
          )}
          <button onClick={createNpsWithAI} disabled={!npsAiPrompt.trim() || isSaving}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16}/>} Criar com IA
          </button>
        </div>
      );

      if (npsMode === 'manual') return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setNpsMode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={16}/></button>
            <div><p className="font-bold text-gray-900">Criar NPS manualmente</p><p className="text-xs text-gray-400">Defina o nome e adicione perguntas depois na tela de Pesquisas</p></div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome da Pesquisa *</label>
            <input type="text" value={npsName} onChange={e => setNpsName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-yellow-300"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descrição</label>
            <textarea value={npsDesc} onChange={e => setNpsDesc(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-yellow-300 resize-none"/>
          </div>
          {profile.google_place_id && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-xs text-green-700">
              <CheckCircle2 size={14}/> Redirecionamento automático para o Google será ativado!
            </div>
          )}
          <button onClick={createNpsManual} disabled={!npsName.trim() || isSaving}
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Star size={16}/>} Criar Pesquisa
          </button>
        </div>
      );
    }

    // ── PRODUTOS ─────────────────────────────────────────────────────────────
    if (currentStep?.id === 'products') {
      if (productsSaved) return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
          <CheckCircle2 size={32} className="text-green-500 flex-shrink-0"/>
          <div><p className="font-bold text-green-800">Produtos salvos com sucesso!</p><p className="text-sm text-green-600 mt-0.5">Avançando para a próxima etapa...</p></div>
        </div>
      );

      if (!productsMode) return (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">Como você quer cadastrar seus produtos ou serviços?</p>
          <button onClick={() => { setProductsMode('template'); loadCatalog(); }}
            className="w-full bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-5 flex items-center gap-4 transition-all group text-left">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200"><LayoutTemplate size={22} className="text-blue-600"/></div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Catálogo por Segmento</p>
              <p className="text-sm text-gray-500 mt-0.5">Selecione produtos típicos do seu mercado — mais rápido!</p>
            </div>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">Recomendado</span>
          </button>
          <button onClick={() => setProductsMode('ai')}
            className="w-full bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl p-5 flex items-center gap-4 transition-all group text-left">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200"><Wand2 size={22} className="text-purple-600"/></div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Gerar com IA</p>
              <p className="text-sm text-gray-500 mt-0.5">Descreva seu negócio e a IA sugere os produtos ideais</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 flex-shrink-0"/>
          </button>
          <button onClick={() => setProductsMode('manual')}
            className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl p-5 flex items-center gap-4 transition-all group text-left">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200"><PenLine size={22} className="text-gray-600"/></div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Adicionar Manualmente</p>
              <p className="text-sm text-gray-500 mt-0.5">Cadastre seus produtos um por um com nome e preço</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 flex-shrink-0"/>
          </button>
        </div>
      );

      if (productsMode === 'template') return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setProductsMode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={16}/></button>
            <div><p className="font-bold text-gray-900">Catálogo por segmento</p><p className="text-xs text-gray-400">Selecione os produtos que deseja cadastrar</p></div>
          </div>
          {catalogLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={28} className="animate-spin text-blue-500"/>
              <p className="text-sm text-gray-400">Carregando catálogo...</p>
            </div>
          ) : (
            <>
              {catalogSegments.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {catalogSegments.map((s:any) => (
                    <button key={s.segment} onClick={() => loadSegment(s.segment)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedSegment===s.segment ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                      {s.segment}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {catalogItems.map((item, idx) => (
                  <label key={idx} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${item.selected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                    <input type="checkbox" checked={item.selected} onChange={() => setCatalogItems(prev => prev.map((i,k) => k===idx ? {...i,selected:!i.selected} : i))} className="w-4 h-4 accent-blue-500 flex-shrink-0"/>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{item.name}</p></div>
                    <span className="text-xs font-medium text-gray-500 flex-shrink-0">R$ {parseFloat(item.value||'0').toLocaleString('pt-BR')}</span>
                  </label>
                ))}
              </div>
              <button onClick={saveTemplateProducts} disabled={!catalogItems.some(i=>i.selected) || isSaving}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                Salvar {catalogItems.filter(i=>i.selected).length > 0 ? `${catalogItems.filter(i=>i.selected).length} produto(s)` : 'Produtos Selecionados'}
              </button>
            </>
          )}
        </div>
      );

      if (productsMode === 'ai') return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setProductsMode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={16}/></button>
            <div><p className="font-bold text-gray-900">Gerar produtos com IA</p><p className="text-xs text-gray-400">A IA vai sugerir produtos com base no seu negócio</p></div>
          </div>
          {aiProductsResult.length === 0 ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descreva seu negócio</label>
                <textarea value={aiProductPrompt} onChange={e => setAiProductPrompt(e.target.value)}
                  placeholder={profile.business_description || 'Ex: Clínica de estética que oferece procedimentos faciais e corporais para mulheres'}
                  rows={5} className="w-full border border-purple-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-purple-300 resize-none"/>
              </div>
              <button onClick={generateAiProducts} disabled={!aiProductPrompt.trim() || isSaving}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16}/>} Gerar Sugestões
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">Selecione os produtos que deseja cadastrar:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {aiProductsResult.map((p, idx) => (
                  <label key={idx} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${p.selected ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200 hover:border-purple-200'}`}>
                    <input type="checkbox" checked={p.selected} onChange={() => setAiProductsResult(prev => prev.map((i,k) => k===idx ? {...i,selected:!i.selected} : i))} className="w-4 h-4 accent-purple-500 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</p>
                    </div>
                    <span className="text-xs font-medium text-gray-500 flex-shrink-0">R$ {parseFloat(p.value||'0').toLocaleString('pt-BR')}</span>
                  </label>
                ))}
              </div>
              <button onClick={saveAiProducts} disabled={!aiProductsResult.some(p=>p.selected) || isSaving}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                Salvar {aiProductsResult.filter(p=>p.selected).length} produto(s)
              </button>
            </>
          )}
        </div>
      );

      if (productsMode === 'manual') return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setProductsMode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={16}/></button>
            <div><p className="font-bold text-gray-900">Adicionar manualmente</p><p className="text-xs text-gray-400">Cadastre seus produtos um por um</p></div>
          </div>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {manualProducts.map((prod, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Produto {idx+1}</span>
                  {manualProducts.length > 1 && <button onClick={() => setManualProducts(prev => prev.filter((_,i)=>i!==idx))} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>}
                </div>
                <input type="text" value={prod.name} onChange={e => setManualProducts(prev => prev.map((p,i) => i===idx ? {...p,name:e.target.value} : p))} placeholder="Nome do produto/serviço *" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ring-blue-300 bg-white"/>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={prod.value} onChange={e => setManualProducts(prev => prev.map((p,i) => i===idx ? {...p,value:e.target.value} : p))} placeholder="Preço (R$)" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ring-blue-300 bg-white"/>
                  <input type="text" value={prod.description} onChange={e => setManualProducts(prev => prev.map((p,i) => i===idx ? {...p,description:e.target.value} : p))} placeholder="Descrição breve" className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ring-blue-300 bg-white"/>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setManualProducts(prev => [...prev, {name:'',value:'',description:''}])}
            className="w-full border-2 border-dashed border-blue-200 text-blue-500 hover:border-blue-400 hover:bg-blue-50 rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <Plus size={16}/> Adicionar mais um produto
          </button>
          <button onClick={saveManualProducts} disabled={!manualProducts.some(p=>p.name.trim()) || isSaving}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Package size={16}/>} Salvar Produtos
          </button>
        </div>
      );
    }

    // ── FORMULÁRIO ───────────────────────────────────────────────────────────
    if (currentStep?.id === 'form') {
      if (formCreated) return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-4">
          <CheckCircle2 size={32} className="text-green-500 flex-shrink-0"/>
          <div><p className="font-bold text-green-800">Formulário criado com sucesso!</p><p className="text-sm text-green-600 mt-0.5">Avançando para a próxima etapa...</p></div>
        </div>
      );

      if (!formMode) return (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">Como você quer criar seu formulário de captação de leads?</p>
          <button onClick={() => { setFormMode('template'); loadFormTemplates(); }}
            className="w-full bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl p-5 flex items-center gap-4 transition-all group text-left">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200"><LayoutTemplate size={22} className="text-purple-600"/></div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Usar Template</p>
              <p className="text-sm text-gray-500 mt-0.5">Modelos prontos com perguntas de qualificação — recomendado!</p>
            </div>
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">Recomendado</span>
          </button>
          <button onClick={() => setFormMode('ai')}
            className="w-full bg-white border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl p-5 flex items-center gap-4 transition-all group text-left">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200"><Wand2 size={22} className="text-indigo-600"/></div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Criar com IA</p>
              <p className="text-sm text-gray-500 mt-0.5">A IA cria perguntas ideais para qualificar seus leads</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 flex-shrink-0"/>
          </button>
          <button onClick={() => setFormMode('manual')}
            className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl p-5 flex items-center gap-4 transition-all group text-left">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200"><PenLine size={22} className="text-gray-600"/></div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Criar Manualmente</p>
              <p className="text-sm text-gray-500 mt-0.5">Defina o nome e adicione perguntas depois na tela de Formulários</p>
            </div>
            <ChevronRight size={18} className="text-gray-300 flex-shrink-0"/>
          </button>
        </div>
      );

      if (formMode === 'template') return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setFormMode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={16}/></button>
            <div><p className="font-bold text-gray-900">Templates de formulário</p><p className="text-xs text-gray-400">Escolha o modelo mais adequado para captar seus leads</p></div>
          </div>
          {formTemplatesLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={28} className="animate-spin text-purple-500"/>
              <p className="text-sm text-gray-400">Carregando templates...</p>
            </div>
          ) : formTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Nenhum template disponível.</p>
              <button onClick={() => setFormMode(null)} className="mt-3 text-purple-600 text-sm font-medium hover:underline">Escolher outra opção</button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {formTemplates.map(tpl => (
                <div key={tpl.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-purple-300 hover:bg-purple-50 transition-all group">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-gray-900">{tpl.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{tpl.segment || 'Geral'} · {tpl.questions?.length || 0} perguntas</p>
                    {tpl.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{tpl.description}</p>}
                  </div>
                  <button onClick={() => createFormFromTemplate(tpl)} disabled={isSaving}
                    className="bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0 transition-colors">
                    {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Usar este
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      if (formMode === 'ai') return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setFormMode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={16}/></button>
            <div><p className="font-bold text-gray-900">Criar formulário com IA</p><p className="text-xs text-gray-400">A IA vai criar perguntas de qualificação personalizadas</p></div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descreva seu negócio e o que quer qualificar nos leads</label>
            <textarea value={formAiPrompt} onChange={e => setFormAiPrompt(e.target.value)}
              placeholder={profile.business_description || 'Ex: Clínica de estética. Quero saber o procedimento de interesse, orçamento disponível e urgência do cliente.'}
              rows={5} className="w-full border border-indigo-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-300 resize-none"/>
          </div>
          <button onClick={createFormWithAI} disabled={!formAiPrompt.trim() || isSaving}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16}/>} Criar com IA
          </button>
        </div>
      );

      if (formMode === 'manual') return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setFormMode(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={16}/></button>
            <div><p className="font-bold text-gray-900">Criar formulário manualmente</p><p className="text-xs text-gray-400">Defina o nome e adicione perguntas depois</p></div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nome do Formulário *</label>
            <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-purple-300"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descrição</label>
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-purple-300 resize-none"/>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
            <Info size={14} className="text-purple-600 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-purple-700">O formulário será criado com campos básicos (nome, WhatsApp, e-mail). Adicione perguntas personalizadas depois na tela de <strong>Formulários</strong>.</p>
          </div>
          <button onClick={createFormManual} disabled={!formName.trim() || isSaving}
            className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2">
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <FileText size={16}/>} Criar Formulário
          </button>
        </div>
      );
    }

    // ── MPD ──────────────────────────────────────────────────────────────────
    if (currentStep?.id === 'mpd') {
      return (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-teal-800 flex items-center gap-2"><Activity size={16}/> O que é o MPD?</h4>
            <p className="text-sm text-teal-700">O <strong>Minha Presença Digital</strong> monitora sua presença online: avaliações no Google, menções em redes sociais, score de presença digital e muito mais.</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {['Diagnóstico completo da presença online','Monitoramento de avaliações no Google','Score de presença digital','Relatórios periódicos de evolução'].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-teal-700"><CheckCircle2 size={12} className="text-teal-500 flex-shrink-0"/>{item}</div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-amber-700">O MPD é um <strong>módulo adicional</strong>. Se você já contratou, clique em <strong>"Acessar MPD"</strong> para fazer o diagnóstico inicial. Se não contratou ainda, pode pular.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { onNavigate('digital-diagnostic'); }}
              className="bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
              <ArrowRight size={16}/> Acessar MPD
            </button>
            <button onClick={async () => { await markStepDone('mpd'); }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
              <SkipForward size={16}/> Pular por enquanto
            </button>
          </div>
          <button onClick={async () => { await markStepDone('mpd'); }}
            className="w-full border border-teal-300 text-teal-600 hover:bg-teal-50 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
            <Check size={15}/> Já configurei o MPD — Continuar
          </button>
        </div>
      );
    }

    return null;
  };

  // ── Modal de conclusão ────────────────────────────────────────────────────
  if (showCompletion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={48} className="text-emerald-500"/>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuração Concluída! 🎉</h2>
          <p className="text-gray-500 mb-6">Parabéns! Você configurou tudo que precisa para começar a usar o HelloGrowth e crescer seu negócio.</p>
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {steps.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0"/>
                  <span className="text-sm font-medium text-gray-700 truncate">{s.title}</span>
                </div>
              );
            })}
          </div>
          <button onClick={onComplete} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-base transition-colors">
            <Zap size={20}/> Ir para o Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Layout principal ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-white"/>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Configuração Inicial — HelloGrowth</h1>
              <p className="text-xs text-gray-400">{companyName} · {completedSteps.size} de {totalSteps} etapas concluídas</p>
            </div>
          </div>
          <div className="flex-1 mx-6 hidden sm:block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">Progresso</span>
              <span className="text-xs font-bold text-emerald-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width:`${progress}%` }}/>
            </div>
          </div>
          <button onClick={() => { if (confirm('Sair da configuração? Você pode retomar depois em Ajuda → Configuração Inicial.')) onComplete(); }}
            className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={18}/>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <div className="w-60 bg-gray-50 border-r border-gray-100 flex-shrink-0 overflow-y-auto py-4 px-3 hidden sm:block">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-3">Etapas</p>
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = completedSteps.has(step.id);
              const isCurrent = idx === currentStepIndex;
              const sc = C[step.color];
              return (
                <button key={step.id} onClick={() => setCurrentStepIndex(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl mb-1 transition-all text-left ${isCurrent ? `bg-white shadow-sm border ${sc.border}` : 'hover:bg-white hover:shadow-sm'}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isDone ? 'bg-emerald-500' : isCurrent ? sc.bg : 'bg-gray-200'}`}>
                    {isDone ? <Check size={14} className="text-white"/> : <Icon size={14} className={isCurrent ? 'text-white' : 'text-gray-400'}/>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isCurrent ? sc.text : isDone ? 'text-emerald-600' : 'text-gray-500'}`}>{step.title}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {isDone ? '✓ Concluído' : isCurrent ? 'Em andamento' : step.skippable ? 'Opcional' : 'Pendente'}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Dica da etapa atual */}
            {currentStep?.tip && (
              <div className="mt-4 mx-1 bg-white border border-gray-200 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1"><Sparkles size={11} className="text-emerald-500"/> Dica</p>
                <p className="text-xs text-gray-500 leading-relaxed">{currentStep.tip}</p>
              </div>
            )}
          </div>

          {/* Conteúdo principal — ocupa toda a largura restante */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            {/* Header da etapa */}
            <div className={`${colors.light} rounded-2xl p-5 mb-6 flex items-center gap-4 border ${colors.border}`}>
              <div className={`w-14 h-14 ${colors.bg} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <StepIcon size={26} className="text-white"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Etapa {currentStepIndex+1} de {totalSteps}</p>
                <h2 className="font-bold text-gray-900 text-xl mt-0.5">{currentStep?.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{currentStep?.subtitle}</p>
              </div>
              {completedSteps.has(currentStep?.id) && (
                <div className="bg-emerald-100 text-emerald-700 text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0">
                  <Check size={14}/> Concluído
                </div>
              )}
            </div>

            {/* Conteúdo da etapa */}
            {renderStepContent()}

            {/* Navegação entre etapas */}
            <div className="flex gap-3 mt-8 pt-5 border-t border-gray-100">
              {currentStepIndex > 0 && (
                <button onClick={() => setCurrentStepIndex(i=>i-1)}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100">
                  <ChevronLeft size={15}/> Etapa anterior
                </button>
              )}
              {currentStepIndex < totalSteps-1 && (
                <button onClick={() => setCurrentStepIndex(i=>i+1)}
                  className="ml-auto flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100">
                  Próxima etapa <ChevronRight size={15}/>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
