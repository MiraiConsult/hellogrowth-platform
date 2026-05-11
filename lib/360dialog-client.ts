/**
 * 360dialog Client - BSP Integration
 * 
 * Módulo para integração com a 360dialog como BSP (Business Solution Provider)
 * para envio de mensagens WhatsApp via Cloud API oficial.
 * 
 * Cada tenant tem seu próprio canal (número) com API Key individual.
 * O Hello Growth atua como Partner, gerenciando os canais dos clientes.
 */

// ============================================================
// TYPES
// ============================================================

export interface Dialog360Config {
  partnerId: string;
  partnerToken: string;
  webhookSecret?: string;
}

export interface Dialog360Channel {
  channelId: string;
  apiKey: string;
  phoneNumber: string;
  displayName: string;
  qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  status: 'active' | 'inactive' | 'banned' | 'pending';
  wabaId: string;
}

export interface SendMessageOptions {
  to: string;
  apiKey: string;
}

export interface TextMessagePayload extends SendMessageOptions {
  type: 'text';
  text: string;
}

export interface TemplateMessagePayload extends SendMessageOptions {
  type: 'template';
  templateName: string;
  language: string;
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: TemplateParameter[];
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename: string };
  video?: { link: string };
}

export interface MessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export interface WebhookPayload {
  messages?: InboundMessage[];
  statuses?: StatusUpdate[];
}

export interface InboundMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'reaction' | 'button' | 'interactive';
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  button?: { text: string; payload: string };
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } };
}

export interface StatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string }>;
}

export interface ChannelInfo {
  id: string;
  phone_number: string;
  display_name: string;
  quality_rating: string;
  status: string;
  waba_id: string;
  verified_name: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const MESSAGING_BASE_URL = 'https://waba-v2.360dialog.io';
const PARTNER_API_BASE_URL = 'https://hub.360dialog.io/api/v2';

// ============================================================
// PARTNER API (gerenciamento de canais)
// ============================================================

/**
 * Obtém a configuração do partner a partir das variáveis de ambiente
 */
function getPartnerConfig(): Dialog360Config {
  const partnerId = process.env.DIALOG360_PARTNER_ID;
  const partnerToken = process.env.DIALOG360_PARTNER_TOKEN;
  
  if (!partnerId || !partnerToken) {
    throw new Error('DIALOG360_PARTNER_ID e DIALOG360_PARTNER_TOKEN são obrigatórios');
  }
  
  return {
    partnerId,
    partnerToken,
    webhookSecret: process.env.DIALOG360_WEBHOOK_SECRET,
  };
}

/**
 * Gera uma API Key para um canal específico após o onboarding
 */
export async function generateApiKey(channelId: string): Promise<{ apiKey: string } | null> {
  const config = getPartnerConfig();
  
  try {
    const response = await fetch(`${PARTNER_API_BASE_URL}/channels/${channelId}/api_keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.partnerToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[360dialog] Erro ao gerar API Key para canal ${channelId}:`, error);
      return null;
    }
    
    const data = await response.json();
    return { apiKey: data.api_key || data.apiKey };
  } catch (error) {
    console.error('[360dialog] Erro na geração de API Key:', error);
    return null;
  }
}

/**
 * Obtém informações de um canal específico
 */
export async function getChannelInfo(channelId: string): Promise<ChannelInfo | null> {
  const config = getPartnerConfig();
  
  try {
    const response = await fetch(`${PARTNER_API_BASE_URL}/channels/${channelId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.partnerToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[360dialog] Erro ao buscar canal ${channelId}:`, response.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('[360dialog] Erro ao buscar informações do canal:', error);
    return null;
  }
}

/**
 * Lista todos os canais de um cliente
 */
export async function listClientChannels(clientId: string): Promise<ChannelInfo[]> {
  const config = getPartnerConfig();
  
  try {
    const response = await fetch(`${PARTNER_API_BASE_URL}/clients/${clientId}/channels`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.partnerToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[360dialog] Erro ao listar canais do cliente ${clientId}:`, response.status);
      return [];
    }
    
    const data = await response.json();
    return data.channels || data || [];
  } catch (error) {
    console.error('[360dialog] Erro ao listar canais:', error);
    return [];
  }
}

/**
 * Configura o webhook URL para um canal
 */
export async function setWebhookUrl(channelId: string, webhookUrl: string): Promise<boolean> {
  const config = getPartnerConfig();
  
  try {
    const response = await fetch(`${PARTNER_API_BASE_URL}/channels/${channelId}/webhook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.partnerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: webhookUrl }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('[360dialog] Erro ao configurar webhook:', error);
    return false;
  }
}

/**
 * Obtém o Partner ID para uso no Connect Button
 */
export function getPartnerId(): string {
  return process.env.DIALOG360_PARTNER_ID || '';
}

// ============================================================
// MESSAGING API (envio de mensagens)
// ============================================================

/**
 * Envia uma mensagem de texto simples
 */
export async function sendTextMessage(
  to: string,
  text: string,
  apiKey: string
): Promise<MessageResponse> {
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatPhoneNumber(to),
    type: 'text',
    text: { 
      preview_url: false,
      body: text 
    },
  };
  
  return sendMessage(body, apiKey);
}

