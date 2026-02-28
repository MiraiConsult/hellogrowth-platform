import { useEffect, useState } from 'react'

export function useTenantId() {
  // Try to read synchronously first if we're in browser
  const getInitialTenantId = () => {
    if (typeof window === 'undefined') return null;
    try {
      const user = JSON.parse(localStorage.getItem('hg_current_user') || '{}');
      // Check if user has companies and get active company
      if (user.companies && user.companies.length > 0) {
        const defaultCompany = user.companies.find((uc: any) => uc.is_default) || user.companies[0];
        return defaultCompany?.company?.id || user.tenantId || null;
      }
      return user.tenantId || null;
    } catch {
      return null;
    }
  };

  const [tenantId, setTenantId] = useState<string | null>(getInitialTenantId);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('hg_current_user') || '{}');
    // Check if user has companies and get active company
    if (user.companies && user.companies.length > 0) {
      const defaultCompany = user.companies.find((uc: any) => uc.is_default) || user.companies[0];
      setTenantId(defaultCompany?.company?.id || user.tenantId || null);
    } else {
      setTenantId(user.tenantId || null);
    }
  }, []);

  return tenantId;
}
