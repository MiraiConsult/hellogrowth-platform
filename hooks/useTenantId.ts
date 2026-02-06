import { useEffect, useState } from 'react'

export function useTenantId() {
  // Try to read synchronously first if we're in browser
  const getInitialTenantId = () => {
    if (typeof window === 'undefined') return null;
    try {
      const user = JSON.parse(localStorage.getItem('hg_current_user') || '{}');
      return user.tenantId || null;
    } catch {
      return null;
    }
  };

  const [tenantId, setTenantId] = useState<string | null>(getInitialTenantId);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('hg_current_user') || '{}');
    setTenantId(user.tenantId || null);
  }, []);

  return tenantId;
}
