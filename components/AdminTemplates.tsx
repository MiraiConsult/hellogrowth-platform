'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, Search, ChevronDown, ChevronRight, X,
  Sparkles, Check, Loader2, Eye, EyeOff, Trash2, Edit,
  Star, ArrowRight, FileText, ShoppingCart, HeartHandshake, RefreshCw
} from 'lucide-react';

interface AdminTemplatesProps {
  isDark: boolean;
  surveysData?: any;
}

const RAMOS_BASE = [
  'Restaurante / Alimentação', 'Saúde / Clínica / Estética', 'Varejo / Loja',
  'Serviços Gerais', 'Educação / Cursos', 'Tecnologia / Software',
  'Imobiliário', 'Financeiro / Contabilidade', 'Automotivo',
  'Hotelaria / Turismo', 'Academia / Fitness', 'Beleza / Salão',
  'Veterinário / Pet', 'Jurídico / Advocacia', 'Construção / Reforma', 'Outro',
];

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  pre_venda: { label: 'Pré-venda', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  pos_venda: { label: 'Pós-venda', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const Q_LABELS: Record<string, string> = {
  nps: 'NPS', text: 'Texto', multiple_choice: 'Múltipla', rating: 'Avaliação', csat: 'CSAT', select: 'Seleção',
};

export default function AdminTemplates({ isDark }: AdminTemplatesProps) {
  const t = isDark
    ? { bg: 'bg-gray-950', surface: 'bg-gray-900', border: 'border-gray-800', text: 'text-white', textSub: 'text-gray-400', textMuted: 'text-gray-500', input: 'bg-gray-800 border-gray-700 text-gray-100', badge: 'bg-gray-800 text-gray-300 border-gray-700', inner: 'bg-gray-800/40' }
    : { bg: 'bg-slate-50', surface: 'bg-white', border: 'border-slate-200', text: 'text-slate-900', textSub: 'text-slate-500', textMuted: 'text-slate-400', input: 'bg-white border-slate-300 text-slate-900', badge: 'bg-slate-100 text-slate-600 border-slate-200', inner: 'bg-slate-50' };

  const [view, setView] = useState<'surveys' | 'templates'>('surveys');

  // Surveys
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loadingSurveys, setLoadingSurveys] = useState(false);
  const [surveySearch, setSurveySearch] = useState('');
  const [surveyCompany, setSurveyCompany] = useState('Todos');
  const [surveyCompanies, setSurveyCompanies] = useState<string[]>(['Todos']);
  const [expandedSurvey, setExpandedSurvey] = useState<string | null>(null);

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [tmplSearch, setTmplSearch] = useState('');
  const [tmplTipo, setTmplTipo] = useState('Todos');
  const [expandedTmpl, setExpandedTmpl] = useState<string | null>(null);

  // Publish modal
  const [pub, setPub] = useState<{ open: boolean; survey: any }>({ open: false, survey: null });
  const [pubForm, setPubForm] = useState({ name: '', description: '', ramoNegocio: '', tipoVenda: 'pos_venda', category: 'Geral', tags: [] as string[] });
  const [tagInput, setTagInput] = useState('');
  const [genDesc, setGenDesc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pubOk, setPubOk] = useState(false);
  const [customRamos, setCustomRamos] = useState<string[]>([]);
  const [showNewRamo, setShowNewRamo] = useState(false);
  const [newRamoInput, setNewRamoInput] = useState('');

  const allRamos = [...RAMOS_BASE, ...customRamos.filter(r => !RAMOS_BASE.includes(r))];

  const addCustomRamo = () => {
    const v = newRamoInput.trim();
    if (!v) return;
    if (!customRamos.includes(v)) setCustomRamos(prev => [...prev, v]);
    setPubForm(f => ({ ...f, ramoNegocio: v }));
    setNewRamoInput('');
    setShowNewRamo(false);
  };

  // Edit modal
  const [editM, setEditM] = useState<{ open: boolean; tmpl: any }>({ open: false, tmpl: null });
  const [editF, setEditF] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const loadSurveys = useCallback(async () => {
    setLoadingSurveys(true);
    try {
      const r = await fetch('/api/admin/surveys');
      const d = await r.json();
      const list = d.campaigns || [];
      setSurveys(list);
      setSurveyCompanies(['Todos', ...Array.from(new Set(list.map((s: any) => s.companyName).filter(Boolean))) as string[]]);
    } finally { setLoadingSurveys(false); }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const r = await fetch('/api/admin/templates?activeOnly=false');
      const d = await r.json();
      setTemplates(d.templates || []);
    } finally { setLoadingTemplates(false); }
  }, []);

  useEffect(() => { loadSurveys(); loadTemplates(); }, [loadSurveys, loadTemplates]);

  // Mapear business_type do perfil para o ramo mais próximo da lista RAMOS
  const inferRamo = (businessType: string | null): string => {
    if (!businessType) return '';
    const bt = businessType.toLowerCase();
    if (bt.includes('veterin') || bt.includes('pet shop') || bt.includes('petshop') || bt.includes('zoovet') || bt.includes('animal')) return 'Veterinário / Pet';
    if (bt.includes('odonto') || bt.includes('dental')) return 'Saúde / Clínica / Estética';
    if (bt.includes('estét') || bt.includes('estetica') || bt.includes('beleza') || bt.includes('salão') || bt.includes('salao') || bt.includes('barbearia')) return 'Beleza / Salão';
    if (bt.includes('restaurante') || bt.includes('alimenta') || bt.includes('food') || bt.includes('lanchonete') || bt.includes('padaria')) return 'Restaurante / Alimentação';
    if (bt.includes('academia') || bt.includes('fitness') || bt.includes('gym')) return 'Academia / Fitness';
    if (bt.includes('clínica') || bt.includes('clinica') || bt.includes('saúde') || bt.includes('saude') || bt.includes('médic') || bt.includes('medic') || bt.includes('hospital')) return 'Saúde / Clínica / Estética';
    if (bt.includes('escola') || bt.includes('educaç') || bt.includes('educac') || bt.includes('curso') || bt.includes('faculdade') || bt.includes('colégio') || bt.includes('colegio')) return 'Educação / Cursos';
    if (bt.includes('imobil') || bt.includes('constru') || bt.includes('incorpor')) return 'Imobiliário';
    if (bt.includes('tecnolog') || bt.includes('software') || bt.includes('ti ') || bt.includes('startup')) return 'Tecnologia / Software';
    if (bt.includes('varejo') || bt.includes('loja') || bt.includes('comércio') || bt.includes('comercio') || bt.includes('retail')) return 'Varejo / Loja';
    if (bt.includes('auto') || bt.includes('oficina') || bt.includes('mecân') || bt.includes('mecan')) return 'Automotivo';
    if (bt.includes('hotel') || bt.includes('pousada') || bt.includes('turism')) return 'Hotelaria / Turismo';
    if (bt.includes('financ') || bt.includes('contab') || bt.includes('contáb') || bt.includes('banco')) return 'Financeiro / Contabilidade';
    if (bt.includes('jurídic') || bt.includes('juridic') || bt.includes('advoc') || bt.includes('direito')) return 'Jurídico / Advocacia';
    return '';
  };

  const openPublish = (survey: any) => {
    const ramoInferido = inferRamo(survey.businessType);
    setPubForm({ name: survey.name || '', description: survey.objective || '', ramoNegocio: ramoInferido, tipoVenda: 'pos_venda', category: 'Geral', tags: [] });
    setTagInput(''); setPubOk(false);
    setPub({ open: true, survey });
  };

  const generateDesc = async () => {
    if (!pub.survey) return;
    setGenDesc(true);
    try {
      const questions = (pub.survey.questions || []).map((q: any) => q.text).join('; ');
      const r = await fetch('/api/admin/ai-insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'template_description', templateName: pubForm.name, tipoVenda: pubForm.tipoVenda, ramoNegocio: pubForm.ramoNegocio, questions }),
      });
      const d = await r.json();
      if (d.description) setPubForm(f => ({ ...f, description: d.description }));
    } finally { setGenDesc(false); }
  };

  const publishTemplate = async () => {
    if (!pub.survey || !pubForm.name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch('/api/admin/templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pubForm.name, description: pubForm.description, category: pubForm.category,
          questions: pub.survey.questions, tags: pubForm.tags,
          sourceCampaignId: pub.survey.id, sourceCompanyName: pub.survey.companyName,
          tipoVenda: pubForm.tipoVenda, ramoNegocio: pubForm.ramoNegocio,
        }),
      });
      const d = await r.json();
      if (d.template) {
        setPubOk(true);
        setTemplates(prev => [d.template, ...prev]);
        setTimeout(() => { setPub({ open: false, survey: null }); setPubOk(false); setView('templates'); }, 1500);
      }
    } finally { setSaving(false); }
  };

  const toggleActive = async (tmpl: any) => {
    await fetch('/api/admin/templates', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: tmpl.id, is_active: !tmpl.is_active }) });
    setTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, is_active: !t.is_active } : t));
  };

  const deleteTmpl = async (id: string) => {
    if (!confirm('Deletar este template permanentemente?')) return;
    await fetch(`/api/admin/templates?id=${id}&hard=true`, { method: 'DELETE' });
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const openEdit = (tmpl: any) => {
    setEditF({ id: tmpl.id, name: tmpl.name || '', description: tmpl.description || '', category: tmpl.category || 'Geral', tipoVenda: tmpl.tipo_venda || 'pos_venda', ramoNegocio: tmpl.ramo_negocio || '' });
    setEditM({ open: true, tmpl });
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const r = await fetch('/api/admin/templates', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editF.id, name: editF.name, description: editF.description, category: editF.category, tipoVenda: editF.tipoVenda, ramoNegocio: editF.ramoNegocio }),
      });
      const d = await r.json();
      if (d.template) { setTemplates(prev => prev.map(t => t.id === d.template.id ? d.template : t)); setEditM({ open: false, tmpl: null }); }
    } finally { setSavingEdit(false); }
  };

  const filtSurveys = surveys.filter(s => {
    const ms = !surveySearch || s.name?.toLowerCase().includes(surveySearch.toLowerCase()) || s.companyName?.toLowerCase().includes(surveySearch.toLowerCase());
    const mc = surveyCompany === 'Todos' || s.companyName === surveyCompany;
    return ms && mc;
  });

  const filtTmpls = templates.filter(t => {
    const ms = !tmplSearch || t.name?.toLowerCase().includes(tmplSearch.toLowerCase());
    const mt = tmplTipo === 'Todos' || t.tipo_venda === tmplTipo;
    return ms && mt;
  });

  return (
    <div className={`min-h-screen ${t.bg} p-6`}>
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-xl font-bold ${t.text}`}>Biblioteca de Templates</h2>
            <p className={`text-sm ${t.textSub} mt-0.5`}>Transforme pesquisas reais dos clientes em templates disponíveis para todos</p>
          </div>
          <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${t.badge}`}>
            {templates.filter(t => t.is_active).length} ativos · {templates.length} total
          </span>
        </div>

        {/* Toggle */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border ${t.border} ${t.surface} w-fit mb-6`}>
          {([['surveys', 'Pesquisas dos Clientes', surveys.length], ['templates', 'Templates Publicados', templates.length]] as const).map(([v, label, count]) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === v ? 'bg-emerald-600 text-white shadow-sm' : `${t.textSub}`}`}>
              {v === 'surveys' ? <FileText size={15} /> : <BookOpen size={15} />}
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${view === v ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>{count}</span>
            </button>
          ))}
        </div>

        {/* SURVEYS VIEW */}
        {view === 'surveys' && (
          <div>
            <div className={`flex items-center gap-3 mb-4 p-4 rounded-xl border ${t.border} ${t.surface}`}>
              <div className="relative flex-1">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                <input type="text" placeholder="Buscar por nome ou empresa..." value={surveySearch} onChange={e => setSurveySearch(e.target.value)}
                  className={`w-full text-sm pl-8 pr-3 py-2 rounded-lg border ${t.input} focus:outline-none focus:ring-2 focus:ring-emerald-500/30`} />
              </div>
              <select value={surveyCompany} onChange={e => setSurveyCompany(e.target.value)} className={`text-sm px-3 py-2 rounded-lg border ${t.input} focus:outline-none`}>
                {surveyCompanies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={loadSurveys} className={`p-2 rounded-lg border ${t.border} ${t.textSub} hover:text-emerald-600`}><RefreshCw size={15} /></button>
            </div>

            {loadingSurveys ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-emerald-500" /></div>
            ) : filtSurveys.length === 0 ? (
              <div className={`text-center py-20 ${t.textMuted}`}><FileText size={40} className="mx-auto mb-3 opacity-30" /><p className="text-sm">Nenhuma pesquisa encontrada.</p></div>
            ) : (
              <div className="space-y-3">
                {filtSurveys.map(s => (
                  <div key={s.id} className={`rounded-xl border ${t.border} ${t.surface} overflow-hidden`}>
                    <div className="flex items-center gap-4 p-4">
                      <button onClick={() => setExpandedSurvey(expandedSurvey === s.id ? null : s.id)} className={`shrink-0 p-1 rounded ${t.textMuted} hover:text-emerald-600`}>
                        {expandedSurvey === s.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${t.text} truncate`}>{s.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${t.badge}`}>{s.companyName}</span>
                          {s.businessType && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-medium">{s.businessType}</span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{s.questionCount} perguntas</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{s.responseCount} respostas</span>
                        </div>
                        {s.objective && <p className={`text-xs ${t.textMuted} mt-1 truncate`}>{s.objective}</p>}
                      </div>
                      <button onClick={() => openPublish(s)}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors">
                        <ArrowRight size={14} /> Publicar como Template
                      </button>
                    </div>
                    {expandedSurvey === s.id && (
                      <div className={`border-t ${t.border} px-4 py-3 space-y-2`}>
                        {(s.questions || []).length === 0 ? (
                          <p className={`text-xs ${t.textMuted} italic`}>Sem perguntas registradas.</p>
                        ) : (s.questions || []).map((q: any, i: number) => (
                          <div key={i} className={`p-3 rounded-lg border ${t.border} ${t.inner}`}>
                            <div className="flex items-start gap-3 mb-2">
                              <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-slate-200 text-slate-600'}`}>
                                {i + 1}
                              </span>
                              <p className={`text-sm font-medium ${t.text}`}>{q.text}</p>
                            </div>
                            {(q.options || []).length > 0 && (
                              <div className="ml-8 space-y-1">
                                {(q.options || []).map((opt: string, oi: number) => (
                                  <div key={oi} className={`flex items-center gap-2 text-xs ${t.textSub}`}>
                                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isDark ? 'border-gray-600' : 'border-slate-300'}`}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    </span>
                                    {opt}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEMPLATES VIEW */}
        {view === 'templates' && (
          <div>
            <div className={`flex items-center gap-3 mb-4 p-4 rounded-xl border ${t.border} ${t.surface}`}>
              <div className="relative flex-1">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                <input type="text" placeholder="Buscar template..." value={tmplSearch} onChange={e => setTmplSearch(e.target.value)}
                  className={`w-full text-sm pl-8 pr-3 py-2 rounded-lg border ${t.input} focus:outline-none focus:ring-2 focus:ring-emerald-500/30`} />
              </div>
              <select value={tmplTipo} onChange={e => setTmplTipo(e.target.value)} className={`text-sm px-3 py-2 rounded-lg border ${t.input} focus:outline-none`}>
                <option value="Todos">Todos os tipos</option>
                <option value="pre_venda">Pré-venda</option>
                <option value="pos_venda">Pós-venda</option>
              </select>
              <button onClick={loadTemplates} className={`p-2 rounded-lg border ${t.border} ${t.textSub} hover:text-emerald-600`}><RefreshCw size={15} /></button>
            </div>

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-emerald-500" /></div>
            ) : filtTmpls.length === 0 ? (
              <div className={`text-center py-20 ${t.textMuted}`}>
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum template publicado ainda.</p>
                <p className="text-xs mt-1">Vá para "Pesquisas dos Clientes" e clique em "Publicar como Template".</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtTmpls.map(tmpl => {
                  const tipo = TIPO_CONFIG[tmpl.tipo_venda] || TIPO_CONFIG['pos_venda'];
                  return (
                    <div key={tmpl.id} className={`rounded-xl border ${t.border} ${t.surface} overflow-hidden ${!tmpl.is_active ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-4 p-4">
                        <button onClick={() => setExpandedTmpl(expandedTmpl === tmpl.id ? null : tmpl.id)} className={`shrink-0 p-1 rounded ${t.textMuted} hover:text-emerald-600`}>
                          {expandedTmpl === tmpl.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-sm font-semibold ${t.text}`}>{tmpl.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tipo.color}`}>{tipo.label}</span>
                            {tmpl.ramo_negocio && <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-violet-100 text-violet-700 border-violet-200">{tmpl.ramo_negocio}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${t.badge}`}>{tmpl.category}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{(tmpl.questions || []).length} perguntas</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <Star size={10} /> {tmpl.use_count || 0} usos
                            </span>
                          </div>
                          {tmpl.description && <p className={`text-xs ${t.textMuted} truncate`}>{tmpl.description}</p>}
                          <p className={`text-xs ${t.textMuted} mt-0.5`}>
                            Criado por: <span className="font-medium">{tmpl.source_company_name || (tmpl.created_by === 'admin' ? 'Admin HelloGrowth' : tmpl.created_by || '—')}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => toggleActive(tmpl)} title={tmpl.is_active ? 'Desativar' : 'Ativar'}
                            className={`p-2 rounded-lg border transition-colors ${tmpl.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : `${t.badge} border ${t.border}`}`}>
                            {tmpl.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                          </button>
                          <button onClick={() => openEdit(tmpl)} className={`p-2 rounded-lg border ${t.badge} border ${t.border} hover:border-blue-400 hover:text-blue-600 transition-colors`} title="Editar">
                            <Edit size={15} />
                          </button>
                          <button onClick={() => deleteTmpl(tmpl.id)} className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Deletar">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      {expandedTmpl === tmpl.id && (
                        <div className={`border-t ${t.border} px-4 py-3 space-y-2`}>
                          {(tmpl.questions || []).map((q: any, i: number) => (
                            <div key={i} className={`p-3 rounded-lg border ${t.border} ${t.inner}`}>
                              <div className="flex items-start gap-3 mb-2">
                                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-slate-200 text-slate-600'}`}>
                                  {i + 1}
                                </span>
                                <p className={`text-sm font-medium ${t.text}`}>{q.text}</p>
                              </div>
                              {(q.options || q.choices || []).length > 0 && (
                                <div className="ml-8 space-y-1">
                                  {(q.options || q.choices || []).map((opt: string, oi: number) => (
                                    <div key={oi} className={`flex items-center gap-2 text-xs ${t.textSub}`}>
                                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isDark ? 'border-gray-600' : 'border-slate-300'}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                      </span>
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL PUBLICAR */}
      {pub.open && pub.survey && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg my-6 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">Publicar como Template</h3>
                <p className="text-xs text-gray-500 mt-0.5">Pesquisa: <span className="font-medium">{pub.survey.name}</span> · {pub.survey.companyName}</p>
              </div>
              <button onClick={() => setPub({ open: false, survey: null })} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><X size={16} /></button>
            </div>

            {pubOk ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center"><Check size={28} className="text-emerald-600" /></div>
                <p className="text-base font-bold text-gray-900">Template publicado!</p>
                <p className="text-sm text-gray-500">Já disponível para os clientes.</p>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome do Template *</label>
                  <input type="text" value={pubForm.name} onChange={e => setPubForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Pesquisa de Satisfação Pós-Atendimento"
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo</label>
                  <div className="flex gap-3">
                    {(['pos_venda', 'pre_venda'] as const).map(tipo => (
                      <button key={tipo} onClick={() => setPubForm(f => ({ ...f, tipoVenda: tipo }))}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${pubForm.tipoVenda === tipo ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600'}`}>
                        {tipo === 'pos_venda' ? <HeartHandshake size={15} /> : <ShoppingCart size={15} />}
                        {TIPO_CONFIG[tipo].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-700">Ramo do Negócio</label>
                    {pub.survey?.businessType && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <Sparkles size={9} />
                        Detectado do perfil: <span className="font-bold">{pub.survey.businessType}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select value={pubForm.ramoNegocio} onChange={e => setPubForm(f => ({ ...f, ramoNegocio: e.target.value }))}
                      className={`flex-1 text-sm px-3 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                        pubForm.ramoNegocio ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 bg-white'
                      }`}>
                      <option value="">Selecionar ramo...</option>
                      {allRamos.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewRamo(v => !v)}
                      title="Criar novo ramo"
                      className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-semibold transition-all ${
                        showNewRamo ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-400 hover:text-emerald-600'
                      }`}>
                      <Plus size={14} />
                    </button>
                  </div>
                  {showNewRamo && (
                    <div className="mt-2 flex gap-2 items-center">
                      <input
                        type="text"
                        autoFocus
                        value={newRamoInput}
                        onChange={e => setNewRamoInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCustomRamo(); if (e.key === 'Escape') { setShowNewRamo(false); setNewRamoInput(''); } }}
                        placeholder="Ex: Veterinário / Pet, Esportes..."
                        className="flex-1 text-sm px-3 py-2 rounded-lg border border-emerald-400 bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      />
                      <button type="button" onClick={addCustomRamo} disabled={!newRamoInput.trim()}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
                        <Check size={14} />
                      </button>
                      <button type="button" onClick={() => { setShowNewRamo(false); setNewRamoInput(''); }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Categoria</label>
                  <input type="text" value={pubForm.category} onChange={e => setPubForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="Ex: NPS, Satisfação, Produto..."
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-700">Descrição</label>
                    <button onClick={generateDesc} disabled={genDesc || !pubForm.name}
                      className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 disabled:opacity-40 transition-colors">
                      {genDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Sugerir com IA
                    </button>
                  </div>
                  <textarea value={pubForm.description} onChange={e => setPubForm(f => ({ ...f, description: e.target.value }))} rows={3}
                    placeholder="Descreva o objetivo e quando usar este template..."
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {pubForm.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {tag} <button onClick={() => setPubForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { setPubForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] })); setTagInput(''); } }}
                      placeholder="Adicionar tag e pressionar Enter..."
                      className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none" />
                    <button onClick={() => { if (tagInput.trim()) { setPubForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] })); setTagInput(''); } }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"><Plus size={14} /></button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-2">{pub.survey.questionCount} perguntas incluídas</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {(pub.survey.questions || []).map((q: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded shrink-0">{Q_LABELS[q.type] || q.type}</span>
                        <span className="text-xs text-slate-600 truncate">{q.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setPub({ open: false, survey: null })} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                  <button onClick={publishTemplate} disabled={saving || !pubForm.name.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Publicar Template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editM.open && editM.tmpl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg my-6 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-base font-bold text-gray-900">Editar Template</h3>
              <button onClick={() => setEditM({ open: false, tmpl: null })} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome *</label>
                <input type="text" value={editF.name} onChange={e => setEditF((f: any) => ({ ...f, name: e.target.value }))}
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo</label>
                <div className="flex gap-3">
                  {(['pos_venda', 'pre_venda'] as const).map(tipo => (
                    <button key={tipo} onClick={() => setEditF((f: any) => ({ ...f, tipoVenda: tipo }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${editF.tipoVenda === tipo ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                      {tipo === 'pos_venda' ? <HeartHandshake size={15} /> : <ShoppingCart size={15} />}
                      {TIPO_CONFIG[tipo].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ramo do Negócio</label>
                <select value={editF.ramoNegocio} onChange={e => setEditF((f: any) => ({ ...f, ramoNegocio: e.target.value }))}
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none">
                  <option value="">Selecionar ramo...</option>
                  {RAMOS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Categoria</label>
                <input type="text" value={editF.category} onChange={e => setEditF((f: any) => ({ ...f, category: e.target.value }))}
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descrição</label>
                <textarea value={editF.description} onChange={e => setEditF((f: any) => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditM({ open: false, tmpl: null })} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button onClick={saveEdit} disabled={savingEdit || !editF.name?.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingEdit ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
