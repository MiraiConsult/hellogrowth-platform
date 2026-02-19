'use client';

import { useState } from 'react';
import GameConfig from '@/components/GameConfig';
import GameParticipations from '@/components/GameParticipations';

interface GameProps {
  tenantId: string;
  campaigns: any[];
}

export default function Game({ tenantId, campaigns }: GameProps) {
  const [activeTab, setActiveTab] = useState<'wheel' | 'participants'>('wheel');

  return (
    <div className="flex flex-col h-full">
      {/* Header com abas */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Game</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('wheel')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'wheel'
                ? 'bg-pink-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Roleta da Sorte
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'participants'
                ? 'bg-pink-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Participantes
          </button>
        </div>
      </div>

      {/* Conteúdo das abas */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'wheel' && (
          <div className="p-6">
            <GameConfig tenantId={tenantId} />
          </div>
        )}
        {activeTab === 'participants' && (
          <div className="p-6">
            <GameParticipations tenantId={tenantId} campaigns={campaigns} />
          </div>
        )}
      </div>
    </div>
  );
}
