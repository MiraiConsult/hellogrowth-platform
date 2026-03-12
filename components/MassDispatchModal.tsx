'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Users, UserPlus, FileSpreadsheet, Check, Lock, Phone, ChevronRight, ChevronLeft, Loader2, Download, AlertCircle, Edit3, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSurveyLink } from '@/lib/utils/getBaseUrl';
import { Campaign } from '@/types';

const MAX_RECIPIENTS = 10;

interface Recipient {
  id: string;
  name: string;
  phone: string | null;
  source: 'lead' | 'nps' | 'manual' | 'import';
  email?: string;
}

interface MassDispatchModalProps {
  campaigns: Campaign[];
  tenantId: string;
  onClose: () => void;
}

type TabType = 'existing' | 'manual' | 'import';

const MassDispatchModal: React.FC<MassDispatchModalProps> = ({ campaigns, tenantId, onClose }) => {
  // Step: 'config' | 'recipients' | 'message' | 'sending' | 'done'
  const [step, setStep] = useState<'config' | 'recipients' | 'message' | 'sending' | 'done'>('config');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('existing');

  // Existing clients
  const [existingClients, setExistingClients] = useState<Recipient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Phone editing inline
  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState('');

  // Manual add
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // Import Excel/CSV
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedContacts, setImportedContacts] = useState<Recipient[]>([]);

  // Selected recipients
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Message
  const [message, setMessage] = useState('');

  // Sending
  const [sendResults, setSendResults] = useState<{ name: string; phone: string; ok: boolean; error?: string }[]>([]);
  const [sendingIndex, setSendingIndex] = useState(0);

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // Load existing clients from leads + nps_responses
  useEffect(() => {
    if (!tenantId) return;
    setLoadingClients(true);
    const load = async () => {
      const [leadsRes, npsRes] = await Promise.all([
        supabase.from('leads').select('id, name, email, phone').eq('tenant_id', tenantId),
        supabase.from('nps_responses').select('id, customer_name, customer_email, customer_phone').eq('tenant_id', tenantId)
      ]);

      const leads: Recipient[] = (leadsRes.data || []).map((l: any) => ({
        id: `lead_${l.id}`,
        name: l.name || 'Sem nome',
        phone: l.phone || null,
        email: l.email,
        source: 'lead'
      }));

      const nps: Recipient[] = (npsRes.data || []).map((n: any) => ({
        id: `nps_${n.id}`,
        name: n.customer_name || 'Sem nome',
        phone: n.customer_phone || null,
        email: n.customer_email,
        source: 'nps'
      }));

      // Deduplicate by phone
      const seen = new Set<string>();
      const all: Recipient[] = [];
      [...leads, ...nps].forEach(r => {
        const key = r.phone ? r.phone.replace(/\D/g, '') : `noPhone_${r.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          all.push(r);
        }
      });

      setExistingClients(all);
      setLoadingClients(false);
    };
    load();
  }, [tenantId]);

  // Update message template when campaign changes
  useEffect(() => {
    if (selectedCampaign) {
      const link = getSurveyLink(selectedCampaign.id);
      setMessage(`Olá [Nome]! Gostaríamos de ouvir sua opinião. Acesse: ${link}`);
    }
  }, [selectedCampaignId]);

  const selectedCount = selectedIds.size;
  const canAddMore = selectedCount < MAX_RECIPIENTS;

  const toggleSelect = (id: string, hasPhone: boolean) => {
    if (!hasPhone) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_RECIPIENTS) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const allRecipients = [...existingClients, ...importedContacts];
  const filteredExisting = existingClients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  // Save phone to DB and update local state
  const handleSavePhone = async (recipient: Recipient) => {
    const phone = editingPhoneValue.trim().replace(/\D/g, '');
    if (!phone) return;

    if (recipient.source === 'lead') {
      const realId = recipient.id.replace('lead_', '');
      await supabase.from('leads').update({ phone }).eq('id', realId);
    } else if (recipient.source === 'nps') {
      const realId = recipient.id.replace('nps_', '');
      await supabase.from('nps_responses').update({ customer_phone: phone }).eq('id', realId);
    }

    setExistingClients(prev => prev.map(c =>
      c.id === recipient.id ? { ...c, phone } : c
    ));
    setEditingPhoneId(null);
    setEditingPhoneValue('');
  };

  const handleAddManual = () => {
    const phone = manualPhone.trim().replace(/\D/g, '');
    if (!manualName.trim() || !phone) return;
    const newR: Recipient = {
      id: `manual_${Date.now()}`,
      name: manualName.trim(),
      phone,
      source: 'manual'
    };
    setExistingClients(prev => [...prev, newR]);
    setSelectedIds(prev => {
      if (prev.size >= MAX_RECIPIENTS) return prev;
      return new Set([...prev, newR.id]);
    });
    setManualName('');
    setManualPhone('');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const contacts: Recipient[] = [];
      lines.forEach((line, idx) => {
        if (idx === 0 && line.toLowerCase().includes('nome')) return; // skip header
        const parts = line.split(',');
        const name = parts[0]?.trim();
        const phone = parts[1]?.trim().replace(/\D/g, '');
        const email = parts[2]?.trim();
        if (name && phone) {
          contacts.push({ id: `import_${Date.now()}_${idx}`, name, phone, email, source: 'import' });
        }
      });
      setImportedContacts(contacts);
      // Auto-select up to MAX
      const toSelect = contacts.slice(0, MAX_RECIPIENTS - selectedIds.size).map(c => c.id);
      setSelectedIds(prev => new Set([...prev, ...toSelect]));
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = 'Nome,Telefone,Email\nMaria Silva,11999999999,maria@email.com\nJoão Souza,11988888888,joao@email.com';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_disparo.csv';
    a.click();
  };

  const getSelectedRecipients = (): Recipient[] => {
    return allRecipients.filter(r => selectedIds.has(r.id));
  };

  const handleSend = async () => {
    const recipients = getSelectedRecipients();
    if (!recipients.length || !selectedCampaign) return;
    setStep('sending');
    const results: { name: string; phone: string; ok: boolean; error?: string }[] = [];

    for (let i = 0; i < recipients.length; i++) {
      setSendingIndex(i + 1);
      const r = recipients[i];
      const phone = r.phone!.replace(/\D/g, '');
      const personalizedMessage = message.replace('[Nome]', r.name);

      try {
        const res = await fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message: personalizedMessage, tenantId })
        });
        const data = await res.json();
        results.push({ name: r.name, phone, ok: res.ok && data.ok !== false, error: data.error });
      } catch (e: any) {
        results.push({ name: r.name, phone, ok: false, error: e.message });
      }

      // Delay between sends to avoid WhatsApp blocking
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    setSendResults(results);
    setStep('done');
  };

  const sourceLabel = (source: string) => {
    if (source === 'lead') return 'Lead';
    if (source === 'nps') return 'NPS';
    if (source === 'manual') return 'Manual';
    return 'Importado';
  };

  const sourceColor = (source: string) => {
    if (source === 'lead') return 'bg-blue-50 text-blue-600';
    if (source === 'nps') return 'bg-purple-50 text-purple-600';
    if (source === 'manual') return 'bg-green-50 text-green-600';
    return 'bg-orange-50 text-orange-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Send size={20} className="text-green-600" /> Disparo em Massa
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Envie sua campanha para até {MAX_RECIPIENTS} clientes via WhatsApp</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Progress Steps */}
        {step !== 'sending' && step !== 'done' && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50 text-xs font-medium">
            {['config', 'recipients', 'message'].map((s, idx) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1.5 ${step === s ? 'text-green-600' : ['config', 'recipients', 'message'].indexOf(step) > idx ? 'text-gray-400' : 'text-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-green-600 text-white' : ['config', 'recipients', 'message'].indexOf(step) > idx ? 'bg-gray-300 text-white' : 'bg-gray-200 text-gray-400'}`}>{idx + 1}</div>
                  {s === 'config' ? 'Campanha' : s === 'recipients' ? 'Destinatários' : 'Mensagem'}
                </div>
                {idx < 2 && <div className="flex-1 h-px bg-gray-200" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP 1: Config */}
          {step === 'config' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Selecione a Campanha NPS</label>
                <select
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={selectedCampaignId}
                  onChange={e => setSelectedCampaignId(e.target.value)}
                >
                  <option value="">Selecione uma campanha...</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {(c.status === 'Ativa' || c.status === 'active') ? '✓' : '(Pausada)'}</option>
                  ))}
                </select>
              </div>
              {selectedCampaign && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <p className="text-sm font-medium text-green-800">Link da campanha:</p>
                  <p className="text-xs text-green-600 mt-1 break-all">{getSurveyLink(selectedCampaign.id)}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Recipients */}
          {step === 'recipients' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className={`font-bold ${selectedCount >= MAX_RECIPIENTS ? 'text-red-600' : 'text-green-600'}`}>{selectedCount}</span>
                  <span className="text-gray-400">/{MAX_RECIPIENTS} selecionados</span>
                </p>
                {selectedCount >= MAX_RECIPIENTS && (
                  <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> Limite atingido</span>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                {([
                  { id: 'existing', label: 'Clientes', icon: Users },
                  { id: 'manual', label: 'Cadastrar', icon: UserPlus },
                  { id: 'import', label: 'Importar Excel', icon: FileSpreadsheet }
                ] as { id: TabType; label: string; icon: any }[]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    <tab.icon size={15} /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Existing Clients */}
              {activeTab === 'existing' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou telefone..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  {loadingClients ? (
                    <div className="flex items-center justify-center py-8 text-gray-400">
                      <Loader2 size={24} className="animate-spin mr-2" /> Carregando clientes...
                    </div>
                  ) : filteredExisting.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Nenhum cliente encontrado</div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {filteredExisting.map(client => {
                        const hasPhone = !!client.phone;
                        const isSelected = selectedIds.has(client.id);
                        const isEditingPhone = editingPhoneId === client.id;

                        return (
                          <div
                            key={client.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              isSelected ? 'border-green-300 bg-green-50' :
                              hasPhone ? 'border-gray-200 hover:border-gray-300 cursor-pointer' :
                              'border-gray-100 bg-gray-50 opacity-70'
                            }`}
                            onClick={() => !isEditingPhone && hasPhone && toggleSelect(client.id, hasPhone)}
                          >
                            {/* Checkbox */}
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected ? 'bg-green-500 border-green-500' :
                              hasPhone ? 'border-gray-300' : 'border-gray-200'
                            }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                              {!hasPhone && !isSelected && <Lock size={10} className="text-gray-400" />}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-800 truncate">{client.name}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${sourceColor(client.source)}`}>
                                  {sourceLabel(client.source)}
                                </span>
                              </div>
                              {isEditingPhone ? (
                                <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="tel"
                                    value={editingPhoneValue}
                                    onChange={e => setEditingPhoneValue(e.target.value)}
                                    placeholder="Ex: 11999999999"
                                    className="text-xs border border-gray-300 rounded-lg px-2 py-1 w-36 focus:ring-1 focus:ring-green-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSavePhone(client)}
                                    className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => setEditingPhoneId(null)}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-0.5">
                                  {hasPhone ? (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Phone size={10} /> {client.phone}
                                    </span>
                                  ) : (
                                    <button
                                      onClick={e => { e.stopPropagation(); setEditingPhoneId(client.id); setEditingPhoneValue(''); }}
                                      className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 font-medium"
                                      title="Cadastrar telefone"
                                    >
                                      <Phone size={10} /> Cadastrar telefone
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Manual */}
              {activeTab === 'manual' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Adicione um cliente manualmente para incluir no disparo.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={e => setManualName(e.target.value)}
                        placeholder="Ex: Maria Silva"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Telefone (com DDD) *</label>
                      <input
                        type="tel"
                        value={manualPhone}
                        onChange={e => setManualPhone(e.target.value)}
                        placeholder="Ex: 11999999999"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddManual}
                    disabled={!manualName.trim() || !manualPhone.trim() || !canAddMore}
                    className="w-full py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    <UserPlus size={16} /> Adicionar e Selecionar
                  </button>
                  {!canAddMore && <p className="text-xs text-red-500 text-center">Limite de {MAX_RECIPIENTS} destinatários atingido.</p>}
                </div>
              )}

              {/* Tab: Import */}
              {activeTab === 'import' && (
                <div className="space-y-3">
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileSpreadsheet size={32} className="text-gray-400 mb-2 group-hover:text-green-500" />
                    <p className="text-sm text-gray-600 font-medium">Clique para selecionar o arquivo</p>
                    <p className="text-xs text-gray-400 mt-1">Formato: Nome, Telefone, Email (CSV ou Excel exportado como CSV)</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileImport} />
                  </div>
                  <button onClick={downloadTemplate} className="text-xs text-green-600 hover:underline flex items-center gap-1 mx-auto">
                    <Download size={12} /> Baixar modelo de exemplo
                  </button>
                  {importedContacts.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <p className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                        <Check size={14} /> {importedContacts.length} contatos importados
                        {importedContacts.length > MAX_RECIPIENTS && <span className="text-xs text-orange-500 ml-1">(apenas {MAX_RECIPIENTS} serão selecionados)</span>}
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {importedContacts.slice(0, MAX_RECIPIENTS).map(c => (
                          <div key={c.id} className="flex justify-between text-xs text-gray-600">
                            <span>{c.name}</span>
                            <span className="text-gray-400">{c.phone}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected summary */}
              {selectedCount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-green-800 mb-1">{selectedCount} destinatário(s) selecionado(s):</p>
                  <div className="flex flex-wrap gap-1">
                    {getSelectedRecipients().map(r => (
                      <span key={r.id} className="text-xs bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        {r.name}
                        <button onClick={() => toggleSelect(r.id, true)} className="hover:text-red-500 ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Message */}
          {step === 'message' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <Edit3 size={15} /> Mensagem do WhatsApp
                </label>
                <p className="text-xs text-gray-500 mb-2">Use <code className="bg-gray-100 px-1 rounded">[Nome]</code> para personalizar com o nome do cliente.</p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-2">Prévia (primeiro destinatário):</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {message.replace('[Nome]', getSelectedRecipients()[0]?.name || 'Cliente')}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-700 flex items-start gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  Serão enviadas <strong>{selectedCount} mensagens</strong> com intervalo de 3 segundos entre cada envio para evitar bloqueios no WhatsApp.
                </p>
              </div>
            </div>
          )}

          {/* STEP: Sending */}
          {step === 'sending' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Loader2 size={32} className="text-green-600 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Enviando mensagens...</h3>
              <p className="text-sm text-gray-500">{sendingIndex} de {selectedCount} enviado(s)</p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(sendingIndex / selectedCount) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">Aguardando 3s entre envios para evitar bloqueios...</p>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Disparo Concluído!</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {sendResults.filter(r => r.ok).length} de {sendResults.length} mensagens enviadas com sucesso.
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sendResults.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${r.ok ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
                    <div>
                      <span className="font-medium text-gray-800">{r.name}</span>
                      <span className="text-gray-400 text-xs ml-2">{r.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {r.ok ? (
                        <span className="text-green-600 flex items-center gap-1 text-xs font-medium"><Check size={12} /> Enviado</span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1 text-xs font-medium"><X size={12} /> {r.error || 'Falhou'}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          {step === 'done' ? (
            <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
              Fechar
            </button>
          ) : step === 'sending' ? (
            <div className="w-full text-center text-sm text-gray-400">Aguarde o envio ser concluído...</div>
          ) : (
            <>
              <button
                onClick={() => {
                  if (step === 'config') onClose();
                  else if (step === 'recipients') setStep('config');
                  else if (step === 'message') setStep('recipients');
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium text-sm transition-colors"
              >
                <ChevronLeft size={16} /> {step === 'config' ? 'Cancelar' : 'Voltar'}
              </button>
              <button
                onClick={() => {
                  if (step === 'config' && selectedCampaignId) setStep('recipients');
                  else if (step === 'recipients' && selectedCount > 0) setStep('message');
                  else if (step === 'message' && message.trim()) handleSend();
                }}
                disabled={
                  (step === 'config' && !selectedCampaignId) ||
                  (step === 'recipients' && selectedCount === 0) ||
                  (step === 'message' && !message.trim())
                }
                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {step === 'message' ? (
                  <><Send size={16} /> Enviar {selectedCount} mensagem(ns)</>
                ) : (
                  <>Próximo <ChevronRight size={16} /></>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MassDispatchModal;
