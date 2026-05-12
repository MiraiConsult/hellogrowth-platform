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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  // join com leads
  lead?: {
    id: string;
    name: string;
    answers: Record<string, any>;
    form_source: string;
  };
  // join com forms
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
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignatures = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      // Buscar via API server-side (usa service_role key, bypassa RLS)
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

  const handleSendEmail = async (sig: HealthSignature) => {
    setSendingEmail(sig.id);
    setEmailSuccess(null);
    try {
      const res = await fetch('/api/health/send-signature-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureId: sig.id,
          tenantId: tenantId,
          patientName: sig.patient_name,
          patientEmail: sig.patient_email,
          signatureImage: sig.signature_image,
          consentText: sig.consent_text,
          signedAt: sig.signed_at,
          formName: sig.form?.name || 'Formulário',
        }),
      });
      if (res.ok) {
        setEmailSuccess(sig.id);
        // Atualizar localmente
        setSignatures(prev =>
          prev.map(s => s.id === sig.id ? { ...s, email_sent: true } : s)
        );
        if (selectedSignature?.id === sig.id) {
          setSelectedSignature(prev => prev ? { ...prev, email_sent: true } : null);
        }
        setTimeout(() => setEmailSuccess(null), 3000);
      } else {
        alert('Erro ao enviar e-mail. Verifique as configurações de e-mail.');
      }
    } catch (err) {
      console.error('[HealthSignatures] Erro ao enviar e-mail:', err);
      alert('Erro ao enviar e-mail.');
    } finally {
      setSendingEmail(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
                <th className="text-left px-5 py-3 font-semibold text-slate-600">E-mail</th>
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
                    <div>{sig.patient_email || '—'}</div>
                    <div className="text-xs text-slate-400">{sig.patient_phone || ''}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                      {sig.form?.name || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {formatDate(sig.signed_at)}
                  </td>
                  <td className="px-5 py-3.5">
                    {sig.email_sent ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle size={13} /> Enviado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <Clock size={13} /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleSendEmail(sig)}
                      disabled={sendingEmail === sig.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      title="Enviar comprovante por e-mail"
                    >
                      {sendingEmail === sig.id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : emailSuccess === sig.id ? (
                        <CheckCircle size={12} />
                      ) : (
                        <Send size={12} />
                      )}
                      {emailSuccess === sig.id ? 'Enviado!' : 'Enviar e-mail'}
                    </button>
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
                    <p className="font-medium text-slate-700">{selectedSignature.patient_email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Phone size={11} /> Telefone</p>
                    <p className="font-medium text-slate-700">{selectedSignature.patient_phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Calendar size={11} /> Data/Hora</p>
                    <p className="font-medium text-slate-700">{formatDate(selectedSignature.signed_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1"><Globe size={11} /> IP</p>
                    <p className="font-medium text-slate-700 font-mono text-xs">{selectedSignature.ip_address || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Status E-mail</p>
                    {selectedSignature.email_sent ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle size={12} /> Enviado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <Clock size={12} /> Pendente
                      </span>
                    )}
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
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-white sticky bottom-0">
              <button
                onClick={() => setSelectedSignature(null)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => handleSendEmail(selectedSignature)}
                disabled={sendingEmail === selectedSignature.id}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {sendingEmail === selectedSignature.id ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : emailSuccess === selectedSignature.id ? (
                  <CheckCircle size={14} />
                ) : (
                  <Mail size={14} />
                )}
                {emailSuccess === selectedSignature.id
                  ? 'E-mail enviado!'
                  : selectedSignature.email_sent
                  ? 'Reenviar comprovante'
                  : 'Enviar comprovante por e-mail'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthSignatures;
