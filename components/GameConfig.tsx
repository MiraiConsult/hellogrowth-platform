import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle, Settings } from 'lucide-react';

interface Prize {
  name: string;
  probability: number;
  color: string;
}

interface Game {
  id?: string;
  name: string;
  status: 'active' | 'inactive';
  prizes: Prize[];
  messages: {
    before: string;
    after: string;
  };
}

interface GameConfigProps {
  gameId?: string;
  onSave: (game: Game) => void;
  onCancel: () => void;
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

const GameConfig: React.FC<GameConfigProps> = ({ gameId, onSave, onCancel }) => {
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

  useEffect(() => {
    if (gameId) {
      // Carregar jogo existente
      loadGame(gameId);
    }
  }, [gameId]);

  const loadGame = async (id: string) => {
    try {
      const response = await fetch(`/api/games/${id}`);
      if (response.ok) {
        const data = await response.json();
        setGame(data);
      }
    } catch (error) {
      console.error('Erro ao carregar jogo:', error);
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

  const handleSave = () => {
    if (validateGame()) {
      onSave(game);
    }
  };

  const totalProbability = game.prizes.reduce((sum, p) => sum + p.probability, 0);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="text-primary-600" size={32} />
          <h2 className="text-2xl font-bold text-gray-900">
            {gameId ? 'Editar Roleta' : 'Configurar Roleta da Sorte'}
          </h2>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-red-800 mb-1">Erros de validação:</p>
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
              placeholder="ex: Roleta de Prêmios - Dezembro 2026"
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
            <span className="text-gray-500 ml-2">(deve somar 100%)</span>
          </div>
        </div>

        <div className="space-y-3">
          {game.prizes.map((prize, index) => (
            <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <input
                  type="text"
                  value={prize.name}
                  onChange={(e) => handlePrizeChange(index, 'name', e.target.value)}
                  placeholder="Nome do prêmio"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="w-32">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={prize.probability}
                    onChange={(e) => handlePrizeChange(index, 'probability', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>

              <div className="w-24">
                <input
                  type="color"
                  value={prize.color}
                  onChange={(e) => handlePrizeChange(index, 'color', e.target.value)}
                  className="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>

              <button
                onClick={() => handleRemovePrize(index)}
                disabled={game.prizes.length <= 3}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddPrize}
          disabled={game.prizes.length >= 8}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          Adicionar Prêmio
        </button>
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

      {/* Botões de ação */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Save size={20} />
          Salvar Roleta
        </button>
      </div>
    </div>
  );
};

export default GameConfig;
