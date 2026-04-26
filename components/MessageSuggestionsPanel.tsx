import React, { useState, useEffect } from 'react';
import { encodeWhatsAppMessage } from '@/lib/utils/whatsapp';
import { Copy, Check, Sparkles, MessageSquare, Mail, Phone, Send, Loader2, AlertCircle, RefreshCw, Pencil, X } from 'lucide-react';
import { 
  getMessageSuggestions, 
  getAvailableMessageTypes, 
  generateMessageSuggestion,
  MessageSuggestion, 
  ClientContext,
  BusinessContext
} from '@/components/MessageSuggestionEngine';
import { supabase } from '@/lib/supabase';
import { useTenantId } from '@/hooks/useTenantId';

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

interface MessageTypeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  tone: string;
  priority: number;
}

export const MessageSuggestionsPanel: React.FC<MessageSuggestionsPanelProps> = ({ 
  client, 
  insightType, 
  onMessageSelect,
  showSendButtons = true 
}) => {
  const tenantId = useTenantId();
  const [messageTypes, setMessageTypes] = useState<MessageTypeOption[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<MessageSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [clientContext, setClientContext] = useState<ClientContext | null>(null);
  // Estados de edição inline
  const [isEditingWhatsapp, setIsEditingWhatsapp] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedWhatsapp, setEditedWhatsapp] = useState('');
  const [editedEmailSubject, setEditedEmailSubject] = useState('');
  const [editedEmailBody, setEditedEmailBody] = useState('');

  useEffect(() => {
    async function loadContextAndInit() {
      // Carregar dados da empresa (business_profile + products)
      let businessContext: BusinessContext | undefined;
      if (supabase && tenantId) {
        try {
          const [profileRes, productsRes, companyRes] = await Promise.all([
            supabase.from('business_profile').select('*').eq('tenant_id', tenantId).single(),
            supabase.from('products').select('name, price, description').eq('tenant_id', tenantId).limit(15),
            supabase.from('companies').select('name').eq('id', tenantId).single(),
          ]);
          
          businessContext = {
            companyName: companyRes.data?.name || '',
            businessType: profileRes.data?.business_type || '',
            businessDescription: profileRes.data?.business_description || '',
            targetAudience: profileRes.data?.target_audience || '',
            brandTone: profileRes.data?.brand_tone || '',
            differentials: profileRes.data?.differentials || '',
            mainPainPoints: profileRes.data?.main_pain_points || '',
            products: productsRes.data?.map((p: any) => ({ name: p.name, price: p.price, description: p.description })) || [],
          };
        } catch (e) {
          console.warn('Erro ao carregar contexto da empresa:', e);
        }
      }

      // Calcular dias desde ultimo contato
      const daysSinceLastContact = client.lastInteraction
        ? Math.floor((Date.now() - new Date(client.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Montar contexto do cliente com dados da empresa
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
        businessContext,
      };

      setClientContext(context);

      // Obter tipos de mensagem disponiveis
      const availableTypes = getAvailableMessageTypes(context);
      setMessageTypes(availableTypes.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        icon: t.icon,
        tone: t.tone,
        priority: t.priority
      })));
      
      // Selecionar primeiro tipo por padrao e gerar mensagem
      if (availableTypes.length > 0) {
        setSelectedTypeId(availableTypes[0].id);
        generateMessage(context, availableTypes[0].id);
      }
    }

    loadContextAndInit();
    checkGmailConnection();
  }, [client.id, insightType, tenantId]);

  const generateMessage = async (context: ClientContext, typeId: string) => {
    setIsGenerating(true);
    setGeneratedMessage(null);
    
    try {
      const message = await generateMessageSuggestion(context, typeId);
      setGeneratedMessage(message);
      resetEdits();
      onMessageSelect?.(message);
    } catch (error) {
      console.error('Erro ao gerar mensagem:', error);
      // Fallback para mensagem básica
      const fallbackSuggestions = getMessageSuggestions(context);
      const fallback = fallbackSuggestions.find(s => s.id === typeId) || fallbackSuggestions[0];
      setGeneratedMessage(fallback);
      onMessageSelect?.(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectType = async (typeId: string) => {
    setSelectedTypeId(typeId);
    if (clientContext) {
      await generateMessage(clientContext, typeId);
    }
  };

  // Ao gerar nova mensagem, resetar edições
  const resetEdits = () => {
    setIsEditingWhatsapp(false);
    setIsEditingEmail(false);
    setEditedWhatsapp('');
    setEditedEmailSubject('');
    setEditedEmailBody('');
  };

  const handleRegenerate = async () => {
    if (clientContext && selectedTypeId) {
      await generateMessage(clientContext, selectedTypeId);
    }
  };

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

  // Retorna o texto atual (editado ou original)
  const getWhatsappText = () => isEditingWhatsapp ? editedWhatsapp : (editedWhatsapp || generatedMessage?.whatsappMessage || '');
  const getEmailSubject = () => isEditingEmail ? editedEmailSubject : (editedEmailSubject || generatedMessage?.emailSubject || '');
  const getEmailBody = () => isEditingEmail ? editedEmailBody : (editedEmailBody || generatedMessage?.emailBody || '');

  const handleStartEditWhatsapp = () => {
    setEditedWhatsapp(generatedMessage?.whatsappMessage || '');
    setIsEditingWhatsapp(true);
  };

  const handleSaveWhatsapp = () => {
    setIsEditingWhatsapp(false);
    // Atualiza o generatedMessage com o texto editado
    if (generatedMessage) {
      const updated = { ...generatedMessage, whatsappMessage: editedWhatsapp };
      setGeneratedMessage(updated);
      onMessageSelect?.(updated);
    }
  };

  const handleCancelWhatsapp = () => {
    setIsEditingWhatsapp(false);
    setEditedWhatsapp('');
  };

  const handleStartEditEmail = () => {
    setEditedEmailSubject(generatedMessage?.emailSubject || '');
    setEditedEmailBody(generatedMessage?.emailBody || '');
    setIsEditingEmail(true);
  };

  const handleSaveEmail = () => {
    setIsEditingEmail(false);
    if (generatedMessage) {
      const updated = { ...generatedMessage, emailSubject: editedEmailSubject, emailBody: editedEmailBody };
      setGeneratedMessage(updated);
      onMessageSelect?.(updated);
    }
  };

  const handleCancelEmail = () => {
    setIsEditingEmail(false);
    setEditedEmailSubject('');
    setEditedEmailBody('');
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
    if (!generatedMessage || !client.phone) {
      alert('Cliente não possui telefone cadastrado ou nenhuma mensagem selecionada.');
      return;
    }
    const phone = client.phone.replace(/[^0-9]/g, '');
    if (!phone) {
      alert('Telefone inválido.');
      return;
    }
    const message = encodeWhatsAppMessage(generatedMessage.whatsappMessage);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handleSendEmail = async () => {
    if (!generatedMessage || !client.email) {
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
            subject: generatedMessage.emailSubject,
            content: generatedMessage.emailBody
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
      const subject = encodeURIComponent(generatedMessage.emailSubject);
      const body = encodeURIComponent(generatedMessage.emailBody);
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

  if (messageTypes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Sugestões de Mensagens IA</h3>
        </div>
        <p className="text-gray-600">Carregando opções...</p>
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
              disabled={!client.phone || !generatedMessage || isGenerating}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
            >
              <Phone size={18} />
              Enviar WhatsApp
            </button>
            <div className="flex flex-col gap-1">
              <button
                disabled={true}
                className="px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors bg-gray-100 text-gray-400 cursor-not-allowed relative"
              >
                <Mail size={18} />
                Enviar Email
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Em Breve</span>
              </button>
              <p className="text-[10px] text-gray-500 text-center">Funcionalidade em desenvolvimento</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Sugestões de Mensagens IA</h3>
        <span className="ml-auto text-sm text-gray-500">{messageTypes.length} sugestões</span>
      </div>

      {/* Tipos de Mensagem */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Escolha o tipo de mensagem:
        </label>
        <div className="grid grid-cols-1 gap-2">
          {messageTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelectType(type.id)}
              disabled={isGenerating}
              className={`
                p-3 rounded-lg border-2 text-left transition-all
                ${selectedTypeId === type.id
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
                ${isGenerating ? 'opacity-50 cursor-wait' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{type.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{type.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getToneColor(type.tone)}`}>
                      {getToneLabel(type.tone)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mensagem Gerada */}
      {isGenerating ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-gray-600 text-sm">Gerando mensagem personalizada com IA...</p>
          <p className="text-gray-400 text-xs">Analisando respostas do cliente</p>
        </div>
      ) : generatedMessage ? (
        <div className="space-y-4">
          {/* Botão Regenerar */}
          <div className="flex justify-end">
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              <RefreshCw size={14} />
              Gerar nova versão
            </button>
          </div>

          {/* WhatsApp */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-700" />
                <span className="font-medium text-green-900">Mensagem WhatsApp</span>
              </div>
              <div className="flex items-center gap-1">
                {isEditingWhatsapp ? (
                  <>
                    <button
                      onClick={handleSaveWhatsapp}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded transition-colors font-medium"
                    >
                      <Check className="w-3 h-3" />
                      Salvar
                    </button>
                    <button
                      onClick={handleCancelWhatsapp}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStartEditWhatsapp}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 hover:bg-green-100 rounded transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleCopy(generatedMessage.whatsappMessage, 'whatsapp')}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 hover:bg-green-100 rounded transition-colors"
                    >
                      {copiedField === 'whatsapp' ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copiar
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
            {isEditingWhatsapp ? (
              <textarea
                value={editedWhatsapp}
                onChange={(e) => setEditedWhatsapp(e.target.value)}
                className="w-full text-sm text-gray-700 bg-white border border-green-300 rounded-lg p-3 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-green-400"
                rows={Math.max(4, editedWhatsapp.split('\n').length + 1)}
                autoFocus
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {generatedMessage.whatsappMessage}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-700" />
                <span className="font-medium text-blue-900">Email</span>
              </div>
              <div className="flex items-center gap-1">
                {isEditingEmail ? (
                  <>
                    <button
                      onClick={handleSaveEmail}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors font-medium"
                    >
                      <Check className="w-3 h-3" />
                      Salvar
                    </button>
                    <button
                      onClick={handleCancelEmail}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleStartEditEmail}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleCopy(`Assunto: ${generatedMessage.emailSubject}\n\n${generatedMessage.emailBody}`, 'email')}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 rounded transition-colors"
                    >
                      {copiedField === 'email' ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copiar
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
            {isEditingEmail ? (
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-blue-600 font-medium">Assunto:</span>
                  <input
                    type="text"
                    value={editedEmailSubject}
                    onChange={(e) => setEditedEmailSubject(e.target.value)}
                    className="w-full text-sm text-gray-900 bg-white border border-blue-300 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    autoFocus
                  />
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Corpo:</span>
                  <textarea
                    value={editedEmailBody}
                    onChange={(e) => setEditedEmailBody(e.target.value)}
                    className="w-full text-sm text-gray-700 bg-white border border-blue-300 rounded-lg p-3 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 mt-1"
                    rows={Math.max(6, editedEmailBody.split('\n').length + 2)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-blue-600 font-medium">Assunto:</span>
                  <p className="text-sm text-gray-900 font-medium">{generatedMessage.emailSubject}</p>
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Corpo:</span>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-1">
                    {generatedMessage.emailBody}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MessageSuggestionsPanel;
