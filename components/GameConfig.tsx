import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle, Settings, Edit, Clock, Shield, Calendar } from 'lucide-react';

interface Prize {
  name: string;
  probability: number;
  color: string;
}

interface Game {
  id?: string;
  tenant_id?: string;
  name: string;
  status: 'active' | 'inactive';
  prizes: Prize[];
  messages: {
    before: string;
    after: string;
  };
  participation_policy: 'unlimited' | 'once_per_day' | 'once_per_week' | 'once_per_month' | 'once_forever';
  prize_validity_days: number;
}

interface GameConfigProps {
  tenantId: string;
}

const PRESET_COLORS = [
  '#10b981', // Verde
  '#3b82f6', // Azul
  '#f59e0b', // Amarelo
  '#8b5cf6', // Roxo
  '#ef4444', // Vermelho
  '#ec4899', // Rosa
  '#14b8a6', // Teal
  '#f97316'  // Laranja
];

const POLICY_OPTIONS = [
  { value: 'unlimited', label: 'Ilimitado', description: 'Sem restrição — pode girar quantas vezes quiser', icon: '♾️' },
  { value: 'once_per_day', label: '1x por dia', description: 'Cada número de telefone pode girar uma vez por dia', icon: '📅' },
  { value: 'once_per_week', label: '1x por semana', description: 'Cada número de telefone pode girar uma vez por semana', icon: '📆' },
  { value: 'once_per_month', label: '1x por mês', description: 'Cada número de telefone pode girar uma vez por mês', icon: '🗓️' },
  { value: 'once_forever', label: 'Uma vez na vida', description: 'Cada número de telefone pode girar apenas uma vez', icon: '🔒' },
];

const DEFAULT_GAME: Game = {
  name: '',
  status: 'active',
  prizes: [
    { name: '10% de desconto', probability: 30, color: '#10b981' },
    { name: '5% de desconto', probability: 40, color: '#3b82f6' },
    { name: '15% de desconto', probability: 20, color: '#f59e0b' },
    { name: 'Brinde grátis', probability: 10, color: '#8b5cf6' }
  ],
  messages: {
    before: 'Gire a roleta e ganhe prêmios incríveis!',
    after: 'Parabéns! Para liberar seu prêmio, nos avalie no Google na próxima tela.'
  },
  participation_policy: 'once_forever',
  prize_validity_days: 7,
};

