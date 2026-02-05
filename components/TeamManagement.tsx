'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Shield, Trash2, MoreVertical, X, Loader2, CheckCircle, Clock, Ban } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'suspended';
  invited_at: string;
  accepted_at?: string;
  last_login?: string;
}

interface TeamManagementProps {
  currentUser: any;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ currentUser }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'member' | 'viewer'>('member');

  // Load team members
  useEffect(() => {
    loadTeamMembers();
  }, [currentUser]);

  const loadTeamMembers = async () => {
    if (!currentUser?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('owner_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Erro ao carregar membros:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteName || !currentUser?.id) return;

    setIsSending(true);
    try {
      // 1. Gerar token único para o convite
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

      // 2. Criar convite no banco
      const { error: inviteError } = await supabase
        .from('team_invites')
        .insert({
          owner_id: currentUser.id,
          email: inviteEmail.toLowerCase(),
          name: inviteName,
          role: inviteRole,
          token,
          expires_at: expiresAt.toISOString()
        });

      if (inviteError) {
        if (inviteError.code === '23505') { // Unique violation
          alert('Este email já foi convidado.');
          return;
        }
        throw inviteError;
      }

      // 3. Criar membro com status pending
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          owner_id: currentUser.id,
          email: inviteEmail.toLowerCase(),
          name: inviteName,
          role: inviteRole,
          status: 'pending'
        });

      if (memberError) throw memberError;

      // 4. Enviar email de convite via Edge Function
      const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
      
      await supabase.functions.invoke('send-team-invite', {
        body: {
          to: inviteEmail,
          name: inviteName,
          inviterName: currentUser.name || currentUser.email,
          role: inviteRole,
          inviteLink
        }
      });

      alert('Convite enviado com sucesso!');
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
      loadTeamMembers();
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      alert('Erro ao enviar convite. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      loadTeamMembers();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      alert('Erro ao remover membro.');
    }
  };

  const handleSuspendMember = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ status: newStatus })
        .eq('id', memberId);

      if (error) throw error;
      
      loadTeamMembers();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status.');
    }
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      manager: 'bg-blue-100 text-blue-700 border-blue-200',
      member: 'bg-green-100 text-green-700 border-green-200',
      viewer: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    
    const labels = {
      admin: 'Admin',
      manager: 'Gerente',
      member: 'Membro',
      viewer: 'Visualizador'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[role as keyof typeof styles]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending') {
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-600">
          <Clock size={14} /> Pendente
        </span>
      );
    }
    if (status === 'active') {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle size={14} /> Ativo
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-red-600">
        <Ban size={14} /> Suspenso
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={28} className="text-primary-600" />
              Gerenciar Equipe
            </h1>
            <p className="text-gray-600 mt-1">Convide membros e gerencie permissões de acesso</p>
          </div>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 font-medium"
          >
            <UserPlus size={18} />
            Convidar Membro
          </button>
        </div>

        {/* Team Members List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-primary-600" size={32} />
          </div>
        ) : members.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum membro ainda</h3>
            <p className="text-gray-600 mb-4">Convide membros da sua equipe para colaborar</p>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 inline-flex items-center gap-2"
            >
              <UserPlus size={18} />
              Convidar Primeiro Membro
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Membro</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Convidado em</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(member.role)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(member.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(member.invited_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleSuspendMember(member.id, member.status)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title={member.status === 'suspended' ? 'Reativar' : 'Suspender'}
                        >
                          <Ban size={18} />
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remover"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Permissions Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Shield size={18} />
            Níveis de Acesso
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium text-blue-900">Admin (Você)</p>
              <p className="text-blue-700">Acesso total ao sistema</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Gerente</p>
              <p className="text-blue-700">Gerenciar leads, formulários e produtos</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Membro</p>
              <p className="text-blue-700">Gerenciar leads e enviar mensagens</p>
            </div>
            <div>
              <p className="font-medium text-blue-900">Visualizador</p>
              <p className="text-blue-700">Apenas visualizar relatórios</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Convidar Membro</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2 border"
                  placeholder="Ex: João Silva"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2 border"
                  placeholder="joao@empresa.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Acesso</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full rounded-lg border-gray-300 shadow-sm p-2 border"
                >
                  <option value="manager">Gerente - Gerenciar leads, formulários e produtos</option>
                  <option value="member">Membro - Gerenciar leads e enviar mensagens</option>
                  <option value="viewer">Visualizador - Apenas visualizar relatórios</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p><strong>Atenção:</strong> Um email de convite será enviado com uma senha temporária.</p>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInviteMember}
                  disabled={!inviteEmail || !inviteName || isSending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Enviar Convite
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
