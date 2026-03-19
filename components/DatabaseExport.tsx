import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Database, Download, Search, RefreshCw, Users, BarChart3, Trophy,
  ChevronDown, ChevronUp, Eye, X, Star, MessageSquare, Phone, Mail,
  Loader2, ClipboardList
} from 'lucide-react';
import { Lead, NPSResponse, Campaign, Form, User } from '@/types';

interface DatabaseExportProps {
  leads: Lead[];
  npsData: NPSResponse[];
  campaigns: Campaign[];
  forms: Form[];
  users: User[];
  tenantId?: string | null;
}

interface GameParticipation {
  id: string;
  game_id: string;
  game_name?: string;
  campaign_id?: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  prize_won: string;
  prize_code: string;
  status: 'pending' | 'sent' | 'redeemed';
  source?: string;
  played_at: string;
  sent_at?: string;
  redeemed_at?: string;
  expires_at?: string;
}

type TabId = 'leads' | 'nps' | 'participations' | 'campaigns' | 'forms';

const DatabaseExport: React.FC<DatabaseExportProps> = ({
  leads,
  npsData,
  campaigns,
  forms,
  users,
  tenantId
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('leads');
  const [searchTerm, setSearchTerm] = useState('');
  const [participations, setParticipations] = useState<GameParticipation[]>([]);
  const [loadingParticipations, setLoadingParticipations] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [participationsLoaded, setParticipationsLoaded] = useState(false);

  // Carregar participações de roleta
  useEffect(() => {
    if (tenantId && activeTab === 'participations' && !participationsLoaded) {
      loadParticipations();
    }
  }, [tenantId, activeTab]);

  const loadParticipations = async () => {
    if (!tenantId) return;
    setLoadingParticipations(true);
    try {
      const response = await fetch(`/api/game-participations?tenant_id=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setParticipations(data);
        setParticipationsLoaded(true);
      }
    } catch (error) {
      console.error('Erro ao carregar participações:', error);
    } finally {
      setLoadingParticipations(false);
    }
  };

  // Helpers
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Busca o formulário pelo formId ou pelo formSource (fallback)
  const getFormForLead = (lead: Lead): Form | undefined => {
    if (lead.formId) {
      const byId = forms.find(f => f.id === lead.formId);
      if (byId) return byId;
    }
    if (lead.formSource) {
      return forms.find(f => f.name === lead.formSource);
    }
    return undefined;
  };

  // Retorna o texto da pergunta dado o ID, com fallback inteligente
  const getQuestionText = (questionId: string, formQuestions: any[]): string => {
    if (!questionId || questionId.startsWith('_')) return '';
    const q = formQuestions.find(q => String(q.id) === String(questionId));
    if (q) return q.text;
    // Fallback: se o ID é numérico longo, mostrar "Pergunta N"
    if (/^\d{10,}/.test(questionId)) return `Pergunta (${questionId.slice(0, 8)}...)`;
    return questionId;
  };

  // Extrai o valor legível de uma resposta de formulário
  const getAnswerValue = (answerData: any): string => {
    if (answerData === null || answerData === undefined) return '—';
    // Formato novo: { value: ..., followUps: {}, optionSelected: ... }
    if (typeof answerData === 'object' && 'value' in answerData) {
      const val = answerData.value;
      if (Array.isArray(val)) return val.join(', ');
      if (val === null || val === undefined || val === '') return '—';
      return String(val);
    }
    // Formato antigo: string direta ou array
    if (Array.isArray(answerData)) return answerData.join(', ');
    if (typeof answerData === 'string') return answerData;
    if (typeof answerData === 'object') {
      if ('label' in answerData) return answerData.label;
      return JSON.stringify(answerData);
    }
    return String(answerData);
  };

  const getCampaignName = (campaignId?: string) => {
    if (!campaignId) return '—';
    return campaigns.find(c => c.id === campaignId)?.name || campaignId;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Novo': 'bg-blue-100 text-blue-700',
      'Em Contato': 'bg-yellow-100 text-yellow-700',
      'Negociação': 'bg-orange-100 text-orange-700',
      'Vendido': 'bg-green-100 text-green-700',
      'Perdido': 'bg-red-100 text-red-700',
      'Promotor': 'bg-green-100 text-green-700',
      'Neutro': 'bg-yellow-100 text-yellow-700',
      'Detrator': 'bg-red-100 text-red-700',
      'Ativa': 'bg-green-100 text-green-700',
      'Pausada': 'bg-yellow-100 text-yellow-700',
      'Rascunho': 'bg-gray-100 text-gray-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'sent': 'bg-blue-100 text-blue-700',
      'redeemed': 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': 'Pendente',
      'sent': 'Enviado',
      'redeemed': 'Resgatado',
    };
    return labels[status] || status;
  };

  const getNPSColor = (score: number) => {
    if (score >= 9) return 'text-green-600 bg-green-50';
    if (score >= 7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Filtros de busca
  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter(l =>
      l.name?.toLowerCase().includes(term) ||
      l.email?.toLowerCase().includes(term) ||
      l.phone?.toLowerCase().includes(term) ||
      l.formSource?.toLowerCase().includes(term) ||
      l.status?.toLowerCase().includes(term)
    );
  }, [leads, searchTerm]);

  const filteredNPS = useMemo(() => {
    if (!searchTerm) return npsData;
    const term = searchTerm.toLowerCase();
    return npsData.filter(n =>
      n.customerName?.toLowerCase().includes(term) ||
      n.customerEmail?.toLowerCase().includes(term) ||
      n.customerPhone?.toLowerCase().includes(term) ||
      n.campaign?.toLowerCase().includes(term) ||
      n.status?.toLowerCase().includes(term) ||
      n.comment?.toLowerCase().includes(term)
    );
  }, [npsData, searchTerm]);

  const filteredParticipations = useMemo(() => {
    if (!searchTerm) return participations;
    const term = searchTerm.toLowerCase();
    return participations.filter(p =>
      p.client_name?.toLowerCase().includes(term) ||
      p.client_email?.toLowerCase().includes(term) ||
      p.client_phone?.toLowerCase().includes(term) ||
      p.prize_won?.toLowerCase().includes(term) ||
      p.prize_code?.toLowerCase().includes(term)
    );
  }, [participations, searchTerm]);

  const filteredCampaigns = useMemo(() => {
    if (!searchTerm) return campaigns;
    const term = searchTerm.toLowerCase();
    return campaigns.filter(c =>
      c.name?.toLowerCase().includes(term) ||
      c.status?.toLowerCase().includes(term) ||
      c.type?.toLowerCase().includes(term)
    );
  }, [campaigns, searchTerm]);

  const filteredForms = useMemo(() => {
    if (!searchTerm) return forms;
    const term = searchTerm.toLowerCase();
    return forms.filter(f =>
      f.name?.toLowerCase().includes(term) ||
      f.description?.toLowerCase().includes(term)
    );
  }, [forms, searchTerm]);

  // ===== EXPORTAÇÃO XLSX =====
  const handleExportCurrentTab = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const wb = XLSX.utils.book_new();

        if (activeTab === 'leads') {
          const rows = filteredLeads.map(lead => ({
            'Nome': lead.name || '',
            'Email': lead.email || '',
            'Telefone': lead.phone || '',
            'Status': lead.status || '',
            'Valor (R$)': lead.value || 0,
            'Formulário': lead.formSource || '',
            'Data': formatDate(lead.date),
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, 'Leads');
          XLSX.writeFile(wb, `leads_${new Date().toISOString().split('T')[0]}.xlsx`);

        } else if (activeTab === 'nps') {
          const rows = filteredNPS.map(nps => ({
            'Nome': nps.customerName || '',
            'Email': nps.customerEmail || '',
            'Telefone': nps.customerPhone || '',
            'Score': nps.score,
            'Status': nps.status || '',
            'Campanha': nps.campaign || '',
            'Comentário': nps.comment || '',
            'Data': formatDate(nps.date),
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, 'Respostas NPS');
          XLSX.writeFile(wb, `respostas_nps_${new Date().toISOString().split('T')[0]}.xlsx`);

        } else if (activeTab === 'participations') {
          const rows = filteredParticipations.map(p => ({
            'Nome': p.client_name || '',
            'Email': p.client_email || '',
            'Telefone': p.client_phone || '',
            'Prêmio': p.prize_won || '',
            'Código': p.prize_code || '',
            'Status': getStatusLabel(p.status),
            'Origem': p.source === 'pre-sale' ? 'Pré-venda' : 'Pós-venda',
            'Campanha': getCampaignName(p.campaign_id),
            'Data': formatDate(p.played_at),
            'Enviado em': formatDate(p.sent_at),
            'Resgatado em': formatDate(p.redeemed_at),
            'Expira em': formatDate(p.expires_at),
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, 'Participações Roleta');
          XLSX.writeFile(wb, `participacoes_roleta_${new Date().toISOString().split('T')[0]}.xlsx`);

        } else if (activeTab === 'campaigns') {
          const rows = filteredCampaigns.map(c => ({
            'Nome': c.name || '',
            'Status': c.status || '',
            'Tipo': c.type || '',
            'NPS Score': c.npsScore || 0,
            'Respostas': c.responses || 0,
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, 'Campanhas');
          XLSX.writeFile(wb, `campanhas_${new Date().toISOString().split('T')[0]}.xlsx`);

        } else if (activeTab === 'forms') {
          const rows = filteredForms.map(f => ({
            'Nome': f.name || '',
            'Respostas': f.responses || 0,
            'Ativo': f.active ? 'Sim' : 'Não',
            'Criado em': formatDate(f.createdAt),
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, 'Formulários');
          XLSX.writeFile(wb, `formularios_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
      } finally {
        setIsExporting(false);
      }
    }, 300);
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType; count: number; color: string }[] = [
    { id: 'leads', label: 'Leads', icon: Users, count: leads.length, color: 'text-blue-600' },
    { id: 'nps', label: 'Respostas NPS', icon: BarChart3, count: npsData.length, color: 'text-purple-600' },
    { id: 'participations', label: 'Roleta', icon: Trophy, count: participations.length, color: 'text-amber-600' },
    { id: 'campaigns', label: 'Campanhas', icon: MessageSquare, count: campaigns.length, color: 'text-green-600' },
    { id: 'forms', label: 'Formulários', icon: ClipboardList, count: forms.length, color: 'text-rose-600' },
  ];

  const currentCount = {
    leads: filteredLeads.length,
    nps: filteredNPS.length,
    participations: filteredParticipations.length,
    campaigns: filteredCampaigns.length,
    forms: filteredForms.length,
  }[activeTab];

  const totalCount = {
    leads: leads.length,
    nps: npsData.length,
    participations: participations.length,
    campaigns: campaigns.length,
    forms: forms.length,
  }[activeTab];

  return (
    <div className="p-6 min-h-screen bg-gray-50" style={{ colorScheme: 'light' }}>
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Database size={28} className="text-gray-500" />
            Banco de Dados
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Visualize, filtre e exporte todos os dados do sistema.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setExpandedRow(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${
                  isActive
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : tab.color} />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.id === 'participations' ? participations.length : tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          {activeTab === 'participations' && (
            <button
              onClick={() => { setParticipationsLoaded(false); loadParticipations(); }}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <RefreshCw size={15} />
              Atualizar
            </button>
          )}
          <button
            onClick={handleExportCurrentTab}
            disabled={isExporting || currentCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Exportar XLSX
          </button>
        </div>

        {/* Count info */}
        <div className="text-xs text-gray-500 mb-3">
          Exibindo <strong>{currentCount}</strong> de <strong>{totalCount}</strong> registros
          {searchTerm && <span> para "<strong>{searchTerm}</strong>"</span>}
        </div>

        {/* ===== LEADS TABLE ===== */}
        {activeTab === 'leads' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-16">
                <Users size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum lead encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contato</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Formulário</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Respostas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLeads.map((lead) => {
                      const form = getFormForLead(lead);
                      const formQuestions = form?.questions || [];
                      const answerEntries = lead.answers
                        ? Object.entries(lead.answers).filter(([k]) => !k.startsWith('_'))
                        : [];
                      const hasAnswers = answerEntries.length > 0;
                      const isExpanded = expandedRow === lead.id;
                      return (
                        <React.Fragment key={lead.id}>
                          <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 text-sm">{lead.name}</div>
                              {lead.notes && (
                                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]" title={lead.notes}>
                                  📝 {lead.notes}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Mail size={12} className="text-gray-400" />
                                {lead.email || '—'}
                              </div>
                              {lead.phone && (
                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                  <Phone size={11} className="text-gray-300" />
                                  {lead.phone}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">
                              {lead.value ? formatCurrency(lead.value) : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded-md">
                                {lead.formSource || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {formatDate(lead.date)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {hasAnswers ? (
                                <button
                                  onClick={() => setExpandedRow(isExpanded ? null : lead.id)}
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    isExpanded
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  <Eye size={12} />
                                  {isExpanded ? 'Ocultar' : `Ver (${answerEntries.length})`}
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && hasAnswers && (
                            <tr>
                              <td colSpan={7} className="px-4 py-4 bg-blue-50 border-b border-blue-100">
                                <div className="text-xs font-semibold text-blue-700 mb-3 uppercase tracking-wide">
                                  Respostas do Formulário — {form?.name || lead.formSource || 'Formulário'}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {answerEntries.map(([key, answerData]: [string, any]) => {
                                    const label = getQuestionText(key, formQuestions);
                                    const displayValue = getAnswerValue(answerData);
                                    return (
                                      <div key={key} className="bg-white rounded-lg p-3 border border-blue-100">
                                        <div className="text-xs text-gray-500 mb-1 font-medium leading-tight">{label}</div>
                                        <div className="text-sm text-gray-800 font-medium">{displayValue}</div>
                                        {/* Follow-ups */}
                                        {answerData?.followUps && Object.values(answerData.followUps).some((v: any) => v) && (
                                          <div className="mt-2 pt-2 border-t border-gray-100">
                                            {Object.entries(answerData.followUps).map(([fk, fv]: [string, any]) =>
                                              fv ? (
                                                <div key={fk} className="text-xs text-gray-500 italic mt-1">
                                                  ↳ {String(fv)}
                                                </div>
                                              ) : null
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== NPS TABLE ===== */}
        {activeTab === 'nps' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredNPS.length === 0 ? (
              <div className="text-center py-16">
                <BarChart3 size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma resposta NPS encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contato</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campanha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Comentário</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Respostas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredNPS.map((nps) => {
                      const campaign = campaigns.find(c => c.id === nps.campaignId);
                      const campaignQuestions = campaign?.questions || [];
                      const hasAnswers = Array.isArray(nps.answers) && nps.answers.length > 0;
                      const isExpanded = expandedRow === nps.id;
                      return (
                        <React.Fragment key={nps.id}>
                          <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-purple-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 text-sm">{nps.customerName}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {nps.customerEmail && (
                                <div className="flex items-center gap-1">
                                  <Mail size={12} className="text-gray-400" />
                                  {nps.customerEmail}
                                </div>
                              )}
                              {nps.customerPhone && (
                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                  <Phone size={11} className="text-gray-300" />
                                  {nps.customerPhone}
                                </div>
                              )}
                              {!nps.customerEmail && !nps.customerPhone && '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${getNPSColor(nps.score)}`}>
                                {nps.score}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(nps.status)}`}>
                                {nps.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md">
                                {nps.campaign || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px]">
                              <div className="truncate" title={nps.comment}>
                                {nps.comment || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {formatDate(nps.date)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {hasAnswers ? (
                                <button
                                  onClick={() => setExpandedRow(isExpanded ? null : nps.id)}
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    isExpanded
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  <Eye size={12} />
                                  {isExpanded ? 'Ocultar' : `Ver (${nps.answers?.length})`}
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && hasAnswers && (
                            <tr>
                              <td colSpan={8} className="px-4 py-4 bg-purple-50 border-b border-purple-100">
                                <div className="text-xs font-semibold text-purple-700 mb-3 uppercase tracking-wide">
                                  Respostas da Pesquisa — {nps.campaign}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {(nps.answers || []).map((ans: any, idx: number) => {
                                    const q = campaignQuestions.find(q => String(q.id) === String(ans.question));
                                    const label = q?.text || (ans.question && /^\d{10,}/.test(ans.question)
                                      ? `Pergunta ${idx + 1}`
                                      : (ans.question || `Pergunta ${idx + 1}`));
                                    return (
                                      <div key={idx} className="bg-white rounded-lg p-3 border border-purple-100">
                                        <div className="text-xs text-gray-500 mb-1 font-medium leading-tight">{label}</div>
                                        <div className="text-sm text-gray-800 font-medium">{ans.answer || '—'}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== PARTICIPATIONS TABLE ===== */}
        {activeTab === 'participations' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loadingParticipations ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-500 text-sm">Carregando participações...</p>
                </div>
              </div>
            ) : filteredParticipations.length === 0 ? (
              <div className="text-center py-16">
                <Trophy size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma participação encontrada</p>
                {!tenantId && (
                  <p className="text-gray-400 text-xs mt-1">Tenant ID não disponível</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contato</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prêmio</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Origem</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Campanha</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Validade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredParticipations.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{p.client_name}</div>
                          {p.game_name && (
                            <div className="text-xs text-gray-400 mt-0.5">🎰 {p.game_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {p.client_email && (
                            <div className="flex items-center gap-1">
                              <Mail size={12} className="text-gray-400" />
                              {p.client_email}
                            </div>
                          )}
                          {p.client_phone && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <Phone size={11} className="text-gray-300" />
                              {p.client_phone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-amber-600 text-sm">{p.prize_won}</div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="px-2 py-1 bg-gray-100 rounded font-mono text-xs text-gray-700">
                            {p.prize_code}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(p.status)}`}>
                            {getStatusLabel(p.status)}
                          </span>
                          {p.redeemed_at && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              em {formatDate(p.redeemed_at)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                            p.source === 'pre-sale' ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50'
                          }`}>
                            {p.source === 'pre-sale' ? 'Pré-venda' : 'Pós-venda'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {p.campaign_id ? (
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md">
                              {getCampaignName(p.campaign_id)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {formatDate(p.played_at)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {p.expires_at ? formatDate(p.expires_at) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== CAMPAIGNS TABLE ===== */}
        {activeTab === 'campaigns' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma campanha encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">NPS Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Respostas</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Perguntas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCampaigns.map((campaign) => {
                      const isExpanded = expandedRow === campaign.id;
                      const hasQuestions = (campaign.questions || []).length > 0;
                      return (
                        <React.Fragment key={campaign.id}>
                          <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-green-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 text-sm">{campaign.name}</div>
                              {campaign.description && (
                                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{campaign.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(campaign.status)}`}>
                                {campaign.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded-md">{campaign.type || '—'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                                campaign.npsScore >= 50 ? 'bg-green-100 text-green-700' :
                                campaign.npsScore >= 0 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                <Star size={12} />
                                {campaign.npsScore}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">
                              {campaign.responses || 0}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {hasQuestions ? (
                                <button
                                  onClick={() => setExpandedRow(isExpanded ? null : campaign.id)}
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    isExpanded
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  <Eye size={12} />
                                  {isExpanded ? 'Ocultar' : `Ver (${campaign.questions?.length})`}
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && hasQuestions && (
                            <tr>
                              <td colSpan={6} className="px-4 py-4 bg-green-50 border-b border-green-100">
                                <div className="text-xs font-semibold text-green-700 mb-3 uppercase tracking-wide">
                                  Perguntas da Campanha
                                </div>
                                <div className="space-y-2">
                                  {(campaign.questions || []).map((q, idx) => (
                                    <div key={q.id} className="bg-white rounded-lg p-3 border border-green-100 flex items-start gap-3">
                                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                        {idx + 1}
                                      </span>
                                      <div className="flex-1">
                                        <div className="text-sm text-gray-800 font-medium">{q.text}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{q.type}</span>
                                          {q.conditional && (
                                            <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                                              Condicional: {q.conditional}
                                            </span>
                                          )}
                                        </div>
                                        {q.options && q.options.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {q.options.map((opt: any, oi: number) => (
                                              <span key={oi} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                                {typeof opt === 'string' ? opt : opt.text || opt.label}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== FORMS TABLE ===== */}
        {activeTab === 'forms' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredForms.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum formulário encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Respostas</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Criado em</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Perguntas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredForms.map((form) => {
                      const isExpanded = expandedRow === form.id;
                      const hasQuestions = (form.questions || []).length > 0;
                      return (
                        <React.Fragment key={form.id}>
                          <tr className={`hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-rose-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 text-sm">{form.name}</div>
                              {form.description && (
                                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[250px]">{form.description}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                form.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {form.active ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">
                              {form.responses || 0}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {formatDate(form.createdAt)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {hasQuestions ? (
                                <button
                                  onClick={() => setExpandedRow(isExpanded ? null : form.id)}
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    isExpanded
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  <Eye size={12} />
                                  {isExpanded ? 'Ocultar' : `Ver (${form.questions?.length})`}
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && hasQuestions && (
                            <tr>
                              <td colSpan={5} className="px-4 py-4 bg-rose-50 border-b border-rose-100">
                                <div className="text-xs font-semibold text-rose-700 mb-3 uppercase tracking-wide">
                                  Perguntas do Formulário
                                </div>
                                <div className="space-y-2">
                                  {(form.questions || []).map((q, idx) => (
                                    <div key={q.id} className="bg-white rounded-lg p-3 border border-rose-100 flex items-start gap-3">
                                      <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                        {idx + 1}
                                      </span>
                                      <div className="flex-1">
                                        <div className="text-sm text-gray-800 font-medium">{q.text}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{q.type}</span>
                                        </div>
                                        {q.options && q.options.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {q.options.map((opt: any, oi: number) => (
                                              <span key={oi} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                                {typeof opt === 'string' ? opt : opt.label || opt.text}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-gray-400">
          Clique em "Ver" nas linhas para expandir detalhes. Use "Exportar XLSX" para baixar os dados filtrados em Excel.
        </div>
      </div>
    </div>
  );
};

export default DatabaseExport;
