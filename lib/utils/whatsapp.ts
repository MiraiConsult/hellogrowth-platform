/**
 * Remove emojis e caracteres especiais Unicode de uma string,
 * deixando apenas texto legível para envio via wa.me
 */
export function stripEmojis(text: string): string {
  if (!text) return '';
  
  // Regex abrangente que cobre todos os blocos de emoji e símbolos Unicode
  // Inclui: Emoticons, Misc Symbols, Dingbats, Transport, Enclosed, Supplemental, etc.
  const emojiRegex =
    /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{FE00}-\u{FEFF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FAFF}]|[\u{E0000}-\u{E007F}]|\u200D|\uFE0F|\uFE0E/gu;

  return text
    .replace(emojiRegex, '')
    // Remove espaços duplos que possam ter sobrado após remoção
    .replace(/  +/g, ' ')
    .trim();
}

/**
 * Sanitiza e encoda uma mensagem para uso em links wa.me,
 * removendo emojis que causam problemas de encoding no WhatsApp
 */
export function encodeWhatsAppMessage(message: string): string {
  if (!message) return '';
  
  // 1. Remover emojis
  const clean = stripEmojis(message);
  
  // 2. Normalizar para forma canônica NFC
  const normalized = clean.normalize('NFC');
  
  // 3. Encodar para URL
  return encodeURIComponent(normalized);
}

/**
 * Abre o WhatsApp com o número e mensagem fornecidos
 * Aplica sanitização automática na mensagem
 */
export function openWhatsApp(phone: string, message?: string): void {
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  
  let url = `https://wa.me/${phoneWithCountry}`;
  
  if (message) {
    url += `?text=${encodeWhatsAppMessage(message)}`;
  }
  
  window.open(url, '_blank');
}
