// HealthSignatures.tsx — Tela de Assinaturas Eletrônicas (Módulo Saúde)
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  Search,
  RefreshCw,
  X,
  Mail,
  CheckCircle,
  Clock,
  User,
  Phone,
  Calendar,
  Globe,
  FileText,
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Download,
  MessageCircle,
} from 'lucide-react';

interface HealthSignature {
  id: string;
  form_id: string;
  lead_id: string;
  tenant_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  ip_address: string;
  user_agent: string;
  signed_at: string;
  signature_image: string;
  consent_text: string;
  email_sent: boolean;
  whatsapp_sent?: boolean;
  lead?: {
    id: string;
    name: string;
    answers: Record<string, any>;
    form_source: string;
  };
  form?: {
    id: string;
    name: string;
  };
}

interface HealthSignaturesProps {
  tenantId: string;
  isDark?: boolean;
}

const HealthSignatures: React.FC<HealthSignaturesProps> = ({ tenantId, isDark = false }) => {
  const [signatures, setSignatures] = useState<HealthSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSignature, setSelectedSignature] = useState<HealthSignature | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sendingWhatsapp, setSendingWhatsapp] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [whatsappSuccess, setWhatsappSuccess] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const fetchSignatures = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/health/list-signatures?tenantId=${encodeURIComponent(tenantId)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${res.status}`);
      }
      const { signatures: enriched } = await res.json();
      setSignatures(enriched || []);
    } catch (err: any) {
      console.error('[HealthSignatures] Erro ao buscar assinaturas:', err);
      setError('Não foi possível carregar as assinaturas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  // Enviar TERMO por e-mail
  const handleSendEmail = async (sig: HealthSignature) => {
    if (!sig.patient_email) return;
    setSendingEmail(sig.id);
    setEmailSuccess(null);
    try {
      const res = await fetch('/api/health/send-signature-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureId: sig.id,
          tenantId: tenantId,
        }),
      });
      if (res.ok) {
        setEmailSuccess(sig.id);
        setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, email_sent: true } : s));
        if (selectedSignature?.id === sig.id) {
          setSelectedSignature(prev => prev ? { ...prev, email_sent: true } : null);
        }
        setTimeout(() => setEmailSuccess(null), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Erro ao enviar e-mail: ${errData.error || 'Verifique as configurações de e-mail.'}`);
      }
    } catch (err) {
      alert('Erro ao enviar e-mail.');
    } finally {
      setSendingEmail(null);
    }
  };

  // Enviar TERMO por WhatsApp
  const handleSendWhatsapp = async (sig: HealthSignature) => {
    if (!sig.patient_phone) return;
    setSendingWhatsapp(sig.id);
    setWhatsappSuccess(null);
    try {
      const res = await fetch('/api/health/send-signature-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureId: sig.id,
          tenantId: tenantId,
        }),
      });
      if (res.ok) {
        setWhatsappSuccess(sig.id);
        setSignatures(prev => prev.map(s => s.id === sig.id ? { ...s, whatsapp_sent: true } : s));
        if (selectedSignature?.id === sig.id) {
          setSelectedSignature(prev => prev ? { ...prev, whatsapp_sent: true } : null);
        }
        setTimeout(() => setWhatsappSuccess(null), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Erro ao enviar WhatsApp: ${errData.error || 'Verifique as configurações de WhatsApp.'}`);
      }
    } catch (err) {
      alert('Erro ao enviar WhatsApp.');
    } finally {
      setSendingWhatsapp(null);
    }
  };

  // Download do TERMO em PDF (client-side com html2pdf.js)
  const handleDownloadPdf = async (sig: HealthSignature) => {
    setDownloadingPdf(sig.id);
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const signedDate = new Date(sig.signed_at).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });

      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#1f2937;padding:40px;max-width:800px;margin:0 auto;">
          <div style="text-align:center;border-bottom:3px solid #10b981;padding-bottom:20px;margin-bottom:28px;">
            <h1 style="font-size:20px;font-weight:700;color:#10b981;margin:0 0 4px;">Termo de Assinatura Eletrônica</h1>
            <p style="font-size:12px;color:#6b7280;margin:0;">HelloGrowth — Sistema de Gestão de Saúde</p>
          </div>
          <div style="text-align:center;margin-bottom:20px;">
            <span style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;">✓ Documento com validade jurídica — Lei 14.063/2020</span>
          </div>
          <div style="margin-bottom:22px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10b981;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Dados do Signatário</div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr><td style="padding:4px 8px 4px 0;color:#9ca3af;font-size:11px;width:140px;">Nome completo</td><td style="padding:4px 0;font-weight:600;">${sig.patient_name || '—'}</td></tr>
              <tr><td style="padding:4px 8px 4px 0;color:#9ca3af;font-size:11px;">E-mail</td><td style="padding:4px 0;font-weight:600;">${sig.patient_email || '—'}</td></tr>
              <tr><td style="padding:4px 8px 4px 0;color:#9ca3af;font-size:11px;">Telefone</td><td style="padding:4px 0;font-weight:600;">${sig.patient_phone || '—'}</td></tr>
              <tr><td style="padding:4px 8px 4px 0;color:#9ca3af;font-size:11px;">Data/Hora</td><td style="padding:4px 0;font-weight:600;">${signedDate}</td></tr>
              <tr><td style="padding:4px 8px 4px 0;color:#9ca3af;font-size:11px;">IP</td><td style="padding:4px 0;font-family:monospace;font-size:12px;">${sig.ip_address || '—'}</td></tr>
              <tr><td style="padding:4px 8px 4px 0;color:#9ca3af;font-size:11px;">ID do Registro</td><td style="padding:4px 0;font-family:monospace;font-size:11px;">${sig.id}</td></tr>
            </table>
          </div>
          ${sig.consent_text ? `
          <div style="margin-bottom:22px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10b981;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Termo de Consentimento</div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;font-size:13px;line-height:1.7;color:#374151;white-space:pre-wrap;">${sig.consent_text}</div>
          </div>` : ''}
          ${sig.signature_image ? `
          <div style="margin-bottom:22px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#10b981;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:12px;">Assinatura Digital</div>
            <div style="border:2px solid #e5e7eb;border-radius:8px;padding:12px;background:#fafafa;text-align:center;">
              <img src="${sig.signature_image}" alt="Assinatura" style="max-width:100%;max-height:140px;object-fit:contain;" />
            </div>
            <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:8px;">Assinatura eletrônica simples — Lei 14.063/2020</p>
          </div>` : ''}
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;line-height:1.6;">
            <p>Este documento é um registro oficial de assinatura eletrônica gerado pelo sistema HelloGrowth.</p>
            <p>A assinatura eletrônica simples tem validade jurídica conforme a <strong>Lei nº 14.063/2020</strong>.</p>
            <p style="margin-top:8px;color:#d1d5db;">Gerado em: ${new Date().toLocaleString('pt-BR')} · Powered by <strong style="color:#10b981;">HelloGrowth</strong></p>
          </div>
        </div>
      `;

      const filename = `termo-assinatura-${(sig.patient_name || sig.id).replace(/\s+/g, '-').toLowerCase()}.pdf`;

      await html2pdf().set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(element).save();

    } catch (err) {
      console.error('[handleDownloadPdf] Erro:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const filteredSignatures = signatures.filter(sig => {
    const term = searchTerm.toLowerCase();
    return (
      sig.patient_name?.toLowerCase().includes(term) ||
      sig.patient_email?.toLowerCase().includes(term) ||
      sig.patient_phone?.toLowerCase().includes(term) ||
      sig.form?.name?.toLowerCase().includes(term)
    );
  });

  const getAnswerEntries = (sig: HealthSignature) => {
    if (!sig.lead?.answers) return [];
    return Object.entries(sig.lead.answers).filter(
      ([key]) => !key.startsWith('_') && key !== 'name' && key !== 'email' && key !== 'phone'
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
            <Heart size={22} className="text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Assinaturas Eletrônicas</h1>
            <p className="text-sm text-slate-500">
              {signatures.length} paciente{signatures.length !== 1 ? 's' : ''} com assinatura registrada
            </p>
          </div>
        </div>
        <button
          onClick={fetchSignatures}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nome, e-mail, telefone ou formulário..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-5">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={24} className="text-rose-400 animate-spin" />
            <p className="text-sm text-slate-500">Carregando assinaturas...</p>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && filteredSignatures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
            <Heart size={28} className="text-rose-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma assinatura registrada'}
          </h3>
          <p className="text-sm text-slate-400 max-w-sm">
            {searchTerm
              ? 'Tente buscar por outro termo.'
              : 'Quando um paciente preencher um formulário com assinatura eletrônica habilitada, ele aparecerá aqui.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && filteredSignatures.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Paciente</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Contato</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Formulário</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Data/Hora</th>
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSignatures.map(sig => (
                <tr
                  key={sig.id}
                  className="hover:bg-rose-50/40 transition-colors cursor-pointer"
                  onClick={() => { setSelectedSignature(sig); setShowAnswers(false); }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-rose-600 font-semibold text-xs">
                          {sig.patient_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <span className="font-medium text-slate-800">{sig.patient_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    <div className="flex items-center gap-1">
                      {sig.patient_email
                        ? <span className="text-slate-600">{sig.patient_email}</span>
                        : <span className="text-slate-300 text-xs italic">sem e-mail</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {sig.patient_phone
                        ? sig.patient_phone
                        : <span className="italic text-slate-300">sem telefone</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                      {sig.form?.name || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {formatDate(sig.signed_at)}
                  </td>
                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {/* Botão E-mail */}
                      <button
                        onClick={() => handleSendEmail(sig)}
                        disabled={!sig.patient_email || sendingEmail === sig.id}
                        title={!sig.patient_email ? 'Paciente sem e-mail cadastrado' : 'Enviar termo por e-mail'}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          !sig.patient_email
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : emailSuccess === sig.id
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                        }`}
                      >
                        {sendingEmail === sig.id
                          ? <RefreshCw size={12} className="animate-spin" />
                          : emailSuccess === sig.id
                          ? <CheckCircle size={12} />
                          : <Mail size={12} />}
                        <span className="hidden lg:inline">
                          {emailSuccess === sig.id ? 'Enviado!' : 'E-mail'}
                        </span>
                      </button>

                      {/* Botão WhatsApp */}
                      <button
                        onClick={() => handleSendWhatsapp(sig)}
                        disabled={!sig.patient_phone || sendingWhatsapp === sig.id}
                        title={!sig.patient_phone ? 'Paciente sem telefone cadastrado' : 'Enviar termo por WhatsApp'}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          !sig.patient_phone
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : whatsappSuccess === sig.id
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-green-50 hover:bg-green-100 text-green-600'
                        }`}
                      >
                        {sendingWhatsapp === sig.id
                          ? <RefreshCw size={12} className="animate-spin" />
                          : whatsappSuccess === sig.id
                          ? <CheckCircle size={12} />
                          : <MessageCircle size={12} />}
                        <span className="hidden lg:inline">
                          {whatsappSuccess === sig.id ? 'Enviado!' : 'WhatsApp'}
                        </span>
                      </button>

                      {/* Botão PDF */}
                      <button
                        onClick={() => handleDownloadPdf(sig)}
                        disabled={downloadingPdf === sig.id}
                        title="Baixar termo em PDF"
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {downloadingPdf === sig.id
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <Download size={12} />}
                        <span className="hidden lg:inline">PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de detalhes */}
      {selectedSignature && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSignature(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
                  <Heart size={18} className="text-rose-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-base">Detalhes da Assinatura</h2>
                  <p className="text-xs text-slate-500">{selectedSignature.form?.name || 'Formulário'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSignature(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Dados do paciente */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User size={14} className="text-slate-500" /> Dados do Paciente
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Nome</p>
                    <p className="font-medium text-slate-700">{selectedSignature.patient_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">E-mail</p>
                    {selectedSignature.patient_email
                      ? <p className="font-medium text-slate-700">{selectedSignature.patient_email}</p>
                      : <p className="text-xs text-slate-300 italic">Não informado</p>}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Phone size={11} /> Telefone</p>
                    {selectedSignature.patient_phone
                      ? <p className="font-medium text-slate-700">{selectedSignature.patient_phone}</p>
                      : <p className="text-xs text-slate-300 italic">Não informado</p>}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Calendar size={11} /> Data/Hora</p>
                    <p className="font-medium text-slate-700">{formatDate(selectedSignature.signed_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Globe size={11} /> IP</p>
                    <p className="font-medium text-slate-700 font-mono text-xs">{selectedSignature.ip_address || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Termo de consentimento */}
              {selectedSignature.consent_text && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-2">
                    <FileText size={14} /> Termo de Consentimento
                  </h3>
                  <p className="text-sm text-blue-700 whitespace-pre-wrap leading-relaxed">
                    {selectedSignature.consent_text}
                  </p>
                </div>
              )}

              {/* Assinatura */}
              {selectedSignature.signature_image && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                    <Heart size={14} className="text-rose-500" /> Assinatura Digital
                  </h3>
                  <div className="border-2 border-slate-200 rounded-xl p-3 bg-white">
                    <img
                      src={selectedSignature.signature_image}
                      alt="Assinatura do paciente"
                      className="w-full max-h-48 object-contain"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 text-center">
                    Assinatura eletrônica simples — Lei 14.063/2020
                  </p>
                </div>
              )}

              {/* Respostas do formulário */}
              {getAnswerEntries(selectedSignature).length > 0 && (
                <div>
                  <button
                    onClick={() => setShowAnswers(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={14} className="text-slate-500" />
                      Respostas do Formulário ({getAnswerEntries(selectedSignature).length})
                    </span>
                    {showAnswers ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {showAnswers && (
                    <div className="mt-2 space-y-2">
                      {getAnswerEntries(selectedSignature).map(([key, value]) => (
                        <div key={key} className="bg-slate-50 rounded-lg px-4 py-2.5">
                          <p className="text-xs text-slate-400 mb-0.5">{key}</p>
                          <p className="text-sm text-slate-700">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value || '—')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* User agent */}
              {selectedSignature.user_agent && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Dispositivo / Navegador</p>
                  <p className="text-xs text-slate-500 font-mono break-all">{selectedSignature.user_agent}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3 bg-white sticky bottom-0">
              <button
                onClick={() => setSelectedSignature(null)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Fechar
              </button>
              <div className="flex items-center gap-2 flex-wrap">
                {/* PDF */}
                <button
                  onClick={() => handleDownloadPdf(selectedSignature)}
                  disabled={downloadingPdf === selectedSignature.id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {downloadingPdf === selectedSignature.id
                    ? <RefreshCw size={14} className="animate-spin" />
                    : <Download size={14} />}
                  Baixar PDF
                </button>

                {/* WhatsApp */}
                <button
                  onClick={() => handleSendWhatsapp(selectedSignature)}
                  disabled={!selectedSignature.patient_phone || sendingWhatsapp === selectedSignature.id}
                  title={!selectedSignature.patient_phone ? 'Paciente sem telefone cadastrado' : 'Enviar termo por WhatsApp'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    !selectedSignature.patient_phone
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
                  }`}
                >
                  {sendingWhatsapp === selectedSignature.id
                    ? <RefreshCw size={14} className="animate-spin" />
                    : whatsappSuccess === selectedSignature.id
                    ? <CheckCircle size={14} />
                    : <MessageCircle size={14} />}
                  {whatsappSuccess === selectedSignature.id ? 'Enviado!' : 'Enviar por WhatsApp'}
                </button>

                {/* E-mail */}
                <button
                  onClick={() => handleSendEmail(selectedSignature)}
                  disabled={!selectedSignature.patient_email || sendingEmail === selectedSignature.id}
                  title={!selectedSignature.patient_email ? 'Paciente sem e-mail cadastrado' : 'Enviar termo por e-mail'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    !selectedSignature.patient_email
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50'
                  }`}
                >
                  {sendingEmail === selectedSignature.id
                    ? <RefreshCw size={14} className="animate-spin" />
                    : emailSuccess === selectedSignature.id
                    ? <CheckCircle size={14} />
                    : <Mail size={14} />}
                  {emailSuccess === selectedSignature.id
                    ? 'E-mail enviado!'
                    : selectedSignature.email_sent
                    ? 'Reenviar por E-mail'
                    : 'Enviar por E-mail'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthSignatures;
