/**
 * Retorna a URL base correta para links públicos
 * Usa a variável de ambiente NEXT_PUBLIC_APP_URL se disponível,
 * caso contrário usa window.location.origin (removendo hashes de preview do Vercel)
 */
export function getBaseUrl(): string {
  // Se tiver variável de ambiente configurada, usa ela
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // No cliente, usa window.location.origin
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    // Remove hashes de preview do Vercel (ex: hellogrowth-platform1-abc123-user.vercel.app)
    // Padrão: nome-hash-user.vercel.app -> nome.vercel.app
    const vercelPreviewPattern = /^(https?:\/\/[^-]+-)[a-z0-9]+-[^.]+\.vercel\.app$/;
    if (vercelPreviewPattern.test(origin)) {
      // Extrai o nome base do projeto
      const match = origin.match(/^(https?:\/\/)([^-]+)/);
      if (match) {
        return `${match[1]}${match[2]}.vercel.app`;
      }
    }
    
    return origin;
  }
  
  // Fallback
  return '';
}

/**
 * Gera link para pesquisa NPS
 */
export function getSurveyLink(surveyId: string): string {
  return `${getBaseUrl()}/?survey=${surveyId}`;
}

/**
 * Gera link para formulário público
 */
export function getFormLink(formId: string): string {
  return `${getBaseUrl()}/?form=${formId}`;
}
