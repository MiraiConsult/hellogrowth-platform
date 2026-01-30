import React, { useState, useEffect } from 'react';
import { Copy, Check, Sparkles, MessageSquare, Mail, Phone, Send, Loader2, AlertCircle } from 'lucide-react';
import { getMessageSuggestions, MessageSuggestion, ClientContext } from '@/components/MessageSuggestionEngine';
import { supabase } from '@/lib/supabase';

interface MessageSuggestionsPanelProps {
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    type: 'lead' | 'nps';
    score?: number;
    status?: string;
    comment?: string;
    leadStatus?: string;
    value?: number;
    lastInteraction?: string;
    daysSinceLastContact?: number;
    answers?: any;
  };
  insightType: 'risk' | 'opportunity' | 'sales' | 'recovery';
  onMessageSelect?: (suggestion: MessageSuggestion | null) => void;
  showSendButtons?: boolean;
}

export const MessageSuggestionsPanel: React.FC<MessageSuggestionsPanelProps> = ({ 
  client, 
  insightType, 
  onMessageSelect,
  showSendButtons = true 
}) => {
  const [suggestions, setSuggestions] = useState<MessageSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<MessageSuggestion | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    // Calcular dias desde último contato
    const daysSinceLastContact = client.lastInteraction
      ? Math.floor((Date.now() - new Date(client.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Montar contexto do cliente
    const context: ClientContext = {
      name: client.name,
      email: client.email,
      phone: client.phone,
      type: client.type,
      score: client.score,
      status: client.status,
      comment: client.comment,
      leadStatus: client.leadStatus,
      value: client.value,
      lastInteraction: client.lastInteraction,
      daysSinceLastContact,
      answers: client.answers,
      insightType,
    };

    // Gerar sugestões
    const generatedSuggestions = getMessageSuggestions(context);
    setSuggestions(generatedSuggestions);
    
    // Selecionar primeira sugestão por padrão
    if (generatedSuggestions.length > 0) {
      setSelectedSuggestion(generatedSuggestions[0]);
      onMessageSelect?.(generatedSuggestions[0]);
    }

    checkGmailConnection();
  }, [client, insightType]);

  const checkGmailConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('gmail_connections')
        .select('id')
        .eq('user_id', user.id)
        .single();

      setIsGmailConnected(!!data);
    } catch (err) {
      console.error('Error checking Gmail connection:', err);
    }
  };

  const handleSelectSuggestion = (suggestion: MessageSuggestion) => {
    setSelectedSuggestion(suggestion);
    onMessageSelect?.(suggestion);
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedSuggestion || !client.phone) {
      alert('Cliente não possui telefone cadastrado ou nenhuma mensagem selecionada.');
      return;
    }
    const phone = client.phone.replace(/[^0-9]/g, '');
    if (!phone) {
      alert('Telefone inválido.');
      return;
    }
    const message = encodeURIComponent(selectedSuggestion.whatsappMessage);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handleSendEmail = async () => {
    if (!selectedSuggestion || !client.email) {
      alert('Cliente não possui email cadastrado ou nenhuma mensagem selecionada.');
      return;
    }

    if (isGmailConnected) {
      setIsSendingEmail(true);
      setSendError(null);
      setSendSuccess(false);

      try {
        const response = await fetch('/api/gmail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: client.email,
            subject: selectedSuggestion.emailSubject,
            content: selectedSuggestion.emailBody
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao enviar email');
        }

        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
      } catch (err: any) {
        setSendError(err.message);
      } finally {
        setIsSendingEmail(false);
      }
    } else {
      const subject = encodeURIComponent(selectedSuggestion.emailSubject);
      const body = encodeURIComponent(selectedSuggestion.emailBody);
      window.open(`mailto:${client.email}?subject=${subject}&body=${body}`, '_blank');
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'formal': return 'text-gray-700 bg-gray-100';
      case 'friendly': return 'text-blue-700 bg-blue-100';
      case 'empathetic': return 'text-purple-700 bg-purple-100';
      case 'enthusiastic': return 'text-orange-700 bg-orange-100';
      case 'professional': return 'text-indigo-700 bg-indigo-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getToneLabel = (tone: string) => {
    switch (tone) {
      case 'formal': return 'Formal';
      case 'friendly': return 'Amigável';
      case 'empathetic': return 'Empático';
      case 'enthusiastic': return 'Entusiasmado';
      case 'professional': return 'Profissional';
      default: return tone;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'recovery': return 'text-red-700 bg-red-50 border-red-200';
      case 'sales': return 'text-green-700 bg-green-50 border-green-200';
      case 'relationship': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'followup': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'offer': return 'text-purple-700 bg-purple-50 border-purple-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  if (suggestions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Sugestões de Mensagens IA</h3>
        </div>
        <p className="text-gray-600">Carregando sugestões...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Botões de Envio Rápido */}
      {showSendButtons && (
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-3">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSendWhatsApp}
              disabled={!client.phone || !selectedSuggestion}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
            >
              <Phone size={18} />
              Enviar WhatsApp
            </button>
            <div className="flex flex-col gap-1">
              <button
                onClick={handleSendEmail}
                disabled={!client.email || !selectedSuggestion || isSendingEmail}
                className={`px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
                  isGmailConnected 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              >
                {isSendingEmail ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                {isSendingEmail ? 'Enviando...' : isGmailConnected ? 'Enviar via Gmail' : 'Enviar Email'}
              </button>
              {sendSuccess && <p className="text-[10px] text-green-600 text-center font-bold">Email enviado!</p>}
              {sendError && <p className="text-[10px] text-red-600 text-center font-bold">{sendError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Sugestões de Mensagens IA</h3>
        <span className="ml-auto text-sm text-gray-500">{suggestions.length} sugestões</span>
      </div>

      {/* Tipos de Mensagem */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Escolha o tipo de mensagem:
        </label>
        <div className="grid grid-cols-1 gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`
                p-3 rounded-lg border-2 text-left transition-all
                ${selectedSuggestion?.id === suggestion.id
                  ? getTypeColor(suggestion.type) + ' border-current shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{suggestion.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{suggestion.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getToneColor(suggestion.tone)}`}>
                      {getToneLabel(suggestion.tone)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{suggestion.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mensagens Geradas */}
      {selectedSuggestion && (
        <div className="space-y-4">
          {/* WhatsApp */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-700" />
                <span className="font-medium text-green-900">Mensagem WhatsApp</span>
              </div>
              <button
                onClick={() => handleCopy(selectedSuggestion.whatsappMessage, 'whatsapp')}
                className="flex items-center gap-1 px-3 py-1 text-sm text-green-700 hover:bg-green-100 rounded-lg transition-colors"
              >
                {copiedField === 'whatsapp' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSuggestion.whatsappMessage}</p>
          </div>

          {/* Email */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-700" />
                <span className="font-medium text-blue-900">Email</span>
              </div>
              <button
                onClick={() => handleCopy(`Assunto: ${selectedSuggestion.emailSubject}\n\n${selectedSuggestion.emailBody}`, 'email')}
                className="flex items-center gap-1 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
              >
                {copiedField === 'email' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-xs font-medium text-blue-700">Assunto:</span>
                <p className="text-sm text-gray-700 font-medium">{selectedSuggestion.emailSubject}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-blue-700">Corpo:</span>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSuggestion.emailBody}</p>
              </div>
            </div>
          </div>

          {/* Dica */}
          {!isGmailConnected && (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-orange-900 mb-1">Gmail não conectado:</p>
                  <p className="text-xs text-orange-700">
                    Conecte seu Gmail nas configurações para enviar emails diretamente pela plataforma sem precisar copiar e colar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageSuggestionsPanel;
