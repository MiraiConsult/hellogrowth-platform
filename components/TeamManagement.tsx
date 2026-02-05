'use client';

import React, { useState, useEffect } from 'react';
import { Users, Mail, Shield, Trash2, UserPlus, Copy, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TeamMember {
  id: string;
  owner_id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  status: 'active' | 'suspended';
  created_at: string;
}

interface TeamInvite {
  id: string;
  email: string;
  name: string;
  role: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
}

const TeamManagement: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'viewer' as 'admin' | 'manager' | 'member' | 'viewer'
  });

  const roleLabels = {
    admin: 'Admin (Você)',
    manager: 'Gerente - Gerenciar leads, formulários e produtos',
    member: 'Membro - Gerenciar leads e enviar mensagens',
    viewer: 'Visualizador - Apenas visualizar relatórios'
  };

  useEffect(() => {
    loadData();
  }, []);

  const getAuthToken = async () => {
    try {
      // Tentar pegar sessão primeiro
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return session.access_token;
      }
      
      // Se não tiver sessão, tentar pegar usuário diretamente
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Pegar nova sessão
        const { data: { session: newSession } } = await supabase.auth.getSession();
        return newSession?.access_token;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter token:', error);
      return null;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const token = await getAuthToken();
      if (!token) {
        console.error('Token não encontrado');
        setLoading(false);
        return;
      }

      // Chamar API para buscar membros e convites
      const response = await fetch('/api/team/members', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Erro ao carregar dados:', error);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setMembers(data.members || []);
      setInvites(data.invites || []);
      setCurrentUserId(data.userId);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        alert('Erro: Não autenticado');
        return;
      }

      // Chamar API para criar convite
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: inviteForm.name,
          email: inviteForm.email,
          role: inviteForm.role
        })
      });

      if (!response.ok) {
        const error = await response.json();
        alert('Erro ao criar convite: ' + error.error);
        return;
      }

      const data = await response.json();
      setInviteLink(data.inviteLink);
      
      // Recarregar lista de convites
      await loadData();
      
    } catch (error) {
      console.error('Erro ao criar convite:', error);
      alert('Erro ao criar convite');
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Deseja realmente remover este membro? Esta ação não pode ser desfeita.')) return;

    try {
      const token = await getAuthToken();
      if (!token) {
        alert('Erro: Não autenticado');
        return;
      }

      const response = await fetch('/api/team/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ memberId })
      });

      if (!response.ok) {
        const error = await response.json();
        alert('Erro ao remover membro: ' + error.error);
        return;
      }

      await loadData();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      alert('Erro ao remover membro');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-emerald-500" />
            Gerenciar Equipe
          </h1>
          <p className="text-slate-600 mt-1">Convide membros e gerencie permissões de acesso</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
        >
          <UserPlus size={20} />
          Convidar Membro
        </button>
      </div>

      {/* Níveis de Acesso */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Shield size={18} />
          Níveis de Acesso
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {Object.entries(roleLabels).map(([role, label]) => (
            <div key={role} className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
              <span className="text-blue-800">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Convites Pendentes */}
      {invites.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Convites Pendentes</h2>
          <div className="bg-white rounded-lg border border-slate-200">
            {invites.map((invite) => (
              <div key={invite.id} className="p-4 border-b border-slate-200 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{invite.name}</p>
                    <p className="text-sm text-slate-600">{invite.email}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Enviado em {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                    Pendente
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Membros da Equipe */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          Membros da Equipe ({members.length})
        </h2>
        <div className="bg-white rounded-lg border border-slate-200">
          {members.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Users size={48} className="mx-auto mb-3 text-slate-300" />
              <p>Nenhum membro na equipe ainda.</p>
              <p className="text-sm mt-1">Comece convidando membros para colaborar!</p>
            </div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="p-4 border-b border-slate-200 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-600 font-semibold">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{member.name}</p>
                      <p className="text-sm text-slate-600">{member.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {roleLabels[member.role]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.status === 'suspended' && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        Suspenso
                      </span>
                    )}
                    {member.role !== 'admin' && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover membro"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Convite */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="text-emerald-500" />
              Convidar Membro
            </h3>

            {!inviteLink ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Nome completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nível de Acesso
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="viewer">Visualizador - Apenas visualizar relatórios</option>
                      <option value="member">Membro - Gerenciar leads e enviar mensagens</option>
                      <option value="manager">Gerente - Quase tudo exceto gerenciar equipe</option>
                    </select>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <p className="flex items-start gap-2">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>Um link de convite será gerado para você copiar e enviar manualmente.</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={!inviteForm.name || !inviteForm.email}
                    className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Mail size={18} />
                    Gerar Link
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-medium mb-2">✅ Link de convite gerado!</p>
                  <p className="text-sm text-green-700">
                    Copie o link abaixo e envie para {inviteForm.email}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-slate-600 mb-2">Link de Convite:</p>
                  <p className="text-sm text-slate-800 break-all font-mono">{inviteLink}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteLink('');
                      setInviteForm({ name: '', email: '', role: 'viewer' });
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={copyInviteLink}
                    className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check size={18} />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        Copiar Link
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
