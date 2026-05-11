'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Plus, Users, FileSpreadsheet, ChevronRight, ChevronLeft,
  Loader2, Download, AlertCircle, Search, X, Check, Clock,
  MessageSquare, FileText, BarChart3, Eye, RefreshCw, Trash2,
  CheckCircle, XCircle, Phone, Upload, Zap, GitBranch, Settings2,
  CalendarDays, RotateCcw, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── TIPOS ─────────────────────────────────────────────────────────────────────

interface DispatchContact {
  id: string;
  name: string;
  phone: string;
  status: string;
  error_message?: string;
  sent_at?: string;
}

interface Campaign {
  id: string;
  name: string;
  type: 'form' | 'nps';
  status: string;
  total_contacts: number;
  sent_count: number;
  delivered_count: number;
  responded_count: number;
  failed_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  message_template: string;
}

interface Form {
  id: string;
  name: string;
}

interface NpsCampaign {
  id: string;
  name: string;
}

interface Recipient {
  id: string;
  name: string;
  phone: string;
  source: 'existing' | 'csv' | 'manual';
  lead_id?: string;
}

// Configuração de fluxo por cliente (ou geral)
interface FlowConfig {
  step1_confirmation: boolean;       // Confirmação de consulta
  step1_datetime: string;            // Data/hora da consulta (obrigatório se step1 ativo)
  step2_anamnese: boolean;           // Solicitação de anamnese
  step3_insistence: boolean;         // Insistência se não respondeu
  step3_days: number;                // Dias para reenviar
  step3_max_times: number;           // Máximo de tentativas
  step4_postsale: boolean;           // Pós-venda (aguarda confirmação do usuário)
  postsale_nps_id: string;           // ID da pesquisa NPS para pós-venda
}

const defaultFlowConfig: FlowConfig = {
  step1_confirmation: true,
  step1_datetime: '',
  step2_anamnese: true,
  step3_insistence: true,
  step3_days: 2,
  step3_max_times: 2,
  step4_postsale: true,
  postsale_nps_id: '',
};

type Step = 'list' | 'new-step1' | 'new-step2' | 'new-step2b' | 'new-step3' | 'sending' | 'done';
type OriginTab = 'existing' | 'csv' | 'manual';
type FlowMode = 'general' | 'individual';

// ─── COMPONENTE DE DETALHES DA CAMPANHA ──────────────────────────────────────

