/**
 * Sanitiza e encoda uma mensagem para uso em links wa.me
 * 
 * O problema: o Gemini AI retorna emojis em formato UTF-16 surrogate pairs
 * ou com caracteres Unicode especiais que, após encodeURIComponent, geram
 * sequências que o WhatsApp não consegue decodificar — resultando em ◆
 * 
 * A solução: normalizar com NFC antes de encodar, convertendo os emojis
 * para sua forma canônica UTF-8.
 */
export function encodeWhatsAppMessage(message: string): string {
  if (!message) return '';
  
  // 1. Normalizar para forma canônica NFC (resolve surrogate pairs e variantes Unicode)
  const normalized = message.normalize('NFC');
  
  // 2. Encodar para URL
  return encodeURIComponent(normalized);
}

/**
 * Abre o WhatsApp com o número e mensagem fornecidos
 * Aplica sanitização automática na mensagem
 */
export function openWhatsApp(phone: string, message?: string): void {
  // Limpar o número (apenas dígitos)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Adicionar código do país se necessário
  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  
  let url = `https://wa.me/${phoneWithCountry}`;
  
  if (message) {
    url += `?text=${encodeWhatsAppMessage(message)}`;
  }
  
  window.open(url, '_blank');
}
