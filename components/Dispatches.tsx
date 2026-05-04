'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Plus, Users, FileSpreadsheet, ChevronRight, ChevronLeft,
  Loader2, Download, AlertCircle, Search, X, Check, Clock,
  MessageSquare, FileText, BarChart3, Eye, RefreshCw, Trash2,
  CheckCircle, XCircle, Phone, Upload, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── COMPONENTE DE DETALHES DA CAMPANHA ──────────────────────────────────────
interface DispatchContact {
  id: string;
  name: string;
  phone: string;
  status: string;
  error_message?: string;
  sent_at?: string;
}

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
      {/* Métricas */}
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
      {/* Lista de contatos */}
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

interface DispatchesProps {
  tenantId: string;
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

type Step = 'list' | 'new-step1' | 'new-step2' | 'new-step3' | 'sending' | 'done';
type OriginTab = 'existing' | 'csv' | 'manual';

const Dispatches: React.FC<DispatchesProps> = ({ tenantId }) => {
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

  // Step 3 — revisão e envio
  const [sendResults, setSendResults] = useState<{ name: string; phone: string; ok: boolean; error?: string }[]>([]);
  const [sendingIndex, setSendingIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);

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
        supabase.from('campaigns').select('id, name').eq('tenant_id', tenantId),
      ]);
      setForms(f || []);
      setNpsCampaigns(n || []);
      // Mensagem padrão
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
  const getLink = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://hellogrowth.com.br';
    if (dispatchType === 'form' && selectedFormId) return `${base}/form/${selectedFormId}`;
    if (dispatchType === 'nps' && selectedNpsId) return `${base}/nps/${selectedNpsId}`;
    return `${base}/form/link`;
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
      const personalizedMessage = messageTemplate
        .replace(/\{\{nome\}\}/gi, recipient.name.split(' ')[0])
        .replace(/\{\{link\}\}/gi, link);

      try {
        const res = await fetch('/api/whatsapp/send-dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            phone,
            message: personalizedMessage,
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
        }
      } catch (err: any) {
        results.push({ name: recipient.name, phone, ok: false, error: err.message });
      }

      setSendResults([...results]);
      // Delay entre envios (evitar spam)
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
        {campaigns.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total de campanhas', value: campaigns.length, icon: <Zap size={20} className="text-purple-600" /> },
              { label: 'Contatos enviados', value: campaigns.reduce((a, c) => a + (c.sent_count || 0), 0), icon: <Send size={20} className="text-blue-600" /> },
              { label: 'Responderam', value: campaigns.reduce((a, c) => a + (c.responded_count || 0), 0), icon: <MessageSquare size={20} className="text-green-600" /> },
              { label: 'Taxa de resposta', value: (() => {
                const sent = campaigns.reduce((a, c) => a + (c.sent_count || 0), 0);
                const resp = campaigns.reduce((a, c) => a + (c.responded_count || 0), 0);
                return sent > 0 ? `${Math.round((resp / sent) * 100)}%` : '—';
              })(), icon: <BarChart3 size={20} className="text-orange-600" /> },
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Lista */}
        {loadingCampaigns ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-purple-600" size={32} />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-16 text-center">
            <Send size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum disparo ainda</h3>
            <p className="text-gray-500 mb-6 text-sm">Crie sua primeira campanha para enviar formulários ou pesquisas NPS via WhatsApp</p>
            <button
              onClick={() => setStep('new-step1')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
            >
              Criar primeiro disparo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition cursor-pointer"
                onClick={() => setSelectedCampaign(selectedCampaign?.id === c.id ? null : c)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${c.type === 'form' ? 'bg-blue-50' : 'bg-green-50'}`}>
                      {c.type === 'form' ? <FileText size={18} className="text-blue-600" /> : <BarChart3 size={18} className="text-green-600" />}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.type === 'form' ? 'Formulário' : 'Pesquisa NPS'} •{' '}
                        {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="font-semibold text-gray-900">{c.sent_count || 0}/{c.total_contacts || 0}</div>
                      <div className="text-xs text-gray-500">enviados</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
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
    const selectedItem = dispatchType === 'form'
      ? forms.find(f => f.id === selectedFormId)
      : npsCampaigns.find(n => n.id === selectedNpsId);

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={resetForm} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ChevronLeft size={16} /> Voltar para Disparos
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">1</div>
          <div className="flex-1 h-1 bg-gray-200 rounded"><div className="h-1 bg-purple-600 rounded w-1/3" /></div>
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm font-bold">2</div>
          <div className="flex-1 h-1 bg-gray-200 rounded" />
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm font-bold">3</div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-6">Configurar disparo</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da campanha</label>
            <input
              type="text"
              value={dispatchName}
              onChange={e => setDispatchName(e.target.value)}
              placeholder="Ex: Pré-venda Maio 2026"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">O que você quer disparar?</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'form', label: 'Formulário', desc: 'Pré-venda, captação de leads', icon: <FileText size={20} className="text-blue-600" /> },
                { value: 'nps', label: 'Pesquisa NPS', desc: 'Satisfação pós-atendimento', icon: <BarChart3 size={20} className="text-green-600" /> },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDispatchType(opt.value as 'form' | 'nps')}
                  className={`p-4 border-2 rounded-xl text-left transition ${dispatchType === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2 mb-1">{opt.icon}<span className="font-semibold text-gray-900">{opt.label}</span></div>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {dispatchType === 'form' ? 'Selecione o formulário' : 'Selecione a pesquisa NPS'}
            </label>
            <select
              value={dispatchType === 'form' ? selectedFormId : selectedNpsId}
              onChange={e => dispatchType === 'form' ? setSelectedFormId(e.target.value) : setSelectedNpsId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Selecione...</option>
              {(dispatchType === 'form' ? forms : npsCampaigns).map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem de convite</label>
            <textarea
              value={messageTemplate}
              onChange={e => setMessageTemplate(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Olá {{nome}}! Gostaríamos de sua opinião. Acesse: {{link}}"
            />
            <p className="text-xs text-gray-400 mt-1">Use <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code> para o primeiro nome e <code className="bg-gray-100 px-1 rounded">{'{{link}}'}</code> para o link do formulário/NPS</p>
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
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => setStep('new-step1')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ChevronLeft size={16} /> Voltar
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">1</div>
          <div className="flex-1 h-1 bg-gray-200 rounded"><div className="h-1 bg-purple-600 rounded" /></div>
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">2</div>
          <div className="flex-1 h-1 bg-gray-200 rounded"><div className="h-1 bg-purple-600 rounded w-0" /></div>
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm font-bold">3</div>
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
            onClick={() => setStep('new-step3')}
            disabled={allRecipients.length === 0}
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
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => setStep('new-step2')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ChevronLeft size={16} /> Voltar
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold"><Check size={14} /></div>
          <div className="flex-1 h-1 bg-purple-600 rounded" />
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold"><Check size={14} /></div>
          <div className="flex-1 h-1 bg-purple-600 rounded" />
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">3</div>
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
            Após o envio, a IA ficará aguardando as respostas para continuar a conversa automaticamente.
          </p>
        </div>

        <div className="flex justify-between">
          <button onClick={() => setStep('new-step2')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm">
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-blue-700">
            <strong>Próximo passo:</strong> A IA está aguardando as respostas. Quando os clientes responderem, ela continuará a conversa automaticamente conforme o playbook configurado.
          </p>
        </div>
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