const GameConfig: React.FC<GameConfigProps> = ({ tenantId }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [game, setGame] = useState<Game>(DEFAULT_GAME);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGames();
  }, [tenantId]);

  const loadGames = async () => {
    try {
      const response = await fetch('/api/games', {
        headers: { 'x-tenant-id': tenantId }
      });
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error('Erro ao carregar games:', error);
    }
  };

  const validateGame = (): boolean => {
    const newErrors: string[] = [];

    if (!game.name.trim()) {
      newErrors.push('Nome da roleta é obrigatório');
    }

    if (game.prizes.length < 3) {
      newErrors.push('Mínimo de 3 prêmios');
    }

    if (game.prizes.length > 8) {
      newErrors.push('Máximo de 8 prêmios');
    }

    const totalProbability = game.prizes.reduce((sum, p) => sum + p.probability, 0);
    if (Math.abs(totalProbability - 100) > 0.01) {
      newErrors.push(`Soma das probabilidades deve ser 100% (atual: ${totalProbability.toFixed(1)}%)`);
    }

    game.prizes.forEach((p, i) => {
      if (!p.name.trim()) {
        newErrors.push(`Prêmio ${i + 1}: nome é obrigatório`);
      }
      if (p.probability <= 0) {
        newErrors.push(`Prêmio ${i + 1}: probabilidade deve ser maior que 0`);
      }
    });

    if (game.prize_validity_days < 1 || game.prize_validity_days > 365) {
      newErrors.push('Validade do prêmio deve ser entre 1 e 365 dias');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAddPrize = () => {
    if (game.prizes.length >= 8) {
      setErrors(['Máximo de 8 prêmios atingido']);
      return;
    }

    const usedColors = new Set(game.prizes.map(p => p.color));
    const availableColor = PRESET_COLORS.find(c => !usedColors.has(c)) || PRESET_COLORS[0];

    setGame({
      ...game,
      prizes: [
        ...game.prizes,
        { name: '', probability: 0, color: availableColor }
      ]
    });
  };

  const handleRemovePrize = (index: number) => {
    if (game.prizes.length <= 3) {
      setErrors(['Mínimo de 3 prêmios']);
      return;
    }
    setGame({ ...game, prizes: game.prizes.filter((_, i) => i !== index) });
  };

  const handlePrizeChange = (index: number, field: keyof Prize, value: any) => {
    const newPrizes = [...game.prizes];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    setGame({ ...game, prizes: newPrizes });
  };

  const handleSave = async () => {
    if (!validateGame()) return;

    setLoading(true);
    try {
      const gameData = { ...game, tenant_id: tenantId };
      const url = editingGame ? `/api/games/${editingGame.id}` : '/api/games';
      const method = editingGame ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify(gameData)
      });

      if (response.ok) {
        await loadGames();
        handleCancel();
      } else {
        setErrors(['Erro ao salvar roleta']);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setErrors(['Erro ao salvar roleta']);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setView('list');
    setEditingGame(null);
    setGame(DEFAULT_GAME);
    setErrors([]);
  };

  const handleEdit = (gameToEdit: Game) => {
    setEditingGame(gameToEdit);
    setGame({
      ...DEFAULT_GAME,
      ...gameToEdit,
      participation_policy: gameToEdit.participation_policy || 'once_forever',
      prize_validity_days: gameToEdit.prize_validity_days || 7,
    });
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta roleta?')) return;
    try {
      const response = await fetch(`/api/games/${id}`, { method: 'DELETE' });
      if (response.ok) await loadGames();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const totalProbability = game.prizes.reduce((sum, p) => sum + p.probability, 0);
  const selectedPolicy = POLICY_OPTIONS.find(p => p.value === game.participation_policy);

  // ─── LISTA DE ROLETAS ───────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Roleta da Sorte</h2>
            <p className="text-gray-600 mt-1">Configure suas roletas de prêmios</p>
          </div>
          <button
            onClick={() => setView('form')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Nova Roleta
          </button>
        </div>

        {games.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Settings size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Nenhuma roleta configurada</p>
            <button
              onClick={() => setView('form')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Criar primeira roleta
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {games.map((g) => {
              const policy = POLICY_OPTIONS.find(p => p.value === (g.participation_policy || 'unlimited'));
              return (
                <div key={g.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-800">{g.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {g.status === 'active' ? '🟢 Ativo' : '🔴 Inativo'}
                        </span>
                        {policy && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                            <Shield size={11} />
                            {policy.icon} {policy.label}
                          </span>
                        )}
                        <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Clock size={11} />
                          Válido por {g.prize_validity_days || 7} dias
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {g.prizes.length} prêmios configurados
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {g.prizes.map((prize, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: prize.color }}
                          >
                            {prize.name} ({prize.probability}%)
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(g)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id!)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── FORMULÁRIO DE CRIAÇÃO/EDIÇÃO ───────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings size={32} className="text-primary-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {editingGame ? 'Editar Roleta' : 'Configurar Roleta da Sorte'}
            </h2>
            <p className="text-gray-600 text-sm">Configure prêmios, probabilidades e regras de participação</p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 mb-1">Erros de validação:</h4>
              <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Seção 1: Informações Básicas */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações Básicas</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome da roleta
            </label>
            <input
              type="text"
              value={game.name}
              onChange={(e) => setGame({ ...game, name: e.target.value })}
              placeholder="Ex: Roleta de Prêmios - Dezembro 2026"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={game.status}
              onChange={(e) => setGame({ ...game, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="active">🟢 Ativo</option>
              <option value="inactive">🔴 Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção 2: Regras de Participação */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={20} className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Regras de Participação</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Define com que frequência o mesmo número de telefone pode participar. O telefone é obrigatório quando o game está ativo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {POLICY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGame({ ...game, participation_policy: option.value as Game['participation_policy'] })}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                game.participation_policy === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{option.icon}</span>
                <span className={`font-semibold text-sm ${
                  game.participation_policy === option.value ? 'text-blue-700' : 'text-gray-800'
                }`}>
                  {option.label}
                </span>
                {game.participation_policy === option.value && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </div>
              <p className="text-xs text-gray-500">{option.description}</p>
            </button>
          ))}
        </div>

        {game.participation_policy !== 'unlimited' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Shield size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              O sistema verificará o número de telefone antes de liberar a roleta. Clientes que já participaram verão uma tela informando quando poderão jogar novamente.
            </p>
          </div>
        )}
      </div>

      {/* Seção 3: Validade do Prêmio */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-amber-600" />
          <h3 className="text-lg font-semibold text-gray-800">Validade do Prêmio</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Após quantos dias o código do prêmio expira automaticamente. Prêmios expirados ficam separados no painel de participantes.
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 flex-1">
            <Clock size={20} className="text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Válido por
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={game.prize_validity_days}
                  onChange={(e) => setGame({ ...game, prize_validity_days: Math.max(1, Math.min(365, parseInt(e.target.value) || 1)) })}
                  min={1}
                  max={365}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <span className="text-gray-600 font-medium">dias após o sorteio</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {[3, 7, 14, 30].map(days => (
              <button
                key={days}
                type="button"
                onClick={() => setGame({ ...game, prize_validity_days: days })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  game.prize_validity_days === days
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-2">
          Exemplo: com validade de {game.prize_validity_days} dias, um prêmio ganho hoje expira em{' '}
          {new Date(Date.now() + game.prize_validity_days * 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
        </p>
      </div>

      {/* Seção 4: Prêmios da Roleta */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Prêmios da Roleta</h3>
          <div className="text-sm">
            <span className={`font-semibold ${Math.abs(totalProbability - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
              Total: {totalProbability.toFixed(1)}%
            </span>
            <span className="text-gray-500 ml-2">(deve ser 100%)</span>
          </div>
        </div>

        <div className="space-y-3">
          {game.prizes.map((prize, index) => (
            <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
              <div
                className="w-4 h-4 rounded-full mt-3 flex-shrink-0"
                style={{ backgroundColor: prize.color }}
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={prize.name}
                  onChange={(e) => handlePrizeChange(index, 'name', e.target.value)}
                  placeholder="Nome do prêmio (ex: 10% de desconto)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  value={prize.probability}
                  onChange={(e) => handlePrizeChange(index, 'probability', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">%</span>
                {game.prizes.length > 3 && (
                  <button
                    onClick={() => handleRemovePrize(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {game.prizes.length < 8 && (
          <button
            onClick={handleAddPrize}
            className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-primary-500 hover:text-primary-600 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Adicionar Prêmio
          </button>
        )}
      </div>

      {/* Seção 5: Mensagens */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Mensagens</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem antes de girar
            </label>
            <input
              type="text"
              value={game.messages.before}
              onChange={(e) => setGame({ ...game, messages: { ...game.messages, before: e.target.value } })}
              placeholder="Ex: Gire a roleta e ganhe prêmios incríveis!"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem após ganhar
            </label>
            <input
              type="text"
              value={game.messages.after}
              onChange={(e) => setGame({ ...game, messages: { ...game.messages, after: e.target.value } })}
              placeholder="Ex: Parabéns! Apresente este código para resgatar seu prêmio."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={20} />
          {loading ? 'Salvando...' : 'Salvar Roleta'}
        </button>
      </div>
    </div>
  );
};

export default GameConfig;
