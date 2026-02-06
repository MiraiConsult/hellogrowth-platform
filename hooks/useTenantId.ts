import { useEffect, useState } from 'react'

export function useTenantId() {
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('hg_current_user') || '{}')
    setTenantId(user.tenantId || null)
  }, [])

  return tenantId
}
