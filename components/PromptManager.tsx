'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Plus,
  Check,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

type FlowType = 'detractor' | 'promoter' | 'passive' | 'pre_sale';

interface PromptVersion {
  id: string;
  tenant_id: string;
  flow_type: FlowType;
  version_number: number;
  version_name: string;
  prompt_content: string;
  is_active: boolean;
  created_at: string;
  activated_at?: string;
}

interface PromptManagerProps {
  isDark?: boolean;
  tenantId: string;
}

// ============================================================
// CONSTANTES
// ============================================================

const FLOW_CONFIG: Record<FlowType, { label: string; description: string; color: string; emoji: string }> = {
  detractor: {
    label: 'Reconquista',
    description: 'NPS 0-6 — Clientes insatisfeitos',
    color: 'red',
    emoji: '🔴',
  },
  passive: {
    label: 'Feedback',
    description: 'NPS 7-8 — Clientes neutros',
    color: 'yellow',
    emoji: '🟡',
  },
  promoter: {
    label: 'Indicação',
    description: 'NPS 9-10 — Promotores',
    color: 'green',
    emoji: '🟢',
  },
  pre_sale: {
    label: 'Pré-Venda',
    description: 'Leads do formulário',
    color: 'blue',
    emoji: '🔵',
  },
};

const FLOW_ORDER: FlowType[] = ['detractor', 'passive', 'promoter', 'pre_sale'];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

