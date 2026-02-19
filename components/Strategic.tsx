'use client';

import { useState } from 'react';
import IntelligenceCenter from '@/components/IntelligenceCenter';
import AIChat from '@/components/AIChat';
import { Lead, NPSResponse, PlanType } from '@/types';

interface StrategicProps {
  leads: Lead[];
  npsData: NPSResponse[];
  onNavigateToCustomer?: (email: string) => void;
  onNavigateToLead?: (id: string) => void;
  onNavigate: (view: string, filter?: any) => void;
  userId: string;
  activePlan: PlanType;
}

export default function Strategic({ 
  leads, 
  npsData, 
  onNavigateToCustomer, 
  onNavigateToLead, 
  onNavigate, 
  userId,
  activePlan 
}: StrategicProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'ai'>('insights');

  return (
    <div className="flex flex-col h-full">
      {/* Header com abas */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Estratégico</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'insights'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'ai'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            HelloIA
          </button>
        </div>
      </div>

      {/* Conteúdo das abas */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'insights' && (
          <IntelligenceCenter
            leads={leads}
            npsData={npsData}
            onNavigateToCustomer={onNavigateToCustomer}
            onNavigateToLead={onNavigateToLead}
            onNavigate={onNavigate}
            userId={userId}
          />
        )}
        {activeTab === 'ai' && (
          <div className="p-6">
            <AIChat leads={leads} npsData={npsData} activePlan={activePlan} />
          </div>
        )}
      </div>
    </div>
  );
}
