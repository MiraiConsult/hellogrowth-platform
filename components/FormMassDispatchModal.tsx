'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Users, UserPlus, FileSpreadsheet, Check, Lock, Phone, ChevronRight, ChevronLeft, Loader2, Download, AlertCircle, Edit3, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getFormLink } from '@/lib/utils/getBaseUrl';
import { Form } from '@/types';

const MAX_RECIPIENTS = 10;

interface Recipient {
  id: string;
  name: string;
  phone: string | null;
  source: 'lead' | 'nps' | 'manual' | 'import';
  email?: string;
}

interface FormMassDispatchModalProps {
  forms: Form[];
  tenantId: string;
  onClose: () => void;
}

type TabType = 'existing' | 'manual' | 'import';

const FormMassDispatchModal: React.FC<FormMassDispatchModalProps> = ({ forms, tenantId, onClose }) => {
  const [step, setStep] = useState<'config' | 'recipients' | 'message' | 'sending' | 'done'>('config');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('existing');

  const [existingClients, setExistingClients] = useState<Recipient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState('');

  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedContacts, setImportedContacts] = useState<Recipient[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sendResults, setSendResults] = useState<{ name: string; phone: string; ok: boolean; error?: string }[]>([]);
  const [sendingIndex, setSendingIndex] = useState(0);

  const selectedForm = forms.find(f => f.id === selectedFormId);

  // Load existing clients from leads + nps_responses
  useEffect(() => {
    if (!tenantId) return;
    setLoadingClients(true);
    const load = async () => {
      const [leadsRes, npsRes] = await Promise.all([
        supabase.from('leads').select('id, name, email, phone').eq('company_id', tenantId),
        supabase.from('nps_responses').select('id, customer_name, customer_email, customer_phone').eq('company_id', tenantId)
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

  // Update message template when form changes
  useEffect(() => {
    if (selectedForm) {
      const link = getFormLink(selectedForm.id);
      setMessage(`Olá [Nome]! Gostaríamos de conhecer melhor você. Preencha nosso formulário: ${link}`);
    }
  }, [selectedFormId]);

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
        if (idx === 0 && line.toLowerCase().includes('nome')) return;
        const parts = line.split(',');
        const name = parts[0]?.trim();
        const phone = parts[1]?.trim().replace(/\D/g, '');
        const email = parts[2]?.trim();
        if (name && phone) {
          contacts.push({ id: `import_${Date.now()}_${idx}`, name, phone, email, source: 'import' });
        }
      });
      setImportedContacts(contacts);
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
    if (!recipients.length || !selectedForm) return;
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
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Send size={20} className="text-emerald-600" /> Disparo em Massa
              <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold ml-1">NOVO</span>
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Envie seu formulário para até {MAX_RECIPIENTS} clientes via WhatsApp</p>
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
                <div className={`flex items-center gap-1.5 ${step === s ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{idx + 1}</span>
                  {s === 'config' ? 'Formulário' : s === 'recipients' ? 'Destinatários' : 'Mensagem'}
                </div>
                {idx < 2 && <div className="flex-1 h-px bg-gray-200" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* STEP 1: Select Form */}
          {step === 'config' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Selecione o formulário</label>
                <select
                  value={selectedFormId}
                  onChange={e => setSelectedFormId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">-- Escolha um formulário --</option>
                  {forms.filter(f => f.status === 'active' || f.status === undefined).map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              {selectedForm && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Link do formulário:</p>
                  <p className="text-xs text-emerald-600 mt-1 break-all">{getFormLink(selectedForm.id)}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Recipients */}
          {step === 'recipients' && (
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {([
                  { key: 'existing', icon: <Users size={14} />, label: 'Clientes' },
                  { key: 'manual', icon: <UserPlus size={14} />, label: 'Cadastrar' },
                  { key: 'import', icon: <FileSpreadsheet size={14} />, label: 'Importar Excel' },
                ] as { key: TabType; icon: React.ReactNode; label: string }[]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${activeTab === tab.key ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Existing clients */}
              {activeTab === 'existing' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou telefone..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500">{selectedCount}/{MAX_RECIPIENTS} selecionados</p>
                  {loadingClients ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={24} className="animate-spin text-emerald-500" />
                    </div>
                  ) : filteredExisting.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Nenhum cliente encontrado</div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {filteredExisting.map(client => {
                        const hasPhone = !!client.phone;
                        const isSelected = selectedIds.has(client.id);
                        const isEditingPhone = editingPhoneId === client.id;
                        return (
                          <div
                            key={client.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              isSelected ? 'border-emerald-300 bg-emerald-50' :
                              hasPhone ? 'border-gray-200 bg-white hover:border-gray-300 cursor-pointer' :
                              'border-gray-100 bg-gray-50 opacity-70'
                            }`}
                            onClick={() => !isEditingPhone && toggleSelect(client.id, hasPhone)}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{client.name}</p>
                              {hasPhone ? (
                                <p className="text-xs text-gray-500">{client.phone}</p>
                              ) : isEditingPhone ? (
                                <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="tel"
                                    value={editingPhoneValue}
                                    onChange={e => setEditingPhoneValue(e.target.value)}
                                    placeholder="55119..."
                                    className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1 focus:ring-1 focus:ring-emerald-500"
                                    autoFocus
                                  />
                                  <button onClick={() => handleSavePhone(client)} className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-700">Salvar</button>
                                  <button onClick={() => setEditingPhoneId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                                </div>
                              ) : (
                                <button
                                  onClick={e => { e.stopPropagation(); setEditingPhoneId(client.id); setEditingPhoneValue(''); }}
                                  className="text-xs text-emerald-600 hover:underline flex items-center gap-0.5 mt-0.5"
                                >
                                  <Phone size={10} /> Cadastrar telefone
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceColor(client.source)}`}>{sourceLabel(client.source)}</span>
                              {!hasPhone && !isEditingPhone && (
                                <div title="Sem telefone cadastrado">
                                  <Lock size={14} className="text-gray-400" />
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
                  <p className="text-sm text-gray-600">Adicione um cliente manualmente para incluir no disparo.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={e => setManualName(e.target.value)}
                        placeholder="Nome do cliente"
                        className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Telefone (com DDD)</label>
                      <input
                        type="tel"
                        value={manualPhone}
                        onChange={e => setManualPhone(e.target.value)}
                        placeholder="5511999999999"
                        className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleAddManual}
                    disabled={!manualName.trim() || !manualPhone.trim() || !canAddMore}
                    className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus size={16} /> Adicionar e selecionar
                  </button>
                  {!canAddMore && <p className="text-xs text-orange-500 text-center">Limite de {MAX_RECIPIENTS} destinatários atingido.</p>}
                </div>
              )}

              {/* Tab: Import */}
              {activeTab === 'import' && (
                <div className="space-y-3 text-center">
                  <p className="text-sm text-gray-600">Importe uma planilha CSV com colunas: <strong>Nome, Telefone, Email</strong></p>
                  <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileImport} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-emerald-300 rounded-xl text-sm text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <FileSpreadsheet size={18} /> Selecionar arquivo CSV
                  </button>
                  <button onClick={downloadTemplate} className="text-xs text-emerald-600 hover:underline flex items-center gap-1 mx-auto">
                    <Download size={12} /> Baixar modelo de exemplo
                  </button>
                  {importedContacts.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-sm font-medium text-emerald-800 mb-2 flex items-center gap-1">
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
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-emerald-800 mb-1">{selectedCount} destinatário(s) selecionado(s):</p>
                  <div className="flex flex-wrap gap-1">
                    {getSelectedRecipients().map(r => (
                      <span key={r.id} className="text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
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
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
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
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <Loader2 size={32} className="text-emerald-600 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Enviando mensagens...</h3>
              <p className="text-sm text-gray-500">{sendingIndex} de {selectedCount} enviado(s)</p>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
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
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check size={32} className="text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Disparo Concluído!</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {sendResults.filter(r => r.ok).length} de {sendResults.length} mensagens enviadas com sucesso.
                </p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sendResults.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${r.ok ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}>
                    <div>
                      <span className="font-medium text-gray-800">{r.name}</span>
                      <span className="text-gray-400 text-xs ml-2">{r.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {r.ok ? (
                        <span className="text-emerald-600 flex items-center gap-1 text-xs font-medium"><Check size={12} /> Enviado</span>
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
                  if (step === 'config' && selectedFormId) setStep('recipients');
                  else if (step === 'recipients' && selectedCount > 0) setStep('message');
                  else if (step === 'message' && message.trim()) handleSend();
                }}
                disabled={
                  (step === 'config' && !selectedFormId) ||
                  (step === 'recipients' && selectedCount === 0) ||
                  (step === 'message' && !message.trim())
                }
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
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

export default FormMassDispatchModal;