const PromptManager: React.FC<PromptManagerProps> = ({ isDark = false, tenantId }) => {
  const [versions, setVersions] = useState<Record<FlowType, PromptVersion[]>>({
    detractor: [],
    passive: [],
    promoter: [],
    pre_sale: [],
  });
  const [defaultPrompts, setDefaultPrompts] = useState<Record<FlowType, string>>({} as any);
  const [loading, setLoading] = useState(true);
  const [activeFlow, setActiveFlow] = useState<FlowType>('detractor');
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newVersionContent, setNewVersionContent] = useState('');
  const [newVersionName, setNewVersionName] = useState('');
  const [activateImmediately, setActivateImmediately] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);

  // --------------------------------------------------------
  // FETCH
  // --------------------------------------------------------

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/prompts?tenant_id=${tenantId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar versões');

      const grouped: Record<FlowType, PromptVersion[]> = {
        detractor: [],
        passive: [],
        promoter: [],
        pre_sale: [],
      };

      for (const v of data.versions || []) {
        if (grouped[v.flow_type as FlowType]) {
          grouped[v.flow_type as FlowType].push(v);
        }
      }

      setVersions(grouped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchDefaultPrompt = useCallback(async (flowType: FlowType) => {
    if (defaultPrompts[flowType]) return;
    try {
      const res = await fetch(`/api/prompts/default?flow_type=${flowType}`);
      const data = await res.json();
      if (res.ok) {
        setDefaultPrompts((prev) => ({ ...prev, [flowType]: data.default_prompt }));
      }
    } catch {
      // silencioso
    }
  }, [defaultPrompts]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  useEffect(() => {
    fetchDefaultPrompt(activeFlow);
  }, [activeFlow, fetchDefaultPrompt]);

  // --------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const currentVersions = versions[activeFlow] || [];
  const activeVersion = currentVersions.find((v) => v.is_active);

  // --------------------------------------------------------
  // ACTIONS
  // --------------------------------------------------------

  const handleActivate = async (versionId: string) => {
    setActivating(versionId);
    setError(null);
    try {
      const res = await fetch(`/api/prompts/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, action: 'activate' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess(data.message);
      await fetchVersions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActivating(null);
    }
  };

  const handleDeactivate = async (versionId: string) => {
    setActivating(versionId);
    setError(null);
    try {
      const res = await fetch(`/api/prompts/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, action: 'deactivate' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess('Versão desativada — sistema usará prompt padrão');
      await fetchVersions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActivating(null);
    }
  };

  const handleSaveEdit = async (versionId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/prompts/${versionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          action: 'edit',
          prompt_content: editContent,
          version_name: editName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess('Prompt atualizado com sucesso');
      setEditingVersion(null);
      await fetchVersions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (!confirm('Tem certeza que deseja remover esta versão?')) return;
    setDeleting(versionId);
    setError(null);
    try {
      const res = await fetch(`/api/prompts/${versionId}?tenant_id=${tenantId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess('Versão removida');
      await fetchVersions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleCreateVersion = async () => {
    if (!newVersionContent.trim()) {
      setError('O conteúdo do prompt é obrigatório');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          flow_type: activeFlow,
          prompt_content: newVersionContent,
          version_name: newVersionName || undefined,
          activate_immediately: activateImmediately,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess(data.message);
      setShowNewForm(false);
      setNewVersionContent('');
      setNewVersionName('');
      setActivateImmediately(false);
      await fetchVersions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUseDefaultAsBase = () => {
    const defaultPrompt = defaultPrompts[activeFlow];
    if (defaultPrompt) {
      setNewVersionContent(defaultPrompt);
      setShowNewForm(true);
      setShowDefaultPrompt(false);
    }
  };

  // --------------------------------------------------------
  // RENDER
  // --------------------------------------------------------

  const base = isDark
    ? 'bg-gray-900 text-white'
    : 'bg-gray-50 text-gray-900';

  const card = isDark
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-200';

  const input = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  const textarea = `${input} font-mono text-sm`;

  return (
    <div className={`min-h-screen p-6 ${base}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Gerenciar Prompts de IA</h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Customize as instruções da IA para cada fluxo de conversa
            </p>
          </div>
        </div>
        <button
          onClick={fetchVersions}
          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          title="Atualizar"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Info banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 ${isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
          Cada fluxo tem um prompt padrão do sistema. Se você criar e ativar uma versão customizada, ela substitui o padrão.
          Desativar a versão customizada volta ao prompt padrão automaticamente.
        </p>
      </div>

      {/* Mensagens de feedback */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-700 text-sm">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4 text-green-700 text-sm">
          <Check size={14} />
          {successMsg}
        </div>
      )}

      {/* Tabs de fluxo */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FLOW_ORDER.map((flow) => {
          const config = FLOW_CONFIG[flow];
          const isActive = activeFlow === flow;
          const hasCustom = versions[flow].some((v) => v.is_active);
          return (
            <button
              key={flow}
              onClick={() => setActiveFlow(flow)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md'
                  : isDark
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span>{config.emoji}</span>
              <span>{config.label}</span>
              {hasCustom && (
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-purple-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo do fluxo ativo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda: info + status */}
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${card}`}>
            <h3 className="font-semibold mb-1">{FLOW_CONFIG[activeFlow].label}</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {FLOW_CONFIG[activeFlow].description}
            </p>
            <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status do prompt</span>
                {activeVersion ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check size={12} /> Customizado ativo
                  </span>
                ) : (
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Usando padrão do sistema
                  </span>
                )}
              </div>
              {activeVersion && (
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Versão ativa: <strong>{activeVersion.version_name}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Prompt padrão */}
          <div className={`p-4 rounded-xl border ${card}`}>
            <button
              onClick={() => {
                setShowDefaultPrompt(!showDefaultPrompt);
                fetchDefaultPrompt(activeFlow);
              }}
              className="flex items-center justify-between w-full text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-purple-500" />
                Prompt padrão do sistema
              </span>
              {showDefaultPrompt ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showDefaultPrompt && (
              <div className="mt-3">
                {defaultPrompts[activeFlow] ? (
                  <>
                    <pre className={`text-xs p-3 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                      {defaultPrompts[activeFlow]}
                    </pre>
                    <button
                      onClick={handleUseDefaultAsBase}
                      className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Usar como base para customização →
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                    <Loader2 size={12} className="animate-spin" />
                    Carregando...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita: versões customizadas */}
        <div className="lg:col-span-2 space-y-4">
          {/* Botão nova versão */}
          {!showNewForm && (
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <Plus size={16} />
              Nova versão customizada
            </button>
          )}

          {/* Formulário nova versão */}
          {showNewForm && (
            <div className={`p-4 rounded-xl border-2 border-purple-500 ${card}`}>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Plus size={16} className="text-purple-500" />
                Nova versão — {FLOW_CONFIG[activeFlow].label}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Nome da versão (opcional)
                  </label>
                  <input
                    type="text"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    placeholder="Ex: v2 - Tom mais formal"
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${input}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Conteúdo do prompt *
                  </label>
                  <textarea
                    value={newVersionContent}
                    onChange={(e) => setNewVersionContent(e.target.value)}
                    rows={12}
                    placeholder="Escreva as instruções para a IA neste fluxo..."
                    className={`w-full px-3 py-2 rounded-lg border resize-y ${textarea}`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activate-immediately"
                    checked={activateImmediately}
                    onChange={(e) => setActivateImmediately(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="activate-immediately" className="text-sm">
                    Ativar imediatamente
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateVersion}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Salvar versão
                  </button>
                  <button
                    onClick={() => { setShowNewForm(false); setNewVersionContent(''); setNewVersionName(''); }}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de versões */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-purple-500" />
            </div>
          ) : currentVersions.length === 0 ? (
            <div className={`p-8 rounded-xl border text-center ${card}`}>
              <Bot size={32} className={`mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Nenhuma versão customizada
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                A IA está usando o prompt padrão do sistema para este fluxo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentVersions.map((version) => (
                <div
                  key={version.id}
                  className={`rounded-xl border transition-all ${card} ${
                    version.is_active ? 'border-green-500 ring-1 ring-green-500/30' : ''
                  }`}
                >
                  {/* Header da versão */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {version.is_active && (
                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          <Check size={10} /> Ativa
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-sm">{version.version_name}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Criada em {new Date(version.created_at).toLocaleDateString('pt-BR')}
                          {version.activated_at && ` · Ativada em ${new Date(version.activated_at).toLocaleDateString('pt-BR')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Expandir */}
                      <button
                        onClick={() => setExpandedVersion(expandedVersion === version.id ? null : version.id)}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="Ver conteúdo"
                      >
                        {expandedVersion === version.id ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      {/* Editar */}
                      <button
                        onClick={() => {
                          setEditingVersion(version.id);
                          setEditContent(version.prompt_content);
                          setEditName(version.version_name);
                          setExpandedVersion(null);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="Editar"
                      >
                        <Edit3 size={14} />
                      </button>
                      {/* Ativar/Desativar */}
                      {version.is_active ? (
                        <button
                          onClick={() => handleDeactivate(version.id)}
                          disabled={activating === version.id}
                          className={`p-1.5 rounded-lg text-green-600 transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-green-50'}`}
                          title="Desativar"
                        >
                          {activating === version.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(version.id)}
                          disabled={activating === version.id}
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                          title="Ativar esta versão"
                        >
                          {activating === version.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                      )}
                      {/* Deletar */}
                      {!version.is_active && (
                        <button
                          onClick={() => handleDelete(version.id)}
                          disabled={deleting === version.id}
                          className={`p-1.5 rounded-lg text-red-500 transition-colors ${isDark ? 'hover:bg-gray-700' : 'hover:bg-red-50'}`}
                          title="Remover versão"
                        >
                          {deleting === version.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo expandido */}
                  {expandedVersion === version.id && editingVersion !== version.id && (
                    <div className={`px-4 pb-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      <pre className={`text-xs p-3 rounded-lg mt-3 overflow-auto max-h-64 whitespace-pre-wrap ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                        {version.prompt_content}
                      </pre>
                    </div>
                  )}

                  {/* Editor inline */}
                  {editingVersion === version.id && (
                    <div className={`px-4 pb-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      <div className="space-y-3 mt-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nome da versão"
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${input}`}
                        />
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={12}
                          className={`w-full px-3 py-2 rounded-lg border resize-y ${textarea}`}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(version.id)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                          >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Salvar alterações
                          </button>
                          <button
                            onClick={() => setEditingVersion(null)}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptManager;
