/**
 * Helper para registrar logs de atividade dos clientes.
 * Fire-and-forget: não bloqueia a ação do usuário em caso de falha.
 */

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'send'
  | 'view'
  | 'export'
  | 'import'
  | 'error';

export type ActivityEntityType =
  | 'form'
  | 'campaign'
  | 'lead'
  | 'product'
  | 'company'
  | 'colaborador'
  | 'note'
  | 'session'
  | 'report'
  | 'integration'
  | 'other';

export interface LogActivityParams {
  tenant_id?: string;
  user_email?: string;
  user_name?: string;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id?: string;
  entity_name?: string;
  details?: Record<string, any>;
  error_message?: string;
  is_error?: boolean;
}

/**
 * Registra uma ação do usuário de forma assíncrona (fire-and-forget).
 * Nunca lança exceção — não deve bloquear o fluxo principal.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await fetch('/api/admin/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    // Silencioso — log não deve quebrar a experiência do usuário
  }
}

/**
 * Registra um erro do sistema de forma assíncrona.
 */
export async function logError(params: Omit<LogActivityParams, 'action' | 'is_error'> & { error_message: string }): Promise<void> {
  return logActivity({ ...params, action: 'error', is_error: true });
}
