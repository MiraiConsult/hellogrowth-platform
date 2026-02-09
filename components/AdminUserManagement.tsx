import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, PlanType } from '@/types';
import { Plus, Trash2, LogOut, Loader2, Users, Edit, X, Save, RefreshCw, Key, CheckCircle, AlertTriangle } from 'lucide-react';

interface AdminUserManagementProps {
  onLogout: () => void;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // New User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    companyName: '',
    plan: 'trial' as PlanType
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
    } else if (data) {
      const mappedUsers: User[] = data.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        plan: u.plan,
        createdAt: u.created_at,
        companyName: u.company_name
      }));
      setUsers(mappedUsers);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setMessage(null);

    try {
      // 1. Check if email exists
      const { data: existing } = await supabase.from('users').select('id').eq('email', newUser.email).single();
      if (existing) {
          throw new Error("Este email já está cadastrado.");
      }

      // 2. Generate new tenant_id for the new company
      // Force rebuild - 2026-02-09
      const newTenantId = crypto.randomUUID();
      
      // 3. Prepare User Data with tenant_id, role, and is_owner
      console.log('[DEBUG] Creating user with tenant_id:', newTenantId, 'role: admin, is_owner: true');
      const userData = {
        name: newUser.name,
        email: newUser.email,
        company_name: newUser.companyName,
        plan: newUser.plan,
        tenant_id: newTenantId,
        role: 'admin',
        is_owner: true,
        settings: {
            companyName: newUser.companyName,
            adminEmail: newUser.email,
            phone: '',
            website: '',
            autoRedirect: true
        }
      };

      // 4. Insert Strategy: Try with password first, fallback if column missing
      let { error } = await supabase.from('users').insert([{
        ...userData,
        password: '12345', // Default password
      }]).select().single();

      // If error suggests schema mismatch (column missing), retry without password field
      if (error && (error.message?.includes('Could not find') || error.message?.includes('column'))) {
          console.warn("Password column likely missing in DB, retrying insert without it...");
          const retry = await supabase.from('users').insert([userData]).select().single();
          error = retry.error;
      }

      if (error) throw error;

      setMessage({ type: 'success', text: 'Usuário criado com sucesso (Senha padrão: 12345)' });
      
      // Reset form
      setNewUser({
          name: '',
          email: '',
          companyName: '',
          plan: 'trial'
      });
      
      fetchUsers();

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao criar usuário.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este usuário? Todos os dados (leads, campanhas) vinculados podem ser afetados.")) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert("Erro ao excluir usuário.");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editingUser.name,
          email: editingUser.email,
          company_name: editingUser.companyName,
          plan: editingUser.plan
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Update local list
      setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null); // Close modal
      alert("Usuário atualizado com sucesso!");

    } catch (err: any) {
      alert("Erro ao atualizar usuário: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm("Deseja resetar a senha deste usuário para '12345'?")) return;
    
    setIsResetting(true);
    try {
        const { error } = await supabase
            .from('users')
            .update({ password: '12345' })
            .eq('id', userId);
            
        if (error) {
             // Handle missing column gracefully
             if (error.message?.includes('Could not find') || error.message?.includes('column')) {
                 console.warn("Password column missing, reset skipped.");
                 alert("Aviso: A coluna de senha não existe no banco de dados. O reset foi ignorado.");
             } else {
                 throw error;
             }
        } else {
            alert("Senha resetada para '12345' com sucesso!");
        }
        
        if (editingUser) {
            setEditingUser({...editingUser, password: '12345'});
        }
    } catch (err: any) {
        alert("Erro ao resetar senha: " + err.message);
    } finally {
        setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Admin Navbar */}
      <nav className="bg-gray-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold">A</div>
                <span className="font-bold text-lg">Painel Administrativo</span>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <LogOut size={18} /> Sair
            </button>
        </div>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create User Form */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Plus size={20} className="text-primary-600" /> Novo Usuário
                </h2>

                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <input 
                           type="text" 
                           required 
                           value={newUser.name}
                           onChange={e => setNewUser({...newUser, name: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                        <input 
                           type="text" 
                           required 
                           value={newUser.companyName}
                           onChange={e => setNewUser({...newUser, companyName: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg p-2.5" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email (Login)</label>
                        <input 
                           type="email" 
                           required 
                           value={newUser.email}
                           onChange={e => setNewUser({...newUser, email: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg p-2.5" 
                        />
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-500 flex items-center gap-2">
                        <Key size={16} />
                        Senha padrão será: <strong>12345</strong>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plano Inicial</label>
                        <select 
                           value={newUser.plan}
                           onChange={e => setNewUser({...newUser, plan: e.target.value as PlanType})}
                           className="w-full border border-gray-300 rounded-lg p-2.5"
                        >
                            <option value="trial">Trial (Teste)</option>
                            <option value="client">HelloClient (Pré)</option>
                            <option value="rating">HelloRating (Pós)</option>
                            <option value="growth">HelloGrowth (Completo)</option>
                            <option value="growth_lifetime">Lifetime (Vitalício)</option>
                        </select>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                            {message.text}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isCreating}
                        className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isCreating ? <Loader2 className="animate-spin" /> : 'Criar Login'}
                    </button>
                </form>
            </div>
        </div>

        {/* Users List */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Users size={20} className="text-gray-500" /> Usuários Cadastrados ({users.length})
                    </h2>
                </div>
                
                {isLoading ? (
                    <div className="p-12 text-center text-gray-500">
                        <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                        Carregando usuários...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs">
                                <tr>
                                    <th className="px-6 py-3">Usuário / Empresa</th>
                                    <th className="px-6 py-3">Plano</th>
                                    <th className="px-6 py-3">Data Cadastro</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                            <p className="text-xs text-primary-600 font-medium">{user.companyName}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border capitalize ${
                                                user.plan === 'growth_lifetime' ? 'bg-gray-800 text-yellow-400 border-gray-700' :
                                                user.plan === 'growth' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                user.plan === 'trial' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                'bg-blue-100 text-blue-700 border-blue-200'
                                            }`}>
                                                {user.plan === 'growth_lifetime' ? 'Lifetime' : user.plan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                              <button 
                                                  onClick={() => setEditingUser(user)}
                                                  className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
                                                  title="Editar Usuário"
                                              >
                                                  <Edit size={18} />
                                              </button>
                                              <button 
                                                  onClick={() => handleDeleteUser(user.id)}
                                                  className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                                  title="Excluir Usuário"
                                              >
                                                  <Trash2 size={18} />
                                              </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <Edit size={20} className="text-blue-600" /> Editar Usuário
                 </h3>
                 <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                 </button>
              </div>
              <div className="p-6">
                 <form onSubmit={handleUpdateUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                        <input 
                           type="text" 
                           value={editingUser.name}
                           onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg p-2"
                           required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                        <input 
                           type="text" 
                           value={editingUser.companyName}
                           onChange={(e) => setEditingUser({...editingUser, companyName: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg p-2"
                           required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input 
                           type="email" 
                           value={editingUser.email}
                           onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg p-2"
                           required
                        />
                    </div>
                    
                    {/* Security Section (Reset Password) */}
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                        <div className="flex items-center gap-2 mb-2">
                             <Key size={16} className="text-yellow-600" />
                             <h4 className="font-bold text-yellow-800 text-sm">Segurança</h4>
                        </div>
                        <p className="text-xs text-yellow-700 mb-3">
                            Não é possível ver a senha atual. Você pode resetá-la para o padrão <strong>12345</strong> e o cliente poderá alterar nas configurações.
                        </p>
                        <button
                            type="button"
                            onClick={() => handleResetPassword(editingUser.id)}
                            disabled={isResetting}
                            className="w-full py-2 bg-yellow-100 text-yellow-900 rounded-lg text-sm font-bold hover:bg-yellow-200 border border-yellow-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isResetting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            Resetar Senha para '12345'
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plano (Acesso)</label>
                        <select 
                           value={editingUser.plan}
                           onChange={(e) => setEditingUser({...editingUser, plan: e.target.value as PlanType})}
                           className="w-full border border-gray-300 rounded-lg p-2"
                        >
                            <option value="trial">Trial (Teste)</option>
                            <option value="client">HelloClient (Pré)</option>
                            <option value="rating">HelloRating (Pós)</option>
                            <option value="growth">HelloGrowth (Completo)</option>
                            <option value="growth_lifetime">Lifetime (Vitalício)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          *Altere para "Trial" se quiser limitar o acesso ou "Growth" para liberar tudo.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                       <button 
                          type="button" 
                          onClick={() => setEditingUser(null)}
                          className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                       >
                          Cancelar
                       </button>
                       <button 
                          type="submit" 
                          disabled={isUpdating}
                          className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
                       >
                          {isUpdating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                          Salvar Alterações
                       </button>
                    </div>
                 </form>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default AdminUserManagement;