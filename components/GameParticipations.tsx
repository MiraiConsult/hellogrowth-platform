import React, { useState, useEffect } from 'react';
import { encodeWhatsAppMessage } from '@/lib/utils/whatsapp';
import { Mail, MessageCircle, Check, Download, Search, RefreshCw, Filter, Trophy, Users, Clock, Trash2 } from 'lucide-react';

interface Participation {
  id: string;
  game_id: string;
  campaign_id?: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  prize_won: string;
  prize_code: string;
  status: 'pending' | 'sent' | 'redeemed';
  source?: 'pre-sale' | 'post-sale';
  played_at: string;
  sent_at?: string;
  redeemed_at?: string;
  expires_at?: string;
}

interface Game {
  id: string;
  name: string;
  tenant_id: string;
}

interface GameParticipationsProps {
  tenantId: string;
  campaigns?: any[];
}

const GameParticipations: React.FC<GameParticipationsProps> = ({ tenantId, campaigns: externalCampaigns }) => {
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>(externalCampaigns || []);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadGames();
    if (!externalCampaigns) {
      loadCampaigns();
    }
  }, [tenantId, externalCampaigns]);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await fetch('/api/campaigns', {
        headers: { 'x-tenant-id': tenantId }
      }).then(res => res.json());
      
      if (data) setCampaigns(data);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
    }
  };

  const loadGames = async () => {
    try {
      const response = await fetch('/api/games', {
        headers: { 'x-tenant-id': tenantId }
      });
      if (response.ok) {
        const data = await response.json();
        setGames(data);
        // Carregar participações de todos os games
        if (data.length > 0) {
          loadAllParticipations(data);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao carregar games:', error);
      setLoading(false);
    }
  };

  const loadAllParticipations = async (gamesList: Game[]) => {
    setLoading(true);
    try {
      const allParticipations: Participation[] = [];
      
      for (const game of gamesList) {
        const response = await fetch(`/api/game-participations?game_id=${game.id}`);
        if (response.ok) {
          const data = await response.json();
          allParticipations.push(...data);
        }
      }
      
      // Ordenar por data mais recente
      allParticipations.sort((a, b) => 
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
      );
      
      setParticipations(allParticipations);
    } catch (error) {
      console.error('Erro ao carregar participações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (games.length > 0) {
      loadAllParticipations(games);
    }
  };

  const handleSendWhatsApp = (participation: Participation) => {
    const message = encodeWhatsAppMessage(
      `Olá ${participation.client_name}!\n\n` +
      `Parabéns! Você ganhou: *${participation.prize_won}*\n\n` +
      `Seu código é: *${participation.prize_code}*\n\n` +
      `Válido até: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}\n\n` +
      `Apresente este código para resgatar seu prêmio!`
    );
    
    const phone = participation.client_phone.replace(/\D/g, '');
    const phoneWithCountry = phone.startsWith('55') ? phone : `55${phone}`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${message}`, '_blank');
    
    // Marcar como enviado
    updateStatus(participation.id, 'sent');
  };

  const handleSendEmail = async (participation: Participation) => {
    const subject = encodeURIComponent(`Parabéns! Você ganhou: ${participation.prize_won}`);
    const body = encodeURIComponent(
      `Olá ${participation.client_name}!\n\n` +
      `Parabéns! Você ganhou: ${participation.prize_won}\n\n` +
      `Seu código é: ${participation.prize_code}\n\n` +
      `Válido até: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}\n\n` +
      `Apresente este código para resgatar seu prêmio!`
    );
    
    window.open(`mailto:${participation.client_email}?subject=${subject}&body=${body}`, '_blank');
    
    // Marcar como enviado
    updateStatus(participation.id, 'sent');
  };

  const updateStatus = async (id: string, status: 'pending' | 'sent' | 'redeemed') => {
    try {
      const response = await fetch('/api/game-participations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });

      if (response.ok) {
        // Atualizar localmente sem recarregar tudo
        setParticipations(prev => prev.map(p => {
          if (p.id === id) {
            return {
              ...p,
              status,
              ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
              ...(status === 'redeemed' ? { redeemed_at: new Date().toISOString() } : {})
            };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/game-participations?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setParticipations(prev => prev.filter(p => p.id !== id));
      } else {
        console.error('Erro ao excluir participação');
      }
    } catch (error) {
      console.error('Erro ao excluir participação:', error);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Cliente', 'Email', 'Telefone', 'Prêmio', 'Código', 'Status', 'Data'].join(','),
      ...filteredParticipations.map(p => [
        `"${p.client_name}"`,
        p.client_email,
        p.client_phone,
        `"${p.prize_won}"`,
        p.prize_code,
        p.status === 'pending' ? 'Pendente' : p.status === 'sent' ? 'Enviado' : 'Resgatado',
        new Date(p.played_at).toLocaleString('pt-BR')
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participacoes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helpers de expiração
  const isExpired = (p: Participation) => {
    if (!p.expires_at) return false;
    return new Date(p.expires_at) < new Date() && p.status !== 'redeemed';
  };

  const getDaysUntilExpiry = (p: Participation): number | null => {
    if (!p.expires_at) return null;
    const diff = new Date(p.expires_at).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Filtros
  const filteredParticipations = participations.filter(p => {
    const matchesSearch = !searchTerm || 
      p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.client_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prize_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGame = selectedGameId === 'all' || p.game_id === selectedGameId;
    
    let matchesStatus = false;
    if (statusFilter === 'all') matchesStatus = true;
    else if (statusFilter === 'expired') matchesStatus = isExpired(p);
    else matchesStatus = p.status === statusFilter && !isExpired(p);
    
    return matchesSearch && matchesGame && matchesStatus;
  });

  // Estatísticas
  const stats = {
    total: participations.length,
    pending: participations.filter(p => p.status === 'pending' && !isExpired(p)).length,
    sent: participations.filter(p => p.status === 'sent' && !isExpired(p)).length,
    redeemed: participations.filter(p => p.status === 'redeemed').length,
    expired: participations.filter(p => isExpired(p)).length,
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pendente' },
      sent: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Enviado' },
      redeemed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Resgatado' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>{badge.label}</span>;
  };

  const getGameName = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    return game?.name || 'Roleta';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Carregando participações...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Participantes da Roleta</h2>
          <p className="text-gray-500 text-sm mt-1">Gerencie os prêmios ganhos pelos seus clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-xs text-gray-500">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageCircle size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
              <p className="text-xs text-gray-500">Enviados</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.redeemed}</p>
              <p className="text-xs text-gray-500">Resgatados</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              <p className="text-xs text-gray-500">Expirados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, email ou código..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>
        {games.length > 1 && (
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">Todas as Roletas</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">Todos os Status</option>
          <option value="pending">Pendente</option>
          <option value="sent">Enviado</option>
          <option value="redeemed">Resgatado</option>
          <option value="expired">Expirado</option>
        </select>
      </div>

      {/* Table */}
      {filteredParticipations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Nenhuma participação encontrada</p>
          <p className="text-gray-400 text-sm mt-1">
            {participations.length === 0 
              ? 'As participações aparecerão aqui quando clientes girarem a roleta'
              : 'Tente ajustar os filtros de busca'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Campanha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Origem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Prêmio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Validade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredParticipations.map((participation) => (
                  <tr key={participation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{participation.client_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md inline-block">
                        {participation.campaign_id ? (
                          campaigns.find(c => c.id === participation.campaign_id)?.name || 'Carregando...'
                        ) : 'Direto'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-xs font-medium px-2 py-1 rounded-md inline-block ${
                        participation.source === 'pre-sale' 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-green-600 bg-green-50'
                      }`}>
                        {participation.source === 'pre-sale' ? 'Pré-venda' : 'Pós-venda'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{participation.client_email || '-'}</div>
                      <div className="text-xs text-gray-400">{participation.client_phone || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-primary-600 text-sm">{participation.prize_won}</div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="px-2 py-1 bg-gray-100 rounded font-mono text-xs text-gray-700">
                        {participation.prize_code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(participation.played_at).toLocaleDateString('pt-BR')}
                      <br />
                      <span className="text-gray-400">
                        {new Date(participation.played_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {participation.expires_at ? (
                        isExpired(participation) ? (
                          <span className="text-red-500 font-medium">Expirado</span>
                        ) : (() => {
                          const days = getDaysUntilExpiry(participation);
                          return (
                            <span className={days !== null && days <= 2 ? 'text-orange-500 font-medium' : 'text-gray-500'}>
                              {days !== null && days > 0 ? `${days}d restante${days > 1 ? 's' : ''}` : 'Expira hoje'}
                            </span>
                          );
                        })()
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isExpired(participation) 
                        ? <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-red-100 text-red-700 border-red-200">Expirado</span>
                        : getStatusBadge(participation.status)
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {participation.client_phone && (
                          <button
                            onClick={() => handleSendWhatsApp(participation)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </button>
                        )}
                        {participation.client_email && (
                          <button
                            onClick={() => handleSendEmail(participation)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Enviar Email"
                          >
                            <Mail size={16} />
                          </button>
                        )}
                        {participation.status !== 'redeemed' && (
                          <button
                            onClick={() => updateStatus(participation.id, participation.status === 'pending' ? 'sent' : 'redeemed')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={participation.status === 'pending' ? 'Marcar como Enviado' : 'Marcar como Resgatado'}
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {confirmDeleteId === participation.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(participation.id)}
                              disabled={deletingId === participation.id}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                              title="Confirmar exclusão"
                            >
                              {deletingId === participation.id ? '...' : 'Sim'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(participation.id)}
                            className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            title="Remover do game (dados do formulário permanecem)"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Mostrando {filteredParticipations.length} de {participations.length} participações
          </div>
        </div>
      )}
    </div>
  );
};

export default GameParticipations;
