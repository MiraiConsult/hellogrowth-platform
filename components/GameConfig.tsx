import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle, Settings, Edit, Eye } from 'lucide-react';

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

const GameConfig: React.FC<GameConfigProps> = ({ tenantId }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [game, setGame] = useState<Game>({
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
    }
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGames();
  }, [tenantId]);

  const loadGames = async () => {
    try {
      const response = await fetch('/api/games', {
        headers: {
          'x-tenant-id': tenantId
        }
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

    const colors = game.prizes.map(p => p.color);
    const uniqueColors = new Set(colors);
    if (colors.length !== uniqueColors.size) {
      newErrors.push('Cores não podem repetir');
    }

    game.prizes.forEach((p, i) => {
      if (!p.name.trim()) {
        newErrors.push(`Prêmio ${i + 1}: nome é obrigatório`);
      }
      if (p.probability <= 0) {
        newErrors.push(`Prêmio ${i + 1}: probabilidade deve ser maior que 0`);
      }
    });

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

    setGame({
      ...game,
      prizes: game.prizes.filter((_, i) => i !== index)
    });
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
      const gameData = {
        ...game,
        tenant_id: tenantId
      };

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
    setGame({
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
      }
    });
    setErrors([]);
  };

  const handleEdit = (gameToEdit: Game) => {
    setEditingGame(gameToEdit);
    setGame(gameToEdit);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta roleta?')) return;

    try {
      const response = await fetch(`/api/games/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await loadGames();
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const totalProbability = game.prizes.reduce((sum, p) => sum + p.probability, 0);

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
            {games.map((g) => (
              <div key={g.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{g.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {g.status === 'active' ? '🟢 Ativo' : '🔴 Inativo'}
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
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings size={32} className="text-primary-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {editingGame ? 'Editar Roleta' : 'Configurar Roleta da Sorte'}
            </h2>
            <p className="text-gray-600 text-sm">Configure prêmios, probabilidades e mensagens</p>
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

          <div className="flex gap-4">
            <div className="flex-1">
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
      </div>

      {/* Seção 2: Prêmios da Roleta */}
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
              <div className="flex-1">
                <input
                  type="text"
                  value={prize.name}
                  onChange={(e) => handlePrizeChange(index, 'name', e.target.value)}
                  placeholder="Nome do prêmio"
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
                <input
                  type="color"
                  value={prize.color}
                  onChange={(e) => handlePrizeChange(index, 'color', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
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

      {/* Seção 3: Mensagens */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Mensagens</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem antes da roleta
            </label>
            <textarea
              value={game.messages.before}
              onChange={(e) => setGame({ ...game, messages: { ...game.messages, before: e.target.value } })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mensagem após ganhar
            </label>
            <textarea
              value={game.messages.after}
              onChange={(e) => setGame({ ...game, messages: { ...game.messages, after: e.target.value } })}
              rows={3}
              placeholder="Parabéns! Para liberar seu prêmio, nos avalie no Google na próxima tela."
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
