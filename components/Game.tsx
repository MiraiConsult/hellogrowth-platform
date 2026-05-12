'use client';

import { useState } from 'react';
import { Megaphone, BarChart2 } from 'lucide-react';
import EngagementCampaigns from '@/components/EngagementCampaigns';
import EngagementResults from '@/components/EngagementResults';

interface GameProps {
  tenantId: string;
  campaigns: any[];
  businessProfile?: any;
}

type Tab = 'campaigns' | 'results';

export default function Game({ tenantId, campaigns, businessProfile }: GameProps) {
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'campaigns', label: 'Campanhas', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'results', label: 'Resultados', icon: <BarChart2 className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header com abas */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Game & Engajamento</h1>
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo das abas */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {activeTab === 'campaigns' && (
            <EngagementCampaigns tenantId={tenantId} googlePlaceId={businessProfile?.google_place_id || ''} />
          )}
          {activeTab === 'results' && (
            <EngagementResults tenantId={tenantId} />
          )}
        </div>
      </div>
    </div>
  );
}
