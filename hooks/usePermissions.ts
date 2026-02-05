import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type Permission = 
  | 'manage_team'
  | 'manage_forms'
  | 'manage_leads'
  | 'manage_products'
  | 'view_analytics'
  | 'send_messages'
  | 'export_data'
  | 'manage_settings';

export type Role = 'admin' | 'manager' | 'member' | 'viewer';

interface UserPermissions {
  role: Role;
  permissions: Permission[];
  isOwner: boolean;
  ownerId?: string;
}

export function usePermissions(currentUser: any) {
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, [currentUser]);

  const loadPermissions = async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }

    try {
      // Verificar se é membro de alguma equipe
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('role, owner_id, status')
        .eq('email', currentUser.email)
        .eq('status', 'active')
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        console.error('Error loading member data:', memberError);
      }

      let role: Role = 'admin'; // Default: usuário é owner
      let isOwner = true;
      let ownerId = currentUser.id;

      // Se for membro de equipe, usar role do membro
      if (memberData) {
        role = memberData.role as Role;
        isOwner = false;
        ownerId = memberData.owner_id;
      }

      // Carregar permissões do role
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('role_permissions')
        .select('permission')
        .eq('role', role);

      if (permissionsError) {
        console.error('Error loading permissions:', permissionsError);
      }

      const permissions = (permissionsData || []).map(p => p.permission as Permission);

      setUserPermissions({
        role,
        permissions,
        isOwner,
        ownerId
      });
    } catch (error) {
      console.error('Error in loadPermissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!userPermissions) return false;
    return userPermissions.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!userPermissions) return false;
    return permissions.some(p => userPermissions.permissions.includes(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!userPermissions) return false;
    return permissions.every(p => userPermissions.permissions.includes(p));
  };

  const canAccess = (requiredPermission: Permission): boolean => {
    return hasPermission(requiredPermission);
  };

  return {
    userPermissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccess,
    role: userPermissions?.role,
    isOwner: userPermissions?.isOwner,
    ownerId: userPermissions?.ownerId
  };
}

// Componente de proteção de rota
export function ProtectedRoute({ 
  children, 
  requiredPermission, 
  currentUser,
  fallback 
}: { 
  children: React.ReactNode; 
  requiredPermission: Permission;
  currentUser: any;
  fallback?: React.ReactNode;
}) {
  const { canAccess, isLoading } = usePermissions(currentUser);

  if (isLoading) {
    return <div className="flex justify-center items-center py-12">Carregando...</div>;
  }

  if (!canAccess(requiredPermission)) {
    return fallback || (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta funcionalidade.</p>
        <p className="text-sm text-gray-500">Entre em contato com o administrador da conta.</p>
      </div>
    );
  }

  return <>{children}</>;
}
