import { useEffect, useState, useCallback } from 'react'

// Evento customizado para notificar mudança de empresa ativa
export const COMPANY_CHANGED_EVENT = 'hg_company_changed';

// Função utilitária para disparar o evento de mudança de empresa
export function dispatchCompanyChanged(companyId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COMPANY_CHANGED_EVENT, { detail: { companyId } }));
  }
}

// Função utilitária para obter o tenant_id ativo do localStorage
export function getActiveTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // Primeiro: verificar se há empresa ativa explicitamente definida
    const activeCompanyId = localStorage.getItem('hg_active_company_id');
    if (activeCompanyId) return activeCompanyId;

    // Fallback: ler do user
    const user = JSON.parse(localStorage.getItem('hg_current_user') || '{}');
    if (user.companies && user.companies.length > 0) {
      const defaultCompany = user.companies.find((uc: any) => uc.is_default) || user.companies[0];
      return defaultCompany?.company?.id || user.tenantId || null;
    }
    return user.tenantId || null;
  } catch {
    return null;
  }
}

// Função para definir a empresa ativa no localStorage
export function setActiveTenantId(companyId: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hg_active_company_id', companyId);
    dispatchCompanyChanged(companyId);
  }
}

export function useTenantId() {
  const [tenantId, setTenantId] = useState<string | null>(getActiveTenantId);

  const handleCompanyChanged = useCallback((event: Event) => {
    const customEvent = event as CustomEvent;
    const newCompanyId = customEvent.detail?.companyId;
    if (newCompanyId) {
      setTenantId(newCompanyId);
    }
  }, []);

  // Escutar mudanças de storage (para abas múltiplas) e evento customizado
  useEffect(() => {
    // Atualizar com o valor atual
    setTenantId(getActiveTenantId());

    // Escutar evento customizado de mudança de empresa
    window.addEventListener(COMPANY_CHANGED_EVENT, handleCompanyChanged);

    // Escutar mudanças no localStorage (para sincronizar entre abas)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hg_active_company_id' && e.newValue) {
        setTenantId(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(COMPANY_CHANGED_EVENT, handleCompanyChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [handleCompanyChanged]);

  return tenantId;
}
