import React, { useState, useEffect, useRef } from 'react';
import { useTenantId } from '@/hooks/useTenantId';
import { Campaign, CampaignQuestion, User, InitialField } from '@/types';
import { getSurveyLink } from '@/lib/utils/getBaseUrl';
import { Plus, X, Share2, MoreVertical, Star, Link as LinkIcon, ExternalLink, Sparkles, Trash2, Check, Pause, Play, Edit, Eye, Loader2, MapPin, Send, Upload, FileSpreadsheet, QrCode, Download, FileText, AlertCircle, GripVertical, ArrowUp, ArrowDown, ArrowLeft, Gift, BookOpen, Search } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/lib/supabase';
import InitialFieldsConfig from '@/components/InitialFieldsConfig';
import NPSConsultant from '@/components/NPSConsultant';
import MassDispatchModal from '@/components/MassDispatchModal';

interface NPSCampaignsProps {
  campaigns: Campaign[];
  onSaveCampaign: (campaign: Campaign) => void; 
  onDeleteCampaign: (id: string) => void;
  navigateToAnalytics: () => void;
  onPreview?: (id: string) => void;
  onViewReport?: (id: string) => void;
  currentUser?: User;
  setCampaigns?: any;
  businessProfile?: any;
}

const NPSCampaigns: React.FC<NPSCampaignsProps> = ({ campaigns, onSaveCampaign, onDeleteCampaign, navigateToAnalytics, onPreview, onViewReport, currentUser, businessProfile }) => {
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'active': 'Ativa',
      'paused': 'Pausada',
      'Ativa': 'Ativa',
      'Pausada': 'Pausada'
    };
    return labels[status] || status;
  };
  const tenantId = useTenantId()

  const [showNPSConsultant, setShowNPSConsultant] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Mass Send State
  const [isMassSendOpen, setIsMassSendOpen] = useState(false);
  
  // QR Code State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [currentQrUrl, setCurrentQrUrl] = useState('');
  const [currentQrName, setCurrentQrName] = useState('');

  // States antigos removidos - agora usa apenas NPSConsultant

  // Template Library State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateCategories, setTemplateCategories] = useState<string[]>(['Todos']);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('Todos');
  const [templateSearch, setTemplateSearch] = useState('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isUsingTemplate, setIsUsingTemplate] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
      setTemplateCategories(data.categories || ['Todos']);
    } finally { setIsLoadingTemplates(false); }
  };

  const openTemplateModal = () => {
    setShowTemplateModal(true);
    loadTemplates();
  };

  const useTemplate = async (templateId: string, templateName: string) => {
    if (!tenantId) return;
    setIsUsingTemplate(templateId);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, tenantId, campaignName: `${templateName} (cópia)` }),
      });
      const data = await res.json();
      if (data.campaign) {
        setTemplateSuccess(templateId);
        setTimeout(() => {
          setTemplateSuccess(null);
          setShowTemplateModal(false);
          onSaveCampaign(data.campaign);
        }, 1500);
      }
    } finally { setIsUsingTemplate(null); }
  };

  // UI State
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Stats for Mini Dashboard
  const activeCampaigns = campaigns.filter(c => c.status === 'Ativa' || c.status === 'active').length;
  const totalResponses = campaigns.reduce((acc, curr) => acc + (curr.responses || 0), 0);
  const avgNps = campaigns.length > 0 
      ? Math.round(campaigns.reduce((acc, curr) => acc + curr.npsScore, 0) / campaigns.length) 
      : 0;


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Funções antigas do editor removidas - agora usa apenas NPSConsultant

  const closeMassSend = () => setIsMassSendOpen(false);

  const handleOpenQr = (id: string, name: string) => {
    const link = getSurveyLink(id);
    setCurrentQrUrl(link);
    setCurrentQrName(name);
    setQrModalOpen(true);
  };







  const handleCopyLink = (id: string) => {
    const link = getSurveyLink(id);
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEdit = (camp: Campaign) => {
    setEditingCampaign(camp);
    setShowNPSConsultant(true);
    setMenuOpenId(null);
  };

  const toggleStatus = (id: string) => {
    const camp = campaigns.find(c => c.id === id);
    if (camp) {
        const currentIsActive = camp.status === 'Ativa' || camp.status === 'active';
        onSaveCampaign({ ...camp, status: currentIsActive ? 'Pausada' : 'Ativa' });
    }
    setMenuOpenId(null);
  };

  const handleDelete = (id: string) => {
    onDeleteCampaign(id);
    setMenuOpenId(null);
  };

  // Editor antigo removido - agora usa apenas NPSConsultant

  // List View
  return (
    <div className="p-8 min-h-screen bg-gray-50 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Campanhas</h1>
          <p className="text-gray-500">Gerencie seus links de pesquisa NPS e feedback</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setIsMassSendOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-medium relative">
                <Send size={18} /> Disparo em Massa
                <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full font-semibold">NOVO</span>
            </button>
            <button onClick={() => { setManualMode(true); setEditingCampaign(null); setShowNPSConsultant(true); }} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-medium">
                <Edit size={18} /> Criar manualmente
            </button>
            <button onClick={openTemplateModal} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-medium">
                <BookOpen size={18} /> Usar Template
            </button>
            <button onClick={() => { setManualMode(false); setShowNPSConsultant(true); }} className="px-4 py-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg flex items-center gap-2 hover:shadow-lg transition-all font-medium">
                <Sparkles size={18} /> Nova Campanha com IA
            </button>
        </div>
      </div>

       {/* Mini Dashboard */}
       <div className="grid grid-cols-2 gap-4 mb-8">
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Check size={24}/></div>
                 <div>
                     <p className="text-sm text-gray-500 font-medium">Campanhas Ativas</p>
                     <h3 className="text-2xl font-bold text-gray-800">{activeCampaigns}</h3>
                 </div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                 <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Star size={24}/></div>
                 <div>
                     <p className="text-sm text-gray-500 font-medium">Score Médio</p>
                     <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-gray-800">{avgNps}</h3>
                        <span className="text-xs text-gray-400">({totalResponses} respostas)</span>
                     </div>
                 </div>
             </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((camp) => (
          <div key={camp.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${(camp.status === 'Pausada' || camp.status === 'paused') ? 'opacity-75' : ''}`}>
             <div className="p-5">
                <div className="flex justify-between items-start mb-4 relative">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg mb-1">{camp.name}</h3>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${(camp.status === 'Ativa' || camp.status === 'active') ? 'text-green-600 bg-green-50 border-green-100' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>{getStatusLabel(camp.status)}</span>
                      {camp.offer_prize && <span className="text-xs px-2 py-0.5 rounded-full border border-purple-100 text-purple-600 bg-purple-50 flex items-center gap-1"><Gift size={10} /> Game Ativo</span>}
                      {!camp.offer_prize && <span className="text-xs px-2 py-0.5 rounded-full border border-gray-100 text-gray-400 bg-gray-50 flex items-center gap-1">Sem Game</span>}
                      {camp.enableRedirection && <span className="text-xs px-2 py-0.5 rounded-full border border-blue-100 text-blue-600 bg-blue-50 flex items-center gap-1"><ExternalLink size={10} /> Redirecionamento</span>}
                    </div>
                  </div>
                  <button onClick={() => setMenuOpenId(menuOpenId === camp.id ? null : camp.id)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50"><MoreVertical size={20} /></button>
                  {menuOpenId === camp.id && (
                    <div ref={menuRef} className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-100 w-40 z-10 py-1">
                      <button onClick={() => handleEdit(camp)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><Edit size={14} /> Editar</button>
                      <button onClick={() => toggleStatus(camp.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">{(camp.status === 'Ativa' || camp.status === 'active') ? <Pause size={14} /> : <Play size={14} />} {(camp.status === 'Ativa' || camp.status === 'active') ? 'Pausar' : 'Ativar'}</button>
                      <button onClick={() => handleDelete(camp.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Excluir</button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center"><span className="block text-2xl font-bold text-gray-900">{camp.npsScore}</span><span className="text-xs text-gray-500 uppercase font-semibold">Score</span></div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center"><span className="block text-2xl font-bold text-gray-900">{camp.responses}</span><span className="text-xs text-gray-500 uppercase font-semibold">Respostas</span></div>
                </div>
                {camp.questions && camp.questions.length > 0 && <p className="text-xs text-gray-400 mt-3 text-center">+ {camp.questions.length} perguntas personalizadas</p>}
             </div>
             <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                <button onClick={() => handleCopyLink(camp.id)} className={`text-sm font-medium flex items-center gap-2 transition-colors ${copiedId === camp.id ? 'text-green-600' : 'text-gray-600 hover:text-primary-600'}`}>{copiedId === camp.id ? <Check size={16} /> : <Share2 size={16} />} {copiedId === camp.id ? 'Copiado!' : 'Copiar Link'}</button>
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleOpenQr(camp.id, camp.name)} 
                        className="text-sm text-gray-500 hover:text-primary-600 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        title="QR Code"
                    >
                        <QrCode size={16} />
                    </button>
                    <button onClick={() => onPreview && onPreview(camp.id)} className="text-sm text-gray-500 font-medium hover:text-primary-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors" title="Visualizar"><Eye size={16} /></button>
                    <button onClick={() => onViewReport ? onViewReport(camp.id) : navigateToAnalytics()} className="text-sm text-primary-600 font-medium hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors">Ver Relatório</button>
                </div>
             </div>
          </div>
        ))}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] hover:border-gray-400 transition-all">
            <Plus size={32} className="text-gray-400" />
            <span className="font-medium text-gray-400">Criar nova campanha</span>
            <div className="flex flex-col gap-2 w-full mt-1">
              <button 
                onClick={() => { setManualMode(false); setEditingCampaign(null); setShowNPSConsultant(true); }}
                className="w-full px-3 py-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all text-sm font-medium"
              >
                <Sparkles size={15} /> Com IA
              </button>
              <button 
                onClick={() => { setManualMode(true); setEditingCampaign(null); setShowNPSConsultant(true); }}
                className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-all text-sm font-medium"
              >
                <Edit size={15} /> Manualmente
              </button>
              <button 
                onClick={openTemplateModal}
                className="w-full px-3 py-2 bg-white border border-emerald-300 text-emerald-700 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all text-sm font-medium"
              >
                <BookOpen size={15} /> Usar Template
              </button>
            </div>
        </div>
      </div>

      {/* Mass Send Modal */}
      {isMassSendOpen && (
        <MassDispatchModal
          campaigns={campaigns}
          tenantId={tenantId || ''}
          onClose={closeMassSend}
        />
      )}

      {/* QR Code Modal */}
      {qrModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center relative animate-in zoom-in-95">
                    <button 
                        onClick={() => setQrModalOpen(false)} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
                    >
                        <X size={20}/>
                    </button>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">QR Code da Pesquisa</h3>
                    <p className="text-sm text-gray-500 mb-6 truncate px-4">{currentQrName}</p>
                    
                    <div className="bg-white p-2 border border-gray-200 rounded-xl inline-block mb-6 shadow-sm">
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentQrUrl)}`} 
                            alt="QR Code" 
                            className="w-48 h-48"
                        />
                    </div>
                    
                    <div className="flex justify-center">
                        <a 
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentQrUrl)}`} 
                            download="qrcode.png" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-colors"
                        >
                            <Download size={18}/> Baixar Imagem
                        </a>
                    </div>
                </div>
            </div>
       )}

      {/* Template Library Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-4 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">Biblioteca de Templates</h3>
                <p className="text-xs text-gray-500 mt-0.5">Escolha um template pronto e crie sua campanha em segundos</p>
              </div>
              <button onClick={() => setShowTemplateModal(false)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Filtros */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-40">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar template..."
                    value={templateSearch}
                    onChange={e => setTemplateSearch(e.target.value)}
                    className="w-full text-sm pl-8 pr-3 py-2 rounded-lg border border-gray-300 bg-white"
                  />
                </div>
                <select
                  value={templateCategoryFilter}
                  onChange={e => setTemplateCategoryFilter(e.target.value)}
                  className="text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white"
                >
                  {templateCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              {/* Lista */}
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-emerald-500" /></div>
              ) : templates.filter(t => {
                const matchSearch = !templateSearch || t.name?.toLowerCase().includes(templateSearch.toLowerCase());
                const matchCat = templateCategoryFilter === 'Todos' || t.category === templateCategoryFilter;
                return matchSearch && matchCat;
              }).length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum template disponível no momento.</p>
                  <p className="text-xs mt-1">O administrador ainda não criou templates.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {templates.filter(t => {
                    const matchSearch = !templateSearch || t.name?.toLowerCase().includes(templateSearch.toLowerCase());
                    const matchCat = templateCategoryFilter === 'Todos' || t.category === templateCategoryFilter;
                    return matchSearch && matchCat;
                  }).map(template => (
                    <div key={template.id} className="border border-slate-200 rounded-xl p-4 hover:border-emerald-400 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-bold text-gray-900">{template.name}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{template.category}</span>
                          </div>
                          {template.description && <p className="text-xs text-gray-500 mb-2">{template.description}</p>}
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{template.questions?.length || 0} perguntas</span>
                            <span className="flex items-center gap-1"><Star size={10} className="text-yellow-500" /> {template.use_count || 0} usos</span>
                            {template.objective && <span className="truncate max-w-xs italic">{template.objective}</span>}
                          </div>
                          {(template.tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.tags.map((tag: string) => (
                                <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => useTemplate(template.id, template.name)}
                          disabled={!!isUsingTemplate}
                          className={`shrink-0 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                            templateSuccess === template.id
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50'
                          }`}
                        >
                          {isUsingTemplate === template.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : templateSuccess === template.id ? (
                            <Check size={14} />
                          ) : (
                            <Plus size={14} />
                          )}
                          {templateSuccess === template.id ? 'Criado!' : 'Usar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NPS Consultant Modal */}
      {showNPSConsultant && (
        <NPSConsultant
          supabase={supabase}
          userId={currentUser?.id || ''}
          initialBusinessProfile={businessProfile}
          onClose={() => {
            setShowNPSConsultant(false);
            setEditingCampaign(null);
            setManualMode(false);
          }}
          onSaveCampaign={(campaignData) => {
            onSaveCampaign(campaignData);
            setShowNPSConsultant(false);
            setEditingCampaign(null);
            setManualMode(false);
          }}
          existingCampaign={editingCampaign}
          startInManualMode={manualMode}
        />
      )}
    </div>
  );
};
export default NPSCampaigns;;