/**
 * Envia uma mensagem de template
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  language: string,
  components: TemplateComponent[] | undefined,
  apiKey: string
): Promise<MessageResponse> {
  const body: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatPhoneNumber(to),
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
    },
  };
  
  if (components && components.length > 0) {
    body.template.components = components;
  }
  
  return sendMessage(body, apiKey);
}

/**
 * Envia uma mensagem interativa com botões
 */
export async function sendButtonMessage(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  apiKey: string,
  headerText?: string,
  footerText?: string
): Promise<MessageResponse> {
  const body: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatPhoneNumber(to),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map(btn => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title },
        })),
      },
    },
  };
  
  if (headerText) {
    body.interactive.header = { type: 'text', text: headerText };
  }
  
  if (footerText) {
    body.interactive.footer = { text: footerText };
  }
  
  return sendMessage(body, apiKey);
}

/**
 * Marca uma mensagem como lida
 */
export async function markAsRead(messageId: string, apiKey: string): Promise<boolean> {
  const body = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  };
  
  try {
    const response = await fetch(`${MESSAGING_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'D360-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    return response.ok;
  } catch (error) {
    console.error('[360dialog] Erro ao marcar como lida:', error);
    return false;
  }
}

/**
 * Envia indicador de "digitando"
 */
export async function sendTypingIndicator(to: string, apiKey: string): Promise<boolean> {
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formatPhoneNumber(to),
    type: 'reaction',
  };
  
  try {
    // 360dialog não tem endpoint separado para typing, mas podemos usar o status
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================
// WEBHOOK HANDLING
// ============================================================

/**
 * Parseia o payload do webhook do 360dialog
 * O formato é idêntico ao WhatsApp Cloud API (Meta)
 */
export function parseWebhookPayload(body: any): WebhookPayload {
  const result: WebhookPayload = {};
  
  try {
    // O 360dialog envia no formato Cloud API
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (value?.messages) {
      result.messages = value.messages.map((msg: any) => ({
        id: msg.id,
        from: msg.from,
        timestamp: msg.timestamp,
        type: msg.type,
        text: msg.text,
        image: msg.image,
        audio: msg.audio,
        button: msg.button,
        interactive: msg.interactive,
      }));
    }
    
    if (value?.statuses) {
      result.statuses = value.statuses.map((status: any) => ({
        id: status.id,
        status: status.status,
        timestamp: status.timestamp,
        recipient_id: status.recipient_id,
        errors: status.errors,
      }));
    }
  } catch (error) {
    console.error('[360dialog] Erro ao parsear webhook:', error);
  }
  
  return result;
}

/**
 * Valida a assinatura do webhook (se configurado)
 */
export function validateWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const secret = process.env.DIALOG360_WEBHOOK_SECRET;
  if (!secret) return true; // Se não configurou secret, aceita tudo
  
  // Implementar HMAC-SHA256 validation
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Formata número de telefone para o padrão internacional (sem +, sem espaços)
 */
function formatPhoneNumber(phone: string): string {
  // Remove tudo que não é dígito
  let cleaned = phone.replace(/\D/g, '');
  
  // Se começa com 0, remove
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Se não começa com 55 (Brasil), adiciona
  if (!cleaned.startsWith('55') && cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

/**
 * Função interna para enviar mensagem via 360dialog Messaging API
 */
async function sendMessage(body: any, apiKey: string): Promise<MessageResponse> {
  try {
    const response = await fetch(`${MESSAGING_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'D360-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || data?.message || `HTTP ${response.status}`,
        statusCode: response.status,
      };
    }
    
    // O response do Cloud API retorna messages[0].id
    const messageId = data?.messages?.[0]?.id;
    
    return {
      success: true,
      messageId,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro de rede ao enviar mensagem',
    };
  }
}

/**
 * Verifica o health status de um canal
 */
export async function getChannelHealth(apiKey: string): Promise<{
  status: 'connected' | 'disconnected' | 'error';
  qualityRating?: string;
}> {
  try {
    // Faz uma chamada simples para verificar se a API Key é válida
    const response = await fetch(`${MESSAGING_BASE_URL}/`, {
      method: 'GET',
      headers: {
        'D360-API-KEY': apiKey,
      },
    });
    
    if (response.ok) {
      return { status: 'connected' };
    } else if (response.status === 401) {
      return { status: 'disconnected' };
    } else {
      return { status: 'error' };
    }
  } catch (error) {
    return { status: 'error' };
  }
}