function CampaignDetail({ campaign, tenantId }: { campaign: Campaign; tenantId: string }) {
  const [contacts, setContacts] = useState<DispatchContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('dispatch_contacts')
        .select('id, name, phone, status, error_message, sent_at')
        .eq('campaign_id', campaign.id)
        .order('sent_at', { ascending: true });
      setContacts(data || []);
      setLoading(false);
    }
    load();
  }, [campaign.id]);

  const statusIcon = (s: string) => {
    if (s === 'sent' || s === 'delivered') return <CheckCircle size={14} className="text-green-500" />;
    if (s === 'failed') return <XCircle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-gray-400" />;
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100" onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total', value: campaign.total_contacts || 0, color: 'text-gray-700' },
          { label: 'Enviados', value: campaign.sent_count || 0, color: 'text-blue-600' },
          { label: 'Responderam', value: campaign.responded_count || 0, color: 'text-green-600' },
          { label: 'Falhas', value: campaign.failed_count || 0, color: 'text-red-600' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
          <Loader2 size={14} className="animate-spin" /> Carregando contatos...
        </div>
      ) : contacts.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">Nenhum contato registrado.</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {contacts.map(ct => (
            <div key={ct.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2">
                {statusIcon(ct.status)}
                <div>
                  <span className="text-sm font-medium text-gray-800">{ct.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{ct.phone}</span>
                </div>
              </div>
              <div className="text-right">
                {ct.error_message ? (
                  <span className="text-xs text-red-500 max-w-[200px] truncate block" title={ct.error_message}>
                    {ct.error_message}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">
                    {ct.sent_at ? new Date(ct.sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TOGGLE COMPONENT ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-purple-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── FLOW CONFIG PANEL ────────────────────────────────────────────────────────

function FlowConfigPanel({
  config,
  onChange,
  npsList,
  recipientName,
}: {
  config: FlowConfig;
  onChange: (c: FlowConfig) => void;
  npsList: NpsCampaign[];
  recipientName?: string;
}) {
  const set = (patch: Partial<FlowConfig>) => onChange({ ...config, ...patch });

  return (
    <div className="space-y-4">
      {recipientName && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-xs flex-shrink-0">
            {recipientName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-gray-800">{recipientName}</span>
        </div>
      )}

      {/* Etapa 1 — Confirmação de consulta */}
      <div className={`rounded-xl border p-4 transition-all ${config.step1_confirmation ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className={config.step1_confirmation ? 'text-purple-600' : 'text-gray-400'} />
            <span className="text-sm font-semibold text-gray-800">Confirmação de consulta</span>
          </div>
          <Toggle checked={config.step1_confirmation} onChange={v => set({ step1_confirmation: v })} />
        </div>
        {config.step1_confirmation && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Data e hora da consulta <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={config.step1_datetime}
              onChange={e => set({ step1_datetime: e.target.value })}
              className="w-full border border-purple-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>
        )}
      </div>

      {/* Etapa 2 — Anamnese */}
      <div className={`rounded-xl border p-4 transition-all ${config.step2_anamnese ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className={config.step2_anamnese ? 'text-blue-600' : 'text-gray-400'} />
            <span className="text-sm font-semibold text-gray-800">Solicitação de anamnese</span>
          </div>
          <Toggle checked={config.step2_anamnese} onChange={v => set({ step2_anamnese: v })} />
        </div>
        {config.step2_anamnese && (
          <p className="text-xs text-blue-600 mt-2">Enviará o link do formulário selecionado para preenchimento.</p>
        )}
      </div>

      {/* Etapa 3 — Insistência */}
      <div className={`rounded-xl border p-4 transition-all ${config.step3_insistence ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <RotateCcw size={16} className={config.step3_insistence ? 'text-amber-600' : 'text-gray-400'} />
            <span className="text-sm font-semibold text-gray-800">Insistência automática</span>
          </div>
          <Toggle checked={config.step3_insistence} onChange={v => set({ step3_insistence: v })} />
        </div>
        {config.step3_insistence && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reenviar após (dias)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={config.step3_days}
                onChange={e => set({ step3_days: parseInt(e.target.value) || 1 })}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Máximo de tentativas</label>
              <input
                type="number"
                min={1}
                max={10}
                value={config.step3_max_times}
                onChange={e => set({ step3_max_times: parseInt(e.target.value) || 1 })}
                className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Etapa 4 — Pós-venda */}
      <div className={`rounded-xl border p-4 transition-all ${config.step4_postsale ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className={config.step4_postsale ? 'text-green-600' : 'text-gray-400'} />
            <span className="text-sm font-semibold text-gray-800">Pós-venda (NPS)</span>
          </div>
          <Toggle checked={config.step4_postsale} onChange={v => set({ step4_postsale: v })} />
        </div>
        {config.step4_postsale && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-green-700">Aguarda sua confirmação de que a consulta foi realizada antes de enviar.</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pesquisa NPS para enviar</label>
              <select
                value={config.postsale_nps_id}
                onChange={e => set({ postsale_nps_id: e.target.value })}
                className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">Selecionar pesquisa...</option>
                {npsList.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface DispatchesProps {
  tenantId: string;
  actionsModule?: 'none' | 'simplified' | 'complete';
  npsCampaignsList?: NpsCampaign[];
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

const Dispatches: React.FC<DispatchesProps> = ({ tenantId, actionsModule = 'none', npsCampaignsList = [] }) => {
  const [step, setStep] = useState<Step>('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Step 1 — configuração
  const [dispatchName, setDispatchName] = useState('');
  const [dispatchType, setDispatchType] = useState<'form' | 'nps'>('form');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [selectedNpsId, setSelectedNpsId] = useState('');
  const [forms, setForms] = useState<Form[]>([]);
  const [npsCampaigns, setNpsCampaigns] = useState<NpsCampaign[]>([]);
  const [messageTemplate, setMessageTemplate] = useState('');

  // Step 2 — destinatários
  const [originTab, setOriginTab] = useState<OriginTab>('existing');
  const [existingLeads, setExistingLeads] = useState<Recipient[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [csvContacts, setCsvContacts] = useState<Recipient[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2b — configuração de fluxo (apenas para módulo simplificado)
  const [flowMode, setFlowMode] = useState<FlowMode>('general');
  const [generalFlow, setGeneralFlow] = useState<FlowConfig>({ ...defaultFlowConfig });
  const [individualFlows, setIndividualFlows] = useState<Record<string, FlowConfig>>({});
  const [expandedRecipient, setExpandedRecipient] = useState<string | null>(null);

  // Step 3 — revisão e envio
  const [sendResults, setSendResults] = useState<{ name: string; phone: string; ok: boolean; error?: string }[]>([]);
  const [sendingIndex, setSendingIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const isSimplified = actionsModule === 'simplified';

  // Carregar campanhas de disparo
  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const { data } = await supabase
        .from('dispatch_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      setCampaigns(data || []);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [tenantId]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // Carregar formulários e NPS
  useEffect(() => {
    if (step !== 'new-step1') return;
    const load = async () => {
      const [{ data: f }, { data: n }] = await Promise.all([
        supabase.from('forms').select('id, name').eq('tenant_id', tenantId),
        supabase.from('campaigns').select('id, name').eq('tenant_id', tenantId).is('deleted_at', null),
      ]);
      setForms(f || []);
      setNpsCampaigns(n || []);
      if (!messageTemplate) {
        setMessageTemplate('Olá {{nome}}! 😊 Gostaríamos muito de contar com sua opinião. Acesse o link abaixo e leva menos de 2 minutos: {{link}}');
      }
    };
    load();
  }, [step, tenantId]);

  // Carregar leads existentes
  useEffect(() => {
    if (originTab !== 'existing' || step !== 'new-step2') return;
    const load = async () => {
      setLoadingLeads(true);
      try {
        const { data } = await supabase
          .from('leads')
          .select('id, name, phone')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .not('phone', 'is', null)
          .order('created_at', { ascending: false });
        setExistingLeads((data || []).map(l => ({
          id: l.id,
          name: l.name || 'Sem nome',
          phone: l.phone || '',
          source: 'existing' as const,
          lead_id: l.id,
        })));
      } finally {
        setLoadingLeads(false);
      }
    };
    load();
  }, [originTab, step, tenantId]);

  // Inicializar fluxos individuais quando entrar no step 2b
  useEffect(() => {
    if (step !== 'new-step2b') return;
    const newIndividual: Record<string, FlowConfig> = {};
    allRecipients.forEach(r => {
      if (!individualFlows[r.id]) {
        newIndividual[r.id] = { ...generalFlow };
      }
    });
    if (Object.keys(newIndividual).length > 0) {
      setIndividualFlows(prev => ({ ...prev, ...newIndividual }));
    }
  }, [step]);

  // Todos os destinatários selecionados
  const allRecipients: Recipient[] = [
    ...existingLeads.filter(l => selectedIds.has(l.id)),
    ...csvContacts,
    ...(manualName && manualPhone ? [{ id: 'manual', name: manualName, phone: manualPhone, source: 'manual' as const }] : []),
  ];

  const filteredLeads = existingLeads.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone.includes(searchQuery)
  );

  // Normalizar telefone
  const normalizePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return digits;
  };

  // Formatar telefone para exibição
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)})${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7)}`;
    return digits;
  };

  // Importar CSV
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      const contacts: Recipient[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ''));
        const name = cols[0] || '';
        const phone = cols[1] || '';
        if (name && phone) {
          contacts.push({ id: `csv-${i}`, name, phone: phone.replace(/\D/g, ''), source: 'csv' });
        }
      }
      setCsvContacts(contacts);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = 'nome,telefone\nJoão Silva,51999999999\nMaria Souza,47988888888';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_disparo.csv';
    a.click();
  };

  // Obter link do formulário/NPS
  const getLink = (npsId?: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://hellogrowth.com.br';
    if (dispatchType === 'form' && selectedFormId) return `${base}/form/${selectedFormId}`;
    const nId = npsId || selectedNpsId;
    if (dispatchType === 'nps' && nId) return `${base}/nps/${nId}`;
    return `${base}/form/link`;
  };

  // Validar fluxo antes de avançar
  const isFlowValid = () => {
    if (!isSimplified) return true;
    if (flowMode === 'general') {
      if (generalFlow.step1_confirmation && !generalFlow.step1_datetime) return false;
    } else {
      for (const r of allRecipients) {
        const fc = individualFlows[r.id] || generalFlow;
        if (fc.step1_confirmation && !fc.step1_datetime) return false;
      }
    }
    return true;
  };

  // Enviar campanha
  const handleSend = async () => {
    if (allRecipients.length === 0) return;
    setIsSending(true);
    setSendingIndex(0);
    setSendResults([]);
    setStep('sending');

    // Criar campanha no banco
    const { data: campaign } = await supabase
      .from('dispatch_campaigns')
      .insert({
        tenant_id: tenantId,
        name: dispatchName || `Disparo ${new Date().toLocaleDateString('pt-BR')}`,
        type: dispatchType,
        form_id: dispatchType === 'form' ? selectedFormId || null : null,
        nps_campaign_id: dispatchType === 'nps' ? selectedNpsId || null : null,
        message_template: messageTemplate,
        status: 'sending',
        origin: csvContacts.length > 0 ? 'csv' : 'existing',
        total_contacts: allRecipients.length,
        started_at: new Date().toISOString(),
        flow_mode: isSimplified ? flowMode : null,
        flow_config: isSimplified ? (flowMode === 'general' ? generalFlow : null) : null,
      })
      .select()
      .single();

    const campaignId = campaign?.id;
    const link = getLink();
    const results: { name: string; phone: string; ok: boolean; error?: string }[] = [];

    for (let i = 0; i < allRecipients.length; i++) {
      const recipient = allRecipients[i];
      setSendingIndex(i);

      const phone = normalizePhone(recipient.phone);

      // Fluxo individual para este destinatário
      const recipientFlow = isSimplified
        ? (flowMode === 'individual' ? (individualFlows[recipient.id] || generalFlow) : generalFlow)
        : null;

      // Determinar mensagem correta baseada no fluxo
      let firstMessage: string;
      if (isSimplified && recipientFlow?.step1_confirmation) {
        // Primeira etapa é confirmação de consulta — sem link
        const dt = recipientFlow.step1_datetime
          ? new Date(recipientFlow.step1_datetime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '';
        firstMessage = `Olá ${recipient.name.split(' ')[0]}! 😊 Gostaríamos de confirmar sua consulta${dt ? ` agendada para ${dt}` : ''}. Você confirma sua presença? Responda SIM ou NÃO.`;
      } else {
        // Mensagem padrão com link do formulário/NPS
        firstMessage = messageTemplate
          .replace(/\{\{nome\}\}/gi, recipient.name.split(' ')[0])
          .replace(/\{\{link\}\}/gi, link);
      }

      try {
        const res = await fetch('/api/whatsapp/send-dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            phone,
            message: firstMessage,
            recipientName: recipient.name,
            leadId: recipient.lead_id,
            campaignId,
            dispatchType,
            formId: selectedFormId || null,
            npsId: selectedNpsId || null,
          }),
        });
        const data = await res.json();
        results.push({ name: recipient.name, phone, ok: data.ok || res.ok, error: data.error });

        // Salvar contato no banco
        if (campaignId) {
          await supabase.from('dispatch_contacts').insert({
            campaign_id: campaignId,
            tenant_id: tenantId,
            name: recipient.name,
            phone,
            lead_id: recipient.lead_id || null,
            status: data.ok ? 'sent' : 'failed',
            wa_message_id: data.waMessageId || null,
            sent_at: new Date().toISOString(),
            error_message: data.error || null,
          });

          // Fluxo simplificado: salvar config e criar ai_conversation para Fila de Ações
          if (isSimplified && recipientFlow) {
            const firstStep = recipientFlow.step1_confirmation ? 'confirmation'
              : recipientFlow.step2_anamnese ? 'presale'
              : recipientFlow.step4_postsale ? 'postsale_pending'
              : 'done';

            await supabase.from('dispatch_flow_configs').insert({
              dispatch_campaign_id: campaignId,
              tenant_id: tenantId,
              contact_phone: phone,
              contact_name: recipient.name,
              lead_id: recipient.lead_id || null,
              flow_config: recipientFlow,
              current_step: firstStep,
              status: 'active',
            });

            // Criar entrada na Fila de Ações (ai_conversations)
            const { data: convData } = await supabase.from('ai_conversations').insert({
              tenant_id: tenantId,
              contact_name: recipient.name,
              contact_phone: phone,
              status: 'active',
              flow_type: 'pre_sale',
              module_type: 'simplified',
              dispatch_campaign_id: campaignId,
              trigger_type: 'dispatch',
              triggered_by: 'dispatch',
              flow_step: firstStep,
              flow_step_status: 'waiting_client',
              flow_step_updated_at: new Date().toISOString(),
              appointment_datetime: recipientFlow.step1_confirmation && recipientFlow.step1_datetime
                ? new Date(recipientFlow.step1_datetime).toISOString()
                : null,
              last_message_at: new Date().toISOString(),
            }).select('id').single();

            // Registrar mensagem enviada em ai_conversation_messages
            if (convData?.id) {
              await supabase.from('ai_conversation_messages').insert({
                conversation_id: convData.id,
                direction: 'outbound',
                content: firstMessage,
                status: data.ok ? 'sent' : 'failed',
                wa_message_id: data.waMessageId || null,
                sent_at: new Date().toISOString(),
              });
            }
          }
        }
      } catch (err: any) {
        results.push({ name: recipient.name, phone, ok: false, error: err.message });
      }

      setSendResults([...results]);
      if (i < allRecipients.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Atualizar campanha com resultados
    if (campaignId) {
      const sentCount = results.filter(r => r.ok).length;
      const failedCount = results.filter(r => !r.ok).length;
      await supabase
        .from('dispatch_campaigns')
        .update({
          status: 'completed',
          sent_count: sentCount,
          failed_count: failedCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', campaignId);
    }

    setIsSending(false);
    setStep('done');
    loadCampaigns();
  };

  const resetForm = () => {
    setDispatchName('');
    setDispatchType('form');
    setSelectedFormId('');
    setSelectedNpsId('');
    setMessageTemplate('');
    setSelectedIds(new Set());
    setCsvContacts([]);
    setManualName('');
    setManualPhone('');
    setSendResults([]);
    setOriginTab('existing');
    setFlowMode('general');
    setGeneralFlow({ ...defaultFlowConfig });
    setIndividualFlows({});
    setExpandedRecipient(null);
    setStep('list');
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return 'text-green-600 bg-green-50';
    if (status === 'sending') return 'text-blue-600 bg-blue-50';
    if (status === 'draft') return 'text-gray-600 bg-gray-100';
    return 'text-gray-600 bg-gray-100';
  };

  const statusLabel = (status: string) => {
    if (status === 'completed') return 'Concluído';
    if (status === 'sending') return 'Enviando...';
    if (status === 'draft') return 'Rascunho';
    return status;
  };

  // ─── TELA: LISTA DE CAMPANHAS ───────────────────────────────────────────────
  if (step === 'list') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Disparos</h1>
            <p className="text-gray-500 text-sm mt-1">Envie formulários e pesquisas NPS para clientes via WhatsApp</p>
          </div>
          <button
            onClick={() => setStep('new-step1')}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
          >
            <Plus size={18} /> Nova Campanha
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total de Campanhas', value: campaigns.length, color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Concluídas', value: campaigns.filter(c => c.status === 'completed').length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total Enviados', value: campaigns.reduce((a, c) => a + (c.sent_count || 0), 0), color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Respondidos', value: campaigns.reduce((a, c) => a + (c.responded_count || 0), 0), color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl p-4`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Lista */}
        {loadingCampaigns ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-purple-600" size={32} />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16">
            <Send size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Nenhum disparo realizado ainda</p>
            <button onClick={() => setStep('new-step1')} className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium">
              Criar primeiro disparo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-purple-300 transition"
                onClick={() => setSelectedCampaign(selectedCampaign?.id === c.id ? null : c)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Send size={18} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                    <div className="text-right text-xs text-gray-500">
                      <div>{c.sent_count || 0} enviados</div>
                      <div>{c.responded_count || 0} responderam</div>
                    </div>
                  </div>
                </div>
                {selectedCampaign?.id === c.id && (
                  <CampaignDetail campaign={c} tenantId={tenantId} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── STEP 1: CONFIGURAÇÃO ──────────────────────────────────────────────────
  if (step === 'new-step1') {
    const stepsCount = isSimplified ? 4 : 3;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => setStep('list')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ChevronLeft size={16} /> Voltar
        </button>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">1</div>
          {Array.from({ length: stepsCount - 1 }).map((_, i) => (
            <React.Fragment key={i}>
              <div className="flex-1 h-1 bg-gray-200 rounded"><div className="h-1 bg-gray-200 rounded" /></div>
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm font-bold">{i + 2}</div>
            </React.Fragment>
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Configurar disparo</h2>
        <p className="text-gray-500 text-sm mb-6">Defina o nome, tipo e mensagem do disparo</p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do disparo</label>
            <input
              type="text"
              value={dispatchName}
              onChange={e => setDispatchName(e.target.value)}
              placeholder="Ex: Anamnese Junho 2025"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de conteúdo</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'form', label: 'Formulário', icon: <FileText size={20} />, desc: 'Anamnese, cadastro, etc.' },
                { id: 'nps', label: 'Pesquisa NPS', icon: <BarChart3 size={20} />, desc: 'Avaliação pós-consulta' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setDispatchType(t.id as 'form' | 'nps')}
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    dispatchType === t.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`mb-2 ${dispatchType === t.id ? 'text-purple-600' : 'text-gray-400'}`}>{t.icon}</div>
                  <div className="font-medium text-gray-900 text-sm">{t.label}</div>
                  <div className="text-xs text-gray-500">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {dispatchType === 'form' ? 'Formulário' : 'Pesquisa NPS'}
            </label>
            <select
              value={dispatchType === 'form' ? selectedFormId : selectedNpsId}
              onChange={e => dispatchType === 'form' ? setSelectedFormId(e.target.value) : setSelectedNpsId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Selecionar...</option>
              {(dispatchType === 'form' ? forms : npsCampaigns).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea
              rows={4}
              value={messageTemplate}
              onChange={e => setMessageTemplate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Olá {{nome}}! Gostaríamos de sua opinião. Acesse: {{link}}"
            />
            <p className="text-xs text-gray-400 mt-1">Use <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code> para o primeiro nome e <code className="bg-gray-100 px-1 rounded">{'{{link}}'}</code> para o link</p>
          </div>

          {messageTemplate && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2 font-medium">Pré-visualização:</p>
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                {messageTemplate
                  .replace(/\{\{nome\}\}/gi, 'João')
                  .replace(/\{\{link\}\}/gi, getLink().substring(0, 40) + '...')}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => setStep('new-step2')}
            disabled={!messageTemplate || (dispatchType === 'form' ? !selectedFormId : !selectedNpsId)}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo: Destinatários <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 2: DESTINATÁRIOS ─────────────────────────────────────────────────
  if (step === 'new-step2') {
    const stepsCount = isSimplified ? 4 : 3;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => setStep('new-step1')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ChevronLeft size={16} /> Voltar
        </button>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold"><Check size={14} /></div>
          <div className="flex-1 h-1 bg-purple-600 rounded" />
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">2</div>
          {isSimplified && (
            <>
              <div className="flex-1 h-1 bg-gray-200 rounded" />
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm font-bold">3</div>
            </>
          )}
          <div className="flex-1 h-1 bg-gray-200 rounded" />
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm font-bold">{stepsCount}</div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Selecionar destinatários</h2>
        <p className="text-gray-500 text-sm mb-6">
          {allRecipients.length > 0
            ? <span className="font-semibold text-purple-600">{allRecipients.length} contato{allRecipients.length > 1 ? 's' : ''} selecionado{allRecipients.length > 1 ? 's' : ''}</span>
            : 'Escolha de onde virão os contatos'}
        </p>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: 'existing', label: 'Clientes do sistema', icon: <Users size={14} /> },
            { id: 'csv', label: 'Importar CSV', icon: <FileSpreadsheet size={14} /> },
            { id: 'manual', label: 'Adicionar manualmente', icon: <Plus size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setOriginTab(tab.id as OriginTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition ${
                originTab === tab.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Clientes do sistema */}
        {originTab === 'existing' && (
          <div>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {loadingLeads ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-purple-600" size={24} />
              </div>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {filteredLeads.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">Nenhum cliente encontrado</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">{filteredLeads.length} clientes</span>
                      <button
                        onClick={() => {
                          if (selectedIds.size === filteredLeads.length) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(filteredLeads.map(l => l.id)));
                          }
                        }}
                        className="text-xs text-purple-600 hover:underline"
                      >
                        {selectedIds.size === filteredLeads.length ? 'Desmarcar todos' : 'Selecionar todos'}
                      </button>
                    </div>
                    {filteredLeads.map(lead => (
                      <div
                        key={lead.id}
                        onClick={() => {
                          const next = new Set(selectedIds);
                          if (next.has(lead.id)) next.delete(lead.id);
                          else next.add(lead.id);
                          setSelectedIds(next);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                          selectedIds.has(lead.id) ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedIds.has(lead.id) ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                        }`}>
                          {selectedIds.has(lead.id) && <Check size={12} className="text-white" />}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm flex-shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{lead.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone size={10} /> {lead.phone}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Importar CSV */}
        {originTab === 'csv' && (
          <div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-4">
              <FileSpreadsheet size={36} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-3">Arraste um arquivo CSV ou clique para selecionar</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition font-medium"
                >
                  <Upload size={14} className="inline mr-1" /> Selecionar arquivo
                </button>
                <button
                  onClick={downloadTemplate}
                  className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  <Download size={14} className="inline mr-1" /> Baixar modelo
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleCSVImport} />
            </div>
            {csvContacts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">
                    <CheckCircle size={14} className="inline mr-1" />
                    {csvContacts.length} contatos importados
                  </span>
                  <button onClick={() => setCsvContacts([])} className="text-xs text-red-500 hover:underline">Remover</button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {csvContacts.slice(0, 10).map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg text-sm">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-xs flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="text-gray-500 text-xs">{c.phone}</span>
                    </div>
                  ))}
                  {csvContacts.length > 10 && (
                    <p className="text-xs text-gray-500 text-center py-1">+ {csvContacts.length - 10} mais</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Adicionar manualmente */}
        {originTab === 'manual' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  placeholder="João Silva"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={e => setManualPhone(formatPhone(e.target.value))}
                  placeholder="(51)99999-9999"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            {manualName && manualPhone && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <CheckCircle size={16} className="text-purple-600" />
                <span className="text-sm text-purple-700">{manualName} — {manualPhone} será adicionado ao disparo</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <button onClick={() => setStep('new-step1')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm">
            <ChevronLeft size={16} /> Voltar
          </button>
          <button
            onClick={() => isSimplified ? setStep('new-step2b') : setStep('new-step3')}
            disabled={allRecipients.length === 0}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSimplified ? 'Próximo: Fluxo' : `Próximo: Revisar (${allRecipients.length})`} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 2B: CONFIGURAÇÃO DE FLUXO (APENAS MÓDULO SIMPLIFICADO) ──────────
  if (step === 'new-step2b') {
    const availableNps = npsCampaigns.length > 0 ? npsCampaigns : npsCampaignsList;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => setStep('new-step2')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ChevronLeft size={16} /> Voltar
        </button>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold"><Check size={14} /></div>
          <div className="flex-1 h-1 bg-purple-600 rounded" />
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold"><Check size={14} /></div>
          <div className="flex-1 h-1 bg-purple-600 rounded" />
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">3</div>
          <div className="flex-1 h-1 bg-gray-200 rounded" />
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm font-bold">4</div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <GitBranch size={20} className="text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Configurar fluxo de acompanhamento</h2>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Defina as etapas de comunicação para os {allRecipients.length} destinatário{allRecipients.length > 1 ? 's' : ''} selecionado{allRecipients.length > 1 ? 's' : ''}
        </p>

        {/* Modo: geral ou individual */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: 'general', label: 'Fluxo geral', icon: <Users size={14} />, desc: 'Mesmo fluxo para todos' },
            { id: 'individual', label: 'Personalizado', icon: <Settings2 size={14} />, desc: 'Fluxo por cliente' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setFlowMode(m.id as FlowMode)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition ${
                flowMode === m.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Fluxo geral */}
        {flowMode === 'general' && (
          <FlowConfigPanel
            config={generalFlow}
            onChange={setGeneralFlow}
            npsList={availableNps}
          />
        )}

        {/* Fluxo individual */}
        {flowMode === 'individual' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 mb-4">
              <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Cada cliente começa com o fluxo padrão. Clique em um cliente para personalizar seu fluxo individualmente.
              </p>
            </div>
            {allRecipients.map(r => {
              const flow = individualFlows[r.id] || generalFlow;
              const isExpanded = expandedRecipient === r.id;
              const activeSteps = [
                flow.step1_confirmation && 'Confirmação',
                flow.step2_anamnese && 'Anamnese',
                flow.step3_insistence && 'Insistência',
                flow.step4_postsale && 'Pós-venda',
              ].filter(Boolean);
              return (
                <div key={r.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
                    onClick={() => setExpandedRecipient(isExpanded ? null : r.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm flex-shrink-0">
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900 text-sm">{r.name}</div>
                        <div className="text-xs text-gray-500">{activeSteps.length} etapa{activeSteps.length !== 1 ? 's' : ''} ativa{activeSteps.length !== 1 ? 's' : ''}: {activeSteps.join(', ')}</div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-gray-100">
                      <FlowConfigPanel
                        config={flow}
                        onChange={newConfig => setIndividualFlows(prev => ({ ...prev, [r.id]: newConfig }))}
                        npsList={availableNps}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Validação */}
        {!isFlowValid() && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">
              Preencha a data e hora da consulta para todos os clientes com confirmação ativada.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <button onClick={() => setStep('new-step2')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm">
            <ChevronLeft size={16} /> Voltar
          </button>
          <button
            onClick={() => setStep('new-step3')}
            disabled={!isFlowValid()}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo: Revisar ({allRecipients.length}) <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP 3: REVISÃO ───────────────────────────────────────────────────────
  if (step === 'new-step3') {
    const stepsCount = isSimplified ? 4 : 3;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => isSimplified ? setStep('new-step2b') : setStep('new-step2')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ChevronLeft size={16} /> Voltar
        </button>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          {Array.from({ length: stepsCount }).map((_, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="flex-1 h-1 bg-purple-600 rounded" />}
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
                {i < stepsCount - 1 ? <Check size={14} /> : stepsCount}
              </div>
            </React.Fragment>
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-6">Revisar e disparar</h2>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Campanha</span>
            <span className="font-medium text-gray-900">{dispatchName || 'Sem nome'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tipo</span>
            <span className="font-medium text-gray-900">{dispatchType === 'form' ? 'Formulário' : 'Pesquisa NPS'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Destinatários</span>
            <span className="font-semibold text-purple-700">{allRecipients.length} contatos</span>
          </div>
          {isSimplified && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fluxo</span>
              <span className="font-medium text-gray-900">{flowMode === 'general' ? 'Geral (todos iguais)' : 'Personalizado por cliente'}</span>
            </div>
          )}
          {isSimplified && flowMode === 'general' && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">Etapas ativas:</p>
              <div className="flex flex-wrap gap-2">
                {generalFlow.step1_confirmation && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    Confirmação — {generalFlow.step1_datetime ? new Date(generalFlow.step1_datetime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'sem data'}
                  </span>
                )}
                {generalFlow.step2_anamnese && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Anamnese</span>}
                {generalFlow.step3_insistence && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Insistência ({generalFlow.step3_days}d × {generalFlow.step3_max_times}x)</span>}
                {generalFlow.step4_postsale && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Pós-venda</span>}
              </div>
            </div>
          )}
        </div>

        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-2">Mensagem que será enviada:</p>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
            {messageTemplate
              .replace(/\{\{nome\}\}/gi, allRecipients[0]?.name.split(' ')[0] || 'João')
              .replace(/\{\{link\}\}/gi, getLink())}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Lista de contatos:</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {allRecipients.slice(0, 20).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1.5 px-3 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-xs flex-shrink-0">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-gray-900">{r.name}</span>
                <span className="text-gray-400 text-xs ml-auto">{r.phone}</span>
              </div>
            ))}
            {allRecipients.length > 20 && (
              <p className="text-xs text-gray-500 text-center py-1">+ {allRecipients.length - 20} mais</p>
            )}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Serão enviadas <strong>{allRecipients.length} mensagens</strong> via WhatsApp com intervalo de 1,5s entre cada uma.
            {isSimplified && ' O fluxo de acompanhamento será iniciado automaticamente conforme as etapas configuradas.'}
          </p>
        </div>

        <div className="flex justify-between">
          <button onClick={() => isSimplified ? setStep('new-step2b') : setStep('new-step2')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm">
            <ChevronLeft size={16} /> Voltar
          </button>
          <button
            onClick={handleSend}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium"
          >
            <Send size={18} /> Disparar agora ({allRecipients.length})
          </button>
        </div>
      </div>
    );
  }

  // ─── ENVIANDO ──────────────────────────────────────────────────────────────
  if (step === 'sending') {
    const progress = allRecipients.length > 0 ? (sendResults.length / allRecipients.length) * 100 : 0;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Enviando mensagens...</h2>
        <p className="text-gray-500 text-sm mb-6">{sendResults.length} de {allRecipients.length} enviados</p>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
          <div className="bg-purple-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {sendResults.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${r.ok ? 'bg-green-50' : 'bg-red-50'}`}>
              {r.ok ? <CheckCircle size={16} className="text-green-600 flex-shrink-0" /> : <XCircle size={16} className="text-red-500 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900 text-sm">{r.name}</span>
                <span className="text-xs text-gray-500 ml-2">{r.phone}</span>
                {!r.ok && r.error && <p className="text-xs text-red-500 truncate">{r.error}</p>}
              </div>
            </div>
          ))}
          {isSending && sendResults.length < allRecipients.length && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <Loader2 size={16} className="animate-spin text-purple-600 flex-shrink-0" />
              <span className="text-sm text-gray-500">Enviando para {allRecipients[sendResults.length]?.name}...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── CONCLUÍDO ─────────────────────────────────────────────────────────────
  if (step === 'done') {
    const successCount = sendResults.filter(r => r.ok).length;
    const failedCount = sendResults.filter(r => !r.ok).length;
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Disparo concluído!</h2>
        <p className="text-gray-500 mb-6">
          <span className="text-green-600 font-semibold">{successCount} mensagens enviadas</span>
          {failedCount > 0 && <span className="text-red-500"> · {failedCount} falhas</span>}
        </p>
        {isSimplified ? (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-purple-700">
              <strong>Fluxo iniciado!</strong> O sistema acompanhará automaticamente cada cliente conforme as etapas configuradas. Acompanhe o progresso na <strong>Fila de Ações</strong>.
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-blue-700">
              <strong>Próximo passo:</strong> A IA está aguardando as respostas. Quando os clientes responderem, ela continuará a conversa automaticamente conforme o playbook configurado.
            </p>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button onClick={resetForm} className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition font-medium">
            Ver histórico
          </button>
          <button onClick={() => { resetForm(); setStep('new-step1'); }} className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition font-medium">
            Novo disparo
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default Dispatches;
