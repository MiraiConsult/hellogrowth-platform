'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain, BookOpen, Edit3, MessageSquare, Plus, Trash2, Save, X,
  ChevronDown, ChevronRight, RefreshCw, Send, Bot, User, Loader2,
  CheckCircle, AlertCircle, Zap, Settings, Eye, EyeOff, Copy, Check,
  ToggleLeft, ToggleRight, Info, Layers, FileText, HelpCircle, Shield,
  Code2, Target, ChevronUp
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Niche {
  id: string;
  name: string;
  slug: string;
}

interface KnowledgeSection {
  id: string;
  niche_slug: string;
  agent_mode: 'full' | 'simple';
  section_type: string;
  title: string;
  content: string;
  position: number;
  is_active: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  messages?: string[];
  reasoning?: string;
}

interface Props {
  isDark: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTION_TYPES = [
  { value: 'presentation', label: 'Apresentação', icon: <Layers size={14} /> },
  { value: 'faq', label: 'Perguntas Frequentes', icon: <HelpCircle size={14} /> },
  { value: 'objections', label: 'Objeções e Respostas', icon: <Shield size={14} /> },
  { value: 'scripts', label: 'Scripts de Abordagem', icon: <FileText size={14} /> },
  { value: 'terms', label: 'Termos Técnicos', icon: <Code2 size={14} /> },
  { value: 'rules', label: 'Regras de Negócio', icon: <Target size={14} /> },
];

const FLOW_TYPES = [
  { value: 'pre_sale', label: 'Pré-Venda' },
  { value: 'nps', label: 'NPS' },
  { value: 'promoter', label: 'Promotor' },
  { value: 'detractor', label: 'Detrator' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminAgentKnowledge({ isDark }: Props) {
  const t = {
    bg: isDark ? 'bg-gray-950' : 'bg-gray-50',
    card: isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200',
    cardHover: isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
    text: isDark ? 'text-white' : 'text-gray-900',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
    textSub: isDark ? 'text-gray-300' : 'text-gray-600',
    input: isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
    inputFocus: 'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
    badge: isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600',
    divider: isDark ? 'border-gray-800' : 'border-gray-200',
    sidebar: isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200',
    activeItem: isDark ? 'bg-emerald-900/30 text-emerald-400 border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-300',
    inactiveItem: isDark ? 'text-gray-400 hover:bg-gray-800 border-transparent' : 'text-gray-600 hover:bg-gray-50 border-transparent',
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'knowledge' | 'editor' | 'chat'>('knowledge');
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<string>('');
  const [agentMode, setAgentMode] = useState<'full' | 'simple'>('full');
  const [sections, setSections] = useState<KnowledgeSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Editor state
  const [editingSection, setEditingSection] = useState<KnowledgeSection | null>(null);
  const [isNewSection, setIsNewSection] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', section_type: 'presentation', position: 50 });

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatNiche, setChatNiche] = useState('');
  const [chatMode, setChatMode] = useState<'full' | 'simple'>('full');
  const [chatFlow, setChatFlow] = useState('pre_sale');
  const [chatContactName, setChatContactName] = useState('Cliente Teste');
  const [showChatConfig, setShowChatConfig] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    loadNiches();
  }, []);

  useEffect(() => {
    if (selectedNiche) loadSections();
  }, [selectedNiche, agentMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadNiches = async () => {
    try {
      const res = await fetch('/api/admin/agent-knowledge?action=niches');
      const data = await res.json();
      setNiches(data.niches || []);
      if (data.niches?.length > 0 && !selectedNiche) {
        setSelectedNiche(data.niches[0].slug);
        setChatNiche(data.niches[0].slug);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSections = async () => {
    if (!selectedNiche) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/agent-knowledge?niche_slug=${selectedNiche}&agent_mode=${agentMode}`);
      const data = await res.json();
      setSections(data.sections || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (section: KnowledgeSection) => {
    setEditingSection(section);
    setIsNewSection(false);
    setEditForm({
      title: section.title,
      content: section.content,
      section_type: section.section_type,
      position: section.position,
    });
    setActiveTab('editor');
  };

  const startNew = () => {
    setEditingSection(null);
    setIsNewSection(true);
    setEditForm({ title: '', content: '', section_type: 'presentation', position: 50 });
    setActiveTab('editor');
  };

  const saveSection = async () => {
    if (!editForm.title.trim()) {
      showToast('O título é obrigatório', 'error');
      return;
    }
    setSaving(true);
    try {
      if (isNewSection) {
        const res = await fetch('/api/admin/agent-knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            niche_slug: selectedNiche,
            agent_mode: agentMode,
            section_type: editForm.section_type,
            title: editForm.title,
            content: editForm.content,
            position: editForm.position,
          }),
        });
        if (!res.ok) throw new Error('Erro ao criar seção');
        showToast('Seção criada com sucesso!');
      } else if (editingSection) {
        const res = await fetch('/api/admin/agent-knowledge', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingSection.id,
            title: editForm.title,
            content: editForm.content,
            section_type: editForm.section_type,
            position: editForm.position,
          }),
        });
        if (!res.ok) throw new Error('Erro ao salvar seção');
        showToast('Seção salva com sucesso!');
      }
      await loadSections();
      setActiveTab('knowledge');
      setEditingSection(null);
    } catch (e: any) {
      showToast(e.message || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSectionActive = async (section: KnowledgeSection) => {
    try {
      await fetch('/api/admin/agent-knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: section.id, is_active: !section.is_active }),
      });
      await loadSections();
    } catch (e) {
      showToast('Erro ao atualizar', 'error');
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta seção?')) return;
    try {
      await fetch(`/api/admin/agent-knowledge?id=${id}`, { method: 'DELETE' });
      showToast('Seção excluída');
      await loadSections();
    } catch (e) {
      showToast('Erro ao excluir', 'error');
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    if (!chatNiche) {
      showToast('Selecione um nicho para testar', 'error');
      return;
    }

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/admin/agent-chat-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche_slug: chatNiche,
          agent_mode: chatMode,
          flow_type: chatFlow,
          user_message: userMsg,
          conversation_history: history,
          contact_name: chatContactName,
        }),
      });

      if (!res.ok) throw new Error('Erro na API');
      const data = await res.json();

      const response = data.response;
      const messages: string[] = response?.messages || [data.raw || 'Sem resposta'];
      const combinedContent = messages.join('\n\n');

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: combinedContent,
        messages,
        reasoning: response?.reasoning,
      }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Erro: ${e.message}`,
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  // ─── Section Type Icon ──────────────────────────────────────────────────────
  const getSectionTypeIcon = (type: string) => {
    const found = SECTION_TYPES.find(t => t.value === type);
    return found?.icon || <FileText size={14} />;
  };

  const getSectionTypeLabel = (type: string) => {
    const found = SECTION_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${t.bg} p-6`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${t.text}`}>Agente de IA</h1>
            <p className={`text-xs ${t.textMuted}`}>Base de conhecimento global por nicho</p>
          </div>
        </div>
      </div>

      {/* Controls Row */}
      <div className={`flex flex-wrap items-center gap-3 mb-5 p-4 rounded-xl border ${t.card}`}>
        {/* Nicho selector */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${t.textMuted}`}>Nicho:</span>
          <select
            value={selectedNiche}
            onChange={e => setSelectedNiche(e.target.value)}
            className={`text-sm px-3 py-1.5 rounded-lg border ${t.input} ${t.inputFocus}`}
          >
            {niches.length === 0 && <option value="">Carregando...</option>}
            {niches.map(n => (
              <option key={n.slug} value={n.slug}>{n.name}</option>
            ))}
          </select>
        </div>

        {/* Mode toggle */}
        <div className={`flex items-center gap-1 p-1 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <button
            onClick={() => setAgentMode('full')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              agentMode === 'full'
                ? 'bg-violet-600 text-white shadow-sm'
                : `${t.textMuted} hover:text-white`
            }`}
          >
            <Zap size={12} />
            Completo
          </button>
          <button
            onClick={() => setAgentMode('simple')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              agentMode === 'simple'
                ? 'bg-sky-600 text-white shadow-sm'
                : `${t.textMuted} hover:text-white`
            }`}
          >
            <Target size={12} />
            Simplificado
          </button>
        </div>

        {/* Mode description */}
        <div className={`flex items-center gap-1.5 text-xs ${t.textMuted}`}>
          <Info size={12} />
          {agentMode === 'full'
            ? 'SDR + Comercial + CS — conhecimento completo'
            : 'Confirmações, anamnese, NPS, avaliações — escala para humano em dúvidas complexas'}
        </div>

        <div className="flex-1" />

        {/* Reload */}
        <button
          onClick={loadSections}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${t.card} ${t.textMuted} hover:text-emerald-500`}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 mb-5 p-1 rounded-xl ${isDark ? 'bg-gray-900' : 'bg-gray-100'} w-fit`}>
        {[
          { id: 'knowledge', label: 'Base de Conhecimento', icon: <BookOpen size={14} /> },
          { id: 'editor', label: 'Editor', icon: <Edit3 size={14} /> },
          { id: 'chat', label: 'Chat de Teste', icon: <MessageSquare size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? isDark
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'bg-white text-gray-900 shadow-sm'
                : `${t.textMuted} hover:text-white`
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: BASE DE CONHECIMENTO ─────────────────────────────────────── */}
      {activeTab === 'knowledge' && (
        <div>
          {/* Header with add button */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-base font-semibold ${t.text}`}>
                {niches.find(n => n.slug === selectedNiche)?.name || selectedNiche}
                {' '}— Modo {agentMode === 'full' ? 'Completo' : 'Simplificado'}
              </h2>
              <p className={`text-xs ${t.textMuted} mt-0.5`}>
                {sections.length} seção{sections.length !== 1 ? 'ões' : ''} de conhecimento
              </p>
            </div>
            <button
              onClick={startNew}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={14} />
              Nova Seção
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
            </div>
          ) : sections.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
              <Brain size={32} className={`${t.textMuted} mb-3`} />
              <p className={`text-sm font-medium ${t.textMuted}`}>Nenhuma seção de conhecimento ainda</p>
              <p className={`text-xs ${t.textMuted} mt-1 mb-4`}>Adicione seções para enriquecer o conhecimento da IA</p>
              <button
                onClick={startNew}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={14} />
                Adicionar primeira seção
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sections.map(section => (
                <div
                  key={section.id}
                  className={`rounded-xl border transition-all ${t.card} ${!section.is_active ? 'opacity-50' : ''}`}
                >
                  {/* Section header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      {getSectionTypeIcon(section.section_type)}
                      {getSectionTypeLabel(section.section_type)}
                    </div>
                    <span className={`flex-1 text-sm font-medium ${t.text}`}>{section.title}</span>
                    <div className="flex items-center gap-2">
                      {/* Active toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleSectionActive(section); }}
                        className={`p-1 rounded transition-colors ${section.is_active ? 'text-emerald-500' : t.textMuted}`}
                        title={section.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {section.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      {/* Edit */}
                      <button
                        onClick={e => { e.stopPropagation(); startEdit(section); }}
                        className={`p-1 rounded transition-colors ${t.textMuted} hover:text-blue-400`}
                        title="Editar"
                      >
                        <Edit3 size={14} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={e => { e.stopPropagation(); deleteSection(section.id); }}
                        className={`p-1 rounded transition-colors ${t.textMuted} hover:text-red-400`}
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                      {/* Expand */}
                      {expandedSections.has(section.id)
                        ? <ChevronUp size={14} className={t.textMuted} />
                        : <ChevronDown size={14} className={t.textMuted} />
                      }
                    </div>
                  </div>

                  {/* Section content */}
                  {expandedSections.has(section.id) && (
                    <div className={`px-4 pb-4 border-t ${t.divider}`}>
                      <pre className={`mt-3 text-xs leading-relaxed whitespace-pre-wrap font-sans ${t.textSub}`}>
                        {section.content || '(sem conteúdo)'}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: EDITOR ──────────────────────────────────────────────────── */}
      {activeTab === 'editor' && (
        <div className={`rounded-xl border ${t.card} p-6`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-base font-semibold ${t.text}`}>
              {isNewSection ? 'Nova Seção de Conhecimento' : `Editar: ${editingSection?.title || ''}`}
            </h2>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`p-1.5 rounded-lg ${t.textMuted} hover:text-white transition-colors`}
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Nicho e modo (somente leitura) */}
            <div className="flex gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                <Layers size={12} />
                Nicho: {niches.find(n => n.slug === selectedNiche)?.name || selectedNiche}
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${agentMode === 'full' ? 'bg-violet-900/30 text-violet-400' : 'bg-sky-900/30 text-sky-400'}`}>
                {agentMode === 'full' ? <Zap size={12} /> : <Target size={12} />}
                Modo {agentMode === 'full' ? 'Completo' : 'Simplificado'}
              </div>
            </div>

            {/* Tipo de seção */}
            <div>
              <label className={`block text-xs font-medium ${t.textMuted} mb-2`}>Tipo de Seção</label>
              <div className="flex flex-wrap gap-2">
                {SECTION_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setEditForm(f => ({ ...f, section_type: type.value }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      editForm.section_type === type.value
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : `${t.card} ${t.textMuted} hover:border-emerald-500`
                    }`}
                  >
                    {type.icon}
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Título */}
            <div>
              <label className={`block text-xs font-medium ${t.textMuted} mb-2`}>Título da Seção *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Perguntas Frequentes sobre Implante"
                className={`w-full px-3 py-2.5 rounded-lg border text-sm ${t.input} ${t.inputFocus}`}
              />
            </div>

            {/* Conteúdo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`text-xs font-medium ${t.textMuted}`}>Conteúdo</label>
                <span className={`text-xs ${t.textMuted}`}>{editForm.content.length} caracteres</span>
              </div>
              <textarea
                value={editForm.content}
                onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Escreva o conteúdo desta seção de conhecimento. Use texto livre, listas com **, perguntas e respostas, etc."
                rows={16}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm font-mono leading-relaxed resize-y ${t.input} ${t.inputFocus}`}
              />
              <p className={`text-xs ${t.textMuted} mt-1.5`}>
                Dica: use <code className="bg-gray-800 px-1 rounded">**texto**</code> para negrito, listas com <code className="bg-gray-800 px-1 rounded">•</code> e separe perguntas/respostas com linhas em branco.
              </p>
            </div>

            {/* Posição */}
            <div>
              <label className={`block text-xs font-medium ${t.textMuted} mb-2`}>Posição (ordem de exibição)</label>
              <input
                type="number"
                value={editForm.position}
                onChange={e => setEditForm(f => ({ ...f, position: Number(e.target.value) }))}
                min={1}
                max={999}
                className={`w-24 px-3 py-2 rounded-lg border text-sm ${t.input} ${t.inputFocus}`}
              />
              <p className={`text-xs ${t.textMuted} mt-1`}>Menor número = aparece primeiro no prompt da IA</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveSection}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Salvando...' : 'Salvar Seção'}
              </button>
              <button
                onClick={() => { setActiveTab('knowledge'); setEditingSection(null); }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${t.card} ${t.textMuted} hover:text-white`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: CHAT DE TESTE ───────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
          {/* Config sidebar */}
          <div className={`w-64 flex-shrink-0 rounded-xl border ${t.card} p-4 overflow-y-auto`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold ${t.text}`}>Configuração</h3>
              <button
                onClick={() => setShowChatConfig(!showChatConfig)}
                className={`p-1 rounded ${t.textMuted}`}
              >
                {showChatConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showChatConfig && (
              <div className="space-y-4">
                {/* Nicho */}
                <div>
                  <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Nicho</label>
                  <select
                    value={chatNiche}
                    onChange={e => setChatNiche(e.target.value)}
                    className={`w-full text-xs px-2.5 py-2 rounded-lg border ${t.input} ${t.inputFocus}`}
                  >
                    {niches.map(n => (
                      <option key={n.slug} value={n.slug}>{n.name}</option>
                    ))}
                  </select>
                </div>

                {/* Modo */}
                <div>
                  <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Modo do Agente</label>
                  <div className={`flex gap-1 p-1 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <button
                      onClick={() => setChatMode('full')}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                        chatMode === 'full' ? 'bg-violet-600 text-white' : t.textMuted
                      }`}
                    >
                      Completo
                    </button>
                    <button
                      onClick={() => setChatMode('simple')}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                        chatMode === 'simple' ? 'bg-sky-600 text-white' : t.textMuted
                      }`}
                    >
                      Simples
                    </button>
                  </div>
                </div>

                {/* Fluxo */}
                <div>
                  <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Fluxo</label>
                  <select
                    value={chatFlow}
                    onChange={e => setChatFlow(e.target.value)}
                    className={`w-full text-xs px-2.5 py-2 rounded-lg border ${t.input} ${t.inputFocus}`}
                  >
                    {FLOW_TYPES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                {/* Nome do contato simulado */}
                <div>
                  <label className={`block text-xs font-medium ${t.textMuted} mb-1.5`}>Nome do cliente simulado</label>
                  <input
                    type="text"
                    value={chatContactName}
                    onChange={e => setChatContactName(e.target.value)}
                    className={`w-full text-xs px-2.5 py-2 rounded-lg border ${t.input} ${t.inputFocus}`}
                    placeholder="Ex: João Silva"
                  />
                </div>

                {/* Clear chat */}
                <button
                  onClick={clearChat}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors ${t.card} ${t.textMuted} hover:text-red-400 hover:border-red-500`}
                >
                  <Trash2 size={12} />
                  Limpar conversa
                </button>

                {/* Info */}
                <div className={`p-3 rounded-lg text-xs ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <p className="font-medium mb-1">Como funciona:</p>
                  <p>A IA usa o conhecimento do nicho selecionado + modo configurado para responder. Igual ao que acontece com os clientes reais.</p>
                </div>
              </div>
            )}
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col rounded-xl border ${t.card} overflow-hidden`}>
            {/* Chat header */}
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${t.divider}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <div>
                <p className={`text-sm font-medium ${t.text}`}>Agente IA — Modo {chatMode === 'full' ? 'Completo' : 'Simplificado'}</p>
                <p className={`text-xs ${t.textMuted}`}>
                  {niches.find(n => n.slug === chatNiche)?.name || chatNiche} · {FLOW_TYPES.find(f => f.value === chatFlow)?.label}
                </p>
              </div>
              <div className="flex-1" />
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare size={32} className={`${t.textMuted} mb-3`} />
                  <p className={`text-sm font-medium ${t.textMuted}`}>Inicie uma conversa de teste</p>
                  <p className={`text-xs ${t.textMuted} mt-1 max-w-xs`}>
                    Escreva como se fosse um cliente e veja como a IA responde usando o conhecimento configurado
                  </p>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${
                    msg.role === 'user'
                      ? 'bg-emerald-600'
                      : 'bg-gradient-to-br from-violet-500 to-purple-600'
                  }`}>
                    {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[75%] space-y-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    {msg.role === 'assistant' && msg.messages && msg.messages.length > 1
                      ? msg.messages.map((m, j) => (
                          <div
                            key={j}
                            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                              isDark ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-900'
                            } ${j === 0 ? 'rounded-tl-sm' : ''}`}
                          >
                            {m}
                          </div>
                        ))
                      : (
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-sm'
                            : isDark ? 'bg-gray-800 text-gray-100 rounded-tl-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                        }`}>
                          {msg.content}
                        </div>
                      )
                    }

                    {/* Reasoning (collapsible) */}
                    {msg.role === 'assistant' && msg.reasoning && (
                      <details className="mt-1">
                        <summary className={`text-xs cursor-pointer ${t.textMuted} hover:text-emerald-400`}>
                          Ver raciocínio da IA
                        </summary>
                        <div className={`mt-1 p-2 rounded-lg text-xs ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                          {msg.reasoning}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className={`px-3 py-2 rounded-2xl rounded-tl-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="flex gap-1 items-center h-5">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className={`p-3 border-t ${t.divider}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                  placeholder="Escreva como se fosse o cliente..."
                  disabled={chatLoading}
                  className={`flex-1 px-3 py-2.5 rounded-xl border text-sm ${t.input} ${t.inputFocus} disabled:opacity-50`}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
