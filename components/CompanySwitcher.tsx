'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, UserCompany, Company } from '@/types';

interface CompanySwitcherProps {
  currentUser: User;
  companies: UserCompany[];
  activeCompany: Company | null;
  onSwitchCompany: (companyId: string) => void;
}

const CompanySwitcher: React.FC<CompanySwitcherProps> = ({
  currentUser,
  companies,
  activeCompany,
  onSwitchCompany,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<UserCompany | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Se só tem uma empresa, mostra apenas o nome sem dropdown
  if (companies.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
          {activeCompany?.name?.charAt(0)?.toUpperCase() || 'E'}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">
            {activeCompany?.name || 'Minha Empresa'}
          </span>
        </div>
      </div>
    );
  }

  const handleCompanySelect = (company: UserCompany) => {
    if (activeCompany?.id === company.company_id || isSwitching) return;
    setSelectedCompany(company);
    setShowConfirmation(true);
    setIsOpen(false);
  };

  const handleConfirmSwitch = () => {
    if (!selectedCompany) return;
    setIsSwitching(true);
    setShowConfirmation(false);
    onSwitchCompany(selectedCompany.company_id);
  };

  // Com múltiplas empresas, mostra dropdown
  return (
    <>
      {showConfirmation && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Confirmar Troca de Empresa</h3>
            <p className="mb-6">Deseja trocar para a empresa <strong>{selectedCompany.company?.name}</strong>?</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowConfirmation(false)} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">Cancelar</button>
              <button onClick={handleConfirmSwitch} className="px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
          {activeCompany?.name?.charAt(0)?.toUpperCase() || 'E'}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">
            {isSwitching ? 'Trocando empresa...' : (activeCompany?.name || 'Minha Empresa')}
          </span>
        </div>
        {isSwitching && (
          <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Suas Empresas
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {companies
              .filter((uc) => uc.status === 'active')
              .map((uc) => {
                const company = uc.company;
                const isActive = activeCompany?.id === uc.company_id;
                return (
                  <button
                    key={uc.id}
                    onClick={() => handleCompanySelect(uc)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      isActive ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                        isActive
                          ? 'bg-gradient-to-br from-teal-500 to-emerald-600'
                          : 'bg-gray-400'
                      }`}
                    >
                      {company?.name?.charAt(0)?.toUpperCase() || 'E'}
                    </div>
                    <div className="flex flex-col text-left flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {company?.name || 'Empresa'}
                      </span>
                    </div>
                    {isActive && (
                      <svg className="w-5 h-5 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySwitcher;

    </>
