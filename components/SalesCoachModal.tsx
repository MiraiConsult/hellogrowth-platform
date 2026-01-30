import React from 'react';
import { X } from 'lucide-react';
import { SalesCoachPanel } from '@/components/SalesCoachPanel';

interface SalesCoachModalProps {
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    type: 'lead' | 'nps';
    leadStatus?: string;
    value?: number;
    lastInteraction: string;
    answers?: any[];
  };
  onClose: () => void;
}

export const SalesCoachModal: React.FC<SalesCoachModalProps> = ({ client, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-gray-50 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Coach de Vendas IA</h2>
              <p className="text-purple-100 text-sm">Estratégias personalizadas para {client.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <SalesCoachPanel client={client} />
        </div>
      </div>
    </div>
  );
};