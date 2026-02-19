'use client';

import React from 'react';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = () => {
    // TODO: Implementar lógica de logout real
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-emerald-500" size={32} />
            <h1 className="text-2xl font-bold">
              <span className="text-gray-900">Hello</span>
              <span className="text-emerald-500">Growth</span>
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
          <div className="mb-6">
            <LayoutDashboard className="mx-auto text-emerald-500" size={64} />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bem-vindo ao HelloGrowth! 🎉
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Você fez login com sucesso. O dashboard completo está em desenvolvimento.
          </p>
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-emerald-900 mb-2">
              Em breve você terá acesso a:
            </h3>
            <ul className="text-left text-emerald-800 space-y-2">
              <li>✅ Dashboard Unificado 360°</li>
              <li>✅ Gestão de Leads e Oportunidades</li>
              <li>✅ Análise de NPS e Satisfação</li>
              <li>✅ Relatórios e Insights com IA</li>
              <li>✅ Gamificação e Engajamento</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
