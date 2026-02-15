import React, { useState, useEffect } from 'react';
import { Mail, MessageCircle, Check, Download, Search } from 'lucide-react';

interface Participation {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  prize_won: string;
  prize_code: string;
  status: 'pending' | 'sent' | 'redeemed';
  played_at: string;
  sent_at?: string;
  redeemed_at?: string;
}

interface GameParticipationsProps {
  gameId: string;
}

const GameParticipations: React.FC<GameParticipationsProps> = ({ gameId }) => {
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadParticipations();
  }, [gameId]);

  const loadParticipations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/game-participations?game_id=${gameId}`);
      if (response.ok) {
        const data = await response.json();
        setParticipations(data);
      }
    } catch (error) {
      console.error('Erro ao carregar participações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = (participation: Participation) => {
    const message = encodeURIComponent(
      `Olá ${participation.client_name}! 🎉\n\n` +
      `Parabéns! Você ganhou: *${participation.prize_won}*\n\n` +
      `Seu código é: *${participation.prize_code}*\n\n` +
      `Válido até: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}\n\n` +
      `Apresente este código para resgatar seu prêmio!`
    );
    
    const phone = participation.client_phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    
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
      const response = await fetch(`/api/game-participations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        loadParticipations(); // Recarregar lista
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Cliente', 'Email', 'Telefone', 'Prêmio', 'Código', 'Status', 'Data'].join(','),
      ...participations.map(p => [
        p.client_name,
        p.client_email,
        p.client_phone,
        p.prize_won,
        p.prize_code,
        p.status,
        new Date(p.played_at).toLocaleString('pt-BR')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participacoes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredParticipations = participations.filter(p =>
    p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.prize_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: '🟡 Pendente' },
      sent: { color: 'bg-blue-100 text-blue-800', label: '🔵 Enviado' },
      redeemed: { color: 'bg-green-100 text-green-800', label: '🟢 Resgatado' }
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>{badge.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Participantes da Roleta</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <Download size={20} />
          Exportar CSV
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, email ou código..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredParticipations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Nenhuma participação encontrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prêmio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredParticipations.map((participation) => (
                <tr key={participation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{participation.client_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>{participation.client_email}</div>
                    <div>{participation.client_phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-primary-600">{participation.prize_won}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="px-2 py-1 bg-gray-100 rounded font-mono text-sm">
                      {participation.prize_code}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(participation.played_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(participation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendWhatsApp(participation)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button
                        onClick={() => handleSendEmail(participation)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Enviar Email"
                      >
                        <Mail size={18} />
                      </button>
                      {participation.status !== 'redeemed' && (
                        <button
                          onClick={() => updateStatus(participation.id, 'redeemed')}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Marcar como Resgatado"
                        >
                          <Check size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GameParticipations;
