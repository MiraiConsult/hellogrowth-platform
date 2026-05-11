'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Phone, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle, 
  RefreshCw,
  Shield,
  Wifi,
  WifiOff,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface WhatsAppConnection {
  id: string;
  tenant_id: string;
  provider: string;
  channel_id: string;
  phone_number: string;
  display_name: string;
  quality_rating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  status: 'active' | 'inactive' | 'banned' | 'pending';
  waba_id: string;
  connected_at: string;
  google_review_link?: string;
}

interface Props {
  tenantId: string;
}

export default function WhatsAppConnect({ tenantId }: Props) {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [googleReviewLink, setGoogleReviewLink] = useState('');
  const [savingReviewLink, setSavingReviewLink] = useState(false);

  // Buscar conexão existente
  const fetchConnection = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/whatsapp-connection?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setConnection(data.connection || null);
        if (data.connection?.google_review_link) {
          setGoogleReviewLink(data.connection.google_review_link);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar conexão:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Listener para callback do Embedded Signup (popup da Meta)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Callback do 360dialog Connect Button
      if (event.data?.type === '360dialog-connect' || event.data?.client) {
        const { client, channels } = event.data;
        if (channels && channels.length > 0) {
          await handleOnboardingCallback(client, channels[0]);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tenantId]);

  // Processar callback do onboarding
  const handleOnboardingCallback = async (clientId: string, channelId: string) => {
    try {
      setConnecting(true);
      setError(null);

      const res = await fetch('/api/whatsapp-connection/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, clientId, channelId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao processar onboarding');
      }

      const data = await res.json();
      setConnection(data.connection);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  // Iniciar Embedded Signup via popup
  const handleConnect = () => {
    setConnecting(true);
    setError(null);

    // Abrir popup do 360dialog Embedded Signup
    const partnerId = process.env.NEXT_PUBLIC_DIALOG360_PARTNER_ID;
    const redirectUrl = encodeURIComponent(`${window.location.origin}/api/whatsapp-connection/callback`);
    
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `https://hub.360dialog.com/dashboard/app/${partnerId}/permissions?redirect_url=${redirectUrl}`,
      '360dialog-connect',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    // Monitorar fechamento do popup
    const checkPopup = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopup);
        setConnecting(false);
        // Recarregar conexão para ver se foi criada
        setTimeout(fetchConnection, 2000);
      }
    }, 1000);
  };

  // Desconectar WhatsApp
  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp? As conversas ativas serão pausadas.')) {
      return;
    }

    try {
      setDisconnecting(true);
      const res = await fetch('/api/whatsapp-connection', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, connectionId: connection?.id }),
      });

      if (res.ok) {
        setConnection(null);
      }
    } catch (err) {
      console.error('Erro ao desconectar:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  // Salvar link do Google Reviews
  const handleSaveReviewLink = async () => {
    try {
      setSavingReviewLink(true);
      const res = await fetch('/api/whatsapp-connection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tenantId, 
          connectionId: connection?.id,
          googleReviewLink 
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConnection(data.connection);
      }
    } catch (err) {
      console.error('Erro ao salvar link:', err);
    } finally {
      setSavingReviewLink(false);
    }
  };

  // Copiar webhook URL
  const handleCopyWebhook = () => {
    const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quality Rating badge
  const getQualityBadge = (rating: string) => {
    switch (rating) {
      case 'GREEN':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Verde</span>;
      case 'YELLOW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Amarelo</span>;
      case 'RED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Vermelho</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Desconhecido</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
        <span className="ml-2 text-gray-600">Carregando configuração do WhatsApp...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-600" />
            Conexão WhatsApp
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Conecte o número da sua clínica via WhatsApp Business API oficial (Meta Cloud API)
          </p>
        </div>
        {connection && (
          <button
            onClick={fetchConnection}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Atualizar status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Erro na conexão</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Não conectado */}
      {!connection && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Conectar WhatsApp Business
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Conecte o número da sua clínica para enviar mensagens automáticas via IA. 
            O processo é seguro e usa a API oficial do Meta.
          </p>

          {/* Passos */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 text-left max-w-2xl mx-auto">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span className="text-sm text-gray-600">Faça login com Facebook/Meta Business</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span className="text-sm text-gray-600">Selecione ou crie uma WhatsApp Business Account</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span className="text-sm text-gray-600">Insira o número da clínica e verifique via SMS</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span className="text-sm text-gray-600">Defina o nome de exibição</span>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {connecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                Conectar WhatsApp
              </>
            )}
          </button>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Shield className="w-3 h-3" />
            Processo seguro via Meta (Embedded Signup)
          </div>
        </div>
      )}

      {/* Conectado */}
      {connection && (
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  connection.status === 'active' ? 'bg-green-500 animate-pulse' : 
                  connection.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="font-medium text-gray-900">
                  {connection.status === 'active' ? 'Conectado' : 
                   connection.status === 'pending' ? 'Pendente' : 'Desconectado'}
                </span>
              </div>
              {getQualityBadge(connection.quality_rating)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Número</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{connection.phone_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Nome de Exibição</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{connection.display_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Conectado em</p>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {new Date(connection.connected_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Quality Rating Warning */}
            {connection.quality_rating === 'YELLOW' && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-yellow-800">Quality Rating em alerta</p>
                  <p className="text-xs text-yellow-600">Reduza o volume de mensagens ou melhore o conteúdo para evitar restrições.</p>
                </div>
              </div>
            )}

            {connection.quality_rating === 'RED' && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-800">Quality Rating crítico</p>
                  <p className="text-xs text-red-600">Seu número pode ser restringido. Revise suas mensagens imediatamente.</p>
                </div>
              </div>
            )}
          </div>

          {/* Webhook URL */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Webhook URL</h3>
            <p className="text-xs text-gray-500 mb-2">
              Configure esta URL no painel do 360dialog para receber mensagens e atualizações de status.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '/api/whatsapp/webhook'}
              </code>
              <button
                onClick={handleCopyWebhook}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Copiar URL"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Google Review Link */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Link do Google Reviews</h3>
            <p className="text-xs text-gray-500 mb-3">
              A IA enviará este link para promotores (NPS 9-10) solicitando uma avaliação no Google.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={googleReviewLink}
                onChange={(e) => setGoogleReviewLink(e.target.value)}
                placeholder="https://g.page/r/sua-clinica/review"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={handleSaveReviewLink}
                disabled={savingReviewLink || googleReviewLink === (connection.google_review_link || '')}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingReviewLink ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </button>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <a
              href="https://hub.360dialog.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir 360dialog Hub
            </a>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              Desconectar
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Como funciona?</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Seu número é registrado oficialmente na API do WhatsApp Business (Meta Cloud API)</li>
          <li>• Sem risco de bloqueio — diferente de soluções não-oficiais</li>
          <li>• As mensagens da IA são enviadas do número da sua clínica</li>
          <li>• Os pacientes respondem diretamente para o seu número</li>
          <li>• Quality Rating monitora a saúde do seu número em tempo real</li>
        </ul>
      </div>
    </div>
  );
}
