import { useMemo } from 'react';

export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

interface Permissions {
  canManageTeam: boolean;
  canManageProducts: boolean;
  canManageForms: boolean;
  canManageLeads: boolean;
  canSendMessages: boolean;
  canViewReports: boolean;
  canEditBusinessProfile: boolean;
  canManageCampaigns: boolean;
}

export function usePermissions(role?: UserRole): Permissions {
  return useMemo(() => {
    switch (role) {
      case 'admin':
        return {
          canManageTeam: true,
          canManageProducts: true,
          canManageForms: true,
          canManageLeads: true,
          canSendMessages: true,
          canViewReports: true,
          canEditBusinessProfile: true,
          canManageCampaigns: true,
        };
      
      case 'manager':
        return {
          canManageTeam: false,
          canManageProducts: true,
          canManageForms: true,
          canManageLeads: true,
          canSendMessages: true,
          canViewReports: true,
          canEditBusinessProfile: false,
          canManageCampaigns: true,
        };
      
      case 'member':
        return {
          canManageTeam: false,
          canManageProducts: false,
          canManageForms: false,
          canManageLeads: true,
          canSendMessages: true,
          canViewReports: true,
          canEditBusinessProfile: false,
          canManageCampaigns: false,
        };
      
      case 'viewer':
        return {
          canManageTeam: false,
          canManageProducts: false,
          canManageForms: false,
          canManageLeads: false,
          canSendMessages: false,
          canViewReports: true,
          canEditBusinessProfile: false,
          canManageCampaigns: false,
        };
      
      default:
        // Sem role definido, sem permissões
        return {
          canManageTeam: false,
          canManageProducts: false,
          canManageForms: false,
          canManageLeads: false,
          canSendMessages: false,
          canViewReports: false,
          canEditBusinessProfile: false,
          canManageCampaigns: false,
        };
    }
  }, [role]);
}
