'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Send, MessageSquare, Mail, Users, CheckSquare, Square,
  Search, ChevronDown, ChevronUp, AlertCircle, CheckCircle,
  Loader2, X, Phone, AtSign, Filter, Info
} from 'lucide-react';

interface Recipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  plan?: string;
}

interface BroadcastResult {
  recipientId: string;
  recipientName: string;
  channel: string;
  ok: boolean;
  error?: string;
}

interface AdminBroadcastProps {
  isDark?: boolean;
}

const AdminBroadcast: React.FC<AdminBroadcastProps> = ({ isDark = false }) => {
  const t = {
    bg: isDark ? 'bg-gray-900' : 'bg-gray-50',
    card: isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textSub: isDark ? 'text-gray-400' : 'text-gray-500',
    textMuted: isDark ? 'text-gray-500' : 'text-gray-400',
    input: isDark
      ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-emerald-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500',
    row: isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50',
    rowSelected: isDark ? 'bg-emerald-900/20 border-emerald-700' : 'bg-emerald-50 border-emerald-200',
    divider: isDark ? 'border-gray-700' : 'border-gray-200',
  };

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [channels, setChannels] = useState<Set<'whatsapp' | 'email'>>(new Set(['whatsapp']));
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<BroadcastResult[] | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/clients?limit=500');
      if (!res.ok) throw new Error('Erro ao carregar clientes');
      const data = await res.json();
      const mapped: Recipient[] = (data.clients || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || '',
        companyName: c.companyName || c.primaryCompany?.name || '',
        plan: c.plan,
      }));
      setRecipients(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return recipients.filter(r => {
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.phone || '').includes(search);
      const matchChannel =
        filterChannel === 'all' ||
        (filterChannel === 'whatsapp' && !!r.phone) ||
        (filterChannel === 'email' && !!r.email);
      return matchSearch && matchChannel;
    });
  }, [recipients, search, filterChannel]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.id)));
    }
  };

  const toggleChannel = (ch: 'whatsapp' | 'email') => {
    setChannels(prev => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  const selectedRecipients = recipients.filter(r => selected.has(r.id));

  const canSendWhatsApp = selectedRecipients.filter(r => r.phone).length;
  const canSendEmail = selectedRecipients.filter(r => r.email).length;

  const handleSend = async () => {
    if (!message.trim()) return;
    if (selected.size === 0) return;
    if (channels.size === 0) return;

    setSending(true);
    setResults(null);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: selectedRecipients,
          message,
          subject: subject || 'Mensagem da equipe HelloGrowth',
          channels: Array.from(channels),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      setResults(data.results);
      setShowResults(true);
    } catch (e: any) {
      alert(e.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const successCount = results?.filter(r => r.ok).length || 0;
  const failCount = results?.filter(r => !r.ok).length || 0;

  return (
    <div className={`p-6 min-h-screen ${t.bg}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${t.text} flex items-center gap-2`}>
          <Send size={24} className="text-emerald-500" />
          Disparo em Massa
        </h1>
        <p className={`text-sm ${t.textSub} mt-1`}>
          Envie mensagens de WhatsApp e e-mail para seus clientes
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Lista de destinatários — 3 colunas */}
        <div className={`xl:col-span-3 border rounded-xl shadow-sm ${t.card}`}>
          <div className={`p-4 border-b ${t.divider}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`font-semibold ${t.text} flex items-center gap-2`}>
                <Users size={18} className="text-emerald-500" />
                Destinatários
                <span className={`text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium`}>
                  {selected.size} selecionados
                </span>
              </h2>
              <div className="flex items-center gap-2">
                {/* Filtro por canal */}
                <select
                  value={filterChannel}
                  onChange={e => setFilterChannel(e.target.value as any)}
                  className={`text-xs border rounded-lg px-2 py-1.5 ${t.input}`}
                >
                  <option value="all">Todos</option>
                  <option value="whatsapp">Com WhatsApp</option>
                  <option value="email">Com E-mail</option>
                </select>
              </div>
            </div>
            {/* Busca */}
            <div className="relative">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, email, empresa..."
                className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg ${t.input}`}
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-auto max-h-[420px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className={`sticky top-0 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-4 py-3 text-left ${t.textSub}`}>
                      <button onClick={toggleAll} className="flex items-center gap-1">
                        {selected.size === filtered.length && filtered.length > 0
                          ? <CheckSquare size={16} className="text-emerald-500" />
                          : <Square size={16} className={t.textMuted} />}
                        <span className="text-xs font-medium">Todos ({filtered.length})</span>
                      </button>
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${t.textSub}`}>Nome</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${t.textSub}`}>Contato</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${t.textSub}`}>Empresa</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.divider}`}>
                  {filtered.map(r => {
                    const isSelected = selected.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        onClick={() => toggleSelect(r.id)}
                        className={`cursor-pointer transition-colors ${isSelected ? t.rowSelected : t.row}`}
                      >
                        <td className="px-4 py-3">
                          {isSelected
                            ? <CheckSquare size={16} className="text-emerald-500" />
                            : <Square size={16} className={t.textMuted} />}
                        </td>
                        <td className="px-4 py-3">
                          <p className={`font-medium ${t.text}`}>{r.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {r.email && (
                              <p className={`text-xs flex items-center gap-1 ${t.textSub}`}>
                                <AtSign size={11} /> {r.email}
                              </p>
                            )}
                            {r.phone ? (
                              <p className={`text-xs flex items-center gap-1 text-emerald-600`}>
                                <Phone size={11} /> {r.phone}
                              </p>
                            ) : (
                              <p className={`text-xs flex items-center gap-1 ${t.textMuted}`}>
                                <Phone size={11} /> Sem WhatsApp
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className={`text-xs ${t.textSub}`}>{r.companyName || '—'}</p>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className={`px-4 py-8 text-center text-sm ${t.textMuted}`}>
                        Nenhum cliente encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Painel de composição — 2 colunas */}
        <div className="xl:col-span-2 space-y-4">
          {/* Canais */}
          <div className={`border rounded-xl shadow-sm p-4 ${t.card}`}>
            <h2 className={`font-semibold ${t.text} mb-3 flex items-center gap-2`}>
              <Filter size={16} className="text-emerald-500" />
              Canais de Envio
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => toggleChannel('whatsapp')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                  channels.has('whatsapp')
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : `${isDark ? 'border-gray-600 text-gray-400 hover:border-emerald-500' : 'border-gray-300 text-gray-600 hover:border-emerald-500'}`
                }`}
              >
                <MessageSquare size={16} />
                WhatsApp
                {channels.has('whatsapp') && canSendWhatsApp > 0 && (
                  <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{canSendWhatsApp}</span>
                )}
              </button>
              <button
                onClick={() => toggleChannel('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                  channels.has('email')
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : `${isDark ? 'border-gray-600 text-gray-400 hover:border-blue-500' : 'border-gray-300 text-gray-600 hover:border-blue-500'}`
                }`}
              >
                <Mail size={16} />
                E-mail
                {channels.has('email') && canSendEmail > 0 && (
                  <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{canSendEmail}</span>
                )}
              </button>
            </div>
          </div>

          {/* Mensagem */}
          <div className={`border rounded-xl shadow-sm p-4 ${t.card}`}>
            <h2 className={`font-semibold ${t.text} mb-3 flex items-center gap-2`}>
              <MessageSquare size={16} className="text-emerald-500" />
              Mensagem
            </h2>

            {channels.has('email') && (
              <div className="mb-3">
                <label className={`block text-xs font-medium ${t.textSub} mb-1`}>Assunto do E-mail</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Ex: Novidade no HelloGrowth!"
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${t.input}`}
                />
              </div>
            )}

            <div className="mb-2">
              <label className={`block text-xs font-medium ${t.textSub} mb-1`}>Mensagem</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Digite sua mensagem aqui...&#10;&#10;Use {nome} para personalizar com o nome do cliente&#10;Use {empresa} para o nome da empresa"
                rows={8}
                className={`w-full border rounded-lg px-3 py-2 text-sm resize-none ${t.input}`}
              />
            </div>

            <div className={`flex items-start gap-2 text-xs ${t.textMuted} mb-4`}>
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              <span>Use <code className="bg-emerald-100 text-emerald-700 px-1 rounded">{'{nome}'}</code> e <code className="bg-emerald-100 text-emerald-700 px-1 rounded">{'{empresa}'}</code> para personalizar</span>
            </div>

            {/* Resumo */}
            {selected.size > 0 && (
              <div className={`rounded-lg p-3 mb-4 text-sm ${isDark ? 'bg-gray-700' : 'bg-gray-50'} border ${t.divider}`}>
                <p className={`font-medium ${t.text} mb-1`}>Resumo do disparo</p>
                <div className={`space-y-1 text-xs ${t.textSub}`}>
                  <p>{selected.size} destinatário{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}</p>
                  {channels.has('whatsapp') && <p className="text-emerald-600">{canSendWhatsApp} envio{canSendWhatsApp !== 1 ? 's' : ''} via WhatsApp</p>}
                  {channels.has('email') && <p className="text-blue-600">{canSendEmail} envio{canSendEmail !== 1 ? 's' : ''} via E-mail</p>}
                  {channels.has('whatsapp') && selected.size - canSendWhatsApp > 0 && (
                    <p className="text-amber-600">{selected.size - canSendWhatsApp} sem número de WhatsApp (serão ignorados)</p>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || selected.size === 0 || !message.trim() || channels.size === 0}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                sending || selected.size === 0 || !message.trim() || channels.size === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
              }`}
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Disparar Mensagem
                  {selected.size > 0 && ` (${selected.size})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {results && (
        <div className={`mt-6 border rounded-xl shadow-sm ${t.card}`}>
          <button
            onClick={() => setShowResults(v => !v)}
            className={`w-full flex items-center justify-between p-4 ${t.text}`}
          >
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">Resultado do Disparo</h2>
              <span className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle size={14} /> {successCount} enviados
              </span>
              {failCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle size={14} /> {failCount} falhas
                </span>
              )}
            </div>
            {showResults ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showResults && (
            <div className={`border-t ${t.divider} overflow-auto max-h-64`}>
              <table className="w-full text-sm">
                <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-4 py-2 text-left text-xs font-medium ${t.textSub}`}>Destinatário</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium ${t.textSub}`}>Canal</th>
                    <th className={`px-4 py-2 text-left text-xs font-medium ${t.textSub}`}>Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.divider}`}>
                  {results.map((r, i) => (
                    <tr key={i} className={t.row}>
                      <td className={`px-4 py-2 ${t.text}`}>{r.recipientName}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          r.channel === 'whatsapp'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {r.channel === 'whatsapp' ? <MessageSquare size={10} /> : <Mail size={10} />}
                          {r.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {r.ok ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle size={12} /> Enviado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-500" title={r.error}>
                            <AlertCircle size={12} /> Falhou: {r.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBroadcast;
