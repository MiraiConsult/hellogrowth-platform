'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Trash2, Edit2, Eye, EyeOff, Save, X,
  Loader2, RefreshCw, Search, Tag, ChevronDown, ChevronUp,
  Copy, CheckCircle, Star, BookOpen, Zap, AlertTriangle
} from 'lucide-react';

interface AdminTemplatesProps {
  isDark: boolean;
  surveysData: any; // dados das pesquisas dos clientes para poder salvar como template
}

const CATEGORIES = [
  'Geral', 'Atendimento', 'Produto', 'Pós-Venda', 'Evento', 'Saúde',
  'Educação', 'Alimentação', 'Pet', 'Beleza & Estética', 'Jurídico',
  'Fitness', 'Hotelaria', 'Varejo', 'Serviços',
];

const QUESTION_TYPE_LABELS: Record<string, string> = {
  nps: 'NPS (0–10)',
  text: 'Texto Livre',
  single: 'Escolha Única',
  multiple_choice: 'Múltipla Escolha',
  rating: 'Avaliação (estrelas)',
  csat: 'CSAT',
};

function QuestionTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    nps: 'bg-emerald-100 text-emerald-700',
    text: 'bg-blue-100 text-blue-700',
    single: 'bg-violet-100 text-violet-700',
    multiple_choice: 'bg-orange-100 text-orange-700',
    rating: 'bg-yellow-100 text-yellow-700',
    csat: 'bg-teal-100 text-teal-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[type] || 'bg-slate-100 text-slate-500'}`}>
      {QUESTION_TYPE_LABELS[type] || type}
    </span>
  );
}

export default function AdminTemplates({ isDark, surveysData }: AdminTemplatesProps) {
  const t = isDark
    ? { bg: 'bg-gray-950', surface: 'bg-gray-900', border: 'border-gray-800', text: 'text-white', textSub: 'text-gray-400', textMuted: 'text-gray-500', card: 'bg-gray-900 border-gray-800', cardInner: 'bg-gray-800/50 border-gray-700', badge: 'bg-gray-800 text-gray-300', tableRow: 'hover:bg-gray-800/30', input: 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' }
    : { bg: 'bg-slate-50', surface: 'bg-white', border: 'border-slate-200', text: 'text-slate-900', textSub: 'text-slate-500', textMuted: 'text-slate-400', card: 'bg-white border-slate-200', cardInner: 'bg-slate-50 border-slate-200', badge: 'bg-slate-100 text-slate-600', tableRow: 'hover:bg-slate-50', input: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' };

  const [templates, setTemplates] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal de criação/edição
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', description: '', category: 'Geral', objective: '', tone: '',
    tags: '', questions: [] as any[],
  });

  // Modal de importar de pesquisa existente
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearch, setImportSearch] = useState('');

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/templates?activeOnly=false');
      const data = await res.json();
      setTemplates(data.templates || []);
      setStats(data.stats);
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ name: '', description: '', category: 'Geral', objective: '', tone: '', tags: '', questions: [] });
    setShowModal(true);
  };

  const openEdit = (template: any) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      description: template.description || '',
      category: template.category || 'Geral',
      objective: template.objective || '',
      tone: template.tone || '',
      tags: (template.tags || []).join(', '),
      questions: template.questions || [],
    });
    setShowModal(true);
  };

  const importFromCampaign = (campaign: any) => {
    setForm({
      name: campaign.name,
      description: campaign.description || '',
      category: 'Geral',
      objective: campaign.objective || '',
      tone: campaign.tone || '',
      tags: '',
      questions: campaign.questions || [],
    });
    setShowImportModal(false);
    setShowModal(true);
  };

  const saveTemplate = async () => {
    if (!form.name.trim() || form.questions.length === 0) return;
    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        objective: form.objective,
        tone: form.tone,
        questions: form.questions,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        ...(editingTemplate ? {} : {}),
      };

      let res;
      if (editingTemplate) {
        res = await fetch('/api/admin/templates', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTemplate.id, ...payload }),
        });
      } else {
        res = await fetch('/api/admin/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => { setSaveSuccess(false); setShowModal(false); loadTemplates(); }, 1200);
      }
    } finally { setIsSaving(false); }
  };

  const toggleActive = async (template: any) => {
    await fetch('/api/admin/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: template.id, is_active: !template.is_active }),
    });
    loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Deletar este template permanentemente?')) return;
    await fetch(`/api/admin/templates?id=${id}&hard=true`, { method: 'DELETE' });
    loadTemplates();
  };

  const addQuestion = () => {
    setForm(f => ({
      ...f,
      questions: [...f.questions, { id: String(Date.now()), text: '', type: 'text', required: true, options: [] }],
    }));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setForm(f => {
      const qs = [...f.questions];
      qs[idx] = { ...qs[idx], [field]: value };
      return { ...f, questions: qs };
    });
  };

  const removeQuestion = (idx: number) => {
    setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
  };

  const moveQuestion = (idx: number, dir: 'up' | 'down') => {
    setForm(f => {
      const qs = [...f.questions];
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= qs.length) return f;
      [qs[idx], qs[newIdx]] = [qs[newIdx], qs[idx]];
      return { ...f, questions: qs };
    });
  };

  const filteredTemplates = templates.filter(t => {
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || t.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const allCategories = [...new Set(templates.map(t => t.category).filter(Boolean))];
  const availableCampaigns = (surveysData?.campaigns || []).filter((c: any) =>
    !importSearch || c.name?.toLowerCase().includes(importSearch.toLowerCase()) || c.companyName?.toLowerCase().includes(importSearch.toLowerCase())
  );

  const cardCls = `${t.card} border rounded-xl p-5`;

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className={`text-lg font-bold ${t.text}`}>Biblioteca de Templates</h2>
            <p className={`text-sm ${t.textMuted} mt-0.5`}>Crie e gerencie templates de pesquisas NPS que seus clientes podem copiar com um clique.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border ${t.card} ${t.text} hover:opacity-80 transition-opacity`}
            >
              <Copy size={14} /> Importar de Pesquisa
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} /> Novo Template
            </button>
          </div>
        </div>

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Templates Ativos', value: templates.filter(t => t.is_active).length, color: 'text-emerald-500', icon: <BookOpen size={16} className="text-emerald-500" /> },
              { label: 'Total de Templates', value: stats.total || 0, color: 'text-blue-500', icon: <FileText size={16} className="text-blue-500" /> },
              { label: 'Usos Totais', value: stats.totalUses || 0, color: 'text-purple-500', icon: <Zap size={16} className="text-purple-500" /> },
              { label: 'Categorias', value: stats.categories?.length || 0, color: 'text-orange-500', icon: <Tag size={16} className="text-orange-500" /> },
            ].map((kpi, i) => (
              <div key={i} className={`${t.card} border rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs ${t.textMuted} font-medium`}>{kpi.label}</span>
                  {kpi.icon}
                </div>
                <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
            <input
              type="text"
              placeholder="Buscar template..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`text-sm pl-8 pr-3 py-2 rounded-lg border ${t.input} w-52`}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className={`text-sm px-3 py-2 rounded-lg border ${t.input} w-44`}
          >
            <option value="">Todas as categorias</option>
            {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <button onClick={loadTemplates} disabled={isLoading} className={`flex items-center gap-1.5 text-xs ${t.textSub} hover:${t.text} transition-colors`}>
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar
          </button>
          <span className={`text-xs ${t.textMuted}`}>{filteredTemplates.length} templates</span>
        </div>

        {/* Lista de templates */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>
        ) : filteredTemplates.length === 0 ? (
          <div className={`text-center py-20 ${t.textMuted}`}>
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum template criado ainda.</p>
            <p className="text-xs mt-1">Clique em "Novo Template" ou importe de uma pesquisa existente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map(template => {
              const isExpanded = expandedId === template.id;
              return (
                <div key={template.id} className={`${t.card} border rounded-xl overflow-hidden ${!template.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold ${t.text}`}>{template.name}</span>
                        {!template.is_active && (
                          <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">Inativo</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700`}>{template.category}</span>
                        {(template.tags || []).slice(0, 3).map((tag: string) => (
                          <span key={tag} className={`text-xs ${t.badge} px-2 py-0.5 rounded-full`}>{tag}</span>
                        ))}
                      </div>
                      {template.description && (
                        <p className={`text-xs ${t.textMuted} mt-1 truncate max-w-xl`}>{template.description}</p>
                      )}
                      <div className={`flex items-center gap-3 mt-1.5 text-xs ${t.textMuted}`}>
                        <span>{template.questions?.length || 0} perguntas</span>
                        <span className="flex items-center gap-1"><Star size={10} className="text-yellow-500" /> {template.use_count || 0} usos</span>
                        {template.source_tenant_name && <span>Origem: {template.source_tenant_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : template.id)}
                        className={`p-1.5 rounded-lg ${t.badge} hover:opacity-80 transition-opacity`}
                        title="Visualizar perguntas"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => openEdit(template)}
                        className={`p-1.5 rounded-lg ${t.badge} hover:opacity-80 transition-opacity`}
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => toggleActive(template)}
                        className={`p-1.5 rounded-lg ${template.is_active ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'} hover:opacity-80 transition-opacity`}
                        title={template.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {template.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:opacity-80 transition-opacity"
                        title="Deletar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={`border-t ${t.border} p-5`}>
                      <div className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider mb-3`}>Perguntas do Template</div>
                      <div className="space-y-2">
                        {(template.questions || []).map((q: any, qi: number) => (
                          <div key={qi} className={`${t.cardInner} border rounded-lg p-3`}>
                            <div className="flex items-start gap-3">
                              <span className={`text-xs font-bold ${t.textMuted} w-5 shrink-0 mt-0.5`}>{qi + 1}.</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <QuestionTypeBadge type={q.type} />
                                  {q.required && <span className="text-xs text-red-400">obrigatória</span>}
                                </div>
                                <p className={`text-sm ${t.text}`}>{q.text}</p>
                                {q.options?.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {q.options.slice(0, 5).map((opt: any, oi: number) => (
                                      <span key={oi} className={`text-xs ${t.badge} px-2 py-0.5 rounded`}>
                                        {typeof opt === 'string' ? opt : opt.text || opt.label || ''}
                                      </span>
                                    ))}
                                    {q.options.length > 5 && <span className={`text-xs ${t.textMuted}`}>+{q.options.length - 5}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {template.objective && (
                        <p className={`text-xs ${t.textMuted} mt-3 italic`}>Objetivo: {template.objective}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL DE CRIAÇÃO/EDIÇÃO ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-2xl my-4 shadow-2xl`}>
            <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-gray-700' : 'border-slate-200'}`}>
              <h3 className={`text-base font-bold ${t.text}`}>{editingTemplate ? 'Editar Template' : 'Novo Template'}</h3>
              <button onClick={() => setShowModal(false)} className={`p-1.5 rounded-lg ${t.badge} hover:opacity-80`}><X size={16} /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Dados básicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Nome do Template *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Pesquisa de Satisfação Pós-Atendimento"
                    className={`w-full text-sm px-3 py-2 rounded-lg border ${t.input}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Categoria</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className={`w-full text-sm px-3 py-2 rounded-lg border ${t.input}`}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Descrição</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descreva quando usar este template..."
                  rows={2}
                  className={`w-full text-sm px-3 py-2 rounded-lg border ${t.input} resize-none`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Objetivo</label>
                  <input
                    type="text"
                    value={form.objective}
                    onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                    placeholder="Ex: Medir satisfação pós-atendimento"
                    className={`w-full text-sm px-3 py-2 rounded-lg border ${t.input}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${t.textMuted} block mb-1`}>Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="nps, atendimento, pós-venda"
                    className={`w-full text-sm px-3 py-2 rounded-lg border ${t.input}`}
                  />
                </div>
              </div>

              {/* Perguntas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={`text-xs font-semibold ${t.textMuted} uppercase tracking-wider`}>Perguntas ({form.questions.length})</label>
                  <button
                    onClick={addQuestion}
                    className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 font-semibold"
                  >
                    <Plus size={12} /> Adicionar Pergunta
                  </button>
                </div>

                {form.questions.length === 0 && (
                  <div className={`text-center py-8 ${t.textMuted} text-xs border-2 border-dashed ${isDark ? 'border-gray-700' : 'border-slate-200'} rounded-lg`}>
                    Nenhuma pergunta adicionada. Clique em "Adicionar Pergunta" acima.
                  </div>
                )}

                <div className="space-y-3">
                  {form.questions.map((q, qi) => (
                    <div key={qi} className={`${t.cardInner} border rounded-lg p-3`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`text-xs font-bold ${t.textMuted} shrink-0 mt-2`}>{qi + 1}.</span>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={q.text}
                            onChange={e => updateQuestion(qi, 'text', e.target.value)}
                            placeholder="Texto da pergunta..."
                            className={`w-full text-sm px-3 py-1.5 rounded-lg border ${t.input}`}
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={q.type}
                              onChange={e => updateQuestion(qi, 'type', e.target.value)}
                              className={`text-xs px-2 py-1.5 rounded-lg border ${t.input}`}
                            >
                              {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                            <label className={`flex items-center gap-1 text-xs ${t.textMuted} cursor-pointer`}>
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={e => updateQuestion(qi, 'required', e.target.checked)}
                                className="w-3 h-3"
                              />
                              Obrigatória
                            </label>
                          </div>
                          {(q.type === 'single' || q.type === 'multiple_choice') && (
                            <div>
                              <p className={`text-xs ${t.textMuted} mb-1`}>Opções (uma por linha):</p>
                              <textarea
                                value={(q.options || []).map((o: any) => typeof o === 'string' ? o : o.text || '').join('\n')}
                                onChange={e => updateQuestion(qi, 'options', e.target.value.split('\n').filter(Boolean))}
                                rows={3}
                                placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                                className={`w-full text-xs px-2 py-1.5 rounded-lg border ${t.input} resize-none`}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => moveQuestion(qi, 'up')} disabled={qi === 0} className={`p-1 rounded ${t.badge} disabled:opacity-30`}><ChevronUp size={12} /></button>
                          <button onClick={() => moveQuestion(qi, 'down')} disabled={qi === form.questions.length - 1} className={`p-1 rounded ${t.badge} disabled:opacity-30`}><ChevronDown size={12} /></button>
                          <button onClick={() => removeQuestion(qi)} className="p-1 rounded bg-red-100 text-red-500"><X size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between p-5 border-t ${isDark ? 'border-gray-700' : 'border-slate-200'}`}>
              <button onClick={() => setShowModal(false)} className={`text-sm ${t.textSub} hover:${t.text} transition-colors`}>Cancelar</button>
              <button
                onClick={saveTemplate}
                disabled={isSaving || !form.name.trim() || form.questions.length === 0}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <CheckCircle size={14} /> : <Save size={14} />}
                {isSaving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE IMPORTAR DE PESQUISA ── */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className={`${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-xl my-4 shadow-2xl`}>
            <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-gray-700' : 'border-slate-200'}`}>
              <h3 className={`text-base font-bold ${t.text}`}>Importar de Pesquisa Existente</h3>
              <button onClick={() => setShowImportModal(false)} className={`p-1.5 rounded-lg ${t.badge} hover:opacity-80`}><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="relative">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                <input
                  type="text"
                  placeholder="Buscar pesquisa ou empresa..."
                  value={importSearch}
                  onChange={e => setImportSearch(e.target.value)}
                  className={`w-full text-sm pl-8 pr-3 py-2 rounded-lg border ${t.input}`}
                />
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {availableCampaigns.length === 0 && (
                  <div className={`text-center py-8 text-xs ${t.textMuted}`}>
                    {surveysData ? 'Nenhuma pesquisa encontrada.' : 'Carregue as pesquisas primeiro na aba "Pesquisas & Formulários".'}
                  </div>
                )}
                {availableCampaigns.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => importFromCampaign(c)}
                    className={`${t.cardInner} border rounded-lg p-3 cursor-pointer hover:border-emerald-500 transition-colors`}
                  >
                    <div className={`text-sm font-semibold ${t.text}`}>{c.name}</div>
                    <div className={`text-xs ${t.textMuted} flex items-center gap-2 mt-0.5`}>
                      <span className="text-blue-500">{c.companyName}</span>
                      <span>{c.questionCount} perguntas</span>
                      <span>{c.responseCount} respostas</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
